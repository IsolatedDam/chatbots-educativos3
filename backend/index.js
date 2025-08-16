const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');              // <-- añadido
const Admin = require('./models/Admin');          // <-- añadido
require('dotenv').config();

const app = express();

// ✅ CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://chatbots-educativos3.vercel.app'],
  credentials: true
}));

app.use(express.json());

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

/* ============= AUTH de apoyo para debug y rutas que lo necesiten ============= */
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

/* ===================== RUTA DE DIAGNÓSTICO ===================== */
// GET https://tu-backend/api/_whoami (enviar Authorization: Bearer <token>)
app.get('/api/_whoami', auth, (req, res) => {
  res.json(req.user); // { id, rol, permisos }
});

/* ========================= Rutas reales ========================= */
app.use('/api', require('./routes/auth'));              // Login y registro para alumnos
app.use('/api/upload', require('./routes/upload'));     // Carga masiva desde Excel
app.use('/api/admin', require('./routes/admin'));       // Admin y profesores
app.use('/api/visitas', require('./routes/visita'));    // Invitados y exportación de visitas
app.use('/api/alumnos', require('./routes/alumno'));    // Funciones de alumnos

// ✅ Root
app.get('/', (_req, res) => {
  res.send('🚀 API funcionando correctamente en Render');
});

// ✅ Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend corriendo en puerto ${PORT}`));