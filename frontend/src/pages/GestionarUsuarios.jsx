import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../styles/GestionarUsuarios.css';

const API_BASE = 'https://chatbots-educativos3-vhfq.onrender.com/api';
const JORNADAS = ['Mañana', 'Tarde', 'Vespertino', 'Viernes', 'Sábados'];

/* === Catálogo de permisos para PROFESORES (para el editor) === */
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

/* ========= Helpers de riesgo (para alumnos) ========= */
function calcRiesgoFE(vence) {
  if (!vence) return '';
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const end = new Date(vence); end.setHours(0,0,0,0);
  if (Number.isNaN(end.getTime())) return '';
  const diff = Math.floor((end - hoy) / 86400000);
  if (diff < 0) return 'rojo';
  if (diff <= 10) return 'amarillo';
  return 'verde';
}
function deriveRiesgo(a) {
  const r = (a?.riesgo ?? a?.color_riesgo ?? a?.riesgo_color ?? calcRiesgoFE(a?.suscripcionVenceEl) ?? '')
    .toString().toLowerCase();
  let rr = ['verde','amarillo','rojo'].includes(r) ? r : '';
  if (a?.habilitado === false) rr = 'rojo';
  return rr;
}
function riesgoMensajeFE(r) {
  if (r === 'amarillo') return 'AMARILLO = suspensión en 10 días';
  if (r === 'rojo') return 'ROJO = suspendido, por favor pasar por secretaría';
  if (r === 'verde') return 'Suscripción activa';
  return '—';
}
const getApellido = (u) => u?.apellido ?? u?.apellidos ?? u?.lastName ?? u?.lastname ?? '';
const formatDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0,10);
};
const getFechaCreacion = (u) => formatDate(u?.fechaCreacion || u?.createdAt || u?.fecha_creacion);

const RiesgoBadge = ({ value }) => {
  const v = String(value || '').toLowerCase();
  const map = {
    verde:    { bg: '#e8f7e8', color: '#137a2a', label: 'Verde' },
    amarillo: { bg: '#fff7cc', color: '#8a6d00', label: 'Amarillo' },
    rojo:     { bg: '#ffe1dd', color: '#9b1c1c', label: 'Rojo' },
  };
  const sty = map[v] || { bg: '#eef2f7', color: '#334155', label: v || '-' };
  return (
    <span style={{ background: sty.bg, color: sty.color, padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
      {sty.label}
    </span>
  );
};

function GestionarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [tipoUsuario, setTipoUsuario] = useState('alumnos'); // 'alumnos' | 'profesores'
  const [filtroTexto, setFiltroTexto] = useState('');

  // Filtros
  const [filtroJornada, setFiltroJornada] = useState('');
  const [filtroSemestre, setFiltroSemestre] = useState('');
  const [filtroAnio, setFiltroAnio] = useState('');

  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formulario, setFormulario] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';
  const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esSuper = String(usuarioActual?.rol || '').toLowerCase() === 'superadmin';
  const esAdmin = String(usuarioActual?.rol || '').toLowerCase() === 'admin';
  const permisosActual = Array.isArray(usuarioActual?.permisos) ? usuarioActual.permisos : [];
  const puedeEditarRiesgo = esSuper || esAdmin || permisosActual.includes('alertas:editar_riesgo');
  const puedeEliminarAlumnos = esSuper || esAdmin || permisosActual.includes('alumnos:eliminar');

  // Selección múltiple (alumnos)
  const [seleccion, setSeleccion] = useState([]);
  const [eliminandoMasivo, setEliminandoMasivo] = useState(false);

  const toggleSelect = (id) => {
    setSeleccion(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const clearSelection = () => setSeleccion([]);

  const getAnio = (u) => {
    if (u?.anio != null) return u.anio;
    const d = u?.fechaIngreso ? new Date(u.fechaIngreso)
          : u?.fechaCreacion ? new Date(u.fechaCreacion)
          : u?.createdAt ? new Date(u.createdAt) : null;
    return d && !Number.isNaN(d.getTime()) ? d.getFullYear() : '';
  };

  const obtenerUsuarios = useCallback(async () => {
    try {
      setCargando(true); setError('');
      const endpointPath = tipoUsuario === 'alumnos' ? '/alumnos' : '/admin/profesores';
      const { data } = await axios.get(`${API_BASE}${endpointPath}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const lista = Array.isArray(data) ? data : (data?.items || []);
      setUsuarios(lista);
      setSeleccion([]);
    } catch (err) {
      console.error('Error al obtener usuarios', err?.response?.status, err?.response?.data || err.message);
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
    setSeleccion([]);
  }, [obtenerUsuarios]);

  const opcionesSemestre = useMemo(() => {
    if (tipoUsuario !== 'alumnos') return [];
    const set = new Set(
      (usuarios || []).map(u => (u.semestre ?? '').toString().trim()).filter(Boolean)
    );
    const arr = Array.from(set);
    arr.sort((a, b) => Number(a) - Number(b));
    return arr;
  }, [usuarios, tipoUsuario]);

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
        u.correo, u.nombre, getApellido(u),
        ...(tipoUsuario === 'alumnos' ? [u.numero_documento] : []),
        u.rut, u.cargo, u.telefono
      ].filter(Boolean).join(' ').toLowerCase();

      if (texto && !base.includes(texto)) return false;

      if (filtroAnio) {
        const anio = getAnio(u);
        if (String(anio) !== String(filtroAnio)) return false;
      }
      if (tipoUsuario === 'alumnos') {
        if (filtroJornada && String(u.jornada || '').toLowerCase() !== filtroJornada.toLowerCase()) return false;
        if (filtroSemestre && String(u.semestre) !== String(filtroSemestre)) return false;
      }
      return true;
    });
  }, [usuarios, tipoUsuario, filtroTexto, filtroJornada, filtroSemestre, filtroAnio]);

  const allFilteredIds = useMemo(() => (
    tipoUsuario === 'alumnos' ? usuariosFiltrados.map(u => u._id) : []
  ), [usuariosFiltrados, tipoUsuario]);
  const allFilteredSelected = useMemo(() => (
    allFilteredIds.length > 0 && allFilteredIds.every(id => seleccion.includes(id))
  ), [allFilteredIds, seleccion]);
  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSeleccion(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSeleccion(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleEditar = (usuario) => {
    setUsuarioEditando(usuario);
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
    if (name === 'apellido' || name === 'apellidos') {
      next.apellido = value;
      next.apellidos = value;
    }
    setFormulario(next);
  };

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
  const toggleAll = () => setFormulario(prev => ({ ...prev, permisos: allSelected ? [] : [...ALL_KEYS] }));

  const guardarCambios = async () => {
    try {
      const endpointPath = tipoUsuario === 'alumnos' ? '/alumnos' : '/admin/profesores';
      const payload = { ...formulario };

      if (tipoUsuario === 'alumnos') {
        if (payload.semestre !== undefined && payload.semestre !== '') payload.semestre = Number(payload.semestre);
        if (payload.anio !== undefined && payload.anio !== '') payload.anio = Number(payload.anio);
      } else {
        delete payload.numero_documento; // no editar Nº doc en profesores
      }

      await axios.put(`${API_BASE}${endpointPath}/${formulario._id}`, payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsuarioEditando(null);
      obtenerUsuarios();
    } catch (err) {
      console.error('❌ Error al actualizar usuario:',
        err?.response?.status, err?.response?.data || err.message);
      alert(err?.response?.data?.msg || 'No se pudo actualizar.');
    }
  };

  const eliminarUsuario = async (u) => {
    const tipo = tipoUsuario === 'alumnos' ? 'alumno' : 'profesor';
    const { isConfirmed } = await Swal.fire({
      title: `Eliminar ${tipo}`,
      html: `¿Seguro que quieres eliminar a <b>${u.nombre || ''} ${getApellido(u) || ''}</b>?<br/>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;

    try {
      const endpointPath = tipoUsuario === 'alumnos' ? '/alumnos' : '/admin/profesores';
      await axios.delete(`${API_BASE}${endpointPath}/${u._id}`, { headers: { Authorization: `Bearer ${token}` } });
      await Swal.fire('Eliminado', `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} eliminado correctamente.`, 'success');
      obtenerUsuarios();
    } catch (err1) {
      const status = err1?.response?.status;
      const notFoundish = status === 404 || status === 405 || status === 400;
      if (tipoUsuario === 'profesores' && notFoundish) {
        try {
          await axios.delete(`${API_BASE}/admin/${u._id}`, { headers: { Authorization: `Bearer ${token}` } });
          await Swal.fire('Eliminado', 'Profesor eliminado correctamente (compat).', 'success');
          obtenerUsuarios();
          return;
        } catch (err2) {
          console.error('❌ Error fallback eliminar profesor:', err2?.response?.status, err2?.response?.data || err2.message);
          Swal.fire('Error', err2?.response?.data?.msg || 'No se pudo eliminar (compat).', 'error');
          return;
        }
      }
      console.error('❌ Error al eliminar:', err1?.response?.status, err1?.response?.data || err1.message);
      Swal.fire('Error', err1?.response?.data?.msg || 'No se pudo eliminar.', 'error');
    }
  };

  const eliminarAlumnosSeleccionados = async () => {
    if (tipoUsuario !== 'alumnos') return;
    if (!puedeEliminarAlumnos) {
      Swal.fire('Permiso insuficiente', 'No tienes permiso para eliminar alumnos.', 'warning');
      return;
    }
    if (!seleccion.length) return;

    const count = seleccion.length;
    const { isConfirmed } = await Swal.fire({
      title: `Eliminar ${count} alumno${count > 1 ? 's' : ''}`,
      html: `¿Seguro que deseas eliminar <b>${count}</b> alumno${count > 1 ? 's' : ''}?<br/>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!isConfirmed) return;

    try {
      setEliminandoMasivo(true);
      const headers = { Authorization: `Bearer ${token}` };
      const promises = seleccion.map(id => axios.delete(`${API_BASE}/alumnos/${id}`, { headers }));
      const results = await Promise.allSettled(promises);

      const ok = results.filter(r => r.status === 'fulfilled').length;
      const fail = results.length - ok;

      if (fail === 0) {
        await Swal.fire('Listo', `Se eliminaron ${ok} alumno${ok > 1 ? 's' : ''}.`, 'success');
      } else {
        await Swal.fire({
          title: 'Proceso finalizado',
          html: `Eliminados: <b>${ok}</b><br/>Fallidos: <b>${fail}</b><br/><small>Revisa consola para detalles.</small>`,
          icon: 'info'
        });
        results.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(`❌ Falló eliminar ID=${seleccion[i]}`, r.reason?.response?.status, r.reason?.response?.data || r.reason?.message);
          }
        });
      }
      clearSelection();
      obtenerUsuarios();
    } catch (e) {
      console.error('❌ Error en eliminación masiva:', e);
      Swal.fire('Error', 'No se pudo completar la eliminación masiva.', 'error');
    } finally {
      setEliminandoMasivo(false);
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
            Riesgo: deriveRiesgo(u).toUpperCase() || ''
          };
        } else {
          return {
            Correo: u.correo || '',
            Nombre: u.nombre || '',
            Apellido: getApellido(u) || '',
            'Tipo doc': u.tipo_documento || '',
            RUT: u.rut || '',
            Teléfono: u.telefono || '',
            'Fecha creación': getFechaCreacion(u) || '',
            Año: anio || '',
            Cargo: u.cargo || '',
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
    setSeleccion([]);
  };

  const isProf = tipoUsuario === 'profesores';
  const isAlum = tipoUsuario === 'alumnos';
  const colSpanProf = 10;
  const colSpanAlum = 11;

  /* 👉 Bloquea el scroll del body cuando el modal está abierto */
  useEffect(() => {
    if (usuarioEditando) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [usuarioEditando]);

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

        {isAlum && (
          <>
            <select value={filtroJornada} onChange={(e) => setFiltroJornada(e.target.value)} className="filtro-select">
              <option value="">Jornada: Todas</option>
              {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>

            <select value={filtroSemestre} onChange={(e) => setFiltroSemestre(e.target.value)} className="filtro-select">
              <option value="">Semestre: Todos</option>
              {opcionesSemestre.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}

        <select value={filtroAnio} onChange={(e) => setFiltroAnio(e.target.value)} className="filtro-select">
          <option value="">Año: Todos</option>
          {opcionesAnio.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>

        <button className="btn-sec" onClick={limpiarFiltros}>Limpiar</button>
        <button className="btn-prim" onClick={exportarExcel}>Descargar Excel (filtrado)</button>

        {isAlum && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: 12, opacity: .8 }}>
              Seleccionados: <b>{seleccion.length}</b>
            </span>
            <button
              className="btn-edit"
              onClick={eliminarAlumnosSeleccionados}
              disabled={!puedeEliminarAlumnos || !seleccion.length || eliminandoMasivo}
              title={!puedeEliminarAlumnos ? 'No tienes permiso para eliminar alumnos' : undefined}
            >
              {eliminandoMasivo ? 'Eliminando…' : 'Eliminar seleccionados'}
            </button>
          </div>
        )}
      </div>

      <div className="tabla-contenedor">
        {cargando ? (
          <div className="tabla-loading">Cargando…</div>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla">
              <thead>
                <tr>
                  {isAlum && (
                    <th style={{ width: 32, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={allFilteredSelected && allFilteredIds.length > 0}
                        onChange={toggleSelectAllFiltered}
                        title="Seleccionar todos (filtrados)"
                      />
                    </th>
                  )}
                  <th>Correo</th>
                  <th>Nombre</th>
                  <th>Apellido</th>
                  {isProf ? (
                    <>
                      <th>Tipo doc</th>
                      <th>RUT</th>
                      <th>Teléfono</th>
                      <th>Fecha creación</th>
                      <th>Año</th>
                      <th>Cargo</th>
                    </>
                  ) : (
                    <>
                      <th>Documento</th>
                      <th>Semestre</th>
                      <th>Jornada</th>
                      <th>Año</th>
                      <th>Teléfono</th>
                      <th>Riesgo</th>
                    </>
                  )}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((u) => {
                  const r = deriveRiesgo(u);
                  return (
                    <tr key={u._id}>
                      {isAlum && (
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={seleccion.includes(u._id)} onChange={() => toggleSelect(u._id)} />
                        </td>
                      )}
                      <td>{u.correo || '-'}</td>
                      <td>{u.nombre || '-'}</td>
                      <td>{getApellido(u) || '-'}</td>
                      {isProf ? (
                        <>
                          <td>{u.tipo_documento || '-'}</td>
                          <td>{u.rut || '-'}</td>
                          <td>{u.telefono || '-'}</td>
                          <td>{getFechaCreacion(u) || '-'}</td>
                          <td>{getAnio(u) || '-'}</td>
                          <td>{u.cargo || '-'}</td>
                        </>
                      ) : (
                        <>
                          <td>{u.numero_documento || '-'}</td>
                          <td>{u.semestre ?? '-'}</td>
                          <td>{u.jornada || '-'}</td>
                          <td>{getAnio(u) || '-'}</td>
                          <td>{u.telefono || '-'}</td>
                          <td title={riesgoMensajeFE(r)}><RiesgoBadge value={r} /></td>
                        </>
                      )}
                      <td>
                        <button className="btn-edit" onClick={() => handleEditar(u)}>Editar</button>
                        <button className="btn-sec" onClick={() => eliminarUsuario(u)} style={{ marginLeft: 8 }}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!usuariosFiltrados.length && (
                  <tr>
                    <td colSpan={isProf ? colSpanProf : colSpanAlum}>Sin resultados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== MODAL CENTRADO ===== */}
      {usuarioEditando && (
        <div
          className="gu-modal"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setUsuarioEditando(null)} /* click fuera cierra */
        >
          <div
            className="gu-dialog"
            onMouseDown={(e) => e.stopPropagation()}    /* evita cerrar al clickear dentro */
          >
            <div className="gu-header">
              <h3 className="gu-title">Editar {isProf ? 'Profesor' : 'Alumno'}</h3>
              <button className="gu-close" onClick={() => setUsuarioEditando(null)} aria-label="Cerrar">✕</button>
            </div>

            {/* Campos comunes */}
            <input name="correo" value={formulario.correo || ''} onChange={handleFormularioChange} />
            <input name="nombre" value={formulario.nombre || ''} onChange={handleFormularioChange} />
            <input name="apellido" value={formulario.apellido || ''} onChange={handleFormularioChange} />

            {isProf ? (
              <>
                <select name="tipo_documento" value={formulario.tipo_documento || ''} onChange={handleFormularioChange}>
                  <option value="">Tipo de documento</option>
                  <option value="RUT">RUT</option>
                  <option value="DNI">DNI</option>
                  <option value="Pasaporte">Pasaporte</option>
                </select>
                <input name="rut" value={formulario.rut || ''} onChange={handleFormularioChange} placeholder="RUT" />
                <input name="telefono" value={formulario.telefono || ''} onChange={handleFormularioChange} placeholder="Teléfono" />
                <input
                  type="date"
                  name="fechaCreacion"
                  value={formatDate(formulario.fechaCreacion || formulario.createdAt) || ''}
                  onChange={handleFormularioChange}
                  placeholder="Fecha de creación"
                />
                <input name="cargo" value={formulario.cargo || ''} onChange={handleFormularioChange} placeholder="Cargo" />

                {/* Permisos profesor */}
                <div className="perm-wrap">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <strong>Permisos</strong>
                    <button type="button" className="btn-ghost" onClick={toggleAll}>
                      {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
                    </button>
                  </div>
                  {PERMISOS.map((g) => (
                    <fieldset key={g.grupo} className="perm-group">
                      <legend>{g.grupo}</legend>
                      <div className="perm-grid">
                        {g.items.map((p) => {
                          const checked = Array.isArray(formulario.permisos) && formulario.permisos.includes(p.key);
                          return (
                            <label key={p.key} className="perm-item">
                              <input type="checkbox" checked={!!checked} onChange={() => togglePerm(p.key)} />
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

                {puedeEditarRiesgo && (
                  <>
                    <label style={{ display: 'block', marginTop: 8 }}>
                      <span style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Color de riesgo</span>
                      <select name="riesgo" value={formulario.riesgo || ''} onChange={handleFormularioChange}>
                        <option value="">Riesgo (sin definir)</option>
                        <option value="verde">Verde</option>
                        <option value="amarillo">Amarillo</option>
                        <option value="rojo">Rojo</option>
                      </select>
                    </label>
                    <div style={{ marginTop: 8 }}>
                      {(() => {
                        const r = (formulario.riesgo || deriveRiesgo(formulario) || '').toLowerCase();
                        const bg = r === 'verde' ? '#27ae60' : r === 'amarillo' ? '#f1c40f' : r === 'rojo' ? '#c0392b' : '#95a5a6';
                        return (
                          <>
                            <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: bg, color: '#fff', fontWeight: 700, marginRight: 8 }}>
                              {(r || '—').toString().toUpperCase()}
                            </div>
                            <small style={{ opacity: 0.8 }}>{riesgoMensajeFE(r)}</small>
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="gu-actions">
              <button className="btn-prim" onClick={guardarCambios}>Guardar</button>
              <button className="btn-sec" onClick={() => setUsuarioEditando(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionarUsuarios;