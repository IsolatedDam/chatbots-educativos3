// models/Chatbot.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ChatbotSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 120 },
    descripcion: { type: String, default: "", trim: true, maxlength: 500 },
    activo: { type: Boolean, default: true, index: true },
    // opcional: quién lo creó (si quieres guardarlo)
    createdBy: { type: Schema.Types.ObjectId, ref: "Usuario", index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// único por nombre (case-insensitive) — opcional, borra si no lo quieres
ChatbotSchema.index({ nombre: 1 }, { unique: true, collation: { locale: "es", strength: 2 } });
// búsqueda por texto — opcional
ChatbotSchema.index({ nombre: "text", descripcion: "text" });

module.exports = mongoose.models.Chatbot || mongoose.model("Chatbot", ChatbotSchema);