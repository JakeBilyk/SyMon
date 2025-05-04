// Fully updated server.js with /api/liveTanks, pH alarm at 8.9, and /tank/:id/data using log fallback
const express = require('express');
const net = require('net');
const Modbus = require('jsmodbus');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const port = 5000;
app.use(express.json());

const tankIPs = require('./tankConfig');
const tankIds = Object.keys(tankIPs);
const logFilePath = path.join(__dirname, 'tank-data-log.csv');
const liveTanksPath = path.join(__dirname, 'liveTanks.json');

let lastLogTime = null;
let nextLogTime = null;

function getFormattedTimestamp() {
  const now = new Date();
  return now.toLocaleString('en-US', {
    timeZone: 'Pacific/Honolulu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(',', '').replace(/\//g, '-');
}

if (!fs.existsSync(logFilePath)) {
  const header = 'Timestamp,Tank ID,pH,Temperature (°C),CO2 Timer (s)\n';
  fs.writeFileSync(logFilePath, header);
}

let liveTanks = {};
if (fs.existsSync(liveTanksPath)) {
  try {
    liveTanks = JSON.parse(fs.readFileSync(liveTanksPath, 'utf8'));
  } catch (err) {
    console.error('Error reading liveTanks.json:', err);
  }
}
tankIds.forEach((id) => { if (!(id in liveTanks)) liveTanks[id] = true; });
Object.keys(liveTanks).forEach((id) => { if (!tankIds.includes(id)) delete liveTanks[id]; });
fs.writeFileSync(liveTanksPath, JSON.stringify(liveTanks, null, 2));

function decodeModbusFloat(buffer) {
  const swappedBuffer = Buffer.from([buffer[2], buffer[3], buffer[0], buffer[1]]);
  return swappedBuffer.readFloatBE(0);
}

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
        .catch(reject);
    });

    client.on('error', reject);
    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Connection timed out'));
    });
  });
}

function getCO2Timer(ip) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const modbusClient = new Modbus.client.TCP(client, 1);

    client.setTimeout(20000);
    client.connect(502, ip, () => {
      modbusClient.readHoldingRegisters(155, 2)
        .then((resp) => {
          const buffer = resp.response._body.valuesAsBuffer;
          const co2Time = buffer.readInt32BE(0);
          resolve(co2Time);
        })
        .catch(reject);
    });

    client.on('error', reject);
    client.on('timeout', () => {
      client.destroy();
      reject(new Error('Connection timed out'));
    });
  });
}

function logDataToFile(tankId, pH, temperature, co2Time) {
  const timestamp = getFormattedTimestamp();
  const logEntry = `${timestamp},${tankId},${pH},${temperature},${co2Time}\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error('Failed to write log entry:', err);
  });
  lastLogTime = Date.now();
  nextLogTime = lastLogTime + 15 * 60 * 1000;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ALERT_EMAIL_USER,
    pass: process.env.ALERT_EMAIL_PASS,
  },
});

const alertedTanks = new Set();

function sendAlarmEmail(tankId, alarmType, value) {
  const mailOptions = {
    from: process.env.ALERT_EMAIL_USER,
    to: process.env.ALERT_EMAIL_RECIPIENTS,
    subject: `🚨 Alarm: ${alarmType} - ${tankId}`,
    text: `Alarm triggered on ${tankId}: ${alarmType} = ${value}\n\nCheck the tank controller.`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) return console.error('Email failed:', err);
    console.log(`✅ Email sent for ${tankId} (${alarmType}) → ${info.accepted.join(', ')}`);
  });
}

function continuousFetch(tankIds, delay = 900000) {
  async function fetchAndLog() {
    console.log(`Starting data logging cycle at ${getFormattedTimestamp()}`);

    for (const tankId of tankIds) {
      if (!liveTanks[tankId]) continue;

      try {
        const pH = await getModbusData(tankIPs[tankId], 20);
        const temperature = await getModbusData(tankIPs[tankId], 22);
        const co2Time = await getCO2Timer(tankIPs[tankId]);

        logDataToFile(tankId, pH.toFixed(1), temperature.toFixed(1), co2Time);

        if (pH > 8.9 && !alertedTanks.has(`${tankId}-pH`)) {
          sendAlarmEmail(tankId, 'High pH', pH.toFixed(1));
          alertedTanks.add(`${tankId}-pH`);
        } else if (pH <= 8.9) {
          alertedTanks.delete(`${tankId}-pH`);
        }

        if (temperature > 26.5 && !alertedTanks.has(`${tankId}-temp`)) {
          sendAlarmEmail(tankId, 'High Temperature', temperature.toFixed(1));
          alertedTanks.add(`${tankId}-temp`);
        } else if (temperature <= 26.5) {
          alertedTanks.delete(`${tankId}-temp`);
        }

      } catch (err) {
        console.error(`Error fetching data for tank ${tankId}:`, err.message);
      }
    }

    console.log(`Finished data logging cycle at ${getFormattedTimestamp()}`);
  }

  fetchAndLog();
  setInterval(fetchAndLog, delay);
}

continuousFetch(tankIds);

app.get('/api/nextLogTime', (req, res) => {
  res.json({
    lastLogTime,
    nextLogTime,
    timeRemaining: nextLogTime ? Math.max(0, nextLogTime - Date.now()) : null
  });
});

app.get('/api/liveTanks', (req, res) => {
  res.json(liveTanks);
});

app.post('/api/liveTanks', (req, res) => {
  liveTanks = req.body;
  fs.writeFileSync(liveTanksPath, JSON.stringify(liveTanks, null, 2));
  res.json({ message: 'Live tank status updated.' });
});

app.get('/tank/:id/data', (req, res) => {
  const tankId = req.params.id;
  if (!tankId) return res.status(400).json({ error: 'Tank ID is required' });

  if (!fs.existsSync(logFilePath)) {
    return res.status(404).json({ error: 'No log file found' });
  }

  try {
    const lines = fs.readFileSync(logFilePath, 'utf8').trim().split('\n');
    const reversed = lines.reverse();
    for (const line of reversed) {
      if (line.includes(tankId)) {
        const [timestamp, id, pH, temperature] = line.split(',');
        if (id === tankId) {
          return res.json({ pH: parseFloat(pH), temperature: parseFloat(temperature), timestamp });
        }
      }
    }
    return res.status(404).json({ error: 'No recent data found for this tank' });
  } catch (err) {
    return res.status(500).json({ error: 'Error reading log file', details: err.message });
  }
});

app.get('/tankIds', (req, res) => {
  res.json(tankIds);
});

app.get('/download-log', (req, res) => {
  res.download(logFilePath, 'tank-data-log.csv', (err) => {
    if (err) {
      console.error('Error sending log file:', err);
      res.status(500).send('Error downloading the log file.');
    }
  });
});

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening at http://0.0.0.0:${port}`);
});
