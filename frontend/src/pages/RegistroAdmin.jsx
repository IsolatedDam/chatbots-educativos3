import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../styles/RegistroAdmin.css';

function RegistroAdmin() {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    rut: '',
    correo: '',
    cargo: '',
    rol: 'profesor'
  });

  const [permisos, setPermisos] = useState([]);

  const generarContrasena = () => {
    return Math.random().toString(36).slice(-10);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCheckbox = (e) => {
    const valor = e.target.value;
    if (e.target.checked) {
      setPermisos([...permisos, valor]);
    } else {
      setPermisos(permisos.filter(p => p !== valor));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const contrasena = generarContrasena();

    const nuevoAdmin = {
      ...form,
      contrasena,
      permisos: form.rol === 'profesor' ? { columnasEditable: permisos } : undefined
    };

    try {
      await axios.post('https://chatbots-educativos3.onrender.com/api/admin/registro', nuevoAdmin);

      Swal.fire({
        icon: 'success',
        title: `¡${form.rol === 'profesor' ? 'Profesor' : 'Administrador'} creado!`,
        html: `
          <p><strong>Correo:</strong> ${form.correo}</p>
          <p><strong>Contraseña generada:</strong> <code>${contrasena}</code></p>
        `,
        confirmButtonText: 'Entendido'
      });

      setForm({
        nombre: '',
        apellido: '',
        rut: '',
        correo: '',
        cargo: '',
        rol: 'profesor'
      });
      setPermisos([]);
    } catch (err) {
      Swal.fire(
        'Error',
        err.response?.data?.msg || `No se pudo crear el ${form.rol === 'profesor' ? 'profesor' : 'administrador'}`,
        'error'
      );
    }
  };

  return (
    <div className="registro-admin-container">
      <h2>Registrar Administrador</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="nombre" placeholder="Nombre(s)" value={form.nombre} onChange={handleChange} required />
        <input type="text" name="apellido" placeholder="Apellido(s)" value={form.apellido} onChange={handleChange} required />
        <input type="text" name="rut" placeholder="RUT (sin puntos ni guión)" value={form.rut} onChange={handleChange} required />
        <input type="email" name="correo" placeholder="Correo electrónico" value={form.correo} onChange={handleChange} required />
        <input type="text" name="cargo" placeholder="Cargo (ej: Profesor Historia)" value={form.cargo} onChange={handleChange} required />

        <select name="rol" value={form.rol} onChange={handleChange} required>
          <option value="profesor">Profesor</option>
          <option value="superadmin">Superadmin</option>
        </select>

        {form.rol === 'profesor' && (
          <div className="permisos-checkboxes">
            <p><strong>Permisos del profesor:</strong></p>
            <label><input type="checkbox" value="nombre" onChange={handleCheckbox} checked={permisos.includes('nombre')} /> Editar nombre</label>
            <label><input type="checkbox" value="apellido" onChange={handleCheckbox} checked={permisos.includes('apellido')} /> Editar apellido</label>
            <label><input type="checkbox" value="rut" onChange={handleCheckbox} checked={permisos.includes('rut')} /> Editar RUT</label>
            <label><input type="checkbox" value="curso" onChange={handleCheckbox} checked={permisos.includes('curso')} /> Editar curso</label>
            <label><input type="checkbox" value="cargar" onChange={handleCheckbox} checked={permisos.includes('cargar')} /> Cargar alumnos o entrenamientos</label>
          </div>
        )}

        <button type="submit">Registrar</button>
      </form>
    </div>
  );
}

export default RegistroAdmin;