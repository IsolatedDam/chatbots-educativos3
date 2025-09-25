import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../styles/Login.css'; // Usa tu mismo estilo

function LoginInvitado() {
  const [visita, setVisita] = useState({
    nombre: '',
    correo: '',
    whatsapp: ''
  });
  const navigate = useNavigate();
  const API_BASE = 'https://chatbots-educativos3.onrender.com/api';

  const handleInvitado = async () => {
    if (!visita.nombre || !visita.correo || !visita.whatsapp) {
      return Swal.fire('Campos incompletos', 'Por favor llena todos los campos.', 'warning');
    }

    try {
      await axios.post(`${API_BASE}/visitas/registro`, visita);

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

      setVisita({ nombre: '', correo: '', whatsapp: '' });
    } catch (err) {
      Swal.fire('Error', 'No se pudo registrar la visita.', 'error');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        <img src="/01.jpg" alt="Logo" className="login-logo" />
        <h2>Ingreso como Visita</h2>
        <p className="login-info">Completa los datos para acceder como invitado.</p>

        <form className="login-form" onSubmit={(e) => { e.preventDefault(); handleInvitado(); }}>
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
          <button type="submit">Ingresar</button>
        </form>

        <p className="login-link" onClick={() => navigate('/')}>
          ← Volver a inicio
        </p>
      </div>
    </div>
  );
}

export default LoginInvitado;