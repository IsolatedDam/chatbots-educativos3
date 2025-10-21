import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { encryptLocalPassword } from '../utils/localVault';
import '../styles/Login.css';

function Login() {
  const [rut, setRut] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('alumno');           // 'alumno' | 'profesor'
  const [mensaje, setMensaje] = useState('');
  const [verPwd, setVerPwd] = useState(false);

  // recovery side-panel state (solo para profesor/admin)
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recEmail, setRecEmail] = useState('');
  const [recSending, setRecSending] = useState(false);
  const [recResult, setRecResult] = useState(null);

  const navigate = useNavigate();
  const API_BASE = process.env.REACT_APP_API_BASE || 'https://chatbots-educativos3-vhfq.onrender.com/api';
  const SESSION_MS = 30 * 60 * 1000; // 30 min

  const normalizarRut = (v) => v.replace(/\./g, '').replace(/\s+/g, '').toUpperCase();

  // Si cambias a "Alumno", cierra el panel de recuperación y limpia password
  useEffect(() => {
    if (rol === 'alumno') {
      setRecoveryOpen(false);
      setRecEmail('');
      setRecResult(null);
      setContrasena('');
    }
  }, [rol]);

  /* ---------------- LOGIN ---------------- */
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
          setMensaje('Ingresa RUT y contraseña.');
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

  /* ---------------- RECOVERY (side-panel) ---------------- */
  const openRecovery = (initialEmail = '') => {
    // Solo para profesor/admin
    if (rol === 'alumno') return;
    setRecEmail(initialEmail);
    setRecResult(null);
    setRecoveryOpen(true);
  };
  const closeRecovery = () => {
    if (recSending) return;
    setRecoveryOpen(false);
    setRecEmail('');
    setRecResult(null);
  };

  const validateEmail = (v) => {
    if (!v) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(v).toLowerCase());
  };

  async function handleSendRecovery() {
    if (!validateEmail(recEmail)) {
      setRecResult({ ok: false, msg: 'Ingresa un correo válido.' });
      return;
    }

    try {
      setRecSending(true);
      setRecResult(null);

      // Ruta correcta del backend y payload { correo }
      const res = await axios.post(`${API_BASE}/password/forgot`, {
        correo: recEmail
      });

      const msg = res.data?.msg || 'Si existe, se envió un email con instrucciones.';
      setRecResult({ ok: true, msg });
    } catch (err) {
      const errText = err.response?.data?.msg || err.message || 'Error enviando email';
      setRecResult({ ok: false, msg: String(errText) });
    } finally {
      setRecSending(false);
    }
  }

  /* ---------------- JSX ---------------- */
  return (
    <div className="login-wrapper">
      <div className="login-container">
        <img src="/Logo-IA.png" alt="Logo" className="login-logo" />
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
            placeholder={rol === 'alumno' ? 'RUT (Ej: 12345678-9)' : 'RUT (Ej: 12345678-9)'}
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
                {verPwd ? '🙈' : '👁️'}
              </button>
            </div>
          )}

          <button type="submit">Ingresar</button>
        </form>

        {/* Link de recuperación: SOLO profesor/admin */}
        {rol !== 'alumno' && (
          <div style={{ marginTop: 12 }}>
            <button className="login-link" onClick={() => openRecovery('')}>
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}

        {mensaje && <p className="login-msg">{mensaje}</p>}

        <button className="volver-inicio" onClick={() => navigate('/')}>
          ← Volver al inicio
        </button>
      </div>

      {/* ===== Side-panel: Recuperar contraseña (solo profesor/admin) ===== */}
      {rol !== 'alumno' && recoveryOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal" aria-labelledby="recuperar-title">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 id="recuperar-title" style={{ margin: 0, color: '#ffffffff', fontSize: 14 }}>Recuperar contraseña</h3>
              <button className="modal-close" onClick={closeRecovery} aria-label="Cerrar">✕</button>
            </div>

            <div className="modal-body">
              <p style={{ margin: 0, color: '#ffffffff', fontSize: 14 }}>
                Ingresa el <strong>correo verificado</strong> en tu cuenta. Si existe, recibirás un email con instrucciones.
              </p>

              <label className="field" style={{ marginTop: 12 }}>
                <span style={{ display: 'block', marginBottom: 6, color: '#ffffffff' }}>Correo</span>
                <input
                  type="email"
                  value={recEmail}
                  onChange={(e) => setRecEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                />
              </label>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                <button
                  className="btn btn-pr"
                  onClick={closeRecovery}
                  disabled={recSending}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSendRecovery}
                  disabled={recSending}
                  title={!validateEmail(recEmail) ? 'Ingresa un correo válido' : 'Enviar instrucciones'}
                >
                  {recSending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>

              {/* Result */}
              {recResult && (
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: recResult.ok ? '#e6ffef' : '#fff4f4',
                    color: recResult.ok ? '#046a2f' : '#991b1b',
                    border: recResult.ok ? '1px solid #b7f2cf' : '1px solid #f1b0b0'
                  }}>
                    {recResult.msg}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <small style={{ color: '#ffffffff' }}>¿No recibes el email? Revisa la carpeta SPAM.</small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;