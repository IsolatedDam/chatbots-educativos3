// routes/admin.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const Admin   = require('../models/Admin');
const { verificarToken, autorizarRoles } = require('../middlewares/auth');

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

/* ===== Login ===== */
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

/* ===== Crear Admin (solo superadmin) ===== */
router.post('/registro', verificarToken, autorizarRoles('superadmin'), async (req, res) => {
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

/* ===== Crear PROFESOR (admin/superadmin; profesor pasa como admin según auth.js) ===== */
router.post('/profesores', verificarToken, autorizarRoles('admin', 'superadmin'), async (req, res) => {
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
      fechaCreacion, // opcional
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

    const fecha = fechaCreacion ? new Date(fechaCreacion) : new Date();
    if (isNaN(fecha.getTime())) return res.status(400).json({ msg: 'Fecha de creación no válida' });
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

    const ap = (apellido || '').trim();
    const prof = await Admin.create({
      nombre,
      apellido: ap,
      apellidos: ap, // compat
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

/* ===== Listar profesores (admin/superadmin) ===== */
router.get('/profesores', verificarToken, autorizarRoles('admin', 'superadmin'), async (_req, res) => {
  try {
    const users = await Admin.find({ rol: { $in: ['profesor', 'admin'] } })
      .select('-contrasena')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('listar profesores/admin error:', err);
    res.status(500).json({ msg: 'Error al listar usuarios' });
  }
});

/* Compat con front actual: GET /api/admin -> misma lista */
router.get('/', verificarToken, autorizarRoles('admin', 'superadmin'), async (_req, res) => {
  try {
    const users = await Admin.find({ rol: { $in: ['profesor', 'admin'] } })
      .select('-contrasena')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('listar profesores/admin (compat) error:', err);
    res.status(500).json({ msg: 'Error al listar usuarios' });
  }
});

/* ===== Editar profesor/admin (admin/superadmin) ===== */
router.put('/profesores/:id', verificarToken, autorizarRoles('admin', 'superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };

    delete body.contrasena;
    delete body.anio;

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

    if (typeof body.apellido === 'string' && body.apellido.trim()) {
      body.apellido  = body.apellido.trim();
      body.apellidos = body.apellido;
    } else if (typeof body.apellidos === 'string' && body.apellidos.trim()) {
      body.apellidos = body.apellidos.trim();
      body.apellido  = body.apellidos;
    }

    const prof = await Admin.findOneAndUpdate(
      { _id: id, rol: { $in: ['profesor', 'admin'] } },
      body,
      { new: true, runValidators: true }
    ).select('-contrasena');

    if (!prof) return res.status(404).json({ msg: 'Usuario no encontrado' });
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
    console.error('editar usuario error:', err);
    res.status(500).json({ msg: 'Error al actualizar usuario' });
  }
});

/* ===== Editar (compat) ===== */
router.put('/:id', verificarToken, autorizarRoles('admin', 'superadmin'), (req, res) => {
  req.url = `/profesores/${req.params.id}`;
  return router.handle(req, res);
});

/* ====== HANDLER ÚNICO PARA ELIMINAR (admin/superadmin; profesor pasa como admin) ====== */
async function deleteAdminOrProfesor(req, res) {
  try {
    const { id } = req.params;

    const target = await Admin.findById(id).select('_id rol');
    if (!target) return res.status(404).json({ msg: 'Usuario no encontrado (id inválido)' });

    const targetRol = String(target.rol || '').toLowerCase();
    const meRol     = String(req.usuario?.rol || '').toLowerCase();

    if (targetRol === 'superadmin') {
      return res.status(403).json({ msg: 'No puedes eliminar a un superadmin' });
    }
    if (targetRol === 'admin' && meRol !== 'superadmin') {
      return res.status(403).json({ msg: 'Solo un superadmin puede eliminar a un admin' });
    }
    if (!['profesor', 'admin'].includes(targetRol)) {
      return res.status(409).json({ msg: 'El usuario no es profesor/admin' });
    }

    await Admin.deleteOne({ _id: id });
    return res.json({ msg: `Usuario (${targetRol}) eliminado` });
  } catch (err) {
    console.error('eliminar admin/profesor error:', err);
    return res.status(500).json({ msg: 'Error al eliminar usuario' });
  }
}

/* ====== ELIMINAR (RUTA OFICIAL) ====== */
// DELETE /api/admin/profesores/:id
router.delete('/profesores/:id', verificarToken, autorizarRoles('admin', 'superadmin'), deleteAdminOrProfesor);

/* ====== ELIMINAR (RUTA COMPAT) ====== */
// DELETE /api/admin/:id
router.delete('/:id', verificarToken, autorizarRoles('admin', 'superadmin'), deleteAdminOrProfesor);

module.exports = router;