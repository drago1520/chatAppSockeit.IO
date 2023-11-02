import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import path from 'path'; // Import the path module

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));
const frontEnd = path.join(__dirname, 'front-end');
const finalPath =  path.join(frontEnd, 'index.html');



const app = express();
const server = createServer(app);
app.use(express.static(frontEnd));

app.get('/', (req, res) => {
  res.sendFile(finalPath);
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
const io = new Server(server);

io.on('connection', (socket) => {
  console.log('a user connected');
  io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
      console.log('message: ' + msg);
    });
  });
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});