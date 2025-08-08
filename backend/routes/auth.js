const express = require('express');
const router = express.Router();
const Alumno = require('../models/Alumno');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function normalizarRut(v = '') {
  return String(v).replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
}

// Función auxiliar para generar contraseña aleatoria
function generarContrasenaAleatoria(longitud = 10) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let clave = '';
  for (let i = 0; i < longitud; i++) {
    clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return clave;
}

// Login de alumno (POST /api/login)
router.post('/login', async (req, res) => {
  const normalizarRut = (v = '') =>
    String(v).replace(/\./g, '').replace(/\s+/g, '').toUpperCase();

  const rut = normalizarRut(req.body.rut);
  const contrasena = typeof req.body.contrasena === 'string' ? req.body.contrasena.trim() : '';

  console.log('🔑 Login alumno → rut:', rut || '(vacío)', '| pass?', contrasena ? 'sí' : 'no');

  if (!rut) return res.status(400).json({ msg: 'Debes ingresar el RUT' });

  try {
    const alumno = await Alumno.findOne({
      $or: [
        { rut },
        { numero_documento: rut, tipo_documento: 'RUT' }
      ]
    });

    console.log('📦 Alumno encontrado?', !!alumno);
    if (!alumno) return res.status(400).json({ msg: 'RUT no encontrado' });

    // ✅ SOLO si llega contraseña, valida con bcrypt
    if (contrasena) {
      const tieneHash = typeof alumno.contrasena === 'string' && alumno.contrasena.length > 0;
      const ok = tieneHash ? await bcrypt.compare(contrasena, alumno.contrasena) : false;
      console.log('🔐 ¿Contraseña válida?', ok);
      if (!ok) return res.status(400).json({ msg: 'Contraseña incorrecta' });
    }

    // (opcional) bloquear si está deshabilitado
    if (alumno.habilitado === false) {
      return res.status(403).json({ msg: 'Tu acceso está deshabilitado' });
    }

    // best-effort: sumar ingreso
    Alumno.findByIdAndUpdate(alumno._id, { $inc: { conteo_ingresos: 1 } }).catch(() => {});

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET no configurado');
      return res.status(500).json({ msg: 'Error de configuración del servidor (JWT)' });
    }

    const payload = { id: alumno._id, rol: alumno.rol || 'alumno' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    const { contrasena: _omit, ...alumnoSeguro } = alumno.toObject();
    return res.json({ token, alumno: { ...alumnoSeguro, rol: alumno.rol || 'alumno' } });
  } catch (err) {
    console.error('❌ Error en /api/login:', err?.message, err?.stack);
    return res.status(500).json({ msg: 'Error en el servidor' });
  }
});

router.post('/registro', async (req, res) => {
  const {
    correo,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    semestre,
    jornada,
    contrasena
  } = req.body;

  try {
    const rut = tipo_documento === 'RUT' ? normalizarRut(numero_documento) : null;

    if (!correo) return res.status(400).json({ msg: 'El campo correo es obligatorio' });

    const existeCorreo = await Alumno.findOne({ correo });
    if (existeCorreo) return res.status(400).json({ msg: 'El correo ya está registrado' });

    if (rut) {
      const existeRut = await Alumno.findOne({ rut });
      if (existeRut) return res.status(400).json({ msg: 'El alumno ya existe con ese RUT' });
    }

    const contrasenaFinal = contrasena || generarContrasenaAleatoria();
    const hash = await bcrypt.hash(contrasenaFinal, 10);

    const nuevo = new Alumno({
      rut,
      correo: correo.toLowerCase(),
      contrasena: hash,
      tipo_documento,
      numero_documento: normalizarRut(numero_documento || ''),
      nombre,
      apellido,
      semestre,
      jornada,
      rol: 'alumno',
      habilitado: true,
      aviso_suspension: false,
      rehabilitar_acceso: false,
      conteo_ingresos: 0,
      color_riesgo: 'verde'
    });

    await nuevo.save();

    console.log(`✅ Alumno registrado: ${correo}`);
    res.json({ msg: 'Alumno creado exitosamente', contrasena: contrasenaFinal });
  } catch (err) {
    console.error('❌ Error al registrar alumno:', err);
    res.status(500).json({ msg: 'Error al registrar alumno' });
  }
});

module.exports = router;