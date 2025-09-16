// src/pages/CursosProfesor.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";

/* ===== API local/remota ===== */
const API_ROOT = (() => {
  const vite = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_ROOT : undefined;
  const cra  = typeof process !== "undefined" ? process.env?.REACT_APP_API_ROOT : undefined;
  if (vite) return vite;
  if (cra)  return cra;
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:5000";
  }
  return "";
})();
const API_BASE = `${API_ROOT}/api`;

const JORNADAS = ["Mañana", "Tarde", "Vespertino", "Viernes", "Sábados"];

export default function CursosProfesor() {
  const me = JSON.parse(localStorage.getItem("usuario") || "{}");
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState([]);
  const [chatbots, setChatbots] = useState([]);
  const [showCrear, setShowCrear] = useState(false);

  // Gestión alumnos del curso seleccionado
  const [cursoSel, setCursoSel] = useState(null);
  const [busqAlumno, setBusqAlumno] = useState("");
  const [resultAlumnos, setResultAlumnos] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const authHdrs = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  /* ===== Helpers ===== */
  const readErr = async (res) => {
    const txt = await res.text().catch(() => "");
    try {
      const j = JSON.parse(txt);
      return j?.msg || txt || `HTTP ${res.status}`;
    } catch {
      return txt || `HTTP ${res.status}`;
    }
  };

  /* ===== Carga inicial ===== */
  const fetchCursos = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/cursos${me?._id ? `?profesor=${me._id}` : ""}`;
      const res = await fetch(url, { headers: authHdrs });
      if (res.status === 404 || res.status === 204) {
        setCursos([]);
        return;
      }
      if (!res.ok) {
        if (res.status === 401) alert("Tu sesión expiró. Inicia sesión nuevamente.");
        console.warn("fetchCursos non-ok", res.status, await res.text().catch(()=> ""));
        setCursos([]);
        return;
      }
      const data = await res.json().catch(() => []);
      setCursos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchCursos error →", e);
      alert("No se pudo contactar al servidor de cursos.");
      setCursos([]);
    } finally {
      setLoading(false);
    }
  }, [authHdrs, me?._id]);

  const fetchChatbots = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chatbots`, { headers: authHdrs });
      if (res.status === 404 || res.status === 204) {
        setChatbots([]);
        return;
      }
      if (!res.ok) {
        console.warn("fetchChatbots non-ok", res.status, await res.text().catch(()=> ""));
        setChatbots([]);
        return;
      }
      const data = await res.json().catch(() => []);
      setChatbots(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("fetchChatbots error →", e);
      setChatbots([]);
    }
  }, [authHdrs]);

  useEffect(() => {
    fetchCursos();
    fetchChatbots();
  }, [fetchCursos, fetchChatbots]);

  /* ===== CRUD CURSO ===== */
  async function crearCurso(payload) {
    // Limpia y castea números
    const clean = {
      nombre: (payload.nombre || "").trim(),
      descripcion: (payload.descripcion || "").trim(),
      jornada: payload.jornada || undefined,
      anio: /^\d{4}$/.test(String(payload.anio)) ? Number(payload.anio) : undefined,
      semestre: ["1", "2", 1, 2].includes(payload.semestre)
        ? Number(payload.semestre)
        : undefined,
      profesorId: me?._id,
    };

    try {
      const res = await fetch(`${API_BASE}/cursos`, {
        method: "POST",
        headers: authHdrs,
        body: JSON.stringify(clean),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const nuevo = await res.json();
      setCursos((prev) => [nuevo, ...prev]);
      setShowCrear(false);
    } catch (e) {
      alert(e.message || "No se pudo crear el curso");
    }
  }

  async function eliminarCurso(id) {
    if (!window.confirm("¿Eliminar este curso?")) return;
    try {
      const res = await fetch(`${API_BASE}/cursos/${id}`, {
        method: "DELETE",
        headers: authHdrs,
      });
      if (!res.ok) throw new Error(await readErr(res));
      setCursos((prev) => prev.filter((c) => c._id !== id));
      if (cursoSel?._id === id) setCursoSel(null);
    } catch (e) {
      alert(e.message || "Error al eliminar curso");
    }
  }

  /* ===== Asignar 1 chatbot ===== */
  async function asignarChatbot(cursoId, chatbotId) {
    try {
      const res = await fetch(`${API_BASE}/cursos/${cursoId}/chatbot`, {
        method: "POST",
        headers: authHdrs,
        body: JSON.stringify({ chatbotId: chatbotId || null }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const upd = await res.json();
      setCursos((prev) => prev.map((c) => (c._id === upd._id ? upd : c)));
      if (cursoSel?._id === upd._id) setCursoSel(upd);
    } catch (e) {
      alert(e.message || "Error asignando chatbot");
    }
  }

  /* ===== Alumnos ===== */
  async function buscarAlumnos(q) {
    setBuscando(true);
    try {
      const res = await fetch(
        `${API_BASE}/alumnos${q ? `?q=${encodeURIComponent(q)}` : ""}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(await readErr(res));
      const data = await res.json();
      const yaInscritos = new Set(cursoSel?.alumnos || []);
      setResultAlumnos((Array.isArray(data) ? data : []).filter(a => !yaInscritos.has(a._id)));
    } catch (e) {
      alert(e.message || "No se pudo buscar alumnos");
    } finally {
      setBuscando(false);
    }
  }

  async function agregarAlumnos(cursoId, alumnoIds) {
    if (!alumnoIds?.length) return;
    try {
      const res = await fetch(`${API_BASE}/cursos/${cursoId}/alumnos`, {
        method: "POST",
        headers: authHdrs,
        body: JSON.stringify({ alumnoIds }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      const upd = await res.json();
      setCursos((prev) => prev.map((c) => (c._id === upd._id ? upd : c)));
      if (cursoSel?._id === upd._id) setCursoSel(upd);
      alert(`Inscritos: ${alumnoIds.length}`);
    } catch (e) {
      alert(e.message || "Error al inscribir");
    }
  }

  async function quitarAlumno(cursoId, alumnoId) {
    try {
      const res = await fetch(`${API_BASE}/cursos/${cursoId}/alumnos/${alumnoId}`, {
        method: "DELETE",
        headers: authHdrs,
      });
      if (!res.ok) throw new Error(await readErr(res));
      const upd = await res.json();
      setCursos((prev) => prev.map((c) => (c._id === upd._id ? upd : c)));
      if (cursoSel?._id === upd._id) setCursoSel(upd);
    } catch (e) {
      alert(e.message || "Error al quitar alumno");
    }
  }

  /* ===== Modal Crear Curso (con selects/validaciones) ===== */
  function CrearCursoModal({ onClose, onCreate }) {
    const [form, setForm] = useState({
      nombre: "",
      descripcion: "",
      anio: "",
      semestre: "",
      jornada: "",
    });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const onAnioChange = (e) => {
      const v = e.target.value;
      if (/^\d{0,4}$/.test(v)) set("anio", v); // solo dígitos, max 4
    };

    const isValidNombre = form.nombre.trim().length > 0;
    const isValidAnio = !form.anio || /^\d{4}$/.test(form.anio); // opcional, pero si lo pone debe ser 4 dígitos
    const isValidSem = !form.semestre || ["1", "2"].includes(String(form.semestre));
    const isValidJor = !form.jornada || JORNADAS.includes(form.jornada);
    const canCreate = isValidNombre && isValidAnio && isValidSem && isValidJor;

    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h3>Nuevo curso</h3>

          <label className="field">
            <span>Nombre</span>
            <input
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej: Matemática I"
            />
          </label>

          <label className="field">
            <span>Descripción</span>
            <input
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Opcional"
            />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <label className="field">
              <span>Año</span>
              <input
                inputMode="numeric"
                maxLength={4}
                placeholder="2025"
                value={form.anio}
                onChange={onAnioChange}
              />
              {!isValidAnio && <small style={{ color: "tomato" }}>Debe ser 4 dígitos</small>}
            </label>

            <label className="field">
              <span>Semestre</span>
              <select
                className="select"
                value={form.semestre}
                onChange={(e) => set("semestre", e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>

            <label className="field">
              <span>Jornada</span>
              <select
                className="select"
                value={form.jornada}
                onChange={(e) => set("jornada", e.target.value)}
              >
                <option value="">— Seleccionar —</option>
                {JORNADAS.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button
              className="btn btn-primary"
              onClick={() => onCreate(form)}
              disabled={!canCreate}
              title={!canCreate ? "Completa los campos requeridos correctamente" : "Crear"}
            >
              Crear
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== UI principal ===== */
  return (
    <div>
      <h3>Mis cursos</h3>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setShowCrear(true)}>Nuevo curso</button>
        <button className="btn btn-ghost" onClick={fetchCursos}>Refrescar</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Año</th>
              <th>Semestre</th>
              <th>Jornada</th>
              <th>Chatbot</th>
              <th># Alumnos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="99">Cargando…</td></tr>
            ) : cursos.length ? (
              cursos.map((c) => (
                <tr key={c._id}>
                  <td>{c.nombre}</td>
                  <td>{c.anio ?? "—"}</td>
                  <td>{c.semestre ?? "—"}</td>
                  <td>{c.jornada ?? "—"}</td>
                  <td>
                    <select
                      className="select"
                      value={c.chatbotId || ""}
                      onChange={(e) => asignarChatbot(c._id, e.target.value || null)}
                    >
                      <option value="">— Sin chatbot —</option>
                      {chatbots.map((cb) => (
                        <option key={cb._id} value={cb._id}>{cb.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td>{Array.isArray(c.alumnos) ? c.alumnos.length : 0}</td>
                  <td className="cell-actions">
                    <button className="btn btn-primary" onClick={() => setCursoSel(c)}>
                      Gestionar alumnos
                    </button>
                    <button className="btn btn-danger" style={{ marginLeft: 8 }} onClick={() => eliminarCurso(c._id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="99" style={{ textAlign: "center", padding: "1rem" }}>
                  <div style={{ opacity: 0.9, marginBottom: 8 }}>Aún no tienes cursos.</div>
                  <button className="btn btn-primary" onClick={() => setShowCrear(true)}>
                    Crear mi primer curso
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Panel de gestión de alumnos del curso seleccionado */}
      {cursoSel && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h4 style={{ margin: 0 }}>Gestionar alumnos — {cursoSel.nombre}</h4>
            <button className="btn btn-ghost" onClick={() => setCursoSel(null)} style={{ marginLeft: "auto" }}>
              Cerrar
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
            {/* Buscar y agregar */}
            <div>
              <div className="toolbar">
                <input
                  className="search"
                  placeholder="Buscar alumnos (nombre, apellido, RUT/DNI)"
                  value={busqAlumno}
                  onChange={(e) => setBusqAlumno(e.target.value)}
                />
                <button className="btn btn-ghost" onClick={() => buscarAlumnos(busqAlumno)} disabled={buscando}>
                  Buscar
                </button>
              </div>
              <div className="table-wrap" style={{ maxHeight: 280, overflow: "auto" }}>
                <table className="table">
                  <thead><tr><th>RUT/DNI</th><th>Nombre</th><th>Acción</th></tr></thead>
                  <tbody>
                    {buscando ? (
                      <tr><td colSpan="99">Buscando…</td></tr>
                    ) : resultAlumnos.length ? (
                      resultAlumnos.map((a) => (
                        <tr key={a._id}>
                          <td>{a.numero_documento ?? a.rut ?? "-"}</td>
                          <td>{[a.nombre, a.apellido].filter(Boolean).join(" ") || "-"}</td>
                          <td>
                            <button
                              className="btn btn-primary"
                              onClick={() => agregarAlumnos(cursoSel._id, [a._id])}
                            >
                              Agregar
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="99">Sin resultados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Listado de inscritos */}
            <div>
              <div className="kicker" style={{ marginBottom: 8 }}>
                Inscritos: <b>{Array.isArray(cursoSel.alumnos) ? cursoSel.alumnos.length : 0}</b>
              </div>
              <div className="table-wrap" style={{ maxHeight: 280, overflow: "auto" }}>
                <table className="table">
                  <thead><tr><th>AlumnoId</th><th>Acción</th></tr></thead>
                  <tbody>
                    {Array.isArray(cursoSel.alumnos) && cursoSel.alumnos.length ? (
                      cursoSel.alumnos.map((alId) => (
                        <tr key={alId}>
                          <td>{alId}</td>
                          <td>
                            <button className="btn btn-danger" onClick={() => quitarAlumno(cursoSel._id, alId)}>
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="99">Sin alumnos inscritos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCrear && (
        <CrearCursoModal
          onClose={() => setShowCrear(false)}
          onCreate={crearCurso}
        />
      )}
    </div>
  );
}