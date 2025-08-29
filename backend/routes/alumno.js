// routes/alumno.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Alumno = require('../models/Alumno');
const Admin  = require('../models/Admin');

const router = express.Router();

/* ========= AUTH: toma rol/permisos reales desde la BD ========= */
async function auth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : h;
    if (!token) return res.status(401).json({ msg: 'Token requerido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, ... }
    const user = await Admin.findById(decoded.id).lean();     // superadmin/admin/profesor
    if (!user || user.habilitado === false)
      return res.status(401).json({ msg: 'Usuario no válido' });

    req.user = {
      id: String(user._id),
      rol: String(user.rol || '').toLowerCase(),
      permisos: Array.isArray(user.permisos) ? user.permisos : []
    };
    next();
  } catch (e) {
    return res.status(401).json({ msg: 'Token inválido' });
  }
}

function requireRole(...roles) {
  const allow = roles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const rol = String(req.user?.rol || '').toLowerCase();
    if (!rol || !allow.includes(rol)) return res.status(403).json({ msg: 'No autorizado' });
    next();
  };
}

/* ===== GET /api/alumnos?q=...  (profesor/admin/superadmin) ===== */
router.get('/', auth, requireRole('profesor', 'admin', 'superadmin'), async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? {
          $or: [
            { rut: { $regex: q, $options: 'i' } },
            { nombre: { $regex: q, $options: 'i' } },
            { apellido: { $regex: q, $options: 'i' } },
            { curso: { $regex: q, $options: 'i' } },
            { correo: { $regex: q, $options: 'i' } }
          ],
        }
      : {};
    const alumnos = await Alumno.find(filter).sort({ createdAt: -1 });
    res.json(alumnos);
  } catch (err) {
    console.error('listar alumnos error:', err);
    res.status(500).json({ msg: 'Error al obtener alumnos' });
  }
});

/* ===== PUT /api/alumnos/:id =====
   - superadmin/admin/profesor.
   - Guarda riesgo con ambos nombres: `riesgo` y `color_riesgo`.
*/
router.put('/:id', auth, requireRole('profesor', 'admin', 'superadmin'), async (req, res) => {
  try {
    // Campos permitidos (incluye ambos nombres de riesgo)
    const allowedKeys = [
      'rut','nombre','apellido','anio','fechaIngreso',
      'semestre','jornada','curso','telefono',
      'riesgo','color_riesgo','habilitado','suscripcionVenceEl'
    ];

    // Toma solo claves permitidas
    const body = {};
    for (const k of allowedKeys) if (k in req.body) body[k] = req.body[k];
    if (!Object.keys(body).length) {
      return res.status(400).json({ msg: 'Sin cambios válidos para actualizar' });
    }

    // Si vino solo color_riesgo, normaliza a riesgo
    if ('color_riesgo' in body && !('riesgo' in body)) {
      body.riesgo = body.color_riesgo;
    }

    // Normalizaciones
    if ('anio' in body && body.anio !== '') body.anio = Number(body.anio);
    if ('semestre' in body && body.semestre !== '') body.semestre = Number(body.semestre);

    if ('riesgo' in body && body.riesgo != null) {
      const r = String(body.riesgo).toLowerCase();
      const valid = ['verde','amarillo','rojo',''];
      if (!valid.includes(r)) return res.status(400).json({ msg: 'Riesgo inválido' });
      body.riesgo = r;
      body.color_riesgo = r; // <-- escribe ambos por compat con colecciones antiguas
    }

    if ('suscripcionVenceEl' in body && body.suscripcionVenceEl) {
      const f = new Date(body.suscripcionVenceEl);
      if (isNaN(f.getTime())) return res.status(400).json({ msg: 'Fecha de vencimiento inválida' });
      body.suscripcionVenceEl = f;
    }

    if ('habilitado' in body) {
      body.habilitado = !!body.habilitado;
    }

    const alumno = await Alumno.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );
    if (!alumno) return res.status(404).json({ msg: 'Alumno no encontrado' });

    res.json(alumno);
  } catch (err) {
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || '';
      let msg = 'Registro duplicado';
      if (key === 'correo') msg = 'El correo ya está registrado';
      else if (key === 'rut') msg = 'El RUT ya está registrado';
      else if (err?.message?.includes('unique_doc')) msg = 'Ya existe un alumno con ese documento';
      return res.status(409).json({ msg });
    }
    console.error('editar alumno error:', err);
    res.status(500).json({ msg: 'Error al actualizar alumno' });
  }
});

/* ===== DELETE /api/alumnos/:id  (solo admin/superadmin) ===== */
router.delete('/:id', auth, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const eliminado = await Alumno.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ msg: 'Alumno no encontrado' });
    res.json({ msg: 'Alumno eliminado' });
  } catch (err) {
    console.error('eliminar alumno error:', err);
    res.status(500).json({ msg: 'Error al eliminar alumno' });
  }
});

module.exports = router;