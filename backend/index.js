// server.js (o index.js)
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('./models/Admin');
require('dotenv').config();

const app = express();

/* ====================== CORS ====================== */
// Orígenes permitidos explícitos (agrega los tuyos “bonitos” aquí)
const ALLOW_LIST = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite, por si usas
  'https://chatbots-educativos3.vercel.app',
  'https://inquisitive-concha-7da15f.netlify.app',
];

app.use(cors({
  origin(origin, cb) {
    // Permitir clientes sin origin (curl/postman)
    if (!origin) return cb(null, true);

    // Acepta lista blanca y cualquier subdominio de vercel/netlify
    const ok =
      ALLOW_LIST.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.netlify.app');

    return ok ? cb(null, true) : cb(new Error('CORS bloqueado: ' + origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,           // Pon true SOLO si usarás cookies/sesión
  optionsSuccessStatus: 204,    // 204 recomendado para preflight
}));

// ⚠️ Express 5: nada de '*' — usa /(.*) para preflight global
app.options('/(.*)', cors());

/* =================== Body parser ================== */
app.use(express.json());

/* ==================== MongoDB ===================== */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB Atlas'))
.catch(err => console.error('❌ Error de conexión a MongoDB:', err));

/* ============ Auth helper (para debug) ============ */
async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : h;
  if (!token) return res.status(401).json({ msg: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await Admin.findById(decoded.id).lean();
    if (!user) return res.status(401).json({ msg: 'Usuario no válido' });

    req.user = {
      id: String(user._id),
      rol: String(user.rol || '').toLowerCase(),
      permisos: Array.isArray(user.permisos) ? user.permisos : [],
    };
    next();
  } catch {
    return res.status(401).json({ msg: 'Token inválido' });
  }
}

// Ruta de diagnóstico (requiere token válido)
app.get('/api/_whoami', auth, (req, res) => {
  res.json(req.user); // { id, rol, permisos }
});

/* ===================== Rutas API ================== */
app.use('/api', require('./routes/auth'));            // login/registro alumnos (si aplica)
app.use('/api/upload', require('./routes/upload'));   // carga masiva
app.use('/api/admin', require('./routes/admin'));     // admin + profesores
app.use('/api/visitas', require('./routes/visita'));  // invitados
app.use('/api/alumnos', require('./routes/alumno'));  // alumnos

/* =================== Health check ================= */
app.get('/', (_req, res) => {
  res.send('🚀 API funcionando correctamente en Render');
});

/* ====================== Server ==================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend corriendo en puerto ${PORT}`));