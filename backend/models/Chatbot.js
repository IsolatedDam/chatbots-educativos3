// models/Chatbot.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ChatbotSchema = new Schema(
  {
    // 👉 categoría simple por string (sin colección aparte)
    categoria: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
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

    // 👇 IMPORTANTE: ahora referencia a Admin (NO "Usuario")
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", index: true }, // opcional
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        // dejamos _id y además exponemos id para conveniencia
        ret.id = ret._id;
        return ret;
      },
    },
  }
);

// Unicidad por categoría + nombre (case-insensitive)
ChatbotSchema.index(
  { categoria: 1, nombre: 1 },
  { unique: true, collation: { locale: "es", strength: 2 } }
);

// Búsqueda por texto (opcional)
ChatbotSchema.index({ nombre: "text", descripcion: "text", categoria: "text" });

module.exports =
  mongoose.models.Chatbot || mongoose.model("Chatbot", ChatbotSchema);