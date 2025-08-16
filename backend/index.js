const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('./models/Admin');
require('dotenv').config();

const app = express();

/* ===================== CORS ===================== */
const whitelist = [
  'http://localhost:3000',
  'https://chatbots-educativos3.vercel.app', // dominio prod (si lo usas fijo)
  /\.vercel\.app$/                            // <-- cualquier preview de Vercel
];
const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/Postman o same-origin
    const ok = whitelist.some(rule =>
      rule instanceof RegExp ? rule.test(origin) : rule === origin
    );
    return ok ? cb(null, true) : cb(new Error(`CORS: origin no permitido: ${origin}`));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Disposition'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

app.use(express.json());

/* ===================== Mongo ===================== */
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

/* ===================== AUTH (debug y reutilizable) ===================== */
async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : h;
  if (!token) return res.status(401).json({ msg: 'Token requerido' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, ... }
    const user = await Admin.findById(decoded.id).lean();
    if (!user || user.habilitado === false) return res.status(401).json({ msg: 'Usuario no válido' });
    req.user = {
      id: String(user._id),
      rol: String(user.rol || '').toLowerCase(),
      permisos: Array.isArray(user.permisos) ? user.permisos : []
    };
    next();
  } catch {
    return res.status(401).json({ msg: 'Token inválido' });
  }
}

/* ===================== Debug ===================== */
app.get('/api/_whoami', auth, (req, res) => res.json(req.user)); // { id, rol, permisos }

/* ===================== Rutas reales ===================== */
app.use('/api', require('./routes/auth'));           // Login/registro alumnos
app.use('/api/upload', require('./routes/upload'));  // Carga masiva desde Excel
app.use('/api/admin', require('./routes/admin'));    // Admin y profesores
app.use('/api/visitas', require('./routes/visita')); // Invitados y export
app.use('/api/alumnos', require('./routes/alumno')); // CRUD alumnos

/* ===================== Root ===================== */
app.get('/', (_req, res) => res.send('🚀 API funcionando correctamente en Render'));

/* ===================== Server ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend corriendo en puerto ${PORT}`));