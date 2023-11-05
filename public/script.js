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
    //Display directly (local only) instead of 1.Upload to server --> 2.Recieve from server --> 3.Display
    socket.emit('chat message', input.value, clientOffset);
    const msgUnescaped = unescapeHtml(input.value);
    const item = document.createElement('li');
    item.textContent = `${nickname}: ${msgUnescaped}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
    input.value = '';
    
  }
});
//ServeFinalNickname is the retrieved from Database. the "nickname" from above is only not used.
//Recieves a message from server. (Except the sender.)
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

//Add {user} is typing feature.
const inputField = document.getElementById('input');
let lastKeypressTime = 0;
// For how long to display if a user is typing after a keypress?
let typingInterval = 2000; // 3 seconds
let typingTimeout;

// Function to emit typing status
function emitTypingStatus(isTyping) {
  socket.emit('typing', { isTyping: isTyping });
}
// Event listener for keypress
inputField.addEventListener('keypress', () => {
  const currentTime = Date.now();

  // If the time since the last keypress is more than 3 seconds, emit isTyping: true
  if (currentTime - lastKeypressTime > typingInterval) {
    console.log(currentTime - lastKeypressTime);
    emitTypingStatus(true);
  }

  // Update the lastKeypressTime to the current time
  lastKeypressTime = currentTime;

  // Clear any existing timeout
  clearTimeout(typingTimeout);

  // Set a timeout to emit isTyping: false after 3 seconds of inactivity
  typingTimeout = setTimeout(() => {
    emitTypingStatus(false);
  }, typingInterval);
});

// Make sure to emit isTyping: false when the user navigates away from the input field
inputField.addEventListener('blur', () => {
  clearTimeout(typingTimeout);
  emitTypingStatus(false);
});


socket.on('userTyping', (serverResponse) => {
  if (serverResponse.isTyping) {
    // Show some indicator that the user is typing
    console.log(`User ${serverResponse.userId} is typing... server side`);
    const h5 = document.createElement('h5');
    h5.setAttribute('id', 'message-heading'); // Set the ID for the h5 element
    h5.textContent = `${serverResponse.userId} is typing...`; // Replace with your text
    // Insert the h5 before the form
    form.parentNode.insertBefore(h5, form);

  } else {
    // Hide the typing indicator
    console.log(`User ${serverResponse.userId} stopped typing.`);
    document.getElementById('message-heading').remove();
    
  }
});
