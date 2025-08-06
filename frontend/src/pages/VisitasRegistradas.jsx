import { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/VisitasRegistradas.css';

function VisitasRegistradas() {
  const [visitas, setVisitas] = useState([]);

  useEffect(() => {
    const fetchVisitas = async () => {
      try {
        const res = await axios.get('https://chatbots-educativos3.onrender.com/api/visitas');
        setVisitas(res.data);
      } catch (err) {
        console.error('Error al obtener visitas:', err);
      }
    };
    fetchVisitas();
  }, []);

  const descargarExcel = () => {
    window.open('http://localhost:5000/api/visitas/exportar', '_blank');
  };

  return (
    <div className="visitas-container">
      <h2>Visitas Registradas</h2>
      <button className="descargar-btn" onClick={descargarExcel}>Descargar Excel</button>

      <div className="tabla-scroll">
        <table className="tabla-visitas">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>WhatsApp</th>
              <th>Fecha y Hora</th>
            </tr>
          </thead>
          <tbody>
            {visitas.map((v, index) => (
              <tr key={index}>
                <td>{v.nombre}</td>
                <td>{v.correo}</td>
                <td>{v.whatsapp}</td>
                <td>{new Date(v.fechaHora).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VisitasRegistradas;