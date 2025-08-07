const express = require('express');
const router = express.Router();
const Alumno = require('../models/Alumno');
const bcrypt = require('bcryptjs');

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

    if (!correo) return res.status(400).json({ msg: 'El campo correo es obligatorio' });

    const existeCorreo = await Alumno.findOne({ correo });
    if (existeCorreo) return res.status(400).json({ msg: 'El correo ya está registrado' });

    if (rut) {
      const existeRut = await Alumno.findOne({ rut });
      if (existeRut) return res.status(400).json({ msg: 'El alumno ya existe con ese RUT' });
    }

    const contrasenaGenerada = generarContrasenaAleatoria();
    const hash = await bcrypt.hash(contrasenaGenerada, 10);

    // 🔍 LOGS IMPORTANTES
    console.log('📥 Contraseña generada (plano):', contrasenaGenerada);
    console.log('📦 Contraseña hasheada (guardada en DB):', hash);

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

    console.log(`✅ Alumno registrado: ${correo}`);
    res.json({ msg: 'Alumno creado exitosamente', contrasena: contrasenaGenerada });
  } catch (err) {
    console.error('❌ Error al registrar alumno:', err);
    res.status(500).json({ msg: 'Error al registrar alumno' });
  }
});

module.exports = router;