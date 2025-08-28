// index.js
require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const Admin    = require('./models/Admin');

const app = express();
app.disable('x-powered-by');

// ===================== CORS =====================
// Dominios permitidos de forma explícita
const STATIC_ALLOWED = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://chatbots-educativos3.vercel.app',
  'https://chatbots-educativos3-bsm7swjd7-alejandros-projects-bb949aab.vercel.app', // preview actual
];

// Si quieres permitir cualquier preview de Vercel (.vercel.app), define:
// CORS_ALLOW_VERCEL_WILDCARD=1 en las variables de entorno de Render
const allowVercelWildcard = process.env.CORS_ALLOW_VERCEL_WILDCARD === '1';

app.use(cors({
  origin(origin, cb) {
    // Permite herramientas sin Origin (curl/Postman) y SSR
    if (!origin) return cb(null, true);

    if (STATIC_ALLOWED.includes(origin)) return cb(null, true);

    if (allowVercelWildcard && origin.endsWith('.vercel.app')) {
      return cb(null, true);
    }

    return cb(new Error(`CORS not allowed: ${origin}`), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
}));

// Responder preflights explícitamente
app.options('*', cors());

// (Opcional) log de preflights para depurar CORS
app.use((req, _res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight from:', req.headers.origin, 'to', req.originalUrl);
  }
  next();
});

// ================== Parsers ==================
app.use(express.json({ limit: '2mb' }));

// ================== MongoDB ==================
mongoose.connect(process.env.MONGO_URI, {
  // con Mongoose >=6 estos flags ya son default, igual no molestan
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// ============== Auth helper (debug/_whoami) ==============
async function auth(req, res, next) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : h;
  if (!token) return res.status(401).json({ msg: 'Token requerido' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, ... }
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

// Debug: quién soy (con token)
app.get('/api/_whoami', auth, (req, res) => {
  res.json(req.user); // { id, rol, permisos }
});

// ================== Rutas reales ==================
app.use('/api',        require('./routes/auth'));    // Login/registro alumnos (y lo que tengas ahí)
app.use('/api/upload', require('./routes/upload'));  // Carga masiva desde Excel
app.use('/api/admin',  require('./routes/admin'));   // Admin y profesores
app.use('/api/visitas',require('./routes/visita'));  // Invitados y exportación de visitas
app.use('/api/alumnos',require('./routes/alumno'));  // Funciones de alumnos

// Healthcheck
app.get('/', (_req, res) => {
  res.send('🚀 API funcionando correctamente en Render');
});

// ================== Server ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
});