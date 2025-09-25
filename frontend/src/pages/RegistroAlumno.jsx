import { useState } from 'react';
import axios from 'axios';
import '../styles/RegistroAlumno.css';
import Swal from 'sweetalert2';

function RegistroAlumno() {
  const [form, setForm] = useState({
    correo: '',
    nombre: '',
    apellido: '',
    tipo_documento: 'RUT',
    numero_documento: '',
    fechaIngreso: '',  // YYYY-MM-DD
    telefono: '',
    semestre: '',      // 1 | 2
    jornada: ''        // Mañana, Tarde, Vespertino, Viernes, Sábados
  });

  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function generarContrasenaAleatoria(longitud = 10) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let clave = '';
    for (let i = 0; i < longitud; i++) clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    return clave;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.correo || !form.nombre || !form.apellido ||
      !form.tipo_documento || !form.numero_documento ||
      !form.fechaIngreso || !form.telefono ||
      !form.semestre || !form.jornada
    ) {
      setMensaje('Por favor completa todos los campos obligatorios.');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    if (!['1', '2'].includes(String(form.semestre))) {
      setMensaje('Semestre debe ser 1 o 2.');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    const telOK = /^\+?\d{8,12}$/.test(String(form.telefono).trim());
    if (!telOK) {
      setMensaje('Teléfono no válido. Usa 8–12 dígitos (puede iniciar con +).');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaIngreso)) {
      setMensaje('Fecha de ingreso no válida.');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    const contrasenaGenerada = generarContrasenaAleatoria();

    const alumno = {
      correo: form.correo.trim(),
      nombre: form.nombre,
      apellido: form.apellido,
      tipo_documento: form.tipo_documento,
      numero_documento: form.numero_documento,
      fechaIngreso: form.fechaIngreso,
      telefono: String(form.telefono).trim(),
      semestre: Number(form.semestre),
      jornada: form.jornada,
      contrasena: contrasenaGenerada
      // 'anio' y 'rut' los resuelve el backend
    };

    try {
      setEnviando(true);
      const API_BASE = 'https://chatbots-educativos3.onrender.com';
      const token = localStorage.getItem('token');

      if (!token) {
        setMensaje('Tu sesión expiró. Vuelve a iniciar sesión.');
        setTimeout(() => {
          localStorage.clear();
          window.location.href = '/login';
        }, 1200);
        return;
      }

      await axios.post(`${API_BASE}/api/registro`, alumno, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Alumno registrado',
        html: `
          <p><strong>Usuario:</strong> ${form.correo}</p>
          <p><strong>Contraseña generada:</strong> ${contrasenaGenerada}</p>
        `,
        confirmButtonText: 'Entendido'
      });

      setForm({
        correo: '',
        nombre: '',
        apellido: '',
        tipo_documento: 'RUT',
        numero_documento: '',
        fechaIngreso: '',
        telefono: '',
        semestre: '',
        jornada: ''
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        setMensaje('Tu sesión expiró o no tienes permisos.');
        setTimeout(() => {
          localStorage.clear();
          window.location.href = '/login';
        }, 1200);
      } else {
        setMensaje(err.response?.data?.msg || 'Error al registrar alumno');
        setTimeout(() => setMensaje(''), 3000);
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="registro-container">
      <h2>Registrar Alumno</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" name="correo" placeholder="Correo" value={form.correo} onChange={handleChange} className="input-field" />
        <input type="text" name="nombre" placeholder="Nombre(s)" value={form.nombre} onChange={handleChange} className="input-field" />
        <input type="text" name="apellido" placeholder="Apellido(s)" value={form.apellido} onChange={handleChange} className="input-field" />

        <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className="input-field">
          <option value="" disabled>Selecciona tipo de documento</option>
          <option value="RUT">RUT</option>
          <option value="DNI">DNI</option>
          <option value="Pasaporte">Pasaporte</option>
        </select>

        <input
          type="text"
          name="numero_documento"
          placeholder={
            form.tipo_documento === 'RUT'
              ? 'Ej: 12345678-9'
              : form.tipo_documento === 'DNI'
              ? 'Ej: 12345678'
              : 'Ej: AB1234567'
          }
          value={form.numero_documento}
          onChange={handleChange}
          className="input-field"
        />

        <input
          type="date"
          name="fechaIngreso"
          value={form.fechaIngreso}
          onChange={handleChange}
          className="input-field"
        />

        <input
          type="tel"
          name="telefono"
          placeholder="Teléfono (8–12 dígitos, opcional +)"
          value={form.telefono}
          onChange={handleChange}
          className="input-field"
        />

        <select name="semestre" value={form.semestre} onChange={handleChange} className="input-field">
          <option value="" disabled>Selecciona semestre</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>

        <select name="jornada" value={form.jornada} onChange={handleChange} className="input-field">
          <option value="" disabled>Selecciona jornada</option>
          <option value="Mañana">Mañana</option>
          <option value="Tarde">Tarde</option>
          <option value="Vespertino">Vespertino</option>
          <option value="Viernes">Viernes</option>
          <option value="Sábados">Sábados</option>
        </select>

        <button type="submit" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Registrar'}
        </button>
      </form>

      {mensaje && <p className="mensaje">{mensaje}</p>}
    </div>
  );
}

export default RegistroAlumno;