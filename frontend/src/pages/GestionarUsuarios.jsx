import { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import '../styles/GestionarUsuarios.css';

const API_BASE = 'https://chatbots-educativos3.onrender.com/api';

function GestionarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [tipoUsuario, setTipoUsuario] = useState('alumnos'); // 'alumnos' | 'profesores'
  const [filtroTexto, setFiltroTexto] = useState('');

  // Filtros (solo aplican a alumnos)
  const [filtroJornada, setFiltroJornada] = useState('');   // '' | 'Diurno' | 'Vespertino'
  const [filtroSemestre, setFiltroSemestre] = useState(''); // '' | '1'...'12'

  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formulario, setFormulario] = useState({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  const obtenerUsuarios = useCallback(async () => {
    try {
      setCargando(true);
      setError('');

      const endpointPath =
        tipoUsuario === 'alumnos'
          ? '/alumnos'
          : '/admin/profesores';

      const { data } = await axios.get(`${API_BASE}${endpointPath}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Soporta array o {items: []}
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
    // Reset filtros al cambiar el tipo
    setFiltroTexto('');
    setFiltroJornada('');
    setFiltroSemestre('');
  }, [obtenerUsuarios]);

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

  const usuariosFiltrados = useMemo(() => {
    const texto = filtroTexto.toLowerCase().trim();

    return (usuarios || []).filter(u => {
      const base = [
        u.nombre,
        u.apellido,
        u.numero_documento,
        u.rut,
        u.cargo
      ].filter(Boolean).join(' ').toLowerCase();

      if (texto && !base.includes(texto)) return false;

      if (tipoUsuario === 'alumnos') {
        if (filtroJornada && (u.jornada || '').toLowerCase() !== filtroJornada.toLowerCase()) {
          return false;
        }
        if (filtroSemestre && String(u.semestre) !== String(filtroSemestre)) {
          return false;
        }
      }

      return true;
    });
  }, [usuarios, tipoUsuario, filtroTexto, filtroJornada, filtroSemestre]);

  const handleEditar = (usuario) => {
    setUsuarioEditando(usuario);
    setFormulario(usuario);
  };

  const handleFormularioChange = (e) => {
    const { name, value } = e.target;
    setFormulario({ ...formulario, [name]: value });
  };

  const guardarCambios = async () => {
    try {
      const endpointPath =
        tipoUsuario === 'alumnos'
          ? '/alumnos'
          : '/admin/profesores';

      await axios.put(`${API_BASE}${endpointPath}/${formulario._id}`, formulario, {
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
      const XLSX = await import('xlsx'); // requiere: npm i xlsx
      const esAlumnos = tipoUsuario === 'alumnos';

      const data = usuariosFiltrados.map(u => {
        if (esAlumnos) {
          return {
            Correo: u.correo || '',
            Nombre: u.nombre || '',
            Apellido: u.apellido || '',
            Documento: u.numero_documento || '',
            Semestre: u.semestre ?? '',
            Jornada: u.jornada ?? ''
          };
        } else {
          return {
            Correo: u.correo || '',
            Nombre: u.nombre || '',
            Apellido: u.apellido || '',
            RUT: u.rut || '',
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
        ? `alumnos_${filtroJornada || 'todos'}_${filtroSemestre || 'todos'}_${fecha}.xlsx`
        : `profesores_${fecha}.xlsx`;

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
  };

  return (
    <div className="gestionar-usuarios">
      <h2>Gestionar Usuarios</h2>

      {error && (
        <div className="alerta-error">
          {error}
        </div>
      )}

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
          placeholder="Buscar por nombre, apellido, documento…"
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
              <option value="Diurno">Diurno</option>
              <option value="Vespertino">Vespertino</option>
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

        <button className="btn-sec" onClick={limpiarFiltros}>Limpiar</button>
        <button className="btn-prim" onClick={exportarExcel}>Descargar Excel (filtrado)</button>
      </div>

      <div className="tabla-contenedor">
        {cargando ? (
          <div className="tabla-loading">Cargando…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Correo</th>
                <th>Nombre</th>
                <th>Apellido</th>
                {tipoUsuario === 'profesores' ? (
                  <>
                    <th>RUT</th>
                    <th>Cargo</th>
                  </>
                ) : (
                  <>
                    <th>Documento</th>
                    <th>Semestre</th>
                    <th>Jornada</th>
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
                  <td>{u.apellido}</td>
                  {tipoUsuario === 'profesores' ? (
                    <>
                      <td>{u.rut}</td>
                      <td>{u.cargo || '-'}</td>
                    </>
                  ) : (
                    <>
                      <td>{u.numero_documento}</td>
                      <td>{u.semestre || '-'}</td>
                      <td>{u.jornada || '-'}</td>
                    </>
                  )}
                  <td>
                    <button onClick={() => handleEditar(u)}>Editar</button>
                  </td>
                </tr>
              ))}
              {!usuariosFiltrados.length && (
                <tr>
                  <td colSpan={tipoUsuario === 'profesores' ? 6 : 7} style={{ textAlign: 'center', opacity: .7 }}>
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {usuarioEditando && (
        <div className="modal">
          <div className="modal-contenido">
            <h3>Editar Usuario</h3>
            <input name="correo" value={formulario.correo || ''} onChange={handleFormularioChange} />
            <input name="nombre" value={formulario.nombre || ''} onChange={handleFormularioChange} />
            <input name="apellido" value={formulario.apellido || ''} onChange={handleFormularioChange} />
            {tipoUsuario === 'profesores' ? (
              <>
                <input name="rut" value={formulario.rut || ''} onChange={handleFormularioChange} />
                <input name="cargo" value={formulario.cargo || ''} onChange={handleFormularioChange} />
              </>
            ) : (
              <>
                <input name="numero_documento" value={formulario.numero_documento || ''} onChange={handleFormularioChange} />
                <input name="semestre" value={formulario.semestre || ''} onChange={handleFormularioChange} />
                <select name="jornada" value={formulario.jornada || ''} onChange={handleFormularioChange}>
                  <option value="">Selecciona jornada</option>
                  <option value="Diurno">Diurno</option>
                  <option value="Vespertino">Vespertino</option>
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