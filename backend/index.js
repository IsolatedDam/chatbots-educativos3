// server.js / app.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('./models/Admin');
require('dotenv').config();

const app = express();

/* ===== CORS ===== */
const ALLOW_LIST = [
  'http://localhost:3000',
  'http://localhost:5173', // vite dev (por si acaso)
  'https://chatbots-educativos3.vercel.app', // tu “bonito”
  'https://inquisitive-concha-7da15f.netlify.app', // el iframe que usas en PanelAdmin
  // agrega aquí otros dominios "bonitos" si tienes más
];

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/postman
    const ok =
      ALLOW_LIST.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.netlify.app');
    if (ok) return cb(null, true);
    return cb(new Error('CORS bloqueado: ' + origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false, // usa Bearer; pon true solo si vas a usar cookies/sesión
}));

// preflight universal (por si alguna ruta no pasa por cors)
app.options('*', cors());

app.use(express.json());

/* ===== Mongo ===== */
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conectado a MongoDB Atlas'))
.catch(err => console.error('❌ Error de conexión a MongoDB:', err));

/* ===== Auth helper (debug/whoami) ===== */
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
      permisos: Array.isArray(user.permisos) ? user.permisos : []
    };
    next();
  } catch {
    return res.status(401).json({ msg: 'Token inválido' });
  }
}

app.get('/api/_whoami', auth, (req, res) => {
  res.json(req.user);
});

/* ===== Rutas ===== */
app.use('/api', require('./routes/auth'));           // alumnos login/registro (si aplica)
app.use('/api/upload', require('./routes/upload'));  // carga masiva
app.use('/api/admin', require('./routes/admin'));    // admin + profesores
app.use('/api/visitas', require('./routes/visita')); // invitados
app.use('/api/alumnos', require('./routes/alumno')); // alumnos

app.get('/', (_req, res) => {
  res.send('🚀 API funcionando correctamente en Render');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend corriendo en puerto ${PORT}`));