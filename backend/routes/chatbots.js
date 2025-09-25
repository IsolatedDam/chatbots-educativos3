// routes/chatbots.js
const express = require("express");
const { verificarToken, autorizarRoles } = require("../middlewares/auth");
const Chatbot = require("../models/Chatbot");

const router = express.Router();

/* Listar chatbots (activos) */
router.get(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (_req, res) => {
    try {
      const list = await Chatbot.find({}).sort({ createdAt: -1 });
      return res.json(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("GET /chatbots error:", e);
      return res.status(500).json({ msg: "Error al cargar chatbots" });
    }
  }
);

module.exports = router;
