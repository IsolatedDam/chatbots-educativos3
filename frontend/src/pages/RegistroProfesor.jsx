// src/components/RegistroProfesor.jsx
import { useState } from 'react';
import axios from 'axios';
import '../styles/RegistroProfesor.css';

const PERMISOS = [
  {
    grupo: 'Datos del alumno',
    items: [
      { key: 'alumnos:editar_doc',       label: 'Rut / DNI / Pasaporte' },
      { key: 'alumnos:editar_nombre',    label: 'Nombre alumno' },
      { key: 'alumnos:editar_apellido',  label: 'Apellido alumno' },
      { key: 'alumnos:editar_ano',       label: 'Año' },
      { key: 'alumnos:editar_semestre',  label: 'Semestre' },
      { key: 'alumnos:editar_jornada',   label: 'Jornada' },
    ]
  },
  {
    grupo: 'Gestión académica',
    items: [
      { key: 'chatbots:autorizar_acceso', label: 'Autorizar / Desautorizar acceso a chatbots (individual/grupo)' },
      { key: 'alertas:editar_riesgo',     label: 'Edición de alertas de riesgo' },
    ]
  },
  {
    grupo: 'Acciones administrativas',
    items: [
      { key: 'alumnos:eliminar',           label: 'Eliminar alumno individual' },
      { key: 'chatbots:crear',             label: 'Crear nuevos chatbots' },
      { key: 'chatbots:subir_material',    label: 'Subir material a cada chatbot' },
      { key: 'alumnos:carga_masiva',       label: 'Subir Excel con listado de alumnos' },
      { key: 'profesores:crear_editar',    label: 'Crear / Editar profesores' },
    ]
  }
];

const ALL_KEYS  = PERMISOS.flatMap(g => g.items.map(i => i.key));
const API_BASE  = 'https://chatbots-educativos3.onrender.com/api';
const ENDPOINT  = `${API_BASE}/admin/profesores`;
const TEL_RE    = /^\+?\d{8,12}$/;

export default function RegistroProfesor() {
  const hoyISO = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',            // ✅ ahora incluido
    correo: '',
    password: '',
    tipo_documento: 'RUT',
    numero_documento: '',
    telefono: '',
    fechaCreacion: hoyISO,
  });
  const [permisos, setPermisos] = useState([]);
  const [enviando, setEnviando] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const togglePerm = (key) =>
    setPermisos(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const toggleAll = () =>
    setPermisos(prev => prev.length === ALL_KEYS.length ? [] : [...ALL_KEYS]);

  const submit = async (e) => {
    e.preventDefault();
    if (enviando) return;

    const {
      nombre, apellido, correo, password,
      tipo_documento, numero_documento, telefono, fechaCreacion
    } = form;

    if (!nombre || !correo || !password || !tipo_documento || !numero_documento || !telefono || !fechaCreacion) {
      return alert('Completa todos los campos obligatorios.');
    }
    if (!TEL_RE.test(String(telefono).trim())) {
      return alert('Teléfono no válido. Usa 8–12 dígitos (puede iniciar con +).');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaCreacion)) {
      return alert('Fecha de creación no válida (usa YYYY-MM-DD).');
    }

    const rutCompat = tipo_documento === 'RUT' ? numero_documento : '';
    setEnviando(true);

    try {
      await axios.post(
        ENDPOINT,
        {
          nombre,
          apellido, // ✅ se envía al backend
          correo: correo.trim(),
          password,
          permisos,
          rol: 'profesor',
          tipo_documento,
          numero_documento,
          telefono: String(telefono).trim(),
          fechaCreacion,
          rut: rutCompat
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      alert('Profesor creado con permisos.');
      setForm({
        nombre: '',
        apellido: '',         // ✅ reset
        correo: '',
        password: '',
        tipo_documento: 'RUT',
        numero_documento: '',
        telefono: '',
        fechaCreacion: hoyISO
      });
      setPermisos([]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || 'Error al crear profesor');
    } finally {
      setEnviando(false);
    }
  };

  const allSelected = permisos.length === ALL_KEYS.length;

  return (
    <div className="rp-card">
      <h2 className="rp-title">Registrar Profesor</h2>

      <form onSubmit={submit} className="rp-form">
        {/* Grid de 2 columnas */}
        <div className="rp-grid">
          <div className="rp-field">
            <label htmlFor="nombre">Nombre</label>
            <input
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={onChange}
              placeholder="Nombre"
            />
          </div>

          <div className="rp-field">
            <label htmlFor="apellido">Apellido</label>
            <input
              id="apellido"
              name="apellido"
              value={form.apellido}
              onChange={onChange}
              placeholder="Apellido"
            />
          </div>

          <div className="rp-field">
            <label htmlFor="correo">Correo</label>
            <input
              id="correo"
              name="correo"
              type="email"
              value={form.correo}
              onChange={onChange}
              placeholder="Correo"
            />
          </div>

          <div className="rp-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder="Contraseña"
            />
          </div>

          <div className="rp-field">
            <label htmlFor="telefono">Teléfono</label>
            <input
              id="telefono"
              type="tel"
              name="telefono"
              value={form.telefono}
              onChange={onChange}
              placeholder="Teléfono (8–12 dígitos, opcional +)"
            />
          </div>

          <div className="rp-field">
            <label htmlFor="tipo_documento">Tipo de documento</label>
            <select
              id="tipo_documento"
              name="tipo_documento"
              value={form.tipo_documento}
              onChange={onChange}
            >
              <option value="RUT">RUT</option>
              <option value="DNI">DNI</option>
              <option value="Pasaporte">Pasaporte</option>
            </select>
          </div>

          <div className="rp-field">
            <label htmlFor="numero_documento">Número de documento</label>
            <input
              id="numero_documento"
              name="numero_documento"
              value={form.numero_documento}
              onChange={onChange}
              placeholder={
                form.tipo_documento === 'RUT'
                  ? 'RUT (ej: 11111111-1)'
                  : form.tipo_documento === 'DNI'
                  ? 'DNI (ej: 12345678)'
                  : 'Pasaporte (ej: AB1234567)'
              }
            />
          </div>

          <div className="rp-field rp-col-2">
            <label htmlFor="fechaCreacion">Fecha de creación de cuenta</label>
            <input
              id="fechaCreacion"
              type="date"
              name="fechaCreacion"
              value={form.fechaCreacion}
              onChange={onChange}
            />
          </div>
        </div>

        {/* Permisos (full width) */}
        <div className="rp-perms">
          <div className="rp-permsHeader">
            <strong>Permisos</strong>
            <button type="button" className="rp-chip" onClick={toggleAll}>
              {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
            </button>
          </div>

          {PERMISOS.map((grupo) => (
            <div key={grupo.grupo} className="rp-permGroup">
              <div className="rp-permTitle">{grupo.grupo}</div>
              <div className="rp-permsGrid">
                {grupo.items.map((p) => (
                  <label key={p.key} className="rp-permItem">
                    <input
                      type="checkbox"
                      checked={permisos.includes(p.key)}
                      onChange={() => togglePerm(p.key)}
                    />
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="rp-actions">
          <button type="submit" className="rp-btn" disabled={enviando}>
            {enviando ? 'Creando…' : 'Crear profesor'}
          </button>
        </div>
      </form>
    </div>
  );
}