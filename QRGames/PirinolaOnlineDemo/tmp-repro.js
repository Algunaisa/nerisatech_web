const { io } = require('socket.io-client');

const host = io('http://localhost:3000', { transports: ['websocket'], forceNew: true });
host.on('connect', () => {
  console.log('host connected', host.id);
  host.emit('create-room', { playerName: 'Host' });
});

host.on('room-created', (payload) => {
  console.log('room-created', payload.room.code, payload.room.players.map(p => p.name));
  const joiner = io('http://localhost:3000', { transports: ['websocket'], forceNew: true });
  joiner.on('connect', () => {
    joiner.emit('join-room', { roomCode: payload.room.code, playerName: 'Joiner' });
  });
  joiner.on('joined-room', (response) => {
    console.log('joined-room', response.room.players.map(p => p.name));
    joiner.disconnect();
    host.disconnect();
  });
  joiner.on('room-error', (err) => {
    console.error('join-error', err);
    joiner.disconnect();
    host.disconnect();
  });
});

host.on('room-error', (err) => {
  console.error('create-error', err);
  host.disconnect();
});
