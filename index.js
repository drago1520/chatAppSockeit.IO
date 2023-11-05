import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import escapeHtml from 'escape-html';


const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
const frontEnd = path.join(__dirname, 'public');
const finalPath =  path.join(frontEnd, 'index.html');
// open the database file
const db = await open({
  filename: 'chat.db',
  driver: sqlite3.Database
});

// create our 'messages' table (you can ignore the 'client_offset' column for now)
await db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      content TEXT,
      nickname TEXT
  );
`);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});
app.use(express.static(frontEnd));

app.get('/', (req, res) => {
  res.sendFile(finalPath);
});

//ClientOffset prevents message duplication! 

io.on('connection', async (socket) => {
  let nickname = socket.handshake.auth.nickname;
  console.log("User connected");
  io.emit('user connection', "User connected");
  try {
    const messages = await db.all("SELECT id, content, nickname FROM messages");
    messages.forEach((message) => {
      socket.emit('chat message', message.content, message.id, message.nickname);
    });
  } catch (e) {
    console.error("Failed to retrieve message history:", e);
  }
  
  socket.on('chat message', async (msg, clientOffset, acknowledgementCallback) => {
    let result;
    nickname = socket.handshake.auth.nickname;
    const escapedMsg = escapeHtml(msg);
    
    try {
      result = await db.run('INSERT INTO messages (content, client_offset, nickname) VALUES (?, ?, ?)', escapedMsg, clientOffset, nickname);
      
      
    } catch (e) {
      // TODO handle the failure
      if (e.errno === 19 /* SQLITE_CONSTRAINT */ ) {
        // the message was already inserted, so we notify the client
        acknowledgementCallback();
      } else {
        // nothing to do, just let the client retry
      }
      return;
    }
    // Broadcast the message to everyone except the sender
    socket.broadcast.emit('chat message', escapedMsg, result.lastID, nickname);
  
  // Optionally, you can still emit a separate event to the sender if needed
  // socket.emit('chat message', escapedMsg, result.lastID, nickname);
  
    //acknowledge the event
    acknowledgementCallback();
  });
  socket.on("disconnect", () => {
    console.log("User disconnected");
    io.emit('user connection', "User disconnected");
  });
  if (!socket.recovered) {
    // if the connection state recovery was not successful
    try {
      
      await db.each('SELECT id, content, nickname FROM messages WHERE id > ?',
        [socket.handshake.auth.serverOffset || 0],
        (_err, row) => {
          socket.emit('chat message', row.content, row.id, row.nickname);
        }
      )
    } catch (e) {
      // something went wrong
    }
  }
  
  //Implement {user} is typing featrure.
  socket.on('typing', (data, acknowledgementCallback) => {
    
    // Broadcast to others that this user is typing
    console.log(data, nickname);
    socket.broadcast.emit('userTyping', { userId: nickname, isTyping: data.isTyping });
    acknowledgementCallback();
  });
});

const port = process.env.PORT || 3000; // Use Heroku's port or 3000 if local
server.listen(port, () => {
  console.log(`server running on port ${port}`);
});

async function fetchSheetData() {
  try {
    const rows = await db.all("SELECT * FROM messages");
    rows.forEach((row) => {
      console.log(row);
    });
  } catch (err) {
    // Handle the error here
    console.error(err);
  }
}
