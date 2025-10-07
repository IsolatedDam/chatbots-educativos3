import React, { useEffect } from "react";
import "../styles/EditAlumnoModal.css";

console.log("EditAlumnoModal render");
/* Helpers locales (autónomos) */
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

const JORNADAS = ["Mañana","Tarde","Vespertino","Viernes","Sábados", 'Blearning', 'Online', 'Otras'];

export default function EditAlumnoModal({
  draft,
  setDraft,
  onClose,
  onSave,
  canEditEstado,
  canEditRiesgo
}) {
  // Cerrar con ESC y bloquear scroll del fondo
  useEffect(() => {
    if (!draft) return;
    document.body.classList.add("ea-no-scroll");
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("ea-no-scroll");
      window.removeEventListener("keydown", onKey);
    };
  }, [draft, onClose]);

  if (!draft) return null;

  const riesgo = String(
    draft.riesgo ??
    draft.color_riesgo ??
    draft.riesgo_color ??
    calcRiesgoFE(draft.suscripcionVenceEl) ??
    ""
  ).toLowerCase();
  const riesgoMsg = riesgoMensajeFE(riesgo);

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));
  const setBool = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.checked }));

  return (
    <div className="ea-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div className="ea-modal" onMouseDown={(e)=>e.stopPropagation()}>
        {/* Header */}
        <div className="ea-header">
          <h4 className="ea-title">Editar alumno</h4>
        </div>

        {/* Contenido */}
        <div className="ea-content">
          <div className="ea-grid-2">
            <label className="ea-field">
              <span>RUT / DNI</span>
              <input
                className="input"
                value={draft.documento ?? draft.numero_documento ?? draft.rut ?? ""}
                onChange={(e)=>setDraft(d=>({
                  ...d,
                  documento: e.target.value,
                  numero_documento: e.target.value,
                  rut: e.target.value,
                }))}
                placeholder="11111111-1"
              />
            </label>

            <label className="ea-field">
              <span>Nombre</span>
              <input className="input" value={draft.nombre ?? ""} onChange={set("nombre")} />
            </label>

            <label className="ea-field">
              <span>Apellido</span>
              <input className="input" value={draft.apellido ?? ""} onChange={set("apellido")} />
            </label>

            <label className="ea-field">
              <span>Año</span>
              <input
                className="input"
                type="number" min="2000" max="2100"
                value={draft.anio ?? ""}
                onChange={set("anio")}
                placeholder="2025"
              />
            </label>

            <label className="ea-field">
              <span>Semestre</span>
              <select className="select" value={draft.semestre ?? ""} onChange={set("semestre")}>
                <option value="">—</option>
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </label>

            <label className="ea-field">
              <span>Jornada</span>
              <select className="select" value={draft.jornada ?? ""} onChange={set("jornada")}>
                <option value="">—</option>
                {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </label>

            <label className="ea-field">
              <span>Vence el</span>
              <input
                className="input"
                type="date"
                value={(draft.suscripcionVenceEl || "").slice(0,10)}
                onChange={(e)=>setDraft(d=>({ ...d, suscripcionVenceEl: e.target.value }))}
                disabled={!canEditEstado}
                title={!canEditEstado ? "Solo admin/superadmin puede modificar" : undefined}
              />
            </label>

            {/* Estado de cuenta: checkbox centrado y alineado */}
            <label className="ea-field ea-inline">
              <span>Estado de cuenta</span>
              <div>
                <input
                  type="checkbox"
                  disabled={!canEditEstado}
                  checked={draft.habilitado !== false}
                  onChange={setBool("habilitado")}
                />
                <span>{draft.habilitado === false ? "Suspendido" : "Activo"}</span>
              </div>
            </label>

            {/* Color de riesgo (ocupa 2 columnas) */}
            <label className="ea-field ea-span-2 ea-risk-field">
              <span>Color de riesgo</span>
              <div className="ea-risk-group">
                {[
                  {v:"verde", label:"Verde", cls:"ea-risk ea-risk-verde"},
                  {v:"amarillo", label:"Amarillo", cls:"ea-risk ea-risk-amarillo"},
                  {v:"rojo", label:"Rojo", cls:"ea-risk ea-risk-rojo"},
                  {v:"", label:"— (sin especificar)", cls:"ea-risk"},
                ].map(opt=>(
                  <label key={opt.v} className={opt.cls}>
                    <input
                      type="radio" name="riesgo" value={opt.v}
                      disabled={!canEditRiesgo}
                      checked={riesgo === opt.v}
                      onChange={(e)=>setDraft(d=>({ ...d, riesgo: e.target.value }))}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <small className="kicker">{riesgoMsg}</small>
            </label>

          </div>
        </div>

        {/* Footer */}
        <div className="ea-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={onSave}>Guardar</button>
        </div>
      </div>
    </div>
  );
}