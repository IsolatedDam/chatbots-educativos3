// middlewares/auth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin'); // superadmin, admin, profesor

// === Verifica token y sincroniza rol/permisos actuales desde BD ===
async function verificarToken(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : h;
    if (!token) return res.status(401).json({ msg: 'Token no enviado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, ... }
    const user = await Admin.findById(decoded.id).lean();
    if (!user || user.habilitado === false) {
      return res.status(401).json({ msg: 'Usuario no válido' });
    }

    req.usuario = {
      id: String(user._id),
      rol: String(user.rol || '').toLowerCase(),
      permisos: Array.isArray(user.permisos) ? user.permisos : [],
      correo: user.correo,
      nombre: user.nombre,
    };
    next();
  } catch {
    return res.status(401).json({ msg: 'Token inválido' });
  }
}

// === Autoriza por roles ===
// Nota: si una ruta pide admin/superadmin, dejamos pasar también a 'profesor'.
function autorizarRoles(...rolesPermitidos) {
  const allow = new Set(rolesPermitidos.map(r => String(r).toLowerCase()));
  return (req, res, next) => {
    const rol = String(req.usuario?.rol || '').toLowerCase();
    if (!rol) return res.status(403).json({ msg: 'No autorizado' });

    if (allow.has(rol)) return next();

    // Upgrade: profesor actúa como admin para rutas que pidan admin/superadmin
    if ((allow.has('admin') || allow.has('superadmin')) && rol === 'profesor') {
      return next();
    }
    return res.status(403).json({ msg: 'No autorizado' });
  };
}

// === Autoriza por permisos ===
// Aquí tratamos a 'profesor' como admin (pasa siempre). Si luego quieres granularidad,
// cambia esta función para chequear req.usuario.permisos como antes.
function puede(..._permisosNecesarios) {
  return (req, res, next) => {
    const rol = String(req.usuario?.rol || '').toLowerCase();
    if (rol === 'superadmin' || rol === 'admin' || rol === 'profesor') return next();
    return res.status(403).json({ msg: 'No autorizado' });
  };
}

module.exports = { verificarToken, autorizarRoles, puede };