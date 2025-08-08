import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/Login.css';

function Login() {
  const [rut, setRut] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('alumno');
  const [mensaje, setMensaje] = useState('');

  const navigate = useNavigate();
  const API_BASE = 'https://chatbots-educativos3.onrender.com/api';

  // Normaliza RUT: quita puntos, deja guión, y usa k/K consistente
  const normalizarRut = (v) =>
    v.replace(/\./g, '').replace(/\s+/g, '').toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rutLimpio = normalizarRut(rut);
    const contrasenaLimpia = contrasena.trim();

    try {
      let res;

      if (rol === 'alumno') {
        // ✅ Alumno: solo RUT
        if (!rutLimpio) {
          setMensaje('Ingresa tu RUT.');
          setTimeout(() => setMensaje(''), 2500);
          return;
        }
        res = await axios.post(`${API_BASE}/login`, { rut: rutLimpio });
      } else {
        // ✅ Profesor/Admin: requieren contraseña
        if (!rutLimpio || !contrasenaLimpia) {
          setMensaje('Completa usuario/RUT y contraseña.');
          setTimeout(() => setMensaje(''), 2500);
          return;
        }
        res = await axios.post(`${API_BASE}/admin/login`, {
          rut: rutLimpio,
          contrasena: contrasenaLimpia,
        });
      }

      const usuario = res.data.alumno || res.data.admin;
      const token = res.data.token;

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      if (rol === 'alumno') {
        navigate('/panel-alumno');
      } else {
        const tipo = usuario.rol;
        if (tipo === 'superadmin') navigate('/panel-admin');
        else if (tipo === 'profesor' || tipo === 'admin') navigate('/panel-profesor');
        else setMensaje('Rol no reconocido');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.msg || 'Error al iniciar sesión';
      setMensaje(errorMsg);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <img src="/01.jpg" alt="Logo" className="login-logo" />
        <h2>Portal Educativo</h2>
        <p className="login-info">
          {rol === 'alumno'
            ? 'Ingresa solo con tu RUT.'
            : 'Solo usuarios registrados por el administrador pueden ingresar.'}
        </p>

        <div className="rol-selector">
          <label>
            <input
              type="radio"
              name="rol"
              value="alumno"
              checked={rol === 'alumno'}
              onChange={() => setRol('alumno')}
            /> Alumno
          </label>
          <label>
            <input
              type="radio"
              name="rol"
              value="profesor"
              checked={rol === 'profesor'}
              onChange={() => setRol('profesor')}
            /> Profesor/Admin
          </label>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={rol === 'alumno' ? 'RUT (Ej: 12345678-9)' : 'Usuario o RUT/Correo'}
            value={rut}
            onChange={(e) => setRut(e.target.value)}
          />

          {/* 🔒 Campo contraseña solo para profesor/admin */}
          {rol !== 'alumno' && (
            <input
              type="password"
              placeholder="Contraseña"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
          )}

          <button type="submit">Ingresar</button>
        </form>

        {mensaje && <p className="login-msg">{mensaje}</p>}

        <button className="volver-inicio" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default Login;