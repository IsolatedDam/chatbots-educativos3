import { Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

function RutaProtegida({ children, rolesPermitidos }) {
  const token = localStorage.getItem('token');

  if (!token) return <Navigate to="/login" />;

  try {
    const decoded = jwtDecode(token);
    if (!rolesPermitidos.includes(decoded.rol)) {
      return <Navigate to="/login" />;
    }
    return children;
  } catch (err) {
    return <Navigate to="/login" />;
  }
}

export default RutaProtegida;