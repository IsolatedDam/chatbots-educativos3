const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Alumno = require('../models/Alumno');
const bcrypt = require('bcryptjs');
const fs = require('fs');

// Configuración de subida
const upload = multer({ dest: 'uploads/' });

// Función para generar contraseñas aleatorias
function generarContrasenaAleatoria(longitud = 10) {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let clave = '';
  for (let i = 0; i < longitud; i++) {
    clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return clave;
}

// Ruta: Carga masiva de alumnos desde Excel
router.post('/masivo', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No se subió ningún archivo' });
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const datos = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const resultados = { exitosos: 0, fallidos: 0, errores: [] };

    for (const item of datos) {
      try {
        const correo = item.correo?.trim();
        const rut = item.numero_documento;

        const existeCorreo = await Alumno.findOne({ correo });
        if (existeCorreo) throw new Error('Correo ya registrado');

        const existeRut = await Alumno.findOne({ rut });
        if (existeRut) throw new Error('RUT ya registrado');

        const contrasena = generarContrasenaAleatoria();
        const hash = await bcrypt.hash(contrasena, 10);

        const alumno = new Alumno({
          rut,
          correo,
          contrasena: hash,
          tipo_documento: item.tipo_documento,
          numero_documento: item.numero_documento,
          nombre: item.nombre,
          apellido: item.apellido,
          semestre: item.semestre,
          jornada: item.jornada,
          rol: 'alumno',
          habilitado: true,
          aviso_suspension: false,
          rehabilitar_acceso: false,
          conteo_ingresos: 0,
          color_riesgo: 'verde'
        });

        await alumno.save();
        resultados.exitosos++;
      } catch (err) {
        resultados.fallidos++;
        resultados.errores.push({ correo: item.correo, error: err.message });
      }
    }

    // Eliminar el archivo temporal del servidor
    fs.unlinkSync(req.file.path);

    res.json(resultados);
  } catch (err) {
    console.error('Error general:', err);
    res.status(500).json({ msg: 'Error procesando archivo' });
  }
});

// Ruta: Obtener todos los alumnos (sin contraseñas)
router.get('/alumnos', async (req, res) => {
  try {
    const alumnos = await Alumno.find({}, '-contrasena -__v');
    res.json(alumnos);
  } catch (err) {
    console.error('Error al obtener alumnos:', err);
    res.status(500).json({ msg: 'Error al obtener alumnos' });
  }
});

module.exports = router;