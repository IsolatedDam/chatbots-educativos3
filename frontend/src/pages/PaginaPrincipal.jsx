import { useNavigate } from 'react-router-dom';
import '../styles/PaginaPrincipal.css';

function PaginaPrincipal() {
  const navigate = useNavigate();

  return (
    <div className="pagina-principal">
      <div className="contenido">
        <div className="botones-centrales">
          <a
            href="https://www.masoterapiachile.cl/intranet-2/"
            target="_blank"
            rel="noopener noreferrer"
            className="boton-icono"
          >
            <img
              src="/B1.png"
              alt="Masoterapia Chile"
              className="icono"
            />
          </a>

          <div
            className="boton-icono"
            onClick={() => navigate('/login')}
          >
            <img
              src="/B2.png"
              alt="Ingreso Alumno"
              className="icono"
            />
          </div>

          <div
            className="boton-icono"
            onClick={() => navigate('/login-invitado')}
          >
            <img
              src="/B3.png"
              alt="Ingreso Invitado"
              className="icono"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaginaPrincipal;