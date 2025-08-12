import { useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import '../styles/PaginaPrincipal.css';

function PaginaPrincipal() {
  const navigate = useNavigate();

  const carruselConfig = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 4000
  };

  return (
    <div className="pagina-principal">
      <header className="encabezado">
        <h1>Centro de Aula Virtual</h1>
      </header>

      <div className="contenido">
        {/* Menú lateral */}
        <aside className="menu-lateral">
          <a
            href="https://www.masoterapiachile.cl/intranet-2/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="/masoterapia.jpg"
              alt="Masoterapia Chile"
              className="boton-img-lateral"
            />
          </a>

          <img
            src="/logopagina.png"
            alt="Ingreso Alumno"
            className="boton-img-lateral"
            onClick={() => navigate('/login')}
          />

          <img
            src="/logoinvitado.png"
            alt="Ingreso Invitado"
            className="boton-img-lateral"
            onClick={() => navigate('/login-invitado')}
          />
        </aside>

        {/* Carrusel en la zona central */}
        <section className="zona-central">
          <Slider {...carruselConfig}>
            <div className="slide">Slide 1</div>
            <div className="slide">Slide 2</div>
            <div className="slide">Slide 3</div>
          </Slider>
        </section>
      </div>
    </div>
  );
}

export default PaginaPrincipal;