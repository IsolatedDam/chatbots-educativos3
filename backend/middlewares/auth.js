// middlewares/auth.js
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin'); // aquí están superadmin, admin y profesor

// Verifica token, extrae el id y sincroniza rol/permisos desde la BD
async function verificarToken(req, res, next) {
  try {
    const h = req.headers['authorization'] || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : h; // soporta "Bearer xxx" o solo "xxx"
    if (!token) return res.status(401).json({ msg: 'Token no enviado' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, rol? }

    // Buscar usuario real para obtener rol/permisos actuales
    const user = await Admin.findById(decoded.id).lean();
    if (!user || user.habilitado === false) {
      return res.status(401).json({ msg: 'Usuario no válido' });
    }

    req.usuario = {
      id: String(user._id),
      rol: String(user.rol || '').toLowerCase(),
      permisos: Array.isArray(user.permisos) ? user.permisos : [],
      correo: user.correo,
      nombre: user.nombre
    };

    next();
  } catch (err) {
    return res.status(401).json({ msg: 'Token inválido' });
  }
}

// Autoriza contra los roles normalizados
function autorizarRoles(...rolesPermitidos) {
  const allow = rolesPermitidos.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    const rol = String(req.usuario?.rol || '').toLowerCase();
    if (!rol || !allow.includes(rol)) {
      return res.status(403).json({ msg: 'No autorizado' });
    }
    next();
  };
}

module.exports = { verificarToken, autorizarRoles };