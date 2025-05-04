import React, { useEffect, useState } from 'react';

function LiveTankSelector() {
  const [liveTanks, setLiveTanks] = useState({});
  const [alarmConfig, setAlarmConfig] = useState({
    pHHigh: 8.9,
    pHLow: 7.0,
    tempHigh: 27.5,
    tempLow: 20.0,
    subscribers: ''
  });

  useEffect(() => {
    fetch('/api/liveTanks')
      .then(res => res.json())
      .then(setLiveTanks);

    fetch('/api/alarmConfig')
      .then(res => res.json())
      .then(setAlarmConfig);
  }, []);

  const handleToggle = (id) => {
    setLiveTanks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAlarmChange = (e) => {
    const { name, value } = e.target;
    setAlarmConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    fetch('/api/liveTanks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(liveTanks),
    });

    fetch('/api/alarmConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alarmConfig),
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Live Tank Selector</h2>
      <ul>
        {Object.entries(liveTanks).map(([id, isLive]) => (
          <li key={id}>
            <label>
              <input type="checkbox" checked={isLive} onChange={() => handleToggle(id)} />
              {id}
            </label>
          </li>
        ))}
      </ul>

      <h3>Alarm Thresholds</h3>
      <label>
        pH High:
        <input type="number" step="0.1" name="pHHigh" value={alarmConfig.pHHigh} onChange={handleAlarmChange} />
      </label><br />
      <label>
        pH Low:
        <input type="number" step="0.1" name="pHLow" value={alarmConfig.pHLow} onChange={handleAlarmChange} />
      </label><br />
      <label>
        Temp High (°C):
        <input type="number" step="0.1" name="tempHigh" value={alarmConfig.tempHigh} onChange={handleAlarmChange} />
      </label><br />
      <label>
        Temp Low (°C):
        <input type="number" step="0.1" name="tempLow" value={alarmConfig.tempLow} onChange={handleAlarmChange} />
      </label><br />
      <label>
        Alert Recipients (comma separated emails):
        <input type="text" name="subscribers" value={alarmConfig.subscribers} onChange={handleAlarmChange} style={{ width: '100%' }} />
      </label><br /><br />

      <button onClick={handleSave}>Save Changes</button>
    </div>
  );
}

export default LiveTankSelector;
