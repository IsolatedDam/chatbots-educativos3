import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css';

/* ===== API local/remota ===== */
const API_ROOT = (() => {
  const vite = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_ROOT : undefined;
  const cra  = typeof process !== "undefined" ? process.env?.REACT_APP_API_ROOT : undefined;
  if (vite) return vite;
  if (cra)  return cra;
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:5000";
  }
  return "https://chatbots-educativos3-vhfq.onrender.com";
})();
const API_BASE = `${API_ROOT}/api`;

export default function BienvenidaVisita() {
  const navigate = useNavigate();
  const [seccion, setSeccion] = useState('inicio');
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${API_BASE}/guest-panel`);
        if (!response.ok) {
          throw new Error('No se pudo cargar la configuración del panel.');
        }
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error("Error fetching guest panel config", error);
        // Optionally, set an error state to show in the UI
      } finally {
        setCargando(false);
      }
    };

    fetchConfig();
  }, []);

  // Auto-logout timer
  useEffect(() => {
    const timeout = setTimeout(() => {
      alert('Tu sesión de visita ha expirado. Serás redirigido a la página principal.');
      navigate('/');
    }, 30 * 60 * 1000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  const cerrarSesion = () => {
    navigate('/');
  };

  if (cargando || !config) {
    return (
      <div className="visit-loading">
        <div className="visit-spinner" />
        <p className="visit-loading-text">
          Cargando recursos... ⏳
        </p>
      </div>
    );
  }

  const renderContent = () => {
    if (seccion === 'inicio') {
      return (
        <section className="card">
          <h3 className="card-title">{config.welcome.title}</h3>
          <p>{config.welcome.text}</p>
        </section>
      );
    }

    if (seccion === 'videos') {
      return (
        <section className="card">
          <h3 className="card-title">Videos Educativos</h3>
          {config.videos.length > 0 ? (
            config.videos.map(video => (
              <div key={video._id} className="video-container">
                <h4>{video.title}</h4>
                <iframe
                  src={video.videoUrl}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ))
          ) : (
            <p>No hay videos disponibles en este momento.</p>
          )}
        </section>
      );
    }

    // Handle chatbot sections
    const chatbot = config.chatbots.find(cb => cb._id === seccion);
    if (chatbot) {
      return (
        <section className="card">
          <h3 className="card-title">{chatbot.title}</h3>
          <div className="iframe-wrap">
            <iframe
              src={chatbot.iframeUrl}
              title={chatbot.title}
              frameBorder="0"
              allow="clipboard-write; microphone"
              style={{ width: '100%', height: '600px' }}
            />
          </div>
        </section>
      );
    }

    return null; // Or a default message
  };

  return (
    <div className="al-theme">
      <div className="al-layout">
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
            
            {config.chatbots.map(chatbot => (
              <button key={chatbot._id} className={`nav-item ${seccion === chatbot._id ? 'active' : ''}`} onClick={() => setSeccion(chatbot._id)}>
                <span className="nav-ico">💬</span><span>{chatbot.title}</span>
              </button>
            ))}

            {config.videos.length > 0 && (
              <button className={`nav-item ${seccion === 'videos' ? 'active' : ''}`} onClick={() => setSeccion('videos')}>
                <span className="nav-ico">🎥</span><span>Videos</span>
              </button>
            )}
          </nav>

          <button className="btn btn-logout" onClick={cerrarSesion}>Cerrar sesión</button>
        </aside>

        <main className="al-main">
          <header className="al-header">
            <div className="titles">
              <h1>Panel de Visita</h1>
              <p className="subtitle">Explora nuestros recursos educativos.</p>
            </div>
          </header>

          {renderContent()}
        </main>
      </div>
    </div>
  );
}
