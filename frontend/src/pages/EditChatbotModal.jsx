
import React, { useState, useEffect } from "react";
import "../styles/EditChatbotModal.css";

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

export default function EditChatbotModal({ chatbot, onClose, onSave }) {
  const [nombre, setNombre] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [videos, setVideos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (chatbot) {
      setNombre(chatbot.nombre || "");
      setIframeUrl(chatbot.iframeUrl || "");
      setVideos(chatbot.videos || [{ nombre: "", url: "" }]);
    }
  }, [chatbot]);

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const videosFiltrados = videos.filter(v => v.nombre.trim() && v.url.trim());
      await onSave({ ...chatbot, nombre, iframeUrl, videos: videosFiltrados });
      onClose();
    } catch (error) {
      console.error("Error al guardar el chatbot:", error);
      alert("No se pudo guardar el chatbot. " + (error.message || ""));
    } finally {
      setGuardando(false);
    }
  };

  const agregarVideo = () => {
    setVideos([...videos, { nombre: "", url: "" }]);
  };

  const quitarVideo = (index) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const actualizarVideo = (index, campo, valor) => {
    const nuevosVideos = [...videos];
    nuevosVideos[index][campo] = valor;
    setVideos(nuevosVideos);
  };

  if (!chatbot) return null;

  return (
    <div className="edit-modal-overlay">
      <div className="edit-modal-content">
        <h3>Editando: {chatbot.nombre}</h3>

        <div className="form-group">
          <label>Nombre del chatbot</label>
          <input
            type="text"
            className="cb-input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>URL del Iframe</label>
          <input
            type="text"
            className="cb-input"
            value={iframeUrl}
            onChange={(e) => setIframeUrl(e.target.value)}
          />
        </div>

        <div className="videos-input-section">
          <h4>Videos asociados:</h4>
          {videos.map((video, index) => (
            <div key={index} className="video-input-row">
              <input
                className="cb-input"
                placeholder="Nombre del video"
                value={video.nombre}
                onChange={(e) => actualizarVideo(index, 'nombre', e.target.value)}
              />
              <input
                className="cb-input"
                placeholder="URL del video (YouTube)"
                value={video.url}
                onChange={(e) => actualizarVideo(index, 'url', e.target.value)}
              />
              <button
                className="btn btn-danger btn-sm"
                onClick={() => quitarVideo(index)}
              >
                Quitar
              </button>
            </div>
          ))}
          <button className="btn btn-secondary" onClick={agregarVideo}>
            Agregar video
          </button>
        </div>

        <div className="edit-modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
