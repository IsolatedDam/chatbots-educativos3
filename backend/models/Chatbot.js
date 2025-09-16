// models/Chatbot.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ChatbotSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chatbot", ChatbotSchema);