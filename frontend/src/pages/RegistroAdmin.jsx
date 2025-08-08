import { useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import '../styles/RegistroAdmin.css';

function RegistroAdmin() {
  const API_BASE = 'https://chatbots-educativos3.onrender.com/api';
  const ENDPOINT  = `${API_BASE}/admin/registro`; // tu ruta actual

  // Para permitir crear "superadmin" solo si quien está logeado lo es
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esSuper = usuario?.rol === 'superadmin';

  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    rut: '',
    correo: '',
    cargo: '',
    rol: 'admin', // por defecto admin
  });

  const generarContrasena = () =>
    Math.random().toString(36).slice(-10);

  const onChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();

    const { nombre, apellido, rut, correo, cargo, rol } = form;
    if (!nombre || !apellido || !rut || !correo || !cargo) {
      return Swal.fire('Faltan datos', 'Completa todos los campos.', 'warning');
    }

    const contrasena = generarContrasena();
    const payload = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      rut: rut.trim(),
      correo: correo.trim().toLowerCase(),
      cargo: cargo.trim(),
      rol,
      contrasena,
    };

    try {
      await axios.post(ENDPOINT, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      Swal.fire({
        icon: 'success',
        title: `¡${rol === 'superadmin' ? 'Superadmin' : 'Administrador'} creado!`,
        html: `
          <p><strong>Correo:</strong> ${payload.correo}</p>
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
        rol: 'admin',
      });
    } catch (err) {
      Swal.fire(
        'Error',
        err.response?.data?.msg || 'No se pudo crear el administrador.',
        'error'
      );
    }
  };

  return (
    <div className="registro-admin-container">
      <h2>Registrar Administrador</h2>

      <form onSubmit={onSubmit}>
        <input
          type="text" name="nombre" placeholder="Nombre(s)"
          value={form.nombre} onChange={onChange} required
        />
        <input
          type="text" name="apellido" placeholder="Apellido(s)"
          value={form.apellido} onChange={onChange} required
        />
        <input
          type="text" name="rut" placeholder="RUT (sin puntos ni guión)"
          value={form.rut} onChange={onChange} required
        />
        <input
          type="email" name="correo" placeholder="Correo electrónico"
          value={form.correo} onChange={onChange} required
        />
        <input
          type="text" name="cargo" placeholder="Cargo (ej: Coordinador Académico)"
          value={form.cargo} onChange={onChange} required
        />

        <select
          name="rol" value={form.rol} onChange={onChange}
          required
        >
          <option value="admin">Admin</option>
          {esSuper && <option value="superadmin">Superadmin</option>}
        </select>

        <button type="submit">Registrar</button>
      </form>
    </div>
  );
}

export default RegistroAdmin;