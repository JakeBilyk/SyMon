import React, { useState, useEffect } from 'react';
import NextLogCountdown from './NextLogCountdown';

function Dashboard() {
  const [tankData, setTankData] = useState([]);
  const [liveTanks, setLiveTanks] = useState({});
  const [prefixes, setPrefixes] = useState([]);

  useEffect(() => {
    fetch('/api/liveTanks')
      .then((res) => res.json())
      .then((data) => {
        setLiveTanks(data);
        const tankIds = Object.keys(data).filter((id) => data[id]);
        const uniquePrefixes = [...new Set(tankIds.map((id) => id[0]))];
        setPrefixes(uniquePrefixes);
      });
  }, []);

  useEffect(() => {
    const fetchTankData = async () => {
      const liveTankIds = Object.keys(liveTanks).filter((id) => liveTanks[id]);
      const allData = await Promise.all(
        liveTankIds.map(async (id) => {
          const response = await fetch(`/tank/${id}/data`);
          const data = await response.json();
          return { id, ...data };
        })
      );
      setTankData(allData);
    };

    if (Object.keys(liveTanks).length > 0) {
      fetchTankData();
    }
  }, [liveTanks]);

  const groupTanksByPrefix = (prefix) => {
    return tankData.filter((tank) => tank.id.startsWith(prefix));
  };

  const renderColumn = (prefix) => {
    const tanks = groupTanksByPrefix(prefix);
    return (
      <div key={prefix} style={{ margin: '10px' }}>
        <h3>Pad {prefix}</h3>
        <table border="1" cellPadding="10" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Tank ID</th>
              <th>pH</th>
              <th>Temperature (°C)</th>
            </tr>
          </thead>
          <tbody>
            {tanks.map((tank) => (
              <tr key={tank.id}>
                <td>{tank.id}</td>
                <td>{tank.pH}</td>
                <td
                  style={{
                    backgroundColor: tank.temperature > 26 ? 'red' : 'white',
                    color: tank.temperature > 26 ? 'white' : 'black',
                  }}
                >
                  {tank.temperature}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <h1>Tank Data Dashboard</h1>
      <NextLogCountdown />
      <div style={{ marginBottom: '20px' }}>
        <a href="/download-log" download>
          <button>Download Log File</button>
        </a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
        {prefixes.map((prefix) => renderColumn(prefix))}
      </div>
    </div>
  );
}

export default Dashboard;
