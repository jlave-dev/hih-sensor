const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs-extra');
const path = require('path');

// Create CSV files if they don't exist
if (!fs.existsSync('./inlet.csv')) {
  fs.writeFileSync('./inlet.csv', 'timestamp,humidity,temperature');
}
if (!fs.existsSync('./outlet.csv')) {
  fs.writeFileSync('./outlet.csv', 'timestamp,humidity,temperature');
}

app.get('/', (req, res) => {
  res.sendFile(path.resolve('./index.html'));
});

app.get('/download', (req, res) => {
  const csvData = fs.readFileSync(path.resolve('./humidity_test.csv'));
  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename=humidity_test.csv',
  });
  res.send(csvData);
});

app.get('/most-recent', async (req, res) => {
  try {
    const inletData = await fs.readFile('./inlet.csv', 'utf-8');
    const outletData = await fs.readFile('./outlet.csv', 'utf-8');

    const splitInletData = inletData.split('\n');
    const recentInletArray = splitInletData.length > 1 ?
      splitInletData[splitInletData.length - 1].split(',') :
      null;
    const recentInlet = recentInletArray ? {
      timestamp: new Date(recentInletArray[0]),
      humidity: parseFloat(recentInletArray[1]),
      temperature: parseFloat(recentInletArray[2]),
    } : null;

    const splitOutletData = outletData.split('\n');
    const recentOutletArray = splitOutletData.length > 1 ?
      splitOutletData[splitOutletData.length - 1].split(',') :
      null;
    const recentOutlet = recentOutletArray ? {
      timestamp: new Date(recentOutletArray[0]),
      humidity: parseFloat(recentOutletArray[1]),
      temperature: parseFloat(recentOutletArray[2]),
    } : null;

    const reading = {
      ...({ inlet: recentInlet } || {}),
      ...({ outlet: recentOutlet } || {}),
    };

    res.send(reading);
  } catch (error) {
    console.error(error);
    res.sendStatus(500);
  }
});

// Handle GET request containing a reading
app.get('/sensor', (req, res) => {
  const { sensor, humidity, temperature } = req.query;

  // Send relevant object to frontend
  const timestamp = new Date();
  const reading = { [sensor]: { timestamp, humidity, temperature } };
  io.sockets.emit('reading', reading);

  // Build CSV string for backend
  const csvData = `\n${timestamp},${humidity},${temperature}`;

  // Append string to end of appropriate CSV file
  fs.appendFile(`./${sensor}.csv`, csvData, (err) => {
    if (err) return res.sendStatus(500);
    return res.sendStatus(200);
  });
});

server.listen(8080, () => console.log('Server listening on port 8080'));
