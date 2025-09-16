// routes/cursos.js
const express = require("express");
const mongoose = require("mongoose");
const { verificarToken, autorizarRoles } = require("../middlewares/auth");
const Curso = require("../models/Curso");
const Chatbot = require("../models/Chatbot");

const router = express.Router();

const JORNADAS = ["Mañana", "Tarde", "Vespertino", "Viernes", "Sábados"];
const isValidId = (id) => mongoose.isValidObjectId(id);

/* ===== Utils de error legibles ===== */
function sendNiceError(res, err, fallbackMsg = "Error") {
  if (err?.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e) => `${e.path}: ${e.message}`);
    return res.status(400).json({ msg: "Validación", details });
  }
  if (err?.name === "CastError") {
    return res.status(400).json({ msg: `Id inválido en ${err.path}` });
  }
  return res.status(500).json({ msg: fallbackMsg });
}

/* ===== Listar cursos (del profe logueado o por query ?profesor / ?profesorId) ===== */
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

/* ===== Crear curso ===== */
router.post(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const {
        nombre,
        descripcion = "",
        anio,
        semestre,
        jornada,
        profesorId,
      } = req.body;

      if (!nombre) return res.status(400).json({ msg: "Nombre requerido" });

      // Si es profesor, fuerza propiedad al dueño de la sesión (ignora profesorId)
      let owner = profesorId;
      const meRol = String(req.usuario.rol).toLowerCase();
      if (meRol === "profesor" || !owner) owner = req.usuario.id;

      // saneo/casteo de campos opcionales
      const payload = {
        nombre: String(nombre).trim(),
        descripcion: String(descripcion || "").trim(),
        profesorId: owner,
        alumnos: [],
      };

      // anio: solo si es 4 dígitos
      if (anio !== undefined && anio !== "") {
        const y = Number(anio);
        if (!Number.isFinite(y) || String(anio).length !== 4) {
          return res.status(400).json({ msg: "Año debe ser 4 dígitos" });
        }
        payload.anio = y;
      }

      // semestre: solo 1 o 2
      if (semestre !== undefined && semestre !== "") {
        const s = Number(semestre);
        if (![1, 2].includes(s)) {
          return res.status(400).json({ msg: "Semestre debe ser 1 o 2" });
        }
        payload.semestre = s;
      }

      // jornada: solo valores válidos
      if (jornada !== undefined && jornada !== "") {
        if (!JORNADAS.includes(jornada)) {
          return res.status(400).json({ msg: "Jornada no válida" });
        }
        payload.jornada = jornada;
      }

      // crea
      const nuevo = await Curso.create(payload);
      return res.status(201).json(nuevo);
    } catch (e) {
      console.error("POST /cursos error:", e);
      return sendNiceError(res, e, "No se pudo crear el curso");
    }
  }
);

/* ===== Eliminar curso ===== */
router.delete(
  "/:id",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidId(id)) return res.status(400).json({ msg: "Id inválido" });

      const curso = await Curso.findById(id);
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });

      const meRol = String(req.usuario.rol).toLowerCase();
      if (meRol === "profesor" && String(curso.profesorId) !== String(req.usuario.id)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      await Curso.deleteOne({ _id: curso._id });
      return res.json({ msg: "Curso eliminado" });
    } catch (e) {
      console.error("DELETE /cursos/:id error:", e);
      return sendNiceError(res, e, "Error al eliminar curso");
    }
  }
);

/* ===== Asignar / quitar chatbot (1 por curso) ===== */
router.post(
  "/:id/chatbot",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidId(id)) return res.status(400).json({ msg: "Id inválido" });

      const { chatbotId = null } = req.body;
      const curso = await Curso.findById(id);
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });

      const meRol = String(req.usuario.rol).toLowerCase();
      if (meRol === "profesor" && String(curso.profesorId) !== String(req.usuario.id)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      if (chatbotId) {
        if (!isValidId(chatbotId)) {
          return res.status(400).json({ msg: "chatbotId inválido" });
        }
        const cb = await Chatbot.findById(chatbotId);
        if (!cb) return res.status(404).json({ msg: "Chatbot no existe" });
        curso.chatbotId = cb._id;
      } else {
        curso.chatbotId = null; // quitar
      }

      await curso.save();
      return res.json(curso);
    } catch (e) {
      console.error("POST /cursos/:id/chatbot error:", e);
      return sendNiceError(res, e, "Error asignando chatbot");
    }
  }
);

/* ===== Agregar alumnos (array de ids) ===== */
router.post(
  "/:id/alumnos",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isValidId(id)) return res.status(400).json({ msg: "Id inválido" });

      const { alumnoIds = [] } = req.body;
      const curso = await Curso.findById(id);
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });

      const meRol = String(req.usuario.rol).toLowerCase();
      if (meRol === "profesor" && String(curso.profesorId) !== String(req.usuario.id)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      const set = new Set((curso.alumnos || []).map(String));
      (alumnoIds || [])
        .filter((x) => isValidId(x))
        .forEach((x) => set.add(String(x)));

      curso.alumnos = Array.from(set).map((x) => new mongoose.Types.ObjectId(x));
      await curso.save();

      return res.json(curso);
    } catch (e) {
      console.error("POST /cursos/:id/alumnos error:", e);
      return sendNiceError(res, e, "Error al inscribir");
    }
  }
);

/* ===== Quitar alumno ===== */
router.delete(
  "/:id/alumnos/:alumnoId",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { id, alumnoId } = req.params;
      if (!isValidId(id) || !isValidId(alumnoId)) {
        return res.status(400).json({ msg: "Id inválido" });
      }

      const curso = await Curso.findById(id);
      if (!curso) return res.status(404).json({ msg: "Curso no encontrado" });

      const meRol = String(req.usuario.rol).toLowerCase();
      if (meRol === "profesor" && String(curso.profesorId) !== String(req.usuario.id)) {
        return res.status(403).json({ msg: "No autorizado" });
      }

      curso.alumnos = (curso.alumnos || []).filter((x) => String(x) !== String(alumnoId));
      await curso.save();

      return res.json(curso);
    } catch (e) {
      console.error("DELETE /cursos/:id/alumnos/:alumnoId error:", e);
      return sendNiceError(res, e, "Error al quitar alumno");
    }
  }
);

module.exports = router;