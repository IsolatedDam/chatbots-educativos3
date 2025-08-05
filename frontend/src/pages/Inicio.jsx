import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Inicio.css';

function Inicio() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState('perfil');

  useEffect(() => {
    const datos = localStorage.getItem('usuario');
    if (!datos) {
      navigate('/login');
    } else {
      setUsuario(JSON.parse(datos));
    }
  }, [navigate]);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  return (
    <div className="panel-alumno">
      <aside className="panel-menu">
        <div className="panel-user">
          <img src="/avatar.png" alt="Perfil" />
          <p>{usuario?.nombre} {usuario?.apellido}</p>
        </div>
        <nav>
          <ul>
            <li className={seccion === 'perfil' ? 'activo' : ''} onClick={() => setSeccion('perfil')}>👤 Perfil</li>
            <li className={seccion === 'chatbots' ? 'activo' : ''} onClick={() => setSeccion('chatbots')}>🤖 Chatbots</li>
            <li className={seccion === 'otros' ? 'activo' : ''} onClick={() => setSeccion('otros')}>⚙️ Otras opciones</li>
          </ul>
        </nav>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </aside>

      <main className="panel-contenido">
        {seccion === 'perfil' && usuario && (
          <div className="panel-box">
            <h2>Datos del Alumno</h2>
            <p><strong>Correo:</strong> {usuario.correo}</p>
            <p><strong>Documento:</strong> {usuario.tipo_documento} {usuario.numero_documento}</p>
            <p><strong>Semestre:</strong> {usuario.semestre}</p>
            <p><strong>Jornada:</strong> {usuario.jornada}</p>
          </div>
        )}

        {seccion === 'chatbots' && usuario && (
          <div className="panel-box">
            <h2>Chatbots Asignados</h2>
            {usuario.chatbot?.length ? usuario.chatbot.map((cb, i) => (
              <iframe
                key={i}
                src={cb}
                title={`Chatbot ${i}`}
                width="100%"
                height="300"
                style={{ border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px' }}
              />
            )) : (
              <p>No tienes chatbots asignados aún.</p>
            )}
          </div>
        )}

        {seccion === 'otros' && (
          <div className="panel-box">
            <h2>Opciones futuras</h2>
            <p>Aquí irán más herramientas o configuraciones en el futuro.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Inicio;