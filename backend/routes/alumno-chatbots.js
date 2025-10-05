// routes/alumno-chatbots.js
const express = require("express");
const mongoose = require("mongoose");
const { verificarToken, autorizarRoles } = require("../middlewares/auth");
const AlumnoChatbot = require("../models/AlumnoChatbot");
const Curso = require("../models/Curso");
const Chatbot = require("../models/Chatbot");

const router = express.Router();

/**
 * GET /api/alumnos/:alumnoId/chatbots-permitidos
 * Devuelve los chatbots a los que el alumno tiene acceso + cursos que lo habilitan.
 */
router.get(
  "/alumnos/:alumnoId/chatbots-permitidos",
  verificarToken,
  autorizarRoles("alumno", "profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const alumnoId = String(req.params.alumnoId);
      const rol = String(req.usuario?.rol || "").toLowerCase();

      if (rol === "alumno" && String(req.usuario?.id) !== alumnoId) {
        return res.status(403).json({ msg: "No autorizado" });
      }
      if (!mongoose.isValidObjectId(alumnoId)) {
        return res.status(400).json({ msg: "alumnoId inválido" });
      }

      const links = await AlumnoChatbot.find({ alumnoId })
        .populate("chatbotId", "nombre categoria activo")
        .lean();

      if (!links.length) return res.json([]);

      const allCursoIds = Array.from(new Set(links.flatMap(l => (l.cursoIds || []).map(String))));
      const cursos = await Curso.find({ _id: { $in: allCursoIds } })
        .select("nombre anio semestre jornada")
        .lean();
      const cursoMap = new Map(cursos.map(c => [String(c._id), c]));

      const out = links
        .filter(l => l.chatbotId && (l.cursoIds?.length))
        .map(l => ({
          chatbotId: String(l.chatbotId._id),
          nombre: l.chatbotId.nombre,
          categoria: l.chatbotId.categoria,
          activo: !!l.chatbotId.activo,
          cursos: (l.cursoIds || [])
            .map(id => cursoMap.get(String(id)))
            .filter(Boolean)
            .map(c => ({
              _id: String(c._id),
              nombre: c.nombre,
              anio: c.anio,
              semestre: c.semestre,
              jornada: c.jornada,
            })),
          cursosCount: (l.cursoIds || []).length,
        }))
        .sort((a,b)=> (a.categoria||"").localeCompare(b.categoria||"", "es")
                    || (a.nombre||"").localeCompare(b.nombre||"", "es"));

      res.json(out);
    } catch (e) {
      console.error("GET /alumnos/:alumnoId/chatbots-permitidos error:", e);
      res.status(500).json({ msg: "Error al consultar permisos" });
    }
  }
);

/**
 * GET /api/alumnos/:alumnoId/puede-ver/:chatbotId
 * Responde { allowed, viaCursos:[...] }
 */
router.get(
  "/alumnos/:alumnoId/puede-ver/:chatbotId",
  verificarToken,
  autorizarRoles("alumno", "profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const alumnoId = String(req.params.alumnoId);
      const chatbotId = String(req.params.chatbotId);
      const rol = String(req.usuario?.rol || "").toLowerCase();

      if (rol === "alumno" && String(req.usuario?.id) !== alumnoId) {
        return res.status(403).json({ msg: "No autorizado" });
      }
      if (!mongoose.isValidObjectId(alumnoId) || !mongoose.isValidObjectId(chatbotId)) {
        return res.status(400).json({ msg: "Parámetros inválidos" });
      }

      const link = await AlumnoChatbot.findOne({ alumnoId, chatbotId }).lean();
      if (!link || !(link.cursoIds?.length)) {
        return res.json({ allowed: false, viaCursos: [] });
      }

      const cursos = await Curso.find({ _id: { $in: link.cursoIds } })
        .select("nombre anio semestre jornada")
        .lean();

      res.json({
        allowed: true,
        viaCursos: cursos.map(c => ({
          _id: String(c._id),
          nombre: c.nombre,
          anio: c.anio,
          semestre: c.semestre,
          jornada: c.jornada,
        })),
      });
    } catch (e) {
      console.error("GET /alumnos/:alumnoId/puede-ver/:chatbotId error:", e);
      res.status(500).json({ msg: "Error al consultar permiso" });
    }
  }
);

// === NUEVO === mis chatbots permitidos (solo alumno con su token)
router.get(
  "/mis-chatbots-permitidos",
  verificarToken,
  autorizarRoles("alumno"),
  async (req, res) => {
    try {
      const alumnoId = String(req.usuario?.id || "");
      if (!mongoose.isValidObjectId(alumnoId)) {
        return res.status(400).json({ msg: "Token inválido" });
      }

      const links = await AlumnoChatbot.find({ alumnoId })
        .populate("chatbotId", "nombre categoria activo iframeUrl youtubeUrl")
        .lean();

      if (!links.length) return res.json([]);

      const allCursoIds = Array.from(
        new Set(links.flatMap(l => (l.cursoIds || []).map(String)))
      );
      const cursos = await Curso.find({ _id: { $in: allCursoIds } })
        .select("nombre anio semestre jornada")
        .lean();
      const cursoMap = new Map(cursos.map(c => [String(c._id), c]));

      const out = links
        .filter(l => l.chatbotId && (l.cursoIds?.length))
        .map(l => ({
          chatbotId: String(l.chatbotId._id),
          nombre: l.chatbotId.nombre,
          categoria: l.chatbotId.categoria,
          activo: !!l.chatbotId.activo,
          iframeUrl: l.chatbotId.iframeUrl,
          youtubeUrl: l.chatbotId.youtubeUrl,
          cursos: (l.cursoIds || [])
            .map(id => cursoMap.get(String(id)))
            .filter(Boolean)
            .map(c => ({
              _id: String(c._id),
              nombre: c.nombre,
              anio: c.anio,
              semestre: c.semestre,
              jornada: c.jornada,
            })),
          cursosCount: (l.cursoIds || []).length,
        }))
        .sort((a,b)=> (a.categoria||"").localeCompare(b.categoria||"", "es")
                    || (a.nombre||"").localeCompare(b.nombre||"", "es"));

      res.json(out);
    } catch (e) {
      console.error("GET /mis-chatbots-permitidos error:", e);
      res.status(500).json({ msg: "Error al consultar permisos" });
    }
  }
);

module.exports = router;