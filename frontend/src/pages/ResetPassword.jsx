// src/pages/ResetPassword.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'https://chatbots-educativos3.onrender.com/api';

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [msg, setMsg]   = useState(null);
  const [sending, setSending] = useState(false);

  const id    = sp.get('id');
  const token = sp.get('token');

  useEffect(() => {
    if (!id || !token) {
      setMsg({ ok: false, text: 'Enlace inválido.' });
    }
  }, [id, token]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (pwd1.length < 6)  return setMsg({ ok: false, text: 'Mínimo 6 caracteres.' });
    if (pwd1 !== pwd2)    return setMsg({ ok: false, text: 'Las contraseñas no coinciden.' });

    try {
      setSending(true);
      const res = await axios.post(`${API_BASE}/password/reset`, {
        id, token, newPassword: pwd1
      });
      setMsg({ ok: true, text: res.data?.msg || 'Contraseña actualizada.' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      const t = err.response?.data?.msg || 'Error al restablecer';
      setMsg({ ok: false, text: t });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="reset-wrapper">
      <h2>Restablecer contraseña</h2>
      <form onSubmit={onSubmit}>
        <input type="password" placeholder="Nueva contraseña" value={pwd1} onChange={e=>setPwd1(e.target.value)} />
        <input type="password" placeholder="Repetir contraseña" value={pwd2} onChange={e=>setPwd2(e.target.value)} />
        <button disabled={sending || !id || !token}>{sending ? 'Enviando...' : 'Guardar'}</button>
      </form>
      {msg && (
        <p style={{
          marginTop: 10,
          padding: '8px 10px',
          borderRadius: 8,
          background: msg.ok ? '#e6ffef' : '#fff4f4',
          color: msg.ok ? '#046a2f' : '#991b1b',
          border: msg.ok ? '1px solid #b7f2cf' : '1px solid #f1b0b0'
        }}>{msg.text}</p>
      )}
    </div>
  );
}