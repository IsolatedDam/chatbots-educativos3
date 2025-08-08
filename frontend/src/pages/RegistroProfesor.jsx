import { useState } from 'react';
import axios from 'axios';
import '../styles/RegistroProfesor.css';

// Grupos y permisos (label visible + key que se guarda)
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

const ALL_KEYS = PERMISOS.flatMap(g => g.items.map(i => i.key));

export default function RegistroProfesor() {
  const API_BASE = 'https://chatbots-educativos3.onrender.com/api';
  const ENDPOINT = `${API_BASE}/admin/profesores`;

  const [form, setForm] = useState({
    nombre: '',
    correo: '',
    rut: '',
    password: ''
  });
  const [permisos, setPermisos] = useState([]); // <- array de keys

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const togglePerm = (key) =>
    setPermisos(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const toggleAll = () =>
    setPermisos(prev => prev.length === ALL_KEYS.length ? [] : [...ALL_KEYS]);

  const submit = async (e) => {
    e.preventDefault();
    const { nombre, correo, password } = form;
    if (!nombre || !correo || !password) return alert('Completa nombre, correo y contraseña.');

    try {
      await axios.post(
        ENDPOINT,
        { ...form, permisos, rol: 'profesor' },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      alert('Profesor creado con permisos.');
      setForm({ nombre: '', correo: '', rut: '', password: '' });
      setPermisos([]);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.msg || 'Error al crear profesor');
    }
  };

  return (
    <div className="panel-box">
      <h2>Registrar Profesor</h2>

      <form onSubmit={submit} className="form-grid">
        <input
          name="nombre"
          placeholder="Nombre"
          value={form.nombre}
          onChange={onChange}
        />
        <input
          name="correo"
          type="email"
          placeholder="Correo"
          value={form.correo}
          onChange={onChange}
        />
        <input
          name="rut"
          placeholder="RUT (opcional)"
          value={form.rut}
          onChange={onChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          value={form.password}
          onChange={onChange}
        />

        <div className="perms-box">
          <div className="perms-header">
            <strong>Permisos</strong>
          </div>

          <div className="perms-cta">
            <button type="button" onClick={toggleAll}>
              {permisos.length === ALL_KEYS.length ? 'Quitar todos' : 'Seleccionar todos'}
            </button>
          </div>

          {/* Render por grupos */}
          {PERMISOS.map((grupo) => (
            <div key={grupo.grupo} className="perm-group">
              <div className="perm-group-title">{grupo.grupo}</div>
              <div className="perms-list">
                {grupo.items.map((p) => (
                  <label key={p.key} className="perm-item">
                    <input
                      type="checkbox"
                      checked={permisos.includes(p.key)}
                      onChange={() => togglePerm(p.key)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button type="submit" className="btn-primary">Crear profesor</button>
      </form>
    </div>
  );
}