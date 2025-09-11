import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { encryptLocalPassword } from '../utils/localVault';
import '../styles/Login.css';

function Login() {
  const [rut, setRut] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('alumno');
  const [mensaje, setMensaje] = useState('');
  const [verPwd, setVerPwd] = useState(false);

  const navigate = useNavigate();
  const API_BASE = 'https://chatbots-educativos3.onrender.com/api';
  const SESSION_MS = 30 * 60 * 1000; // 30 min

  const normalizarRut = (v) => v.replace(/\./g, '').replace(/\s+/g, '').toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rutLimpio = normalizarRut(rut);
    const contrasenaLimpia = contrasena.trim();

    try {
      let res;

      if (rol === 'alumno') {
        if (!rutLimpio) {
          setMensaje('Ingresa tu RUT.');
          setTimeout(() => setMensaje(''), 2500);
          return;
        }
        res = await axios.post(`${API_BASE}/login`, { rut: rutLimpio });
      } else {
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

      // Guarda sesión
      localStorage.setItem('token', token);
      localStorage.setItem('usuario', JSON.stringify(usuario));
      // ⏲️ expira en 30 min desde ahora
      localStorage.setItem('sessionExpiresAt', String(Date.now() + SESSION_MS));

      // Guarda contraseña cifrada (solo profesor/admin)
      if (rol !== 'alumno') {
        try {
          const salt = usuario?._id || usuario?.correo || usuario?.rut || rutLimpio || 'anon';
          const enc = await encryptLocalPassword(contrasenaLimpia, salt);
          if (enc) localStorage.setItem('password_enc', enc);
        } catch {}
        localStorage.removeItem('password');
        localStorage.removeItem('pwd');
        localStorage.removeItem('pass');
      } else {
        localStorage.removeItem('password_enc');
      }

      // Redirección según rol
      if (rol === 'alumno') {
        navigate('/panel-alumno');
      } else {
        const tipo = usuario.rol;
        if (tipo === 'superadmin') navigate('/panel-admin');
        else if (tipo === 'profesor' || tipo === 'admin') navigate('/panel-profesor');
        else {
          setMensaje('Rol no reconocido');
          setTimeout(() => setMensaje(''), 3000);
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
            />{' '}
            Alumno
          </label>
          <label>
            <input
              type="radio"
              name="rol"
              value="profesor"
              checked={rol === 'profesor'}
              onChange={() => setRol('profesor')}
            />{' '}
            Profesor/Admin
          </label>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={rol === 'alumno' ? 'RUT (Ej: 12345678-9)' : 'Usuario o RUT/Correo'}
            value={rut}
            onChange={(e) => setRut(e.target.value)}
            autoComplete="username"
          />

          {rol !== 'alumno' && (
            <div className="pwd-field">
              <input
                type={verPwd ? 'text' : 'password'}
                placeholder="Contraseña"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="current-password"
                name="password"
              />
              <button
                type="button"
                className="toggle-pwd"
                aria-label={verPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setVerPwd(v => !v)}
                title={verPwd ? 'Ocultar' : 'Mostrar'}
              >
                {verPwd ? (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 3l18 18" />
                    <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
                    <path d="M9.9 4.24A11.5 11.5 0 0 1 12 4c7 0 11 8 11 8a18.3 18.3 0 0 1-5.05 5.95" />
                    <path d="M6.11 6.11A18.3 18.3 0 0 0 1 12s4 8 11 8c1.4 0 2.7-.23 3.9-.64" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
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