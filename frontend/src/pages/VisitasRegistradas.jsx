import { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import '../styles/VisitasRegistradas.css';

const API_BASE = 'https://chatbots-educativos3-vhfq.onrender.com';

function VisitasRegistradas() {
  const [visitas, setVisitas] = useState([]);
  const [descargando, setDescargando] = useState(false);

  const fetchVisitas = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/visitas`, {
        headers: { Authorization: `Bearer ${token || ''}` },
      });
      setVisitas(res.data);
    } catch (err) {
      console.error('Error al obtener visitas:', err);
    }
  };

  useEffect(() => {
    fetchVisitas();
  }, []);

  const handleDelete = async (correo) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar todas las visitas de ${correo}?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_BASE}/api/visitas/${correo}`, {
          headers: { Authorization: `Bearer ${token || ''}` },
        });
        fetchVisitas(); // Re-fetch visits after deletion
      } catch (err) {
        console.error('Error al eliminar visita:', err);
        alert('Error al eliminar la visita.');
      }
    }
  };

  const descargarExcel = async () => {
    try {
      setDescargando(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/visitas/exportar`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${token || ''}` },
      });

      const blob = res.data;
      const head = await blob.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(head);
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;

      const dispo = res.headers['content-disposition'] || '';
      const match = dispo.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      const suggested = match ? decodeURIComponent(match[1]) : null;
      const fallbackName = (name, ext) => {
        if (!name) return `visitas.${ext}`;
        return name.toLowerCase().endsWith(`.${ext}`) ? name : `${name}.${ext}`;
      };

      if (isZip) {
        const filename = fallbackName(suggested || 'visitas', 'xlsx');
        const xlsxBlob = new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(xlsxBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }

      const text = await new Response(blob).text();
      let asJson;
      try {
        asJson = JSON.parse(text);
      } catch {}

      if (Array.isArray(asJson)) {
        const ws = XLSX.utils.json_to_sheet(asJson);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Visitas');
        const filename = fallbackName(suggested || 'visitas', 'xlsx');
        XLSX.writeFile(wb, filename);
        return;
      }

      console.error('Respuesta no-XLSX:', text.slice(0, 400));
      alert(
        'El servidor no devolvió un XLSX válido.\n\nDetalle (primeros caracteres):\n' +
          text.slice(0, 400)
      );
    } catch (err) {
      console.error('Error al descargar Excel:', err);
      alert('No se pudo descargar el archivo.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="visitas-container">
      <h2>Visitas Registradas</h2>

      <button className="descargar-btn" onClick={descargarExcel} disabled={descargando}>
        {descargando ? 'Descargando…' : 'Descargar Excel'}
      </button>

      <div className="tabla-scroll">
        <table className="tabla-visitas">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>WhatsApp</th>
              <th>N° de Visitas</th>
              <th>Última Visita</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visitas.map((v, index) => (
              <tr key={index}>
                <td>{v.nombre}</td>
                <td>{v.correo}</td>
                <td>{v.whatsapp}</td>
                <td>{v.visitas}</td>
                <td>
                  {v.ultimaVisita
                    ? new Date(v.ultimaVisita).toLocaleString('es-CL')
                    : '-'}
                </td>
                <td>
                  <button className="delete-btn" onClick={() => handleDelete(v.correo)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {!visitas.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#6e7a86' }}>
                  Sin visitas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default VisitasRegistradas;