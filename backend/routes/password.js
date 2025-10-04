// routes/password.js
const express = require('express');
const sgMail = require('@sendgrid/mail');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const crypto = require('crypto');

const router = express.Router();

/* ========= Config ========= */
const FRONT_URL = process.env.FRONT_URL || 'http://localhost:3000';
const EXPIRES_MS = Number(process.env.FORGOT_TOKEN_EXPIRES_MS || 60 * 60 * 1000); // 1h
const STRICT_FORGOT = process.env.STRICT_FORGOT === '1';  // 404 si correo no existe (si no, respuesta genérica)
const MAIL_DRY_RUN = process.env.MAIL_DRY_RUN === '1';    // no envía correo; solo loguea

// Remitente (usa remitente VERIFICADO en SendGrid)
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || process.env.SENDGRID_FROM;
const FROM_NAME  = process.env.SENDGRID_FROM_NAME  || 'Portal Educativo';

/* ========= SendGrid ========= */
if (process.env.SENDGRID_API_KEY) {
  try { sgMail.setApiKey(process.env.SENDGRID_API_KEY); }
  catch (e) { console.error('[SendGrid] setApiKey error:', e?.message || e); }
} else {
  console.warn('[SendGrid] SENDGRID_API_KEY no definido. Usa MAIL_DRY_RUN=1 para probar sin enviar.');
}

/* ========= Helpers ========= */
function genTokenHex(len = 32) {
  return crypto.randomBytes(len).toString('hex');
}
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}
function cryptoTimingSafeEqual(bufA, bufB) {
  try {
    if (!Buffer.isBuffer(bufA)) bufA = Buffer.from(bufA);
    if (!Buffer.isBuffer(bufB)) bufB = Buffer.from(bufB);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
async function findUserByEmail(correo) {
  return Admin.findOne({ correo: String(correo || '').toLowerCase().trim() });
}

/* ========= Rate limit ========= */
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Demasiados intentos, espera un rato.' }
});

/* ====== Ping (debug) ====== */
router.get('/ping', (_req, res) => res.json({ ok: true, where: '/api/password' }));

/* ================== POST /api/password/forgot ================== */
router.post('/forgot', forgotLimiter, async (req, res) => {
  const { correo } = req.body;
  if (!correo) return res.status(400).json({ msg: 'Correo requerido' });

  try {
    const user = await findUserByEmail(correo);

    if (!user || user.rol !== 'profesor') {
      if (STRICT_FORGOT) return res.status(404).json({ msg: 'Correo no registrado' });
      return res.json({ msg: 'Si el correo existe, se envió un enlace de recuperación.' });
    }

    const token = genTokenHex(32);
    user.resetPasswordTokenHash = hashToken(token);
    user.resetPasswordExpires = new Date(Date.now() + EXPIRES_MS);
    await user.save();

    const resetUrl = `${FRONT_URL.replace(/\/$/, '')}/reset-password?token=${token}&id=${user._id}`;

    const mail = {
      to: user.correo,
      from: { email: FROM_EMAIL, name: FROM_NAME }, // remitente verificado
      subject: 'Recuperar contraseña - Portal Educativo',
      text: `Hola.\n\nUsa este enlace para restablecer tu contraseña (válido 1 hora):\n\n${resetUrl}\n\nSi no solicitaste esto, ignora este correo.`,
      html: `
        <p>Hola.</p>
        <p>Haz click para restablecer tu contraseña (válido 1 hora):</p>
        <p><a href="${resetUrl}">Restablecer contraseña</a></p>
        <p>Si no solicitaste esto, ignora este correo.</p>
      `
    };

    if (MAIL_DRY_RUN) {
      console.log('[MAIL_DRY_RUN] Reset URL:', resetUrl);
      console.log('[MAIL_DRY_RUN] Email payload:', { ...mail, from: String(mail.from?.email || mail.from) });
    } else {
      if (!process.env.SENDGRID_API_KEY) {
        console.error('[SendGrid] Falta SENDGRID_API_KEY');
        return res.status(500).json({ msg: 'Error enviando correo (configuración)' });
      }
      if (!FROM_EMAIL) {
        console.error('[SendGrid] Falta remitente (SENDGRID_FROM_EMAIL o SENDGRID_FROM)');
        return res.status(500).json({ msg: 'Error enviando correo (remitente no configurado)' });
      }
      try {
        await sgMail.send(mail);
      } catch (err) {
        const sgStatus = err?.response?.statusCode;
        const sgBody = err?.response?.body;
        console.error('[SendGrid] send error:', err?.message || err);
        if (sgStatus) console.error('[SendGrid] status:', sgStatus);
        if (sgBody)   console.error('[SendGrid] body:', JSON.stringify(sgBody));
        const detail = sgBody?.errors?.[0]?.message || err?.message || 'Fallo desconocido al enviar';
        return res.status(500).json({ msg: 'Error enviando correo', detail });
      }
    }

    return res.json({ msg: 'Si el correo existe, se envió un enlace de recuperación.' });
  } catch (err) {
    console.error('POST /password/forgot error:', err);
    return res.status(500).json({ msg: 'Error interno' });
  }
});

/* ================== POST /api/password/reset ================== */
router.post('/reset', async (req, res) => {
  const { id, token, newPassword } = req.body;
  if (!id || !token || !newPassword) {
    return res.status(400).json({ msg: 'Faltan datos' });
  }

  try {
    const user = await Admin.findById(id)
      .select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user || user.rol !== 'profesor' || !user.resetPasswordTokenHash || !user.resetPasswordExpires) {
      return res.status(400).json({ msg: 'Token inválido o expirado' });
    }

    if (Date.now() > new Date(user.resetPasswordExpires).getTime()) {
      return res.status(400).json({ msg: 'Token expirado' });
    }

    const providedHash = Buffer.from(String(hashToken(token)));
    const storedHash   = Buffer.from(String(user.resetPasswordTokenHash));
    if (providedHash.length !== storedHash.length || !cryptoTimingSafeEqual(providedHash, storedHash)) {
      return res.status(400).json({ msg: 'Token inválido' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ msg: 'Contraseña demasiado corta (mín 6 chars)' });
    }

    user.contrasena = await bcrypt.hash(newPassword, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ msg: 'Contraseña actualizada' });
  } catch (err) {
    console.error('POST /password/reset error:', err);
    return res.status(500).json({ msg: 'Error interno' });
  }
});

module.exports = router;