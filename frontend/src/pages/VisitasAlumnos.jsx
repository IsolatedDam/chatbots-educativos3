import { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import '../styles/VisitasRegistradas.css'; // Reutilizamos los mismos estilos

const API_BASE = 'https://chatbots-educativos3-vhfq.onrender.com';

function VisitasAlumnos() {
  const [visitas, setVisitas] = useState([]);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    const fetchVisitasAlumnos = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/api/visitas/alumnos`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        setVisitas(res.data);
      } catch (err) {
        console.error('Error al obtener visitas de alumnos:', err);
      }
    };
    fetchVisitasAlumnos();
  }, []);

  const descargarExcel = async () => {
    // TODO: Implementar una ruta de exportación específica para alumnos si es necesario.
    alert('La exportación para esta vista aún no está implementada.');
  };

  return (
    <div className="visitas-container">
      <h2>Actividad de Alumnos</h2>
      <p>Esta sección muestra las veces que tus alumnos han iniciado sesión en la plataforma.</p>

      {/* <button className="descargar-btn" onClick={descargarExcel} disabled={descargando}>
        {descargando ? 'Descargando…' : 'Descargar Excel'}
      </button> */}

      <div className="tabla-scroll">
        <table className="tabla-visitas">
          <thead>
            <tr>
              <th>Nombre Alumno</th>
              <th>Correo</th>
              <th>Teléfono</th>
              <th>Fecha y Hora de Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {visitas.map((v, index) => (
              <tr key={index}>
                <td>{v.nombre}</td>
                <td>{v.correo}</td>
                <td>{v.whatsapp}</td>
                <td>{v.fechaHora ? new Date(v.fechaHora).toLocaleString('es-CL') : '-'}</td>
              </tr>
            ))}
            {!visitas.length && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: '#6e7a86' }}>
                  Aún no hay registros de actividad de tus alumnos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VisitasAlumnos;
