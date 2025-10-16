import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../styles/Login.css';

function LoginInvitado() {
  const [visita, setVisita] = useState({
    nombre: '',
    correo: '',
    whatsapp: '' // Enviamos en E.164 (+569XXXXXXXX), pero el usuario ve "9 1234 5678"
  });

  const [phoneInput, setPhoneInput] = useState(''); // lo que se muestra: "9 1234 5678"
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const navigate = useNavigate();
  const API_BASE = 'https://chatbots-educativos3-vhfq.onrender.com/api';

  /* ---------------- Helpers ---------------- */
  const isValidEmail = (v = '') =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).toLowerCase());

  // Normaliza móviles CL: solo 9 dígitos, empezando por 9. Muestra "9 1234 5678"
  // y si es válido construye E.164 "+569XXXXXXXX" (invisible para el usuario)
  function normalizeChileMobile(raw = '') {
    let digits = String(raw).replace(/\D/g, '').slice(0, 9); // máx 9 dígitos

    // display: "9 1234 5678"
    let display = digits;
    if (digits.length > 1) {
      const a = digits.slice(0, 1);
      const b = digits.slice(1, 5);
      const c = digits.slice(5, 9);
      display = [a, b, c].filter(Boolean).join(' ');
    }

    const valid = digits.length === 9 && digits.startsWith('9');
    const e164 = valid ? `+569${digits.slice(1)}` : '';

    return { display, e164, valid };
  }

  /* ---------------- Handlers ---------------- */
  function onEmailBlur() {
    if (!visita.correo) return setEmailError('Ingresa tu correo.');
    setEmailError(isValidEmail(visita.correo) ? '' : 'Correo no válido.');
  }

  function onPhoneChange(e) {
    const { display, e164 } = normalizeChileMobile(e.target.value);
    setPhoneInput(display);
    setVisita((prev) => ({ ...prev, whatsapp: e164 || '' }));
    if (phoneError) setPhoneError('');
  }

  function onPhoneBlur() {
    const { valid, e164 } = normalizeChileMobile(phoneInput);
    if (!valid) {
      setPhoneError('Ingresa un número de teléfono válido (ej: 9 1234 5678)');
    } else {
      setPhoneError('');
      setVisita((p) => ({ ...p, whatsapp: e164 }));
    }
  }

  const handleInvitado = async () => {
    if (!visita.nombre) {
      return Swal.fire('Campos incompletos', 'Ingresa tu nombre.', 'warning');
    }
    if (!visita.correo) {
      setEmailError('Ingresa tu correo.');
      return;
    }
    if (!isValidEmail(visita.correo)) {
      setEmailError('Correo no válido.');
      return;
    }

    const { valid, e164 } = normalizeChileMobile(phoneInput);
    if (!valid) {
      setPhoneError('Ingresa 9 dígitos chilenos (ej: 9 1234 5678)');
      return;
    }

    try {
      await axios.post(`${API_BASE}/visitas/registro`, {
        nombre: visita.nombre.trim(),
        correo: visita.correo.trim(),
        whatsapp: e164, // guardamos en +569XXXXXXXX
      });

      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Tu visita ha sido registrada.',
        timer: 1500,
        showConfirmButton: false,
      });

      setTimeout(() => navigate('/bienvenida-visita'), 1600);

      setVisita({ nombre: '', correo: '', whatsapp: '' });
      setPhoneInput('');
      setEmailError('');
      setPhoneError('');
    } catch {
      Swal.fire('Error', 'No se pudo registrar la visita.', 'error');
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleInvitado();
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="login-wrapper">
      <div className="login-container">
        <img src="/01.jpg" alt="Logo" className="login-logo" />
        <h2>Ingreso como Visita</h2>
        <p className="login-info">Completa los datos para acceder como invitado.</p>

        <div className="login-form" onKeyDown={onKeyDown}>
          <input
            type="text"
            placeholder="Nombre completo"
            value={visita.nombre}
            onChange={(e) => setVisita({ ...visita, nombre: e.target.value })}
            autoComplete="name"
          />

          <div style={{ width: '100%' }}>
            <input
              type="email"
              placeholder="Correo electrónico (ej: nombre@dominio.com)"
              value={visita.correo}
              onChange={(e) => {
                setVisita({ ...visita, correo: e.target.value });
                if (emailError) setEmailError('');
              }}
              onBlur={onEmailBlur}
              autoComplete="email"
            />
            <small
              style={{
                display: 'block',
                marginTop: 6,
                color: emailError ? '#b42318' : '#6b7280',
              }}
            >
              {emailError}
            </small>
          </div>

          <div style={{ width: '100%', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <label htmlFor="whatsapp-input" style={{ flexShrink: 0, fontSize: '14px', paddingTop: '12px' }}>Whatsapp</label>
            <div style={{width: '100%'}}>
                <input
                  id="whatsapp-input"
                  type="tel"
                  inputMode="numeric"
                  placeholder="9 1234 5678"
                  value={phoneInput}
                  onChange={onPhoneChange}
                  onBlur={onPhoneBlur}
                  aria-label="WhatsApp (Chile)"
                  maxLength={11} // "9 1234 5678" (incluye espacios)
                />
                <small
                  style={{
                    display: 'block',
                    marginTop: 6,
                    color: phoneError ? '#b42318' : '#6b7280',
                  }}
                >
                  {phoneError || 'Ingresa 9 dígitos (ej: 9 1234 5678)'}
                </small>
            </div>
          </div>

          <button type="submit" onClick={handleInvitado}>Ingresar</button>
        </div>

        <p className="login-link" onClick={() => navigate('/')}>
          ← Volver a inicio
        </p>
      </div>
    </div>
  );
}

export default LoginInvitado;