const mongoose = require('mongoose');

function normalizarRut(v = '') {
  return String(v).replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
}

const AlumnoSchema = new mongoose.Schema(
  {
    // Puede venir vacío si el documento NO es RUT
    rut: {
      type: String,
      trim: true,
      uppercase: true,
      set: (v) => (v ? normalizarRut(v) : v),
      index: true,
      unique: true,
      sparse: true, // permite múltiples docs sin rut
    },

    correo: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Ahora opcional: permites login solo por RUT
    contrasena: { type: String },

    tipo_documento: { type: String, required: true, trim: true },
    numero_documento: { type: String, required: true, trim: true },

    nombre:   { type: String, trim: true },
    apellido: { type: String, trim: true },

    semestre: { type: String, trim: true },
    jornada:  { type: String, trim: true }, // 'Diurno' | 'Vespertino' si quieres, pero lo dejo abierto

    habilitado: { type: Boolean, default: true },
    termino_cuenta: { type: Date },

    chatbot: { type: [String], default: [] },

    aviso_suspension:   { type: Boolean, default: false },
    rehabilitar_acceso: { type: Boolean, default: false },
    conteo_ingresos:    { type: Number,  default: 0 },

    color_riesgo: {
      type: String,
      default: 'verde', // 'verde' | 'amarillo' | 'rojo' si quieres enum
    },

    rol: { type: String, default: 'alumno' },
  },
  { timestamps: true }
);

// Índice único compuesto para documento (evita duplicados del mismo doc)
AlumnoSchema.index(
  { tipo_documento: 1, numero_documento: 1 },
  { unique: true, name: 'unique_doc' }
);

// Quitar la contraseña en la salida JSON
AlumnoSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.contrasena;
    return ret;
  }
});

// (Opcional) normaliza numero_documento si el tipo es RUT
AlumnoSchema.pre('save', function(next) {
  if (this.isModified('tipo_documento') || this.isModified('numero_documento')) {
    if ((this.tipo_documento || '').toUpperCase() === 'RUT' && this.numero_documento) {
      this.numero_documento = normalizarRut(this.numero_documento);
      // y si falta rut, lo rellenamos desde numero_documento
      if (!this.rut) this.rut = this.numero_documento;
    }
  }
  next();
});

module.exports = mongoose.model('Alumno', AlumnoSchema);