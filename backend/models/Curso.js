// models/Curso.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const CursoSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "" },
    anio: { type: Number },
    semestre: { type: Number },
    jornada: { type: String }, // "Mañana", "Tarde", etc.
    profesorId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    chatbotId: { type: Schema.Types.ObjectId, ref: "Chatbot", default: null },
    alumnos: [{ type: Schema.Types.ObjectId, ref: "Alumno" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Curso", CursoSchema);