const mongoose = require('mongoose');

const alumnoSchema = new mongoose.Schema({
  rut: { type: String, required: true, unique: true },
  correo: { type: String, required: true, unique: true },
  contrasena: { type: String, required: true },
  tipo_documento: { type: String, required: true },
  numero_documento: { type: String, required: true },
  nombre: String,
  apellido: String,
  semestre: String,
  jornada: String,
  habilitado: { type: Boolean, default: true },
  termino_cuenta: Date,
  chatbot: [String],
  aviso_suspension: { type: Boolean, default: false },
  rehabilitar_acceso: { type: Boolean, default: false },
  conteo_ingresos: { type: Number, default: 0 },
  color_riesgo: { type: String, default: 'verde' },
  rol: { type: String, default: 'alumno' }
});

module.exports = mongoose.model('Alumno', alumnoSchema);