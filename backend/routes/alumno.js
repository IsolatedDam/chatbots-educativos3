// routes/alumno.js
const express = require('express');
const Alumno = require('../models/Alumno');
const { verificarToken, autorizarRoles, puede } = require('../middlewares/auth');

const router = express.Router();

/* ===== GET /api/alumnos?q=...  (profesor/admin/superadmin) ===== */
router.get('/', verificarToken, autorizarRoles('profesor', 'admin', 'superadmin'), async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? {
          $or: [
            { rut:      { $regex: q, $options: 'i' } },
            { nombre:   { $regex: q, $options: 'i' } },
            { apellido: { $regex: q, $options: 'i' } },
            { curso:    { $regex: q, $options: 'i' } },
            { correo:   { $regex: q, $options: 'i' } },
          ],
        }
      : {};
    const alumnos = await Alumno.find(filter).sort({ createdAt: -1 });
    res.json(alumnos);
  } catch (err) {
    console.error('listar alumnos error:', err);
    res.status(500).json({ msg: 'Error al obtener alumnos' });
  }
});

/* ===== PUT /api/alumnos/:id  (profesor/admin/superadmin) =====
   Guarda riesgo con ambos nombres: `riesgo` y `color_riesgo`.
*/
router.put('/:id', verificarToken, autorizarRoles('profesor', 'admin', 'superadmin'), async (req, res) => {
  try {
    const allowedKeys = [
      'rut','nombre','apellido','anio','fechaIngreso',
      'semestre','jornada','curso','telefono',
      'riesgo','color_riesgo','habilitado','suscripcionVenceEl'
    ];

    const body = {};
    for (const k of allowedKeys) if (k in req.body) body[k] = req.body[k];
    if (!Object.keys(body).length) {
      return res.status(400).json({ msg: 'Sin cambios válidos para actualizar' });
    }

    if ('color_riesgo' in body && !('riesgo' in body)) {
      body.riesgo = body.color_riesgo;
    }

    if ('anio' in body && body.anio !== '') body.anio = Number(body.anio);
    if ('semestre' in body && body.semestre !== '') body.semestre = Number(body.semestre);

    if ('riesgo' in body && body.riesgo != null) {
      const r = String(body.riesgo).toLowerCase();
      const valid = ['verde','amarillo','rojo',''];
      if (!valid.includes(r)) return res.status(400).json({ msg: 'Riesgo inválido' });
      body.riesgo = r;
      body.color_riesgo = r;
    }

    if ('suscripcionVenceEl' in body && body.suscripcionVenceEl) {
      const f = new Date(body.suscripcionVenceEl);
      if (isNaN(f.getTime())) return res.status(400).json({ msg: 'Fecha de vencimiento inválida' });
      body.suscripcionVenceEl = f;
    }

    if ('habilitado' in body) body.habilitado = !!body.habilitado;

    const alumno = await Alumno.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );
    if (!alumno) return res.status(404).json({ msg: 'Alumno no encontrado' });

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
});

/* ===== DELETE /api/alumnos/:id =====
   Permite: superadmin/admin y profesor con permiso 'alumnos:eliminar'
*/
router.delete('/:id', verificarToken, puede('alumnos:eliminar'), async (req, res) => {
  try {
    const eliminado = await Alumno.findByIdAndDelete(req.params.id);
    if (!eliminado) return res.status(404).json({ msg: 'Alumno no encontrado' });
    res.json({ msg: 'Alumno eliminado', id: req.params.id });
  } catch (err) {
    console.error('eliminar alumno error:', err);
    res.status(500).json({ msg: 'Error al eliminar alumno' });
  }
});

/* ===== POST /api/alumnos/bulk-delete  =====
   { ids: ["...","..."] }
*/
router.post('/bulk-delete', verificarToken, puede('alumnos:eliminar'), async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ msg: 'Sin IDs' });

    const r = await Alumno.deleteMany({ _id: { $in: ids } });
    res.json({ deleted: r.deletedCount, ids });
  } catch (err) {
    console.error('bulk delete alumnos error:', err);
    res.status(500).json({ msg: 'Error en eliminación masiva' });
  }
});

module.exports = router;