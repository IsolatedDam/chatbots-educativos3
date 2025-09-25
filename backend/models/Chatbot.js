// models/Chatbot.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ChatbotSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    descripcion: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    activo: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Opcional: quién lo creó (si tienes usuarios autenticados)
    createdBy: { type: Schema.Types.ObjectId, ref: "Usuario", index: true },
  },
  {
    timestamps: true,     // createdAt / updatedAt
    versionKey: false,    // oculta __v
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

/* Índices útiles */
// Único por nombre (case-insensitive). Requiere MongoDB con soporte de collation.
ChatbotSchema.index({ nombre: 1 }, { unique: true, collation: { locale: "es", strength: 2 } });
// Búsqueda de texto (opcional)
ChatbotSchema.index({ nombre: "text", descripcion: "text" });

module.exports =
  mongoose.models.Chatbot || mongoose.model("Chatbot", ChatbotSchema);