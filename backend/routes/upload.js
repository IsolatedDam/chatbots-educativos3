// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Alumno = require('../models/Alumno');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// =======================
// Multer: uploads seguros
// =======================
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      /\.xlsx?$/i.test(file.originalname);
    if (!ok) return cb(new Error('Formato no soportado. Sube un .xlsx o .xls'));
    cb(null, true);
  },
});

// =======================
// Helpers de normalización
// =======================
const TELEFONO_RE_LOCAL = /^\d{8,12}$/;   // p.ej. 912345678
const TELEFONO_RE_INTL  = /^\+\d{8,12}$/; // p.ej. +56912345678
const toStr = (v) => (v ?? '').toString();

const removeDiacritics = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normKey = (k) => removeDiacritics(String(k || '').trim().toLowerCase());

// pick robusto para encabezados "raros" (tildes/espacios invisibles)
const pick = (row, keys) => {
  const map = {};
  for (const k of Object.keys(row)) map[normKey(k)] = row[k];
  for (const want of keys) {
    const nk = normKey(want);
    const val = map[nk];
    if (val !== undefined && val !== null && val !== '') return val;
  }
  return undefined;
};

const mapTipoDoc = (v) => {
  const s = toStr(v).trim().toUpperCase();
  return s || 'RUT';
};

// Normaliza documento/RUT: deja dígitos y K (sin puntos/guiones/espacios)
const normDocumento = (v) => {
  let s = toStr(v).trim().toUpperCase();
  if (!s) return '';
  s = s.replace(/[^0-9K]/g, '');
  return s;
};

// enum válido: ['Mañana','Tarde','Vespertino','Viernes','Sábados']
const mapJornada = (v) => {
  const s = toStr(v).trim().toLowerCase();
  if (!s) return undefined;
  if (['diurna', 'mañana', 'manana', 'am'].includes(s)) return 'Mañana';
  if (['tarde', 'pm'].includes(s)) return 'Tarde';
  if (['vespertina', 'vespertino', 'noche'].includes(s)) return 'Vespertino';
  if (['viernes'].includes(s)) return 'Viernes';
  if (['sabados', 'sábados', 'sabado', 'sábado'].includes(s)) return 'Sábados';
  const cap = s.charAt(0).toUpperCase() + s.slice(1);
  if (['Mañana','Tarde','Vespertino','Viernes','Sábados'].includes(cap)) return cap;
  return undefined;
};

// SOLO 1 o 2
const mapSemestre = (v) => {
  const n = Number.parseInt(toStr(v).trim(), 10);
  return (n === 1 || n === 2) ? n : undefined;
};

// Teléfono robusto: acepta número Excel, espacios, guiones, paréntesis, +
const normTelefono = (v) => {
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  s = s.replace(/[^\d+]/g, ''); // deja dígitos y '+'
  if (s.includes('+')) {
    s = s.replace(/\+(?=.)/g, '');
    if (s[0] !== '+') s = '+' + s;
  }
  if (!s) return null;
  s = s.replace(/\.0+$/, ''); // quita .0 de floats tipo 912345678.0
  if (s.startsWith('+')) return TELEFONO_RE_INTL.test(s) ? s : null;
  return TELEFONO_RE_LOCAL.test(s) ? s : null;
};

// Fecha d/m/a o serial Excel
const parseFechaDMY = (v) => {
  if (v == null || v === '') return undefined;
  if (typeof v === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30)); // base Excel
    const ms = v * 24 * 60 * 60 * 1000;
    const d = new Date(epoch.getTime() + ms);
    return isNaN(d) ? undefined : d;
  }
  const s = toStr(v).trim();
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const dd = parseInt(m[1], 10);
    const MM = parseInt(m[2], 10) - 1;
    const yyyy = parseInt(m[3].length === 2 ? ('20' + m[3]) : m[3], 10);
    const d = new Date(yyyy, MM, dd);
    return isNaN(d) ? undefined : d;
  }
  const d = new Date(s);
  return isNaN(d) ? undefined : d;
};

// Pass temporal sencillo
const generarContrasenaAleatoria = (longitud = 10) => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let clave = '';
  for (let i = 0; i < longitud; i++) clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  return clave;
};

// =============================================
// POST /upload/masivo — carga masiva desde XLSX
// ?dryRun=1  -> solo preview
// ?debug=1   -> logs y conteos
// ?returnDocs=1 -> devuelve _id insertados
// =============================================
router.post('/masivo', upload.single('archivo'), async (req, res) => {
  let tmpPath = null;
  const debug = ['1','true','yes'].includes(String(req.query.debug).toLowerCase());
  const returnDocs = ['1','true','yes'].includes(String(req.query.returnDocs).toLowerCase());

  try {
    if (!req.file) return res.status(400).json({ msg: 'No se subió ningún archivo' });
    tmpPath = req.file.path;

    const wb = XLSX.readFile(tmpPath);
    const sheetName = wb.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });

    const isDryRun = ['1','true','yes'].includes(String(req.query.dryRun).toLowerCase());
    const resultados = { exitosos: 0, fallidos: 0, errores: [] };
    const savedIds = [];

    let countBefore = null, countAfter = null;
    try { countBefore = await Alumno.countDocuments(); } catch (_) {}

    if (debug) console.log(`[upload/masivo] filas leídas: ${rows.length} | dryRun=${isDryRun}`);

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];

      // === Lectura según tus headers de Excel ===
      const correo = toStr(pick(r, ['correo','email','mail'])).trim().toLowerCase();
      const tipo_documento = mapTipoDoc(pick(r, ['tipo_documento','tipo']));

      const numero_documento_raw = pick(r, ['numero_documento','rut','documento','rodada rut']);
      const numero_documento = normDocumento(numero_documento_raw);

      const nombre = toStr(pick(r, ['nombre','nombres'])).trim();
      const apellido = toStr(pick(r, ['apellido','apellidos'])).trim();

      const semestre_raw = pick(r, ['semestre','semestre 1/2']);
      const semestre = mapSemestre(semestre_raw);

      const jornada_raw = pick(r, ['jornada','Jornada']);
      const jornada = mapJornada(jornada_raw);

      const telefonoRaw = pick(r, ['telefono','teléfono','tel\u00E9fono','tel','celular','phone']);
      const telefono = normTelefono(telefonoRaw);

      const fechaIngreso_raw = pick(r, ['fecha d/m/a','fecha','fecha_ingreso']);
      const fechaIngreso = parseFechaDMY(fechaIngreso_raw);

      // --- Preview / diagnóstico ---
      if (isDryRun) {
        if (!resultados.preview) resultados.preview = [];
        resultados.preview.push({
          fila: i + 2,
          correo, tipo_documento,
          numero_documento_raw, numero_documento,
          nombre, apellido,
          telefono_raw: telefonoRaw, telefono,
          jornada_raw, jornada,
          semestre_raw, semestre,
          fechaIngreso_raw,
          fechaIngreso: fechaIngreso ? fechaIngreso.toISOString().slice(0,10) : undefined
        });
        continue;
      }

      try {
        // === Validaciones según schema ===
        if (!correo) throw new Error('Falta correo');
        if (!numero_documento) throw new Error('Falta o inválido número de documento');
        if (!nombre || !apellido) throw new Error('Falta nombre/apellido');
        if (!tipo_documento) throw new Error('Tipo de documento requerido');
        if (!jornada) throw new Error("Jornada inválida (usa: Mañana, Tarde, Vespertino, Viernes, Sábados)");
        if (semestre === undefined) throw new Error('Semestre inválido (solo 1 o 2)');
        if (!telefono) throw new Error("Teléfono inválido o ausente (usa 8–12 dígitos, p.ej. 912345678 o +569XXXXXXXX)");

        // Duplicados
        const [dupCorreo, dupDoc] = await Promise.all([
          Alumno.findOne({ correo }).lean(),
          Alumno.findOne({ tipo_documento, numero_documento }).lean(),
        ]);
        if (dupCorreo) throw new Error('Correo ya registrado');
        if (dupDoc) throw new Error('Documento ya registrado');

        // Credenciales
        const passTemp = generarContrasenaAleatoria();
        const hash = await bcrypt.hash(passTemp, 10);

        const alumno = new Alumno({
          rut: numero_documento,
          numero_documento,
          tipo_documento,
          nombre,
          apellido,
          correo,
          telefono,
          jornada,
          semestre,
          contrasena: hash,
          rol: 'alumno',
          habilitado: true,
          aviso_suspension: false,
          rehabilitar_acceso: false,
          conteo_ingresos: 0,
          color_riesgo: 'verde',
          ...(fechaIngreso ? { fechaIngreso } : {}),
        });

        const saved = await alumno.save();
        resultados.exitosos++;
        if (returnDocs && saved?._id) savedIds.push(saved._id.toString());
      } catch (e) {
        resultados.fallidos++;
        resultados.errores.push({ fila: i + 2, correo, error: e.message || 'Error desconocido' });
      }
    }

    try { countAfter = await Alumno.countDocuments(); } catch (_) {}

    const body = {
      ...resultados,
      filas_leidas: rows.length,
      dryRun: isDryRun,
      countBefore,
      countAfter,
      ...(returnDocs ? { insertedIds: savedIds } : {})
    };

    if (debug) console.log('[upload/masivo] resumen:', body);
    return res.json(body);

  } catch (err) {
    console.error('Error general:', err);
    return res.status(500).json({ msg: 'Error procesando archivo' });
  } finally {
    if (tmpPath) {
      fs.promises.unlink(tmpPath).catch(() => {});
    }
  }
});

// ==========================================
// GET /upload/alumnos — listar sin password
// ==========================================
router.get('/alumnos', async (_req, res) => {
  try {
    const alumnos = await Alumno.find({}, '-contrasena -__v').lean();
    res.json(alumnos);
  } catch (err) {
    console.error('Error al obtener alumnos:', err);
    res.status(500).json({ msg: 'Error al obtener alumnos' });
  }
});

// ==========================================
// GET /upload/health — sanity check
// ==========================================
router.get('/health', async (_req, res) => {
  try {
    const count = await Alumno.countDocuments();
    const last = await Alumno.findOne({}, '-contrasena -__v').sort({ _id: -1 }).lean();
    res.json({ ok: true, count, lastSample: last || null, dbUri: process.env.MONGODB_URI ? 'set' : 'unset' });
  } catch (err) {
    console.error('health error:', err);
    res.status(500).json({ ok: false, error: 'No se pudo leer la colección de alumnos' });
  }
});

module.exports = router;