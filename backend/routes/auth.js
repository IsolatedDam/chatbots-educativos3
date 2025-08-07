const express = require('express');
const router = express.Router();
const Alumno = require('../models/Alumno');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login de alumno (POST /api/login)
router.post('/login', async (req, res) => {
  const rut = req.body.rut?.trim();
  const contrasena = req.body.contrasena;

  console.log('🔑 Intentando login de alumno...');
  console.log('📥 RUT recibido:', rut);
  console.log('📥 Contraseña recibida:', contrasena);

  try {
    const alumno = await Alumno.findOne({
      $or: [
        { rut: rut },
        { numero_documento: rut, tipo_documento: 'RUT' }
      ]
    });

    console.log('📦 Alumno encontrado en DB:', alumno);

    if (!alumno) {
      console.warn('⚠️ Alumno no encontrado con ese rut');
      return res.status(400).json({ msg: 'Rut no encontrado' });
    }

    const esValida = await bcrypt.compare(contrasena, alumno.contrasena);
    console.log('🔐 ¿Contraseña válida?', esValida);

    if (!esValida) {
      console.warn('⚠️ Contraseña incorrecta');
      return res.status(400).json({ msg: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: alumno._id, rol: alumno.rol }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    const alumnoConRol = {
      ...alumno.toObject(),
      rol: alumno.rol
    };

    console.log('✅ Login exitoso. Token generado.');
    res.json({ token, alumno: alumnoConRol });
  } catch (err) {
    console.error('❌ Error en el login del alumno:', err);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

module.exports = router;