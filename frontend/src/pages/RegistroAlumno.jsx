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
    semestre: '',
    jornada: ''
  });

  const [mensaje, setMensaje] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  function generarContrasenaAleatoria(longitud = 10) {
    const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let clave = '';
    for (let i = 0; i < longitud; i++) {
      clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    return clave;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación básica
    if (
      !form.correo ||
      !form.nombre ||
      !form.apellido ||
      !form.tipo_documento ||
      !form.numero_documento ||
      !form.semestre ||
      !form.jornada
    ) {
      setMensaje('Por favor completa todos los campos obligatorios.');
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
      semestre: form.semestre,
      jornada: form.jornada,
      contrasena: contrasenaGenerada,
      rut: form.tipo_documento === 'RUT' ? form.numero_documento : '' // Nunca undefined
    };

    console.log('Alumno a registrar:', alumno); // Para depuración

    try {
      const res = await axios.post('http://localhost:5000/api/registro', alumno);

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
        semestre: '',
        jornada: ''
      });
    } catch (err) {
      setMensaje(err.response?.data?.msg || 'Error al registrar alumno');
      setTimeout(() => setMensaje(''), 3000);
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

        <input type="text" name="semestre" placeholder="Semestre" value={form.semestre} onChange={handleChange} className="input-field" />

        <select name="jornada" value={form.jornada} onChange={handleChange} className="input-field">
          <option value="" disabled>Selecciona jornada</option>
          <option value="Diurno">Diurno</option>
          <option value="Vespertino">Vespertino</option>
        </select>

        <button type="submit">Registrar</button>
      </form>

      {mensaje && <p className="mensaje">{mensaje}</p>}
    </div>
  );
}

export default RegistroAlumno;