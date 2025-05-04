import React, { useEffect, useState } from 'react';

function NextLogCountdown() {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [lastLogTime, setLastLogTime] = useState(null);

  useEffect(() => {
    async function fetchLogTime() {
      try {
        const res = await fetch('/api/nextLogTime');
        const data = await res.json();
        setLastLogTime(data.lastLogTime);
        setTimeRemaining(data.timeRemaining);
      } catch (err) {
        console.error('Failed to fetch next log time:', err);
      }
    }

    fetchLogTime();
    const interval = setInterval(fetchLogTime, 10000);
    return () => clearInterval(interval);
  }, []);

  function formatMs(ms) {
    if (ms === null) return '—';
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  return (
    <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
      <p><strong>Last log time:</strong> {lastLogTime ? new Date(lastLogTime).toLocaleString() : '—'}</p>
      <p><strong>Next log in:</strong> {formatMs(timeRemaining)}</p>
    </div>
  );
}

export default NextLogCountdown;
