const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// Rutas
app.use('/api', require('./routes/auth'));              // Login y registro para alumnos
app.use('/api/alumnos', require('./routes/alumno'));    // Gestión individual de alumnos
app.use('/api/upload', require('./routes/upload'));     // Carga masiva desde Excel
app.use('/api/admin', require('./routes/admin'));       // Admin y profesores
app.use('/api/visitas', require('./routes/visita'));    // Invitados y exportación de visitas

// Servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend corriendo en puerto ${PORT}`));