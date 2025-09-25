import React, { useCallback, useEffect, useMemo, useState } from "react";
import "../styles/AccesoChatbots.css";

/* ===== API local/remota (mismo patrón que usas en otras páginas) ===== */
const API_ROOT = (() => {
  const vite = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_ROOT : undefined;
  const cra  = typeof process !== "undefined" ? process.env?.REACT_APP_API_ROOT : undefined;
  if (vite) return vite;
  if (cra)  return cra;
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:5000";
  }
  return "https://chatbots-educativos3.onrender.com";
})();
const API_BASE = `${API_ROOT}/api`;

export default function AccesoChatbots() {
  const token = localStorage.getItem("token");

  const [chatbots, setChatbots] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName]         = useState("");

  const authHdrs = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );

  const readErr = async (res) => {
    const txt = await res.text().catch(() => "");
    try { const j = JSON.parse(txt); return j?.msg || txt || `HTTP ${res.status}`; }
    catch { return txt || `HTTP ${res.status}`; }
  };

  const fetchChatbots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chatbots`, { headers: authHdrs });
      if (!res.ok && res.status !== 404 && res.status !== 204) throw new Error(await readErr(res));
      const data = res.ok ? await res.json().catch(() => []) : [];
      setChatbots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("fetchChatbots", e);
      setChatbots([]);
    } finally {
      setLoading(false);
    }
  }, [authHdrs]);

  useEffect(() => { fetchChatbots(); }, [fetchChatbots]);

  async function crearChatbot() {
    const nombre = (name || "").trim();
    if (!nombre) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/chatbots`, {
        method: "POST",
        headers: authHdrs,
        body: JSON.stringify({ nombre }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      setName("");
      await fetchChatbots();
    } catch (e) {
      alert(e.message || "No se pudo crear el chatbot");
    } finally {
      setCreating(false);
    }
  }

  const fmtFecha = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    if (isNaN(d)) return "—";
    return d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
    // ajusta a tu locale preferido
  };

  return (
    <div className="ab-page">
      <h3 className="ab-heading">Acceso a chatbots</h3>

      {/* Crear chatbot */}
      <div className="ab-card">
        <div className="ab-create">
          <label className="ab-field">
            <span>Nombre del chatbot</span>
            <input
              className="ab-input"
              placeholder="Ej: Asistente Matemática I"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e)=>{ if(e.key === "Enter") crearChatbot(); }}
            />
          </label>
          <button
            className="btn btn-primary"
            disabled={!name.trim() || creating}
            onClick={crearChatbot}
            title={!name.trim() ? "Escribe un nombre" : "Crear chatbot"}
          >
            {creating ? "Creando…" : "Crear chatbot"}
          </button>
        </div>
      </div>

      {/* IMPORTANTE: Se eliminó el bloque de “Chatbot” y “Ámbito” */}

      {/* Listado */}
      <div className="ab-table-wrap">
        <table className="ab-table">
          <colgroup>
            <col className="ab-col-name" />
            <col className="ab-col-id" />
            <col className="ab-col-date" />
          </colgroup>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>ID</th>
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="99">Cargando…</td></tr>
            ) : chatbots.length ? (
              chatbots.map((cb) => (
                <tr key={cb._id}>
                  <td className="ab-ellipsis" title={cb.nombre || ""}>{cb.nombre || "—"}</td>
                  <td className="ab-mono">{cb._id}</td>
                  <td>{fmtFecha(cb.createdAt || cb.creado)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="99">Aún no hay chatbots creados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}