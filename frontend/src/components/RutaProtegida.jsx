import { Navigate } from 'react-router-dom';

function RutaProtegida({ children, rolesPermitidos }) {
  const token = localStorage.getItem('token');
  const usuarioRaw = localStorage.getItem('usuario');

  console.log('Token:', token);
  console.log('Usuario (raw):', usuarioRaw);

  if (!token || !usuarioRaw) {
    console.warn('Falta token o usuario');
    return <Navigate to="/login" />;
  }

  const usuario = JSON.parse(usuarioRaw);
  const rolNormalizado = usuario.rol?.toLowerCase();

  console.log('Usuario parseado:', usuario);
  console.log('Rol:', rolNormalizado);
  console.log('Roles permitidos:', rolesPermitidos);

  if (!rolesPermitidos.includes(rolNormalizado)) {
    console.warn('Rol no permitido:', rolNormalizado);
    return <Navigate to="/login" />;
  }

  return children;
}

export default RutaProtegida;