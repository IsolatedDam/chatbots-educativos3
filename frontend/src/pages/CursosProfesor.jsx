// src/pages/CursosProfesor.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "../styles/CursosProfesor.css";
import { API_BASE } from "../utils/apiConfig";

const JORNADAS = ["Mañana", "Tarde", "Vespertino", "Viernes", "Sábados"];

/* ===== Helpers presentacionales ===== */
const docDe = (a) => a?.numero_documento ?? a?.rut ?? "—";
const nombreDe = (a) => [a?.nombre, a?.apellido ?? a?.apellidos].filter(Boolean).join(" ") || "—";

/* =======================
   MODAL: Crear Curso
======================= */
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
    <div className="cp-backdrop" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
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

/* =======================
   MODAL: Gestionar Curso
   (sin buscador; toggle habilitar/deshabilitar)
======================= */
function GestionarCursoModal({
  curso, onClose,
  cats, catMap, chatbots,
  authHdrs, token,
  asignarChatbot, fetchCursoDetallado
}) {
  const [catSel, setCatSel] = useState(() => {
    const found = chatbots.find(b => (b._id || b.id) === (curso?.chatbotId || ""));
    return found?.categoria || "";
  });

  // Todos mis alumnos (los creados por este profe)
  const [misAlumnos, setMisAlumnos] = useState([]);
  const [cargandoAlumnos, setCargandoAlumnos] = useState(false);
  const [toggling, setToggling] = useState({}); // { [alumnoId]: true }

  useEffect(() => {
    document.body.classList.add("cp-no-scroll");
    return () => document.body.classList.remove("cp-no-scroll");
  }, []);

  const readErr = async (res) => {
    const txt = await res.text().catch(()=> "");
    try { const j = JSON.parse(txt); return j?.msg || txt || `HTTP ${res.status}`; }
    catch { return txt || `HTTP ${res.status}`; }
  };

  // Cargar todos los alumnos del profe (sin buscador)
  const fetchMisAlumnos = useCallback(async () => {
    setCargandoAlumnos(true);
    try {
      const url = `${API_BASE}/alumnos`; // sin ?q => trae los del profe
      const res = await fetch(url, { headers: { Authorization: authHdrs.Authorization } });
      if (!res.ok) throw new Error(await readErr(res));
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      // Ordenar por nombre
      list.sort((a,b)=> nombreDe(a).localeCompare(nombreDe(b), "es"));
      setMisAlumnos(list);
    } catch (e) {
      alert(e.message || "No se pudieron cargar alumnos");
      setMisAlumnos([]);
    } finally {
      setCargandoAlumnos(false);
    }
  }, [authHdrs.Authorization]);

  useEffect(() => { fetchMisAlumnos(); }, [fetchMisAlumnos]);

  // Inscribir (habilitar) / Quitar (deshabilitar)
  const agregarAlumnos = useCallback(async (alumnoIds) => {
    if (!alumnoIds?.length) return;
    const id = alumnoIds[0];
    setToggling((s)=>({ ...s, [id]: true }));
    try {
      const res = await fetch(`${API_BASE}/cursos/${curso._id}/alumnos`, {
        method: "POST", headers: authHdrs, body: JSON.stringify({ alumnoIds }),
      });
      if (!res.ok) throw new Error(await readErr(res));
      await fetchCursoDetallado(curso._id);
    } catch (e) { alert(e.message || "Error al habilitar"); }
    finally { setToggling((s)=>{ const n={...s}; delete n[id]; return n; }); }
  }, [curso?._id, authHdrs, fetchCursoDetallado]);

  const quitarAlumno = useCallback(async (alumnoId) => {
    setToggling((s)=>({ ...s, [alumnoId]: true }));
    try {
      const res = await fetch(`${API_BASE}/cursos/${curso._id}/alumnos/${alumnoId}`, {
        method: "DELETE", headers: authHdrs,
      });
      if (!res.ok) throw new Error(await readErr(res));
      await fetchCursoDetallado(curso._id);
    } catch (e) { alert(e.message || "Error al deshabilitar"); }
    finally { setToggling((s)=>{ const n={...s}; delete n[alumnoId]; return n; }); }
  }, [curso?._id, authHdrs, fetchCursoDetallado]);

  // Set de inscritos para este curso (para decidir el botón)
  const inscritosSet = useMemo(() => {
    const ids = (curso?.alumnos || []).map(x => typeof x === "string" ? x : x._id);
    return new Set(ids);
  }, [curso?.alumnos]);

  return (
    <div className="mgm-backdrop" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }} role="dialog" aria-modal="true">
      <div className="mgm-modal" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="mgm-header">
          <h4 className="mgm-title">Gestionar alumnos — {curso?.nombre ?? "Curso"}</h4>
          <div className="mgm-meta">
            <span>{curso?.anio ?? "—"}</span>
            <span>Sem {curso?.semestre ?? "—"}</span>
            <span>{curso?.jornada ?? "—"}</span>
          </div>
        </div>

        {/* Filtros mínimos de chatbot (sin buscador de alumnos) */}
        <div className="mgm-toolbar">
          <div className="mgm-field">
            <label>Categoría</label>
            <select
              className="cp-select"
              value={catSel}
              onChange={async (e)=>{
                const val = e.target.value;
                setCatSel(val);
                const actual = chatbots.find(b => (b._id || b.id) === (curso?.chatbotId || ""));
                if (actual && actual.categoria !== val) {
                  await asignarChatbot(curso._id, null);
                }
              }}
            >
              <option value="">— Selecciona —</option>
              {cats.map(cat => <option key={cat} value={cat} title={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="mgm-field">
            <label>Chatbot</label>
            <select
              className="cp-select"
              value={curso?.chatbotId || ""}
              onChange={(e)=>asignarChatbot(curso._id, e.target.value || null)}
              disabled={!catSel}
            >
              <option value="">— Sin chatbot —</option>
              {(catSel ? (catMap[catSel] || []) : []).map((cb) => {
                const id = cb._id || cb.id;
                return (
                  <option key={id} value={id} title={cb.nombre}>
                    {cb.nombre}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="mgm-spacer" />
        </div>

        {/* Única tabla: Resultados (todos mis alumnos) con acción Habilitar/Deshabilitar */}
        <div className="mgm-block">
          <div className="mgm-block-title">
            Resultados <span className="mgm-count">{misAlumnos.length}</span>
          </div>
          <div className="cp-table-clip">
            <table className="cp-table">
              <colgroup>
                <col className="cp-col-doc" /><col className="cp-col-name" /><col className="cp-col-min" /><col className="cp-col-min" />
              </colgroup>
              <thead><tr><th>RUT/DNI</th><th>Nombre</th><th>Estado</th><th>Acción</th></tr></thead>
              <tbody>
                {cargandoAlumnos ? (
                  <tr><td colSpan="99">Cargando alumnos…</td></tr>
                ) : (misAlumnos.length ? (
                  misAlumnos.map((a)=> {
                    const id = a._id;
                    const inscrito = inscritosSet.has(id);
                    const btnBusy = !!toggling[id];
                    return (
                      <tr key={id}>
                        <td>{docDe(a)}</td>
                        <td title={nombreDe(a)} className="cp-ellipsis">{nombreDe(a)}</td>
                        <td>{inscrito ? "Habilitado" : "Deshabilitado"}</td>
                        <td>
                          {inscrito ? (
                            <button
                              className="btn btn-danger cp-btn-block"
                              onClick={()=>quitarAlumno(id)}
                              disabled={btnBusy}
                              title="Deshabilitar acceso a este curso"
                            >
                              {btnBusy ? "…" : "Deshabilitar"}
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary cp-btn-block"
                              onClick={()=>agregarAlumnos([id])}
                              disabled={btnBusy}
                              title="Habilitar acceso a este curso"
                            >
                              {btnBusy ? "…" : "Habilitar"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="99">No tienes alumnos creados aún.</td></tr>
                ))}
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

/* =======================
   PÁGINA: CursosProfesor
======================= */
export default function CursosProfesor() {
  const me = JSON.parse(localStorage.getItem("usuario") || "{}");
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState([]);
  const [chatbots, setChatbots] = useState([]);

  // categorías y mapeo
  const [cats, setCats] = useState([]);
  const [catMap, setCatMap] = useState({});

  // Popup de gestión
  const [cursoSel, setCursoSel] = useState(null);
  const [showGestionar, setShowGestionar] = useState(false);

  // Modal crear curso
  const [showCrear, setShowCrear] = useState(false);

  const authHdrs = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
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
      if (res.status === 404 || res.status === 204) { setChatbots([]); setCats([]); setCatMap({}); return; }
      if (!res.ok) { console.warn("fetchChatbots", res.status, await res.text().catch(()=> "")); setChatbots([]); setCats([]); setCatMap({}); return; }
      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setChatbots(list);

      const byCat = {};
      for (const cb of list) {
        const cat = cb.categoria || "Sin categoría";
        (byCat[cat] ||= []).push(cb);
      }
      Object.values(byCat).forEach(arr => arr.sort((a,b)=> (a.nombre||"").localeCompare(b.nombre||"", "es")));
      setCatMap(byCat);
      setCats(Object.keys(byCat).sort((a,b)=> a.localeCompare(b, "es")));
    } catch (e) {
      console.warn("fetchChatbots error →", e);
      setChatbots([]); setCats([]); setCatMap({});
    }
  }, [authHdrs]);

  useEffect(() => { fetchCursos(); fetchChatbots(); }, [fetchCursos, fetchChatbots]);

  // Traer curso con alumnos
  const fetchCursoDetallado = useCallback(
    async (cursoId) => {
      try {
        const res = await fetch(`${API_BASE}/cursos/${cursoId}?populate=1`, { headers: authHdrs });
        if (!res.ok) throw new Error(await readErr(res));
        const curso = await res.json();
        setCursoSel(curso);
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

  /* ===== UI principal ===== */
  return (
    <div className="cp-page cp-compact">
      <div className="cp-topbar">
        <h3 className="cp-heading">Mis cursos</h3>
        <div className="cp-actions">
          <button className="btn btn-primary" onClick={() => setShowCrear(true)}>Nuevo curso</button>
          <button className="btn btn-primary" onClick={() => { fetchCursos(); fetchChatbots(); }}>
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
            <col className="cp-col-cat" />
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
              <th>Categoría</th>
              <th>Chatbot</th>
              <th>#</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="99">Cargando…</td></tr>
            ) : cursos.length ? (
              cursos.map((c) => {
                const cb = chatbots.find(b => (b._id || b.id) === c.chatbotId);
                return (
                  <tr key={c._id} title={c.nombre || ""}>
                    <td className="cp-ellipsis">{c.nombre || "—"}</td>
                    <td>{c.anio ?? "—"}</td>
                    <td>{c.semestre ?? "—"}</td>
                    <td>{c.jornada ?? "—"}</td>
                    {/* SOLO LECTURA */}
                    <td title={cb?.categoria || "—"}>{cb?.categoria || "—"}</td>
                    <td className="cp-ellipsis" title={cb?.nombre || "— Sin chatbot —"}>
                      {cb?.nombre || "— Sin chatbot —"}
                    </td>
                    <td style={{textAlign:"center"}}>{Array.isArray(c.alumnos) ? c.alumnos.length : 0}</td>
                    <td className="cp-cell-actions">
                      <button
                        className="btn btn-primary"
                        onClick={async()=>{
                          await Promise.all([fetchCursoDetallado(c._id), fetchChatbots()]);
                          setShowGestionar(true);
                        }}
                      >
                        Gestionar
                      </button>
                      <button className="btn btn-danger" onClick={()=>eliminarCurso(c._id)}>Eliminar</button>
                    </td>
                  </tr>
                );
              })
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

      {showGestionar && cursoSel && (
        <GestionarCursoModal
          curso={cursoSel}
          onClose={()=>{ setShowGestionar(false); setCursoSel(null); }}
          cats={cats}
          catMap={catMap}
          chatbots={chatbots}
          authHdrs={authHdrs}
          token={token}
          asignarChatbot={asignarChatbot}
          fetchCursoDetallado={fetchCursoDetallado}
        />
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
