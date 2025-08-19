const express = require('express');
const router = express.Router();
const Alumno = require('../models/Alumno');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

const JORNADAS = ['Mañana', 'Tarde', 'Vespertino', 'Viernes', 'Sábados'];
const TEL_RE = /^\+?\d{8,12}$/;

/* ===========================================================
   POST /api/login  (Alumno)
   - Permite login SOLO con RUT (sin contraseña), o con contraseña si la envían.
=========================================================== */
router.post('/login', async (req, res) => {
  const rut = normalizarRut(req.body.rut);
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
   - Usa fechaIngreso (opcional, por defecto HOY). El modelo deriva 'anio'.
=========================================================== */
router.post('/registro', async (req, res) => {
  const {
    correo,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    semestre,        // 1 | 2
    jornada,         // 'Mañana'|'Tarde'|'Vespertino'|'Viernes'|'Sábados'
    fechaIngreso,    // opcional (YYYY-MM-DD ó ISO). Si no llega, se usa hoy.
    telefono,
    contrasena
  } = req.body;

  try {
    // === Requeridos base ===
    if (!correo) return res.status(400).json({ msg: 'El campo correo es obligatorio' });
    if (!tipo_documento || !numero_documento) {
      return res.status(400).json({ msg: 'Tipo y número de documento son obligatorios' });
    }
    if (!telefono) return res.status(400).json({ msg: 'El campo teléfono es obligatorio' });
    if (!jornada) return res.status(400).json({ msg: 'El campo jornada es obligatorio' });

    // Normalizaciones
    const correoN = normalizarCorreo(correo);
    const tipoN = String(tipo_documento).toUpperCase();
    const numeroDocN = normalizarNumeroDoc(tipoN, numero_documento);
    const rut = tipoN === 'RUT' ? numeroDocN : null;

    // Semestre
    const semestreNum = Number(semestre);
    if (![1, 2].includes(semestreNum)) {
      return res.status(400).json({ msg: 'Semestre debe ser 1 o 2' });
    }

    // Jornada
    if (!JORNADAS.includes(String(jornada))) {
      return res.status(400).json({ msg: `Jornada no válida. Opciones: ${JORNADAS.join(', ')}` });
    }

    // Teléfono
    const tel = String(telefono).trim();
    if (!TEL_RE.test(tel)) {
      return res.status(400).json({ msg: 'Teléfono no válido' });
    }

    // Parse fechaIngreso
    let fIngreso;
    if (!fechaIngreso) {
      fIngreso = new Date();
    } else if (typeof fechaIngreso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fechaIngreso)) {
      fIngreso = new Date(`${fechaIngreso}T00:00:00Z`);
    } else {
      fIngreso = new Date(fechaIngreso);
    }
    if (Number.isNaN(fIngreso.getTime())) {
      return res.status(400).json({ msg: 'Fecha de ingreso no válida' });
    }

    // Duplicados (mensajes claros)
    const existeCorreo = await Alumno.findOne({ correo: correoN });
    if (existeCorreo) return res.status(400).json({ msg: 'El correo ya está registrado' });

    if (rut) {
      const existeRut = await Alumno.findOne({ rut });
      if (existeRut) return res.status(400).json({ msg: 'El alumno ya existe con ese RUT' });
    } else {
      const existeDoc = await Alumno.findOne({ tipo_documento: tipoN, numero_documento: numeroDocN });
      if (existeDoc) return res.status(400).json({ msg: 'Ya existe un alumno con ese documento' });
    }

    // Password
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
      telefono: tel,
      semestre: semestreNum,
      jornada,
      fechaIngreso: fIngreso, // ✅ 'anio' se deriva en el pre('validate') del modelo
      rol: 'alumno',
      habilitado: true,
      aviso_suspension: false,
      rehabilitar_acceso: false,
      conteo_ingresos: 0,
      color_riesgo: 'verde'
    });

    await nuevo.save();
    res.status(201).json({ msg: 'Alumno creado exitosamente', contrasena: contrasenaFinal });
  } catch (err) {
    if (err?.code === 11000) {
      const key = Object.keys(err.keyPattern || {})[0] || '';
      let msg = 'Registro duplicado';
      if (key === 'correo') msg = 'El correo ya está registrado';
      else if (key === 'rut') msg = 'El RUT ya está registrado';
      else if (err?.message?.includes('unique_doc')) msg = 'Ya existe un alumno con ese tipo y número de documento';
      return res.status(409).json({ msg });
    }
    console.error('❌ Error al registrar alumno:', err);
    res.status(500).json({ msg: 'Error al registrar alumno' });
  }
});

module.exports = router;