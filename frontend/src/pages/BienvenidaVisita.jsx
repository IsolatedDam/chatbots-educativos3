import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css'; // Cambiar a PanelAlumno.css para usar los mismos estilos

const CHATBOT_SRC =
  'https://aipoweredchatbot-production.up.railway.app/chatbot/68d1694d375d7acbb68821ff?key=PDykle3B8BEfzdIjR8XN__jQ4UPgU6x-JjAKt_SdWAnYrFHslUNeZH5NHZgOAh2M';

export default function BienvenidaVisita() {
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState('inicio'); // Estado para la sección activa
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setCargando(false), 7000);
    return () => clearTimeout(t);
  }, []);

  // Temporizador para cerrar sesión automáticamente después de 30 minutos
  useEffect(() => {
    const timeout = setTimeout(() => {
      alert('Tu sesión de visita ha expirado. Serás redirigido a la página principal.');
      navigate('/');
    }, 30 * 60 * 1000); // 30 minutos en milisegundos

    return () => clearTimeout(timeout); // Limpiar al desmontar
  }, [navigate]);

  if (cargando) {
    return (
      <div className="visit-loading">
        <div className="visit-spinner" />
        <p className="visit-loading-text">
          Bienvenido a Masoterapia, te estamos redirigiendo a nuestra página… ⏳
        </p>
      </div>
    );
  }

  const cerrarSesion = () => {
    navigate('/'); // Lleva a la página principal
  };

  return (
    <div className="al-theme"> {/* Usar clases de PanelAlumno.css */}
      <div className="al-layout">
        {/* Sidebar */}
        <aside className="al-sidebar">
          <div className="brand">
            <div className="logo">🤖</div>
            <div className="brand-text">
              <span className="brand-top">Masoterapia</span>
              <span className="brand-bottom">Chatbots</span>
            </div>
          </div>

          <nav className="al-nav">
            <button className={`nav-item ${seccion === 'inicio' ? 'active' : ''}`} onClick={() => setSeccion('inicio')}>
              <span className="nav-ico">🏠</span><span>Inicio</span>
            </button>
            <button className={`nav-item ${seccion === 'chatbot1' ? 'active' : ''}`} onClick={() => setSeccion('chatbot1')}>
              <span className="nav-ico">💬</span><span>Chatbot Prueba</span>
            </button>
            <button className={`nav-item ${seccion === 'chatbot2' ? 'active' : ''}`} onClick={() => setSeccion('chatbot2')}>
              <span className="nav-ico">🤖</span><span>Otro Chatbot</span>
            </button>
            <button className={`nav-item ${seccion === 'videos' ? 'active' : ''}`} onClick={() => setSeccion('videos')}>
              <span className="nav-ico">🎥</span><span>Videos</span>
            </button>
          </nav>

          <button className="btn btn-logout" onClick={cerrarSesion}>Cerrar sesión</button>
        </aside>

        {/* Main */}
        <main className="al-main">
          <header className="al-header">
            <div className="titles">
              <h1>Panel de Visita</h1>
              <p className="subtitle">Explora nuestros recursos educativos.</p>
            </div>
          </header>

          {/* Contenido según sección */}
          {seccion === 'inicio' && (
            <section className="card">
              <h3 className="card-title">Bienvenido a Masoterapia</h3>
              <p>Aquí irá información adicional que agregaremos después.</p>
            </section>
          )}

          {seccion === 'chatbot1' && (
            <section className="card">
              <h3 className="card-title">Chatbot de Prueba</h3>
              <div className="iframe-wrap">
                <iframe
                  src={CHATBOT_SRC}
                  title="Chatbot de prueba — Masoterapia"
                  frameBorder="0"
                  allow="clipboard-write; microphone"
                  style={{ width: '100%', height: '600px' }} // Ajustar altura
                />
              </div>
            </section>
          )}

          {seccion === 'chatbot2' && (
            <section className="card">
              <h3 className="card-title">Otro Chatbot</h3>
              <p>Placeholder para otro chatbot. Agregaremos el iframe después.</p>
              {/* Aquí puedes agregar otro iframe si tienes la URL */}
            </section>
          )}

          {seccion === 'videos' && (
            <section className="card">
              <h3 className="card-title">Videos Educativos</h3>
              <p>Aquí se mostrarán los videos que agregaremos después.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}