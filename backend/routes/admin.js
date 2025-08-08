const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const router = express.Router();

function normRut(v = '') {
  return String(v).replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
}
function normEmail(v = '') {
  return String(v).trim().toLowerCase();
}

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

router.post('/login', async (req, res) => {
  const { rut = '', contrasena = '' } = req.body;
  const key = rut.trim();
  if (!key || !contrasena) {
    return res.status(400).json({ msg: 'Usuario y contraseña requeridos' });
  }

  try {
    const admin = await Admin.findOne({
      $or: [{ rut: normRut(key) }, { correo: normEmail(key) }]
    });

    if (!admin) return res.status(400).json({ msg: 'Usuario no encontrado' });
    if (!admin.habilitado) return res.status(403).json({ msg: 'Usuario deshabilitado' });

    const ok = await bcrypt.compare(contrasena, admin.contrasena || '');
    if (!ok) return res.status(400).json({ msg: 'Contraseña incorrecta' });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ msg: 'Error de configuración del servidor (JWT)' });
    }

    const token = jwt.sign({ id: admin._id, rol: admin.rol }, process.env.JWT_SECRET, { expiresIn: '1d' });
    const { contrasena: _omit, ...safe } = admin.toObject();
    res.json({ token, admin: safe });
  } catch (err) {
    console.error('Login admin error:', err);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

router.post('/registro', auth, requireRole('superadmin'), async (req, res) => {
  try {
    const { nombre, apellido = '', rut = '', correo, cargo = '', rol } = req.body;
    let { contrasena } = req.body;

    if (!nombre || !correo || !rol) return res.status(400).json({ msg: 'Faltan campos requeridos' });
    if (!['admin', 'superadmin'].includes(rol)) return res.status(400).json({ msg: 'Rol inválido' });

    const correoN = normEmail(correo);
    const rutN = rut ? normRut(rut) : '';

    const existsCorreo = await Admin.findOne({ correo: correoN });
    if (existsCorreo) return res.status(400).json({ msg: 'Ese correo ya está registrado' });

    if (rutN) {
      const existsRut = await Admin.findOne({ rut: rutN });
      if (existsRut) return res.status(400).json({ msg: 'Ese RUT ya está registrado' });
    }

    if (!contrasena) contrasena = Math.random().toString(36).slice(-10);
    const hash = await bcrypt.hash(contrasena, 10);

    const nuevo = await Admin.create({
      nombre,
      apellido,
      rut: rutN || undefined,
      correo: correoN,
      cargo,
      rol,
      contrasena: hash,
      permisos: [],
      habilitado: true
    });

    const { contrasena: _omit, ...safe } = nuevo.toObject();
    res.json({ msg: 'Administrador creado', admin: safe, contrasenaGenerada: contrasena });
  } catch (err) {
    console.error('registro admin error:', err);
    res.status(500).json({ msg: 'Error al crear administrador' });
  }
});

router.post('/profesores', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const {
      nombre,
      correo,
      password,
      rut = '',
      permisos = [],
      apellido = '',
      cargo = 'Profesor'
    } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ msg: 'Nombre, correo y contraseña requeridos' });
    }

    const correoN = normEmail(correo);
    const rutN = rut ? normRut(rut) : '';

    const existsCorreo = await Admin.findOne({ correo: correoN });
    if (existsCorreo) return res.status(400).json({ msg: 'Ese correo ya está registrado' });

    if (rutN) {
      const existsRut = await Admin.findOne({ rut: rutN });
      if (existsRut) return res.status(400).json({ msg: 'Ese RUT ya está registrado' });
    }

    const hash = await bcrypt.hash(password, 10);

    const prof = await Admin.create({
      nombre,
      apellido,
      rut: rutN || undefined,
      correo: correoN,
      cargo,
      rol: 'profesor',
      permisos: Array.isArray(permisos) ? permisos : [],
      contrasena: hash,
      habilitado: true
    });

    const { contrasena: _omit, ...safe } = prof.toObject();
    res.json({ msg: 'Profesor creado', profesor: safe });
  } catch (err) {
    console.error('crear profesor error:', err);
    res.status(500).json({ msg: 'Error al crear profesor' });
  }
});

router.get('/profesores', auth, requireRole('superadmin', 'admin'), async (_req, res) => {
  try {
    const profs = await Admin.find({ rol: 'profesor' }).select('-contrasena').sort({ createdAt: -1 });
    res.json(profs);
  } catch (err) {
    console.error('listar profesores error:', err);
    res.status(500).json({ msg: 'Error al listar profesores' });
  }
});

// ⚠️ Compatibilidad con tu front actual: GET /api/admin -> lista profesores
router.get('/', auth, requireRole('superadmin', 'admin'), async (_req, res) => {
  try {
    const profs = await Admin.find({ rol: 'profesor' }).select('-contrasena').sort({ createdAt: -1 });
    res.json(profs);
  } catch (err) {
    console.error('listar profesores (compat) error:', err);
    res.status(500).json({ msg: 'Error al listar profesores' });
  }
});

router.put('/profesores/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    delete update.contrasena; // no cambiar clave aquí

    const prof = await Admin.findOneAndUpdate(
      { _id: id, rol: 'profesor' },
      update,
      { new: true }
    ).select('-contrasena');

    if (!prof) return res.status(404).json({ msg: 'Profesor no encontrado' });
    res.json(prof);
  } catch (err) {
    console.error('editar profesor error:', err);
    res.status(500).json({ msg: 'Error al actualizar profesor' });
  }
});

// ⚠️ Compat: PUT /api/admin/:id -> edita profesor
router.put('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const update = { ...req.body };
    delete update.contrasena;

    const prof = await Admin.findOneAndUpdate(
      { _id: id, rol: 'profesor' },
      update,
      { new: true }
    ).select('-contrasena');

    if (!prof) return res.status(404).json({ msg: 'Profesor no encontrado' });
    res.json(prof);
  } catch (err) {
    console.error('editar profesor (compat) error:', err);
    res.status(500).json({ msg: 'Error al actualizar profesor' });
  }
});

module.exports = router;