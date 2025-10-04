import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/AccesoChatbots.css";

/* ========= API base ========= */
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
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );

  /* ====== state ====== */
  const [cats, setCats] = useState([]);     // [{nombre, count}]
  const [selCat, setSelCat] = useState(""); // nombre de la categoría seleccionada
  const [bots, setBots] = useState([]);     // chatbots de esa categoría
  const [selectedBot, setSelectedBot] = useState(null); // chatbot seleccionado para ver

  const [cargandoCats, setCargandoCats] = useState(false);
  const [cargandoBots, setCargandoBots] = useState(false);

  const [nuevaCat, setNuevaCat] = useState("");
  const [creandoCat, setCreandoCat] = useState(false);

  const [nuevoBot, setNuevoBot] = useState("");
  const [iframeUrl, setIframeUrl] = useState(""); // Estado para la URL del iframe
  const [creandoBot, setCreandoBot] = useState(false);

  const didInitRef = useRef(false);

  const jsonSeguro = async (res) => {
    const txt = await res.text().catch(() => "");
    try { return txt ? JSON.parse(txt) : null; } catch { return null; }
  };

  /* ====== API ====== */
  async function cargarCategorias() {
    setCargandoCats(true);
    try {
      const r = await fetch(`${API_BASE}/chatbots/categories`, { headers });
      if (r.ok) {
        const data = (await jsonSeguro(r)) || [];
        const list = (Array.isArray(data) ? data : [])
          .map(x => ({ nombre: x.categoria, count: x.count }))
          .filter(x => x.nombre);

        setCats(list);
        if (!selCat && list.length) setSelCat(list[0].nombre);
        return;
      }

      const r2 = await fetch(`${API_BASE}/chatbots`, { headers });
      const data = r2.ok ? (await jsonSeguro(r2)) || [] : [];
      const map = new Map();
      (Array.isArray(data) ? data : []).forEach(b => {
        const c = b.categoria || "Sin categoría";
        map.set(c, (map.get(c) || 0) + 1);
      });
      const list = Array.from(map.entries()).map(([nombre, count]) => ({ nombre, count }));
      setCats(list);
      if (!selCat && list.length) setSelCat(list[0].nombre);
    } catch (e) {
      console.error("cargarCategorias error:", e);
      setCats([]);
    } finally {
      setCargandoCats(false);
    }
  }

  async function cargarBots(catName) {
    if (!catName) { setBots([]); return; }
    setCargandoBots(true);
    try {
      const url = `${API_BASE}/chatbots?categoria=${encodeURIComponent(catName)}`;
      const r = await fetch(url, { headers });
      const data = r.ok ? (await jsonSeguro(r)) || [] : [];
      setBots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("cargarBots error:", e);
      setBots([]);
    } finally {
      setCargandoBots(false);
    }
  }

  /* ====== init ====== */
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    cargarCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (selCat) cargarBots(selCat); }, [selCat]);

  /* ====== acciones ====== */
  async function crearCategoria() {
    const nombre = (nuevaCat || "").trim();
    if (!nombre) return;
    setCreandoCat(true);
    try {
      const res = await fetch(`${API_BASE}/chatbot-categorias`, {
        method: "POST", headers, body: JSON.stringify({ nombre }),
      });
      if (!res.ok && res.status !== 409) {
        const txt = await res.text().catch(()=> "");
        console.warn("Crear categoría no-OK:", txt);
      }
      setCats(prev => prev.find(c => c.nombre.toLowerCase() === nombre.toLowerCase())
        ? prev
        : [{ nombre, count: 0 }, ...prev]);
      setSelCat(nombre);
      setNuevaCat("");
      await cargarCategorias();
    } catch (e) {
      alert("No se pudo crear la categoría");
    } finally {
      setCreandoCat(false);
    }
  }

  async function crearChatbot() {
    const nombre = (nuevoBot || "").trim();
    const categoria = (selCat || "").trim();
    if (!nombre || !categoria) return;
    setCreandoBot(true);
    try {
      const res = await fetch(`${API_BASE}/chatbots`, {
        method: "POST", headers, body: JSON.stringify({ nombre, categoria, iframeUrl }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=> "");
        throw new Error(txt || "No se pudo crear el chatbot");
      }
      setNuevoBot("");
      setIframeUrl("");
      await Promise.all([cargarBots(categoria), cargarCategorias()]);
    } catch (e) {
      alert(e.message || "No se pudo crear el chatbot");
    } finally {
      setCreandoBot(false);
    }
  }

  async function eliminarChatbot(id) {
    if (!id) return;
    if (!window.confirm("¿Eliminar este chatbot? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`${API_BASE}/chatbots/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=> "");
        throw new Error(txt || "No se pudo eliminar el chatbot");
      }
      await Promise.all([cargarBots(selCat), cargarCategorias()]);
    } catch (e) {
      alert(e.message || "No se pudo eliminar el chatbot");
    }
  }

  async function eliminarCategoria(nombre) {
    if (!nombre) return;
    if (!window.confirm(`¿Eliminar la categoría "${nombre}"?\nSolo se permite eliminar categorías vacías.`)) return;
    try {
      const res = await fetch(`${API_BASE}/chatbot-categorias/${encodeURIComponent(nombre)}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const body = await jsonSeguro(res);
        const msg = (body && (body.msg || body.error)) || "No se pudo eliminar la categoría";
        throw new Error(msg);
      }
      await cargarCategorias();
      if (selCat === nombre) {
        const next = cats.find(c => c.nombre !== nombre)?.nombre || "";
        setSelCat(next);
        if (next) await cargarBots(next); else setBots([]);
      }
    } catch (e) {
      alert(e.message || "No se pudo eliminar la categoría");
    }
  }

  /* ====== helpers ====== */
  function creadoPor(b) {
    const u = b.createdBy || b.creadoPor || {};
    const parts = [u.nombre, u.apellido, u.apellidos, u.name].filter(Boolean);
    return parts.length ? parts.join(" ") : (u.correo || u.email || u.username || "—");
  }
  const fecha = (v) => {
    if (!v) return "—";
    const d = new Date(v);
    return isNaN(d) ? "—" : d.toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  };

  // Si un chatbot está seleccionado, muestra el iframe
  if (selectedBot) {
    return (
      <div className="cb-simple-page">
        <button className="btn btn-secondary mb-3" onClick={() => setSelectedBot(null)}>
          &larr; Volver a la lista
        </button>
        <h3 className="cb-title">{selectedBot.nombre}</h3>
        {selectedBot.iframeUrl ? (
          <div className="iframe-container">
            <iframe
              src={selectedBot.iframeUrl}
              title={selectedBot.nombre}
              width="100%"
              height="600px"
              frameBorder="0"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="cb-empty">Este chatbot no tiene un iframe configurado.</div>
        )}
      </div>
    );
  }

  return (
    <div className="cb-simple-page">
      <h3 className="cb-title">Acceso a chatbots</h3>

      {/* ARRIBA: crear categoría */} 
      <section className="cb-card">
        <div className="cb-card-title">Crear categoría</div>
        <div className="cb-row">
          <input
            className="cb-input"
            placeholder="Nueva categoría (Ej: Matemáticas)"
            value={nuevaCat}
            onChange={(e)=>setNuevaCat(e.target.value)}
            onKeyDown={(e)=>{ if(e.key==="Enter") crearCategoria(); }}
          />
          <button
            className="btn btn-primary"
            onClick={crearCategoria}
            disabled={!nuevaCat.trim() || creandoCat}
          >
            {creandoCat ? "Creando…" : "Crear"}
          </button>
        </div>
      </section>

      {/* ABAJO: dos columnas */} 
      <div className="cb-grid">
        {/* Izquierda: categorías */} 
        <aside className="cb-card">
          <div className="cb-card-title">Categorías</div>
          <div className="cb-catlist">
            {cargandoCats ? (
              <div className="cb-empty">Cargando…</div>
            ) : cats.length ? (
              cats.map(c => (
                <div key={c.nombre} className={`cb-catitem ${selCat === c.nombre ? "is-active" : ""}`}>
                  <button
                    className="cb-catbtn"
                    onClick={()=>setSelCat(c.nombre)}
                    title={`Ver ${c.nombre}`}
                  >
                    <span className="cb-catname">{c.nombre}</span>
                    <span className="cb-badge">{c.count ?? 0}</span>
                  </button>
                  <button
                    className="btn btn-ghost cb-catitem-delete"
                    title="Eliminar categoría"
                    onClick={(e) => { e.stopPropagation(); eliminarCategoria(c.nombre); }}
                    disabled={(c.count ?? 0) > 0}
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div className="cb-empty">Aún no hay categorías.</div>
            )}
          </div>
          <div className="cb-hint">Solo puedes eliminar categorías vacías.</div>
        </aside>

        {/* Derecha: crear chatbot + tabla */} 
        <main className="cb-card">
          <div className="cb-card-title">
            {selCat ? `Chatbots — ${selCat}` : "Selecciona una categoría"}
          </div>

          {selCat && (
            <>
              <div className="cb-row">
                <input
                  className="cb-input"
                  placeholder="Nombre del chatbot (Ej: Matemática I)"
                  value={nuevoBot}
                  onChange={(e)=>setNuevoBot(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==="Enter") crearChatbot(); }}
                />
                <input
                  className="cb-input"
                  placeholder="URL del Iframe (opcional)"
                  value={iframeUrl}
                  onChange={(e) => setIframeUrl(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==="Enter") crearChatbot(); }}
                />
                <button
                  className="btn btn-primary"
                  onClick={crearChatbot}
                  disabled={!nuevoBot.trim() || creandoBot}
                >
                  {creandoBot ? "Creando…" : "Crear chatbot"}
                </button>
              </div>

              <div className="cb-tablewrap">
                <table className="cb-table">
                  <colgroup>
                    <col style={{width:"40%"}} />
                    <col style={{width:"25%"}} />
                    <col style={{width:"25%"}} />
                    <col style={{width:"10%"}} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Creado por</th>
                      <th>Creado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cargandoBots ? (
                      <tr><td colSpan="99">Cargando…</td></tr>
                    ) : bots.length ? (
                      bots.map(b => (
                        <tr key={b._id || b.id}>
                          <td className="cb-ellipsis">
                            <button className="btn btn-link" onClick={() => setSelectedBot(b)}>
                              {b.nombre || "—"}
                            </button>
                          </td>
                          <td>{creadoPor(b)}</td>
                          <td>{fecha(b.createdAt)}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              title="Eliminar chatbot"
                              onClick={() => eliminarChatbot(b._id || b.id)}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="99">Sin chatbots en esta categoría.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
