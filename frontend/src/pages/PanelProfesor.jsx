import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import { decryptLocalPassword } from "../utils/localVault";
import "../styles/PanelProfesor.css";
import "../styles/CargarAlumnos.css";
import "../styles/RegistroAlumno.css";
import RegistroAlumno from "./RegistroAlumno";

const API_ROOT = "https://chatbots-educativos3.onrender.com";
const API_BASE = `${API_ROOT}/api`;

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

  // NUEVOS permisos (para acceso a Registro y Carga masiva)
  const canRegisterAlumno =
    role === "superadmin" ||
    role === "admin" ||
    (role === "profesor" && (permisos.includes("alumnos:registrar") || permisos.includes("alumnos:crear")));

  const canLoadMassive =
    role === "superadmin" ||
    role === "admin" ||
    (role === "profesor" && (permisos.includes("alumnos:carga_masiva") || permisos.includes("alumnos:registrar_masivo")));

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
          <li className={liClass("registro")} onClick={() => setVistaActiva("registro")}>Registrar alumno</li>
          {canLoadMassive && (
            <li className={liClass("carga")} onClick={() => setVistaActiva("carga")}>Carga masiva</li>
          )}
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


        {vistaActiva === "registro" && (
          <section className="section">
            <RegistroAlumno />
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

        {vistaActiva === "carga" && (
          canLoadMassive ? (
            <section className="section">
              <CargarAlumnosPanel />
            </section>
          ) : (
            <section className="section"><p>No tienes permiso para acceder a Carga masiva.</p></section>
          )
        )}

        {vistaActiva === "registro" && canRegisterAlumno && (
            <section className="section">
              <RegistroAlumnoPanel />
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
    <div className="modal" onMouseDown={onClose} aria-modal="true" role="dialog" aria-labelledby="edit-alumno-title">
      <div className="modal-contenido" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <h3 id="edit-alumno-title">Editar alumno</h3>

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

/* ===================== Sección: Carga masiva (misma lógica del Admin) ===================== */
function CargarAlumnosPanel() {
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
  const JORNADAS = ["Mañana", "Tarde", "Vespertino", "Viernes", "Sábados"];
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

  // 🚀 Descargar plantilla (sin contraseña)
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

    const ejemplo = [
      [
        "alumno1@ejemplo.com",
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

    const ayuda = XLSX.utils.aoa_to_sheet([
      ["Instrucciones"],
      ["- No cambies los encabezados."],
      ["- Formato fechaIngreso: YYYY-MM-DD (ej: 2025-03-01)"],
      ["- telefono: 8–12 dígitos, puede iniciar con + (ej: +56912345678)"],
      ["- semestre: 1 o 2"],
      ["- jornada: Mañana | Tarde | Vespertino | Viernes | Sábados"],
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

    // Misma lógica que en el Admin: registro sin header de auth (ajusta si tu backend lo exige)
    const { data } = await axios.post(`${API_BASE}/registro`, payload);
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

      {error && (
        <p style={{ color: "#c0392b", marginTop: 8 }}>{error}</p>
      )}

      {!!badRows.length && (
        <div style={{ marginTop: 12 }}>
          <h4>Errores detectados (pre-validación):</h4>
          <ul>
            {badRows.slice(0, 10).map((r) => (
              <li key={r.index}>Fila {r.index + 2}: {r.errores}</li>
            ))}
            {badRows.length > 10 && (
              <li>… y {badRows.length - 10} más</li>
            )}
          </ul>
        </div>
      )}

      {resultado && (
        <div style={{ marginTop: 12 }}>
          <h4>Resultado</h4>
          <p>Exitosos: <b>{resultado.exitosos}</b> — Fallidos: <b>{resultado.fallidos}</b></p>
          {!!resultado.errores.length && (
            <details>
              <summary>Ver errores</summary>
              <ul>
                {resultado.errores.map((e, idx) => (
                  <li key={idx}>Fila {e.fila}: {e.error}</li>
                ))}
              </ul>
            </details>
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

/* ===================== Sección: Registro individual (misma lógica del Admin) ===================== */
function RegistroAlumnoPanel() {
  const [form, setForm] = useState({
    correo: "",
    nombre: "",
    apellido: "",
    tipo_documento: "RUT",
    numero_documento: "",
    fechaIngreso: "", // YYYY-MM-DD
    telefono: "",
    semestre: "", // 1 | 2
    jornada: "", // Mañana, Tarde, Vespertino, Viernes, Sábados
  });

  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  function generarContrasenaAleatoria(longitud = 10) {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
    let clave = "";
    for (let i = 0; i < longitud; i++) clave += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    return clave;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !form.correo || !form.nombre || !form.apellido ||
      !form.tipo_documento || !form.numero_documento ||
      !form.fechaIngreso || !form.telefono ||
      !form.semestre || !form.jornada
    ) {
      setMensaje("Por favor completa todos los campos obligatorios.");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    if (!["1", "2"].includes(String(form.semestre))) {
      setMensaje("Semestre debe ser 1 o 2.");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    const telOK = /^\+?\d{8,12}$/.test(String(form.telefono).trim());
    if (!telOK) {
      setMensaje("Teléfono no válido. Usa 8–12 dígitos (puede iniciar con +).");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaIngreso)) {
      setMensaje("Fecha de ingreso no válida.");
      setTimeout(() => setMensaje(""), 3000);
      return;
    }

    const contrasenaGenerada = generarContrasenaAleatoria();

    const alumno = {
      correo: form.correo.trim(),
      nombre: form.nombre,
      apellido: form.apellido,
      tipo_documento: form.tipo_documento,
      numero_documento: form.numero_documento,
      fechaIngreso: form.fechaIngreso,
      telefono: String(form.telefono).trim(),
      semestre: Number(form.semestre),
      jornada: form.jornada,
      contrasena: contrasenaGenerada,
      // 'anio' y 'rut' no se envían: backend los resuelve
    };

    try {
      setEnviando(true);
      // Misma lógica del Admin: endpoint público de registro
      await axios.post(`${API_BASE}/registro`, alumno);

      Swal.fire({
        icon: 'success',
        title: 'Alumno registrado',
        html: `
          <p><strong>Usuario:</strong> ${form.correo}</p>
          <p><strong>Contraseña generada:</strong> ${contrasenaGenerada}</p>
        `,
        confirmButtonText: 'Entendido'
      });

      setForm({
        correo: '',
        nombre: '',
        apellido: '',
        tipo_documento: 'RUT',
        numero_documento: '',
        fechaIngreso: '',
        telefono: '',
        semestre: '',
        jornada: ''
      });
    } catch (err) {
      setMensaje(err.response?.data?.msg || 'Error al registrar alumno');
      setTimeout(() => setMensaje(''), 3000);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="registro-container">
      <h2>Registrar Alumno</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" name="correo" placeholder="Correo" value={form.correo} onChange={handleChange} className="input-field" />
        <input type="text" name="nombre" placeholder="Nombre(s)" value={form.nombre} onChange={handleChange} className="input-field" />
        <input type="text" name="apellido" placeholder="Apellido(s)" value={form.apellido} onChange={handleChange} className="input-field" />

        <select name="tipo_documento" value={form.tipo_documento} onChange={handleChange} className="input-field">
          <option value="" disabled>Selecciona tipo de documento</option>
          <option value="RUT">RUT</option>
          <option value="DNI">DNI</option>
          <option value="Pasaporte">Pasaporte</option>
        </select>

        <input
          type="text"
          name="numero_documento"
          placeholder={
            form.tipo_documento === 'RUT'
              ? 'Ej: 12345678-9'
              : form.tipo_documento === 'DNI'
              ? 'Ej: 12345678'
              : 'Ej: AB1234567'
          }
          value={form.numero_documento}
          onChange={handleChange}
          className="input-field"
        />

        <input
          type="date"
          name="fechaIngreso"
          value={form.fechaIngreso}
          onChange={handleChange}
          className="input-field"
        />

        <input
          type="tel"
          name="telefono"
          placeholder="Teléfono (8–12 dígitos, opcional +)"
          value={form.telefono}
          onChange={handleChange}
          className="input-field"
        />

        <select name="semestre" value={form.semestre} onChange={handleChange} className="input-field">
          <option value="" disabled>Selecciona semestre</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>

        <select name="jornada" value={form.jornada} onChange={handleChange} className="input-field">
          <option value="" disabled>Selecciona jornada</option>
          <option value="Mañana">Mañana</option>
          <option value="Tarde">Tarde</option>
          <option value="Vespertino">Vespertino</option>
          <option value="Viernes">Viernes</option>
          <option value="Sábados">Sábados</option>
        </select>

        <button type="submit" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Registrar'}
        </button>
      </form>

      {mensaje && <p className="mensaje">{mensaje}</p>}
    </div>
  );
}