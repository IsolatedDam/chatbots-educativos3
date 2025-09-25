// index.js
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const Admin    = require('./models/Admin');

const app = express();
app.disable('x-powered-by');

/* ====== CORS ====== */
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
  if (!origin) return true;
  if (ALLOWED_STATIC.has(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin)) return true;
  return false;
}

app.use((req, _res, next) => { console.log('[REQ]', req.method, req.path, 'Origin:', req.headers.origin || '—'); next(); });

app.use(cors({
  origin(origin, cb) { cb(null, isAllowedOrigin(origin)); },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
}));

app.use((req, res, next) => { if (req.method === 'OPTIONS') return res.sendStatus(204); next(); });

/* ====== Parsers ====== */
app.use(express.json({ limit: '2mb' }));

/* ====== Rutas ====== */
app.use('/api',          require('./routes/auth'));
app.use('/api/upload',   require('./routes/upload'));
app.use('/api/admin',    require('./routes/admin'));
app.use('/api/visitas',  require('./routes/visita'));
app.use('/api/alumnos',  require('./routes/alumno'));
app.use('/api/cursos',   require('./routes/cursos'));
app.use('/api/chatbots', require('./routes/chatbots'));
app.use('/api/password', require('./routes/password'));
console.log('MONTADA: /api/password');

app.get('/', (_req, res) => res.send('🚀 API funcionando correctamente en Render'));
app.get('/health', (_req, res) => res.json({ ok: true, mongo: mongoose.connection.readyState })); // 1=ok

/* ====== Start AFTER DB connect ====== */
(async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('Falta MONGO_URI');

    mongoose.set('bufferCommands', false);
    mongoose.connection.on('connected', () => console.log('✅ MongoDB conectado'));
    mongoose.connection.on('error', (err) => console.error('❌ MongoDB error:', err));

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Backend corriendo en puerto ${PORT}`));
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
  }
})();