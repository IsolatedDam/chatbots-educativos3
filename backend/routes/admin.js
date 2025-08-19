const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const router = express.Router();

/* ===== Helpers ===== */
function normRut(v = '') {
  return String(v).replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
}
function normEmail(v = '') {
  return String(v).trim().toLowerCase();
}
function normNumDoc(tipo = '', numero = '') {
  if (String(tipo).toUpperCase() === 'RUT') return normRut(numero);
  return String(numero).trim();
}
const TEL_RE = /^\+?\d{8,12}$/;

/* ===== Auth ===== */
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

/* ===== Login Admin ===== */
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

/* ===== Crear Admin (superadmin) ===== */
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

/* ===== Crear PROFESOR ===== */
router.post('/profesores', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const {
      nombre,
      correo,
      password,
      permisos = [],
      apellido = '',
      cargo = 'Profesor',
      tipo_documento,
      numero_documento,
      telefono,
      fechaCreacion,          // ← ahora sí en el destructuring (opcional)
      rut = ''
    } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ msg: 'Nombre, correo y contraseña requeridos' });
    }
    if (!tipo_documento || !numero_documento || !telefono) {
      return res.status(400).json({ msg: 'Documento y teléfono son obligatorios' });
    }

    const correoN = normEmail(correo);
    const tipoN   = String(tipo_documento).toUpperCase();
    const numDocN = normNumDoc(tipoN, numero_documento);
    const tel     = String(telefono).trim();

    if (!TEL_RE.test(tel)) {
      return res.status(400).json({ msg: 'Teléfono no válido (8–12 dígitos, opcional +)' });
    }

    // fechaCreacion opcional: si no viene, usamos ahora
    const fecha = fechaCreacion ? new Date(fechaCreacion) : new Date();
    if (isNaN(fecha.getTime())) {
      return res.status(400).json({ msg: 'Fecha de creación no válida' });
    }
    const anio = fecha.getUTCFullYear();

    const rutN = tipoN === 'RUT' ? numDocN : (rut ? normRut(rut) : '');

    // Duplicados
    if (await Admin.findOne({ correo: correoN })) {
      return res.status(400).json({ msg: 'Ese correo ya está registrado' });
    }
    if (rutN && await Admin.findOne({ rut: rutN })) {
      return res.status(400).json({ msg: 'Ese RUT ya está registrado' });
    }
    if (await Admin.findOne({ tipo_documento: tipoN, numero_documento: numDocN })) {
      return res.status(400).json({ msg: 'Ya existe un usuario con ese documento' });
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
      habilitado: true,
      // nuevos
      tipo_documento: tipoN,
      numero_documento: numDocN,
      telefono: tel,
      fechaCreacion: fecha,
      anio
    });

    const { contrasena: _omit, ...safe } = prof.toObject();
    res.json({ msg: 'Profesor creado', profesor: safe });
  } catch (err) {
    if (err?.code === 11000) {
      if (err.keyPattern?.correo) return res.status(409).json({ msg: 'Correo ya registrado' });
      if (err.keyPattern?.rut)    return res.status(409).json({ msg: 'RUT ya registrado' });
      if (err.keyPattern?.tipo_documento && err.keyPattern?.numero_documento) {
        return res.status(409).json({ msg: 'Documento ya registrado' });
      }
      return res.status(409).json({ msg: 'Registro duplicado' });
    }
    console.error('crear profesor error:', err);
    res.status(500).json({ msg: 'Error al crear profesor' });
  }
});

/* ===== Listar profesores ===== */
router.get('/profesores', auth, requireRole('superadmin', 'admin'), async (_req, res) => {
  try {
    const profs = await Admin.find({ rol: 'profesor' })
      .select('-contrasena')
      .sort({ createdAt: -1 });
    res.json(profs);
  } catch (err) {
    console.error('listar profesores error:', err);
    res.status(500).json({ msg: 'Error al listar profesores' });
  }
});

/* Compat con front actual: GET /api/admin -> lista profesores */
router.get('/', auth, requireRole('superadmin', 'admin'), async (_req, res) => {
  try {
    const profs = await Admin.find({ rol: 'profesor' })
      .select('-contrasena')
      .sort({ createdAt: -1 });
    res.json(profs);
  } catch (err) {
    console.error('listar profesores (compat) error:', err);
    res.status(500).json({ msg: 'Error al listar profesores' });
  }
});

/* ===== Editar profesor ===== */
router.put('/profesores/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    delete body.contrasena;
    delete body.anio; // el año de creación no se edita

    if (body.correo) body.correo = normEmail(body.correo);

    if (body.tipo_documento || body.numero_documento) {
      const t = String(body.tipo_documento || '').toUpperCase();
      if (body.tipo_documento) body.tipo_documento = t;
      if (body.numero_documento) body.numero_documento = normNumDoc(t, body.numero_documento);
      if (t === 'RUT' && body.numero_documento) body.rut = body.numero_documento;
    }

    if (body.telefono) {
      const tel = String(body.telefono).trim();
      if (!TEL_RE.test(tel)) return res.status(400).json({ msg: 'Teléfono no válido' });
      body.telefono = tel;
    }

    if (body.fechaCreacion) {
      const f = new Date(body.fechaCreacion);
      if (isNaN(f.getTime())) return res.status(400).json({ msg: 'Fecha de creación no válida' });
      body.fechaCreacion = f;
      body.anio = f.getUTCFullYear();
    }

    const prof = await Admin.findOneAndUpdate(
      { _id: id, rol: 'profesor' },
      body,
      { new: true, runValidators: true }
    ).select('-contrasena');

    if (!prof) return res.status(404).json({ msg: 'Profesor no encontrado' });
    res.json(prof);
  } catch (err) {
    if (err?.code === 11000) {
      if (err.keyPattern?.correo) return res.status(409).json({ msg: 'Correo ya registrado' });
      if (err.keyPattern?.rut)    return res.status(409).json({ msg: 'RUT ya registrado' });
      if (err.keyPattern?.tipo_documento && err.keyPattern?.numero_documento) {
        return res.status(409).json({ msg: 'Documento ya registrado' });
      }
      return res.status(409).json({ msg: 'Registro duplicado' });
    }
    console.error('editar profesor error:', err);
    res.status(500).json({ msg: 'Error al actualizar profesor' });
  }
});

/* ===== Editar profesor (compat) ===== */
router.put('/:id', auth, requireRole('superadmin', 'admin'), async (req, res) => {
  req.url = `/profesores/${req.params.id}`; // redirige internamente
  return router.handle(req, res);
});

module.exports = router;