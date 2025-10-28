// Re-adding a comment to force a rebuild
import React, { useState, useEffect } from 'react';

const API_ROOT = (() => {
  const vite = typeof import.meta !== "undefined" ? import.meta.env?.VITE_API_ROOT : undefined;
  const cra  = typeof process !== "undefined" ? process.env?.REACT_APP_API_ROOT : undefined;
  if (vite) return vite;
  if (cra)  return cra;
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return "http://localhost:5000";
  }
  return "https://chatbots-educativos3-vhfq.onrender.com";
})();
const API_BASE = `${API_ROOT}/api`;

const HeroSection = () => {
    const [heroBlocks, setHeroBlocks] = useState([]);

    useEffect(() => {
        const fetchGuestPanel = async () => {
            try {
                const response = await fetch(`${API_BASE}/guest-panel`);
                if (!response.ok) {
                    throw new Error('Error al cargar los datos del panel de visita.');
                }
                const data = await response.json();
                setHeroBlocks(data.heroBlocks);
            } catch (error) {
                console.error(error.message);
            }
        };

        fetchGuestPanel();
    }, []);

    return (
        <section className="hero-section">
            {heroBlocks.map((block, index) => (
                <div key={index} className={`hero-block block-${index + 1}`}>
                    <div>
                        <h2>{block.title}</h2>
                    </div>
                    <a href={`${API_ROOT}/uploads/${block.pdf}`} className="hero-image-link" aria-label={`Descargar ${block.title}`}>
                        <img src={`${API_ROOT}/uploads/${block.image}`} alt={block.title} />
                    </a>
                    <div className="hero-block-footer">
                        <p>Descargar</p>
                    </div>
                </div>
            ))}
        </section>
    );
};

export default HeroSection;
