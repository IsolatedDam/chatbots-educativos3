import '../styles/DashboardAlumno.css';

function DashboardAlumno() {
  const alumno = {
    nombre: 'Juan Pérez',
    carrera: 'Masoterapia Clínica',
    asignaturas: ['Anatomía', 'Terapias Manuales', 'Ética Profesional'],
    estado: 'activo',
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Bienvenido, {alumno.nombre}</h2>
        <button onClick={() => alert('Cerrar sesión')}>Cerrar sesión</button>
      </header>

      <div className="dashboard-info">
        <p><strong>Carrera:</strong> {alumno.carrera}</p>
        <p><strong>Asignaturas:</strong> {alumno.asignaturas.join(', ')}</p>
        <p><strong>Estado de cuenta:</strong> {alumno.estado}</p>
      </div>

      <div className="dashboard-chatbots">
        <h3>Chatbot educativo</h3>
        <iframe
          title="Chatbot principal"
          src="https://hect1zu2vg.customgpt-agents.com/"
          width="100%"
          height="800"
          style={{
            border: '1px solid #ccc',
            borderRadius: '10px',
            marginTop: '20px'
          }}
        />
      </div>
    </div>
  );
}

export default DashboardAlumno;