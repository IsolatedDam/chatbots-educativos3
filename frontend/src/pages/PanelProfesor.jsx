import React, { useState, useEffect, useRef } from "react";
import { decryptLocalPassword } from "../utils/localVault"; // ⬅️ si no lo usas, puedes quitar esta línea
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
/* Texto para la columna de Riesgo */
function riesgoTextoTabla(a) {
  const r = String(
    a?.riesgo ??
    a?.color_riesgo ??
    a?.riesgo_color ??
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
  const [vistaActiva, setVistaActiva] = useState("cuenta"); // ← Mi cuenta por defecto
  const [alumnos, setAlumnos] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // Selección múltiple
  const [selected, setSelected] = useState(new Set());

  // Modal de edición
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(null);

  // === Usuario logueado / permisos ===
  const me = JSON.parse(localStorage.getItem("usuario") || "{}");
  const role = String(me?.rol || "").toLowerCase();
  const permisos = Array.isArray(me?.permisos) ? me.permisos : [];

  const canEditEstado = role === "superadmin" || role === "admin";
  const canEditRiesgo = ["superadmin", "admin", "profesor"].includes(role);
  const canDeleteAlumno =
    role === "superadmin" ||
    role === "admin" ||
    (role === "profesor" && permisos.includes("alumnos:eliminar"));

  // ====== “Mi cuenta”: contraseña con ojito (lee y DESCIFRA localStorage.password_enc) ======
  const [pwdVisible, setPwdVisible] = useState(false);
  const [storedPwd, setStoredPwd] = useState("");

  useEffect(() => {
    (async () => {
      const enc = localStorage.getItem("password_enc");
      const salt = me?._id || me?.correo || me?.id || "anon";
      if (enc && decryptLocalPassword) {
        try {
          const dec = await decryptLocalPassword(enc, salt);
          setStoredPwd(dec || "");
        } catch { setStoredPwd(""); }
      } else {
        const plain =
          localStorage.getItem("password") ||
          localStorage.getItem("pwd") ||
          localStorage.getItem("pass") ||
          "";
        setStoredPwd(plain);
      }
    })();
  }, [me?._id, me?.correo, me?.id]);

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
      setSelected(new Set()); // limpia selección al refrescar
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

  // === Guardar cambios alumno ===
  async function handleSave() {
    if (!editDraft?._id) return;
    try {
      const token = localStorage.getItem("token");
      const riesgoLC = String(editDraft.riesgo || "").toLowerCase();
      const riesgoValido = ["verde", "amarillo", "rojo"].includes(riesgoLC) ? riesgoLC : "";

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
        habilitado: nextHabilitado,
        suscripcionVenceEl:
          editDraft.suscripcionVenceEl
            ? (editDraft.suscripcionVenceEl.length === 10
                ? `${editDraft.suscripcionVenceEl}T00:00:00.000Z`
                : editDraft.suscripcionVenceEl)
            : undefined,
        // compat para tu backend
        riesgo: riesgoValido || undefined,
        color_riesgo: riesgoValido || undefined,
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

  // === Eliminar alumno (individual) ===
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
      setSelected(prev => {
        const n = new Set(prev); n.delete(id); return n;
      });
    } catch (err) {
      alert(err.message);
    }
  }

  // === Eliminación MASIVA (robusta con fallback) ===
  async function handleBulkDelete() {
    if (!canDeleteAlumno) {
      alert("No tienes permiso para eliminar alumnos.");
      return;
    }
    const ids = Array.from(selected);
    if (!ids.length) {
      alert("No hay alumnos seleccionados.");
      return;
    }
    if (!window.confirm(`¿Eliminar ${ids.length} alumno(s)? Esta acción no se puede deshacer.`)) return;

    const token = localStorage.getItem("token");

    // Fallback: borrar uno a uno y devolver los que realmente se eliminaron
    const borrarUnoAUno = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const calls = ids.map(id =>
        fetch(`${API_BASE}/alumnos/${id}`, { method: "DELETE", headers })
          .then(async (r) => {
            if (!r.ok) {
              let reason = `HTTP ${r.status}`;
              try { const jj = await r.json(); if (jj?.msg) reason = jj.msg; } catch {}
              throw new Error(reason);
            }
            return id;
          })
      );
      const results = await Promise.allSettled(calls);
      const okIds = results
        .map((r, i) => (r.status === "fulfilled" ? ids[i] : null))
        .filter(Boolean);
      const fail = results.length - okIds.length;

      setAlumnos(prev => prev.filter(a => !okIds.includes(a._id)));
      setSelected(new Set());
      alert(`Eliminados: ${okIds.length}${fail ? ` — Fallidos: ${fail} (ver consola)` : ""}`);
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`❌ Falló eliminar ID=${ids[i]} →`, r.reason);
        }
      });
    };

    try {
      // Intento 1: endpoint masivo
      const res = await fetch(`${API_BASE}/alumnos/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids }),
      });

      const raw = await res.text();
      let data; try { data = JSON.parse(raw); } catch { data = { raw }; }

      if (res.ok) {
        // Si el backend devuelve ids, usamos esos; si no, asumimos que fueron todos
        const deletedIds = Array.isArray(data?.ids) ? data.ids : ids;
        setAlumnos(prev => prev.filter(a => !deletedIds.includes(a._id)));
        setSelected(new Set());
        alert(`Se eliminaron ${Number(data?.deleted ?? deletedIds.length)} alumno(s).`);
        return;
      }

      // Si la ruta no existe o el método no está permitido → fallback
      if (res.status === 404 || res.status === 405) {
        console.warn("bulk-delete no disponible:", res.status, data);
        await borrarUnoAUno();
        return;
      }

      // Otros errores con mensaje del server si lo hay
      throw new Error(data?.msg || `Error en eliminación masiva (HTTP ${res.status})`);
    } catch (err) {
      console.error("Bulk delete error:", err);
      // Error de red/CORS → fallback
      if (String(err.message || "").toLowerCase().includes("failed to fetch")) {
        await borrarUnoAUno();
      } else {
        alert(err.message || "Error en eliminación masiva");
      }
    }
  }

  // Toggle selección
  const toggleRow = (id) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const selectAllCurrent = () => {
    setSelected(prev => {
      const allIds = alumnos.map(a => a._id);
      const allSelected = alumnos.length > 0 && alumnos.every(a => prev.has(a._id));
      return allSelected ? new Set() : new Set(allIds);
    });
  };

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

        {/* Barra de acciones masivas */}
        {canDeleteAlumno && (
          <div style={{ marginLeft: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ opacity: 0.8 }}>
              Seleccionados: <b>{selected.size}</b>
            </span>
            <button
              className="btn btn-danger"
              disabled={selected.size === 0}
              onClick={handleBulkDelete}
              title="Eliminar alumnos seleccionados"
            >
              Eliminar seleccionados
            </button>
          </div>
        )}
      </div>
    );
  }

  function TablaListado() {
    const rows = alumnos;
    const hdrChkRef = useRef(null);

    const allSelected = rows.length > 0 && rows.every(a => selected.has(a._id));
    const noneSelected = rows.every(a => !selected.has(a._id));
    const someSelected = !allSelected && !noneSelected;

    useEffect(() => {
      if (hdrChkRef.current) hdrChkRef.current.indeterminate = someSelected;
    }, [someSelected, rows, selected]);

    return (
      <div className="table-wrap datos-table-wrap">
        <table className="table">
          <thead>
            <tr>
              {/* columna selección */}
              <th style={{ width: 36, textAlign: "center" }}>
                <input
                  ref={hdrChkRef}
                  type="checkbox"
                  checked={allSelected && !someSelected}
                  onChange={selectAllCurrent}
                  title={allSelected ? "Quitar selección" : "Seleccionar todos"}
                />
              </th>
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
                const checked = selected.has(a._id);
                return (
                  <tr key={a._id}>
                    {/* checkbox fila */}
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRow(a._id)}
                        title={checked ? "Quitar selección" : "Seleccionar fila"}
                      />
                    </td>
                    <td>{a.numero_documento ?? a.rut ?? "-"}</td>
                    <td>{a.nombre ?? "-"}</td>
                    <td>{a.apellido ?? "-"}</td>
                    <td>{a.anio ?? "-"}</td>
                    <td>{a.semestre ?? "-"}</td>
                    <td>{a.jornada ?? "-"}</td>
                    <td>{a.habilitado === false ? "Suspendido" : "Activo"}</td>
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
          {/* Mi cuenta primero */}
          <li className={liClass("cuenta")} onClick={() => setVistaActiva("cuenta")}>Mi cuenta</li>
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
          <section className="section">
            <div className="iframe-wrapper" style={{ width: "100%", height: "80vh" }}>
              <iframe
                src="https://inquisitive-concha-7da15f.netlify.app/"
                style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                allowFullScreen
                title="IframePanelProfesor"
              />
            </div>
          </section>
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

        {vistaActiva === "cuenta" && (
          <section className="section">
            <h3 style={{ textAlign: "center" }}>Mi cuenta</h3>
            {/* Tarjeta centrada */}
            <div className="account-card">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label className="field">
                  <span>Nombre</span>
                  <input value={me?.nombre || ""} readOnly />
                </label>
                <label className="field">
                  <span>Apellido</span>
                  <input value={me?.apellido || ""} readOnly />
                </label>
                <label className="field">
                  <span>Correo</span>
                  <input value={me?.correo || me?.email || ""} readOnly />
                </label>
                <label className="field">
                  <span>Rol</span>
                  <input value={role || ""} readOnly />
                </label>
              </div>

              <div className="field" style={{ marginTop: 16 }}>
                <span>Contraseña</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type={pwdVisible ? "text" : "password"}
                    value={storedPwd}
                    readOnly
                    placeholder="No disponible (no se guarda en el servidor)"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setPwdVisible((v) => !v)}
                    title={pwdVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-label={pwdVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={{ minWidth: 44 }}
                  >
                    {pwdVisible ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            </div>
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