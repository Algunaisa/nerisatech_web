(function () {
  const socket = window.io ? window.io() : null;
  if (!socket) {
    console.warn('Socket.IO no está disponible, la modalidad multijugador no se activará.');
    return;
  }

  window.__pirinolaMultiplayerEnabled = true;
  const overlay = document.createElement('div');
  overlay.id = 'multiplayer-overlay';
  overlay.style.cssText = [
    'position: fixed',
    'inset: 0',
    'z-index: 20',
    'display: none',
    'align-items: center',
    'justify-content: center',
    'background: rgba(5, 8, 24, 0.86)',
    'padding: 20px',
    'font-family: Courier New, monospace',
    'color: #ffffff'
  ].join(';');

  overlay.innerHTML = `
    <div style="width:min(480px,100%);padding:22px;border:2px solid #36d6c9;border-radius:18px;background:#0b1028;box-shadow:0 0 24px rgba(54,214,201,0.25);">
      <div style="text-align:center;font-size:28px;font-weight:700;color:#36d6c9;">Pirinola Online</div>
      <div style="margin-top:10px;text-align:center;color:#c8c8dc;font-size:14px;">Crea una sala o únete con un código para jugar con tus amigos.</div>
      <div style="margin-top:16px;display:grid;gap:10px;">
        <input id="playerName" placeholder="Tu nombre" value="Jugador" style="padding:10px 12px;border-radius:10px;border:2px solid #333a5c;background:#16162a;color:#fff;" />
        <div style="display:flex;gap:8px;">
          <button id="btnCreate" style="flex:1;padding:10px;border:none;border-radius:10px;background:#ffd36a;color:#101020;font-weight:700;">Crear sala</button>
          <button id="btnJoin" style="flex:1;padding:10px;border:none;border-radius:10px;background:#36d6c9;color:#101020;font-weight:700;">Unirse</button>
        </div>
        <input id="roomCode" placeholder="Código de sala" maxlength="4" style="padding:10px 12px;border-radius:10px;border:2px solid #333a5c;background:#16162a;color:#fff;text-transform:uppercase;" />
        <button id="btnStart" style="padding:10px;border:none;border-radius:10px;background:#75f0a5;color:#101020;font-weight:700;display:none;">Iniciar partida</button>
      </div>
      <div id="roomStatus" style="margin-top:16px;min-height:54px;color:#ffd36a;font-size:15px;font-weight:700;text-align:center;"></div>
      <div id="roomPlayers" style="margin-top:10px;color:#c8c8dc;font-size:14px;text-align:left;"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  window.__pirinolaShowMultiplayerLobby = function () {
    overlay.style.display = 'flex';
  };
  window.dispatchEvent(new Event('pirinola-multiplayer-ready'));

  const playerNameInput = overlay.querySelector('#playerName');
  const roomCodeInput = overlay.querySelector('#roomCode');
  const roomStatus = overlay.querySelector('#roomStatus');
  const roomPlayers = overlay.querySelector('#roomPlayers');
  const startButton = overlay.querySelector('#btnStart');

  const state = {
    room: null,
    me: null,
    pendingState: null
  };

  window.__pirinolaMultiplayer = state;

  function setStatus(message, tone = '#ffd36a') {
    roomStatus.textContent = message;
    roomStatus.style.color = tone;
  }

  function renderPlayers() {
    if (!state.room) {
      roomPlayers.innerHTML = '';
      return;
    }
    const items = (state.room.players || []).map((player) => `• ${player.name}`).join('<br>');
    roomPlayers.innerHTML = `<div style="font-weight:700;color:#36d6c9;">Jugadores:</div>${items}`;
  }

  function renderLobby() {
    if (!state.room) {
      startButton.style.display = 'none';
      return;
    }
    const isHost = state.room.hostId === state.me?.id;
    startButton.style.display = isHost && state.room.state.status === 'lobby' ? 'block' : 'none';
    renderPlayers();
    const roomLabel = `Sala: ${state.room.code}`;
    setStatus(`${roomLabel} · Esperando a ${Math.max(0, 2 - (state.room.players || []).length)} más`, '#36d6c9');
  }

  overlay.querySelector('#btnCreate').onclick = () => {
    socket.emit('create-room', { playerName: playerNameInput.value || 'Host' });
  };

  overlay.querySelector('#btnJoin').onclick = () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    if (!roomCode) {
      setStatus('Ingresa un código de sala', '#ff8f8f');
      return;
    }
    socket.emit('join-room', {
      roomCode,
      roomId: state.room?.id || '',
      playerName: playerNameInput.value || 'Jugador'
    });
  };

  startButton.onclick = () => {
    if (!state.room) return;
    socket.emit('start-game', { roomId: state.room.id });
  };

  socket.on('connect', () => setStatus('Conectado. Crea o une una sala.', '#36d6c9'));

  socket.on('room-created', ({ room, player }) => {
    state.room = room;
    state.me = player;
    roomCodeInput.value = room.code;
    renderLobby();
  });

  socket.on('joined-room', ({ room, player }) => {
    state.room = room;
    state.me = player;
    roomCodeInput.value = room.code;
    renderLobby();
    setStatus(`Te uniste a la sala ${room.code}`, '#75f0a5');
  });

  socket.on('room-state', ({ room }) => {
    state.room = room;
    renderLobby();
    if (state.room.state.status === 'playing') {
      window.__pirinolaMultiplayerGameState = state.room.state;
      window.__pirinolaMultiplayerPendingState = state.room.state;
      window.applyMultiplayerState?.(state.room.state);
      overlay.style.display = 'none';
    } else if (state.room.state.status === 'finished') {
      window.__pirinolaMultiplayerGameState = state.room.state;
      window.applyMultiplayerState?.(state.room.state);
    }
  });

  socket.on('room-error', ({ message }) => {
    setStatus(message, '#ff8f8f');
  });

  window.__pirinolaMultiplayerSpin = function () {
    if (!state.room || !state.me || state.room.state.status !== 'playing') return false;
    const currentTurn = state.room.state.players[state.room.state.currentTurnIndex];
    if (currentTurn && currentTurn.id === state.me.id && !state.room.state.awaitingNext) {
      socket.emit('spin', { roomId: state.room.id });
      return true;
    }
    return false;
  };

  window.__pirinolaMultiplayerNextTurn = function () {
    if (!state.room || !state.me || state.room.state.status !== 'playing') return false;
    const currentTurn = state.room.state.players[state.room.state.currentTurnIndex];
    if (currentTurn && currentTurn.id === state.me.id && state.room.state.awaitingNext) {
      socket.emit('next-turn', { roomId: state.room.id });
      return true;
    }
    return false;
  };

  window.__pirinolaMultiplayerRestart = function () {
    if (!state.room || !state.me) return;
    socket.emit('restart-game', { roomId: state.room.id });
  };

  window.__pirinolaMultiplayerLeaveRoom = function () {
    if (state.room) {
      socket.emit('leave-room', { roomId: state.room.id });
    }
    state.room = null;
    state.me = null;
    roomCodeInput.value = '';
    roomPlayers.innerHTML = '';
    startButton.style.display = 'none';
    overlay.style.display = 'none';
    setStatus('Conectado. Crea o une una sala.', '#36d6c9');
  };
})();
