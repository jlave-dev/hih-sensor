const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs');
const path = require('path');

// create CSV file if it doesn't exist
const csvExists = fs.existsSync('./humidity_test.csv');

if (!csvExists) {
  fs.writeFileSync('./humidity_test.csv', 'timestamp,sensor,humidity,temperature\n');
}

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./index.html'));
});

// handle requests
app.get('/sensor', (req, res) => {
  console.log(req.query);

  // get values from query
  const { sensor, humidity, temperature } = req.query;
  const timestamp = new Date();

  const reading = {timestamp, sensor, humidity, temperature};

  io.sockets.emit('reading:received', reading);

  // build CSV string
  const csvData = `${timestamp},${sensor},${humidity},${temperature}\n`;

  // append to end of humidity_test.csv
  fs.appendFile('./humidity_test.csv', csvData, (err) => {
    if (err) return res.sendStatus(500);
    return res.sendStatus(200);
  });
});

server.listen(8080, () => console.log('Server listening on port 8080'));
