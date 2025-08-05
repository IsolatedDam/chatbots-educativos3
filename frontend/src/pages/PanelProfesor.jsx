import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '../styles/PanelProfesor.css';

function PanelProfesor() {
  const [admin, setAdmin] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('usuario');

    // Protección por token y rol
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded.rol !== 'profesor') {
        navigate('/no-autorizado');
      }
    } catch (err) {
      navigate('/login');
    }

    // Cargar usuario desde localStorage
    if (storedUser) {
      setAdmin(JSON.parse(storedUser));
    }
  }, [navigate]);

  return (
    <div className="panel-profesor">
      <h2>Panel del Profesor</h2>

      {admin && (
        <p>Bienvenido, {admin.nombre || admin.correo}</p>
      )}

      {/* ✅ Permiso: editar nombre */}
      {admin?.permisos?.columnasEditable?.includes('nombre') && (
        <div className="editable-box">
          [✔] Puedes editar campo: <strong>nombre</strong>
          <input type="text" placeholder="Editar nombre del alumno" />
        </div>
      )}

      {/* ✅ Permiso: cargar entrenamientos */}
      {admin?.permisos?.columnasEditable?.includes('cargar') && (
        <div className="editable-box">
          <button className="action-button">Cargar Entrenamientos</button>
        </div>
      )}

      {/* Agrega más permisos visibles aquí si lo deseas */}

      {/* ❌ Si no tiene ningún permiso */}
      {!admin?.permisos?.columnasEditable?.length && (
        <p>No tienes permisos asignados aún.</p>
      )}
    </div>
  );
}

export default PanelProfesor;