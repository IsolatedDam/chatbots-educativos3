import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css';

/* ===== API base ===== */
const API_ROOT = (() => {
  const vite = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_ROOT : undefined;
  const cra  = typeof process !== 'undefined' ? process.env?.REACT_APP_API_ROOT : undefined;
  if (vite) return vite;
  if (cra)  return cra;
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:5000';
  }
  return 'https://chatbots-educativos3.onrender.com';
})();
const API_BASE = `${API_ROOT}/api`;

/* ===== IFRAME: usar SIEMPRE este source ===== */
const FIXED_EMBED_URL =
  'https://aipoweredchatbot-production.up.railway.app/chatbot/68d1694d375d7acbb68821ff?key=PDykle3B8BEfzdIjR8XN__jQ4UPgU6x-JjAKt_SdWAnYrFHslUNeZH5NHZgOAh2M';

export default function PanelAlumno() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState('perfil');

  // chatbots permitidos
  const [permitidos, setPermitidos] = useState([]);
  const [loadingCB, setLoadingCB] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  // UI state
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [frameHeight, setFrameHeight] = useState(560);
  const [expanded, setExpanded] = useState({}); // { [id]: true }

  /* ===== Montaje ===== */
  useEffect(() => {
    const raw = localStorage.getItem('usuario');
    if (raw) { try { setUsuario(JSON.parse(raw)); } catch {} }
    refetchUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refrescar al volver a la pestaña
  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refetchUsuario();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // refresca en cada cambio de sección
  useEffect(() => {
    if (seccion === 'perfil' || seccion === 'chatbots') refetchUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion]);

  // carga chatbots al entrar a la sección
  useEffect(() => {
    if (seccion === 'chatbots' && usuario?._id) fetchChatbotsPermitidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion, usuario?._id]);

  /* ===== Fetchers ===== */
  async function refetchUsuario() {
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }

      const res = await fetch(`${API_BASE}/alumnos/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/login');
        return;
      }
      if (!res.ok) return;

      const fresh = await res.json();
      setUsuario(fresh);
      localStorage.setItem('usuario', JSON.stringify(fresh));
    } catch { /* noop */ }
  }

  async function fetchChatbotsPermitidos() {
    setLoadingCB(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }

      const res = await fetch(`${API_BASE}/mis-chatbots-permitidos`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        navigate('/login');
        return;
      }

      const data = await res.json();
      const list = (Array.isArray(data) ? data : [])
        .filter(x => x && x.chatbotId && x.activo !== false)
        .map(x => ({
          _id: String(x.chatbotId),
          nombre: x.nombre || 'Chatbot',
          categoria: x.categoria || 'General',
          // ⬇️ usar SIEMPRE el mismo iframe que pediste:
          embedUrl: FIXED_EMBED_URL,
          cursosCount: Number(x.cursosCount || 0),
        }))
        .sort((a,b)=> (a.categoria||'').localeCompare(b.categoria||'', 'es')
                      || (a.nombre||'').localeCompare(b.nombre||'', 'es'));

      setPermitidos(list);
      setLastLoadedAt(new Date());
    } catch {
      setPermitidos([]);
    } finally {
      setLoadingCB(false);
    }
  }

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  /* ===== Helpers visuales (riesgo) ===== */
  const { riesgo } = useMemo(() => {
    if (!usuario) return { riesgo: '' };
    if (usuario.habilitado === false) return { riesgo: 'rojo' };
    let r = String(usuario.riesgo || usuario.color_riesgo || usuario.riesgo_color || '').toLowerCase();
    if (!r && usuario.suscripcionVenceEl) {
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const end = new Date(usuario.suscripcionVenceEl); end.setHours(0,0,0,0);
      if (!Number.isNaN(end.getTime())) {
        const diff = Math.floor((end - hoy) / 86400000);
        r = diff < 0 ? 'rojo' : diff <= 10 ? 'amarillo' : 'verde';
      }
    }
    if (!['verde','amarillo','rojo'].includes(r)) r = '';
    return { riesgo: r };
  }, [usuario]);

  const estadoCuentaTexto = (riesgo === 'rojo' || usuario?.habilitado === false) ? 'Suspendido' : 'Habilitado';
  const riskClass =
    riesgo === 'verde' ? 'badge badge-verde' :
    riesgo === 'amarillo' ? 'badge badge-amarillo' :
    riesgo === 'rojo' ? 'badge badge-rojo' : 'badge';

  /* ===== Agrupar chatbots por categoría ===== */
  const grupos = useMemo(() => {
    const map = new Map();
    for (const cb of permitidos) {
      const k = cb.categoria || 'General';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(cb);
    }
    return Array.from(map.entries())
      .sort((a,b)=> a[0].localeCompare(b[0], 'es'));
  }, [permitidos]);

  const toggleExpand = (id) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  /* ===== UI ===== */
  return (
    <div className="al-theme">
      <div className="al-layout">
        {/* Sidebar */}
        <aside className="al-sidebar">
          <div className="brand">
            <div className="logo">🤖</div>
            <div className="brand-text">
              <span className="brand-top">Campus</span>
              <span className="brand-bottom">Chatbots</span>
            </div>
          </div>

          <div className="user-card">
            <img src="/avatar.png" alt="Perfil" className="avatar" />
            <div className="user-info">
              <div className="user-name">{usuario?.nombre} {usuario?.apellido}</div>
              <div className="user-doc">{usuario?.tipo_documento} {usuario?.numero_documento}</div>
            </div>
          </div>

          <nav className="al-nav">
            <button className={`nav-item ${seccion === 'perfil' ? 'active' : ''}`} onClick={() => setSeccion('perfil')}>
              <span className="nav-ico">👤</span><span>Perfil</span>
            </button>
            <button className={`nav-item ${seccion === 'chatbots' ? 'active' : ''}`} onClick={() => setSeccion('chatbots')}>
              <span className="nav-ico">💬</span><span>Chatbots</span>
            </button>
            <button className={`nav-item ${seccion === 'otros' ? 'active' : ''}`} onClick={() => setSeccion('otros')}>
              <span className="nav-ico">⚙️</span><span>Otras opciones</span>
            </button>
          </nav>

          <button className="btn btn-logout" onClick={cerrarSesion}>Cerrar sesión</button>
        </aside>

        {/* Main */}
        <main className="al-main">
          <header className="al-header">
            <div className="titles">
              <h1>Panel del Alumno</h1>
              <p className="subtitle">Tu información personal, académica y accesos.</p>
            </div>
          </header>

          {seccion === 'perfil' && usuario && (
            <div className="cards-grid">
              <section className="card">
                <h3 className="card-title">Información Personal</h3>
                <div className="kv-grid">
                  <div className="kv"><span className="k">Nombre</span><span className="v">{usuario.nombre} {usuario.apellido}</span></div>
                  <div className="kv"><span className="k">Documento</span><span className="v">{usuario.tipo_documento} {usuario.numero_documento}</span></div>
                  <div className="kv"><span className="k">Jornada</span><span className="v">{usuario.jornada}</span></div>
                  <div className="kv"><span className="k">Semestre</span><span className="v">{usuario.semestre}</span></div>
                </div>
              </section>

              <section className="card">
                <h3 className="card-title">Información de Contacto</h3>
                <div className="kv-grid">
                  <div className="kv"><span className="k">Correo</span><span className="v">{usuario.correo}</span></div>
                  <div className="kv"><span className="k">Teléfono</span><span className="v">{usuario.telefono || 'No registrado'}</span></div>
                </div>
              </section>

              <section className="card span-2">
                <h3 className="card-title">Información Académica</h3>
                <div className="kv-grid">
                  <div className="kv">
                    <span className="k">Estado de cuenta</span>
                    <span className={`v ${estadoCuentaTexto === 'Suspendido' ? 'status-bad' : 'status-ok'}`}>{estadoCuentaTexto}</span>
                  </div>
                  <div className="kv">
                    <span className="k">Color de riesgo</span>
                    <span className="v"><span className={riskClass}>{(riesgo || '—').toUpperCase()}</span></span>
                  </div>
                </div>
              </section>
            </div>
          )}

          {seccion === 'chatbots' && (
            <section className="card">
              <div className="card-head">
                <h3 className="card-title">Chatbots Asignados</h3>

                <div className="cb-toolbar">
                  <div className="cb-left">
                    <button className="btn btn-primary" onClick={fetchChatbotsPermitidos} title="Recargar">⟳ Recargar</button>
                    <div className="divider" />
                    <button className={`btn ${viewMode==='grid' ? 'btn-active' : 'btn-ghost'}`} onClick={() => setViewMode('grid')} title="Vista de tarjetas">⬚ Grid</button>
                    <button className={`btn ${viewMode==='list' ? 'btn-active' : 'btn-ghost'}`} onClick={() => setViewMode('list')} title="Vista de lista">☰ Lista</button>
                  </div>

                  <div className="cb-right">
                    <label className="slider-label">
                      Alto del chat <span className="mono">{frameHeight}px</span>
                      <input type="range" min="320" max="720" step="20" value={frameHeight} onChange={(e)=>setFrameHeight(Number(e.target.value))}/>
                    </label>
                    {lastLoadedAt && <span className="hint small">Actualizado: {lastLoadedAt.toLocaleTimeString()}</span>}
                  </div>
                </div>
              </div>

              {loadingCB ? (
                <div className={`cb-groups ${viewMode}`}>
                  {[1,2].map(g => (
                    <div className="cb-group" key={g}>
                      <div className="cb-group-title skeleton" style={{width:180}} />
                      <div className={`cb-cards ${viewMode} one`}>
                        {[1].map(i => <div className="cb-card skeleton" key={i} />)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (permitidos.length ? (
                <div className={`cb-groups ${viewMode}`}>
                  {grupos.map(([categoria, items]) => (
                    <div className="cb-group" key={categoria}>
                      <div className="cb-group-title">
                        {categoria} <span className="chip">{items.length}</span>
                      </div>

                      <div className={`cb-cards ${viewMode} ${items.length >= 2 ? 'two' : 'one'}`}>
                        {items.map(cb => {
                          const isExpanded = !!expanded[cb._id];
                          const h = isExpanded ? Math.max(frameHeight + 220, 540) : frameHeight;
                          return (
                            <div className={`cb-card ${isExpanded ? 'is-expanded' : ''}`} key={cb._id}>
                              <div className="cb-card-head">
                                <div className="cb-card-meta">
                                  <div className="cb-avatar">🧠</div>
                                  <div className="cb-info">
                                    <div className="cb-name">{cb.nombre}</div>
                                    <div className="cb-sub">
                                      <span className="chip">{cb.categoria}</span>
                                      <span className="sep">•</span>
                                      <span className="muted">{cb.cursosCount} curso{cb.cursosCount===1?'':'s'}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="cb-actions">
                                  <a className="btn btn-ghost" href={FIXED_EMBED_URL} target="_blank" rel="noreferrer">↗ Abrir</a>
                                  <button className="btn btn-ghost" onClick={() => toggleExpand(cb._id)}>
                                    {isExpanded ? '⤢ Contraer' : '⤢ Pantalla completa'}
                                  </button>
                                </div>
                              </div>

                              <div className="cb-frame-wrap" style={{height: h}}>
                                <iframe
                                  src={FIXED_EMBED_URL}
                                  title={`Chatbot ${cb.nombre}`}
                                  width="100%"
                                  height="100%"
                                  frameBorder="0"
                                  style={{ borderRadius: 12 }}
                                  allow="clipboard-write; microphone; camera"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty">No tienes chatbots asignados aún.</p>
              ))}
            </section>
          )}

          {seccion === 'otros' && (
            <section className="card">
              <h3 className="card-title">Otras opciones</h3>
              <p className="empty">Aquí irán más herramientas o configuraciones.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}