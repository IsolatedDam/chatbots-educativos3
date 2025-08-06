const express = require('express');
const router = express.Router();
const Alumno = require('../models/Alumno');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Función auxiliar para generar contraseña aleatoria
function generarContrasenaAleatoria(longitud = 10) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let clave = '';
  for (let i = 0; i < longitud; i++) {
    clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return clave;
}

// Registro de alumno
router.post('/registro', async (req, res) => {
  const {
    correo,
    tipo_documento,
    numero_documento,
    nombre,
    apellido,
    semestre,
    jornada
  } = req.body;

  try {
    const rut = tipo_documento === 'RUT' ? numero_documento : null;

    if (!correo) {
      return res.status(400).json({ msg: 'El campo correo es obligatorio' });
    }

    const existeCorreo = await Alumno.findOne({ correo });
    if (existeCorreo) return res.status(400).json({ msg: 'El correo ya está registrado' });

    if (rut) {
      const existeRut = await Alumno.findOne({ rut });
      if (existeRut) return res.status(400).json({ msg: 'El alumno ya existe con ese RUT' });
    }

    const contrasenaGenerada = generarContrasenaAleatoria();
    const hash = await bcrypt.hash(contrasenaGenerada, 10);

    const nuevo = new Alumno({
      rut,
      correo,
      contrasena: hash,
      tipo_documento,
      numero_documento,
      nombre,
      apellido,
      semestre,
      jornada,
      rol: 'alumno',
      habilitado: true,
      aviso_suspension: false,
      rehabilitar_acceso: false,
      conteo_ingresos: 0,
      color_riesgo: 'verde'
    });

    await nuevo.save();

    res.json({ msg: 'Alumno creado exitosamente', contrasena: contrasenaGenerada });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al registrar alumno' });
  }
});

// Login de alumno
router.post('/login', async (req, res) => {
  const rut = req.body.rut?.trim();
  const contrasena = req.body.contrasena;

  try {
    const alumno = await Alumno.findOne({
      $or: [
        { rut: rut },
        { numero_documento: rut, tipo_documento: 'RUT' }
      ]
    });

    if (!alumno) return res.status(400).json({ msg: 'Rut no encontrado' });

    const esValida = await bcrypt.compare(contrasena, alumno.contrasena);
    if (!esValida) return res.status(400).json({ msg: 'Contraseña incorrecta' });

    // Incluimos el rol desde el documento del alumno
    const token = jwt.sign({ id: alumno._id, rol: alumno.rol }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    const alumnoConRol = {
      ...alumno.toObject(),
      rol: alumno.rol // ✅ Asegura que el frontend lo reciba
    };

    res.json({ token, alumno: alumnoConRol });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

// Obtener todos los alumnos (sin contraseñas)
router.get('/alumnos', async (req, res) => {
  try {
    const alumnos = await Alumno.find({}, '-contrasena -__v');
    res.json(alumnos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al obtener alumnos' });
  }
});

module.exports = router;