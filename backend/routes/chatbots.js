// routes/chatbots.js
const express = require("express");
const { verificarToken, autorizarRoles } = require("../middlewares/auth");
const Chatbot = require("../models/Chatbot");

const router = express.Router();

/* Listar chatbots (puedes filtrar solo activos si quieres) */
router.get(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (_req, res) => {
    try {
      const list = await Chatbot.find({ /* activo: true */ }).sort({ createdAt: -1 });
      return res.json(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("GET /chatbots error:", e);
      return res.status(500).json({ msg: "Error al cargar chatbots" });
    }
  }
);

/* Crear chatbot */
router.post(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { nombre, descripcion } = req.body || {};
      const nom = (nombre || "").trim();
      const desc = (descripcion || "").trim();
      if (!nom) return res.status(400).json({ msg: "El nombre es obligatorio" });
      if (nom.length > 120) return res.status(400).json({ msg: "El nombre es demasiado largo (máx. 120)" });

      const nuevo = await Chatbot.create({
        nombre: nom,
        descripcion: desc,
        activo: true,
        createdBy: req.usuario?._id,
      });

      return res.status(201).json(nuevo);
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(409).json({ msg: "Ya existe un chatbot con ese nombre" });
      }
      console.error("POST /chatbots error:", e);
      return res.status(500).json({ msg: "No se pudo crear el chatbot" });
    }
  }
);

module.exports = router;