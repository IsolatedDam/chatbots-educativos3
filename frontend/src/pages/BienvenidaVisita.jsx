import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css';
import '../styles/HeroSection.css';
import HeroSection from '../components/HeroSection';

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

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="green" className="bi bi-whatsapp" viewBox="0 0 16 16">
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
  </svg>
);

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
        <>
          <section className="card">
            <h3 className="card-title">{config.welcome.title}</h3>
            <p>{config.welcome.text}</p>
          </section>
          <HeroSection />
        </>
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
            <a href="https://wa.me/56226970116" target="_blank" rel="noopener noreferrer" className="nav-item">
              <span className="nav-ico"><WhatsAppIcon /></span>
              <span>WhatsApp</span>
            </a>
            
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
