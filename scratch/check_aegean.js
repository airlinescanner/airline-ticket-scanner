import sqlite3 from 'sqlite3';
import path from 'path';

// This is a scratch script to check Aegean Airlines in the DB
const dbPath = path.join(process.cwd(), 'airline-scanner.db'); // Assuming this name
const db = new sqlite3.Database(dbPath);

db.get("SELECT * FROM airlines WHERE iataCode = 'A3'", (err, row) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Aegean Airlines current DB state:', row);
  }
  db.close();
});
