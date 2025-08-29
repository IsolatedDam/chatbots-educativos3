import React, { useState, useEffect } from "react";
import "../styles/PanelProfesor.css";

const API_BASE = "https://chatbots-educativos3.onrender.com/api";

/* ===== Helpers de riesgo (fallback si el back no lo deriva) ===== */
function calcRiesgoFE(vence) {
  if (!vence) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const end = new Date(vence); end.setHours(0,0,0,0);
  const diff = (end - hoy) / 86400000;
  if (diff < 0) return "rojo";
  if (diff <= 10) return "amarillo";
  return "verde";
}
function riesgoMensajeFE(r) {
  if (r === "amarillo") return "AMARILLO = suspensión en 10 días";
  if (r === "rojo") return "ROJO = suspendido, por favor pasar por secretaría";
  return "Suscripción activa";
}
function RiesgoPill({ riesgo }) {
  const r = (riesgo || "").toLowerCase();
  const bg = r === "verde" ? "#27ae60" : r === "amarillo" ? "#f1c40f" : r === "rojo" ? "#c0392b" : "#95a5a6";
  const label = r ? r.toUpperCase() : "—";
  return (
    <span style={{ background: bg, color: "#fff", padding: "4px 10px", borderRadius: 999, fontWeight: 700 }}>
      {label}
    </span>
  );
}

/* === Texto para la columna de Riesgo === */
function riesgoTextoTabla(a) {
  const r = String(
    a?.riesgo ??
    a?.color_riesgo ??
    a?.riesgo_color ??                       // por si quedó otra variante
    calcRiesgoFE(a?.suscripcionVenceEl) ??
    ""
  ).toLowerCase();

  if (a?.habilitado === false || r === "rojo") return "Suspendido";
  if (r === "amarillo") return "Suspensión en 10 días";
  if (r === "verde") return "Habilitado";
  return "—";
}

export default function PanelProfesor() {
  // === Estado principal ===
  const [vistaActiva, setVistaActiva] = useState("datos"); // 'inicio' | 'datos' | 'chatbots'
  const [alumnos, setAlumnos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal de edición
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);

  // === Permisos del usuario logueado ===
  const me = JSON.parse(localStorage.getItem("usuario") || "{}");
  const role = String(me?.rol || "").toLowerCase();
  const permisos = Array.isArray(me?.permisos) ? me.permisos : [];

  // Estado/Vence: SOLO admin/superadmin
  const canEditEstado = role === "superadmin" || role === "admin";
  // Riesgo: admin/superadmin/profesor
  const canEditRiesgo = ["superadmin", "admin", "profesor"].includes(role);
  // Borrar alumno (opcional)
  const canDeleteAlumno =
    role === "superadmin" ||
    role === "admin" ||
    (role === "profesor" && permisos.includes("alumnos:eliminar"));

  // === Cerrar sesión ===
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // === Cargar alumnos desde backend ===
  async function fetchAlumnos(q = "") {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = `${API_BASE}/alumnos${q ? `?q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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
    if (vistaActiva === "datos") fetchAlumnos("");
  }, [vistaActiva]);

  // === Abrir / cerrar modal ===
  const openEdit = (alumno) => {
    const riesgoInit =
      alumno.riesgo ??
      alumno.color_riesgo ??
      alumno.riesgo_color ??
      calcRiesgoFE(alumno.suscripcionVenceEl) ??
      "";
    setEditDraft({
      ...alumno,
      documento: alumno.numero_documento ?? alumno.rut ?? "",
      habilitado: alumno.habilitado ?? true,
      suscripcionVenceEl: alumno.suscripcionVenceEl || "", // ISO o 'YYYY-MM-DD'
      riesgo: riesgoInit,
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditDraft(null);
  };

  // === Guardar cambios alumno (incluye riesgo y lógica de estado) ===
  async function handleSave() {
    if (!editDraft?._id) return;
    try {
      const token = localStorage.getItem("token");

      // Normaliza riesgo
      const riesgoLC = String(editDraft.riesgo || "").toLowerCase();
      const riesgoValido = ["verde", "amarillo", "rojo"].includes(riesgoLC) ? riesgoLC : "";

      // Si el profe no puede tocar Estado, se deriva desde el color de riesgo
      let nextHabilitado = !!editDraft.habilitado;
      if (!canEditEstado && canEditRiesgo) {
        nextHabilitado = riesgoValido === "rojo" ? false : true;
      }

      const payload = {
        nombre: editDraft.nombre,
        apellido: editDraft.apellido,
        anio: editDraft.anio !== "" ? Number(editDraft.anio) : undefined,
        semestre: editDraft.semestre !== "" ? Number(editDraft.semestre) : undefined,
        jornada: editDraft.jornada,

        habilitado: nextHabilitado, // ← deriva desde riesgo si el profe no puede tocar estado

        suscripcionVenceEl:
          editDraft.suscripcionVenceEl
            ? (editDraft.suscripcionVenceEl.length === 10
                ? `${editDraft.suscripcionVenceEl}T00:00:00.000Z`
                : editDraft.suscripcionVenceEl)
            : undefined,

        // Enviamos ambos nombres por compatibilidad
        riesgo: riesgoValido || undefined,
        color_riesgo: riesgoValido || undefined,

        // Documento (normaliza en ambas):
        numero_documento: editDraft.documento ?? editDraft.numero_documento ?? editDraft.rut,
        rut: editDraft.documento ?? editDraft.numero_documento ?? editDraft.rut,
      };

      const res = await fetch(`${API_BASE}/alumnos/${editDraft._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Error al guardar cambios";
        try { const j = await res.json(); if (j?.msg) msg = j.msg; } catch {}
        throw new Error(msg);
      }

      const updated = await res.json();
      setAlumnos((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
      closeEdit();
    } catch (err) {
      alert(err.message || "No se pudo guardar.");
    }
  }

  // === Eliminar alumno ===
  async function handleDelete(id) {
    if (!canDeleteAlumno) {
      alert("No tienes permiso para eliminar alumnos.");
      return;
    }
    if (!window.confirm("¿Eliminar alumno?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/alumnos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let msg = "Error al eliminar";
        try { const j = await res.json(); if (j?.msg) msg = j.msg; } catch {}
        throw new Error(`${msg} (HTTP ${res.status})`);
      }

      setAlumnos((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  // === UI helpers para "datos" ===
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
        <button className="btn btn-ghost" onClick={() => onBuscar(search)}>Buscar</button>
        <button className="btn btn-ghost" onClick={() => { setSearch(""); onRefrescar(); }}>Refrescar</button>
      </div>
    );
  }

  function TablaListado() {
    const rows = alumnos;
    return (
      <div className="table-wrap datos-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>RUT/DNI</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Año</th>
              <th>Semestre</th>
              <th>Jornada</th>
              <th>Estado</th>
              <th>Riesgo</th>
              <th>Vence</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="99">Cargando…</td></tr>
            ) : rows.length ? (
              rows.map((a) => {
                const riesgoBase = (
                  a.riesgo ??
                  a.color_riesgo ??
                  a.riesgo_color ??
                  calcRiesgoFE(a.suscripcionVenceEl) ??
                  ""
                );
                const venceStr = a.suscripcionVenceEl ? String(a.suscripcionVenceEl).slice(0, 10) : "—";
                return (
                  <tr key={a._id}>
                    <td>{a.numero_documento ?? a.rut ?? "-"}</td>
                    <td>{a.nombre ?? "-"}</td>
                    <td>{a.apellido ?? "-"}</td>
                    <td>{a.anio ?? "-"}</td>
                    <td>{a.semestre ?? "-"}</td>
                    <td>{a.jornada ?? "-"}</td>
                    <td>{a.habilitado === false ? "Suspendido" : "Activo"}</td>

                    {/* === Columna de Riesgo con el texto solicitado === */}
                    <td title={riesgoMensajeFE(String(riesgoBase).toLowerCase())}>
                      {riesgoTextoTabla(a)}
                    </td>

                    <td>{venceStr}</td>
                    <td className="cell-actions">
                      <button className="btn btn-primary" onClick={() => openEdit(a)}>Editar</button>
                      {canDeleteAlumno && (
                        <button className="btn btn-danger" onClick={() => handleDelete(a._id)} style={{ marginLeft: 8 }}>
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="99">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  const liClass = (key) => (vistaActiva === key ? "active" : "");

  return (
    <div className="admin-panel">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2>Panel Profesor</h2>
        <ul>
          <li className={liClass("inicio")} onClick={() => setVistaActiva("inicio")}>Página Chatbots</li>
          <li className={liClass("datos")} onClick={() => setVistaActiva("datos")}>Datos del alumno</li>
          <li className={liClass("chatbots")} onClick={() => setVistaActiva("chatbots")}>Acceso a chatbots</li>
          <li>Carga masiva</li>
        </ul>
        <div style={{ marginTop: "auto", padding: "1rem" }}>
          <div className="kicker" style={{ marginBottom: 8, opacity: 0.8 }}>
            Rol: <b>{role || "—"}</b>
          </div>
          <button className="btn btn-danger" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
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

        {vistaActiva === "datos" && (
          <section className="section">
            <h3>Datos del alumno</h3>
            <BarraBusqueda onBuscar={(q) => fetchAlumnos(q)} onRefrescar={() => fetchAlumnos("")} />
            <TablaListado />
          </section>
        )}

        {vistaActiva === "chatbots" && (
          <section className="section">
            <h3>Acceso a chatbots</h3>
            <div className="toolbar">
              <select className="select" defaultValue="">
                <option value="" disabled>Selecciona chatbot…</option>
                <option value="chatbotA">Chatbot A</option>
                <option value="chatbotB">Chatbot B</option>
              </select>
              <select className="select" defaultValue="">
                <option value="" disabled>Ámbito…</option>
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
      </main>

      {editOpen && (
        <EditAlumnoModal
          draft={editDraft}
          setDraft={setEditDraft}
          onClose={closeEdit}
          onSave={handleSave}
          canEditEstado={canEditEstado}
          canEditRiesgo={canEditRiesgo}
        />
      )}
    </div>
  );
}

/* ===================== Modal de edición ===================== */
function EditAlumnoModal({ draft, setDraft, onClose, onSave, canEditEstado, canEditRiesgo }) {
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

  // Vista previa del riesgo (usa lo que eligió el profe; si vacío, deriva por fecha)
  const riesgo = (draft.riesgo || calcRiesgoFE(draft.suscripcionVenceEl) || "").toLowerCase();
  const riesgoMsg = riesgoMensajeFE(riesgo);
  const riesgoBg = riesgo === "verde" ? "#27ae60" : riesgo === "amarillo" ? "#f1c40f" : riesgo === "rojo" ? "#c0392b" : "#95a5a6";

  return (
    <div className="modal" onMouseDown={onClose} aria-modal="true" role="dialog">
      <div className="modal-contenido" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
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

          {/* Estado de cuenta (bloqueado para profesor; admin/superadmin lo editan directo) */}
          <label className="field">
            <span>Estado de cuenta</span>
            <select
              value={String(draft.habilitado !== false)}
              onChange={(e) => setDraft({ ...draft, habilitado: e.target.value === "true" })}
              disabled={!canEditEstado}
              title={!canEditEstado ? "El profesor modifica el estado cambiando el color de riesgo" : undefined}
            >
              <option value="true">Activo</option>
              <option value="false">Suspendido</option>
            </select>
            {!canEditEstado && (
              <small className="kicker">
                Para cambiar el estado, selecciona el <b>Color de riesgo</b>.
              </small>
            )}
          </label>

          {/* Vencimiento de suscripción (solo admin/superadmin) */}
          <label className="field">
            <span>Vence el</span>
            <input
              type="date"
              value={(draft.suscripcionVenceEl || "").slice(0, 10)}
              onChange={(e) => setDraft({ ...draft, suscripcionVenceEl: e.target.value })}
              disabled={!canEditEstado}
              title={!canEditEstado ? "Solo admin/superadmin puede modificar" : undefined}
            />
          </label>

          {/* === Color de riesgo (editable por profesor) === */}
          <label className="field">
            <span>Color de riesgo</span>
            <select
              value={draft.riesgo || ""}
              onChange={(e) => setDraft({ ...draft, riesgo: e.target.value })}
              disabled={!canEditRiesgo}
              title={!canEditRiesgo ? "No tienes permiso" : undefined}
            >
              <option value="">Sin definir</option>
              <option value="verde">Verde</option>
              <option value="amarillo">Amarillo</option>
              <option value="rojo">Rojo</option>
            </select>
            <small className="kicker">
              <b>ROJO</b> suspende la cuenta al guardar. <b>VERDE/AMARILLO</b> la dejan activa.
            </small>
          </label>

          {/* Vista previa + mensaje */}
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Vista previa de riesgo</span>
            <div
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: 999,
                background: riesgoBg,
                color: "#fff",
                fontWeight: 700,
                marginRight: 8,
              }}
            >
              {(riesgo || "—").toString().toUpperCase()}
            </div>
            <small style={{ opacity: 0.8 }}>{riesgoMsg}</small>
          </div>
        </div>

        <div className="modal-botones" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onSave}>Guardar</button>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}