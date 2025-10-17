import React, { useState, useEffect } from "react";
import { decryptLocalPassword } from "../utils/localVault";
import "../styles/PanelProfesor.css";

// Páginas / vistas
import RegistroAlumno from "./RegistroAlumno";
import CargarAlumnos from "./CargarAlumnos";
import DatosAlumnos from "./DatosAlumnos";
import CursosProfesor from "./CursosProfesor";
import AccesoChatbots from "./AccesoChatbots";
import VisitasAlumnos from './VisitasAlumnos'; // <-- NUEVO COMPONENTE

export default function PanelProfesor() {
  // Vista activa
  const [vistaActiva, setVistaActiva] = useState("cuenta");

  // Usuario / permisos
  const me = JSON.parse(localStorage.getItem("usuario") || "{}");
  const role = String(me?.rol || "").toLowerCase();
  const permisos = Array.isArray(me?.permisos) ? me.permisos : [];

  // Nombre mostrado
  const displayName =
    [me?.nombre, me?.apellido].filter(Boolean).join(" ") ||
    me?.correo ||
    "Usuario";
  const initials = (me?.nombre || me?.correo || "U")
    .split(" ")
    .map(p => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const canEditEstado = role === "superadmin" || role === "admin";
  const canEditRiesgo = ["superadmin", "admin", "profesor"].includes(role);
  const canDeleteAlumno =
    role === "superadmin" ||
    role === "admin" ||
    (role === "profesor" && permisos.includes("alumnos:eliminar"));
  const canLoadMassive =
    role === "superadmin" ||
    role === "admin" ||
    (role === "profesor" &&
      (permisos.includes("alumnos:carga_masiva") ||
        permisos.includes("alumnos:registrar_masivo")));

  // Contraseña local (mostrar/ocultar)
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
        } catch {
          setStoredPwd("");
        }
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

  // Cerrar sesión
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Auto-logout por inactividad (30 min)
  useEffect(() => {
    const TIMEOUT = 30 * 60 * 1000;
    const KEY = "sessionExpiresAt";

    const refresh = () => {
      if (!localStorage.getItem("token")) return;
      localStorage.setItem(KEY, String(Date.now() + TIMEOUT));
    };
    const check = () => {
      const exp = Number(localStorage.getItem(KEY) || 0);
      if (!exp) {
        if (localStorage.getItem("token")) refresh();
        return;
      }
      if (Date.now() > exp) {
        alert("Sesión expirada por inactividad.");
        handleLogout();
      }
    };

    if (!localStorage.getItem("token")) {
      handleLogout();
      return;
    }

    refresh();
    const id = setInterval(check, 15000);

    const onActivity = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onStorage = (e) => {
      if (e.key === KEY) check();
    };

    const evs = ["click", "keydown", "mousemove", "scroll", "touchstart", "focus"];
    evs.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    window.addEventListener("visibilitychange", onActivity);
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(id);
      evs.forEach((ev) => window.removeEventListener(ev, onActivity));
      window.removeEventListener("visibilitychange", onActivity);
      window.removeEventListener("storage", onStorage);
    };
  }, []); // mount

  const liClass = (key) => (vistaActiva === key ? "active" : "");

  return (
    <div className="admin-panel">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <h2>Panel Profesor</h2>

        {/* Chip de usuario */}
        <div className="user-chip">
          <div className="user-avatar" aria-hidden>{initials}</div>
          <div className="user-meta">
            <div className="user-name" title={displayName}>{displayName}</div>
            <div className="user-role">{role || "—"}</div>
          </div>
        </div>

        <ul>
          <li className={liClass("cuenta")} onClick={() => setVistaActiva("cuenta")}>Mi cuenta</li>
          <li className={liClass("inicio")} onClick={() => setVistaActiva("inicio")}>Página Chatbots</li>
          <li className={liClass("datos")} onClick={() => setVistaActiva("datos")}>Datos del alumno</li>
          <li className={liClass("cursos")} onClick={() => setVistaActiva("cursos")}>Cursos</li>
          <li className={liClass("chatbots")} onClick={() => setVistaActiva("chatbots")}>Acceso a chatbots</li>

          {/* Siempre visible */}
          <li className={liClass("registro")} onClick={() => setVistaActiva("registro")}>Registrar alumno</li>

          {/* Carga masiva (si permiso) */}
          {canLoadMassive && (
            <li className={liClass("carga")} onClick={() => setVistaActiva("carga")}>Carga masiva</li>
          )}
          <li className={liClass("actividad")} onClick={() => setVistaActiva("actividad")}>Actividad de Alumnos</li>
        </ul>

        <div style={{ marginTop: "auto", padding: "1rem" }}>
          <button className="btn btn-danger" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      {/* Main */}
      <main className="admin-main">
        {/* Saludo superior */}
        <div className="top-greeting">
          Hola, <b>{displayName}</b> 👋
        </div>

        {vistaActiva === "inicio" && (
          <section className="section">
            <div className="iframe-wrapper" style={{ width: "100%", height: "80vh" }}>
              <iframe
                src="https://aipoweredchatbot-production.up.railway.app/"
                style={{ width: "100%", height: "100%", border: "none", borderRadius: 12 }}
                allowFullScreen
                title="IframePanelProfesor"
              />
            </div>
          </section>
        )}

        {vistaActiva === "datos" && (
          <DatosAlumnos
            canDeleteAlumno={canDeleteAlumno}
            canEditEstado={canEditEstado}
            canEditRiesgo={canEditRiesgo}
          />
        )}

        {vistaActiva === "cursos" && (
          <section className="section">
            <CursosProfesor />
          </section>
        )}

        {vistaActiva === "registro" && (
          <section className="section">
            <RegistroAlumno />
          </section>
        )}

        {vistaActiva === "carga" && canLoadMassive && (
          <section className="section">
            <CargarAlumnos />
          </section>
        )}

        {vistaActiva === "chatbots" && (
          <section className="section">
            <AccesoChatbots token={localStorage.getItem("token")} me={me} />
          </section>
        )}

        {vistaActiva === "actividad" && (
          <section className="section">
            <VisitasAlumnos />
          </section>
        )}

        {vistaActiva === "cuenta" && (
          <section className="section">
            <h3 style={{ textAlign: "center" }}>Mi cuenta</h3>
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
    </div>
  );
}
