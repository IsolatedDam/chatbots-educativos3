import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import '../styles/GestionarUsuarios.css';

const API_BASE = 'https://chatbots-educativos3.onrender.com/api';
const JORNADAS = ['Mañana', 'Tarde', 'Vespertino', 'Viernes', 'Sábados'];

/* === Catálogo de permisos para PROFESORES (mismo que en RegistroProfesor) === */
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
    { key: 'alumnos:eliminar',           label: 'Eliminar alumno individual' },
    { key: 'chatbots:crear',             label: 'Crear nuevos chatbots' },
    { key: 'chatbots:subir_material',    label: 'Subir material a cada chatbot' },
    { key: 'alumnos:carga_masiva',       label: 'Subir Excel con listado de alumnos' },
    { key: 'profesores:crear_editar',    label: 'Crear / Editar profesores' },
  ]}
];
const ALL_KEYS = PERMISOS.flatMap(g => g.items.map(i => i.key));

/* Helper: apellido con fallbacks */
const getApellido = (u) =>
  u?.apellido ?? u?.apellidos ?? u?.lastName ?? u?.lastname ?? '';

/* Badge de riesgo (simple) */
const RiesgoBadge = ({ value }) => {
  const v = String(value || '').toLowerCase();
  const map = {
    verde: { bg: '#e8f7e8', color: '#137a2a', label: 'Verde' },
    amarillo: { bg: '#fff7cc', color: '#8a6d00', label: 'Amarillo' },
    rojo: { bg: '#ffe1dd', color: '#9b1c1c', label: 'Rojo' },
  };
  const sty = map[v] || { bg: '#eef2f7', color: '#334155', label: v || '-' };
  return (
    <span style={{
      background: sty.bg, color: sty.color,
      padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700
    }}>
      {sty.label}
    </span>
  );
};

function GestionarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [tipoUsuario, setTipoUsuario] = useState('alumnos'); // 'alumnos' | 'profesores'
  const [filtroTexto, setFiltroTexto] = useState('');

  // Filtros
  const [filtroJornada, setFiltroJornada] = useState('');   // solo alumnos
  const [filtroSemestre, setFiltroSemestre] = useState(''); // solo alumnos
  const [filtroAnio, setFiltroAnio] = useState('');         // alumnos y profesores

  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formulario, setFormulario] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  // Permisos del usuario actual (para poder editar riesgo)
  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esSuper = usuarioActual?.rol === 'superadmin';
  const permisosActual = Array.isArray(usuarioActual?.permisos) ? usuarioActual.permisos : [];
  const puedeEditarRiesgo = esSuper || permisosActual.includes('alertas:editar_riesgo');

  const obtenerUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      setError('');

      const endpointPath = tipoUsuario === 'alumnos' ? '/alumnos' : '/admin/profesores';
      const { data } = await axios.get(`${API_BASE}${endpointPath}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const lista = Array.isArray(data) ? data : (data?.items || []);
      setUsuarios(lista);
    } catch (err) {
      console.error('Error al obtener usuarios',
        err?.response?.status,
        err?.response?.data || err.message
      );
      setUsuarios([]);
      setError(err?.response?.data?.msg || 'No se pudieron cargar los usuarios.');
    } finally {
      setCargando(false);
    }
  }, [tipoUsuario, token]);

  useEffect(() => {
    obtenerUsuarios();
    setFiltroTexto('');
    setFiltroJornada('');
    setFiltroSemestre('');
    setFiltroAnio('');
  }, [obtenerUsuarios]);

  // --- helpers de año (usa anio || fechaIngreso || createdAt)
  const getAnio = (u) => {
    if (u?.anio != null) return u.anio;
    const d = u?.fechaIngreso ? new Date(u.fechaIngreso) : (u?.createdAt ? new Date(u.createdAt) : null);
    return d && !Number.isNaN(d.getTime()) ? d.getFullYear() : '';
  };

  // Opciones de semestre detectadas (solo alumnos)
  const opcionesSemestre = useMemo(() => {
    if (tipoUsuario !== 'alumnos') return [];
    const set = new Set(
      (usuarios || [])
        .map(u => (u.semestre ?? '').toString().trim())
        .filter(Boolean)
    );
    const arr = Array.from(set);
    arr.sort((a, b) => Number(a) - Number(b));
    return arr;
  }, [usuarios, tipoUsuario]);

  // Opciones de año (derivadas con fallback) — para ambos tipos
  const opcionesAnio = useMemo(() => {
    const set = new Set(
      (usuarios || []).map(u => {
        const a = getAnio(u);
        return a ? String(a) : null;
      }).filter(Boolean)
    );
    const arr = Array.from(set);
    arr.sort((a, b) => Number(b) - Number(a));
    return arr;
  }, [usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const texto = filtroTexto.toLowerCase().trim();
    return (usuarios || []).filter(u => {
      const base = [
        u.correo,
        u.nombre,
        getApellido(u),
        u.numero_documento,
        u.rut,
        u.cargo,
        u.telefono,   // que también matchee por teléfono si escribe números
        u.riesgo      // y por riesgo si escribe "rojo", "verde", etc.
      ].filter(Boolean).join(' ').toLowerCase();

      if (texto && !base.includes(texto)) return false;

      // Filtro por Año (aplica a alumnos y profesores)
      if (filtroAnio) {
        const anio = getAnio(u);
        if (String(anio) !== String(filtroAnio)) return false;
      }

      // Filtros específicos de alumnos
      if (tipoUsuario === 'alumnos') {
        if (filtroJornada && String(u.jornada || '').toLowerCase() !== filtroJornada.toLowerCase()) {
          return false;
        }
        if (filtroSemestre && String(u.semestre) !== String(filtroSemestre)) {
          return false;
        }
      }
      return true;
    });
  }, [usuarios, tipoUsuario, filtroTexto, filtroJornada, filtroSemestre, filtroAnio]);

  const handleEditar = (usuario) => {
    setUsuarioEditando(usuario);
    // Normaliza en el formulario; asegura arreglo de permisos en profesores
    const ap = getApellido(usuario);
    setFormulario({
      ...usuario,
      apellido: ap,
      apellidos: ap,
      permisos: Array.isArray(usuario.permisos) ? usuario.permisos : []
    });
  };

  const handleFormularioChange = (e) => {
    const { name, value } = e.target;
    const next = { ...formulario, [name]: value };
    // Mantén sincronizados apellido/apellidos para el PUT
    if (name === 'apellido' || name === 'apellidos') {
      next.apellido = value;
      next.apellidos = value;
    }
    setFormulario(next);
  };

  // Toggle de permisos (profesores)
  const togglePerm = (key) => {
    setFormulario((prev) => {
      const cur = Array.isArray(prev.permisos) ? prev.permisos : [];
      const next = cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key];
      return { ...prev, permisos: next };
    });
  };
  const allSelected = useMemo(
    () => (Array.isArray(formulario.permisos) ? formulario.permisos.length === ALL_KEYS.length : false),
    [formulario.permisos]
  );
  const toggleAll = () => {
    setFormulario(prev => ({
      ...prev,
      permisos: allSelected ? [] : [...ALL_KEYS]
    }));
  };

  const guardarCambios = async () => {
    try {
      const endpointPath = tipoUsuario === 'alumnos' ? '/alumnos' : '/admin/profesores';
      const payload = { ...formulario };

      if (tipoUsuario === 'alumnos') {
        // normaliza tipos numéricos
        if (payload.semestre !== undefined && payload.semestre !== '') {
          payload.semestre = Number(payload.semestre);
        }
        if (payload.anio !== undefined && payload.anio !== '') {
          payload.anio = Number(payload.anio);
        }
        // riesgo se envía tal cual (string: 'verde'|'amarillo'|'rojo')
      }

      await axios.put(`${API_BASE}${endpointPath}/${formulario._id}`, payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsuarioEditando(null);
      obtenerUsuarios();
    } catch (err) {
      console.error('❌ Error al actualizar usuario:',
        err?.response?.status,
        err?.response?.data || err.message
      );
      alert(err?.response?.data?.msg || 'No se pudo actualizar.');
    }
  };

  const exportarExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const esAlumnos = tipoUsuario === 'alumnos';

      const data = usuariosFiltrados.map(u => {
        const anio = getAnio(u);
        if (esAlumnos) {
          return {
            Correo: u.correo || '',
            Nombre: u.nombre || '',
            Apellido: getApellido(u) || '',
            Documento: u.numero_documento || '',
            Semestre: u.semestre ?? '',
            Jornada: u.jornada ?? '',
            Año: anio || '',
            Teléfono: u.telefono || '',
            Riesgo: (u.riesgo || '').toString() || ''
          };
        } else {
          return {
            Correo: u.correo || '',
            Nombre: u.nombre || '',
            Apellido: getApellido(u) || '',
            RUT: u.rut || '',
            Cargo: u.cargo || '',
            Año: anio || '',
            Rol: u.rol || ''
          };
        }
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, esAlumnos ? 'Alumnos' : 'Profesores');

      const fecha = new Date().toISOString().slice(0, 10);
      const nombre = esAlumnos
        ? `alumnos_${filtroJornada || 'todas'}_${filtroSemestre || 'todos'}_${filtroAnio || 'todos'}_${fecha}.xlsx`
        : `profesores_${filtroAnio || 'todos'}_${fecha}.xlsx`;

      XLSX.writeFile(wb, nombre);
    } catch (err) {
      console.error('Export Excel error:', err);
      alert('No se pudo exportar a Excel.');
    }
  };

  const limpiarFiltros = () => {
    setFiltroTexto('');
    setFiltroJornada('');
    setFiltroSemestre('');
    setFiltroAnio('');
  };

  const isProf = tipoUsuario === 'profesores';

  return (
    <div className="gestionar-usuarios">
      <h2>Gestionar Usuarios</h2>

      {error && <div className="alerta-error">{error}</div>}

      <div className="tipo-selector">
        <label>
          <input
            type="radio"
            name="tipo"
            value="alumnos"
            checked={tipoUsuario === 'alumnos'}
            onChange={() => setTipoUsuario('alumnos')}
          /> Alumnos
        </label>
        <label>
          <input
            type="radio"
            name="tipo"
            value="profesores"
            checked={tipoUsuario === 'profesores'}
            onChange={() => setTipoUsuario('profesores')}
          /> Profesores
        </label>
      </div>

      <div className="filtros-bar">
        <input
          type="text"
          placeholder="Buscar por correo, nombre, apellido, documento…"
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          className="filtro-input"
        />

        {tipoUsuario === 'alumnos' && (
          <>
            <select
              value={filtroJornada}
              onChange={(e) => setFiltroJornada(e.target.value)}
              className="filtro-select"
            >
              <option value="">Jornada: Todas</option>
              {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>

            <select
              value={filtroSemestre}
              onChange={(e) => setFiltroSemestre(e.target.value)}
              className="filtro-select"
            >
              <option value="">Semestre: Todos</option>
              {opcionesSemestre.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </>
        )}

        {/* Año visible para alumnos y profesores */}
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

        <button className="btn-sec" onClick={limpiarFiltros}>Limpiar</button>
        <button className="btn-prim" onClick={exportarExcel}>Descargar Excel (filtrado)</button>
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
                  {isProf ? (
                    <>
                      <th>RUT</th>
                      <th>Cargo</th>
                      <th>Año</th>
                    </>
                  ) : (
                    <>
                      <th>Documento</th>
                      <th>Semestre</th>
                      <th>Jornada</th>
                      <th>Año</th>
                      <th>Teléfono</th> {/* NUEVO */}
                      <th>Riesgo</th>    {/* NUEVO */}
                    </>
                  )}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => (
                  <tr key={u._id}>
                    <td>{u.correo}</td>
                    <td>{u.nombre}</td>
                    <td>{getApellido(u) || '-'}</td>
                    {isProf ? (
                      <>
                        <td>{u.rut}</td>
                        <td>{u.cargo || '-'}</td>
                        <td>{getAnio(u) || '-'}</td>
                      </>
                    ) : (
                      <>
                        <td>{u.numero_documento}</td>
                        <td>{u.semestre ?? '-'}</td>
                        <td>{u.jornada || '-'}</td>
                        <td>{getAnio(u) || '-'}</td>
                        <td>{u.telefono || '-'}</td>             {/* NUEVO */}
                        <td><RiesgoBadge value={u.riesgo} /></td> {/* NUEVO */}
                      </>
                    )}
                    <td>
                      <button className="btn-edit" onClick={() => handleEditar(u)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {!usuariosFiltrados.length && (
                  <tr>
                    <td colSpan={isProf ? 7 : 10}>
                      Sin resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {usuarioEditando && (
        <div className="modal">
          <div className="modal-contenido">
            <h3>Editar Usuario</h3>

            {/* Campos comunes */}
            <input name="correo" value={formulario.correo || ''} onChange={handleFormularioChange} />
            <input name="nombre" value={formulario.nombre || ''} onChange={handleFormularioChange} />
            <input name="apellido" value={formulario.apellido || ''} onChange={handleFormularioChange} />

            {isProf ? (
              <>
                {/* Profesores: RUT/Cargo */}
                <input name="rut" value={formulario.rut || ''} onChange={handleFormularioChange} />
                <input name="cargo" value={formulario.cargo || ''} onChange={handleFormularioChange} />

                {/* === Permisos (PROFESORES) === */}
                <div style={{ marginTop: 12, padding: 12, border: '1px solid #e8eef5', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <strong>Permisos</strong>
                    <button type="button" className="btn btn-ghost" onClick={toggleAll}>
                      {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
                    </button>
                  </div>

                  {PERMISOS.map((g) => (
                    <fieldset key={g.grupo} style={{ border: '1px dashed #e3e8ef', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                      <legend style={{ fontSize: 12, color: '#6b7280', padding: '0 6px' }}>{g.grupo}</legend>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
                        {g.items.map((p) => {
                          const checked = Array.isArray(formulario.permisos) && formulario.permisos.includes(p.key);
                          return (
                            <label key={p.key} style={{
                              display: 'flex', gap: 8, alignItems: 'flex-start',
                              border: '1px solid #e8eef5', borderRadius: 10, padding: '8px 10px', background: '#fff'
                            }}>
                              <input
                                type="checkbox"
                                checked={!!checked}
                                onChange={() => togglePerm(p.key)}
                              />
                              <span>{p.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  ))}
                </div>
              </>
            ) : (
              <>
                {/* Alumnos */}
                <input name="numero_documento" value={formulario.numero_documento || ''} onChange={handleFormularioChange} />
                <select name="semestre" value={String(formulario.semestre ?? '')} onChange={handleFormularioChange}>
                  <option value="">Semestre</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
                <select name="jornada" value={formulario.jornada || ''} onChange={handleFormularioChange}>
                  <option value="">Jornada</option>
                  {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
                <input name="telefono" value={formulario.telefono || ''} onChange={handleFormularioChange} placeholder="Teléfono" />

                {/* NUEVO: Riesgo (solo editable si tiene permiso) */}
                <select
                  name="riesgo"
                  value={formulario.riesgo || ''}
                  onChange={handleFormularioChange}
                  disabled={!puedeEditarRiesgo}
                  title={!puedeEditarRiesgo ? 'No tienes permiso para editar riesgo' : undefined}
                >
                  <option value="">Riesgo (sin definir)</option>
                  <option value="verde">Verde</option>
                  <option value="amarillo">Amarillo</option>
                  <option value="rojo">Rojo</option>
                </select>
              </>
            )}

            <div className="modal-botones">
              <button onClick={guardarCambios}>Guardar</button>
              <button onClick={() => setUsuarioEditando(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionarUsuarios;