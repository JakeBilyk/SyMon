const express = require('express');
const net = require('net');
const Modbus = require('jsmodbus');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 5000;
const logFilePath = path.join(__dirname, 'tank-data-log.txt');

// Tank IDs and IP mapping
const tankIds = [
  'C08', 'C12', 'C13', 'C14', 'C15', 'C16', 
  'D01', 'D02', 'D03', 'D04', 'D05', 'D06', 
  'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 
  'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 
  'D19', 'D20', 'D21', 'D22', 'D23', 'D24', 
  'D25', 'D26', 'E01', 'E02', 'E03', 'E04', 
  'E05', 'L01', 'L02', 'X01', 'X02', 'X03', 'X04'
];
const tankIPs = {
  C08: '192.168.0.228',
  C12: '192.168.0.220',
  C13: '192.168.0.216',
  C14: '192.168.0.213',
  C15: '192.168.0.214',
  C16: '192.168.0.241',
  D01: '192.168.0.245',
  D02: '192.168.0.232',
  D03: '192.168.0.231',
  D04: '192.168.0.16',
  D05: '192.168.0.234',
  D06: '192.168.0.219',
  D07: '192.168.0.208',
  D08: '192.168.0.201',
  D09: '192.168.0.211',
  D10: '192.168.0.240',
  D11: '192.168.0.249',
  D12: '192.168.0.247',
  D13: '192.168.0.239',
  D14: '192.168.0.233',
  D15: '192.168.0.215',
  D16: '192.168.0.89',
  D17: '192.168.0.217',
  D18: '192.168.0.230',
  D19: '192.168.0.229',
  D20: '192.168.0.236',
  D21: '192.168.0.253',
  D22: '192.168.0.212',
  D23: '192.168.0.250',
  D24: '192.168.0.209',
  D25: '192.168.0.210',
  D26: '192.168.0.206',
  E01: '192.168.0.204',
  E02: '192.168.0.238',
  E03: '192.168.0.205',
  E04: '192.168.0.202',
  E05: '192.168.0.200',
  L01: '192.168.0.237',
  L02: '192.168.0.225',
  X01: '192.168.0.254',
  X02: '192.168.0.244',
  X03: '192.168.0.218',
  X04: '192.168.0.251'
      };

// Function to log data to a file
function logDataToFile(tankId, pH, temperature) {
  const timestamp = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Honolulu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());

  const logEntry = `${timestamp} - Tank ${tankId}: pH=${pH}, Temperature=${temperature}°C\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error('Failed to write log entry:', err);
  });
}

// Function to decode IEEE 754 float from buffer
function decodeModbusFloat(buffer) {
  const swappedBuffer = Buffer.from([buffer[2], buffer[3], buffer[0], buffer[1]]);
  return swappedBuffer.readFloatBE(0);
}

// Modbus client setup
function getModbusData(ip, register) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const modbusClient = new Modbus.client.TCP(client, 1);

    client.setTimeout(20000);
    client.connect(502, ip, () => {
      modbusClient.readHoldingRegisters(register, 2)
        .then((resp) => {
          const buffer = resp.response._body.valuesAsBuffer;
          resolve(decodeModbusFloat(buffer));
        })
        .catch((err) => reject(err));
    });

    client.on('error', (err) => {
      console.error(`Connection error for IP ${ip}:`, err.message);
      reject(err);
    });

    client.on('timeout', () => {
      console.warn(`Timeout for IP ${ip}`);
      client.destroy(); // Ensure the connection is closed
      reject(new Error('Connection timed out'));
    });
    
  });
}

// Continuous fetch function for logging data
function continuousFetch(tankIds, delay = 900000) { // 900,000ms = 15 minutes
  function getHawaiiTime() {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Pacific/Honolulu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date());
  }

  async function fetchAndLog() {
    console.log(`Starting data logging cycle at ${getHawaiiTime()}`);
    for (let i = 0; i < tankIds.length; i++) {
      const tankId = tankIds[i];
      try {
        const pH = await getModbusData(tankIPs[tankId], 20);
        const temperature = await getModbusData(tankIPs[tankId], 22);
        logDataToFile(tankId, pH.toFixed(1), temperature.toFixed(1));
      } catch (err) {
        console.error(`Error fetching data for tank ${tankId}:`, err.message);
      }
    }
    console.log(`Finished data logging cycle at ${getHawaiiTime()}`);
  }

  // Run the fetchAndLog function immediately and at the specified interval
  fetchAndLog(); // Run the first cycle immediately
  setInterval(fetchAndLog, delay);
}


// Start continuous logging every 15 minutes
continuousFetch(tankIds);


// API route to get tank data
app.get('/tank/:id/data', async (req, res) => {
  const tankId = req.params.id;
  const ip = tankIPs[tankId];
  if (!ip) return res.status(404).json({ error: 'Tank not found' });

  try {
    let pH = await getModbusData(ip, 20);
    let temperature = await getModbusData(ip, 22);
    pH = parseFloat(pH.toFixed(1));
    temperature = parseFloat(temperature.toFixed(1));
    res.json({ pH, temperature });
  } catch (err) {
    res.status(500).json({ error: 'Modbus read failed', details: err.message });
  }
});

// Serve the log file
app.get('/download-log', (req, res) => {
  const logFilePath = path.join(__dirname, 'tank-data-log.txt'); // Path to the log file
  res.download(logFilePath, 'tank-data-log.txt', (err) => {
    if (err) {
      console.error('Error while sending log file:', err);
      res.status(500).send('Error downloading the log file.');
    }
  });
});

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, 'build')));

// Serve React app for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening at http://0.0.0.0:${port}`);
});

