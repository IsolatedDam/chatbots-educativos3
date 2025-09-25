// models/Alumno.js
const mongoose = require('mongoose');

function normalizarRut(v = '') {
  return String(v).replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
}

const TELEFONO_REGEX = /^\+?\d{8,12}$/;

const AlumnoSchema = new mongoose.Schema(
  {
    rut: {
      type: String,
      trim: true,
      uppercase: true,
      set: (v) => (v ? normalizarRut(v) : v),
      index: true,
      unique: true,
      sparse: true,
    },

    correo: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    contrasena: { type: String },

    tipo_documento: { type: String, required: true, trim: true },
    numero_documento: { type: String, required: true, trim: true },

    nombre:   { type: String, trim: true },
    apellido: { type: String, trim: true },

    fechaIngreso: { type: Date, required: true, default: Date.now },
    anio: { type: Number, required: true, min: 2000, max: 9999, index: true },

    telefono: {
      type: String,
      required: true,
      trim: true,
      match: [TELEFONO_REGEX, 'Teléfono no válido'],
    },

    semestre: { type: Number, enum: [1, 2], required: true },

    jornada: {
      type: String,
      enum: ['Mañana', 'Tarde', 'Vespertino', 'Viernes', 'Sábados'],
      required: true,
    },

    habilitado: { type: Boolean, default: true },
    termino_cuenta: { type: Date },

    chatbot: { type: [String], default: [] },

    aviso_suspension:   { type: Boolean, default: false },
    rehabilitar_acceso: { type: Boolean, default: false },
    conteo_ingresos:    { type: Number,  default: 0 },

    color_riesgo: { type: String, default: 'verde' },
    rol: { type: String, default: 'alumno' },

    // 🔹 DUEÑO del registro (profesor que lo creó)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      index: true,
      default: null,
    },
  },
  { timestamps: true }
);

AlumnoSchema.index(
  { tipo_documento: 1, numero_documento: 1 },
  { unique: true, name: 'unique_doc' }
);

AlumnoSchema.index({ createdBy: 1, createdAt: -1 });

AlumnoSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.contrasena;
    return ret;
  },
});

AlumnoSchema.pre('save', function (next) {
  if (this.isModified('tipo_documento') || this.isModified('numero_documento')) {
    if ((this.tipo_documento || '').toUpperCase() === 'RUT' && this.numero_documento) {
      this.numero_documento = normalizarRut(this.numero_documento);
      if (!this.rut) this.rut = this.numero_documento;
    }
  }
  next();
});

AlumnoSchema.pre('validate', function (next) {
  if (!this.fechaIngreso) {
    if (Number.isInteger(this.anio)) {
      this.fechaIngreso = new Date(Date.UTC(this.anio, 0, 1));
    } else {
      this.fechaIngreso = new Date();
    }
  }
  const y = this.fechaIngreso instanceof Date && !isNaN(this.fechaIngreso)
    ? this.fechaIngreso.getUTCFullYear()
    : new Date().getUTCFullYear();
  this.anio = y;
  next();
});

AlumnoSchema.pre('findOneAndUpdate', function(next) {
  const upd = this.getUpdate() || {};
  const set = upd.$set || {};

  const nuevaFecha = set.fechaIngreso ?? upd.fechaIngreso;
  if (nuevaFecha) {
    const f = new Date(nuevaFecha);
    if (!Number.isNaN(f.getTime())) {
      const y = f.getUTCFullYear();
      if (upd.$set) {
        upd.$set.anio = y;
        upd.$set.fechaIngreso = f;
      } else {
        upd.anio = y;
        upd.fechaIngreso = f;
      }
    }
  }

  const tipoNuevo = (set.tipo_documento ?? upd.tipo_documento);
  const numNuevo  = (set.numero_documento ?? upd.numero_documento);
  if (tipoNuevo && String(tipoNuevo).toUpperCase() === 'RUT' && numNuevo) {
    const nrm = normalizarRut(String(numNuevo));
    if (upd.$set) {
      upd.$set.numero_documento = nrm;
      if (!set.rut && !upd.rut) upd.$set.rut = nrm;
    } else {
      upd.numero_documento = nrm;
      if (!upd.rut) upd.rut = nrm;
    }
  }

  this.setUpdate(upd);
  next();
});

module.exports = mongoose.model('Alumno', AlumnoSchema);