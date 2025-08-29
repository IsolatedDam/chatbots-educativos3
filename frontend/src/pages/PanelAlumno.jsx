import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css';

const API_BASE = "https://chatbots-educativos3.onrender.com/api";

function PanelAlumno() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState('perfil');

  // Lee localStorage + primer fetch al back
  useEffect(() => {
    const datos = localStorage.getItem('usuario');
    if (datos) {
      try {
        const usuarioParseado = JSON.parse(datos);
        setUsuario(usuarioParseado);
      } catch (e) {
        console.error('Error al leer el usuario desde localStorage:', e);
      }
    }
    refetchUsuario(); // ⬅️ primer refresh en caliente
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch al volver a la pestaña
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refetchUsuario();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Refetch al entrar a Perfil o Chatbots (lugares donde importa el estado)
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

      // Intenta GET /alumnos/:id, si tu back no lo permite al alumno, intenta /alumnos/me
      let res = await fetch(`${API_BASE}/alumnos/${u._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        // fallback opcional
        const tryMe = await fetch(`${API_BASE}/alumnos/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (tryMe.ok) res = tryMe; else return;
      }

      const fresh = await res.json();
      // Actualiza estado y persiste unificado (mantén campos locales + fresh)
      const merged = { ...u, ...fresh };
      setUsuario(merged);
      localStorage.setItem('usuario', JSON.stringify(merged));
    } catch (e) {
      console.warn('No se pudo refrescar el alumno:', e);
    }
  }

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  // ===== Helpers de riesgo =====
  const { riesgo, riesgoMsg } = useMemo(() => {
    if (!usuario) return { riesgo: '', riesgoMsg: '' };

    if (usuario.habilitado === false) {
      return {
        riesgo: 'rojo',
        riesgoMsg: 'ROJO = suspendido, por favor pasar por secretaría'
      };
    }

    let r = String(
      usuario.riesgo ||
      usuario.color_riesgo ||
      usuario.riesgo_color ||
      ''
    ).toLowerCase();

    if (!r && usuario.suscripcionVenceEl) {
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const end = new Date(usuario.suscripcionVenceEl); end.setHours(0,0,0,0);
      if (!Number.isNaN(end.getTime())) {
        const diff = Math.floor((end - hoy) / 86400000);
        if (diff < 0) r = 'rojo';
        else if (diff <= 10) r = 'amarillo';
        else r = 'verde';
      }
    }

    if (!['verde', 'amarillo', 'rojo'].includes(r)) r = '';

    const msg =
      r === 'amarillo'
        ? 'AMARILLO = suspensión en 10 días'
        : r === 'rojo'
        ? 'ROJO = suspendido, por favor pasar por secretaría'
        : 'Suscripción activa';

    return { riesgo: r, riesgoMsg: msg };
  }, [usuario]);

  const estadoCuentaTexto =
    riesgo === 'rojo'
      ? 'Suspendido'
      : usuario?.habilitado === false
      ? 'Suspendido'
      : 'Habilitado';

  const riesgoBg =
    riesgo === 'verde' ? '#27ae60' : riesgo === 'amarillo' ? '#f1c40f' : riesgo === 'rojo' ? '#c0392b' : '#9aa4b2';
  const riesgoTextColor = riesgo === 'amarillo' ? '#1f2937' : '#fff';

  return (
    <div className="panel-alumno">
      <aside className="panel-menu">
        <div className="panel-user">
          <img src="/avatar.png" alt="Perfil" />
          <p>{usuario?.nombre} {usuario?.apellido}</p>
        </div>
        <nav>
          <ul>
            <li className={seccion === 'perfil' ? 'activo' : ''} onClick={() => setSeccion('perfil')}>👤 Perfil</li>
            <li className={seccion === 'chatbots' ? 'activo' : ''} onClick={() => setSeccion('chatbots')}>🤖 Chatbots</li>
            <li className={seccion === 'otros' ? 'activo' : ''} onClick={() => setSeccion('otros')}>⚙️ Otras opciones</li>
          </ul>
        </nav>
        <button onClick={cerrarSesion}>Cerrar sesión</button>
      </aside>

      <main className="panel-contenido">
        {(riesgo === 'amarillo' || riesgo === 'rojo') && (
          <div className={`alumno-alert alumno-alert-${riesgo}`}>
            {riesgoMsg}
          </div>
        )}

        {seccion === 'perfil' && usuario && (
          <div className="perfil-box">
            <h2 className="perfil-titulo">
              Perfil del Alumno
              <button style={{ marginLeft: 12 }} className="mini-btn" onClick={refetchUsuario}>Actualizar</button>
            </h2>

            <section className="perfil-seccion">
              <h3>Información Personal</h3>
              <div className="perfil-grid">
                <div className="perfil-campo">
                  <label>Nombre:</label>
                  <div>{usuario.nombre} {usuario.apellido}</div>
                </div>
                <div className="perfil-campo">
                  <label>Documento:</label>
                  <div>{usuario.tipo_documento} {usuario.numero_documento}</div>
                </div>
                <div className="perfil-campo">
                  <label>Jornada:</label>
                  <div>{usuario.jornada}</div>
                </div>
                <div className="perfil-campo">
                  <label>Semestre:</label>
                  <div>{usuario.semestre}</div>
                </div>
              </div>
            </section>

            <section className="perfil-seccion">
              <h3>Información de Contacto</h3>
              <div className="perfil-grid">
                <div className="perfil-campo">
                  <label>Correo:</label>
                  <div>{usuario.correo}</div>
                </div>
                <div className="perfil-campo">
                  <label>Teléfono:</label>
                  <div>{usuario.telefono || 'No registrado'}</div>
                </div>
              </div>
            </section>

            <section className="perfil-seccion">
              <h3>Información Académica</h3>
              <div className="perfil-grid">
                <div className="perfil-campo">
                  <label>Estado de cuenta:</label>
                  <div>{estadoCuentaTexto}</div>
                </div>
                <div className="perfil-campo">
                  <label>Color de riesgo:</label>
                  <div
                    className="riesgo-tag"
                    style={{ backgroundColor: riesgoBg, color: riesgoTextColor }}
                    title={riesgoMsg}
                  >
                    {(riesgo || '—').toUpperCase()}
                  </div>
                </div>
              </div>
              <p className="riesgo-msg">{riesgoMsg}</p>
            </section>
          </div>
        )}

        {seccion === 'chatbots' && usuario && (
          <div className="panel-box">
            <h2>Chatbots Asignados</h2>
            {usuario.chatbot?.length ? usuario.chatbot.map((cb, i) => (
              <iframe
                key={i}
                src={cb}
                title={`Chatbot ${i}`}
                width="100%"
                height="300"
                style={{ border: '1px solid #ccc', borderRadius: '8px', marginBottom: '10px' }}
              />
            )) : (
              <p>No tienes chatbots asignados aún.</p>
            )}
          </div>
        )}

        {seccion === 'otros' && (
          <div className="panel-box">
            <h2>Opciones futuras</h2>
            <p>Aquí irán más herramientas o configuraciones en el futuro.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default PanelAlumno;