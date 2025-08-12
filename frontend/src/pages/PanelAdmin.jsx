import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import '../styles/PanelAdmin.css';

// Páginas internas
import RegistroAlumno from './RegistroAlumno';
import RegistroAdmin from './RegistroAdmin';
import RegistroProfesor from './RegistroProfesor';
import CargarAlumnos from './CargarAlumnos';
import GestionarUsuarios from './GestionarUsuarios';
import VisitasRegistradas from './VisitasRegistradas';

function PanelAdmin() {
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

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <h2>Panel Administrador</h2>
        <ul>
          <li onClick={() => setVistaActiva('registroAlumno')}>Registrar Alumno</li>

          {/* Solo superadmin puede crear administradores */}
          {esSuper && (
            <li onClick={() => setVistaActiva('registroAdmin')}>Registrar Admin</li>
          )}

          {/* Superadmin y Admin pueden crear profesores */}
          {(esSuper || esAdmin) && (
            <li onClick={() => setVistaActiva('registroProfesor')}>Registrar Profesor</li>
          )}

          <li onClick={() => setVistaActiva('usuarios')}>Gestionar Usuarios</li>
          <li onClick={() => setVistaActiva('asignarChatbots')}>Asignar Chatbots</li>
          <li onClick={() => setVistaActiva('cargarAlumnos')}>Cargar desde archivo</li>
          <li onClick={() => setVistaActiva('visitas')}>Visitas Registradas</li>
        </ul>

        <button className="logout-button" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </aside>

      <main className="admin-main">
        {vistaActiva === 'inicio' && (
          <div style={{ width: '100%', height: '80vh' }}>
            {/* Si quieres mantener el texto, descomenta la línea siguiente */}
            {/* <p>Bienvenido al panel de administración.</p> */}
            <iframe
              src="https://inquisitive-concha-7da15f.netlify.app/"
              style={{ width: '100%', height: '100%', border: 'none' }}
              allowFullScreen
              title="IframePanelAdmin"
            ></iframe>
          </div>
        )}

        {vistaActiva === 'registroAlumno' && <RegistroAlumno />}
        {vistaActiva === 'registroAdmin' && esSuper && <RegistroAdmin />}
        {vistaActiva === 'registroProfesor' && (esSuper || esAdmin) && <RegistroProfesor />}
        {vistaActiva === 'usuarios' && <GestionarUsuarios />}
        {vistaActiva === 'asignarChatbots' && <p>Aquí irá la asignación de chatbots.</p>}
        {vistaActiva === 'cargarAlumnos' && <CargarAlumnos />}
        {vistaActiva === 'visitas' && <VisitasRegistradas />}
      </main>
    </div>
  );
}

export default PanelAdmin;