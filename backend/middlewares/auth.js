// middlewares/auth.js
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");   // superadmin, admin, profesor
const Alumno = require("../models/Alumno"); // alumnos

function extractToken(req) {
  const h = req.headers.authorization || "";
  if (!h) return "";
  return h.startsWith("Bearer ") ? h.slice(7) : h;
}

// === Verifica token y carga usuario desde Admin o Alumno ===
async function verificarToken(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ msg: "Token no enviado" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // payload esperado idealmente: { id, rol }
    const claimedRole = String(payload.rol || "").toLowerCase();
    const claimedId   = String(payload.id || payload.userId || payload.alumnoId || payload.adminId || "");

    // 1) Si el token dice rol=alumno, buscamos primero en Alumno
    if (claimedRole === "alumno" && claimedId) {
      const a = await Alumno.findById(claimedId).lean();
      if (a && a.habilitado !== false) {
        req.usuario = {
          id: String(a._id),
          rol: "alumno",
          permisos: [],
          correo: a.correo,
          nombre: a.nombre,
        };
        return next();
      }
    }

    // 2) Intentamos Admin (superadmin/admin/profesor)
    if (claimedId) {
      const u = await Admin.findById(claimedId).lean();
      if (u && u.habilitado !== false) {
        req.usuario = {
          id: String(u._id),
          rol: String(u.rol || "").toLowerCase(),
          permisos: Array.isArray(u.permisos) ? u.permisos : [],
          correo: u.correo,
          nombre: u.nombre,
        };
        return next();
      }
    }

    // 3) Como fallback, probamos Alumno aunque el token no traiga rol claro
    if (claimedId) {
      const a2 = await Alumno.findById(claimedId).lean();
      if (a2 && a2.habilitado !== false) {
        req.usuario = {
          id: String(a2._id),
          rol: "alumno",
          permisos: [],
          correo: a2.correo,
          nombre: a2.nombre,
        };
        return next();
      }
    }

    return res.status(401).json({ msg: "Usuario no válido" });
  } catch (e) {
    return res.status(401).json({ msg: "Token inválido" });
  }
}

// === Autoriza por roles ===
// Nota: si una ruta pide admin/superadmin, dejamos pasar también a 'profesor'.
function autorizarRoles(...rolesPermitidos) {
  const allow = new Set(rolesPermitidos.map((r) => String(r).toLowerCase()));
  return (req, res, next) => {
    const rol = String(req.usuario?.rol || "").toLowerCase();
    if (!rol) return res.status(403).json({ msg: "No autorizado" });

    if (allow.has(rol)) return next();

    // Upgrade: profesor actúa como admin para rutas que pidan admin/superadmin
    if ((allow.has("admin") || allow.has("superadmin")) && rol === "profesor") {
      return next();
    }
    return res.status(403).json({ msg: "No autorizado" });
  };
}

// === Autoriza por permisos ===
function puede(..._permisosNecesarios) {
  return (req, res, next) => {
    const rol = String(req.usuario?.rol || "").toLowerCase();
    if (rol === "superadmin" || rol === "admin" || rol === "profesor") return next();
    return res.status(403).json({ msg: "No autorizado" });
  };
}

module.exports = { verificarToken, autorizarRoles, puede };