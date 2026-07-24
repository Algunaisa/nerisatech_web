const { io } = require('socket.io-client');

const socket1 = io('http://localhost:3000', { transports: ['websocket'] });
const socket2 = io('http://localhost:3000', { transports: ['websocket'] });

function log(label, payload) {
  console.log(label, JSON.stringify(payload));
}

let roomCode = null;

function finish() {
  setTimeout(() => {
    socket1.close();
    socket2.close();
    process.exit(0);
  }, 1000);
}

socket1.on('connect', () => {
  console.log('socket1 connected');
  socket1.emit('create-room', { playerName: 'Alice' });
});

socket1.on('room-created', (payload) => {
  roomCode = payload.room.code;
  log('room-created', payload.room);
  console.log('joining with code', roomCode);
  socket2.emit('join-room', { roomCode, playerName: 'Bob' });
});

socket2.on('connect', () => {
  console.log('socket2 connected');
});

socket2.on('joined-room', (payload) => {
  log('joined-room', payload.room);
  finish();
});

socket2.on('room-error', (payload) => {
  log('room-error', payload);
  finish();
});

socket1.on('connect_error', (err) => console.error('socket1 err', err));
socket2.on('connect_error', (err) => console.error('socket2 err', err));
