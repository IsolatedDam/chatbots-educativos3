import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css';

const API_BASE = "https://chatbots-educativos3.onrender.com/api";

export default function PanelAlumno() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState('perfil');

  useEffect(() => {
    const datos = localStorage.getItem('usuario');
    if (datos) { try { setUsuario(JSON.parse(datos)); } catch {} }
    refetchUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && refetchUsuario();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (seccion === 'perfil' || seccion === 'chatbots') refetchUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seccion]);

  async function refetchUsuario() {
    try {
      const raw = localStorage.getItem('usuario');
      const token = localStorage.getItem('token');
      if (!raw || !token) return;
      const u = JSON.parse(raw);
      if (!u?._id) return;

      let res = await fetch(`${API_BASE}/alumnos/${u._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const tryMe = await fetch(`${API_BASE}/alumnos/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (tryMe.ok) res = tryMe; else return;
      }
      const fresh = await res.json();
      const merged = { ...u, ...fresh };
      setUsuario(merged);
      localStorage.setItem('usuario', JSON.stringify(merged));
    } catch {}
  }

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  // ===== Helpers de riesgo (solo pill) =====
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

  return (
    <div className="al-theme">{/* <- wrapper que aplica la paleta y el fondo */}
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
            {/* Botón "Actualizar" eliminado */}
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

          {seccion === 'chatbots' && usuario && (
            <section className="card">
              <div className="card-head">
                <h3 className="card-title">Chatbots Asignados</h3>
                <span className="hint">Si no ves ninguno, consulta con tu profesor.</span>
              </div>
              {usuario.chatbot?.length ? (
                <div className="ifr-grid">
                  {usuario.chatbot.map((cb, i) => (
                    <div className="iframe-wrap" key={i}>
                      <iframe src={cb} title={`Chatbot ${i}`} width="100%" height="320" style={{ border: '0' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty">No tienes chatbots asignados aún.</p>
              )}
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