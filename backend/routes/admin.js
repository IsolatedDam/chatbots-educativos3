const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 🔐 Registrar superadmin o profesor
router.post('/registro', async (req, res) => {
  const {
    nombre,
    apellido,
    rut,
    correo,
    cargo,
    contrasena,
    rol,
    permisos
  } = req.body;

  try {
    // Validación de campos obligatorios
    if (!nombre || !apellido || !rut || !correo || !contrasena || !rol) {
      return res.status(400).json({ msg: 'Faltan campos obligatorios' });
    }

    // Validar correo y RUT únicos
    const existeCorreo = await Admin.findOne({ correo });
    if (existeCorreo) {
      return res.status(400).json({ msg: 'Ese correo ya está registrado' });
    }

    const existeRut = await Admin.findOne({ rut });
    if (existeRut) {
      return res.status(400).json({ msg: 'Ese RUT ya está registrado' });
    }

    // Encriptar contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    // Crear nuevo admin o profesor
    const nuevoAdmin = new Admin({
      nombre,
      apellido,
      rut,
      correo,
      cargo,
      contrasena: hash,
      rol,
      permisos: rol === 'profesor' ? permisos || { columnasEditable: [] } : undefined
    });

    await nuevoAdmin.save();
    res.json({ msg: `${rol === 'profesor' ? 'Profesor' : 'Administrador'} creado exitosamente` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: `Error al registrar ${rol === 'profesor' ? 'profesor' : 'administrador'}` });
  }
});

// 🔑 Login de superadmin o profesor (correo o RUT)
router.post('/login', async (req, res) => {
  const { rut, contrasena } = req.body;

  try {
    const admin = await Admin.findOne({
      $or: [{ rut }, { correo: rut }]
    });

    if (!admin) {
      return res.status(400).json({ msg: 'Usuario no encontrado' });
    }

    const esValida = await bcrypt.compare(contrasena, admin.contrasena);
    if (!esValida) {
      return res.status(400).json({ msg: 'Contraseña incorrecta' });
    }

    // Crear token JWT con el rol
    const token = jwt.sign(
      { id: admin._id, rol: admin.rol },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, admin });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error en el servidor' });
  }
});

module.exports = router;