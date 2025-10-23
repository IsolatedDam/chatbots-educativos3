import { useNavigate } from 'react-router-dom';
import '../styles/PaginaPrincipal.css';

function PaginaPrincipal() {
  const navigate = useNavigate();

  return (
    <div className="pagina-principal">
      
      {/* --- 1. Logo Superior --- */}
      {/* Asegúrate de tener el logo en tu carpeta 'public' o importa la imagen */}
      <img
        src="/Logo-IA.png" // <-- ¡IMPORTANTE! Cambia esto por la ruta de tu logo
        alt="Masoterapia Chile Logo"
        className="logo-principal"
      />

      <div className="contenido">
        
        {/* --- 2. Eslogan --- */}
        <h1 className="slogan">
          REVOLUCIONAMOS LA FORMA DE ESTUDIAR
        </h1>

        {/* --- 3. Botones y Descripciones --- */}
        <div className="botones-centrales">

          {/* Columna 1: Intranet */}
          <div className="columna-boton">
            <a
              href="https://www.masoterapiachile.cl/intranet-2/"
              target="_blank"
              rel="noopener noreferrer"
              className="boton-icono"
            >
              <img
                src="/B1.png"
                alt="Intranet Masoterapia Chile"
                className="icono"
              />
            </a>
          </div>

          {/* Columna 2: Alumno */}
          <div className="columna-boton">
            <div
              className="boton-icono"
              onClick={() => navigate('/login')}
            >
              <img
                src="/B2.png"
                alt="Ingreso Alumno IA"
                className="icono"
              />
            </div>
          </div>

          {/* Columna 3: Invitado */}
          <div className="columna-boton">
            <div
              className="boton-icono"
              onClick={() => navigate('/login-invitado')}
            >
              <img
                src="/B3.png"
                alt="Ingreso Invitado IA"
                className="icono"
              />
            </div>

          </div>
        </div> {/* Fin de .botones-centrales */}
        
      </div> {/* Fin de .contenido */}

      {/* --- 4. URL Inferior --- */}
      <footer className="footer-url">
        WWW.MASOTERAPIACHILE.CL
      </footer>

    </div> // Fin de .pagina-principal
  );
}

export default PaginaPrincipal;