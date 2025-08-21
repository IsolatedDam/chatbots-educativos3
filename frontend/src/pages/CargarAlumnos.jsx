import { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/CargarAlumnos.css';

const API_BASE = 'https://chatbots-educativos3.onrender.com/api';

// Helper: obtener año con fallback (anio || fechaIngreso || createdAt)
const getAnio = (u) => {
  if (u?.anio != null) return u.anio;
  const d = u?.fechaIngreso ? new Date(u.fechaIngreso) : (u?.createdAt ? new Date(u.createdAt) : null);
  return d && !Number.isNaN(d.getTime()) ? d.getFullYear() : '';
};

function CargarAlumnos() {
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token') || '';

  useEffect(() => {
    fetchAlumnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAlumnos = async () => {
    try {
      setError('');
      const { data } = await axios.get(`${API_BASE}/upload/alumnos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlumnos(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      console.error('Error al obtener alumnos:', err?.response?.data || err.message);
      setError(err?.response?.data?.msg || 'No se pudo cargar la lista de alumnos.');
      setAlumnos([]);
    }
  };

  const handleFileChange = (e) => {
    setArchivo(e.target.files?.[0] || null);
    setResultado(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!archivo) return;

    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      setSubiendo(true);
      setResultado(null);
      setError('');

      const { data } = await axios.post(`${API_BASE}/upload/masivo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });

      setResultado(data);
      await fetchAlumnos(); // recargar tabla
    } catch (err) {
      console.error('Error al subir archivo:', err?.response?.data || err.message);
      setError(err?.response?.data?.msg || 'Error al subir archivo');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="cargar-container">
      <h2>Cargar alumnos desde archivo Excel</h2>

      <form onSubmit={handleSubmit} className="cargar-form">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />
        <button type="submit" disabled={!archivo || subiendo}>
          {subiendo ? 'Subiendo…' : 'Subir Archivo'}
        </button>
      </form>

      {error && <div className="alerta-error" style={{marginTop: 10}}>{error}</div>}

      {resultado && (
        <div className="resultado">
          <p>✅ Registrados: {resultado.exitosos ?? 0}</p>
          <p>❌ Fallidos: {resultado.fallidos ?? 0}</p>
          {Array.isArray(resultado.errores) && resultado.errores.length > 0 && (
            <ul>
              {resultado.errores.map((e, i) => (
                <li key={i}>
                  {(e.correo || e.email || '(sin correo)')} — {e.error || 'Error desconocido'}
                </li>
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
              <th>Año</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a, i) => (
              <tr key={a._id || i}>
                <td>{a.correo}</td>
                <td>{a.nombre}</td>
                <td>{a.apellido}</td>
                <td>{a.numero_documento}</td>
                <td>{a.semestre ?? '-'}</td>
                <td>{a.jornada || '-'}</td>
                <td>{getAnio(a) || '-'}</td>    {/* usa helper */}
              </tr>
            ))}
            {!alumnos.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#6e7a86' }}>
                  Sin alumnos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CargarAlumnos;