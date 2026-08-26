const express = require('express');
const mysql = require('mysql');
const session = require('express-session');
const md5 = require('md5');
const _ = require('lodash');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// VULNERABILITY: Hardcoded credentials (Secret Scanning)
const DB_CONFIG = {
  host: 'localhost',
  user: 'admin',
  password: 'SuperSecret123!',
  database: 'webapp'
};

// VULNERABILITY: Hardcoded API key
const API_KEY = 'sk-1234567890abcdef1234567890abcdef';

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// VULNERABILITY: Weak session configuration
app.use(session({
  secret: 'weak-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, httpOnly: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Database connection
const db = mysql.createConnection(DB_CONFIG);

// VULNERABILITY: SQL Injection
app.get('/search', (req, res) => {
  const query = req.query.q;
  const sql = `SELECT * FROM products WHERE name LIKE '%${query}%'`;
  db.query(sql, (err, results) => {
    if (err) {
      res.status(500).send('Database error');
      return;
    }
    res.json(results);
  });
});

// VULNERABILITY: XSS
app.get('/profile', (req, res) => {
  const username = req.query.username || 'Guest';
  res.send(`<!DOCTYPE html><html><head><title>Profile</title></head><body><h1>Welcome, ${username}!</h1></body></html>`);
});

// VULNERABILITY: IDOR
app.get('/user/:id', (req, res) => {
  const userId = req.params.id;
  const sql = `SELECT * FROM users WHERE id = ${userId}`;
  db.query(sql, (err, results) => {
    if (err || results.length === 0) {
      res.status(404).send('User not found');
      return;
    }
    res.json(results[0]);
  });
});

// VULNERABILITY: Command Injection
app.post('/ping', (req, res) => {
  const host = req.body.host;
  const { exec } = require('child_process');
  exec(`ping -c 4 ${host}`, (err, stdout, stderr) => {
    if (err) {
      res.status(500).send(stderr);
      return;
    }
    res.send(stdout);
  });
});

// VULNERABILITY: Path Traversal
app.get('/files', (req, res) => {
  const file = req.query.name;
  const filePath = path.join(__dirname, 'files', file);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).send('File not found');
    }
  });
});

// VULNERABILITY: SSRF
app.get('/fetch', async (req, res) => {
  const url = req.query.url;
  try {
    const response = await axios.get(url);
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Failed to fetch URL');
  }
});

// VULNERABILITY: Insecure Deserialization
app.post('/deserialize', (req, res) => {
  const data = req.body.data;
  try {
    const obj = JSON.parse(data);
    res.json(obj);
  } catch (error) {
    res.status(400).send('Invalid JSON');
  }
});

// VULNERABILITY: Weak Password Hashing
app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = md5(password);
  const sql = `INSERT INTO users (username, password) VALUES ('${username}', '${hashedPassword}')`;
  db.query(sql, (err, results) => {
    if (err) {
      res.status(500).send('Registration failed');
      return;
    }
    res.send('User registered successfully');
  });
});

// VULNERABILITY: Missing Security Headers
app.get('/no-headers', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>No Security Headers</title></head><body><h1>This page has no security headers</h1></body></html>`);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Sample web app running on http://localhost:${PORT}`);
  console.log('WARNING: This application contains intentional vulnerabilities for testing!');
});