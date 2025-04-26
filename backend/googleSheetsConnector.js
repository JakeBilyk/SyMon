// googleSheetsConnector.js

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Load Google Service Account credentials
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'google-service-account.json'), // <-- You will place your service account key here
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Initialize Sheets API client
const sheets = google.sheets({ version: 'v4', auth });

// Your Google Sheet ID (copy from your Google Sheets URL)
const SPREADSHEET_ID = '1xAUnA61MWsFZLquQmvoowYkEkfKz_2fxOiqXK9h87gM';

// The name of the sheet tab inside the spreadsheet
const SHEET_NAME = 'Sheet1'; // or whatever tab name you want

async function logDataToGoogleSheets(tankId, pH, temperature) {
  try {
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      timeZone: 'Pacific/Honolulu',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '-').replace(',', '');

    const newRow = [timestamp, tankId, pH, temperature];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [newRow],
      },
    });

    console.log(`Logged to Google Sheets: ${newRow.join(', ')}`);
  } catch (err) {
    console.error('Error logging data to Google Sheets:', err);
  }
}

module.exports = { logDataToGoogleSheets };
