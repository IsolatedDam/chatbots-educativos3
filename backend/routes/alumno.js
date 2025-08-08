// routes/alumno.js
const express = require('express');
const jwt = require('jsonwebtoken');
const Alumno = require('../models/Alumno');

const router = express.Router();

/* ===== Auth básico (solo token y rol) ===== */
function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return res.status(401).json({ msg: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, rol }
    next();
  } catch {
    return res.status(401).json({ msg: 'Token inválido' });
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ msg: 'No autorizado' });
    }
    next();
  };
}

/* ===== Listar alumnos (solo superadmin/admin) ===== */
router.get('/', auth, requireRole('superadmin', 'admin'), async (_req, res) => {
  try {
    const alumnos = await Alumno.find().sort({ createdAt: -1 });
    res.json(alumnos);
  } catch (err) {
    console.error('listar alumnos error:', err);
    res.status(500).json({ msg: 'Error al obtener alumnos' });
  }
});

/* ===== Actualizar alumno (solo superadmin/admin) ===== */
router.put('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const body = { ...req.body };
    delete body.contrasena; // nunca desde aquí

    const alumno = await Alumno.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!alumno) return res.status(404).json({ msg: 'Alumno no encontrado' });
    res.json(alumno);
  } catch (err) {
    console.error('editar alumno error:', err);
    res.status(500).json({ msg: 'Error al actualizar alumno' });
  }
});

/* (Opcional) Eliminar alumno (solo superadmin/admin) */
router.delete('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
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