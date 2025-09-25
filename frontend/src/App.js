import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 🧩 Páginas
import Login from './pages/Login';
import RegistroAlumno from './pages/RegistroAlumno';
import DashboardAlumno from './pages/DashboardAlumno';
import PanelAlumno from './pages/PanelAlumno';
import PanelAdmin from './pages/PanelAdmin';
import PanelProfesor from './pages/PanelProfesor';
import Inicio from './pages/Inicio';
import VisitasRegistradas from './pages/VisitasRegistradas';
import BienvenidaVisita from './pages/BienvenidaVisita';
import PaginaPrincipal from './pages/PaginaPrincipal';
import LoginInvitado from './pages/LoginInvitado';


// 🔐 Ruta protegida
import RutaProtegida from './components/RutaProtegida';

// 💅 Estilos
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Redirección raíz */}
          <Route path="/" element={<PaginaPrincipal />} />

          {/* Acceso público */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<RegistroAlumno />} />
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/bienvenida-visita" element={<BienvenidaVisita />} />
          <Route path="/login-invitado" element={<LoginInvitado />} />

          {/* Rutas protegidas */}
          <Route
            path="/dashboard"
            element={
              <RutaProtegida rolesPermitidos={['alumno']}>
                <DashboardAlumno />
              </RutaProtegida>
            }
          />

          {/* 🔓 Ruta temporalmente pública */}
          <Route
            path="/panel-alumno"
            element={<PanelAlumno />}
          />

          <Route
            path="/panel-admin"
            element={
              <RutaProtegida rolesPermitidos={['superadmin']}>
                <PanelAdmin />
              </RutaProtegida>
            }
          />
          <Route
            path="/panel-profesor"
            element={
              <RutaProtegida rolesPermitidos={['profesor']}>
                <PanelProfesor />
              </RutaProtegida>
            }
          />
          <Route
            path="/visitas-registradas"
            element={
              <RutaProtegida rolesPermitidos={['superadmin']}>
                <VisitasRegistradas />
              </RutaProtegida>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;