// routes/visitas.js
const express = require('express');
const router = express.Router();
const Visita = require('../models/Visita');
const { Parser } = require('json2csv'); // lo dejamos por si quisieras un endpoint CSV también
const ExcelJS = require('exceljs');

/* ========= Registrar visita ========= */
router.post('/registro', async (req, res) => {
  console.log('👉 Datos recibidos en visita:', req.body); // Para depuración

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

/* ========= Exportar visitas como XLSX =========
   GET /api/visitas/exportar
   - Devuelve un .xlsx válido con las columnas: Nombre, Correo, WhatsApp, Fecha y Hora
   - Formato de fecha: dd/mm/yyyy hh:mm
================================================ */
router.get('/exportar', async (req, res) => {
  try {
    const visitas = await Visita.find().sort({ fechaHora: -1 }).lean();

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Chatbots Educativos';
    wb.created = new Date();

    const ws = wb.addWorksheet('Visitas');

    ws.columns = [
      { header: 'Nombre',       key: 'nombre',    width: 28 },
      { header: 'Correo',       key: 'correo',    width: 34 },
      { header: 'WhatsApp',     key: 'whatsapp',  width: 18 },
      { header: 'Fecha y Hora', key: 'fechaHora', width: 22 },
    ];

    // Encabezados en negrita
    ws.getRow(1).font = { bold: true };

    // Agregar filas
    visitas.forEach((v) => {
      const dt = v.fechaHora ? new Date(v.fechaHora) : null;
      ws.addRow({
        nombre:   v.nombre || '',
        correo:   v.correo || '',
        whatsapp: v.whatsapp || '',
        // ExcelJS usa números de fecha/tiempo; si pasas Date, luego puedes aplicar numFmt
        fechaHora: dt || '',
      });
    });

    // Aplicar formato de fecha/hora a toda la columna D
    const fechaCol = ws.getColumn('fechaHora');
    fechaCol.numFmt = 'dd/mm/yyyy hh:mm';

    // Bordes suaves y ajuste de texto opcional
    ws.eachRow((row, rowNumber) => {
      row.alignment = { vertical: 'middle', wrapText: false };
      row.eachCell((cell) => {
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left:   { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right:  { style: 'thin', color: { argb: 'FFDDDDDD' } },
        };
      });
    });

    // Headers HTTP correctos
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename="visitas.xlsx"');

    // Stream del XLSX al response
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Error al exportar visitas (xlsx):', err);
    res.status(500).json({ msg: 'Error al exportar visitas' });
  }
});

/* ========= (Opcional) Exportar visitas como CSV =========
   Si quieres mantener también CSV, puedes exponer /api/visitas/exportar-csv
========================================================= */
router.get('/exportar-csv', async (req, res) => {
  try {
    const visitas = await Visita.find().sort({ fechaHora: -1 }).lean();
    const fields = ['nombre', 'correo', 'whatsapp', 'fechaHora'];
    const parser = new Parser({ fields });
    const csv = parser.parse(visitas);

    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.attachment('visitas.csv');
    res.send(csv);
  } catch (err) {
    console.error('❌ Error al exportar visitas (csv):', err);
    res.status(500).json({ msg: 'Error al exportar visitas' });
  }
});

/* ========= Obtener todas las visitas ========= */
router.get('/', async (req, res) => {
  try {
    const visitas = await Visita.find().sort({ fechaHora: -1 });
    res.json(visitas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener visitas' });
  }
});

module.exports = router;