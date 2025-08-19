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

    // RUT opcional (sparse para no chocar cuando no exista)
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

    // Roles soportados
    rol: {
      type: String,
      enum: ['superadmin', 'admin', 'profesor'],
      required: true,
    },

    // Permisos granulares
    permisos: { type: [String], default: [] },

    /* ===== Campos de documento/teléfono ===== */
    tipo_documento: {
      type: String,
      trim: true,
      set: v => (v ? String(v).toUpperCase() : v), // normaliza a MAYÚSCULAS
    },
    numero_documento: { type: String, trim: true },
    telefono: {
      type: String,
      trim: true,
      match: [TELEFONO_REGEX, 'Teléfono no válido'],
    },

    // Fecha explícita y año derivado (para filtros)
    fechaCreacion: { type: Date, required: true, default: Date.now },
    anio:          { type: Number, min: 2000, max: 9999, index: true },

    habilitado: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* Índice único compuesto del documento (si ambos existen) */
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

/* Normaliza doc y RUT en create/save */
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

/* Deriva 'anio' desde 'fechaCreacion' y rellena fecha si falta (create) */
AdminSchema.pre('validate', function (next) {
  if (!this.fechaCreacion) {
    this.fechaCreacion = new Date(); // fallback
  }
  const y = this.fechaCreacion instanceof Date && !isNaN(this.fechaCreacion)
    ? this.fechaCreacion.getUTCFullYear()
    : new Date().getUTCFullYear();
  this.anio = y;
  next();
});

/* Normalización y derivación también en UPDATEs */
AdminSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const $set = update.$set || update;

  // Normaliza correo
  if ($set.correo) $set.correo = normalizarCorreo($set.correo);

  // Normaliza documento y rut
  if ($set.tipo_documento || $set.numero_documento) {
    const t = ($set.tipo_documento ? String($set.tipo_documento) : '').toUpperCase();
    if ($set.tipo_documento) $set.tipo_documento = t;

    if ($set.numero_documento) {
      $set.numero_documento = normalizarNumeroDoc(t, $set.numero_documento);
      if (t === 'RUT') $set.rut = $set.numero_documento;
    }
  }

  // Deriva 'anio' si cambian fechaCreacion
  if ($set.fechaCreacion) {
    const f = new Date($set.fechaCreacion);
    if (!isNaN(f.getTime())) {
      $set.anio = f.getUTCFullYear();
    } else {
      // fecha inválida -> limpiamos para no romper validación
      delete $set.fechaCreacion;
    }
  }

  // Reinyectamos $set si era anidado
  if (update.$set) this.setUpdate({ ...update, $set });
  else this.setUpdate($set);

  next();
});

/* Oculta contraseña al serializar */
AdminSchema.set('toJSON', {
  transform: (_doc, ret) => { delete ret.contrasena; return ret; }
});

module.exports = mongoose.model('Admin', AdminSchema);