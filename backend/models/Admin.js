const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    nombre:   { type: String, required: true, trim: true },
    apellido: { type: String, default: '', trim: true },

    // RUT opcional (hay profesores o admins sin RUT); guardado en MAYÚSCULAS
    rut: {
      type: String,
      trim: true,
      uppercase: true,
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

    cargo: { type: String, default: '', trim: true },

    contrasena: { type: String, required: true },

    // Roles soportados
    rol: {
      type: String,
      enum: ['superadmin', 'admin', 'profesor'],
      required: true,
    },

    // Permisos granulares (solo aplica a rol "profesor" o "admin" si quieres granular)
    permisos: { type: [String], default: [] },

    habilitado: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Al serializar, ocultar contraseña
AdminSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.contrasena;
    return ret;
  }
});

module.exports = mongoose.model('Admin', AdminSchema);