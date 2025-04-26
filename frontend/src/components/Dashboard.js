import React, { useState, useEffect } from 'react';
import '../App.css'; // Make sure to import the CSS for the spinner

function Dashboard() {
  const [tankData, setTankData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTankData = async () => {
      try {
        const tankIdsResponse = await fetch('/tankIds');
        const tankIds = await tankIdsResponse.json();

        const allData = await Promise.all(
          tankIds.map(async (id) => {
            const response = await fetch(`/tank/${id}/data`);
            const data = await response.json();
            return { id, ...data };
          })
        );

        setTankData(allData);
        console.log('All tank data:', allData);
      } catch (error) {
        console.error('Error fetching tank data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTankData();
  }, []);

  const groupTanksByPrefix = (prefix) => {
    return tankData.filter((tank) => tank.id.startsWith(prefix));
  };

  const renderColumn = (prefix) => {
    const tanks = groupTanksByPrefix(prefix);

    return (
      <div key={prefix} style={{ margin: '10px' }}>
        <h3>Column {prefix}</h3>
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

      {loading ? (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <h2>Loading tank data...</h2>
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '20px' }}>
            <a href="/download-log" download>
              <button>Download Log File</button>
            </a>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
            {Array.from(new Set(tankData.map((tank) => tank.id.charAt(0))))
              .sort()
              .map((prefix) => renderColumn(prefix))}
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;
