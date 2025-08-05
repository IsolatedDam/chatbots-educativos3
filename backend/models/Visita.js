const mongoose = require('mongoose');

const visitaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  correo: { type: String, required: true },
  whatsapp: { type: String, required: true },
  fechaHora: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Visita', visitaSchema);
