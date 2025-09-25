// index.js
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const Admin    = require('./models/Admin');

const app = express();
app.disable('x-powered-by');

/* ===================== CORS (Express 5 safe) ===================== */
const ALLOWED_STATIC = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'https://chatbots-educativos3.vercel.app',
]);

if (process.env.FRONT_URL) {
  try {
    const u = new URL(process.env.FRONT_URL);
    ALLOWED_STATIC.add(`${u.protocol}//${u.host}`);
  } catch {}
}

function isAllowedOrigin(origin) {
  if (!origin) return true; // curl/postman/SSR
  if (ALLOWED_STATIC.has(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;   // previews Vercel
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return true; // dominios Render
  return false;
}

const corsOptions = {
  origin(origin, cb) {
    const ok = isAllowedOrigin(origin);
    if (!ok) {
      console.warn('[CORS] origin NO permitido:', origin);
      return cb(null, false);
    }
    cb(null, true);
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));
// Short-circuit para preflights (sin patrones problemáticos)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/* ================== Parsers ================== */
app.use(express.json({ limit: '2mb' }));

/* ================== MongoDB ================== */
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch((err) => console.error('❌ Error de conexión a MongoDB:', err));

/* ============== Auth helper (debug/_whoami) ============== */
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

app.get('/api/_whoami', auth, (req, res) => {
  res.json(req.user);
});

/* ================== Rutas ================== */
app.use('/api',         require('./routes/auth'));
app.use('/api/upload',  require('./routes/upload'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/visitas', require('./routes/visita'));
app.use('/api/alumnos', require('./routes/alumno'));
app.use('/api/cursos',  require('./routes/cursos'));
app.use('/api/chatbots',require('./routes/chatbots'));
app.use('/api/password', require('./routes/password'));
console.log('MONTADA: /api/password');

// Healthcheck
app.get('/', (_req, res) => {
  res.send('🚀 API funcionando correctamente en Render');
});

/* ================== Server ================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
});