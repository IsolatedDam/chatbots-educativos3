// src/pages/CursosProfesor.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import "../styles/CursosProfesor.css";

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
  return "https://chatbots-educativos3.onrender.com";
})();
const API_BASE = `${API_ROOT}/api`;

const JORNADAS = ["Mañana", "Tarde", "Vespertino", "Viernes", "Sábados"];

/* ===== Helpers presentacionales ===== */
const docDe = (a) => a?.numero_documento ?? a?.rut ?? "—";
const nombreDe = (a) => [a?.nombre, a?.apellido ?? a?.apellidos].filter(Boolean).join(" ") || "—";
const idsDeInscritos = (al = []) => new Set((al || []).map((x) => (typeof x === "string" ? x : x?._id)));

export default function CursosProfesor() {
  const me = JSON.parse(localStorage.getItem("usuario") || "{}");
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState([]);
  const [chatbots, setChatbots] = useState([]);

  // Popup de gestión
  const [cursoSel, setCursoSel] = useState(null);
  const [showGestionar, setShowGestionar] = useState(false);

  // Modal crear curso
  const [showCrear, setShowCrear] = useState(false);

  // búsqueda dentro del popup
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

  /* ===== Utils ===== */
  const readErr = async (res) => {
    const txt = await res.text().catch(() => "");
    try { const j = JSON.parse(txt); return j?.msg || txt || `HTTP ${res.status}`; }
    catch { return txt || `HTTP ${res.status}`; }
  };

  /* ===== Carga inicial ===== */
  const fetchCursos = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${API_BASE}/cursos${me?._id ? `?profesor=${me._id}` : ""}`;
      const res = await fetch(url, { headers: authHdrs });
      if (res.status === 404 || res.status === 204) { setCursos([]); return; }
      if (!res.ok) { console.warn("fetchCursos", res.status, await res.text().catch(()=> "")); setCursos([]); return; }
      const data = await res.json().catch(() => []);
      setCursos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchCursos error →", e);
      setCursos([]);
      alert("No se pudo contactar al servidor de cursos.");
    } finally {
      setLoading(false);
    }
  }, [authHdrs, me?._id]);

  const fetchChatbots = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chatbots`, { headers: authHdrs });
      if (res.status === 404 || res.status === 204) { setChatbots([]); return; }
      if (!res.ok) { console.warn("fetchChatbots", res.status, await res.text().catch(()=> "")); setChatbots([]); return; }
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

  // Traer curso con alumnos
  const fetchCursoDetallado = useCallback(
    async (cursoId) => {
      try {
        const res = await fetch(`${API_BASE}/cursos/${cursoId}?populate=1`, { headers: authHdrs });
        if (!res.ok) throw new Error(await readErr(res));
        const curso = await res.json();
        setCursoSel(curso);
        // refrescar conteo y chatbotId en la tabla principal
        setCursos((prev) =>
          prev.map((c) =>
            c._id === curso._id
              ? {
                  ...c,
                  alumnos: curso.alumnos?.map((a) => a._id) ?? [],
                  chatbotId: curso.chatbotId || null,
                }
              : c
          )
        );
      } catch (e) {
        console.error("fetchCursoDetallado", e);
        alert(e.message || "No se pudo cargar el curso.");
      }
    },
    [authHdrs]
  );

  /* ===== CRUD Curso ===== */
  async function crearCurso(payload) {
    const clean = {
      nombre: (payload.nombre || "").trim(),
      descripcion: (payload.descripcion || "").trim(),
      jornada: payload.jornada || undefined,
      anio: /^\d{4}$/.test(String(payload.anio)) ? Number(payload.anio) : undefined,
      semestre: ["1", "2", 1, 2].includes(payload.semestre) ? Number(payload.semestre) : undefined,
      profesorId: me?._id,
    };
    try {
      const res = await fetch(`${API_BASE}/cursos`, { method: "POST", headers: authHdrs, body: JSON.stringify(clean) });
      if (!res.ok) throw new Error(await readErr(res));
      const nuevo = await res.json();
      setCursos((prev) => [nuevo, ...prev]);
      setShowCrear(false);
    } catch (e) { alert(e.message || "No se pudo crear el curso"); }
  }

  async function eliminarCurso(id) {
    if (!window.confirm("¿Eliminar este curso?")) return;
    try {
      const res = await fetch(`${API_BASE}/cursos/${id}`, { method: "DELETE", headers: authHdrs });
      if (!res.ok) throw new Error(await readErr(res));
      setCursos((prev) => prev.filter((c) => c._id !== id));
      if (cursoSel?._id === id) setCursoSel(null);
    } catch (e) { alert(e.message || "Error al eliminar curso"); }
  }

  /* ===== Chatbot ===== */
  async function asignarChatbot(cursoId, chatbotId) {
    // sanea valores "undefined" / falsy
    const clean = (v) => (v && v !== "undefined" ? v : null);
    try {
      const res = await fetch(`${API_BASE}/cursos/${cursoId}/chatbot`, {
        method: "POST",
        headers: authHdrs,
        body: JSON.stringify({ chatbotId: clean(chatbotId) }),
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
    if (!cursoSel?._id) return;
    setBuscando(true);
    try {
      const res = await fetch(`${API_BASE}/alumnos${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await readErr(res));
      const data = await res.json();
      const ya = idsDeInscritos(cursoSel?.alumnos);
      setResultAlumnos((Array.isArray(data) ? data : []).filter((a) => !ya.has(a._id)));
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
        method: "POST", headers: authHdrs, body: JSON.stringify({ alumnoIds }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      await fetchCursoDetallado(cursoId);
      setBusqAlumno(""); setResultAlumnos([]);
    } catch (e) { alert(e.message || "Error al inscribir"); }
  }

  async function quitarAlumno(cursoId, alumnoId) {
    try {
      const res = await fetch(`${API_BASE}/cursos/${cursoId}/alumnos/${alumnoId}`, {
        method: "DELETE", headers: authHdrs,
      });
      if (!res.ok) throw new Error(await readErr(res));
      await fetchCursoDetallado(cursoId);
    } catch (e) { alert(e.message || "Error al quitar alumno"); }
  }

  /* ===== Modal: Crear Curso ===== */
  function CrearCursoModal({ onClose, onCreate }) {
    const [form, setForm] = useState({ nombre: "", descripcion: "", anio: "", semestre: "", jornada: "" });
    useEffect(() => { document.body.classList.add("cp-no-scroll"); return () => document.body.classList.remove("cp-no-scroll"); }, []);
    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const onAnioChange = (e) => { const v = e.target.value; if (/^\d{0,4}$/.test(v)) set("anio", v); };

    const ok = form.nombre.trim().length > 0 &&
               (!form.anio || /^\d{4}$/.test(form.anio)) &&
               (!form.semestre || ["1", "2"].includes(String(form.semestre))) &&
               (!form.jornada || JORNADAS.includes(form.jornada));

    return (
      <div className="cp-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
        <div className="cp-modal" onMouseDown={(e)=>e.stopPropagation()}>
          <div className="cp-header">
            <h4 className="cp-title">Crear un curso</h4>
          </div>

          <div className="cp-content">
            <div className="cp-form">
              <label className="cp-field cp-col-6">
                <span>Nombre</span>
                <input className="cp-input" value={form.nombre}
                       onChange={(e)=>set("nombre", e.target.value)} placeholder="Ej: Matemática I" />
              </label>

              <label className="cp-field cp-col-6">
                <span>Descripción</span>
                <textarea className="cp-textarea" rows={3}
                       value={form.descripcion} onChange={(e)=>set("descripcion", e.target.value)}
                       placeholder="Opcional" />
              </label>

              <label className="cp-field cp-col-3">
                <span>Año</span>
                <input className="cp-input" inputMode="numeric" maxLength={4}
                       placeholder="2025" value={form.anio} onChange={onAnioChange} />
              </label>

              <label className="cp-field cp-col-3">
                <span>Semestre</span>
                <select className="cp-select" value={form.semestre} onChange={(e)=>set("semestre", e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  <option value="1">1</option><option value="2">2</option>
                </select>
              </label>

              <label className="cp-field cp-col-6">
                <span>Jornada</span>
                <select className="cp-select" value={form.jornada} onChange={(e)=>set("jornada", e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {JORNADAS.map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="cp-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn btn-primary" onClick={()=>onCreate(form)} disabled={!ok}
              title={!ok ? "Completa los campos requeridos correctamente" : "Crear"}>
              Crear
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== Popup: Gestionar Curso ===== */
  function GestionarCursoModal({ curso, onClose }) {
    useEffect(() => {
      document.body.classList.add("cp-no-scroll");
      return () => document.body.classList.remove("cp-no-scroll");
    }, []);

    return (
      <div className="mgm-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
        <div className="mgm-modal" onMouseDown={(e)=>e.stopPropagation()}>
          <div className="mgm-header">
            <h4 className="mgm-title">Gestionar alumnos — {curso?.nombre ?? "Curso"}</h4>
            <div className="mgm-meta">
              <span>{curso?.anio ?? "—"}</span>
              <span>Sem {curso?.semestre ?? "—"}</span>
              <span>{curso?.jornada ?? "—"}</span>
            </div>
          </div>

          <div className="mgm-toolbar">
            <div className="mgm-field">
              <label>Chatbot</label>
              <select
                className="cp-select"
                value={curso?.chatbotId || ""}
                onChange={(e)=>asignarChatbot(curso._id, e.target.value || null)}
              >
                <option value="">— Sin chatbot —</option>
                {chatbots.map((cb) => {
                  const id = cb._id || cb.id; // 👈 clave: usar _id || id
                  return (
                    <option key={id} value={id}>
                      {cb.nombre}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="mgm-spacer" />

            <div className="mgm-field mgm-search">
              <label>Buscar/Agregar alumno</label>
              <div className="mgm-search-row">
                <input
                  className="cp-input"
                  placeholder="RUT/DNI, nombre o apellido…"
                  value={busqAlumno}
                  onChange={(e)=>setBusqAlumno(e.target.value)}
                  onKeyDown={(e)=>{ if(e.key==='Enter') buscarAlumnos(busqAlumno); }}
                />
                <button className="btn btn-primary" onClick={()=>buscarAlumnos(busqAlumno)} disabled={buscando}>
                  Buscar
                </button>
              </div>
            </div>
          </div>

          {/* Resultados y Alumnos inscritos */}
          <div className="mgm-block">
            <div className="mgm-block-title">Resultados</div>
            <div className="cp-table-clip">
              <table className="cp-table">
                <colgroup>
                  <col className="cp-col-doc" /><col className="cp-col-name" /><col className="cp-col-min" />
                </colgroup>
                <thead><tr><th>RUT/DNI</th><th>Nombre</th><th>Acción</th></tr></thead>
                <tbody>
                  {buscando ? (
                    <tr><td colSpan="99">Buscando…</td></tr>
                  ) : (resultAlumnos?.length ? (
                    resultAlumnos.map((a)=>(
                      <tr key={a._id}>
                        <td>{docDe(a)}</td>
                        <td title={nombreDe(a)}>{nombreDe(a)}</td>
                        <td>
                          <button className="btn btn-primary cp-btn-block"
                                  onClick={()=>agregarAlumnos(curso._id, [a._id])}>
                            Agregar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="99">Sin resultados</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mgm-block">
            <div className="mgm-block-title">
              Alumnos inscritos <span className="mgm-count">{curso?.alumnos?.length ?? 0}</span>
            </div>
            <div className="cp-table-clip">
              <table className="cp-table">
                <colgroup>
                  <col className="cp-col-doc" /><col className="cp-col-name" /><col className="cp-col-min" />
                </colgroup>
                <thead><tr><th>RUT/DNI</th><th>Nombre</th><th>Acción</th></tr></thead>
                <tbody>
                  {Array.isArray(curso?.alumnos) && curso.alumnos.length ? (
                    curso.alumnos.map((al) => {
                      const a = typeof al === "string" ? { _id: al } : al;
                      return (
                        <tr key={a._id}>
                          <td>{docDe(a)}</td>
                          <td title={nombreDe(a)} className="cp-ellipsis">{nombreDe(a)}</td>
                          <td>
                            <button className="btn btn-danger cp-btn-block"
                                    onClick={()=>quitarAlumno(curso._id, a._id)}>
                              Quitar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan="99">Sin alumnos inscritos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mgm-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  /* ===== UI principal ===== */
  return (
    <div className="cp-page">
      <div className="cp-topbar">
        <h3 className="cp-heading">Mis cursos</h3>
        <div className="cp-actions">
          <button className="btn btn-primary" onClick={() => setShowCrear(true)}>Nuevo curso</button>
          <button
            className="btn btn-primary"
            onClick={() => { fetchCursos(); fetchChatbots(); }} // recarga también chatbots
          >
            Refrescar
          </button>
        </div>
      </div>

      <div className="cp-table-wrap">
        <table className="cp-table">
          <colgroup>
            <col className="cp-col-nameCourse" />
            <col className="cp-col-year" />
            <col className="cp-col-sem" />
            <col className="cp-col-jor" />
            <col className="cp-col-cb" />
            <col className="cp-col-num" />
            <col className="cp-col-act" />
          </colgroup>
          <thead>
            <tr>
              <th>Curso</th>
              <th>Año</th>
              <th>Semestre</th>
              <th>Jornada</th>
              <th>Chatbot</th>
              <th>#</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="99">Cargando…</td></tr>
            ) : cursos.length ? (
              cursos.map((c) => (
                <tr key={c._id} title={c.nombre || ""}>
                  <td className="cp-ellipsis">{c.nombre || "—"}</td>
                  <td>{c.anio ?? "—"}</td>
                  <td>{c.semestre ?? "—"}</td>
                  <td>{c.jornada ?? "—"}</td>
                  <td>
                    <select
                      className="cp-select"
                      value={c.chatbotId || ""}
                      onChange={(e)=>asignarChatbot(c._id, e.target.value || null)}
                    >
                      <option value="">— Sin chatbot —</option>
                      {chatbots.map((cb) => {
                        const id = cb._id || cb.id; // 👈 clave: usar _id || id
                        return (
                          <option key={id} value={id}>
                            {cb.nombre}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td style={{textAlign:"center"}}>{Array.isArray(c.alumnos) ? c.alumnos.length : 0}</td>
                  <td className="cp-cell-actions">
                    <button
                      className="btn btn-primary"
                      onClick={async()=>{
                        await Promise.all([fetchCursoDetallado(c._id), fetchChatbots()]);
                        setBusqAlumno(""); setResultAlumnos([]);
                        setShowGestionar(true);
                      }}
                    >
                      Gestionar
                    </button>
                    <button className="btn btn-danger" onClick={()=>eliminarCurso(c._id)}>Eliminar</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="99" className="cp-empty">
                  <div>Aún no tienes cursos.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Popup de gestión */}
      {showGestionar && cursoSel && (
        <GestionarCursoModal
          curso={cursoSel}
          onClose={()=>{ setShowGestionar(false); setCursoSel(null); }}
        />
      )}

      {/* Modal crear curso */}
      {showCrear && (
        <CrearCursoModal
          onClose={() => setShowCrear(false)}
          onCreate={crearCurso}
        />
      )}
    </div>
  );
}