import React, { useEffect, useState } from 'react';

function LiveTankSelector() {
  const [liveTanks, setLiveTanks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Group tank IDs by prefix
  const grouped = Object.entries(liveTanks).reduce((acc, [id, status]) => {
    const prefix = id.charAt(0);
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push({ id, status });
    return acc;
  }, {});

  useEffect(() => {
    fetch('/api/liveTanks')
      .then((res) => res.json())
      .then((data) => {
        setLiveTanks(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load live tanks:', err);
        setLoading(false);
      });
  }, []);

  const toggleTank = (id) => {
    setLiveTanks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const saveChanges = () => {
    setSaving(true);
    fetch('/api/liveTanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(liveTanks),
    })
      .then((res) => res.json())
      .then(() => {
        setSaving(false);
        alert('✅ Saved successfully');
      })
      .catch((err) => {
        console.error('Failed to save:', err);
        setSaving(false);
        alert('❌ Failed to save');
      });
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Live Tank Selection</h2>
      <p>Select which tanks are currently active ("Live").</p>
      {Object.entries(grouped).map(([prefix, tanks]) => (
        <div key={prefix} style={{ marginBottom: '1rem' }}>
          <h4>Pad {prefix}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {tanks.map(({ id, status }) => (
              <label key={id} style={{ minWidth: '60px' }}>
                <input
                  type="checkbox"
                  checked={status}
                  onChange={() => toggleTank(id)}
                />{' '}
                {id}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={saveChanges} disabled={saving}>
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

export default LiveTankSelector;
