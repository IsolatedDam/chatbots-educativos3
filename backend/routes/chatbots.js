// routes/chatbots.js
const express = require("express");
const { verificarToken, autorizarRoles } = require("../middlewares/auth");
const Chatbot = require("../models/Chatbot");
const ChatbotCategoria = require("../models/ChatbotCategoria");

// Asegura que el modelo Admin esté registrado para populate
require("../models/Admin");

const router = express.Router();

/**
 * GET /api/chatbots
 * Lista chatbots con filtros opcionales:
 *  - ?categoria=Matemáticas
 *  - ?q=texto          (busca por nombre/descripcion/categoria)
 *  - ?activos=1        (solo activos)
 * Devuelve createdBy poblado (Admin) para "Creado por".
 */
router.get(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { categoria, q, activos } = req.query || {};
      const filtro = {};
      if (categoria) filtro.categoria = categoria;
      if (activos === "1") filtro.activo = true;

      if (q) {
        const rx = new RegExp(String(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filtro.$or = [{ nombre: rx }, { descripcion: rx }, { categoria: rx }];
      }

      const list = await Chatbot.find(filtro)
        .sort({ createdAt: -1 })
        // 👇 Campos reales que existen en Admin: usa 'correo' (no 'email')
        .populate("createdBy", "nombre apellido apellidos correo")
        .lean();

      res.json(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("GET /chatbots error:", e);
      res.status(500).json({ msg: "Error al cargar chatbots" });
    }
  }
);

/**
 * GET /api/chatbots/categories
 * Devuelve categorías con conteo, incluyendo las "vacías".
 * [{ categoria: "Matemáticas", count: 3 }, ...]
 */
router.get(
  "/categories",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (_req, res) => {
    try {
      // 1) Conteo real desde colección Chatbot
      const agg = await Chatbot.aggregate([
        { $group: { _id: "$categoria", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);

      const countMap = new Map(agg.map((x) => [String(x._id), x.count]));

      // 2) Catálogo guardado de categorías (incluye vacías)
      const cats = await ChatbotCategoria.find({})
        .collation({ locale: "es", strength: 2 })
        .lean();

      // 3) Fusionar nombres desde ambas fuentes
      const nombreSet = new Set([
        ...cats.map((c) => c.nombre),
        ...agg.map((x) => String(x._id)),
      ]);

      const out = Array.from(nombreSet).map((nombre) => ({
        categoria: nombre,
        count: countMap.get(nombre) || 0,
      }));

      // Orden alfabético (opcional)
      out.sort((a, b) => a.categoria.localeCompare(b.categoria, "es"));

      res.json(out);
    } catch (e) {
      console.error("GET /chatbots/categories error:", e);
      res.status(500).json({ msg: "Error al cargar categorías" });
    }
  }
);

/**
 * GET /api/chatbots/grouped
 * Devuelve [{ categoria, chatbots: [...] }]
 */
router.get(
  "/grouped",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (_req, res) => {
    try {
      const bots = await Chatbot.find({})
        .sort({ categoria: 1, nombre: 1 })
        .populate("createdBy", "nombre apellido apellidos correo")
        .lean();

      const grouped = [];
      let curCat = null;

      for (const b of bots) {
        if (!curCat || curCat.categoria !== b.categoria) {
          curCat = { categoria: b.categoria, chatbots: [] };
          grouped.push(curCat);
        }
        curCat.chatbots.push(b);
      }

      res.json(grouped);
    } catch (e) {
      console.error("GET /chatbots/grouped error:", e);
      res.status(500).json({ msg: "Error al cargar chatbots agrupados" });
    }
  }
);

/**
 * POST /api/chatbots
 * Crea un chatbot dentro de una categoría.
 * body: { nombre, categoria, descripcion? }
 * Guarda createdBy con el Admin autenticado y devuelve el documento poblado.
 */
router.post(
  "/",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { nombre, categoria, descripcion = "" } = req.body || {};
      const nom = (nombre || "").trim();
      const cat = (categoria || "").trim();
      const desc = (descripcion || "").trim();

      if (!nom) return res.status(400).json({ msg: "El nombre es obligatorio" });
      if (!cat) return res.status(400).json({ msg: "La categoría es obligatoria" });
      if (nom.length > 120) return res.status(400).json({ msg: "El nombre es demasiado largo (máx. 120)" });
      if (cat.length > 120) return res.status(400).json({ msg: "La categoría es demasiado larga (máx. 120)" });

      const nuevo = await Chatbot.create({
        nombre: nom,
        categoria: cat,
        descripcion: desc,
        activo: true,
        // 👇 viene del middleware verificarToken
        createdBy: req.usuario?.id || req.usuario?._id,
      });

      // devolver ya poblado para UX más fluida
      const withUser = await Chatbot.findById(nuevo._id)
        .populate("createdBy", "nombre apellido apellidos correo")
        .lean();

      return res.status(201).json(withUser);
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(409).json({ msg: "Ya existe un chatbot con ese nombre en esa categoría" });
      }
      console.error("POST /chatbots error:", e);
      return res.status(500).json({ msg: "No se pudo crear el chatbot" });
    }
  }
);

/**
 * PATCH /api/chatbots/:id
 * Actualiza nombre/categoria/descripcion/activo
 * Devuelve el chatbot actualizado (poblado).
 */
router.patch(
  "/:id",
  verificarToken,
  autorizarRoles("profesor", "admin", "superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const payload = {};
      if (typeof req.body.nombre === "string") payload.nombre = req.body.nombre.trim();
      if (typeof req.body.categoria === "string") payload.categoria = req.body.categoria.trim();
      if (typeof req.body.descripcion === "string") payload.descripcion = req.body.descripcion.trim();
      if (typeof req.body.activo === "boolean") payload.activo = req.body.activo;

      const upd = await Chatbot.findByIdAndUpdate(
        id,
        { $set: payload },
        { new: true, runValidators: true, context: "query" }
      )
        .populate("createdBy", "nombre apellido apellidos correo")
        .lean();

      if (!upd) return res.status(404).json({ msg: "Chatbot no encontrado" });
      res.json(upd);
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(409).json({ msg: "Conflicto: nombre ya usado en esa categoría" });
      }
      console.error("PATCH /chatbots/:id error:", e);
      res.status(500).json({ msg: "No se pudo actualizar el chatbot" });
    }
  }
);

/**
 * DELETE /api/chatbots/:id
 * (opcional) elimina un chatbot
 */
router.delete(
  "/:id",
  verificarToken,
  autorizarRoles("admin", "superadmin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const ok = await Chatbot.deleteOne({ _id: id });
      if (!ok?.deletedCount) return res.status(404).json({ msg: "Chatbot no encontrado" });
      res.json({ msg: "Chatbot eliminado" });
    } catch (e) {
      console.error("DELETE /chatbots/:id error:", e);
      res.status(500).json({ msg: "No se pudo eliminar el chatbot" });
    }
  }
);

module.exports = router;