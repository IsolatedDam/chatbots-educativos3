// src/components/PanelProfesor.jsx
import React, { useState, useEffect } from "react";
import "../styles/PanelProfesor.css";

export default function PanelProfesor() {
  // 'inicio' | 'datos' | 'chatbots' | 'riesgos' | 'alumnos'
  const [vistaActiva, setVistaActiva] = useState("inicio");
  const [alumnos, setAlumnos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal de edición
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);

  // === Cerrar sesión (igual que admin) ===
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // === Cargar alumnos desde backend ===
  async function fetchAlumnos(q = "") {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/alumnos?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("No autorizado");
      const data = await res.json();
      setAlumnos(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message || "No se pudieron cargar alumnos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (vistaActiva === "alumnos" || vistaActiva === "datos") {
      fetchAlumnos("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistaActiva]);

  // === Abrir / cerrar modal ===
  const openEdit = (alumno) => {
    setEditDraft({
      ...alumno,
      documento: alumno.numero_documento ?? alumno.rut ?? "",
    });
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditOpen(false);
    setEditDraft(null);
  };

  // === Guardar cambios alumno (desde modal) ===
  async function handleSave() {
    if (!editDraft?._id) return;
    try {
      const token = localStorage.getItem("token");
      const payload = { ...editDraft };

      if (payload.documento != null) {
        payload.numero_documento = payload.documento;
        payload.rut = payload.documento;
        delete payload.documento;
      }
      if (payload.anio !== undefined && payload.anio !== "") {
        payload.anio = Number(payload.anio);
      }
      if (payload.semestre !== undefined && payload.semestre !== "") {
        payload.semestre = Number(payload.semestre);
      }

      const res = await fetch(
        `http://localhost:5000/api/alumnos/${editDraft._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Error al guardar cambios");
      const updated = await res.json();

      setAlumnos((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      closeEdit();
    } catch (err) {
      alert(err.message || "No se pudo guardar.");
    }
  }

  // === Eliminar alumno (si luego lo cambias a deshabilitar, ajusta aquí) ===
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

  // === UI helpers para "datos" y "alumnos" ===
  function BarraBusqueda({ onBuscar, onRefrescar }) {
    return (
      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por nombre, apellido, RUT/DNI"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="spacer" />
        <button className="btn btn-ghost" onClick={() => onBuscar(search)}>
          Buscar
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setSearch("");
            onRefrescar();
          }}
        >
          Refrescar
        </button>
      </div>
    );
  }

  function TablaListado() {
    const rows = alumnos;
    return (
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
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="99">Cargando…</td>
              </tr>
            ) : rows.length ? (
              rows.map((a) => (
                <tr key={a._id}>
                  <td>{a.numero_documento ?? a.rut ?? "-"}</td>
                  <td>{a.nombre ?? "-"}</td>
                  <td>{a.apellido ?? "-"}</td>
                  <td>{a.anio ?? "-"}</td>
                  <td>{a.semestre ?? "-"}</td>
                  <td>{a.jornada ?? "-"}</td>
                  <td className="cell-actions">
                    <button className="btn btn-primary" onClick={() => openEdit(a)}>
                      Editar
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(a._id)}
                      style={{ marginLeft: 8 }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="99">Sin resultados</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const liClass = (key) => (vistaActiva === key ? "active" : "");

  return (
    <div className="admin-panel">
      {/* === Sidebar === */}
      <aside className="admin-sidebar">
        <h2>Panel Profesor</h2>
        <ul>
          {/* Acceso directo a la página de chatbots (iframe) */}
          <li className={liClass("inicio")} onClick={() => setVistaActiva("inicio")}>
            Página Chatbots
          </li>

          <li className={liClass("datos")} onClick={() => setVistaActiva("datos")}>
            Datos del alumno
          </li>
          <li className={liClass("chatbots")} onClick={() => setVistaActiva("chatbots")}>
            Acceso a chatbots
          </li>
          <li className={liClass("riesgos")} onClick={() => setVistaActiva("riesgos")}>
            Alertas de riesgo
          </li>
          <li className={liClass("alumnos")} onClick={() => setVistaActiva("alumnos")}>
            Administrar alumnos
          </li>
          <li>Crear chatbot</li>
          <li>Subir material</li>
          <li>Carga masiva</li>
        </ul>

        {/* Botón de cerrar sesión fijo abajo */}
        <div style={{ marginTop: "auto", padding: "1rem" }}>
          <button className="btn btn-danger" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* === Main === */}
      <main className="admin-main">
        {/* IFRAME PÁGINA CHATBOTS */}
        {vistaActiva === "inicio" && (
          <div className="iframe-wrapper" style={{ width: "100%", height: "80vh" }}>
            <iframe
              src="https://inquisitive-concha-7da15f.netlify.app/"
              style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
              allowFullScreen
              title="IframePanelProfesor"
            />
          </div>
        )}

        {/* DATOS DEL ALUMNO */}
        {vistaActiva === "datos" && (
          <section className="section">
            <h3>Datos del alumno</h3>
            <BarraBusqueda onBuscar={(q) => fetchAlumnos(q)} onRefrescar={() => fetchAlumnos("")} />
            <TablaListado />
          </section>
        )}

        {/* ACCESO A CHATBOTS (placeholder) */}
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

        {/* ALERTAS */}
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

        {/* ADMINISTRAR ALUMNOS */}
        {vistaActiva === "alumnos" && (
          <section className="section">
            <h3>Administrar alumnos</h3>
            <BarraBusqueda onBuscar={(q) => fetchAlumnos(q)} onRefrescar={() => fetchAlumnos("")} />
            <TablaListado />
          </section>
        )}
      </main>

      {/* ===== Modal de edición ===== */}
      {editOpen && (
        <EditAlumnoModal
          draft={editDraft}
          setDraft={setEditDraft}
          onClose={closeEdit}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

/* ===================== Modal de edición ===================== */
function EditAlumnoModal({ draft, setDraft, onClose, onSave }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!draft) return null;

  const bind = (key) => ({
    value: draft[key] ?? "",
    onChange: (e) => setDraft({ ...draft, [key]: e.target.value }),
  });

  const bindDocumento = () => ({
    value: draft.documento ?? draft.numero_documento ?? draft.rut ?? "",
    onChange: (e) =>
      setDraft({
        ...draft,
        documento: e.target.value,
        numero_documento: e.target.value,
        rut: e.target.value,
      }),
  });

  return (
    <div className="modal" onMouseDown={onClose} aria-modal="true" role="dialog">
      <div
        className="modal-contenido"
        onMouseDown={(e) => e.stopPropagation() }
        style={{ maxWidth: 720 }}
      >
        <h3>Editar alumno</h3>

        <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="field">
            <span>RUT / DNI</span>
            <input {...bindDocumento()} placeholder="11111111-1" />
          </label>
          <label className="field">
            <span>Nombre</span>
            <input {...bind("nombre")} placeholder="Nombre" />
          </label>
          <label className="field">
            <span>Apellido</span>
            <input {...bind("apellido")} placeholder="Apellido" />
          </label>
          <label className="field">
            <span>Año</span>
            <input {...bind("anio")} placeholder="2025" />
          </label>
          <label className="field">
            <span>Semestre</span>
            <input {...bind("semestre")} placeholder="1" />
          </label>
          <label className="field">
            <span>Jornada</span>
            <input {...bind("jornada")} placeholder="Vespertino" />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }} />
        </div>

        <div className="modal-botones" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onSave}>
            Guardar
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}