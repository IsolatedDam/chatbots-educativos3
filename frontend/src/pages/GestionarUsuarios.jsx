import { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/GestionarUsuarios.css';

function GestionarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [tipoUsuario, setTipoUsuario] = useState('alumnos');
  const [filtro, setFiltro] = useState('');
  const [usuarioEditando, setUsuarioEditando] = useState(null);
  const [formulario, setFormulario] = useState({});

  useEffect(() => {
    obtenerUsuarios();
  }, [tipoUsuario]);

  const obtenerUsuarios = async () => {
    try {
      const endpoint = tipoUsuario === 'alumnos' ? 'alumnos' : 'profesores';
      const res = await axios.get(`https://chatbots-educativos3.onrender.com/api/${endpoint}`);
      setUsuarios(res.data);
    } catch (err) {
      console.error('Error al obtener usuarios', err);
    }
  };

  const handleFiltro = (e) => {
    setFiltro(e.target.value);
  };

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
      const endpoint = tipoUsuario === 'alumnos' ? 'alumnos' : 'profesores';
      await axios.put(`https://chatbots-educativos3.onrender.com/api/${endpoint}/${formulario._id}`, formulario);
      setUsuarioEditando(null);
      obtenerUsuarios();
    } catch (err) {
      console.error('Error al actualizar usuario', err);
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const texto = `${u.nombre} ${u.apellido} ${u.numero_documento}`.toLowerCase();
    return texto.includes(filtro.toLowerCase());
  });

  return (
    <div className="gestionar-usuarios">
      <h2>Gestionar Usuarios</h2>

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

      <input
        type="text"
        placeholder="Buscar por nombre, apellido"
        value={filtro}
        onChange={handleFiltro}
        className="filtro-input"
      />

      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Correo</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Documento</th>
              <th>Semestre</th>
              <th>Jornada</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => (
              <tr key={u._id}>
                <td>{u.correo}</td>
                <td>{u.nombre}</td>
                <td>{u.apellido}</td>
                <td>{u.numero_documento}</td>
                <td>{u.semestre || '-'}</td>
                <td>{u.jornada || '-'}</td>
                <td>
                  <button onClick={() => handleEditar(u)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {usuarioEditando && (
        <div className="modal">
          <div className="modal-contenido">
            <h3>Editar Usuario</h3>
            <input name="correo" value={formulario.correo} onChange={handleFormularioChange} />
            <input name="nombre" value={formulario.nombre} onChange={handleFormularioChange} />
            <input name="apellido" value={formulario.apellido} onChange={handleFormularioChange} />
            <input name="numero_documento" value={formulario.numero_documento} onChange={handleFormularioChange} />
            {tipoUsuario === 'alumnos' && (
              <>
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