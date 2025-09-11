// src/components/RegistroAdmin.jsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/RegistroProfesor.css';
import '../styles/GestionarUsuarios.css';
import '../styles/RegistroAdmin.css'; // 👈 agrega este import para los estilos del ojo

/* === Catálogo de permisos (SIN "chatbots:crear" ni "chatbots:subir_material") === */
const PERMISOS = [
  { grupo: 'Datos del alumno', items: [
    { key: 'alumnos:editar_doc',       label: 'Rut / DNI / Pasaporte' },
    { key: 'alumnos:editar_nombre',    label: 'Nombre alumno' },
    { key: 'alumnos:editar_apellido',  label: 'Apellido alumno' },
    { key: 'alumnos:editar_ano',       label: 'Año' },
    { key: 'alumnos:editar_semestre',  label: 'Semestre' },
    { key: 'alumnos:editar_jornada',   label: 'Jornada' },
  ]},
  { grupo: 'Gestión académica', items: [
    { key: 'chatbots:autorizar_acceso', label: 'Autorizar / Desautorizar acceso a chatbots (individual/grupo)' },
    { key: 'alertas:editar_riesgo',     label: 'Edición de alertas de riesgo' },
  ]},
  { grupo: 'Acciones administrativas', items: [
    { key: 'alumnos:eliminar',        label: 'Eliminar alumno individual' },
    { key: 'alumnos:carga_masiva',    label: 'Subir Excel con listado de alumnos' },
    { key: 'profesores:crear_editar', label: 'Crear / Editar profesores' },
  ]}
];

/* Bloqueo extra por si en el futuro alguien agrega esos permisos por error */
const PERMISOS_BLOQUEADOS = new Set([
  'chatbots:crear',
  'chatbots:subir_material',
]);

const API_BASE   = 'https://chatbots-educativos3.onrender.com/api';
const EP_CREATE  = `${API_BASE}/admin/profesores`;
const EP_LIST    = `${API_BASE}/admin/profesores`;
const TEL_RE     = /^\+?\d{8,12}$/;

/* Helpers iguales a GestionarUsuarios */
const getApellido = (u) =>
  u?.apellido ?? u?.apellidos ?? u?.lastName ?? u?.lastname ?? '';

const getAnio = (u) => {
  if (u?.anio != null) return u.anio;
  const d = u?.fechaCreacion ? new Date(u.fechaCreacion) :
           (u?.createdAt ? new Date(u.createdAt) : null);
  return d && !Number.isNaN(d.getTime()) ? d.getFullYear() : '';
};

export default function RegistroAdmin() {
  const token  = localStorage.getItem('token') || '';
  const ALL_KEYS = useMemo(() => PERMISOS.flatMap(g => g.items.map(i => i.key)), []);
  const hoyISO   = new Date().toISOString().slice(0,10);

  /* ===== Formulario ===== */
  const [form, setForm] = useState({
    nombre: '', apellido: '', correo: '', password: '',
    tipo_documento: 'RUT', numero_documento: '', telefono: '',
    fechaCreacion: hoyISO,
  });
  const [permisos, setPermisos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [verPwd, setVerPwd] = useState(false); // 👁️ mostrar/ocultar contraseña

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const togglePerm = key =>
    setPermisos(p => p.includes(key) ? p.filter(k => k!==key) : [...p, key]);
  const toggleAll = () =>
    setPermisos(p => p.length === ALL_KEYS.length ? [] : [...ALL_KEYS]);
  const allSelected = permisos.length === ALL_KEYS.length;

  const limpiarForm = () => {
    setForm({
      nombre:'', apellido:'', correo:'', password:'',
      tipo_documento:'RUT', numero_documento:'', telefono:'',
      fechaCreacion: hoyISO
    });
    setPermisos([]);
    setVerPwd(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (enviando) return;

    const { nombre, apellido, correo, password, tipo_documento, numero_documento, telefono, fechaCreacion } = form;
    if (!nombre || !apellido || !correo || !password || !tipo_documento || !numero_documento || !telefono || !fechaCreacion) {
      alert('Completa todos los campos obligatorios.'); return;
    }
    if (!TEL_RE.test(String(telefono).trim())) {
      alert('Teléfono no válido. Usa 8–12 dígitos (puede iniciar con +).'); return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCreacion)) {
      alert('Fecha de creación no válida (usa YYYY-MM-DD).'); return;
    }

    // 🔒 Filtro defensivo: quita permisos bloqueados antes de enviar
    const permisosFiltrados = (permisos || []).filter(k => !PERMISOS_BLOQUEADOS.has(k));

    const rut = tipo_documento === 'RUT' ? numero_documento : '';
    setEnviando(true);
    try {
      await axios.post(EP_CREATE, {
        nombre,
        apellido,
        apellidos: apellido, // compat backend
        correo: correo.trim(),
        password,
        permisos: permisosFiltrados,
        rol: 'profesor',
        tipo_documento,
        numero_documento,
        telefono: String(telefono).trim(),
        fechaCreacion,
        rut
      }, { headers: { Authorization: `Bearer ${token}` } });

      alert('Usuario creado con permisos.');
      limpiarForm();
      await cargarProfesores(); // refresca la tabla
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || 'Error al crear usuario');
    } finally { setEnviando(false); }
  };

  /* ===== Tabla de PROFESORES ===== */
  const [profesores, setProfesores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtroTexto, setFiltroTexto] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');

  const cargarProfesores = useCallback(async () => {
    try {
      setCargando(true);
      const { data } = await axios.get(EP_LIST, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfesores(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al obtener profesores',
        err?.response?.status,
        err?.response?.data || err.message
      );
      setProfesores([]);
      alert(err?.response?.data?.msg || 'No se pudieron cargar los profesores.');
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargarProfesores(); }, [cargarProfesores]);

  const opcionesAnio = useMemo(() => {
    const set = new Set(
      (profesores || []).map(u => {
        const a = getAnio(u);
        return a ? String(a) : null;
      }).filter(Boolean)
    );
    const arr = Array.from(set);
    arr.sort((a, b) => Number(b) - Number(a));
    return arr;
  }, [profesores]);

  const profesoresFiltrados = useMemo(() => {
    const texto = filtroTexto.toLowerCase().trim();
    return (profesores || []).filter(u => {
      const base = [
        u.correo,
        u.nombre,
        getApellido(u),
        u.numero_documento,
        u.rut,
        u.cargo,
        u.telefono
      ].filter(Boolean).join(' ').toLowerCase();

      if (texto && !base.includes(texto)) return false;

      if (filtroAnio) {
        const anio = getAnio(u);
        if (String(anio) !== String(filtroAnio)) return false;
      }
      return true;
    });
  }, [profesores, filtroTexto, filtroAnio]);

  return (
    <div className="rp-page">
      <div className="rp-shell">
        <header className="rp-header">
          <h2>Registrar Usuario (Profesor)</h2>
          <p>Completa los datos del usuario y asigna los permisos correspondientes.</p>
        </header>

        {/* ===== Formulario ===== */}
        <form className="rp-form" onSubmit={submit} noValidate>
          {/* Datos personales */}
          <section className="card">
            <div className="card__head"><h3>Datos personales</h3></div>
            <div className="grid grid--2">
              <div className="field">
                <label htmlFor="nombre">Nombre</label>
                <input id="nombre" name="nombre" value={form.nombre} onChange={onChange} placeholder="Nombre" required />
              </div>
              <div className="field">
                <label htmlFor="apellido">Apellido</label>
                <input id="apellido" name="apellido" value={form.apellido} onChange={onChange} placeholder="Apellido" required />
              </div>
              <div className="field">
                <label htmlFor="correo">Correo</label>
                <input id="correo" name="correo" type="email" value={form.correo} onChange={onChange} placeholder="correo@ejemplo.com" required />
              </div>

              {/* 👁️ Contraseña con ojo */}
              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <div className="pwd-field">
                  <input
                    id="password"
                    name="password"
                    type={verPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={onChange}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="toggle-pwd"
                    aria-label={verPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    title={verPwd ? 'Ocultar' : 'Mostrar'}
                    onClick={() => setVerPwd(v => !v)}
                  >
                    {verPwd ? (
                      /* ojo tachado */
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M3 3l18 18" />
                        <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.12-.88" />
                        <path d="M9.9 4.24A11.5 11.5 0 0 1 12 4c7 0 11 8 11 8a18.3 18.3 0 0 1-5.05 5.95" />
                        <path d="M6.11 6.11A18.3 18.3 0 0 0 1 12s4 8 11 8c1.4 0 2.7-.23 3.9-.64" />
                      </svg>
                    ) : (
                      /* ojo abierto */
                      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Documento y contacto */}
          <section className="card">
            <div className="card__head"><h3>Documento y contacto</h3></div>
            <div className="grid grid--3">
              <div className="field">
                <label htmlFor="telefono">Teléfono</label>
                <input id="telefono" type="tel" name="telefono" value={form.telefono} onChange={onChange} placeholder="+56912345678" />
                <small className="hint">8–12 dígitos, puede iniciar con “+”.</small>
              </div>
              <div className="field">
                <label htmlFor="tipo_documento">Tipo de documento</label>
                <select id="tipo_documento" name="tipo_documento" value={form.tipo_documento} onChange={onChange}>
                  <option value="RUT">RUT</option>
                  <option value="DNI">DNI</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="numero_documento">Número de documento</label>
                <input
                  id="numero_documento"
                  name="numero_documento"
                  value={form.numero_documento}
                  onChange={onChange}
                  placeholder={form.tipo_documento === 'RUT' ? '11111111-1' : form.tipo_documento === 'DNI' ? '12345678' : 'AB1234567'}
                />
              </div>
              <div className="field field--sm-1">
                <label htmlFor="fechaCreacion">Fecha de creación</label>
                <input id="fechaCreacion" type="date" name="fechaCreacion" value={form.fechaCreacion} onChange={onChange} />
              </div>
            </div>
          </section>

          {/* Permisos */}
          <section className="card">
            <div className="card__head card__head--row">
              <h3>Permisos</h3>
              <button type="button" className="chip" onClick={toggleAll}>
                {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
              </button>
            </div>
            {PERMISOS.map(grupo => (
              <fieldset key={grupo.grupo} className="perm-group">
                <legend>{grupo.grupo}</legend>
                <div className="perm-grid">
                  {grupo.items.map(p => (
                    <label key={p.key} className="perm-item">
                      <input
                        type="checkbox"
                        checked={permisos.includes(p.key)}
                        onChange={() => togglePerm(p.key)}
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>

          <div className="form-actions">
            <button type="submit" className="btn" disabled={enviando}>
              {enviando ? 'Creando…' : 'Registrar'}
            </button>
          </div>
        </form>

        {/* ===== Tabla de PROFESORES ===== */}
        <section className="card" style={{ marginTop: 24 }}>
          <div className="card__head card__head--row">
            <h3>Profesores registrados</h3>
            <div className="ua-filters" style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Buscar por correo, nombre, apellido, documento…"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="filtro-input"
                style={{ minWidth: 260 }}
              />
              <select
                value={filtroAnio}
                onChange={(e) => setFiltroAnio(e.target.value)}
                className="filtro-select"
              >
                <option value="">Año: Todos</option>
                {opcionesAnio.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button className="btn-sec" onClick={() => { setFiltroTexto(''); setFiltroAnio(''); }}>
                Limpiar
              </button>
              <button className="chip" onClick={cargarProfesores}>
                Recargar
              </button>
            </div>
          </div>

          <div className="tabla-contenedor">
            {cargando ? (
              <div className="tabla-loading">Cargando…</div>
            ) : (
              <div className="tabla-scroll">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Correo</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>RUT</th>
                      <th>Cargo</th>
                      <th>Año</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profesoresFiltrados.map((u) => (
                      <tr key={u._id}>
                        <td>{u.correo || '-'}</td>
                        <td>{u.nombre || '-'}</td>
                        <td>{getApellido(u) || '-'}</td>
                        <td>{u.rut || '-'}</td>
                        <td>{u.cargo || '-'}</td>
                        <td>{getAnio(u) || '-'}</td>
                      </tr>
                    ))}
                    {!profesoresFiltrados.length && (
                      <tr>
                        <td colSpan={6}>Sin resultados.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}