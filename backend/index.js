const server = require('./server.js');

const PORT = process.env.SERVER_PORT || 9009;

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}...`);
});