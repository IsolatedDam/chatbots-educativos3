// src/pages/DatosAlumnos.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import EditAlumnoModal from "./EditAlumnoModal.jsx";

const API_ROOT = "https://chatbots-educativos3.onrender.com";
const API_BASE = `${API_ROOT}/api`;
const JORNADAS = ["Mañana","Tarde","Vespertino","Viernes","Sábados"];

/* Helpers */
function calcRiesgoFE(vence){ if(!vence) return null; const hoy=new Date();hoy.setHours(0,0,0,0); const end=new Date(vence);end.setHours(0,0,0,0); const diff=(end-hoy)/86400000; if(diff<0) return "rojo"; if(diff<=10) return "amarillo"; return "verde"; }
function riesgoMensajeFE(r){ if(r==="amarillo") return "AMARILLO = suspensión en 10 días"; if(r==="rojo") return "ROJO = suspendido, por favor pasar por secretaría"; return "Suscripción activa"; }
function riesgoTextoTabla(a){ const r=String(a?.riesgo??a?.color_riesgo??a?.riesgo_color??calcRiesgoFE(a?.suscripcionVenceEl)??"").toLowerCase(); if(a?.habilitado===false||r==="rojo") return "Suspendido"; if(r==="amarillo") return "Suspensión en 10 días"; if(r==="verde") return "Habilitado"; return "—"; }
function getAnio(u){ if(u?.anio!=null) return u.anio; const d=u?.fechaIngreso?new Date(u.fechaIngreso):u?.createdAt?new Date(u.createdAt):null; return d&&!Number.isNaN(d.getTime())?d.getFullYear():""; }

export default function DatosAlumnos({ canDeleteAlumno, canEditEstado, canEditRiesgo }) {
  const [alumnos,setAlumnos]=useState([]); const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState("");
  const [filtroJornada,setFiltroJornada]=useState(""); const [filtroSemestre,setFiltroSemestre]=useState(""); const [filtroAnio,setFiltroAnio]=useState("");
  const [selected,setSelected]=useState(new Set());
  const [editOpen,setEditOpen]=useState(false); const [editDraft,setEditDraft]=useState(null);

  async function fetchAlumnos(q=""){ setLoading(true);
    try{ const token=localStorage.getItem("token"); const url=`${API_BASE}/alumnos${q?`?q=${encodeURIComponent(q)}`:""}`;
      const res=await fetch(url,{ headers:{ Authorization:`Bearer ${token}` }});
      if(!res.ok) throw new Error("No autorizado"); const data=await res.json();
      setAlumnos(Array.isArray(data)?data:[]); setSelected(new Set());
    }catch(e){ alert(e.message||"No se pudieron cargar alumnos"); } finally{ setLoading(false); }
  }
  useEffect(()=>{ fetchAlumnos(""); },[]);

  const opcionesSemestre=useMemo(()=>Array.from(new Set((alumnos||[]).map(u=>(u.semestre??"").toString().trim()).filter(Boolean))).sort((a,b)=>Number(a)-Number(b)),[alumnos]);
  const opcionesAnio=useMemo(()=>Array.from(new Set((alumnos||[]).map(u=>getAnio(u)).filter(a=>a!==""&&a!=null).map(String))).sort((a,b)=>Number(b)-Number(a)),[alumnos]);
  const alumnosFiltrados=useMemo(()=> (alumnos||[]).filter(u=>{
    if(filtroJornada && String(u.jornada||"").toLowerCase()!==filtroJornada.toLowerCase()) return false;
    if(filtroSemestre && String(u.semestre)!==String(filtroSemestre)) return false;
    if(filtroAnio){ const anio=getAnio(u); if(String(anio)!==String(filtroAnio)) return false; }
    return true;
  }),[alumnos,filtroJornada,filtroSemestre,filtroAnio]);

  const limpiarFiltros=()=>{ setFiltroJornada(""); setFiltroSemestre(""); setFiltroAnio(""); setSelected(new Set()); };

  const openEdit=(alumno)=>{ const riesgoInit=alumno.riesgo??alumno.color_riesgo??alumno.riesgo_color??calcRiesgoFE(alumno.suscripcionVenceEl)??""; setEditDraft({
    ...alumno,
    documento: alumno.numero_documento ?? alumno.rut ?? "",
    habilitado: alumno.habilitado ?? true,
    suscripcionVenceEl: alumno.suscripcionVenceEl || "",
    riesgo: riesgoInit,
  }); setEditOpen(true); };
  const closeEdit=()=>{ setEditOpen(false); setEditDraft(null); };

  async function handleSave(){
    if(!editDraft?._id) return;
    try{ const token=localStorage.getItem("token");
      const riesgoLC=String(editDraft.riesgo||"").toLowerCase();
      const riesgoValido=["verde","amarillo","rojo"].includes(riesgoLC)?riesgoLC:"";
      let nextHabilitado=!!editDraft.habilitado; if(!canEditEstado && canEditRiesgo) nextHabilitado=riesgoValido==="rojo"?false:true;

      const payload={
        nombre: editDraft.nombre, apellido: editDraft.apellido,
        anio: editDraft.anio!==""?Number(editDraft.anio):undefined,
        semestre: editDraft.semestre!==""?Number(editDraft.semestre):undefined,
        jornada: editDraft.jornada, habilitado: nextHabilitado,
        suscripcionVenceEl: editDraft.suscripcionVenceEl ? (editDraft.suscripcionVenceEl.length===10?`${editDraft.suscripcionVenceEl}T00:00:00.000Z`:editDraft.suscripcionVenceEl) : undefined,
        riesgo: riesgoValido||undefined, color_riesgo: riesgoValido||undefined,
        numero_documento: editDraft.documento ?? editDraft.numero_documento ?? editDraft.rut,
        rut: editDraft.documento ?? editDraft.numero_documento ?? editDraft.rut,
      };

      const res=await fetch(`${API_BASE}/alumnos/${editDraft._id}`,{
        method:"PUT", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body: JSON.stringify(payload)
      });
      if(!res.ok){ let msg="Error al guardar cambios"; try{ const j=await res.json(); if(j?.msg) msg=j.msg; }catch{} throw new Error(msg); }
      const updated=await res.json();
      setAlumnos(prev=>prev.map(a=>a._id===updated._id?updated:a)); closeEdit();
    }catch(err){ alert(err.message||"No se pudo guardar."); }
  }

  async function handleDelete(id){
    if(!canDeleteAlumno){ alert("No tienes permiso para eliminar alumnos."); return; }
    if(!window.confirm("¿Eliminar alumno?")) return;
    try{ const token=localStorage.getItem("token");
      const res=await fetch(`${API_BASE}/alumnos/${id}`,{ method:"DELETE", headers:{ Authorization:`Bearer ${token}` }});
      if(!res.ok){ let msg="Error al eliminar"; try{ const j=await res.json(); if(j?.msg) msg=j.msg; }catch{} throw new Error(`${msg} (HTTP ${res.status})`); }
      setAlumnos(prev=>prev.filter(a=>a._id!==id));
      setSelected(prev=>{ const n=new Set(prev); n.delete(id); return n; });
    }catch(err){ alert(err.message); }
  }

  async function handleBulkDelete(){
    if(!canDeleteAlumno){ alert("No tienes permiso para eliminar alumnos."); return; }
    const ids=Array.from(selected); if(!ids.length) return alert("No hay alumnos seleccionados.");
    if(!window.confirm(`¿Eliminar ${ids.length} alumno(s)? Esta acción no se puede deshacer.`)) return;

    const token=localStorage.getItem("token");
    const borrarUnoAUno=async()=>{ const headers={ Authorization:`Bearer ${token}` };
      const calls=ids.map(id=>fetch(`${API_BASE}/alumnos/${id}`,{ method:"DELETE", headers }).then(async r=>{ if(!r.ok){ let reason=`HTTP ${r.status}`; try{ const jj=await r.json(); if(jj?.msg) reason=jj.msg; }catch{}; throw new Error(reason);} return id; }));
      const results=await Promise.allSettled(calls);
      const okIds=results.map((r,i)=>r.status==="fulfilled"?ids[i]:null).filter(Boolean); const fail=results.length-okIds.length;
      setAlumnos(prev=>prev.filter(a=>!okIds.includes(a._id))); setSelected(new Set());
      alert(`Eliminados: ${okIds.length}${fail?` — Fallidos: ${fail} (ver consola)`:``}`);
      results.forEach((r,i)=>{ if(r.status==="rejected") console.error(`❌ Falló eliminar ID=${ids[i]} →`, r.reason); });
    };

    try{
      const res=await fetch(`${API_BASE}/alumnos/bulk-delete`,{
        method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body: JSON.stringify({ ids })
      });
      const raw=await res.text(); let data; try{ data=JSON.parse(raw); }catch{ data={ raw }; }
      if(res.ok){ const deletedIds=Array.isArray(data?.ids)?data.ids:ids;
        setAlumnos(prev=>prev.filter(a=>!deletedIds.includes(a._id))); setSelected(new Set());
        alert(`Se eliminaron ${Number(data?.deleted ?? deletedIds.length)} alumno(s).`); return;
      }
      if(res.status===404||res.status===405){ console.warn("bulk-delete no disponible:",res.status,data); await borrarUnoAUno(); return; }
      throw new Error(data?.msg || `Error en eliminación masiva (HTTP ${res.status})`);
    }catch(err){
      console.error("Bulk delete error:",err);
      if(String(err.message||"").toLowerCase().includes("failed to fetch")) await borrarUnoAUno();
      else alert(err.message||"Error en eliminación masiva");
    }
  }

  /* UI internos */
  function BarraBusqueda({ onBuscar, onRefrescar }){
    return (
      <div className="toolbar">
        <input className="search" placeholder="Buscar por nombre, apellido, RUT/DNI" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="select" value={filtroJornada} onChange={e=>setFiltroJornada(e.target.value)} style={{marginLeft:8}}>
          <option value="">Jornada: Todas</option>{JORNADAS.map(j=><option key={j} value={j}>{j}</option>)}
        </select>
        <select className="select" value={filtroSemestre} onChange={e=>setFiltroSemestre(e.target.value)} style={{marginLeft:8}}>
          <option value="">Semestre: Todos</option>{opcionesSemestre.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" value={filtroAnio} onChange={e=>setFiltroAnio(e.target.value)} style={{marginLeft:8}}>
          <option value="">Año: Todos</option>{opcionesAnio.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <button className="btn btn-ghost" style={{marginLeft:8}} onClick={()=>onBuscar(search)}>Buscar</button>
        <button className="btn btn-ghost" onClick={()=>{ setSearch(""); onRefrescar(); }}>Refrescar</button>
        <button className="btn btn-ghost" onClick={limpiarFiltros}>Limpiar filtros</button>
        {canDeleteAlumno && (
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
            <span style={{opacity:0.8}}>Seleccionados: <b>{selected.size}</b></span>
            <button className="btn btn-danger" disabled={!selected.size} onClick={handleBulkDelete} title="Eliminar alumnos seleccionados">Eliminar seleccionados</button>
          </div>
        )}
      </div>
    );
  }

  function TablaListado({ rows }){
    const hdrChkRef=useRef(null);
    const allSelected=rows.length>0 && rows.every(a=>selected.has(a._id));
    const noneSelected=rows.every(a=>!selected.has(a._id));
    const someSelected=!allSelected && !noneSelected;
    useEffect(()=>{ if(hdrChkRef.current) hdrChkRef.current.indeterminate=someSelected; },[someSelected]);

    const toggleRow=(id)=> setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });
    const selectAllCurrent=()=> setSelected(prev=>{ const allIds=rows.map(a=>a._id); const every=rows.length>0 && rows.every(a=>prev.has(a._id));
      const n=new Set(prev); every?allIds.forEach(id=>n.delete(id)):allIds.forEach(id=>n.add(id)); return n; });

    return (
      <div className="table-wrap datos-table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:36,textAlign:"center"}}>
                <input ref={hdrChkRef} type="checkbox" checked={allSelected && !someSelected} onChange={selectAllCurrent}
                       title={allSelected?"Quitar selección":"Seleccionar todos"} />
              </th>
              <th>RUT/DNI</th><th>Nombre</th><th>Apellido</th><th>Año</th><th>Semestre</th>
              <th>Jornada</th><th>Estado</th><th>Riesgo</th><th>Vence</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="99">Cargando…</td></tr> :
             rows.length ? rows.map(a=>{
              const riesgoBase=a.riesgo??a.color_riesgo??a.riesgo_color??calcRiesgoFE(a.suscripcionVenceEl)??"";
              const venceStr=a.suscripcionVenceEl?String(a.suscripcionVenceEl).slice(0,10):"—";
              const checked=selected.has(a._id);
              return (
                <tr key={a._id}>
                  <td style={{textAlign:"center"}}><input type="checkbox" checked={checked} onChange={()=>toggleRow(a._id)} title={checked?"Quitar selección":"Seleccionar fila"} /></td>
                  <td>{a.numero_documento ?? a.rut ?? "-"}</td>
                  <td>{a.nombre ?? "-"}</td>
                  <td>{a.apellido ?? "-"}</td>
                  <td>{getAnio(a) ?? "-"}</td>
                  <td>{a.semestre ?? "-"}</td>
                  <td>{a.jornada ?? "-"}</td>
                  <td>{a.habilitado===false?"Suspendido":"Activo"}</td>
                  <td title={riesgoMensajeFE(String(riesgoBase).toLowerCase())}>{riesgoTextoTabla(a)}</td>
                  <td>{venceStr}</td>
                  <td className="cell-actions">
                    <button className="btn btn-primary" onClick={()=>openEdit(a)}>Editar</button>
                    {canDeleteAlumno && <button className="btn btn-danger" onClick={()=>handleDelete(a._id)} style={{marginLeft:8}}>Eliminar</button>}
                  </td>
                </tr>
              ); }) : <tr><td colSpan="99">Sin resultados</td></tr>}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <section className="section">
      <h3>Datos del alumno</h3>
      <BarraBusqueda onBuscar={(q)=>fetchAlumnos(q)} onRefrescar={()=>fetchAlumnos("")} />
      <TablaListado rows={alumnosFiltrados} />
      {editOpen && (
        <EditAlumnoModal
          draft={editDraft} setDraft={setEditDraft}
          onClose={closeEdit} onSave={handleSave}
          canEditEstado={canEditEstado} canEditRiesgo={canEditRiesgo}
        />
      )}
    </section>
  );
}