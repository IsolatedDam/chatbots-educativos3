// models/ChatbotCategoria.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const ChatbotCategoriaSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "Usuario", index: true },
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

// Unicidad case-insensitive por nombre
ChatbotCategoriaSchema.index(
  { nombre: 1 },
  { unique: true, collation: { locale: "es", strength: 2 } }
);

module.exports =
  mongoose.models.ChatbotCategoria ||
  mongoose.model("ChatbotCategoria", ChatbotCategoriaSchema);