const express = require('express');
const router = express.Router();
const Visita = require('../models/Visita');
const { Parser } = require('json2csv');

// Registrar visita
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

// Exportar visitas a Excel (CSV)
router.get('/exportar', async (req, res) => {
  try {
    const visitas = await Visita.find().sort({ fechaHora: -1 });
    const fields = ['nombre', 'correo', 'whatsapp', 'fechaHora'];
    const parser = new Parser({ fields });
    const csv = parser.parse(visitas);

    res.header('Content-Type', 'text/csv');
    res.attachment('visitas.csv');
    return res.send(csv);
  } catch (err) {
    console.error('❌ Error al exportar visitas:', err);
    res.status(500).json({ msg: 'Error al exportar visitas' });
  }
});

// Obtener todas las visitas
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