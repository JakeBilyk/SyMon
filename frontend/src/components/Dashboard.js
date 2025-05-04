import React, { useState, useEffect, useRef } from 'react';
import NextLogCountdown from './NextLogCountdown';

function Dashboard() {
  const [tankData, setTankData] = useState([]);
  const [liveTanks, setLiveTanks] = useState({});
  const [prefixes, setPrefixes] = useState([]);
  const scrollContainerRef = useRef(null);
  const scrollDirection = useRef(1);

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
          const isStale = data.timestamp ? (Date.now() - new Date(data.timestamp)) > 16 * 60 * 1000 : true;
          return { id, ...data, isStale };
        })
      );
      setTankData(allData);
    };

    if (Object.keys(liveTanks).length > 0) {
      fetchTankData();
    }
  }, [liveTanks]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollStep = 1;
    const scrollInterval = 75;

    const interval = setInterval(() => {
      if (container.scrollTop + container.clientHeight >= container.scrollHeight) {
        scrollDirection.current = -1;
      } else if (container.scrollTop <= 0) {
        scrollDirection.current = 1;
      }
      container.scrollTop += scrollStep * scrollDirection.current;
    }, scrollInterval);

    return () => clearInterval(interval);
  }, []);

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
              <th>(°C)</th>
            </tr>
          </thead>
          <tbody>
            {tanks.map((tank) => {
              const phStyle =
                tank.pH > 8.9 ? { backgroundColor: 'orange' } :
                tank.pH < 7.0 ? { backgroundColor: 'yellow' } : {};
              const tempStyle =
                tank.temperature > 27.5 ? { backgroundColor: 'red', color: 'white' } :
                tank.temperature < 20 ? { backgroundColor: 'lightblue' } : {};

              const flag = tank.isStale ? (
                <span
                  title={`Last update: ${tank.timestamp ? new Date(tank.timestamp).toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' }) : 'Unknown'}`}
                  style={{ marginLeft: '6px', color: 'orange' }}
                >
                  ⚠️
                </span>
              ) : null;

              return (
                <tr key={tank.id} style={tank.isStale ? { opacity: 0.5 } : {}}>
                  <td>{tank.id}{flag}</td>
                  <td style={phStyle}>{tank.pH}</td>
                  <td style={tempStyle}>{tank.temperature}</td>
                </tr>
              );
            })}
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
      <div
        ref={scrollContainerRef}
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          flexWrap: 'wrap',
          height: '75vh',
          overflowY: 'auto',
          scrollBehavior: 'smooth',
        }}
      >
        {prefixes.map((prefix) => renderColumn(prefix))}
      </div>
    </div>
  );
}

export default Dashboard;
