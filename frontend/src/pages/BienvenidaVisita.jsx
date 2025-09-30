import { useEffect, useState } from 'react';
import '../styles/BienvenidaVisita.css';

const CHATBOT_SRC =
  'https://aipoweredchatbot-production.up.railway.app/chatbot/68d1694d375d7acbb68821ff?key=PDykle3B8BEfzdIjR8XN__jQ4UPgU6x-JjAKt_SdWAnYrFHslUNeZH5NHZgOAh2M';

export default function BienvenidaVisita() {
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setCargando(false), 7000); // mantiene tu loading actual
    return () => clearTimeout(t);
  }, []);

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

  return (
    <div className="visit-wrap">
      <header className="visit-hero">
        <div className="visit-brand">🤖</div>
        <h1>Masoterapia — Chat de Prueba</h1>
        <p>Habla con nuestro asistente y resuelve tus dudas al instante.</p>
      </header>

      <section className="chat-card">
        <div className="chat-toolbar">
          <div className="chat-title">
            <span className="dot" /> Asistente AI de Masoterapia
          </div>
          <a
            className="chat-open"
            href={CHATBOT_SRC}
            target="_blank"
            rel="noreferrer"
          >
            Abrir en pestaña nueva ↗
          </a>
        </div>

        <div className="iframe-wrap">
          <iframe
            src={CHATBOT_SRC}
            title="Chatbot de prueba — Masoterapia"
            frameBorder="0"
            allow="clipboard-write; microphone"
          />
        </div>
      </section>

      <footer className="visit-foot">
        <small>© {new Date().getFullYear()} Masoterapia. Todos los derechos reservados.</small>
      </footer>
    </div>
  );
}