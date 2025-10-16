// src/components/CargarAlumno.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "../styles/CargarAlumnos.css";

const API_BASE = "https://chatbots-educativos3-vhfq.onrender.com/api";

// Columnas requeridas
const REQUIRED = [
  "correo",
  "nombre",
  "apellido",
  "tipo_documento",
  "numero_documento",
  "fechaIngreso",
  "telefono",
  "semestre",
  "jornada",
];
const JORNADAS = ["Mañana", "Tarde", "Vespertino", "Viernes", "Sábados", "Blearning", "Online", "Otras"];
const TEL_RE = /^\+?\d{8,12}$/;

// Helpers ---------------------------------------------------------
const toKey = (s = "") =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_\-]+/g, "");

const ALIASES = {
  correo: ["correo", "correo electronico", "email", "e-mail", "mail"],
  nombre: ["nombre", "nombres"],
  apellido: ["apellido", "apellidos"],
  tipo_documento: [
    "tipo documento",
    "tipodocumento",
    "tipo doc",
    "tipodoc",
    "documento",
    "tipo",
  ],
  numero_documento: [
    "numero documento",
    "numerodocumento",
    "nro doc",
    "nrodoc",
    "num doc",
    "numdocumento",
    "documento_nro",
    "nro",
  ],
  fechaIngreso: ["fecha ingreso", "fecha_de_ingreso", "fecha_ingreso", "fecha"],
  telefono: ["telefono", "teléfono", "celular", "cel", "fono"],
  semestre: ["semestre", "sem", "semester"],
  jornada: ["jornada", "turno", "horario"],
};

// si vienen columnas “rut”, “dni”, “pasaporte”, etc.
const DOC_COLUMNS = {
  rut: "RUT",
  dni: "DNI",
  pasaporte: "Pasaporte",
  passport: "Pasaporte",
  pasport: "Pasaporte",
  cedula: "DNI",
  ceduladeidentidad: "DNI",
  ci: "DNI",
};

const getAnio = (u) => {
  if (u?.anio != null) return u.anio;
  const d = u?.fechaIngreso
    ? new Date(u.fechaIngreso)
    : u?.createdAt
    ? new Date(u.createdAt)
    : null;
  return d && !Number.isNaN(d.getTime()) ? d.getFullYear() : "";
};

function canonicalizeRow(raw) {
  const norm = {};
  for (const [k, v] of Object.entries(raw)) norm[toKey(k)] = v;

  const out = {};
  for (const canonical of Object.keys(ALIASES)) {
    for (const alias of ALIASES[canonical]) {
      const val = norm[toKey(alias)];
      if (val !== undefined && String(val).trim() !== "") {
        out[canonical] = val;
        break;
      }
    }
  }

  // completar doc si viene como columna específica (rut/dni/pasaporte/cedula)
  if (!out.numero_documento || !out.tipo_documento) {
    for (const [col, tipo] of Object.entries(DOC_COLUMNS)) {
      const v = norm[toKey(col)];
      if (v !== undefined && String(v).trim() !== "") {
        if (!out.numero_documento) out.numero_documento = v;
        if (!out.tipo_documento) out.tipo_documento = tipo;
        break;
      }
    }
  }
  return out;
}

function normalizeFechaIngreso(v) {
  let fecha = String(v ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  if (!isNaN(Number(fecha)) && fecha !== "") {
    try {
      const d = XLSX.SSF.parse_date_code(Number(fecha));
      if (d && d.y && d.m && d.d) {
        const mm = String(d.m).padStart(2, "0");
        const dd = String(d.d).padStart(2, "0");
        return `${d.y}-${mm}-${dd}`;
      }
    } catch {}
  }
  return fecha;
}
// ----------------------------------------------------------------

function CargarAlumno() {
  const [rows, setRows] = useState([]);
  const [detectedCols, setDetectedCols] = useState([]);
  const [badRows, setBadRows] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token") || "";

  useEffect(() => {
    cargarAlumnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarAlumnos() {
    try {
      setError("");
      const { data } = await axios.get(`${API_BASE}/alumnos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlumnos(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.response?.data?.msg || "No se pudo cargar la lista de alumnos.");
      setAlumnos([]);
    }
  }

  // 🚀 Descargar plantilla (sin contraseña) — usa dominio permitido
  function downloadTemplate() {
    const headers = [
      "correo",
      "nombre",
      "apellido",
      "tipo_documento",
      "numero_documento",
      "fechaIngreso",
      "telefono",
      "semestre",
      "jornada",
    ];

    // En la función downloadTemplate, cambiar el ejemplo para usar un dominio genérico
    const ejemplo = [
      [
        "alumno1@ejemplo.com", // dominio libre
        "Juan",
        "Pérez",
        "RUT",
        "12345678-9",
        "2025-03-01",
        "+56912345678",
        1,
        "Mañana",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...ejemplo]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "alumnos");

    // También, actualizar las instrucciones si es necesario
    const ayuda = XLSX.utils.aoa_to_sheet([
      ["Instrucciones"],
      ["- No cambies los encabezados."],
      ["- Formato fechaIngreso: YYYY-MM-DD (ej: 2025-03-01)"],
      ["- telefono: 8–12 dígitos, puede iniciar con + (ej: +56912345678)"],
      ["- semestre: 1 o 2"],
      ["- jornada: Mañana | Tarde | Vespertino | Viernes | Sábados | Blearning | Online | Otras"],
      ["- correo: cualquier dominio válido (ej: gmail.com, hotmail.com, institucional.cl, etc.)"], // Agregar nota sobre dominio libre
    ]);
    XLSX.utils.book_append_sheet(wb, ayuda, "ayuda");

    const colWidths = headers.map((h) => ({ wch: Math.max(12, h.length + 2) }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, "plantilla_carga_alumnos.xlsx");
  }

  function onFile(e) {
    const f = e.target.files?.[0];
    setResultado(null);
    setBadRows([]);
    setProgreso(0);
    setError("");
    setDetectedCols([]);
    setRows([]);
    if (!f) return;

    (async () => {
      try {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const headersRaw = XLSX.utils.sheet_to_json(ws, { header: 1 })?.[0] || [];
        setDetectedCols(headersRaw.map(String));

        const normalized = json.map((r) => canonicalizeRow(r));
        setRows(normalized);
      } catch (err) {
        console.error(err);
        setError("No se pudo leer el archivo Excel.");
      }
    })();
  }

  const headersOk = useMemo(() => {
    if (!rows.length) return false;
    const present = new Set();
    rows.forEach((r) => Object.keys(r).forEach((k) => present.add(k)));
    return REQUIRED.every((k) => present.has(k));
  }, [rows]);

  function validarFila(r) {
    const errs = [];
    for (const k of REQUIRED) if (String(r[k] ?? "").trim() === "") errs.push(`Falta "${k}"`);

    const sem = Number(r.semestre);
    if (![1, 2].includes(sem)) errs.push("semestre debe ser 1 o 2");

    if (!JORNADAS.includes(String(r.jornada).trim()))
      errs.push(`jornada no válida (use: ${JORNADAS.join(", ")})`);

    const tel = String(r.telefono).trim();
    if (!TEL_RE.test(tel)) errs.push("telefono no válido (8–12 dígitos, opcional +)");

    const f = normalizeFechaIngreso(r.fechaIngreso);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) errs.push("fechaIngreso inválida (usa YYYY-MM-DD)");

    return errs;
  }

  async function enviarFila(r) {
    const payload = {
      correo: String(r.correo).trim().toLowerCase(),
      nombre: String(r.nombre).trim(),
      apellido: String(r.apellido).trim(),
      tipo_documento: String(r.tipo_documento).trim(),
      numero_documento: String(r.numero_documento).trim(),
      fechaIngreso: normalizeFechaIngreso(r.fechaIngreso),
      telefono: String(r.telefono).trim(),
      semestre: Number(r.semestre),
      jornada: String(r.jornada).trim(),
    };

    const token = localStorage.getItem("token") || "";
    const { data } = await axios.post(`${API_BASE}/registro`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  }

  async function subir(e) {
    e.preventDefault();
    if (!rows.length) {
      setError("Primero selecciona un Excel válido.");
      return;
    }
    if (!headersOk) {
      setError(`Columnas inválidas. Se esperan: ${REQUIRED.join(", ")}`);
      return;
    }

    const prelim = [];
    rows.forEach((r, i) => {
      const errs = validarFila(r);
      if (errs.length) prelim.push({ index: i, errores: errs.join("; ") });
    });
    setBadRows(prelim);

    setSubiendo(true);
    setProgreso(0);
    setResultado(null);
    setError("");

    const maxConcurrency = 4;
    let inFlight = 0,
      i = 0,
      done = 0;
    const oks = [],
      fails = [];

    await new Promise((resolve) => {
      const pump = () => {
        while (inFlight < maxConcurrency && i < rows.length) {
          const idx = i++;
          const row = rows[idx];
          inFlight++;
          (async () => {
            try {
              await enviarFila(row);
              oks.push(idx);
            } catch (err) {
              const msg =
                err?.response?.data?.msg ||
                err?.message ||
                "Error desconocido";
              fails.push({ index: idx, msg });
            } finally {
              done++;
              inFlight--;
              setProgreso(Math.round((done / rows.length) * 100));
              if (done === rows.length) resolve();
              else pump();
            }
          })();
        }
      };
      pump();
    });

    setResultado({
      exitosos: oks.length,
      fallidos: fails.length,
      errores: fails
        .sort((a, b) => a.index - b.index)
        .map((e) => ({ fila: e.index + 2, error: e.msg })),
    });

    setSubiendo(false);
    cargarAlumnos();
  }

  return (
    <div className="cargar-container">
      <h2>Cargar alumnos desde archivo Excel</h2>

      <form className="cargar-form" onSubmit={subir}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={downloadTemplate}>
            Descargar plantilla
          </button>
          <input type="file" accept=".xlsx,.xls" onChange={onFile} />
          <button type="submit" disabled={!rows.length || subiendo}>
            {subiendo ? `Subiendo… ${progreso}%` : "Subir Archivo"}
          </button>
        </div>
      </form>

      {!!error && (
        <p style={{ color: "#b91c1c", marginTop: 12 }}>
          {error}
        </p>
      )}

      {!!badRows.length && (
        <div style={{ marginTop: 12, color: "#92400e" }}>
          <b>Validaciones previas:</b>
          <ul style={{ marginTop: 6 }}>
            {badRows.slice(0, 10).map((b, i) => (
              <li key={i}>
                Fila {b.index + 2}: {b.errores}
              </li>
            ))}
            {badRows.length > 10 && <li>… y {badRows.length - 10} más</li>}
          </ul>
        </div>
      )}

      {resultado && (
        <div style={{ marginTop: 12 }}>
          <b>Resultado:</b>{" "}
          <span style={{ color: "#065f46" }}>exitosos {resultado.exitosos}</span>{" "}
          — <span style={{ color: "#7c2d12" }}>fallidos {resultado.fallidos}</span>
          {resultado.errores?.length ? (
            <details style={{ marginTop: 8 }}>
              <summary>Ver errores</summary>
              <ul style={{ marginTop: 6 }}>
                {resultado.errores.map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.error}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      )}

      <hr style={{ margin: "16px 0" }} />

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
              <th>Creado</th>
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a, i) => (
              <tr key={a._id || i}>
                <td>{a.correo}</td>
                <td>{a.nombre}</td>
                <td>{a.apellido}</td>
                <td>{a.numero_documento}</td>
                <td>{a.semestre ?? "-"}</td>
                <td>{a.jornada || "-"}</td>
                <td>{getAnio(a) || "-"}</td>
                <td>
                  {a.createdAt
                    ? new Date(a.createdAt).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                      })
                    : "-"}
                </td>
              </tr>
            ))}
            {!alumnos.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#6e7a86" }}>
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

export default CargarAlumno;