import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const GameCanvas = dynamic(() => import('../components/GameCanvas'), {
  ssr: false
});

export default function Home() {
  const [saveId, setSaveId] = useState<number | null>(null);
  const [status, setStatus] = useState('Listo');

  useEffect(() => {
    fetch('/api/load')
      .then((res) => res.json())
      .then((data) => {
        if (data.save) {
          setSaveId(data.save.id);
          setStatus('Partida cargada');
        } else if (data.message) {
          setStatus(data.message);
        } else {
          setStatus('Sin guardado');
        }
      })
      .catch(() => {
        setStatus('Sin guardado');
      });
  }, []);

  async function handleSave() {
    const state = {
      player: { x: 96, y: 96, hp: 20, stamina: 100 },
      inventory: ['espada basica'],
      scene: 'overworld'
    };

    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, id: saveId })
    });

    const data = await response.json();
    setSaveId(data.id);
    setStatus('Guardado exitoso');
  }

  return (
    <div style={{ minHeight: '100vh', background: '#050712', color: '#edf2ff' }}>
      <header style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Astra del Ocaso</h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8' }}>Demo Next.js + PostgreSQL para un juego 2D.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={handleSave} style={buttonStyle}>Guardar</button>
          <span>{status}</span>
        </div>
      </header>
      <main style={{ padding: '0 24px 24px' }}>
        <div style={{ width: '100%', height: '720px', borderRadius: 16, overflow: 'hidden', background: '#071014', boxShadow: '0 20px 80px rgba(15,23,42,0.65)' }}>
          <GameCanvas />
        </div>
      </main>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '10px 16px',
  background: '#7c3aed',
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer'
};
