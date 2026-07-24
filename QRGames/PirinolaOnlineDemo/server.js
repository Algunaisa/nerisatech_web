const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname)));
app.get('/health', (_req, res) => res.json({ ok: true }));

const rooms = new Map();
const ROOM_CODE_LENGTH = 4;

function sanitizeName(value) {
  return String(value || '').trim().slice(0, 18) || 'Jugador';
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createRoomState() {
  return {
    status: 'lobby',
    currentTurnIndex: 0,
    mesa: 4,
    winner: null,
    lastResult: '',
    lastMessage: 'Esperando jugadores',
    awaitingNext: false,
    nextTurnIndex: null,
    lastSpinnerId: null,
    players: []
  };
}

function createPlayingState(room) {
  const state = {
    status: 'playing',
    currentTurnIndex: 0,
    mesa: 4,
    winner: null,
    lastResult: '',
    lastMessage: '¡Partida iniciada!',
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      points: 4
    }))
  };
  state.awaitingNext = false;
  state.nextTurnIndex = null;
  state.lastSpinnerId = null;
  return state;
}

function getNextActivePlayerIndex(room) {
  const players = room.state.players || [];
  let nextIndex = (room.state.currentTurnIndex + 1) % players.length;
  while (nextIndex !== room.state.currentTurnIndex) {
    if ((players[nextIndex] && players[nextIndex].points > 0)) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % players.length;
  }
  return room.state.currentTurnIndex;
}

function getWinner(room) {
  const activePlayers = (room.state.players || []).filter((player) => player.points > 0);
  return activePlayers.length === 1 ? activePlayers[0] : null;
}

function getRandomResult(mesa) {
  const perfilProbabilidad = mesa <= 0 ? 'nofichas' : 'intenso';
  const perfilesProbabilidad = {
    clasico: [
      { resultado: 'Toma 1', peso: 1 },
      { resultado: 'Toma 2', peso: 1 },
      { resultado: 'Toma Todo', peso: 1 },
      { resultado: 'Todos Ponen', peso: 1 },
      { resultado: 'Pon 1', peso: 1 },
      { resultado: 'Pon 2', peso: 1 }
    ],
    convivencia: [
      { resultado: 'Toma 1', peso: 2 },
      { resultado: 'Toma 2', peso: 2 },
      { resultado: 'Toma Todo', peso: 2 },
      { resultado: 'Todos Ponen', peso: 3 },
      { resultado: 'Pon 1', peso: 2 },
      { resultado: 'Pon 2', peso: 2 }
    ],
    intenso: [
      { resultado: 'Toma 1', peso: 1 },
      { resultado: 'Toma 2', peso: 3 },
      { resultado: 'Toma Todo', peso: 2 },
      { resultado: 'Todos Ponen', peso: 2 },
      { resultado: 'Pon 1', peso: 1 },
      { resultado: 'Pon 2', peso: 3 }
    ],
    nofichas: [
      { resultado: 'Toma 1', peso: 0 },
      { resultado: 'Toma 2', peso: 0 },
      { resultado: 'Toma Todo', peso: 0 },
      { resultado: 'Todos Ponen', peso: 1 },
      { resultado: 'Pon 1', peso: 1 },
      { resultado: 'Pon 2', peso: 1 }
    ]
  };

  const opciones = perfilesProbabilidad[perfilProbabilidad] || perfilesProbabilidad.convivencia;
  let pesoTotal = 0;
  for (const opcion of opciones) {
    pesoTotal += opcion.peso;
  }

  let sorteo = Math.floor(Math.random() * pesoTotal) + 1;
  for (const opcion of opciones) {
    sorteo -= opcion.peso;
    if (sorteo <= 0) {
      return opcion.resultado;
    }
  }

  return opciones[0].resultado;
}

function formatFichas(cantidad) {
  return cantidad === 1 ? '1 ficha' : `${cantidad} fichas`;
}

function calculateOutcome(room, result) {
  const currentIndex = room.state.currentTurnIndex;
  const jugador = room.state.players[currentIndex];
  const jugadorName = jugador ? jugador.name : 'Jugador';
  const mesaAntes = room.state.mesa;
  const puntosAntes = room.state.players.map((entry) => entry.points);
  let mensaje = '';
  let cantidad = 0;

  switch (result) {
    case 'Toma 1':
      if (room.state.mesa <= 0) {
        mensaje = `${jugadorName} quiso tomar, pero la mesa está vacía`;
        break;
      }
      cantidad = Math.min(1, room.state.mesa);
      jugador.points += cantidad;
      room.state.mesa -= cantidad;
      mensaje = `${jugadorName} toma ${formatFichas(cantidad)} de la mesa`;
      break;
    case 'Toma 2':
      if (room.state.mesa <= 0) {
        mensaje = `${jugadorName} quiso tomar, pero la mesa está vacía`;
        break;
      }
      cantidad = Math.min(2, room.state.mesa);
      jugador.points += cantidad;
      room.state.mesa -= cantidad;
      mensaje = cantidad === 2
        ? `${jugadorName} toma ${formatFichas(cantidad)} de la mesa`
        : `${jugadorName} solo encuentra ${formatFichas(cantidad)} en la mesa`;
      break;
    case 'Toma Todo':
      if (room.state.mesa <= 0) {
        mensaje = `${jugadorName} iba por todo, pero la mesa está vacía`;
        break;
      }
      cantidad = room.state.mesa;
      jugador.points += room.state.mesa;
      mensaje = `${jugadorName} limpia la mesa y se lleva ${formatFichas(cantidad)}`;
      room.state.mesa = 0;
      break;
    case 'Todos Ponen':
      for (const player of room.state.players) {
        if (player.points > 0) {
          player.points -= 1;
          room.state.mesa += 1;
          cantidad += 1;
        }
      }
      mensaje = `${cantidad} jugadores ponen 1 ficha`;
      break;
    case 'Pon 1':
      cantidad = Math.min(1, jugador.points);
      jugador.points -= cantidad;
      room.state.mesa += cantidad;
      mensaje = cantidad > 0
        ? `${jugadorName} pone ${formatFichas(cantidad)} en la mesa`
        : `${jugadorName} ya no tiene fichas para poner`;
      break;
    case 'Pon 2':
      cantidad = Math.min(2, jugador.points);
      jugador.points -= cantidad;
      room.state.mesa += cantidad;
      mensaje = cantidad === 2
        ? `${jugadorName} pone ${formatFichas(cantidad)} en la mesa`
        : `${jugadorName} pone su última ficha`;
      break;
    default:
      mensaje = 'Resultado desconocido';
  }

  const activePlayers = room.state.players.filter((player) => player.points > 0);
  if (activePlayers.length <= 1) {
    room.state.winner = activePlayers[0] || null;
    room.state.status = 'finished';
    room.state.lastResult = result;
    room.state.lastMessage = activePlayers[0]
      ? `${activePlayers[0].name} gana la partida`
      : 'Sin ganador';
    room.state.awaitingNext = false;
    room.state.nextTurnIndex = null;
    room.state.lastSpinnerId = jugador ? jugador.id : null;
  } else {
    room.state.lastResult = result;
    room.state.lastMessage = mensaje;
    room.state.awaitingNext = true;
    room.state.nextTurnIndex = getNextActivePlayerIndex(room);
    room.state.lastSpinnerId = jugador ? jugador.id : null;
  }

  return {
    mesaAntes, puntosAntes, mensaje
  };
}

function buildRoomPayload(room) {
  return {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    players: (room.players || []).map((player) => ({
      id: player.id,
      name: player.name,
      connected: player.connected !== false
    })),
    state: {
      status: room.state && room.state.status ? room.state.status : 'lobby',
      currentTurnIndex: room.state && Number.isFinite(room.state.currentTurnIndex) ? room.state.currentTurnIndex : 0,
      mesa: room.state && Number.isFinite(room.state.mesa) ? room.state.mesa : 4,
      winner: room.state && room.state.winner ? room.state.winner : null,
      lastResult: room.state && room.state.lastResult ? room.state.lastResult : '',
      lastMessage: room.state && room.state.lastMessage ? room.state.lastMessage : 'Esperando jugadores',
      awaitingNext: Boolean(room.state && room.state.awaitingNext),
      nextTurnIndex: room.state && Number.isFinite(room.state.nextTurnIndex) ? room.state.nextTurnIndex : null,
      lastSpinnerId: room.state && room.state.lastSpinnerId ? room.state.lastSpinnerId : null,
      players: (room.state && room.state.players ? room.state.players : room.players || []).map((player) => ({
        id: player.id,
        name: player.name,
        points: player.points ?? 4
      }))
    }
  };
}

function syncRoom(room) {
  io.to(room.id).emit('room-state', { room: buildRoomPayload(room) });
}

io.on('connection', (socket) => {
  socket.on('create-room', ({ playerName }) => {
    const roomId = `room-${Date.now().toString(36)}`;
    const code = generateRoomCode();
    const room = {
      id: roomId,
      code,
      hostId: socket.id,
      players: [{ id: socket.id, name: sanitizeName(playerName) || 'Host', connected: true }],
      state: createRoomState()
    };
    room.state.players = room.players.map((player) => ({ id: player.id, name: player.name, points: 4 }));
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('room-created', {
      room: buildRoomPayload(room),
      player: { id: socket.id, name: room.players[0].name }
    });
    syncRoom(room);
  });

  socket.on('join-room', ({ roomCode, roomId, playerName }) => {
    const normalizedCode = String(roomCode || '').toUpperCase();
    const room = rooms.get(roomId || '') || Array.from(rooms.values()).find((item) => item.code === normalizedCode);
    if (!room) {
      socket.emit('room-error', { message: 'No se encontró la sala' });
      return;
    }
    if (room.players.length >= 4) {
      socket.emit('room-error', { message: 'La sala ya tiene 4 jugadores' });
      return;
    }
    if (room.state.status !== 'lobby') {
      socket.emit('room-error', { message: 'La sala ya empezó' });
      return;
    }
    const alreadyJoined = room.players.some((player) => player.id === socket.id);
    if (!alreadyJoined) {
      room.players.push({
        id: socket.id,
        name: sanitizeName(playerName) || `Jugador ${room.players.length + 1}`,
        connected: true
      });
    }
    if (!room.state.players || room.state.players.length !== room.players.length) {
      room.state.players = room.players.map((player) => ({ id: player.id, name: player.name, points: 4 }));
    }
    socket.join(room.id);
    socket.emit('joined-room', {
      room: buildRoomPayload(room),
      player: { id: socket.id, name: room.players.find((player) => player.id === socket.id)?.name || sanitizeName(playerName) }
    });
    syncRoom(room);
  });

  socket.on('start-game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (socket.id !== room.hostId) return;
    if (room.players.length < 2) {
      socket.emit('room-error', { message: 'Se necesitan al menos 2 jugadores' });
      return;
    }
    room.state = createPlayingState(room);
    room.state.players = room.players.map((player) => ({ id: player.id, name: player.name, points: 4 }));
    syncRoom(room);
  });

  socket.on('restart-game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    if (socket.id !== room.hostId) return;
    if (room.players.length < 2) {
      socket.emit('room-error', { message: 'Se necesitan al menos 2 jugadores' });
      return;
    }
    room.state = createPlayingState(room);
    room.state.players = room.players.map((player) => ({ id: player.id, name: player.name, points: 4 }));
    syncRoom(room);
  });

  socket.on('spin', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.state.status !== 'playing') return;
    if (room.state.awaitingNext) return;
    const currentPlayer = room.state.players[room.state.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== socket.id) return;

    const result = getRandomResult(room.state.mesa);
    calculateOutcome(room, result);
    syncRoom(room);
  });

  socket.on('next-turn', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.state.status !== 'playing' || !room.state.awaitingNext) return;

    const currentPlayer = room.state.players[room.state.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== socket.id) return;

    const nextTurnIndex = Number.isFinite(room.state.nextTurnIndex)
      ? room.state.nextTurnIndex
      : getNextActivePlayerIndex(room);
    room.state.currentTurnIndex = nextTurnIndex;
    room.state.awaitingNext = false;
    room.state.nextTurnIndex = null;
    room.state.lastSpinnerId = null;
    room.state.lastResult = '';
    room.state.lastMessage = `Turno de ${room.state.players[nextTurnIndex]?.name || 'Jugador'}`;
    syncRoom(room);
  });

  socket.on('leave-room', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((player) => player.id !== socket.id);
    socket.leave(room.id);

    if (room.players.length === 0) {
      rooms.delete(room.id);
      return;
    }

    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }

    room.state.players = (room.state.players || []).filter((player) => player.id !== socket.id);
    if (room.state.currentTurnIndex >= room.state.players.length) {
      room.state.currentTurnIndex = 0;
    }
    if (room.state.awaitingNext) {
      room.state.nextTurnIndex = getNextActivePlayerIndex(room);
    }
    syncRoom(room);
  });

  socket.on('disconnect', () => {
    const room = Array.from(rooms.values()).find((item) => item.players.some((player) => player.id === socket.id));
    if (!room) return;
    room.players = room.players.filter((player) => player.id !== socket.id);
    if (room.players.length === 0) {
      rooms.delete(room.id);
      return;
    }
    room.state.players = room.state.players.filter((player) => player.id !== socket.id);
    if (room.state.currentTurnIndex >= room.state.players.length) {
      room.state.currentTurnIndex = 0;
    }
    if (room.state.awaitingNext) {
      room.state.nextTurnIndex = getNextActivePlayerIndex(room);
    }
    syncRoom(room);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Servidor activo en http://localhost:3000');
});
