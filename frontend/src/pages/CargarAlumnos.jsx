
import { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/CargarAlumnos.css';

function CargarAlumnos() {
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [alumnos, setAlumnos] = useState([]);

  const fetchAlumnos = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/upload/alumnos');
      setAlumnos(res.data);
    } catch (err) {
      console.error('Error al obtener alumnos:', err);
    }
  };

  useEffect(() => {
    fetchAlumnos();
  }, []);

  const handleFileChange = (e) => {
    setArchivo(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!archivo) return;

    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      const res = await axios.post('http://localhost:5000/api/upload/masivo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResultado(res.data);
      fetchAlumnos(); // Recargar alumnos luego de la carga
    } catch (err) {
      alert('Error al subir archivo');
    }
  };

  return (
    <div className="cargar-container">
      <h2>Cargar alumnos desde archivo Excel</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        <button type="submit">Subir Archivo</button>
      </form>

      {resultado && (
        <div className="resultado">
          <p>✅ Registrados: {resultado.exitosos}</p>
          <p>❌ Fallidos: {resultado.fallidos}</p>
          {resultado.errores?.length > 0 && (
            <ul>
              {resultado.errores.map((e, i) => (
                <li key={i}>{e.correo} — {e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <hr />

      <h3>📋 Lista de alumnos registrados</h3>
      <div className="tabla-alumnos">
        <table>
          <thead>
            <tr>
              <th>Correo</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Documento</th>
              <th>Semestre</th>
              <th>Jornada</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a, i) => (
              <tr key={i}>
                <td>{a.correo}</td>
                <td>{a.nombre}</td>
                <td>{a.apellido}</td>
                <td>{a.numero_documento}</td>
                <td>{a.semestre}</td>
                <td>{a.jornada}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CargarAlumnos;