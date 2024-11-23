import React, { useState, useEffect } from 'react';

function Dashboard() {
  const [tankData, setTankData] = useState([]);

  useEffect(() => {
    // List of all tank IDs
    const tankIds = [
      'C08', 'C12', 'C13', 'C14', 'C15', 'C16',
      'D01', 'D02', 'D03', 'D04', 'D05', 'D06',
      'D07', 'D08', 'D09', 'D10', 'D11', 'D12',
      'D13', 'D14', 'D15', 'D16', 'D17', 'D18',
      'D19', 'D20', 'D21', 'D22', 'D23', 'D24',
      'D25', 'D26', 'E01', 'E02', 'E03', 'E04',
      'E05', 'L01', 'L02', 'X01', 'X02', 'X03', 'X04',
    ];

    // Fetch data for all tanks
    const fetchTankData = async () => {
      const allData = await Promise.all(
        tankIds.map(async (id) => {
          const response = await fetch(`/tank/${id}/data`);
          const data = await response.json();
          return { id, ...data };
        })
      );
      setTankData(allData);
      console.log('All tank data:', allData); // Debugging line
    };

    fetchTankData();
  }, []);

  // Helper function to group tanks by prefix
  const groupTanksByPrefix = (prefix) => {
    return tankData.filter((tank) => tank.id.startsWith(prefix));
  };

  // Render a column for a specific prefix
  const renderColumn = (prefix) => {
    const tanks = groupTanksByPrefix(prefix);
    return (
      <div style={{ margin: '10px' }}>
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
      {/* Download button for log file */}
      <div style={{ marginBottom: '20px' }}>
        <a href="/download-log" download>
          <button>Download Log File</button>
        </a>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
        {['C', 'D', 'E', 'L', 'X'].map((prefix) => renderColumn(prefix))}
      </div>
    </div>
  );
}

export default Dashboard;
