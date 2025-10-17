// routes/auth.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Alumno = require('../models/Alumno');
const Visita = require('../models/Visita'); // Importar el modelo Visita
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ⬇️ Usa los mismos middlewares que ocupas en otras rutas
const { verificarToken, autorizarRoles } = require('../middlewares/auth');

/* ========== Helpers ========== */
function normalizarRut(v = '') {
  return String(v).replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
}
function normalizarCorreo(v = '') {
  return String(v).trim().toLowerCase();
}
function normalizarNumeroDoc(tipo = '', numero = '') {
  if (String(tipo).toUpperCase() === 'RUT') return normalizarRut(numero);
  return String(numero).trim();
}
function generarContrasenaAleatoria(longitud = 10) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let clave = '';
  for (let i = 0; i < longitud; i++) clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  return clave;
}

const JORNADAS = ['Mañana', 'Tarde', 'Vespertino', 'Viernes', 'Sábados', 'Blearning', 'Online', 'Otras'];
const TEL_RE = /^\+?\d{8,12}$/;

/* ===========================================================
   POST /api/login  (Alumno)
   - Permite login con RUT (o con contraseña si existe)
=========================================================== */
router.post('/login', async (req, res) => {
  const rut = normalizarRut(req.body.rut || '');
  const contrasena = typeof req.body.contrasena === 'string' ? req.body.contrasena.trim() : '';

  if (!rut) return res.status(400).json({ msg: 'Debes ingresar el RUT' });

  try {
    const alumno = await Alumno.findOne({
      $or: [
        { rut },
        { numero_documento: rut, tipo_documento: 'RUT' }
      ]
    });

    if (!alumno) return res.status(400).json({ msg: 'RUT no encontrado' });

    if (contrasena) {
      const tieneHash = typeof alumno.contrasena === 'string' && alumno.contrasena.length > 0;
      const ok = tieneHash ? await bcrypt.compare(contrasena, alumno.contrasena) : false;
      if (!ok) return res.status(400).json({ msg: 'Contraseña incorrecta' });
    }

    if (alumno.habilitado === false) {
      return res.status(403).json({ msg: 'Tu acceso está deshabilitado' });
    }

    // Registrar visita (no bloqueante)
    const visita = new Visita({
      nombre: [alumno.nombre, alumno.apellido].filter(Boolean).join(' ') || 'Alumno',
      correo: alumno.correo,
      whatsapp: alumno.telefono || '-'
    });
    visita.save().catch(err => console.error('Error al guardar visita:', err));

    // no await intencional
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

/* ===========================================================
   POST /api/registro  (Alumno)
   - 🔐 Requiere token y rol: profesor | admin | superadmin
   - 🔑 Guarda createdBy = usuario que crea (profesor)
=========================================================== */
router.post(
  '/registro',
  verificarToken,
  autorizarRoles('profesor', 'admin', 'superadmin'),
  async (req, res) => {
    const {
      correo,
      tipo_documento,
      numero_documento,
      nombre,
      apellido,
      semestre,        // 1 | 2
      jornada,         // 'Mañana'|'Tarde'|'Vespertino'|'Viernes'|'Sábados'
      fechaIngreso,    // opcional (YYYY-MM-DD o ISO)
      telefono,
      contrasena
    } = req.body || {};

    try {
      // Requeridos y validaciones
      if (!correo) return res.status(400).json({ msg: 'El campo correo es obligatorio' });
      if (!tipo_documento || !numero_documento) return res.status(400).json({ msg: 'Tipo y número de documento son obligatorios' });
      // ... (otras validaciones)

      // Normalizaciones
      const correoN = normalizarCorreo(correo);
      const tipoN = String(tipo_documento).toUpperCase();
      const numeroDocN = normalizarNumeroDoc(tipoN, numero_documento);
      const rut = tipoN === 'RUT' ? numeroDocN : null;

      const meId = String(req.usuario?.id || req.user?.id || '');
      if (!meId) return res.status(401).json({ msg: 'No autorizado' });
      
      const meObjectId = new mongoose.Types.ObjectId(meId);

      // --- Inicio de la lógica corregida ---

      // 1. Buscar al alumno por sus identificadores únicos.
      const searchConditions = [{ correo: correoN }];
      if (rut) {
        searchConditions.push({ rut: rut });
      }
      // Añadir la condición del documento solo si no es un RUT (para evitar redundancia)
      if (tipoN !== 'RUT' || !rut) {
        searchConditions.push({ tipo_documento: tipoN, numero_documento: numeroDocN });
      }

      const existingStudent = await Alumno.findOne({ $or: searchConditions });

      // 2. Decidir si crear un nuevo alumno o asociar el existente.
      if (existingStudent) {
        // El alumno ya existe. Usar $addToSet para asegurar que el ID del profesor se añade sin duplicados.
        await Alumno.updateOne(
          { _id: existingStudent._id },
          { $addToSet: { createdBy: meObjectId } }
        );
        
        return res.status(200).json({ msg: 'Alumno existente ha sido asociado a tu cuenta.' });

      } else {
        // El alumno no existe. Lo creamos.
        const contrasenaFinal = contrasena || generarContrasenaAleatoria();
        const hash = await bcrypt.hash(contrasenaFinal, 10);

        const nuevo = new Alumno({
          rut,
          correo: correoN,
          contrasena: hash,
          tipo_documento: tipoN,
          numero_documento: numeroDocN,
          nombre,
          apellido,
          telefono: String(telefono).trim(),
          semestre: Number(semestre),
          jornada,
          fechaIngreso: new Date(fechaIngreso || Date.now()),
          rol: 'alumno',
          habilitado: true,
          createdBy: [meObjectId], // Se crea como un array con el ID del profesor.
        });

        await nuevo.save();
        return res.status(201).json({ msg: 'Alumno creado exitosamente', contrasena: contrasenaFinal });
      }
      // --- Fin de la lógica corregida ---
    } catch (err) {
      if (err?.code === 11000) {
        const key = Object.keys(err.keyPattern || {})[0] || '';
        let msg = 'Registro duplicado';
        if (key === 'correo') msg = 'El correo ya está registrado';
        else if (key === 'rut') msg = 'El RUT ya está registrado';
        else if (err?.message?.includes('unique_doc')) {
          msg = 'Ya existe un alumno con ese tipo y número de documento';
        }
        return res.status(409).json({ msg });
      }
      console.error('❌ Error al registrar alumno:', err);
      return res.status(500).json({ msg: 'Error al registrar alumno' });
    }
  }
);

module.exports = router;