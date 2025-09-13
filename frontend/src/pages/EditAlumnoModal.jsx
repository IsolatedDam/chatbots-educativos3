import React, { useEffect } from "react";

/* Helpers locales (para que el archivo sea autónomo) */
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

export default function EditAlumnoModal({ draft, setDraft, onClose, onSave, canEditEstado, canEditRiesgo }) {
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