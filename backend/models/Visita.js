const mongoose = require('mongoose');

function normalizarCorreo(v = '') {
  return String(v).trim().toLowerCase();
}

// Intento conservador de normalizar a E.164 con +56 si parece número chileno.
// No es infalible, pero evita guardar formatos raros.
function normalizarWhatsApp(v = '') {
  let digits = String(v).replace(/\D/g, ''); // solo números

  // quita 56 inicial si viene con el país repetido
  if (digits.startsWith('56')) digits = digits.slice(2);
  // quita ceros iniciales
  digits = digits.replace(/^0+/, '');

  // si tiene pinta de número chileno (>=8 y <=9 dígitos), anteponemos +56
  if (digits.length >= 8 && digits.length <= 9) {
    return `+56${digits}`;
  }

  // fallback: si ya venía con país distinto o muy largo, guarda con +
  return digits ? `+${digits}` : '';
}

const visitaSchema = new mongoose.Schema(
  {
    nombre:   { type: String, required: true, trim: true },
    correo:   { type: String, required: true, trim: true, lowercase: true, set: normalizarCorreo },
    whatsapp: { type: String, required: true, trim: true, set: normalizarWhatsApp },

    // Mantengo tu campo para compatibilidad con el front actual
    fechaHora: { type: Date, default: Date.now },

    // Campos opcionales útiles (si luego quieres guardar contexto):
    origen:     { type: String, trim: true, default: '' },  // ej: "landing", "evento", etc.
    userAgent:  { type: String, trim: true, default: '' },
    ip:         { type: String, trim: true, default: '' },
  },
  { timestamps: true } // createdAt / updatedAt
);

// Índices útiles para filtros y exportaciones
visitaSchema.index({ fechaHora: -1 });
visitaSchema.index({ createdAt: -1 });
visitaSchema.index({ correo: 1 });
visitaSchema.index({ whatsapp: 1 });

// Validación simple de email (opcional; relájala si te molesta)
visitaSchema.path('correo').validate(function (v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}, 'Correo inválido');

// Validación mínima de whatsapp (al menos 8 dígitos después de normalizar)
visitaSchema.path('whatsapp').validate(function (v) {
  return /\+\d{8,}/.test(v || '');
}, 'WhatsApp inválido');

module.exports = mongoose.model('Visita', visitaSchema);