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

  // Estado de acordeón por categoría
  const [expandedCat, setExpandedCat] = useState({}); // { [categoria]: true }

  // Altura fija razonable para el iframe
  const FRAME_HEIGHT = 560;

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
          embedUrl: FIXED_EMBED_URL, // fijo por requisitos
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

  // Etiqueta dinámica según riesgo
  const deudaLabel =
    riesgo === 'amarillo' ? 'Suspensión en 10 días' : 'Deudas al día';

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

  const toggleCat = (categoria) =>
    setExpandedCat(s => ({ ...s, [categoria]: !s[categoria] }));

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
                <h3 className="card-title">Información de deuda</h3>
                <div className="kv-grid">
                  <div className="kv">
                    <span className="k">Estado de cuenta</span>
                    <span className={`v ${estadoCuentaTexto === 'Suspendido' ? 'status-bad' : 'status-ok'}`}>{estadoCuentaTexto}</span>
                  </div>
                  <div className="kv">
                    <span className="k">{deudaLabel}</span>
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
                {/* ❌ Se removieron: Recargar, Grid/List, Slider de altura, Pantalla completa */}
                {lastLoadedAt && <span className="hint small">Actualizado: {lastLoadedAt.toLocaleTimeString()}</span>}
              </div>

              {loadingCB ? (
                <p className="empty">Cargando chatbots…</p>
              ) : (grupos.length ? (
                <div className="cb-groups list">
                  {grupos.map(([categoria, items]) => {
                    const open = !!expandedCat[categoria];
                    return (
                      <div className="cb-group" key={categoria} style={{marginBottom:16}}>
                        {/* Encabezado de categoría */}
                        <div className="cb-group-title" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                          <div>
                            <strong>{categoria}</strong> <span className="chip">{items.length}</span>
                            {/* Muestra los nombres de chatbots asignados como subtítulo */}
                            <div className="muted small" style={{marginTop:4}}>
                              {items.map(x => x.nombre).join(' • ')}
                            </div>
                          </div>
                          <button className="btn btn-primary" onClick={() => toggleCat(categoria)}>
                            {open ? 'Cerrar' : 'Acceder'}
                          </button>
                        </div>

                        {/* Contenido desplegable */}
                        <div
                          className={`cb-accordion ${open ? 'open' : ''}`}
                          style={{
                            overflow: 'hidden',
                            transition: 'max-height 300ms ease, opacity 200ms ease',
                            maxHeight: open ? FRAME_HEIGHT + 40 : 0,
                            opacity: open ? 1 : 0.2,
                            borderRadius: 12
                          }}
                        >
                          {open && (
                            <div className="cb-frame-wrap" style={{height: FRAME_HEIGHT, marginTop:12}}>
                              <iframe
                                src={FIXED_EMBED_URL}
                                title={`Chatbot ${categoria}`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ borderRadius: 12 }}
                                allow="clipboard-write; microphone; camera"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
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