// models/Admin.js
const mongoose = require('mongoose');

/* Helpers */
function normalizarRut(v = '') {
  return String(v).replace(/\./g, '').replace(/\s+/g, '').toUpperCase();
}
function normalizarCorreo(v = '') {
  return String(v).trim().toLowerCase();
}
function normalizarNumeroDoc(tipo = '', numero = '') {
  if (String(tipo).toUpperCase() === 'RUT') return normalizarRut(numero);
  return String(numero).trim();
}

/* Teléfono: permite opcional '+' y 8–12 dígitos */
const TELEFONO_REGEX = /^\+?\d{8,12}$/;

const AdminSchema = new mongoose.Schema(
  {
    nombre:   { type: String, required: true, trim: true },
    apellido: { type: String, default: '', trim: true },

    rut: {
      type: String,
      trim: true,
      uppercase: true,
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
      set: normalizarCorreo,
    },

    cargo: { type: String, default: '', trim: true },

    contrasena: { type: String, required: true },

    rol: {
      type: String,
      enum: ['superadmin', 'admin', 'profesor'],
      required: true,
    },

    permisos: { type: [String], default: [] },

    tipo_documento: {
      type: String,
      trim: true,
      set: v => (v ? String(v).toUpperCase() : v),
    },
    numero_documento: { type: String, trim: true },
    telefono: {
      type: String,
      trim: true,
      match: [TELEFONO_REGEX, 'Teléfono no válido'],
    },

    fechaCreacion: { type: Date, required: true, default: Date.now },
    anio:          { type: Number, min: 2000, max: 9999, index: true },

    habilitado: { type: Boolean, default: true },

    /* ===== Recuperación de contraseña ===== */
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires:   { type: Date,   select: false },
  },
  { timestamps: true }
);

AdminSchema.index(
  { tipo_documento: 1, numero_documento: 1 },
  {
    unique: true,
    name: 'unique_doc_admin',
    partialFilterExpression: {
      tipo_documento: { $exists: true, $ne: null },
      numero_documento: { $exists: true, $ne: null },
    },
  }
);

AdminSchema.pre('save', function (next) {
  if (this.isModified('tipo_documento') || this.isModified('numero_documento')) {
    const t = String(this.tipo_documento || '').toUpperCase();
    if (t === 'RUT' && this.numero_documento) {
      this.numero_documento = normalizarRut(this.numero_documento);
      if (!this.rut) this.rut = this.numero_documento;
    } else if (this.numero_documento) {
      this.numero_documento = normalizarNumeroDoc(t, this.numero_documento);
    }
  }
  next();
});

AdminSchema.pre('validate', function (next) {
  if (!this.fechaCreacion) this.fechaCreacion = new Date();
  const y = this.fechaCreacion instanceof Date && !isNaN(this.fechaCreacion)
    ? this.fechaCreacion.getUTCFullYear()
    : new Date().getUTCFullYear();
  this.anio = y;
  next();
});

AdminSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  if ($set.correo) $set.correo = normalizarCorreo($set.correo);

  if ($set.tipo_documento || $set.numero_documento) {
    const t = ($set.tipo_documento ? String($set.tipo_documento) : '').toUpperCase();
    if ($set.tipo_documento) $set.tipo_documento = t;

    if ($set.numero_documento) {
      $set.numero_documento = normalizarNumeroDoc(t, $set.numero_documento);
      if (t === 'RUT') $set.rut = $set.numero_documento;
    }
  }

  if ($set.fechaCreacion) {
    const f = new Date($set.fechaCreacion);
    if (!isNaN(f.getTime())) $set.anio = f.getUTCFullYear();
    else delete $set.fechaCreacion;
  }

  if (update.$set) this.setUpdate({ ...update, $set });
  else this.setUpdate($set);

  next();
});

AdminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.contrasena;
    delete ret.resetPasswordTokenHash;
    delete ret.resetPasswordExpires;
    return ret;
  }
});

module.exports = mongoose.model('Admin', AdminSchema);