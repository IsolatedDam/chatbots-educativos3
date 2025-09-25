// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
const API_BASE = (process.env.REACT_APP_API_ROOT || '') + '/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [rut, setRut] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = email ? { correo: email } : { rut: rut.replace(/\./g,'').toUpperCase() };
      const res = await fetch(`${API_BASE}/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await res.json().catch(()=>({}));
      setMsg(j?.msg || 'Si la cuenta existe recibirás un email.');
    } catch (err) {
      setMsg('Error al enviar solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: '1rem auto' }}>
      <h3>Recuperar contraseña</h3>
      <form onSubmit={submit}>
        <p>Introduce tu correo (recomendado) o tu RUT para recibir un link de recuperación.</p>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Correo electrónico" />
        <div style={{ margin: '0.5rem 0', textAlign:'center' }}>— o —</div>
        <input value={rut} onChange={e=>setRut(e.target.value)} placeholder="RUT (sin puntos)" />
        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={loading}>{loading ? 'Enviando…' : 'Enviar enlace'}</button>
        </div>
      </form>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}