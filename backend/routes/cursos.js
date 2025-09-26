// routes/cursos.js
const express = require("express");
const mongoose = require("mongoose");
const { verificarToken, autorizarRoles } = require("../middlewares/auth");
const Curso = require("../models/Curso");
const Chatbot = require("../models/Chatbot");
const AlumnoChatbot = require("../models/AlumnoChatbot"); // 👈 nuevo

const router = express.Router();

/* helper: popula alumnos con campos básicos */
function populateAlumnos(q) {
  return q.populate("alumnos", "numero_documento rut nombre apellido apellidos");
}

/* helpers: vincular / desvincular alumno <-> chatbot por curso */
async function linkAlumnoChatbot(alumnoId, chatbotId, cursoId) {
  if (!alumnoId || !chatbotId || !cursoId) return;
  await AlumnoChatbot.findOneAndUpdate(
    { alumnoId, chatbotId },
    { $addToSet: { cursoIds: cursoId } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
async function unlinkAlumnoChatbotForCurso(alumnoId, chatbotId, cursoId) {
  if (!alumnoId || !chatbotId || !cursoId) return;
  const doc = await AlumnoChatbot.findOneAndUpdate(
    { alumnoId, chatbotId },
    { $pull: { cursoIds: cursoId } },
    { new: true }
  );
  if (doc && (!doc.cursoIds || doc.cursoIds.length === 0)) {
    await AlumnoChatbot.deleteOne({ _id: doc._id });
  }
}

/* Listar cursos (del profe logueado o por query ?profesor / ?profesorId) */
router.get(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const qProf = req.query.profesor || req.query.profesorId;
      const meRol = String(req.usuario?.rol || "").toLowerCase();

      const filtro = {};
      if (meRol === "profesor") filtro.profesorId = req.usuario.id;
      else if (qProf) filtro.profesorId = qProf;

      const cursos = await Curso.find(filtro).sort({ createdAt: -1 });
      return res.json(Array.isArray(cursos) ? cursos : []);
    } catch (e) {
      console.error("GET /cursos error:", e);
      return res.status(500).json({ msg: "Error al cargar cursos" });
    }
  }
);

/* Obtener 1 curso (opcional populate=1) */
router.get(
  "/:id",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const meRol = String(req.usuario?.rol || "").toLowerCase();

      let q = Curso.findById(id);
      if (String(req.query.populate || "").toLowerCase() === "1") {
        q = populateAlumnos(q);
      }
      const curso = await q.exec();
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });

      if (meRol === "profesor" && String(curso.profesorId) !== String(req.usuario.id)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      return res.json(curso);
    } catch (e) {
      console.error("GET /cursos/:id error:", e);
      return res.status(500).json({ msg: "Error al cargar curso" });
    }
  }
);

/* Crear curso */
router.post(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { nombre, descripcion = "", anio, semestre, jornada, profesorId } = req.body;
      if (!nombre) return res.status(400).json({ msg: "Nombre requerido" });

      let owner = profesorId;
      if (String(req.usuario.rol).toLowerCase() === "profesor" || !owner) {
        owner = req.usuario.id;
      }

      const nuevo = await Curso.create({
        nombre, descripcion, anio, semestre, jornada,
        profesorId: owner, alumnos: [],
      });

      return res.json(nuevo);
    } catch (e) {
      console.error("POST /cursos error:", e);
      return res.status(500).json({ msg: "No se pudo crear el curso" });
    }
  }
);

/* Eliminar curso */
router.delete(
  "/:id",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const curso = await Curso.findById(req.params.id);
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });
      if (String(req.usuario.rol).toLowerCase() === "profesor" &&
          String(curso.profesorId) !== String(req.usuario.id)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      // Si el curso tenía chatbot, desvincular a sus alumnos de ese chatbot para este curso
      if (curso.chatbotId) {
        const alumnos = Array.isArray(curso.alumnos) ? curso.alumnos : [];
        await Promise.all(
          alumnos.map(aid => unlinkAlumnoChatbotForCurso(String(aid), String(curso.chatbotId), String(curso._id)))
        );
      }

      await Curso.deleteOne({ _id: curso._id });
      return res.json({ msg: "Curso eliminado" });
    } catch (e) {
      console.error("DELETE /cursos/:id error:", e);
      return res.status(500).json({ msg: "Error al eliminar curso" });
    }
  }
);

/* Asignar / quitar chatbot (1 por curso) */
router.post(
  "/:id/chatbot",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { chatbotId = null } = req.body || {};

      const curso = await Curso.findById(id);
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });

      // Solo el dueño si es profesor
      if (
        String(req.usuario.rol).toLowerCase() === "profesor" &&
        String(curso.profesorId) !== String(req.usuario.id)
      ) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      // Validar el chatbot si envían un id
      if (chatbotId) {
        if (!mongoose.isValidObjectId(chatbotId)) {
          return res.status(400).json({ msg: "chatbotId inválido" });
        }
        const cb = await Chatbot.findOne({ _id: chatbotId /*, activo: true */ });
        if (!cb) return res.status(404).json({ msg: "Chatbot no existe" });
      }

      const oldId = curso.chatbotId ? String(curso.chatbotId) : null;

      // Actualizar y devolver el curso actualizado (alumnos poblados para mantener la UI)
      const actualizado = await Curso.findByIdAndUpdate(
        id,
        { $set: { chatbotId: chatbotId || null } },
        { new: true }
      )
        .populate("alumnos", "numero_documento rut nombre apellido apellidos")
        .lean();

      const newId = actualizado.chatbotId ? String(actualizado.chatbotId) : null;

      // Vinculaciones
      const alumnosIds = (actualizado.alumnos || []).map(a => String(a._id || a));
      if (newId && newId !== oldId) {
        await Promise.all(alumnosIds.map(aid => linkAlumnoChatbot(aid, newId, String(actualizado._id))));
      }
      if (oldId && oldId !== newId) {
        await Promise.all(alumnosIds.map(aid => unlinkAlumnoChatbotForCurso(aid, oldId, String(actualizado._id))));
      }

      return res.json(actualizado);
    } catch (e) {
      console.error("POST /cursos/:id/chatbot error:", e);
      return res.status(500).json({ msg: "Error asignando chatbot" });
    }
  }
);

/* Agregar alumnos (array de ids) */
router.post(
  "/:id/alumnos",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { alumnoIds = [] } = req.body;
      let curso = await Curso.findById(req.params.id);
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });
      if (String(req.usuario.rol).toLowerCase() === "profesor" &&
          String(curso.profesorId) !== String(req.usuario.id)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      // Detectar cuáles son NUEVOS
      const before = new Set((curso.alumnos || []).map(x => String(x)));
      const incoming = (alumnoIds || []).filter(Boolean).map(String);
      const added = [];
      incoming.forEach(aid => { if (!before.has(aid)) added.push(aid); before.add(aid); });

      curso.alumnos = Array.from(before).map((aid) => new mongoose.Types.ObjectId(aid));
      await curso.save();

      // Vincular con el chatbot actual del curso (si existe) SOLO los nuevos
      if (curso.chatbotId && added.length) {
        await Promise.all(added.map(aid => linkAlumnoChatbot(aid, String(curso.chatbotId), String(curso._id))));
      }

      curso = await populateAlumnos(Curso.findById(curso._id)).exec();
      return res.json(curso);
    } catch (e) {
      console.error("POST /cursos/:id/alumnos error:", e);
      return res.status(500).json({ msg: "Error al inscribir" });
    }
  }
);

/* Quitar alumno */
router.delete(
  "/:id/alumnos/:alumnoId",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { id, alumnoId } = req.params;
      let curso = await Curso.findById(id);
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });
      if (String(req.usuario.rol).toLowerCase() === "profesor" &&
          String(curso.profesorId) !== String(req.usuario.id)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      const wasIn = (curso.alumnos || []).some((x) => String(x) === String(alumnoId));

      curso.alumnos = (curso.alumnos || []).filter((x) => String(x) !== String(alumnoId));
      await curso.save();

      // Desvincular del chatbot de este curso (si tenía) solo para este curso
      if (wasIn && curso.chatbotId) {
        await unlinkAlumnoChatbotForCurso(String(alumnoId), String(curso.chatbotId), String(curso._id));
      }

      curso = await populateAlumnos(Curso.findById(curso._id)).exec();
      return res.json(curso);
    } catch (e) {
      console.error("DELETE /cursos/:id/alumnos/:alumnoId error:", e);
      return res.status(500).json({ msg: "Error al quitar alumno" });
    }
  }
);

module.exports = router;