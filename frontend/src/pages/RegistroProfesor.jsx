import { useState, useMemo } from 'react';
import axios from 'axios';
import '../styles/RegistroProfesor.css';

const PERMISOS = [
  { grupo: 'Datos del alumno', items: [
    { key: 'alumnos:editar_doc', label: 'Rut / DNI / Pasaporte' },
    { key: 'alumnos:editar_nombre', label: 'Nombre alumno' },
    { key: 'alumnos:editar_apellido', label: 'Apellido alumno' },
    { key: 'alumnos:editar_ano', label: 'Año' },
    { key: 'alumnos:editar_semestre', label: 'Semestre' },
    { key: 'alumnos:editar_jornada', label: 'Jornada' },
  ]},
  { grupo: 'Gestión académica', items: [
    { key: 'chatbots:autorizar_acceso', label: 'Autorizar / Desautorizar acceso a chatbots (individual/grupo)' },
    { key: 'alertas:editar_riesgo',     label: 'Edición de alertas de riesgo' },
  ]},
  { grupo: 'Acciones administrativas', items: [
    { key: 'alumnos:eliminar',        label: 'Eliminar alumno individual' },
    { key: 'chatbots:crear',          label: 'Crear nuevos chatbots' },
    { key: 'chatbots:subir_material', label: 'Subir material a cada chatbot' },
    { key: 'alumnos:carga_masiva',    label: 'Subir Excel con listado de alumnos' },
    { key: 'profesores:crear_editar', label: 'Crear / Editar profesores' },
  ]},
];

const API_BASE = 'https://chatbots-educativos3.onrender.com/api';
const ENDPOINT = `${API_BASE}/admin/profesores`;
const TEL_RE   = /^\+?\d{8,12}$/;

export default function RegistroProfesor() {
  const ALL_KEYS = useMemo(() => PERMISOS.flatMap(g => g.items.map(i => i.key)), []);
  const hoyISO   = new Date().toISOString().slice(0,10);

  const [form, setForm] = useState({
    nombre: '', apellido: '', correo: '', password: '',
    tipo_documento: 'RUT', numero_documento: '', telefono: '',
    fechaCreacion: hoyISO,
  });
  const [permisos, setPermisos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const togglePerm = key =>
    setPermisos(p => p.includes(key) ? p.filter(k => k!==key) : [...p, key]);
  const toggleAll = () =>
    setPermisos(p => p.length === ALL_KEYS.length ? [] : [...ALL_KEYS]);
  const allSelected = permisos.length === ALL_KEYS.length;

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

    const rut = tipo_documento === 'RUT' ? numero_documento : '';
    setEnviando(true);
    try {
      await axios.post(ENDPOINT, {
        nombre,
        apellido,
        apellidos: apellido,               // 👈 compat
        correo: correo.trim(),
        password,
        permisos,
        rol: 'profesor',
        tipo_documento,
        numero_documento,
        telefono: String(telefono).trim(),
        fechaCreacion,
        rut
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

      alert('Profesor creado con permisos.');
      setForm({ nombre:'', apellido:'', correo:'', password:'', tipo_documento:'RUT',
        numero_documento:'', telefono:'', fechaCreacion:hoyISO });
      setPermisos([]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || 'Error al crear profesor');
    } finally { setEnviando(false); }
  };

  return (
    <div className="rp-page">
      <div className="rp-shell">
        <header className="rp-header">
          <h2>Registrar Profesor</h2>
          <p>Completa los datos del profesor y asigna los permisos correspondientes.</p>
        </header>

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
              <div className="field">
                <label htmlFor="password">Contraseña</label>
                <input id="password" name="password" type="password" value={form.password} onChange={onChange} placeholder="••••••••" required />
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
                <input id="numero_documento" name="numero_documento" value={form.numero_documento} onChange={onChange}
                  placeholder={form.tipo_documento === 'RUT' ? '11111111-1' : form.tipo_documento === 'DNI' ? '12345678' : 'AB1234567'} />
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
                      <input type="checkbox" checked={permisos.includes(p.key)} onChange={() => togglePerm(p.key)} />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </section>

          <div className="form-actions">
            <button type="submit" className="btn" disabled={enviando}>
              {enviando ? 'Creando…' : 'Crear profesor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}