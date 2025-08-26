import { useEffect, useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';              // 👈 importar SheetJS
import '../styles/VisitasRegistradas.css';

const API_BASE = 'https://chatbots-educativos3.onrender.com';

function VisitasRegistradas() {
  const [visitas, setVisitas] = useState([]);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    const fetchVisitas = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/visitas`);
        setVisitas(res.data);
      } catch (err) {
        console.error('Error al obtener visitas:', err);
      }
    };
    fetchVisitas();
  }, []);

  const descargarExcel = async () => {
    try {
      setDescargando(true);

      const res = await axios.get(`${API_BASE}/api/visitas/exportar`, {
        responseType: 'blob',
        // headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });

      const blob = res.data;

      // 1) ¿Es XLSX real (ZIP -> 'PK')?
      const head = await blob.slice(0, 4).arrayBuffer();
      const bytes = new Uint8Array(head);
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B; // 'PK'

      // Nombre sugerido desde Content-Disposition (si viene)
      const dispo = res.headers['content-disposition'] || '';
      const match = dispo.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      const suggested = match ? decodeURIComponent(match[1]) : null;
      const fallbackName = (name, ext) => {
        if (!name) return `visitas.${ext}`;
        return name.toLowerCase().endsWith(`.${ext}`) ? name : `${name}.${ext}`;
      };

      if (isZip) {
        // Descargar XLSX tal cual
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

      // 2) No es XLSX: leer como texto para decidir
      const text = await new Response(blob).text();

      // 2a) ¿Es CSV? (coma/punto y coma/tab + saltos de línea)
      const looksLikeCSV = /[,;\t]/.test(text) && /\r?\n/.test(text);
      if (looksLikeCSV) {
        // Convertir CSV -> XLSX
        const ws = XLSX.read(text, { type: 'string' }).Sheets.Sheet1
          || XLSX.utils.sheet_to_json(XLSX.utils.aoa_to_sheet([])); // fallback
        const wb = XLSX.utils.book_new();
        // Si la lectura directa no entregó hoja, parseamos de forma segura:
        const parsed = XLSX.read(text, { type: 'string' });
        const sheet = parsed.Sheets[parsed.SheetNames[0]];
        XLSX.utils.book_append_sheet(wb, sheet, 'Visitas');
        const filename = fallbackName(suggested || 'visitas', 'xlsx');
        XLSX.writeFile(wb, filename);
        return;
      }

      // 2b) ¿Es JSON (array)?
      let asJson;
      try { asJson = JSON.parse(text); } catch {}
      if (Array.isArray(asJson)) {
        const ws = XLSX.utils.json_to_sheet(asJson);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Visitas');
        const filename = fallbackName(suggested || 'visitas', 'xlsx');
        XLSX.writeFile(wb, filename);
        return;
      }

      // 2c) No es CSV ni JSON → probablemente un HTML/JSON de error
      console.error('Respuesta no-XLSX:', text.slice(0, 400));
      alert('El servidor no devolvió un XLSX válido.\n\nDetalle (primeros caracteres):\n' + text.slice(0, 400));
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
              <th>Fecha y Hora</th>
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