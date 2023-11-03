let counter = 0;
function unescapeHtml(escapedStr) {
  return escapedStr
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
const nickname = prompt('Enter your nickname');

  const socket = io({
    auth: {
      serverOffset: 0,
      nickname: nickname
    },
    // enable retries
    ackTimeout: 10000,
    retries: 3,
  });

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    // compute a unique offset
    const clientOffset = `${socket.id}-${counter++}`;
    socket.emit('chat message', input.value, clientOffset);
    input.value = '';
  }
});
//ServeFinalNickname is the retrieved from Database. the "nickname" from above is only not used.
socket.on('chat message', (msg, serverOffset, ServerFinalNickname) => {
  //message recieved is escaped HTML. 
  console.log(ServerFinalNickname);
  const msgUnescaped = unescapeHtml(msg);
  const item = document.createElement('li');
  item.textContent = `${ServerFinalNickname}: ${msgUnescaped}`;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
  socket.auth.serverOffset = serverOffset;
  console.log(serverOffset)
});
socket.on('user connection', (msg) => {
  console.log(msg);
})