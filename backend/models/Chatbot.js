// models/Chatbot.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ChatbotSchema = new Schema(
  {
    // categoría simple por string
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

    // Referencia a admin
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", index: true }, // opcional
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
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

// Búsqueda por texto
ChatbotSchema.index({ nombre: "text", descripcion: "text", categoria: "text" });

module.exports =
  mongoose.models.Chatbot || mongoose.model("Chatbot", ChatbotSchema);