const express = require('express');
const net = require('net');
const Modbus = require('jsmodbus');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 5000;

const tankIPs = require('./tankConfig');
const tankIds = Object.keys(tankIPs);
const logFilePath = path.join(__dirname, 'tank-data-log.csv');
const { logDataToGoogleSheets } = require('./googleSheetsConnector');

// Ensure the log file has a header if it doesn't exist
if (!fs.existsSync(logFilePath)) {
  const header = 'Timestamp,Tank ID,pH,Temperature (°C)\n';
  fs.writeFileSync(logFilePath, header);
}

// Function to log data to a CSV file
function logDataToFile(tankId, pH, temperature) {
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    timeZone: 'Pacific/Honolulu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '-').replace(',', '');

  const logEntry = `${timestamp},${tankId},${pH},${temperature}\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error('Failed to write log entry:', err);
  });
}

// Decode IEEE 754 float from Modbus buffer
function decodeModbusFloat(buffer) {
  const swappedBuffer = Buffer.from([buffer[2], buffer[3], buffer[0], buffer[1]]);
  return swappedBuffer.readFloatBE(0);
}

// Function to get Modbus data
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
      client.destroy();
      reject(new Error('Connection timed out'));
    });
  });
}

// Continuous fetch and logging every 15 minutes
function continuousFetch(tankIds, delay = 900000) {
  async function fetchAndLog() {
    console.log(`Starting data logging cycle at ${new Date().toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' })}`);

    for (const tankId of tankIds) {
      try {
        const pH = await getModbusData(tankIPs[tankId], 20);
        const temperature = await getModbusData(tankIPs[tankId], 22);
        logDataToFile(tankId, pH.toFixed(1), temperature.toFixed(1));
        logDataToGoogleSheets(tankId, pH.toFixed(1), temperature.toFixed(1));
      } catch (err) {
        console.error(`Error fetching data for tank ${tankId}:`, err.message);
      }
    }

    console.log(`Finished data logging cycle at ${new Date().toLocaleString('en-US', { timeZone: 'Pacific/Honolulu' })}`);
  }

  fetchAndLog();
  setInterval(fetchAndLog, delay);
}

// Start continuous logging
continuousFetch(tankIds);

// API route: Get live tank data
app.get('/tank/:id/data', async (req, res) => {
  const tankId = req.params.id;
  const ip = tankIPs[tankId];

  if (!ip) return res.status(404).json({ error: 'Tank not found' });

  try {
    const pH = await getModbusData(ip, 20);
    const temperature = await getModbusData(ip, 22);
    res.json({ pH: parseFloat(pH.toFixed(1)), temperature: parseFloat(temperature.toFixed(1)) });
  } catch (err) {
    res.status(500).json({ error: 'Modbus read failed', details: err.message });
  }
});

// API route: Get list of tank IDs
app.get('/tankIds', (req, res) => {
  res.json(tankIds);
});

// Serve the CSV log file
app.get('/download-log', (req, res) => {
  res.download(logFilePath, 'tank-data-log.csv', (err) => {
    if (err) {
      console.error('Error sending log file:', err);
      res.status(500).send('Error downloading the log file.');
    }
  });
});

// Serve static files and frontend
app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening at http://0.0.0.0:${port}`);
});