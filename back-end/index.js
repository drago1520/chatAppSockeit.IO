import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import path from 'path';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename));
const frontEnd = path.join(__dirname, 'front-end');
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
      content TEXT
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
  console.log("User connected");
  socket.on('chat message', async (msg, clientOffset, acknowledgementCallback) => {
    let result;
    
    try {
      result = await db.run('INSERT INTO messages (content, client_offset) VALUES (?, ?)', msg, clientOffset);
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
    io.emit('chat message', msg, result.lastID);
    fetchSheetData();
    //acknowledge the event
    acknowledgementCallback();
  });
  socket.on("disconnect", () => {console.log("User disconnected")});

  if (!socket.recovered) {
    // if the connection state recovery was not successful
    try {
      await db.each('SELECT id, content FROM messages WHERE id > ?',
        [socket.handshake.auth.serverOffset || 0],
        (_err, row) => {
          socket.emit('chat message', row.content, row.id);
        }
      )
    } catch (e) {
      // something went wrong
    }
  }
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
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
