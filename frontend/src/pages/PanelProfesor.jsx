// src/components/PanelProfesor.jsx
import React, { useState, useEffect } from "react";
import "../styles/PanelProfesor.css";

export default function PanelProfesor() {
  const [vistaActiva, setVistaActiva] = useState("alumnos");
  const [alumnos, setAlumnos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // === Cargar alumnos desde backend ===
  async function fetchAlumnos(q = "") {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/alumnos?q=${encodeURIComponent(q)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("No autorizado");
      const data = await res.json();
      setAlumnos(data);
    } catch (err) {
      alert(err.message || "No se pudieron cargar alumnos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (vistaActiva === "alumnos") fetchAlumnos("");
  }, [vistaActiva]);

  // === Guardar cambios alumno ===
  async function handleSave(alumno) {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/alumnos/${alumno._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(alumno),
        }
      );
      if (!res.ok) throw new Error("Error al guardar cambios");
      const updated = await res.json();
      setAlumnos((prev) =>
        prev.map((a) => (a._id === updated._id ? updated : a))
      );
    } catch (err) {
      alert(err.message);
    }
  }

  // === Eliminar alumno ===
  async function handleDelete(id) {
    if (!window.confirm("¿Eliminar alumno?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/alumnos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setAlumnos((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="admin-panel">
      {/* === Sidebar === */}
      <aside className="admin-sidebar">
        <h2>Panel Profesor</h2>
        <ul>
          <li
            className={vistaActiva === "datos" ? "active" : ""}
            onClick={() => setVistaActiva("datos")}
          >
            Datos del alumno
          </li>
          <li
            className={vistaActiva === "chatbots" ? "active" : ""}
            onClick={() => setVistaActiva("chatbots")}
          >
            Acceso a chatbots
          </li>
          <li
            className={vistaActiva === "riesgos" ? "active" : ""}
            onClick={() => setVistaActiva("riesgos")}
          >
            Alertas de riesgo
          </li>
          <li
            className={vistaActiva === "alumnos" ? "active" : ""}
            onClick={() => setVistaActiva("alumnos")}
          >
            Administrar alumnos
          </li>
          <li>Crear chatbot</li>
          <li>Subir material</li>
          <li>Carga masiva</li>
        </ul>
      </aside>

      {/* === Main === */}
      <main className="admin-main">
        {vistaActiva === "datos" && (
          <section className="section">
            <h3>Datos del alumno</h3>
            <input className="input" placeholder="Nombre del alumno" />
            <input className="input mt-12" placeholder="Apellido del alumno" />
          </section>
        )}

        {vistaActiva === "chatbots" && (
          <section className="section">
            <h3>Acceso a chatbots</h3>
            <div className="toolbar">
              <select className="select" defaultValue="">
                <option value="" disabled>
                  Selecciona chatbot…
                </option>
                <option value="chatbotA">Chatbot A</option>
                <option value="chatbotB">Chatbot B</option>
              </select>
              <select className="select" defaultValue="">
                <option value="" disabled>
                  Ámbito…
                </option>
                <option value="individual">Individual</option>
                <option value="grupo">Grupo/Masivo</option>
              </select>
              <div className="spacer" />
              <button className="btn btn-primary">Autorizar</button>
              <button className="btn btn-ghost">Desautorizar</button>
            </div>
            <p className="kicker">Cada chatbot puede tener N° o letra.</p>
          </section>
        )}

        {vistaActiva === "riesgos" && (
          <section className="section">
            <h3>Alertas de riesgo</h3>
            <div className="risk-grid">
              <button className="risk risk-verde">Verde</button>
              <button className="risk risk-amarillo">Amarillo</button>
              <button className="risk risk-rojo">Rojo</button>
            </div>
          </section>
        )}

        {vistaActiva === "alumnos" && (
          <section className="section">
            <h3>Administrar alumnos</h3>

            {/* === Barra búsqueda === */}
            <div className="toolbar">
              <input
                className="search"
                placeholder="Buscar por nombre, apellido, RUT, curso…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="spacer" />
              <button
                className="btn btn-ghost"
                onClick={() => fetchAlumnos(search)}
              >
                Buscar
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => fetchAlumnos("")}
              >
                Refrescar
              </button>
            </div>

            {/* === Tabla === */}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>RUT/DNI</th>
                    <th>Nombre</th>
                    <th>Apellido</th>
                    <th>Año</th>
                    <th>Semestre</th>
                    <th>Jornada</th>
                    <th>Curso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8">Cargando…</td>
                    </tr>
                  ) : alumnos.length ? (
                    alumnos.map((a) => (
                      <EditableRow
                        key={a._id}
                        row={a}
                        onSave={handleSave}
                        onDelete={() => handleDelete(a._id)}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8">Sin resultados</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* === Fila editable === */
function EditableRow({ row, onSave, onDelete }) {
  const [draft, setDraft] = useState(row);
  const [saving, setSaving] = useState(false);

  function bind(key) {
    return {
      value: draft[key] || "",
      onChange: (e) => setDraft({ ...draft, [key]: e.target.value }),
    };
  }

  async function handleSave() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  }

  return (
    <tr>
      <td>
        <input className="row-input" {...bind("rut")} placeholder="RUT" />
      </td>
      <td>
        <input className="row-input" {...bind("nombre")} placeholder="Nombre" />
      </td>
      <td>
        <input
          className="row-input"
          {...bind("apellido")}
          placeholder="Apellido"
        />
      </td>
      <td>
        <input className="row-input" {...bind("anio")} placeholder="Año" />
      </td>
      <td>
        <input
          className="row-input"
          {...bind("semestre")}
          placeholder="Semestre"
        />
      </td>
      <td>
        <input
          className="row-input"
          {...bind("jornada")}
          placeholder="Jornada"
        />
      </td>
      <td>
        <input className="row-input" {...bind("curso")} placeholder="Curso" />
      </td>
      <td className="cell-actions">
        <button
          className="btn btn-primary"
          disabled={saving}
          onClick={handleSave}
          style={{ marginRight: 8 }}
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button className="btn btn-danger" onClick={onDelete}>
          Eliminar
        </button>
      </td>
    </tr>
  );
}