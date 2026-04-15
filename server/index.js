'use strict';
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const { initDb } = require('./db/init');
const { scheduleAlerts } = require('./services/alerts');

initDb();

const app = express();
const PORT = parseInt(process.env.PORT) || 3001;

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(compression());
app.use(morgan('combined'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/bases', require('./routes/bases'));
app.use('/api/items', require('./routes/items'));
app.use('/api/mouvements', require('./routes/mouvements'));
app.use('/api/history', require('./routes/history'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/export', require('./routes/export'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '3.0.1' }));

const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(🚀 MRDPSTOCK v3.0.1 démarré sur port );
  scheduleAlerts();
});
