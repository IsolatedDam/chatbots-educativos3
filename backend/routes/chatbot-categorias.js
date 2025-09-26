// routes/chatbot-categorias.js
const express = require("express");
const { verificarToken, autorizarRoles } = require("../middlewares/auth");
const ChatbotCategoria = require("../models/ChatbotCategoria");
const Chatbot = require("../models/Chatbot");

const router = express.Router();

/**
 * POST /api/chatbot-categorias
 * Crea (o asegura) una categoría vacía. Idempotente (upsert).
 * body: { nombre }
 */
router.post(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { nombre } = req.body || {};
      const nom = (nombre || "").trim();

      if (!nom) return res.status(400).json({ msg: "El nombre es obligatorio" });
      if (nom.length > 120) {
        return res.status(400).json({ msg: "El nombre es demasiado largo (máx. 120)" });
      }

      const doc = await ChatbotCategoria.findOneAndUpdate(
        { nombre: nom },
        { $setOnInsert: { nombre: nom, createdBy: req.usuario?.id || req.usuario?._id } },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
          collation: { locale: "es", strength: 2 },
        }
      ).lean();

      return res.status(201).json(doc);
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(409).json({ msg: "Ya existe una categoría con ese nombre" });
      }
      console.error("POST /api/chatbot-categorias error:", e);
      return res.status(500).json({ msg: "No se pudo crear la categoría" });
    }
  }
);

/**
 * DELETE /api/chatbot-categorias/:nombre
 * Elimina una categoría SOLO si está vacía (sin chatbots).
 */
router.delete(
  "/:nombre",
  verificarToken,
  autorizarRoles("admin", "superadmin"), // o incluye "profesor" si quieres permitirle borrar
  async (req, res) => {
    try {
      const nombre = String(req.params.nombre || "").trim();
      if (!nombre) return res.status(400).json({ msg: "Nombre inválido" });

      // ¿Tiene bots?
      const count = await Chatbot.countDocuments({ categoria: nombre });
      if (count > 0) {
        return res.status(409).json({ msg: "No puedes eliminar una categoría que tiene chatbots" });
      }

      const del = await ChatbotCategoria.deleteOne({ nombre });
      if (!del?.deletedCount) {
        return res.status(404).json({ msg: "Categoría no encontrada" });
      }
      return res.json({ msg: "Categoría eliminada" });
    } catch (e) {
      console.error("DELETE /api/chatbot-categorias/:nombre error:", e);
      return res.status(500).json({ msg: "No se pudo eliminar la categoría" });
    }
  }
);

module.exports = router;