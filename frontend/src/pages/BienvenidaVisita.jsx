import { useEffect, useState } from 'react';
import '../styles/BienvenidaVisita.css';

function BienvenidaVisita() {
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCargando(false);
    }, 7000); // duración del "loading"
    return () => clearTimeout(timer);
  }, []);

  if (cargando) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p className="loading-text">
          Bienvenido a Masoterapia, te estamos redirigiendo a nuestra página, por favor espere...
        </p>
      </div>
    );
  }

  return (
    <div className="bienvenida-container">
      <h1>¡Bienvenido a Masoterapia!</h1>
      <h3>🤖 Chatbot de prueba</h3>
      <p>Hola, soy un asistente virtual. ¿En qué puedo ayudarte hoy?</p>

      {/* Chatbot embebido */}
      <div className="chatbot-frame">
        <iframe
          width="100%"
          style={{ minHeight: '700px', border: 'none' }}
          src="https://hectbajotu.customgpt-agents.com"
          title="Chatbot Masoterapia"
        ></iframe>
      </div>

      <hr />

      {['Historia', 'Matemáticas', 'Biología', 'Lenguaje'].map((curso) => (
        <div className="curso-box" key={curso}>
          <h4>{curso}</h4>
        </div>
      ))}
    </div>
  );
}

export default BienvenidaVisita;