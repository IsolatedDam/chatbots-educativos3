import { Navigate } from 'react-router-dom';

function decodeJwt(t) {
  try {
    const p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(p));
  } catch { return null; }
}

export default function RutaProtegida({ children, rolesPermitidos = [] }) {
  // Prioriza credenciales de admin/profesor; cae a alumno si no hay
  const token =
    localStorage.getItem('token_admin') ||
    localStorage.getItem('token') ||
    '';

  const usuarioRaw =
    localStorage.getItem('usuario_admin') ||
    localStorage.getItem('usuario') ||
    '';

  if (!token) return <Navigate to="/login" />;

  // Expiración y rol del JWT (por si usuario no está o está viejo)
  const payload = decodeJwt(token); // { id, rol, exp? }
  if (payload?.exp && payload.exp * 1000 < Date.now()) {
    // limpia todo y fuerza login
    localStorage.removeItem('token_admin');
    localStorage.removeItem('usuario_admin');
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    return <Navigate to="/login" />;
  }

  let usuario = null;
  try { usuario = usuarioRaw ? JSON.parse(usuarioRaw) : null; } catch {}

  const rol = (usuario?.rol || payload?.rol || '').toLowerCase();

  // Si se pasó lista de roles, valida; si no, solo exige rol presente
  const permitido = rolesPermitidos.length
    ? rolesPermitidos.map(r => r.toLowerCase()).includes(rol)
    : Boolean(rol);

  if (!permitido) return <Navigate to="/no-autorizado" />;

  return children;
}