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

/* ===== PUT /api/alumnos/:id  (profesor con permisos; admin/superadmin libres) ===== */
router.put('/:id', auth, requireRole('profesor', 'admin', 'superadmin'), async (req, res) => {
  try {
    // Campos potencialmente editables que puede mandar el frontend
    let allowedKeys = ['rut', 'nombre', 'apellido', 'anio', 'semestre', 'jornada', 'curso'];

    if (req.user.rol === 'profesor') {
      // map de tus keys -> campo real
      const map = {
        'alumnos:editar_doc': 'rut',
        'alumnos:editar_nombre': 'nombre',
        'alumnos:editar_apellido': 'apellido',
        'alumnos:editar_ano': 'anio',
        'alumnos:editar_semestre': 'semestre',
        'alumnos:editar_jornada': 'jornada',
        // 'alumnos:editar_curso': 'curso', // si quieres granular "curso"
      };
      const permitidos = new Set();
      req.user.permisos.forEach(k => { if (map[k]) permitidos.add(map[k]); });
      if (!permitidos.size) return res.status(403).json({ msg: 'No tienes permisos para editar' });
      allowedKeys = [...permitidos];
    }

    // filtra payload
    const body = {};
    for (const k of allowedKeys) if (k in req.body) body[k] = req.body[k];
    if (!Object.keys(body).length) return res.status(400).json({ msg: 'Sin cambios válidos para actualizar' });

    const alumno = await Alumno.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!alumno) return res.status(404).json({ msg: 'Alumno no encontrado' });
    res.json(alumno);
  } catch (err) {
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