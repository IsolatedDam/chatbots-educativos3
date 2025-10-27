// routes/visitas.js
const express = require('express');
const router = express.Router();
const Visita = require('../models/Visita');
const Alumno = require('../models/Alumno');
const { verificarToken, autorizarRoles } = require('../middlewares/auth');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');

/* ========= Registrar visita (Público) ========= */
router.post('/registro', async (req, res) => {
  console.log('👉 Datos recibidos en visita:', req.body);

  const { nombre, correo, whatsapp } = req.body;

  if (!nombre || !correo || !whatsapp) {
    console.log('❌ Faltan campos obligatorios');
    return res.status(400).json({ msg: 'Todos los campos son obligatorios' });
  }

  try {
    const nuevaVisita = new Visita({ nombre, correo, whatsapp });
    await nuevaVisita.save();
    console.log('✅ Visita registrada correctamente');
    res.json({ msg: 'Visita registrada correctamente' });
  } catch (err) {
    console.error('❌ Error completo al registrar visita:', err);
    res.status(500).json({ msg: 'Error al registrar visita' });
  }
});

/* ========= Exportar TODAS las visitas como XLSX (Solo Superadmin) ========= */
router.get('/exportar', verificarToken, autorizarRoles('superadmin'), async (req, res) => {
  try {
    const visitas = await Visita.aggregate([
      {
        $group: {
          _id: '$correo',
          nombre: { $first: '$nombre' },
          whatsapp: { $first: '$whatsapp' },
          visitas: { $sum: 1 },
          ultimaVisita: { $max: '$fechaHora' },
        },
      },
      { $sort: { ultimaVisita: -1 } },
      {
        $project: {
          _id: 0,
          correo: '$_id',
          nombre: 1,
          whatsapp: 1,
          visitas: 1,
          ultimaVisita: 1,
        },
      },
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Chatbots Educativos';
    wb.created = new Date();
    const ws = wb.addWorksheet('Visitas');

    ws.columns = [
      { header: 'Nombre', key: 'nombre', width: 28 },
      { header: 'Correo', key: 'correo', width: 34 },
      { header: 'WhatsApp', key: 'whatsapp', width: 18 },
      { header: 'N° de Visitas', key: 'visitas', width: 15 },
      { header: 'Última Visita', key: 'ultimaVisita', width: 22 },
    ];
    ws.getRow(1).font = { bold: true };

    visitas.forEach((v) => {
      ws.addRow({
        nombre: v.nombre || '',
        correo: v.correo || '',
        whatsapp: v.whatsapp || '',
        visitas: v.visitas || 0,
        ultimaVisita: v.ultimaVisita ? new Date(v.ultimaVisita) : '',
      });
    });

    ws.getColumn('ultimaVisita').numFmt = 'dd/mm/yyyy hh:mm';
    ws.eachRow((row) => {
      row.alignment = { vertical: 'middle', wrapText: false };
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="visitas_totales.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Error al exportar todas las visitas (xlsx):', err);
    res.status(500).json({ msg: 'Error al exportar visitas' });
  }
});

/* ========= Obtener TODAS las visitas (Solo Superadmin) ========= */
router.get('/', verificarToken, autorizarRoles('superadmin'), async (req, res) => {
  try {
    const visitas = await Visita.aggregate([
      {
        $group: {
          _id: '$correo',
          nombre: { $first: '$nombre' },
          whatsapp: { $first: '$whatsapp' },
          visitas: { $sum: 1 },
          ultimaVisita: { $max: '$fechaHora' },
        },
      },
      { $sort: { ultimaVisita: -1 } },
      {
        $project: {
          _id: 0,
          correo: '$_id',
          nombre: 1,
          whatsapp: 1,
          visitas: 1,
          ultimaVisita: 1,
        },
      },
    ]);
    res.json(visitas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener visitas' });
  }
});

/* ========= Obtener visitas DE MIS ALUMNOS (Solo Profesor) ========= */
router.get('/alumnos', verificarToken, autorizarRoles('profesor'), async (req, res) => {
  try {
    const { id: profesorId } = req.usuario;

    // 1. Encontrar los alumnos de este profesor
    const alumnos = await Alumno.find({ createdBy: profesorId }).lean();

    // 2. Si no tiene alumnos, no puede ver ninguna visita
    if (!alumnos || alumnos.length === 0) {
      return res.json([]);
    }

    // 3. Extraer sus correos
    const correosAlumnos = alumnos.map((a) => a.correo);

    // 4. Crear el filtro para que `correo` esté en la lista de sus alumnos
    const filtroVisitas = { correo: { $in: correosAlumnos } };

    const visitas = await Visita.aggregate([
      { $match: filtroVisitas },
      {
        $group: {
          _id: '$correo',
          nombre: { $first: '$nombre' },
          whatsapp: { $first: '$whatsapp' },
          visitas: { $sum: 1 },
          ultimaVisita: { $max: '$fechaHora' },
        },
      },
      { $sort: { ultimaVisita: -1 } },
      {
        $project: {
          _id: 0,
          correo: '$_id',
          nombre: 1,
          whatsapp: 1,
          visitas: 1,
          ultimaVisita: 1,
        },
      },
    ]);
    res.json(visitas);
  } catch (err) {
    console.error('Error al obtener visitas de alumnos:', err);
    res.status(500).json({ msg: 'Error al obtener las visitas de los alumnos' });
  }
});

/* ========= Eliminar todas las visitas de un correo (Solo Superadmin) ========= */
router.delete('/:correo', verificarToken, autorizarRoles('superadmin'), async (req, res) => {
  try {
    const { correo } = req.params;
    const result = await Visita.deleteMany({ correo });

    if (result.deletedCount === 0) {
      return res.status(404).json({ msg: 'No se encontraron visitas para el correo proporcionado.' });
    }

    res.json({ msg: `Se eliminaron ${result.deletedCount} visitas.` });
  } catch (err) {
    console.error('Error al eliminar visitas:', err);
    res.status(500).json({ msg: 'Error al eliminar visitas' });
  }
});


module.exports = router;
