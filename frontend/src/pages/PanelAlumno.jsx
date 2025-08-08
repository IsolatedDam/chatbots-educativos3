import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css';

function PanelAlumno() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState('perfil');

  useEffect(() => {
    const datos = localStorage.getItem('usuario');
    if (datos) {
      try {
        const usuarioParseado = JSON.parse(datos);
        setUsuario(usuarioParseado);
      } catch (e) {
        console.error('Error al leer el usuario desde localStorage:', e);
      }
    }
  }, []);

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
          <div className="perfil-box">
            <h2 className="perfil-titulo">Perfil del Alumno</h2>

            <section className="perfil-seccion">
              <h3>Información Personal</h3>
              <div className="perfil-grid">
                <div className="perfil-campo">
                  <label>Nombre:</label>
                  <div>{usuario.nombre} {usuario.apellido}</div>
                </div>
                <div className="perfil-campo">
                  <label>Documento:</label>
                  <div>{usuario.tipo_documento} {usuario.numero_documento}</div>
                </div>
                <div className="perfil-campo">
                  <label>Jornada:</label>
                  <div>{usuario.jornada}</div>
                </div>
                <div className="perfil-campo">
                  <label>Semestre:</label>
                  <div>{usuario.semestre}</div>
                </div>
              </div>
            </section>

            <section className="perfil-seccion">
              <h3>Información de Contacto</h3>
              <div className="perfil-grid">
                <div className="perfil-campo">
                  <label>Correo:</label>
                  <div>{usuario.correo}</div>
                </div>
                <div className="perfil-campo">
                  <label>Teléfono:</label>
                  <div>{usuario.telefono || 'No registrado'}</div>
                </div>
              </div>
            </section>

            <section className="perfil-seccion">
              <h3>Información Académica</h3>
              <div className="perfil-grid">
                <div className="perfil-campo">
                  <label>Estado de cuenta:</label>
                  <div>{usuario.habilitado ? 'Habilitado' : 'Suspendido'}</div>
                </div>
                <div className="perfil-campo">
                  <label>Color de riesgo:</label>
                  <div
                    className="riesgo-tag"
                    style={{ backgroundColor: usuario.color_riesgo === 'verde' ? '#27ae60' : '#c0392b' }}
                  >
                    {usuario.color_riesgo?.toUpperCase()}
                  </div>
                </div>
              </div>
            </section>
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
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
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

export default PanelAlumno;