import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

import '../styles/PanelAdmin.css';

// Componentes internos del panel
import RegistroAlumno from './RegistroAlumno';
import RegistroAdmin from './RegistroAdmin';
import CargarAlumnos from './CargarAlumnos';
import GestionarUsuarios from './GestionarUsuarios';
import VisitasRegistradas from './VisitasRegistradas';

function PanelAdmin() {
  const [vistaActiva, setVistaActiva] = useState('inicio');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.rol !== 'superadmin') {
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
          <li onClick={() => setVistaActiva('registroAdmin')}>Registrar Admin</li>
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
        {vistaActiva === 'inicio' && <p>Bienvenido al panel de administración.</p>}
        {vistaActiva === 'registroAlumno' && <RegistroAlumno />}
        {vistaActiva === 'registroAdmin' && <RegistroAdmin />}
        {vistaActiva === 'usuarios' && <GestionarUsuarios />}
        {vistaActiva === 'asignarChatbots' && <p>Aquí irá la asignación de chatbots.</p>}
        {vistaActiva === 'cargarAlumnos' && <CargarAlumnos />}
        {vistaActiva === 'visitas' && <VisitasRegistradas />}
      </main>
    </div>
  );
}

export default PanelAdmin;