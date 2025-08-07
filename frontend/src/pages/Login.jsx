import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../styles/Login.css';

function Login() {
  const [rut, setRut] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [rol, setRol] = useState('alumno');
  const [mensaje, setMensaje] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [visita, setVisita] = useState({
    nombre: '',
    correo: '',
    whatsapp: ''
  });

  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE;

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
          ? `${API_BASE}/api/login`
          : `${API_BASE}/api/admin/login`;

      console.log('→ Intentando login con:', { rutLimpio, contrasenaLimpia, endpoint });

      const res = await axios.post(endpoint, {
        rut: rutLimpio,
        contrasena: contrasenaLimpia,
      });

      console.log('✅ Respuesta recibida del backend:', res.data);

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
      console.error('❌ Error al intentar login:', err);
      const errorMsg = err.response?.data?.msg || 'Error al iniciar sesión';
      setMensaje(errorMsg);
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const handleInvitado = async () => {
    if (!visita.nombre || !visita.correo || !visita.whatsapp) {
      return Swal.fire('Campos incompletos', 'Por favor llena todos los campos.', 'warning');
    }

    try {
      await axios.post(`${API_BASE}/api/visitas/registro`, visita);

      Swal.fire({
        icon: 'success',
        title: '¡Bienvenido!',
        text: 'Tu visita ha sido registrada.',
        timer: 1500,
        showConfirmButton: false
      });

      setTimeout(() => {
        navigate('/bienvenida-visita');
      }, 1600);

      setModalAbierto(false);
      setVisita({ nombre: '', correo: '', whatsapp: '' });
    } catch (err) {
      Swal.fire('Error', 'No se pudo registrar la visita.', 'error');
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

        <button className="visit-button" onClick={() => setModalAbierto(true)}>
          Ingresar como visita
        </button>

        {mensaje && <p className="login-msg">{mensaje}</p>}
      </div>

      {modalAbierto && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>Registro de visita</h3>
            <input
              type="text"
              placeholder="Nombre completo"
              value={visita.nombre}
              onChange={(e) => setVisita({ ...visita, nombre: e.target.value })}
            />
            <input
              type="email"
              placeholder="Correo electrónico"
              value={visita.correo}
              onChange={(e) => setVisita({ ...visita, correo: e.target.value })}
            />
            <input
              type="text"
              placeholder="WhatsApp"
              value={visita.whatsapp}
              onChange={(e) => setVisita({ ...visita, whatsapp: e.target.value })}
            />

            <div className="modal-actions">
              <button onClick={handleInvitado}>Enviar</button>
              <button onClick={() => setModalAbierto(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;