import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/EditarHeroSection.css';

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

const EditarHeroSection = () => {
    const [heroBlocks, setHeroBlocks] = useState([]);

    useEffect(() => {
        const fetchGuestPanel = async () => {
            try {
                const { data } = await axios.get(`${API_BASE}/guest-panel`);
                setHeroBlocks(data.heroBlocks);
            } catch (error) {
                console.error('Error fetching guest panel data', error);
            }
        };
        fetchGuestPanel();
    }, []);

    const handleChange = (index, e) => {
        const { name, value, files } = e.target;
        const newHeroBlocks = [...heroBlocks];
        if (files) {
            newHeroBlocks[index][name] = files[0];
        } else {
            newHeroBlocks[index][name] = value;
        }
        setHeroBlocks(newHeroBlocks);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('heroBlocks', JSON.stringify(heroBlocks.map(b => ({title: b.title, image: b.image, pdf: b.pdf}))));

        heroBlocks.forEach((block, index) => {
            if (block.image instanceof File) {
                formData.append(`heroBlocks[${index}][image]`, block.image);
            }
            if (block.pdf instanceof File) {
                formData.append(`heroBlocks[${index}][pdf]`, block.pdf);
            }
        });

        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_BASE}/guest-panel/hero-blocks`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
            });
            alert('Hero section updated successfully');
        } catch (error) {
            console.error('Error updating hero section', error);
            alert('Failed to update hero section');
        }
    };

    return (
        <div className="edit-hero-container">
            <h2>Edit Hero Section</h2>
            <form onSubmit={handleSubmit} className="edit-hero-form">
                <div className="hero-blocks-container">
                    {heroBlocks.map((block, index) => (
                        <div key={index} className="hero-block-form">
                            <h3>Block {index + 1}</h3>
                            <div className="form-group">
                                <label>Title</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={block.title}
                                    onChange={(e) => handleChange(index, e)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Image</label>
                                <input
                                    type="file"
                                    name="image"
                                    onChange={(e) => handleChange(index, e)}
                                />
                                {block.image && <img src={typeof block.image === 'string' ? `${API_ROOT}/uploads/${block.image}` : URL.createObjectURL(block.image)} alt="Preview" className="image-preview" />}
                            </div>
                            <div className="form-group">
                                <label>PDF</label>
                                <input
                                    type="file"
                                    name="pdf"
                                    onChange={(e) => handleChange(index, e)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <button type="submit" className="submit-btn">Update Hero Section</button>
            </form>
        </div>
    );
};

export default EditarHeroSection;
