const express = require('express');
const router = express.Router();
const Alumno = require('../models/Alumno');

// Obtener todos los alumnos
router.get('/', async (req, res) => {
  try {
    const alumnos = await Alumno.find();
    res.json(alumnos);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener alumnos' });
  }
});

// Actualizar un alumno
router.put('/:id', async (req, res) => {
  try {
    const alumno = await Alumno.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!alumno) return res.status(404).json({ msg: 'Alumno no encontrado' });
    res.json(alumno);
  } catch (err) {
    res.status(500).json({ msg: 'Error al actualizar alumno' });
  }
});

module.exports = router;