const express = require('express');
const helmet = require('helmet');
const recipes_router = require('./recipes_router');
const cors = require('cors');

const server = express();

server.use(cors());
server.use(helmet());
server.use(express.json());
server.use('/api/recipes', recipes_router);

server.get('/', (req, res) => {
    res.status(200).json({ message: 'API is alive' });
});

// Global error handler (must be last)
server.use((err, req, res, next) => {
  // Log error for coverage
  console.error(err);
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) return next(err);
  // Use err.status if set, otherwise 500
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

module.exports = server;