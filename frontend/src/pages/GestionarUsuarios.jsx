import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import '../styles/GestionarUsuarios.css';

const API_BASE = 'https://chatbots-educativos3.onrender.com/api';
const JORNADAS = ['Mañana', 'Tarde', 'Vespertino', 'Viernes', 'Sábados'];

/* Helper: apellido con fallbacks */
const getApellido = (u) =>
  u?.apellido ?? u?.apellidos ?? u?.lastName ?? u?.lastname ?? '';

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
        u.cargo
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
    // Normaliza en el formulario
    const ap = getApellido(usuario);
    setFormulario({ ...usuario, apellido: ap, apellidos: ap });
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

  const guardarCambios = async () => {
    try {
      const endpointPath = tipoUsuario === 'alumnos' ? '/alumnos' : '/admin/profesores';
      const payload = { ...formulario };
      if (tipoUsuario === 'alumnos' && payload.semestre !== undefined && payload.semestre !== '') {
        payload.semestre = Number(payload.semestre);
      }
      await axios.put(`${API_BASE}${endpointPath}/${formulario._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
            Año: anio || ''
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
                    <td colSpan={isProf ? 7 : 8}>
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
            <input name="correo" value={formulario.correo || ''} onChange={handleFormularioChange} />
            <input name="nombre" value={formulario.nombre || ''} onChange={handleFormularioChange} />
            <input name="apellido" value={formulario.apellido || ''} onChange={handleFormularioChange} />

            {isProf ? (
              <>
                <input name="rut" value={formulario.rut || ''} onChange={handleFormularioChange} />
                <input name="cargo" value={formulario.cargo || ''} onChange={handleFormularioChange} />
              </>
            ) : (
              <>
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