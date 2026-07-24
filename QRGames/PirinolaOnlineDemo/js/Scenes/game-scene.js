const temaBase = {
  marca: 'Nerisa Tech',
  titulo: 'Pirinola Pocket',
  subtituloInicio: 'Únete a una sala multijugador',
  footer: 'QR Games by Nerisa Tech',
  textos: {
    seccionJugadores: 'Jugadores',
    rangoJugadores: 'Máximo 4 jugadores',
    seccionNombres: 'Nombres',
    botonCrear: 'ENTRAR'
  },
  maximoCaracteresNombre: 11,
  colores: {
    fondo: '#16162a',
    fondoInicioA: '#121735',
    fondoInicioB: '#070b20',
    fondoInicioC: '#030615',
    panel: '#0b1028',
    panelBorde: '#333a5c',
    principal: '#36d6c9',
    acento: '#ffd36a',
    texto: '#ffffff',
    textoSecundario: '#c8c8dc',
    textoOscuro: '#101020',
    error: '#ff8f8f',
    exito: '#75f0a5'
  },
  fuentes: {
    titulo: 'Courier New',
    texto: 'Courier New'
  },
  imagenes: {
    logoInicio: { src: '', maxWidth: 220, maxHeight: 90 },
    fondoInicio: { src: '', mode: 'cover', alpha: 1 },
    fondoJuego: { src: '', mode: 'cover', alpha: 0.35 }
  }
};

let tema = temaBase;

cargarTema().then(() => {
  const config = {
    type: Phaser.AUTO,
    width: 390,
    height: 700,
    backgroundColor: colorTema('fondo'),
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: {
      preload,
      create
    }
  };

  new Phaser.Game(config);
});

let jugadores = [];
let puntos = [];
let jugadorActual = 0;
let mesa = 0;
let pirinola;
let textoTitulo;
let textoTurno;
let textoTurnoJugador;
let textoJugadorLocal;
let textoResultado;
let botonGirar;
let botonSiguiente;
let botonNuevoJuego;
let botonReiniciar;
let fondoBotonGirar;
let fondoBotonSiguiente;
let fondoBotonNuevoJuego;
let fondoBotonReiniciar;
let textoMesa;
let marcadorPanel;
let textoDetalleResultado;
let textosJugadores = [];
let perfilProbabilidad = 'intenso';
let formularioPartida;
let ganadorPartida = null;
let maximoCaracteresNombre = temaBase.maximoCaracteresNombre;
let escenaJuego = null;
let isMultiplayer = false;
let ultimoEstadoMultijugador = null;
let isMultiplayerAnimating = false;
let estadoMultijugadorPendiente = null;

function quitarFormularioPartida() {
  if (formularioPartida) {
    formularioPartida.remove();
    formularioPartida = null;
  }
}

async function cargarTema() {
  const parametros = new URLSearchParams(window.location.search);
  const nombreTema = sanitizarNombreTema(parametros.get('theme') || 'default');

  try {
    const respuesta = await fetch(`config/${nombreTema}.json`, { cache: 'no-store' });

    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar config/${nombreTema}.json`);
    }

    const temaRemoto = await respuesta.json();
    tema = mezclarObjetos(temaBase, temaRemoto);
  } catch (error) {
    console.warn('Usando tema base:', error);
    tema = temaBase;
  }

  maximoCaracteresNombre = tema.maximoCaracteresNombre || temaBase.maximoCaracteresNombre;
}

function sanitizarNombreTema(nombre) {
  return String(nombre).replace(/[^a-zA-Z0-9_-]/g, '') || 'default';
}

function mezclarObjetos(base, cambios) {
  const salida = Array.isArray(base) ? [...base] : { ...base };

  for (const llave in cambios) {
    if (
      cambios[llave] &&
      typeof cambios[llave] === 'object' &&
      !Array.isArray(cambios[llave]) &&
      base[llave]
    ) {
      salida[llave] = mezclarObjetos(base[llave], cambios[llave]);
    } else {
      salida[llave] = cambios[llave];
    }
  }

  return salida;
}

function colorTema(nombre) {
  return tema.colores[nombre] || temaBase.colores[nombre] || '#ffffff';
}

function colorNumero(nombre) {
  return Number(`0x${colorTema(nombre).replace('#', '')}`);
}

function fuenteTema(tipo = 'texto') {
  return tema.fuentes[tipo] || temaBase.fuentes[tipo] || 'Arial';
}

function textoTema(nombre) {
  return tema[nombre] || temaBase[nombre] || '';
}

function textoUITema(nombre) {
  return tema.textos[nombre] || temaBase.textos[nombre] || '';
}

function imagenTema(nombre) {
  return tema.imagenes[nombre] || temaBase.imagenes[nombre] || {};
}

function obtenerFondoInicioCSS() {
  const fondo = imagenTema('fondoInicio');

  if (fondo.src) {
    return `linear-gradient(rgba(3, 6, 21, ${1 - (fondo.alpha ?? 1) * 0.35}), rgba(3, 6, 21, ${1 - (fondo.alpha ?? 1) * 0.35})), url('${fondo.src}') center / ${fondo.mode || 'cover'} no-repeat`;
  }

  return `radial-gradient(circle at top, ${colorTema('fondoInicioA')} 0%, ${colorTema('fondoInicioB')} 55%, ${colorTema('fondoInicioC')} 100%)`;
}

function crearLogoInicioHTML() {
  const logo = imagenTema('logoInicio');

  if (!logo.src) {
    return '';
  }

  return `
    <img src="${logo.src}" alt="${textoTema('marca')}" style="
      display: block;
      max-width: ${logo.maxWidth || 220}px;
      max-height: ${logo.maxHeight || 90}px;
      width: auto;
      height: auto;
      margin: 0 auto 14px;
      object-fit: contain;
    " />
  `;
}

function preload() {
  cargarImagenTema(this, 'fondoJuego');
}

function cargarImagenTema(scene, nombre) {
  const imagen = imagenTema(nombre);

  if (imagen.src) {
    scene.load.image(nombre, imagen.src);
  }
}

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

function create() {
  const scene = this;
  escenaJuego = scene;

  crearFondoJuego(scene);

  textoTitulo = scene.add.text(195, 58, textoTema('titulo').replace(' ', '\n'), {
    fontFamily: fuenteTema('titulo'),
    fontSize: '38px',
    color: colorTema('texto'),
    fontStyle: 'bold',
    align: 'center'
  }).setOrigin(0.5);
  textoTitulo.setShadow(0, 0, colorTema('texto'), 10, true, true);

  textoJugadorLocal = scene.add.text(16, 24, '', {
    fontFamily: fuenteTema(),
    fontSize: '13px',
    color: colorTema('textoSecundario'),
    fontStyle: 'bold',
    align: 'left',
    wordWrap: { width: 138 }
  }).setOrigin(0, 0.5);
  textoJugadorLocal.setVisible(false);

  textoTurno = scene.add.text(195, 138, 'INGRESA JUGADORES', {
    fontFamily: fuenteTema(),
    fontSize: '19px',
    color: colorTema('textoSecundario'),
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 330 }
  }).setOrigin(0.5);

  textoTurnoJugador = scene.add.text(195, 160, '', {
    fontFamily: fuenteTema(),
    fontSize: '22px',
    color: colorTema('principal'),
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 300 }
  }).setOrigin(0.5);
  textoTurnoJugador.setShadow(0, 0, colorTema('principal'), 10, true, true);
  textoTurnoJugador.setLineSpacing(4);

  textoMesa = scene.add.text(195, 190, '', {
    fontFamily: fuenteTema(),
    fontSize: '21px',
    color: colorTema('principal'),
    fontStyle: 'bold'
  }).setOrigin(0.5);
  textoMesa.setVisible(false);

  textoResultado = scene.add.text(195, 426, '', {
    fontFamily: fuenteTema(),
    fontSize: '32px',
    color: colorTema('acento'),
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 340 }
  }).setOrigin(0.5);
  textoResultado.setShadow(0, 0, colorTema('acento'), 10, true, true);

  textoDetalleResultado = scene.add.text(195, 464, '', {
    fontFamily: fuenteTema(),
    fontSize: '17px',
    color: colorTema('textoSecundario'),
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 330 }
  }).setOrigin(0.5);
  textoDetalleResultado.setLineSpacing(3);

  crearFormularioHTML(scene);

  pirinola = scene.add.container(195, 350);
  pirinola.t = 0;

  pirinola.xi = pirinola.x;
  pirinola.yi = pirinola.y;

  const base = scene.add.polygon(
    0,
    0,
    [
      52, 0,
      104, 30,
      104, 90,
      52, 120,
      0, 90,
      0, 30
    ],
    colorNumero('acento')
  );

  base.setOrigin(0.5);
  base.setStrokeStyle(4, colorNumero('texto'));

  const centro = scene.add.circle(0, 0, 10, colorNumero('principal'));

  pirinola.add([base, centro]);
  pirinola.setVisible(false);

  fondoBotonGirar = crearFondoBoton(scene, 195, 646, 172, 42, colorNumero('principal'));
  fondoBotonGirar.setVisible(false);

  botonGirar = scene.add.text(195, 646, 'GIRAR', {
    fontFamily: fuenteTema(),
    fontSize: '25px',
    color: colorTema('textoOscuro'),
    fontStyle: 'bold',
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonGirar.on('pointerdown', () => girarPirinola(scene));

  fondoBotonSiguiente = crearFondoBoton(scene, 195, 646, 206, 42, colorNumero('principal'));
  fondoBotonSiguiente.setVisible(false);

  botonSiguiente = scene.add.text(195, 646, 'SIGUIENTE', {
    fontFamily: fuenteTema(),
    fontSize: '24px',
    color: colorTema('textoOscuro'),
    fontStyle: 'bold',
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonSiguiente.on('pointerdown', () => siguienteJugador(scene));

  fondoBotonNuevoJuego = crearFondoBoton(scene, 344, 24, 76, 38, colorNumero('acento'), 8);
  fondoBotonNuevoJuego.setVisible(false);

  botonNuevoJuego = scene.add.text(344, 24, 'NUEVO', {
    fontFamily: fuenteTema(),
    fontSize: '15px',
    color: colorTema('textoOscuro'),
    fontStyle: 'bold',
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonNuevoJuego.on('pointerdown', () => mostrarFormularioNuevaPartida(scene));

  fondoBotonReiniciar = crearFondoBoton(scene, 195, 646, 224, 42, colorNumero('principal'));
  fondoBotonReiniciar.setVisible(false);

  botonReiniciar = scene.add.text(195, 646, 'JUGAR OTRA VEZ', {
    fontFamily: fuenteTema(),
    fontSize: '23px',
    color: colorTema('textoOscuro'),
    fontStyle: 'bold',
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonReiniciar.on('pointerdown', () => reiniciarPartidaActual());

  marcadorPanel = scene.add.graphics();
  marcadorPanel.setVisible(false);

  crearFooterJuego(scene);
}

function crearFondoJuego(scene) {
  const fondo = imagenTema('fondoJuego');

  if (!fondo.src || !scene.textures.exists('fondoJuego')) {
    return;
  }

  const imagen = scene.add.image(195, 350, 'fondoJuego');
  const escalaX = 390 / imagen.width;
  const escalaY = 700 / imagen.height;
  const escala = fondo.mode === 'contain' ? Math.min(escalaX, escalaY) : Math.max(escalaX, escalaY);

  imagen.setScale(escala);
  imagen.setAlpha(fondo.alpha ?? 1);
  imagen.setDepth(-10);
}

function crearFooterJuego(scene) {
  scene.add.text(195, 684, textoTema('footer'), {
    fontFamily: fuenteTema(),
    fontSize: '14px',
    color: colorTema('textoSecundario'),
    fontStyle: 'bold'
  }).setOrigin(0.5);
}

function crearFondoBoton(scene, x, y, ancho, alto, color, radio = 12) {
  const fondo = scene.add.graphics();

  fondo.fillStyle(color, 1);
  fondo.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, radio);
  fondo.lineStyle(2, colorNumero('texto'), 0.55);
  fondo.strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, radio);
  fondo.setPosition(x, y);

  return fondo;
}

function mostrarBoton(texto, fondo, visible) {
  texto.setVisible(visible);

  if (fondo) {
    fondo.setVisible(visible);
  }
}

function configurarBotonInteractivo(texto, activo) {
  if (!texto) {
    return;
  }

  if (activo) {
    texto.setInteractive({ useHandCursor: true });
  } else {
    texto.disableInteractive();
  }
}

function actualizarTextoTurno() {
  const jugador = jugadores[jugadorActual] || '';

  textoTurno.setColor(colorTema('textoSecundario'));
  textoTurno.setPosition(195, 138);
  textoTurno.setOrigin(0.5);
  textoTurno.setFontSize(19);
  textoTurno.setText(jugador ? 'ES TURNO DE' : 'INGRESA JUGADORES');

  textoTurnoJugador.setPosition(195, 160);
  textoTurnoJugador.setOrigin(0.5);
  textoTurnoJugador.setFontSize(22);
  textoTurnoJugador.setText(jugador ? formatearNombreUI(jugador, maximoCaracteresNombre).toUpperCase() : '');
  textoTurnoJugador.setVisible(Boolean(jugador));
}

function actualizarTextoTurnoMultijugador(roomState) {
  const jugadoresServidor = Array.isArray(roomState.players) ? roomState.players : [];
  let indiceMostrado = Number(roomState.currentTurnIndex ?? 0);
  let etiqueta = 'SIGUIENTE JUGADOR';

  if (isMultiplayerAnimating) {
    etiqueta = 'ES TURNO DE';
  } else if (roomState.awaitingNext && Number.isFinite(roomState.nextTurnIndex)) {
    indiceMostrado = roomState.nextTurnIndex;
  }

  const jugador = jugadoresServidor[indiceMostrado] || jugadoresServidor[roomState.currentTurnIndex] || null;

  textoTurno.setColor(colorTema('textoSecundario'));
  textoTurno.setPosition(195, 138);
  textoTurno.setOrigin(0.5);
  textoTurno.setFontSize(19);
  textoTurno.setText(jugador ? etiqueta : 'ESPERANDO JUGADORES');

  textoTurnoJugador.setPosition(195, 160);
  textoTurnoJugador.setOrigin(0.5);
  textoTurnoJugador.setFontSize(22);
  textoTurnoJugador.setText(jugador ? formatearNombreUI(jugador.name || 'Jugador', maximoCaracteresNombre).toUpperCase() : '');
  textoTurnoJugador.setVisible(Boolean(jugador));
}

function actualizarTextoJugadorLocal() {
  if (!textoJugadorLocal) {
    return;
  }

  const nombre = window.__pirinolaMultiplayer?.me?.name || '';
  textoJugadorLocal.setText(nombre ? `TU: ${formatearNombreUI(nombre, 12).toUpperCase()}` : '');
  textoJugadorLocal.setVisible(Boolean(nombre && isMultiplayer));
}

function limpiarTextoResultado() {
  textoResultado.setText('');
  textoDetalleResultado.setText('');
  textoResultado.setScale(1);
  textoResultado.setColor(colorTema('acento'));
  textoDetalleResultado.setPosition(195, 464);
  textoDetalleResultado.setOrigin(0.5);
  textoDetalleResultado.setWordWrapWidth(330);
}

function asegurarTextosJugadores(scene) {
  if (textosJugadores.length === jugadores.length) {
    return;
  }

  for (let i = 0; i < textosJugadores.length; i++) {
    textosJugadores[i].destroy();
  }

  textosJugadores = [];

  for (let i = 0; i < jugadores.length; i++) {
    const textoJugador = scene.add.text(195, 514 + i * 24, '', {
      fontFamily: fuenteTema(),
      fontSize: '18px',
      color: colorTema('texto'),
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);

    textosJugadores.push(textoJugador);
  }
}

function actualizarControlesMultijugador(roomState, bloquearAcciones = false) {
  const jugadoresServidor = Array.isArray(roomState.players) ? roomState.players : [];
  const turnoActual = jugadoresServidor[roomState.currentTurnIndex];
  const soyHost = Boolean(
    window.__pirinolaMultiplayer?.room?.hostId &&
    window.__pirinolaMultiplayer?.me?.id &&
    window.__pirinolaMultiplayer.room.hostId === window.__pirinolaMultiplayer.me.id
  );
  const miTurno = Boolean(
    turnoActual &&
    window.__pirinolaMultiplayer?.me?.id &&
    turnoActual.id === window.__pirinolaMultiplayer.me.id
  );
  const esperandoSiguiente = roomState.awaitingNext === true;
  const puedeGirar = roomState.status === 'playing' && miTurno && !esperandoSiguiente && !bloquearAcciones;
  const puedeAvanzar = roomState.status === 'playing' && miTurno && esperandoSiguiente && !bloquearAcciones;

  botonGirar.setText(miTurno ? 'GIRAR' : 'ESPERA');
  mostrarBoton(botonGirar, fondoBotonGirar, puedeGirar);
  configurarBotonInteractivo(botonGirar, puedeGirar);

  mostrarBoton(botonSiguiente, fondoBotonSiguiente, puedeAvanzar);
  configurarBotonInteractivo(botonSiguiente, puedeAvanzar);

  if (roomState.status === 'finished') {
    mostrarBoton(botonReiniciar, fondoBotonReiniciar, soyHost && !bloquearAcciones);
    configurarBotonInteractivo(botonReiniciar, soyHost && !bloquearAcciones);
    mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, !bloquearAcciones);
    configurarBotonInteractivo(botonNuevoJuego, !bloquearAcciones);
  } else {
    mostrarBoton(botonReiniciar, fondoBotonReiniciar, false);
    mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, false);
  }
}

function animarResultadoMultijugador(scene, roomState) {
  if (!roomState || roomState.status !== 'playing' || !roomState.lastResult) {
    return;
  }

  const resultado = roomState.lastResult;
  const mesaAntes = ultimoEstadoMultijugador && Number.isFinite(Number(ultimoEstadoMultijugador.mesa))
    ? Number(ultimoEstadoMultijugador.mesa)
    : mesa;
  const puntosAntes = ultimoEstadoMultijugador && Array.isArray(ultimoEstadoMultijugador.players)
    ? ultimoEstadoMultijugador.players.map((player) => Number(player.points ?? 4))
    : puntos.slice();

  const vueltas = Phaser.Math.Between(5, 7);
  const anguloFinal = 360 * vueltas + Phaser.Math.Between(0, 360);

  scene.tweens.killTweensOf(pirinola);
  scene.tweens.killTweensOf(textoResultado);
  moverEnOcho(scene);

  scene.tweens.add({
    targets: pirinola,
    angle: pirinola.angle + anguloFinal,
    duration: 2200,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      textoResultado.setText(formatearResultadoPrincipal(resultado));
      textoDetalleResultado.setText(roomState.lastMessage || '');
      textoResultado.setColor(colorTema('acento'));
      animarFeedbackJugada(scene, resultado, mesaAntes, puntosAntes);
      revisarFinDePartida(scene);
      isMultiplayerAnimating = false;
      if (estadoMultijugadorPendiente) {
        const siguienteEstado = estadoMultijugadorPendiente;
        estadoMultijugadorPendiente = null;
        aplicarEstadoMultijugador(siguienteEstado);
        return;
      }
      actualizarTextoTurnoMultijugador(roomState);
      actualizarMarcador();
      actualizarControlesMultijugador(roomState, false);
    }
  });
}

function aplicarEstadoMultijugador(roomState) {
  if (!roomState) {
    return;
  }

  if (isMultiplayerAnimating && roomState.status === 'playing' && !roomState.lastResult) {
    estadoMultijugadorPendiente = JSON.parse(JSON.stringify(roomState));
    return;
  }

  isMultiplayer = true;
  quitarFormularioPartida();
  actualizarTextoJugadorLocal();

  const jugadoresServidor = Array.isArray(roomState.players) ? roomState.players : [];
  jugadores = jugadoresServidor.map((player) => player.name || 'Jugador');
  puntos = jugadoresServidor.map((player) => Number(player.points ?? 4));
  mesa = Number(roomState.mesa ?? 4);
  jugadorActual = Number(roomState.currentTurnIndex ?? 0);
  ganadorPartida = roomState.winner ? (typeof roomState.winner === 'string' ? roomState.winner : roomState.winner.name) : null;

  if (escenaJuego) {
    asegurarTextosJugadores(escenaJuego);
  }

  textoMesa.setVisible(true);
  marcadorPanel.setVisible(true);
  pirinola.setVisible(true);
  pirinola.setPosition(pirinola.xi, pirinola.yi);
  pirinola.rotation = 0;

  const cambioDeTurno = Boolean(ultimoEstadoMultijugador) && (
    ultimoEstadoMultijugador.currentTurnIndex !== roomState.currentTurnIndex ||
    ultimoEstadoMultijugador.lastResult !== roomState.lastResult ||
    ultimoEstadoMultijugador.status !== roomState.status
  );
  const necesitaMostrarResultado = Boolean(roomState.lastResult && (cambioDeTurno || !ultimoEstadoMultijugador));
  const necesitoAnimar = Boolean(
    escenaJuego &&
    roomState.status === 'playing' &&
    necesitaMostrarResultado
  );

  if (necesitoAnimar) {
    isMultiplayerAnimating = true;
  } else if (!roomState.lastResult) {
    isMultiplayerAnimating = false;
  }

  actualizarControlesMultijugador(roomState, isMultiplayerAnimating);

  if (roomState.status === 'finished') {
    textoTurno.setText('FIN DE LA PARTIDA');
    textoTurnoJugador.setText('');
    textoResultado.setText(ganadorPartida ? `${ganadorPartida.toUpperCase()} GANA` : 'SIN GANADOR');
    textoResultado.setColor(colorTema('acento'));
    textoDetalleResultado.setText(roomState.lastMessage || '');
  } else {
    actualizarTextoTurnoMultijugador(roomState);
    if (necesitaMostrarResultado && !necesitoAnimar) {
      textoResultado.setText(formatearResultadoPrincipal(roomState.lastResult));
      textoDetalleResultado.setText(roomState.lastMessage || '');
      textoResultado.setColor(colorTema('acento'));
      textoResultado.setScale(1);
    } else {
      limpiarTextoResultado();
    }
  }

  actualizarMarcador();

  if (necesitoAnimar) {
    animarResultadoMultijugador(escenaJuego, roomState);
  }

  ultimoEstadoMultijugador = roomState;
}

window.applyMultiplayerState = aplicarEstadoMultijugador;

function formatearResultadoPrincipal(resultado) {
  return resultado.toUpperCase();
}

function formatearNombreUI(nombre, maximo) {
  if (nombre.length <= maximo) {
    return nombre;
  }

  return `${nombre.slice(0, maximo - 1)}.`;
}

function crearFormularioHTML(scene) {
  if (formularioPartida) {
    formularioPartida.remove();
  }

  const div = document.createElement('div');
  formularioPartida = div;

  div.innerHTML = `
    <div style="
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      overflow-y: auto;
      background: ${obtenerFondoInicioCSS()};
      color: ${colorTema('texto')};
      font-family: '${fuenteTema()}', monospace;
      z-index: 5;
      min-height: 100dvh;
    ">
      <div style="
        width: min(390px, 100%);
        min-height: 100dvh;
        padding: clamp(18px, 5dvh, 32px) 18px 18px;
        box-sizing: border-box;
        text-align: center;
      ">
        <div style="
          color: ${colorTema('texto')};
          font-size: clamp(38px, 12vw, 48px);
          line-height: 0.95;
          font-weight: 700;
          letter-spacing: 0;
          text-shadow: 0 0 12px ${colorTema('texto')};
        ">
          ${crearLogoInicioHTML()}
          ${textoTema('titulo').replace(' ', '<br />')}
        </div>

        <div style="
          margin-top: 16px;
          color: ${colorTema('textoSecundario')};
          font-size: clamp(14px, 4vw, 17px);
          font-weight: 700;
        ">
          ${textoTema('subtituloInicio')}
        </div>

        <div style="
          margin-top: 24px;
          padding: 18px;
          border: 2px solid ${colorTema('panelBorde')};
          border-radius: 16px;
          background: ${colorTema('panel')};
          box-shadow: 0 0 22px rgba(54, 214, 201, 0.06);
        ">
          <div style="
            color: ${colorTema('principal')};
            font-size: 20px;
            font-weight: 700;
            text-align: left;
          ">Servidor multijugador</div>
          <div style="
            margin-top: 10px;
            color: ${colorTema('textoSecundario')};
            font-size: 14px;
            text-align: left;
            line-height: 1.5;
          ">
            Abre la página en otra pestaña o dispositivo, crea una sala y compártela con tus amigos.
          </div>
        </div>

        <button id="btnCrear" style="
          width: 82%;
          margin-top: clamp(18px, 4dvh, 28px);
          padding: 16px 14px;
          border: none;
          border-radius: 16px;
          background: ${colorTema('acento')};
          color: ${colorTema('textoOscuro')};
          font-family: '${fuenteTema()}', monospace;
          font-size: clamp(24px, 7vw, 30px);
          font-weight: 700;
          letter-spacing: 0;
          box-shadow: 0 0 24px rgba(255, 211, 106, 0.65);
        ">${textoUITema('botonCrear')}</button>

        <div style="
          margin-top: 14px;
          color: ${colorTema('textoSecundario')};
          font-size: 14px;
          font-weight: 700;
        ">
          ${textoTema('footer')}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(div);
  renderizarSelectorModo(scene);
  return;

  document.getElementById('btnCrear').onclick = () => {
    div.remove();
    formularioPartida = null;
    jugadorActual = 0;
    actualizarTextoTurno();
    textoResultado.setText('');
    textoDetalleResultado.setText('');
    textoResultado.setColor(colorTema('acento'));
    pirinola.setVisible(true);
    botonGirar.setText('GIRAR');
    mostrarBoton(botonGirar, fondoBotonGirar, true);
    configurarBotonInteractivo(botonGirar, true);
    mostrarBoton(botonReiniciar, fondoBotonReiniciar, false);
    mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, true);
    textosJugadores = [];
    textoMesa.setVisible(true);
    marcadorPanel.setVisible(true);
    actualizarMarcador();
  };
}

function renderizarSelectorModo(scene) {
  const botonViejo = document.getElementById('btnCrear');
  if (!botonViejo || !formularioPartida) {
    return;
  }

  const tarjetaVieja = botonViejo.previousElementSibling;
  if (tarjetaVieja) {
    tarjetaVieja.style.display = 'none';
  }
  botonViejo.style.display = 'none';

  const menu = document.createElement('div');
  menu.id = 'selectorModoPartida';
  menu.style.cssText = [
    'margin-top:24px',
    'display:grid',
    'gap:12px'
  ].join(';');
  menu.innerHTML = `
    <button id="btnModoLocal" style="${estiloBotonHTML(colorTema('acento'))}">UN CELULAR</button>
    <button id="btnModoOnline" style="${estiloBotonHTML(colorTema('principal'))}">EN LINEA</button>
  `;

  botonViejo.parentElement.insertBefore(menu, tarjetaVieja || botonViejo);

  document.getElementById('btnModoLocal').onclick = () => renderizarFormularioLocal(scene);
  document.getElementById('btnModoOnline').onclick = () => {
    quitarFormularioPartida();
    if (window.__pirinolaShowMultiplayerLobby) {
      window.__pirinolaShowMultiplayerLobby();
    } else {
      window.addEventListener('pirinola-multiplayer-ready', () => {
        window.__pirinolaShowMultiplayerLobby?.();
      }, { once: true });
    }
  };
}

function estiloBotonHTML(colorFondo) {
  return [
    'width:82%',
    'margin:0 auto',
    'padding:16px 14px',
    'border:none',
    'border-radius:16px',
    `background:${colorFondo}`,
    `color:${colorTema('textoOscuro')}`,
    `font-family:'${fuenteTema()}', monospace`,
    'font-size:clamp(22px,6vw,28px)',
    'font-weight:700',
    'letter-spacing:0',
    'box-shadow:0 0 22px rgba(255, 211, 106, 0.34)'
  ].join(';');
}

function renderizarFormularioLocal(scene) {
  const menu = document.getElementById('selectorModoPartida');
  if (!menu) {
    return;
  }

  menu.innerHTML = `
    <div style="padding:18px;border:2px solid ${colorTema('panelBorde')};border-radius:16px;background:${colorTema('panel')};">
      <div style="color:${colorTema('principal')};font-size:20px;font-weight:700;text-align:left;">Un celular</div>
      <div style="margin-top:10px;color:${colorTema('textoSecundario')};font-size:14px;text-align:left;line-height:1.5;">
        Agrega de 2 a 4 jugadores y pasen el telefono en cada turno.
      </div>
      <div id="camposJugadoresLocales" style="margin-top:14px;display:grid;gap:8px;"></div>
      <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;">
        <button id="btnMenosJugador" style="${estiloBotonPequenoHTML()}">-</button>
        <button id="btnMasJugador" style="${estiloBotonPequenoHTML()}">+</button>
      </div>
      <button id="btnIniciarLocal" style="${estiloBotonHTML(colorTema('acento'))};margin-top:14px;width:100%;">INICIAR</button>
      <button id="btnVolverModo" style="margin-top:10px;background:transparent;border:none;color:${colorTema('textoSecundario')};font-family:'${fuenteTema()}', monospace;font-weight:700;">VOLVER</button>
    </div>
  `;

  let cantidadJugadores = 2;
  const pintarCampos = () => {
    const contenedor = document.getElementById('camposJugadoresLocales');
    contenedor.innerHTML = '';
    for (let i = 0; i < cantidadJugadores; i++) {
      const input = document.createElement('input');
      input.className = 'nombreJugadorLocal';
      input.value = `Jugador ${i + 1}`;
      input.maxLength = maximoCaracteresNombre;
      input.style.cssText = [
        'padding:10px 12px',
        'border-radius:10px',
        `border:2px solid ${colorTema('panelBorde')}`,
        `background:${colorTema('fondo')}`,
        `color:${colorTema('texto')}`,
        `font-family:'${fuenteTema()}', monospace`,
        'font-size:15px'
      ].join(';');
      contenedor.appendChild(input);
    }
  };

  document.getElementById('btnMenosJugador').onclick = () => {
    cantidadJugadores = Math.max(2, cantidadJugadores - 1);
    pintarCampos();
  };
  document.getElementById('btnMasJugador').onclick = () => {
    cantidadJugadores = Math.min(4, cantidadJugadores + 1);
    pintarCampos();
  };
  document.getElementById('btnVolverModo').onclick = () => {
    menu.remove();
    renderizarSelectorModo(scene);
  };
  document.getElementById('btnIniciarLocal').onclick = () => iniciarPartidaLocalDesdeFormulario(scene);
  pintarCampos();
}

function estiloBotonPequenoHTML() {
  return [
    'width:48px',
    'height:40px',
    'border:none',
    'border-radius:12px',
    `background:${colorTema('principal')}`,
    `color:${colorTema('textoOscuro')}`,
    `font-family:'${fuenteTema()}', monospace`,
    'font-size:22px',
    'font-weight:700'
  ].join(';');
}

function iniciarPartidaLocalDesdeFormulario(scene) {
  const inputs = Array.from(document.querySelectorAll('.nombreJugadorLocal'));
  jugadores = inputs.map((input, index) => input.value.trim() || `Jugador ${index + 1}`);
  puntos = jugadores.map(() => 4);
  mesa = 4;
  jugadorActual = 0;
  ganadorPartida = null;
  isMultiplayer = false;
  ultimoEstadoMultijugador = null;
  estadoMultijugadorPendiente = null;
  isMultiplayerAnimating = false;
  actualizarTextoJugadorLocal();
  quitarFormularioPartida();

  asegurarTextosJugadores(scene);
  pirinola.setVisible(true);
  pirinola.setPosition(pirinola.xi, pirinola.yi);
  pirinola.angle = 0;
  actualizarTextoTurno();
  limpiarTextoResultado();
  botonGirar.setText('GIRAR');
  mostrarBoton(botonGirar, fondoBotonGirar, true);
  configurarBotonInteractivo(botonGirar, true);
  mostrarBoton(botonSiguiente, fondoBotonSiguiente, false);
  mostrarBoton(botonReiniciar, fondoBotonReiniciar, false);
  mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, true);
  textoMesa.setVisible(true);
  marcadorPanel.setVisible(true);
  actualizarMarcador();
}

function renderizarCamposJugadores() {
  return;
}

function actualizarDisplayJugadores(cantidad) {
  return;
}

function obtenerCantidadJugadores() {
  return 2;
}

function mostrarFormularioNuevaPartida(scene) {
  if (isMultiplayer && window.__pirinolaMultiplayerEnabled) {
    window.__pirinolaMultiplayerLeaveRoom?.();
  }

  scene.tweens.killTweensOf(pirinola);

  jugadores = [];
  puntos = [];
  jugadorActual = 0;
  mesa = 0;
  ganadorPartida = null;
  isMultiplayer = false;
  ultimoEstadoMultijugador = null;
  estadoMultijugadorPendiente = null;
  isMultiplayerAnimating = false;
  actualizarTextoJugadorLocal();

  pirinola.setVisible(false);
  pirinola.setPosition(pirinola.xi, pirinola.yi);
  pirinola.angle = 0;

  textoTurno.setText('Ingresa jugadores');
  textoTurno.setColor(colorTema('textoSecundario'));
  textoTurnoJugador.setText('');
  textoResultado.setText('');
  textoDetalleResultado.setText('');
  textoResultado.setColor(colorTema('acento'));

  mostrarBoton(botonGirar, fondoBotonGirar, false);
  botonGirar.disableInteractive();
  mostrarBoton(botonSiguiente, fondoBotonSiguiente, false);
  mostrarBoton(botonReiniciar, fondoBotonReiniciar, false);
  mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, false);

  textoMesa.setVisible(false);
  marcadorPanel.clear();
  marcadorPanel.setVisible(false);

  for (let i = 0; i < textosJugadores.length; i++) {
    textosJugadores[i].destroy();
  }

  textosJugadores = [];
  crearFormularioHTML(scene);
}

function reiniciarPartidaActual() {
  if (isMultiplayer && window.__pirinolaMultiplayerEnabled) {
    mostrarBoton(botonReiniciar, fondoBotonReiniciar, false);
    botonReiniciar.disableInteractive();
    mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, false);
    window.__pirinolaMultiplayerRestart?.();
    return;
  }

  mesa = 4;
  jugadorActual = 0;
  ganadorPartida = null;

  for (let i = 0; i < puntos.length; i++) {
    puntos[i] = 4;
  }

  pirinola.setVisible(true);
  pirinola.setPosition(pirinola.xi, pirinola.yi);
  pirinola.angle = 0;

  actualizarTextoTurno();
  textoResultado.setText('');
  textoDetalleResultado.setText('');
  textoResultado.setColor(colorTema('acento'));

  mostrarBoton(botonReiniciar, fondoBotonReiniciar, false);
  mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, true);
  mostrarBoton(botonSiguiente, fondoBotonSiguiente, false);
  botonGirar.setText('GIRAR');
  mostrarBoton(botonGirar, fondoBotonGirar, true);
  configurarBotonInteractivo(botonGirar, true);

  actualizarMarcador();
}

function moverEnOcho(scene) {
  const startX = pirinola.xi;
  const startY = pirinola.yi;

  const path = new Phaser.Curves.Path(startX, startY);

  path.cubicBezierTo(
    startX + 110, startY - 58,
    startX + 110, startY + 86,
    startX, startY
  );

  path.cubicBezierTo(
    startX - 110, startY - 58,
    startX - 110, startY + 86,
    startX, startY
  );

  scene.tweens.add({
    targets: pirinola,
    t: 1,
    duration: 2200,
    ease: 'Cubic.easeInOut',
    onUpdate: (tween, target) => {
      const point = path.getPoint(target.t);
      pirinola.setPosition(point.x, point.y);
    },
    onStart: () => {
      pirinola.t = 0;
    }
  });
}

function girarPirinola(scene) {
  if (isMultiplayer && window.__pirinolaMultiplayerEnabled) {
    const giroEnviado = window.__pirinolaMultiplayerSpin?.();
    if (!giroEnviado) {
      const estado = window.__pirinolaMultiplayer?.room?.state;
      if (estado) {
        actualizarControlesMultijugador(estado, false);
      }
      return;
    }

    isMultiplayerAnimating = true;
    const estadoActual = window.__pirinolaMultiplayer?.room?.state;
    if (estadoActual) {
      actualizarTextoTurnoMultijugador(estadoActual);
      actualizarMarcador();
    }
    mostrarBoton(botonGirar, fondoBotonGirar, false);
    botonGirar.disableInteractive();
    mostrarBoton(botonSiguiente, fondoBotonSiguiente, false);
    return;
  }

  botonGirar.disableInteractive();
  textoResultado.setText('');
  textoResultado.setColor(colorTema('principal'));
  textoDetalleResultado.setText('');
  mostrarBoton(botonGirar, fondoBotonGirar, false);

  const resultado = obtenerResultadoAleatorio();
  const vueltas = Phaser.Math.Between(4, 7);
  const anguloFinal = 360 * vueltas + Phaser.Math.Between(0, 360);

  moverEnOcho(scene);

  scene.tweens.add({
    targets: pirinola,
    angle: pirinola.angle + anguloFinal,
    duration: 2200,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      // textoResultado.setText(resultado);

      const mesaAntes = mesa;
      const puntosAntes = puntos.slice();
      const mensaje = actualizarPuntos(resultado);
      textoResultado.setText(formatearResultadoPrincipal(resultado));
      textoDetalleResultado.setText(mensaje);
      animarFeedbackJugada(scene, resultado, mesaAntes, puntosAntes);
      revisarFinDePartida(scene);

      if (partidaTerminada()) {
        mostrarBoton(botonSiguiente, fondoBotonSiguiente, false);
        mostrarBoton(botonGirar, fondoBotonGirar, false);
        botonGirar.disableInteractive();
        mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, true);
        configurarBotonInteractivo(botonNuevoJuego, true);
        mostrarBoton(botonReiniciar, fondoBotonReiniciar, true);
        configurarBotonInteractivo(botonReiniciar, true);
        return;
      }

      mostrarBoton(botonSiguiente, fondoBotonSiguiente, true);
      mostrarBoton(botonGirar, fondoBotonGirar, false);
    }
  });
}

function obtenerResultadoAleatorio() {
  if(mesa <= 0){
    perfilProbabilidad = 'nofichas';
  } else {
    perfilProbabilidad = 'intenso';
  }
  const opciones = perfilesProbabilidad[perfilProbabilidad] || perfilesProbabilidad.convivencia;
  let pesoTotal = 0;

  for (let i = 0; i < opciones.length; i++) {
    pesoTotal += opciones[i].peso;
  }

  let sorteo = Phaser.Math.Between(1, pesoTotal);

  for (let i = 0; i < opciones.length; i++) {
    sorteo -= opciones[i].peso;

    if (sorteo <= 0) {
      return opciones[i].resultado;
    }
  }

  return opciones[0].resultado;
}

function siguienteJugador(scene) {
  if (isMultiplayer && window.__pirinolaMultiplayerEnabled) {
    mostrarBoton(botonSiguiente, fondoBotonSiguiente, false);
    botonSiguiente.disableInteractive();
    window.__pirinolaMultiplayerNextTurn?.();
    return;
  }

  jugadorActual = obtenerSiguienteJugadorActivo();
  actualizarTextoTurno();

  textoResultado.setText('');
  textoDetalleResultado.setText('');
  textoResultado.setColor(colorTema('acento'));

  mostrarBoton(botonSiguiente, fondoBotonSiguiente, false);
  botonGirar.setText('GIRAR');
  mostrarBoton(botonGirar, fondoBotonGirar, true);
  configurarBotonInteractivo(botonGirar, true);

  pirinola.setPosition(pirinola.xi, pirinola.yi);

  actualizarMarcador();
}

function actualizarPuntos(resultado){
  console.log(`***${jugadores[jugadorActual]}***`);
  // console.log(`Resultado: ${resultado}`);

  const jugador = jugadores[jugadorActual];
  let cantidad;
  let mensaje = '';

  switch(resultado){
    case 'Toma 1':
      if (mesa <= 0) {
        mensaje = `${jugador} quiso tomar, pero la mesa esta vacia`;
        break;
      }

      cantidad = Math.min(1, mesa);
      puntos[jugadorActual] += cantidad;
      mesa -= cantidad;
      mensaje = `${jugador} toma ${formatearFichas(cantidad)} de la mesa`;
      break;
    case 'Toma 2':
      if (mesa <= 0) {
        mensaje = `${jugador} quiso tomar, pero la mesa esta vacia`;
        break;
      }

      cantidad = Math.min(2, mesa);
      puntos[jugadorActual] += cantidad;
      mesa -= cantidad;
      mensaje = cantidad === 2
        ? `${jugador} toma ${formatearFichas(cantidad)} de la mesa`
        : `${jugador} solo encuentra ${formatearFichas(cantidad)} en la mesa`;
      break;
    case 'Toma Todo':
      if (mesa <= 0) {
        mensaje = `${jugador} iba por todo, pero la mesa esta vacia`;
        break;
      }

      cantidad = mesa;
      puntos[jugadorActual] += mesa;
      mensaje = `${jugador} limpia la mesa y se lleva ${formatearFichas(cantidad)}`;
      mesa = 0;
      break;
    case 'Todos Ponen':
      cantidad = 0;
      for (let i = 0; i < puntos.length; i++) {
        if(puntos[i] > 0){
          puntos[i]--;
          mesa++;
          cantidad++;
        }
      }
      mensaje = `${cantidad} jugadores ponen 1 ficha`;
      break;
    case 'Pon 1':
      cantidad = Math.min(1, puntos[jugadorActual]);
      puntos[jugadorActual] -= cantidad;
      mesa += cantidad;
      mensaje = cantidad > 0
        ? `${jugador} pone ${formatearFichas(cantidad)} en la mesa`
        : `${jugador} ya no tiene fichas para poner`;
      break;
    case 'Pon 2':
      cantidad = Math.min(2, puntos[jugadorActual]);
      puntos[jugadorActual] -= cantidad;
      mesa += cantidad;
      mensaje = cantidad === 2
        ? `${jugador} pone ${formatearFichas(cantidad)} en la mesa`
        : `${jugador} pone su ultima ficha`;
      break;
    default:
      console.error(`Resultado no reconocido: ${resultado}`);
  }

  actualizarMarcador();
  console.log(mensaje);
  return mensaje;
}

function formatearFichas(cantidad) {
  return cantidad === 1 ? '1 ficha' : `${cantidad} fichas`;
}

function animarFeedbackJugada(scene, resultado, mesaAntes, puntosAntes) {
  const colorResultado = obtenerColorResultado(resultado, mesaAntes);

  textoResultado.setColor(colorResultado);
  textoResultado.setScale(0.86);

  scene.tweens.add({
    targets: textoResultado,
    scale: 1,
    duration: 260,
    ease: 'Back.easeOut'
  });

  scene.tweens.add({
    targets: pirinola,
    scaleX: 1.12,
    scaleY: 1.12,
    yoyo: true,
    duration: 140,
    ease: 'Sine.easeOut'
  });

  if (mesa !== mesaAntes && textoMesa) {
    animarPulsoTexto(scene, textoMesa, colorTema('texto'));
  }

  if (resultado === 'Toma Todo' && mesaAntes > 0) {
    scene.cameras.main.flash(160, 117, 240, 165);
  }

  if (resultado.indexOf('Pon') === 0 || resultado === 'Todos Ponen') {
    scene.cameras.main.shake(120, 0.006);
  }

  if (textosJugadores[jugadorActual]) {
    animarPulsoTexto(scene, textosJugadores[jugadorActual], colorResultado);
  }

  mostrarEliminados(scene, puntosAntes);
}

function obtenerColorResultado(resultado, mesaAntes) {
  if (mesaAntes <= 0 && resultado.indexOf('Toma') === 0) {
    return colorTema('error');
  }

  if (resultado === 'Toma Todo') {
    return colorTema('exito');
  }

  if (resultado.indexOf('Toma') === 0) {
    return colorTema('exito');
  }

  if (resultado.indexOf('Pon') === 0 || resultado === 'Todos Ponen') {
    return colorTema('acento');
  }

  return colorTema('acento');
}

function animarPulsoTexto(scene, texto, colorTemporal) {
  const colorOriginal = texto.style.color;

  texto.setColor(colorTemporal);
  texto.setScale(1.12);

  scene.tweens.add({
    targets: texto,
    scale: 1,
    duration: 260,
    ease: 'Back.easeOut',
    onComplete: () => {
      texto.setColor(colorOriginal);
    }
  });
}

function mostrarEliminados(scene, puntosAntes) {
  for (let i = 0; i < puntos.length; i++) {
    if (puntosAntes[i] > 0 && puntos[i] <= 0) {
      mostrarMensajeFlotante(scene, `${jugadores[i]} queda fuera`, 195, 505, colorTema('error'));
    }
  }
}

function mostrarMensajeFlotante(scene, mensaje, x, y, color) {
  const texto = scene.add.text(x, y, mensaje, {
    fontSize: '20px',
    color,
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 330 }
  }).setOrigin(0.5);

  scene.tweens.add({
    targets: texto,
    y: y - 34,
    alpha: 0,
    duration: 1200,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      texto.destroy();
    }
  });
}

function actualizarMarcador() {
  textoMesa.setText(`..... Mesa: ${mesa} Fichas .....`);

  if (marcadorPanel) {
    marcadorPanel.clear();
    marcadorPanel.fillStyle(colorNumero('panel'), 0.88);
    marcadorPanel.fillRoundedRect(28, 492, 334, 124, 14);
    marcadorPanel.lineStyle(2, colorNumero('panelBorde'), 1);
    marcadorPanel.strokeRoundedRect(28, 492, 334, 124, 14);
  }

  const indiceActivoVisual = obtenerIndiceActivoVisualMarcador();

  for (let i = 0; i < textosJugadores.length; i++) {
    const activo = i === indiceActivoVisual;
    const eliminado = puntos[i] <= 0;
    const nombre = formatearNombreUI(jugadores[i], maximoCaracteresNombre);
    const esGanador = ganadorPartida === jugadores[i];
    const estado = esGanador ? 'Ganador' : eliminado ? 'Sin fichas' : '';
    const puntosTexto = puntos[i];
    const separador = '.'.repeat(Math.max(4, 16 - nombre.length - Math.floor(estado.length / 2)));

    textosJugadores[i].setText(
      `${activo && !ganadorPartida ? '> ' : '  '}${nombre} ${separador} ${estado ? `${estado} ` : `${puntosTexto} Fichas`}`
    );

    textosJugadores[i].setStyle({
      fontFamily: fuenteTema(),
      fontSize: activo && !eliminado ? '18px' : '16px',
      color: esGanador ? colorTema('acento') : eliminado ? colorTema('error') : activo ? colorTema('principal') : colorTema('texto'),
      fontStyle: activo && !eliminado || esGanador ? 'bold' : 'normal'
    });

  }
}

function obtenerIndiceActivoVisualMarcador() {
  if (!isMultiplayer) {
    return jugadorActual;
  }

  const roomState = window.__pirinolaMultiplayer?.room?.state || ultimoEstadoMultijugador;
  if (!roomState || roomState.status !== 'playing') {
    return jugadorActual;
  }

  if (isMultiplayerAnimating || roomState.awaitingNext) {
    return Number(roomState.currentTurnIndex ?? jugadorActual);
  }

  return -1;
}

function obtenerSiguienteJugadorActivo() {
  let siguiente = jugadorActual;

  do {
    siguiente++;
    if (siguiente >= jugadores.length) {
      siguiente = 0;
    }
  } while (puntos[siguiente] <= 0);

  return siguiente;
}

function contarJugadoresActivos() {
  let activos = 0;

  for (let i = 0; i < puntos.length; i++) {
    if (puntos[i] > 0) {
      activos++;
    }
  }

  return activos;
}

function obtenerGanador() {
  for (let i = 0; i < puntos.length; i++) {
    if (puntos[i] > 0) {
      return jugadores[i];
    }
  }

  return null;
}

function partidaTerminada() {
  return contarJugadoresActivos() <= 1;
}

function revisarFinDePartida(scene) {
  if (!partidaTerminada()) {
    return;
  }

  const ganador = obtenerGanador();

  if (ganador) {
    ganadorPartida = ganador;
    textoTurnoJugador.setText('');
    textoTurno.setText('FIN DE LA PARTIDA');
    textoResultado.setText(`${formatearNombreUI(ganador, maximoCaracteresNombre).toUpperCase()} GANA`);
    textoResultado.setColor(colorTema('acento'));
    textoDetalleResultado.setText(textoDetalleResultado.text || 'Partida terminada');
    actualizarMarcador();
    lanzarConfeti(scene);
    animarVictoria(scene);
  } else {
    ganadorPartida = null;
    textoTurnoJugador.setText('');
    textoTurno.setText('SIN GANADOR');
    textoDetalleResultado.setText(`${textoDetalleResultado.text}\nTodos quedaron fuera :(`);
    actualizarMarcador();
  }
}

function animarVictoria(scene) {
  scene.cameras.main.flash(220, 255, 211, 106);
  textoTurno.setColor(colorTema('exito'));
  textoTurno.setScale(0.9);

  scene.tweens.add({
    targets: textoTurno,
    scale: 1.12,
    yoyo: true,
    duration: 360,
    ease: 'Back.easeOut',
    onComplete: () => {
      textoTurno.setScale(1);
      textoTurno.setColor(colorTema('textoSecundario'));
    }
  });
}

function lanzarConfeti(scene) {
  const colores = [colorNumero('acento'), colorNumero('principal'), colorNumero('texto'), colorNumero('exito')];

  for (let i = 0; i < 34; i++) {
    const angulo = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radioInicial = Phaser.Math.Between(34, 84);
    const x = pirinola.x + Math.cos(angulo) * radioInicial;
    const y = pirinola.y + Math.sin(angulo) * radioInicial;
    const pieza = scene.add.rectangle(
      x,
      y,
      Phaser.Math.Between(4, 8),
      Phaser.Math.Between(4, 10),
      Phaser.Utils.Array.GetRandom(colores)
    );

    pieza.angle = Phaser.Math.Between(0, 180);

    scene.tweens.add({
      targets: pieza,
      x: x + Math.cos(angulo) * Phaser.Math.Between(34, 80),
      y: y + Math.sin(angulo) * Phaser.Math.Between(28, 72) + Phaser.Math.Between(14, 40),
      angle: pieza.angle + Phaser.Math.Between(120, 360),
      alpha: 0,
      duration: Phaser.Math.Between(900, 1500),
      ease: 'Cubic.easeOut',
      onComplete: () => {
        pieza.destroy();
      }
    });
  }
}
