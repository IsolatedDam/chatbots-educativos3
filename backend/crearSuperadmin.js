const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('./models/Admin');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const rut = '12345678-9';
  const correo = 'superadmin@masoterapia.cl';
  const contrasena = 'admin123';
  const nombre = 'Super';
  const apellido = 'Admin';

  const existe = await Admin.findOne({ rut });
  if (existe) {
    console.log('⚠️ Ya existe un superadmin con ese RUT');
    process.exit();
  }

  const hash = await bcrypt.hash(contrasena, 10);

  const admin = new Admin({
    rut,
    correo,
    contrasena: hash,
    nombre,
    apellido,
    rol: 'superadmin'
  });

  await admin.save();
  console.log('✅ Superadmin creado con RUT');
  process.exit();
});