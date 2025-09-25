// routes/alumno.js
const express = require('express');
const Alumno = require('../models/Alumno');
const { verificarToken, autorizarRoles, puede } = require('../middlewares/auth');

const router = express.Router();

/* ==== Helper búsqueda ==== */
function buildSearchFilter(q) {
  if (!q) return {};
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const like = new RegExp(safe, 'i');
  return {
    $or: [
      { rut: like },
      { nombre: like },
      { apellido: like },
      { curso: like },
      { correo: like },
      { numero_documento: like },
    ],
  };
}

/* ===== GET /api/alumnos?q=... =====
   - Profesor: SOLO sus alumnos (createdBy = req.usuario.id)
   - Admin/Superadmin: ven todos
*/
router.get(
  '/',
  verificarToken,
  autorizarRoles('profesor', 'admin', 'superadmin'),
  async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      const base = buildSearchFilter(q);

      const rol = String(req.usuario?.rol || req.user?.rol || '').toLowerCase();
      const me  = String(req.usuario?.id || req.user?.id || '');

      const filter = (rol === 'profesor')
        ? { ...base, createdBy: me }
        : base;

      const alumnos = await Alumno.find(filter).sort({ createdAt: -1 }).lean();
      res.json(alumnos);
    } catch (err) {
      console.error('listar alumnos error:', err);
      res.status(500).json({ msg: 'Error al obtener alumnos' });
    }
  }
);

/* ===== PUT /api/alumnos/:id =====
   - Profesor: solo puede editar SUS alumnos
*/
router.put(
  '/:id',
  verificarToken,
  autorizarRoles('profesor', 'admin', 'superadmin'),
  async (req, res) => {
    try {
      const allowedKeys = [
        'rut','nombre','apellido','anio','fechaIngreso',
        'semestre','jornada','curso','telefono',
        'riesgo','color_riesgo','habilitado','suscripcionVenceEl',
        'numero_documento','tipo_documento'
      ];

      const body = {};
      for (const k of allowedKeys) if (k in req.body) body[k] = req.body[k];
      if (!Object.keys(body).length) {
        return res.status(400).json({ msg: 'Sin cambios válidos para actualizar' });
      }

      if ('color_riesgo' in body && !('riesgo' in body)) body.riesgo = body.color_riesgo;

      if ('anio' in body && body.anio !== '') body.anio = Number(body.anio);
      if ('semestre' in body && body.semestre !== '') body.semestre = Number(body.semestre);

      if ('riesgo' in body && body.riesgo != null) {
        const r = String(body.riesgo).toLowerCase();
        const valid = ['verde','amarillo','rojo',''];
        if (!valid.includes(r)) return res.status(400).json({ msg: 'Riesgo inválido' });
        body.riesgo = r; body.color_riesgo = r;
      }

      if ('suscripcionVenceEl' in body && body.suscripcionVenceEl) {
        const f = new Date(body.suscripcionVenceEl);
        if (isNaN(f.getTime())) return res.status(400).json({ msg: 'Fecha de vencimiento inválida' });
        body.suscripcionVenceEl = f;
      }

      if ('habilitado' in body) body.habilitado = !!body.habilitado;

      // Validar propiedad
      const actual = await Alumno.findById(req.params.id);
      if (!actual) return res.status(404).json({ msg: 'Alumno no encontrado' });

      const rol = String(req.usuario?.rol || req.user?.rol || '').toLowerCase();
      const me  = String(req.usuario?.id || req.user?.id || '');
      if (rol === 'profesor' && String(actual.createdBy) !== me) {
        return res.status(403).json({ msg: 'No puedes editar este alumno' });
      }

      delete body.createdBy; // que no modifiquen dueño

      const alumno = await Alumno.findByIdAndUpdate(req.params.id, body, {
        new: true,
        runValidators: true
      });
      res.json(alumno);
    } catch (err) {
      if (err?.code === 11000) {
        const key = Object.keys(err.keyPattern || {})[0] || '';
        let msg = 'Registro duplicado';
        if (key === 'correo') msg = 'El correo ya está registrado';
        else if (key === 'rut') msg = 'El RUT ya está registrado';
        else if (err?.message?.includes('unique_doc')) msg = 'Ya existe un alumno con ese documento';
        return res.status(409).json({ msg });
      }
      console.error('editar alumno error:', err);
      res.status(500).json({ msg: 'Error al actualizar alumno' });
    }
  }
);

/* ===== DELETE /api/alumnos/:id =====
   - Profesor: solo borra SUS alumnos
*/
router.delete('/:id', verificarToken, puede('alumnos:eliminar'), async (req, res) => {
  try {
    const actual = await Alumno.findById(req.params.id);
    if (!actual) return res.status(404).json({ msg: 'Alumno no encontrado' });

    const rol = String(req.usuario?.rol || req.user?.rol || '').toLowerCase();
    const me  = String(req.usuario?.id || req.user?.id || '');
    if (rol === 'profesor' && String(actual.createdBy) !== me) {
      return res.status(403).json({ msg: 'No puedes eliminar este alumno' });
    }

    await Alumno.deleteOne({ _id: actual._id });
    res.json({ msg: 'Alumno eliminado', id: String(actual._id) });
  } catch (err) {
    console.error('eliminar alumno error:', err);
    res.status(500).json({ msg: 'Error al eliminar alumno' });
  }
});

/* ===== POST /api/alumnos/bulk-delete =====
   { ids: [] } — Profesor: solo borra los suyos
*/
router.post('/bulk-delete', verificarToken, puede('alumnos:eliminar'), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ msg: 'Sin IDs' });

    const rol = String(req.usuario?.rol || req.user?.rol || '').toLowerCase();
    const me  = String(req.usuario?.id || req.user?.id || '');

    let filter = { _id: { $in: ids } };
    if (rol === 'profesor') filter.createdBy = me;

    const r = await Alumno.deleteMany(filter);
    res.json({ deleted: r.deletedCount, ids });
  } catch (err) {
    console.error('bulk delete alumnos error:', err);
    res.status(500).json({ msg: 'Error en eliminación masiva' });
  }
});

module.exports = router;