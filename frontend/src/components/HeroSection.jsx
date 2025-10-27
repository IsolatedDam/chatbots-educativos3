import React from 'react';

const Block = ({ bgColorClass, title, imageUrl, imageAlt, linkUrl, footerText }) => (
    <div className={`hero-block ${bgColorClass}`}>
        <div>
            <h2>{title}</h2>
        </div>
        <a href={linkUrl} className="hero-image-link" aria-label={`Descargar ${title}`}>
            <img src={imageUrl} alt={imageAlt} />
        </a>
        <div className="hero-block-footer">
            {footerText}
        </div>
    </div>
);

const HeroSection = () => {
    const blocksData = [
        {
            bgColorClass: 'block-1',
            title: 'Cursos Cortos',
            imageUrl: '/B1.png',
            imageAlt: 'Icono de guía de inicio',
            linkUrl: '#',
            footerText: 'Descargar la guía en PDF'
        },
        {
            bgColorClass: 'block-2',
            title: 'Matriculas Abiertas 2026',
            imageUrl: '/B2.png',
            imageAlt: 'Icono de catálogo de cursos',
            linkUrl: '#',
            footerText: 'Explorar nuestro catálogo PDF'
        },
        {
            bgColorClass: 'block-3',
            title: 'Información Adicional',
            imageUrl: '/B3.png',
            imageAlt: 'Icono de información adicional',
            linkUrl: '#',
            footerText: 'Consultar detalles en PDF'
        }
    ];

    return (
        <section className="hero-section">
            {blocksData.map((block, index) => (
                <Block key={index} {...block} />
            ))}
        </section>
    );
};

export default HeroSection;
