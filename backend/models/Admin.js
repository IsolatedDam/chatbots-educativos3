const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  rut: { type: String, required: true, unique: true },
  correo: { type: String, required: true, unique: true },
  contrasena: { type: String, required: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },      // ⬅️ Útil para mostrar nombre completo
  cargo: { type: String },                         // ⬅️ Lo añadiste en el formulario
  rol: {
    type: String,
    enum: ['superadmin', 'profesor'],
    default: 'profesor'
  },
  permisos: {
    columnasEditable: [String]                     // ⬅️ Se usará si rol === 'profesor'
  }
});

module.exports = mongoose.model('Admin', adminSchema);