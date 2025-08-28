// src/components/PanelAdmin.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import '../styles/PanelAdmin.css';

// Páginas internas
import RegistroAlumno from './RegistroAlumno';
import RegistroAdmin from './RegistroAdmin';
// 👇 Eliminado RegistroProfesor
// import RegistroProfesor from './RegistroProfesor';
import CargarAlumnos from './CargarAlumnos';
import GestionarUsuarios from './GestionarUsuarios';
import VisitasRegistradas from './VisitasRegistradas';

function PanelAdmin() {
  // Vista por defecto: 'inicio' (iframe)
  const [vistaActiva, setVistaActiva] = useState('inicio');
  const navigate = useNavigate();

  // Leemos rol desde localStorage para mostrar/ocultar opciones
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const esSuper = usuario?.rol === 'superadmin';
  const esAdmin = usuario?.rol === 'admin';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      // Permitir acceso a superadmin y admin
      if (!['superadmin', 'admin'].includes(decoded.rol)) {
        navigate('/no-autorizado');
      }
    } catch (error) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const liClass = (key) => (vistaActiva === key ? 'active' : '');

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <h2>Panel Administrador</h2>
        <ul>
          {/* Acceso directo al iframe */}
          <li className={liClass('inicio')} onClick={() => setVistaActiva('inicio')}>
            Página Chatbots
          </li>

          <li className={liClass('registroAlumno')} onClick={() => setVistaActiva('registroAlumno')}>
            Registrar Alumno
          </li>

          {/* Unificado: ahora “RegistroAdmin” crea usuarios (profesores) también */}
          {(esSuper || esAdmin) && (
            <li className={liClass('registroAdmin')} onClick={() => setVistaActiva('registroAdmin')}>
              Registrar Profesor
            </li>
          )}

          {/* Eliminado: Registrar Profesor */}
          {/* (esSuper || esAdmin) && (
            <li className={liClass('registroProfesor')} onClick={() => setVistaActiva('registroProfesor')}>
              Registrar Profesor
            </li>
          ) */}

          <li className={liClass('usuarios')} onClick={() => setVistaActiva('usuarios')}>
            Gestionar Usuarios
          </li>

          <li className={liClass('asignarChatbots')} onClick={() => setVistaActiva('asignarChatbots')}>
            Asignar Chatbots
          </li>

          <li className={liClass('cargarAlumnos')} onClick={() => setVistaActiva('cargarAlumnos')}>
            Cargar desde archivo
          </li>

          <li className={liClass('visitas')} onClick={() => setVistaActiva('visitas')}>
            Visitas Registradas
          </li>
        </ul>

        <button className="logout-button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="admin-main">
        {vistaActiva === 'inicio' && (
          <div className="iframe-wrapper" style={{ width: '100%', height: '80vh' }}>
            <iframe
              src="https://inquisitive-concha-7da15f.netlify.app/"
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
              allowFullScreen
              title="IframePanelAdmin"
            />
          </div>
        )}

        {vistaActiva === 'registroAlumno' && <RegistroAlumno />}

        {/* Ahora RegistroAdmin está disponible para superadmin y admin */}
        {vistaActiva === 'registroAdmin' && (esSuper || esAdmin) && <RegistroAdmin />}

        {/* Eliminado: vista de registroProfesor */}
        {/* {vistaActiva === 'registroProfesor' && (esSuper || esAdmin) && <RegistroProfesor />} */}

        {vistaActiva === 'usuarios' && <GestionarUsuarios />}
        {vistaActiva === 'asignarChatbots' && <p>Aquí irá la asignación de chatbots.</p>}
        {vistaActiva === 'cargarAlumnos' && <CargarAlumnos />}
        {vistaActiva === 'visitas' && <VisitasRegistradas />}
      </main>
    </div>
  );
}

export default PanelAdmin;