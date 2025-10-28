import React, { useState, useEffect } from 'react';
import '../styles/EditarPanelVisita.css';

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

function EditarPanelVisita() {
  const [welcome, setWelcome] = useState({ title: '', text: '' });
  const [chatbots, setChatbots] = useState([]);
  const [videos, setVideos] = useState([]);
  const [status, setStatus] = useState({ loading: true, error: null });

  // State for the new chatbot form
  const [newChatbot, setNewChatbot] = useState({ title: '', iframeUrl: '' });

  // State for the new video form
  const [newVideo, setNewVideo] = useState({ title: '', videoUrl: '' });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setStatus({ loading: true, error: null });
        const response = await fetch(`${API_BASE}/guest-panel`);
        if (!response.ok) {
          throw new Error('Error al cargar la configuración.');
        }
        const data = await response.json();
        setWelcome(data.welcome);
        setChatbots(data.chatbots.map(c => ({ ...c, id: c._id })));
        setVideos(data.videos.map(v => ({ ...v, id: v._id })));
      } catch (error) {
        setStatus({ loading: false, error: error.message });
      } finally {
        setStatus({ loading: false, error: null });
      }
    };
    fetchConfig();
  }, []);

  const handleWelcomeChange = (e) => {
    setWelcome({ ...welcome, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('No estás autenticado.');
      return;
    }

    try {
      const config = { welcome, chatbots, videos };
      const response = await fetch(`${API_BASE}/guest-panel/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Error al guardar la configuración.');
      }

      alert('Configuración guardada correctamente.');
    } catch (error) {
      alert(error.message);
    }
  };

  // Chatbot handlers
  const handleNewChatbotChange = (e) => {
    setNewChatbot({ ...newChatbot, [e.target.name]: e.target.value });
  };

  const handleAddChatbot = () => {
    if (newChatbot.title && newChatbot.iframeUrl) {
      setChatbots([...chatbots, { ...newChatbot, id: `new_${Date.now()}` }]);
      setNewChatbot({ title: '', iframeUrl: '' });
    }
  };

  const handleDeleteChatbot = (id) => {
    setChatbots(chatbots.filter(c => c.id !== id));
  };

  // Video handlers
  const handleNewVideoChange = (e) => {
    setNewVideo({ ...newVideo, [e.target.name]: e.target.value });
  };

  const handleAddVideo = () => {
    if (newVideo.title && newVideo.videoUrl) {
      setVideos([...videos, { ...newVideo, id: `new_${Date.now()}` }]);
      setNewVideo({ title: '', videoUrl: '' });
    }
  };

  const handleDeleteVideo = (id) => {
    setVideos(videos.filter(v => v.id !== id));
  };

  if (status.loading) {
    return <div>Cargando...</div>;
  }

  if (status.error) {
    return <div style={{ color: 'red' }}>Error: {status.error}</div>;
  }

  return (
    <div className="editar-panel-visita">
      <h2>Editar Panel de Visita</h2>

      <section className="card">
        <h3>Sección de Bienvenida</h3>
        <div className="form-group">
          <label>Título</label>
          <input
            type="text"
            name="title"
            value={welcome.title}
            onChange={handleWelcomeChange}
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label>Texto</label>
          <textarea
            name="text"
            value={welcome.text}
            onChange={handleWelcomeChange}
            className="form-control"
            rows="4"
          />
        </div>
      </section>

      <section className="card">
        <h3>Gestionar Chatbots</h3>
        <div className="item-list">
          {chatbots.map(chatbot => (
            <div key={chatbot.id} className="chatbot-item">
              <span>{chatbot.title}</span>
              <button onClick={() => handleDeleteChatbot(chatbot.id)} className="btn-delete">Eliminar</button>
            </div>
          ))}
        </div>
        <div className="add-item-form">
          <h4>Añadir nuevo chatbot</h4>
          <input
            type="text"
            name="title"
            placeholder="Título del chatbot"
            value={newChatbot.title}
            onChange={handleNewChatbotChange}
            className="form-control"
          />
          <input
            type="text"
            name="iframeUrl"
            placeholder="URL del iframe"
            value={newChatbot.iframeUrl}
            onChange={handleNewChatbotChange}
            className="form-control"
          />
          <button onClick={handleAddChatbot} className="btn-add">Añadir Chatbot</button>
        </div>
      </section>

      <section className="card">
        <h3>Gestionar Videos</h3>
        <ul className="item-list">
          {videos.map(video => (
            <li key={video.id}>
              <span>{video.title}</span>
              <button onClick={() => handleDeleteVideo(video.id)} className="btn-delete">Eliminar</button>
            </li>
          ))}
        </ul>
        <div className="add-item-form">
          <h4>Añadir nuevo video</h4>
          <input
            type="text"
            name="title"
            placeholder="Título del video"
            value={newVideo.title}
            onChange={handleNewVideoChange}
            className="form-control"
          />
          <input
            type="text"
            name="videoUrl"
            placeholder="URL del video (embed)"
            value={newVideo.videoUrl}
            onChange={handleNewVideoChange}
            className="form-control"
          />
          <button onClick={handleAddVideo} className="btn-add">Añadir Video</button>
        </div>
      </section>

      <button onClick={handleSave} className="btn-save">Guardar Cambios</button>
    </div>
  );
}

export default EditarPanelVisita;