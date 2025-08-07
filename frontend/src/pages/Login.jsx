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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rutLimpio = rut.trim().toLowerCase();
    const contrasenaLimpia = contrasena.trim();

    if (!rutLimpio || !contrasenaLimpia) {
      setMensaje('Por favor completa ambos campos');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    try {
      const endpoint =
        rol === 'alumno'
          ? `${API_BASE}/login`
          : `${API_BASE}/admin/login`;

      const res = await axios.post(endpoint, {
        rut: rutLimpio,
        contrasena: contrasenaLimpia,
      });

      const usuario = res.data.alumno || res.data.admin;
      const token = res.data.token;

      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));

      if (rol === 'alumno') {
        navigate('/panel-alumno');
      } else {
        const tipo = usuario.rol;
        if (tipo === 'superadmin') {
          navigate('/panel-admin');
        } else if (tipo === 'profesor') {
          navigate('/panel-profesor');
        } else {
          setMensaje('Rol no reconocido');
        }
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
        <p className="login-info">Solo usuarios registrados por el administrador pueden ingresar.</p>

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
            /> Profesor
          </label>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={rol === 'alumno' ? 'RUT (Ej: 12345678-9)' : 'Usuario o correo'}
            value={rut}
            onChange={(e) => setRut(e.target.value)}
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
          <button type="submit">Ingresar</button>
        </form>

        <p className="login-link" onClick={() => alert('Recuperar contraseña...')}>
          ¿Olvidaste tu contraseña?
        </p>

        {mensaje && <p className="login-msg">{mensaje}</p>}

        <button className="volver-inicio" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  );
}

export default Login;