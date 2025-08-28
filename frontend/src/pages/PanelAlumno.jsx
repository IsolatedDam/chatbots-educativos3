import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PanelAlumno.css';

function PanelAlumno() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [seccion, setSeccion] = useState('perfil');

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
  }, []);

  const cerrarSesion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  // ===== Helpers de riesgo =====
  const { riesgo, riesgoMsg } = useMemo(() => {
    if (!usuario) return { riesgo: '', riesgoMsg: '' };

    // 0) Si el alumno está deshabilitado, forzamos ROJO
    if (usuario.habilitado === false) {
      return {
        riesgo: 'rojo',
        riesgoMsg: 'ROJO = suspendido, por favor pasar por secretaría'
      };
    }

    // 1) toma 'riesgo' (nuevo backend) o 'color_riesgo' (compat)
    let r = String(
      usuario.riesgo ||
      usuario.color_riesgo ||
      usuario.riesgo_color || // por si el login usa otro nombre
      ''
    ).toLowerCase();

    // 2) si no hay, intenta derivar por fecha de vencimiento
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

    // normaliza a valores esperados
    if (!['verde', 'amarillo', 'rojo'].includes(r)) r = '';

    const msg =
      r === 'amarillo'
        ? 'AMARILLO = suspensión en 10 días'
        : r === 'rojo'
        ? 'ROJO = suspendido, por favor pasar por secretaría'
        : 'Suscripción activa';

    return { riesgo: r, riesgoMsg: msg };
  }, [usuario]);

  // Estado de cuenta mostrado (si riesgo es rojo, mostramos suspendido)
  const estadoCuentaTexto =
    riesgo === 'rojo'
      ? 'Suspendido'
      : usuario?.habilitado === false
      ? 'Suspendido'
      : 'Habilitado';

  const riesgoBg =
    riesgo === 'verde' ? '#27ae60' : riesgo === 'amarillo' ? '#f1c40f' : riesgo === 'rojo' ? '#c0392b' : '#9aa4b2';
  const riesgoTextColor = riesgo === 'amarillo' ? '#1f2937' : '#fff'; // amarillo se lee mejor oscuro

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
        {/* ===== Banner de alerta si AMARILLO/ROJO ===== */}
        {(riesgo === 'amarillo' || riesgo === 'rojo') && (
          <div className={`alumno-alert alumno-alert-${riesgo}`}>
            {riesgoMsg}
          </div>
        )}

        {seccion === 'perfil' && usuario && (
          <div className="perfil-box">
            <h2 className="perfil-titulo">Perfil del Alumno</h2>

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
              {/* Mensaje textual bajo la grilla, por claridad */}
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
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '8px',
                  marginBottom: '10px'
                }}
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