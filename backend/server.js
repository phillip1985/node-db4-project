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

server.use((err, req, res, next) => { // eslint-disable-line
    res.status(500).json({
        message: err.message,
        stack: err.stack,
    });
});


module.exports = server;