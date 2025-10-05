import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css';
import { API_BASE } from '../utils/apiConfig';

function getYouTubeID(url) {
  if (!url) return '';
  const arr = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  return (arr[2] !== undefined) ? arr[2].split(/[^0-9a-z_\-]/i)[0] : arr[0];
}

export default function PanelAlumno() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState('perfil');

  // Items permitidos (chatbots y videos)
  const [permitidos, setPermitidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState(null);

  // Estado de acordeón por categoría
  const [expandedCat, setExpandedCat] = useState({}); // { [categoria]: true }

  // Altura fija razonable para el iframe
  const FRAME_HEIGHT = 900;

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

  // Carga todo al tener usuario
  useEffect(() => {
    if (usuario?._id) fetchPermitidos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?._id]);

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

  async function fetchPermitidos() {
    setLoading(true);
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
          embedUrl: x.iframeUrl,
          youtubeUrl: x.youtubeUrl,
        }))
        .sort((a,b)=> (a.categoria||'').localeCompare(b.categoria||'', 'es')
                      || (a.nombre||'').localeCompare(b.nombre||'', 'es'));

      setPermitidos(list);
      setLastLoadedAt(new Date());
    } catch {
      setPermitidos([]);
    } finally {
      setLoading(false);
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

  /* ===== Listas Derivadas ===== */
  const chatbots = useMemo(() => permitidos.filter(p => p.embedUrl), [permitidos]);
  const videos = useMemo(() => permitidos.filter(p => p.youtubeUrl), [permitidos]);

  /* ===== Agrupar por categoría ===== */
  const gruposChatbots = useMemo(() => {
    const map = new Map();
    for (const cb of chatbots) {
      const k = cb.categoria || 'General';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(cb);
    }
    return Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0], 'es'));
  }, [chatbots]);

  const gruposVideos = useMemo(() => {
    const map = new Map();
    for (const v of videos) {
      const k = v.categoria || 'General';
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(v);
    }
    return Array.from(map.entries()).sort((a,b)=> a[0].localeCompare(b[0], 'es'));
  }, [videos]);

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
                {lastLoadedAt && <span className="hint small">Actualizado: {lastLoadedAt.toLocaleTimeString()}</span>}
              </div>

              {loading ? (
                <p className="empty">Cargando chatbots…</p>
              ) : (gruposChatbots.length ? (
                <div className="cb-groups list">
                  {gruposChatbots.map(([categoria, items]) => {
                    const open = !!expandedCat[categoria];
                    return (
                      <div className="cb-group" key={categoria} style={{marginBottom:16}}>
                        {/* Encabezado de categoría */}
                        <div className="cb-group-title" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                          <div>
                            <strong>{categoria}</strong> <span className="chip">{items.length}</span>
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
                            opacity: open ? 1 : 0.2
                          }}
                        >
                          {open && (
                            items[0]?.embedUrl ? (
                              <div className="cb-frame-wrap" style={{height: FRAME_HEIGHT}}>
                                <iframe
                                  src={items[0].embedUrl}
                                  width="100%"
                                  height="900px"
                                  frameBorder="0"
                                  allow="clipboard-write; microphone; camera"
                                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                />
                              </div>
                            ) : (
                              <div className="empty" style={{marginTop: 12}}>
                                Este chatbot no tiene un iframe configurado.
                              </div>
                            )
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
              <h3 className="card-title">Videos Educativos</h3>
              
              {loading ? (
                <p className="empty">Cargando videos…</p>
              ) : (gruposVideos.length ? (
                <div className="cb-groups list">
                  {gruposVideos.map(([categoria, items]) => (
                    <div className="cb-group" key={categoria} style={{marginBottom: 24}}>
                      <div className="cb-group-title">
                        <strong>{categoria}</strong> <span className="chip">{items.length}</span>
                      </div>
                      {items.map(video => (
                        <div key={video._id} style={{marginTop: 16}}>
                          <h4 style={{marginBottom: 8}}>{video.nombre}</h4>
                          <div style={{position: 'relative', paddingTop: '56.25%'}}>
                            <iframe
                              style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
                              src={`https://www.youtube.com/embed/${getYouTubeID(video.youtubeUrl)}`}
                              title={video.nombre}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty">No tienes videos asignados aún.</p>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}