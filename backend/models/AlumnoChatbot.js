// models/AlumnoChatbot.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const AlumnoChatbotSchema = new Schema(
  {
    alumnoId:  { type: Schema.Types.ObjectId, ref: "Alumno", required: true, index: true },
    chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", required: true, index: true },
    // Para saber desde qué cursos quedó habilitado este alumno a este chatbot
    cursoIds:  [{ type: Schema.Types.ObjectId, ref: "Curso" }],
  },
  { timestamps: true, versionKey: false }
);

// Unicidad: un alumno no debe tener duplicado el mismo chatbot
AlumnoChatbotSchema.index({ alumnoId: 1, chatbotId: 1 }, { unique: true });

module.exports =
  mongoose.models.AlumnoChatbot ||
  mongoose.model("AlumnoChatbot", AlumnoChatbotSchema);