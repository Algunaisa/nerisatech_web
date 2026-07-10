const config = {
  type: Phaser.AUTO,
  width: 390,
  height: 700,
  backgroundColor: '#16162a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: {
    create
  }
};

new Phaser.Game(config);

let jugadores = [];
let puntos = [];
let jugadorActual = 0;
let mesa = 0;
let pirinola;
let textoTitulo;
let textoTurno;
let textoResultado;
let botonGirar;
let botonSiguiente;
let botonNuevoJuego;
let botonReiniciar;
let textoMesa;
let textosJugadores = [];
let perfilProbabilidad = 'intenso';
let formularioPartida;

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
    { resultado: 'Toma 2', peso: 2 },
    { resultado: 'Toma Todo', peso: 3 },
    { resultado: 'Todos Ponen', peso: 3 },
    { resultado: 'Pon 1', peso: 1 },
    { resultado: 'Pon 2', peso: 3 }
  ],
  nofichas: [
    { resultado: 'Toma 1', peso: 0 },
    { resultado: 'Toma 2', peso: 0 },
    { resultado: 'Toma Todo', peso: 0 },
    { resultado: 'Todos Ponen', peso: 3 },
    { resultado: 'Pon 1', peso: 1 },
    { resultado: 'Pon 2', peso: 2 }
  ]
};

function create() {
  const scene = this;

  textoTitulo = scene.add.text(195, 60, 'Pirinola Pocket', {
    fontSize: '28px',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  textoTurno = scene.add.text(195, 120, 'Ingresa jugadores', {
    fontSize: '20px',
    color: '#ffffff'
  }).setOrigin(0.5);

  textoResultado = scene.add.text(195, 560, '', {
    fontSize: '23px',
    color: '#ffd36a',
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 340 }
  }).setOrigin(0.5);

  crearFormularioHTML(scene);

  pirinola = scene.add.container(195, 330);
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
    0xffd36a
  );

  base.setOrigin(0.5);
  base.setStrokeStyle(4, 0xffffff);

  const centro = scene.add.circle(0, 0, 10, 0x36d6c9);

  pirinola.add([base, centro]);
  pirinola.setVisible(false);

  botonGirar = scene.add.text(195, 640, 'GIRAR', {
    fontSize: '28px',
    color: '#101020',
    backgroundColor: '#36d6c9',
    padding: { x: 35, y: 14 }
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonGirar.on('pointerdown', () => girarPirinola(scene));

  botonSiguiente = scene.add.text(195, 640, 'SIGUIENTE', {
    fontSize: '28px',
    color: '#101020',
    backgroundColor: '#36d6c9',
    padding: { x: 35, y: 14 }
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonSiguiente.on('pointerdown', () => siguienteJugador(scene));

  botonNuevoJuego = scene.add.text(325, 28, 'NUEVO', {
    fontSize: '15px',
    color: '#101020',
    backgroundColor: '#ffd36a',
    padding: { x: 12, y: 8 }
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonNuevoJuego.on('pointerdown', () => mostrarFormularioNuevaPartida(scene));

  botonReiniciar = scene.add.text(195, 640, 'REINICIAR', {
    fontSize: '28px',
    color: '#101020',
    backgroundColor: '#ffd36a',
    padding: { x: 28, y: 14 }
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonReiniciar.on('pointerdown', () => reiniciarPartidaActual());
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
      top: 170px;
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
      max-height: 430px;
      overflow-y: auto;
      text-align: center;
      color: white;
    ">
      <input id="numJugadores" type="number" min="2" max="4" value="4"
        style="width: 90%; padding: 12px; font-size: 18px; border-radius: 8px; border: none;" />
      <div style="margin-top: 6px; font-size: 13px; color: #c8c8dc;">
        Maximo 4 jugadores
      </div>
      
      <div id="camposJugadores" style="margin-top: 12px;"></div>
      <button id="btnCrear" style="
        margin-top: 15px;
        padding: 12px 20px;
        font-size: 18px;
        border: none;
        border-radius: 8px;
        background: #ffd36a;
      ">Crear partida</button>
    </div>
  `;

  document.body.appendChild(div);
  renderizarCamposJugadores();

  document.getElementById('numJugadores').oninput = () => {
    renderizarCamposJugadores();
  };

  document.getElementById('btnCrear').onclick = () => {
    const cantidad = obtenerCantidadJugadores();
    const inputsNombres = document.querySelectorAll('.nombreJugador');

    //perfilProbabilidad = document.getElementById('perfilProbabilidad').value;

    jugadores = [];
    puntos = [];
    mesa = 4;
    for (let i = 0; i < cantidad; i++) {
      const nombre = inputsNombres[i].value.trim();

      jugadores.push(nombre || `Jugador ${i + 1}`);
      puntos.push(4);
    }

    div.remove();
    formularioPartida = null;

    jugadorActual = 0;
    textoTurno.setText(`Turno de ${jugadores[jugadorActual]}`);
    textoResultado.setText('');
    textoResultado.setColor('#ffd36a');
    pirinola.setVisible(true);
    botonGirar.setVisible(true).setInteractive(true);
    botonReiniciar.setVisible(false);
    botonNuevoJuego.setVisible(true);
    textosJugadores = [];

    for (let i = 0; i < jugadores.length; i++) {
      const textoJugador = scene.add.text(28, 430 + i * 24, '', {
        fontSize: '17px',
        color: '#ffffff'
      });

      textosJugadores.push(textoJugador);
    }

    textoMesa = scene.add.text(195, 92, `Mesa: ${mesa}`, {
      fontSize: '18px',
      color: '#36d6c9',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    actualizarMarcador();

  };
}

function renderizarCamposJugadores() {
  const cantidad = obtenerCantidadJugadores();
  const contenedor = document.getElementById('camposJugadores');

  if (!contenedor) {
    return;
  }

  const nombresActuales = [];
  const inputsActuales = document.querySelectorAll('.nombreJugador');

  for (let i = 0; i < inputsActuales.length; i++) {
    nombresActuales.push(inputsActuales[i].value);
  }

  contenedor.innerHTML = '';

  for (let i = 0; i < cantidad; i++) {
    const input = document.createElement('input');

    input.className = 'nombreJugador';
    input.type = 'text';
    input.maxLength = 14;
    input.placeholder = `Nombre ${i + 1}`;
    input.value = nombresActuales[i] || '';
    input.style.cssText = `
      width: 90%;
      margin-top: 8px;
      padding: 10px;
      font-size: 16px;
      border-radius: 8px;
      border: none;
    `;

    contenedor.appendChild(input);
  }
}

function obtenerCantidadJugadores() {
  const input = document.getElementById('numJugadores');
  const cantidad = Number(input.value);

  if (!Number.isFinite(cantidad)) {
    input.value = 2;
    return 2;
  }

  const cantidadAjustada = Math.max(2, Math.min(4, Math.floor(cantidad)));

  input.value = cantidadAjustada;
  return cantidadAjustada;
}

function mostrarFormularioNuevaPartida(scene) {
  scene.tweens.killTweensOf(pirinola);

  jugadores = [];
  puntos = [];
  jugadorActual = 0;
  mesa = 0;

  pirinola.setVisible(false);
  pirinola.setPosition(pirinola.xi, pirinola.yi);
  pirinola.angle = 0;

  textoTurno.setText('Ingresa jugadores');
  textoResultado.setText('');
  textoResultado.setColor('#ffd36a');

  botonGirar.setVisible(false);
  botonGirar.disableInteractive();
  botonSiguiente.setVisible(false);
  botonReiniciar.setVisible(false);
  botonNuevoJuego.setVisible(false);

  if (textoMesa) {
    textoMesa.destroy();
    textoMesa = null;
  }

  for (let i = 0; i < textosJugadores.length; i++) {
    textosJugadores[i].destroy();
  }

  textosJugadores = [];
  crearFormularioHTML(scene);
}

function reiniciarPartidaActual() {
  mesa = 4;
  jugadorActual = 0;

  for (let i = 0; i < puntos.length; i++) {
    puntos[i] = 4;
  }

  pirinola.setVisible(true);
  pirinola.setPosition(pirinola.xi, pirinola.yi);
  pirinola.angle = 0;

  textoTurno.setText(`Turno de ${jugadores[jugadorActual]}`);
  textoResultado.setText('');
  textoResultado.setColor('#ffd36a');

  botonReiniciar.setVisible(false);
  botonNuevoJuego.setVisible(true);
  botonSiguiente.setVisible(false);
  botonGirar.setVisible(true).setInteractive(true);

  actualizarMarcador();
}

function moverEnOcho(scene) {
  const startX = pirinola.xi;
  const startY = pirinola.yi;

  const path = new Phaser.Curves.Path(startX, startY);

  path.cubicBezierTo(
    startX + 120, startY - 100,
    startX + 120, startY + 100,
    startX, startY
  );

  path.cubicBezierTo(
    startX - 120, startY - 100,
    startX - 120, startY + 100,
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
  botonGirar.disableInteractive();
  textoResultado.setText('Girando...');

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
      textoResultado.setText(`${resultado}\n${mensaje}`);
      animarFeedbackJugada(scene, resultado, mesaAntes, puntosAntes);
      revisarFinDePartida(scene);

      if (partidaTerminada()) {
        botonSiguiente.setVisible(false);
        botonGirar.setVisible(false);
        botonGirar.disableInteractive();
        botonNuevoJuego.setVisible(true).setInteractive(true);
        botonReiniciar.setVisible(true).setInteractive(true);
        return;
      }

      botonSiguiente.setVisible(true);
      botonGirar.setVisible(false);
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
  jugadorActual = obtenerSiguienteJugadorActivo();
  textoTurno.setText(`Turno de ${jugadores[jugadorActual]}`);

  textoResultado.setText('');
  textoResultado.setColor('#ffd36a');

  botonSiguiente.setVisible(false);
  botonGirar.setVisible(true).setInteractive(true);

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
    animarPulsoTexto(scene, textoMesa, '#ffffff');
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
    return '#ff8f8f';
  }

  if (resultado === 'Toma Todo') {
    return '#75f0a5';
  }

  if (resultado.indexOf('Toma') === 0) {
    return '#9fffd0';
  }

  if (resultado.indexOf('Pon') === 0 || resultado === 'Todos Ponen') {
    return '#ffb36a';
  }

  return '#ffd36a';
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
      mostrarMensajeFlotante(scene, `${jugadores[i]} queda fuera`, 195, 505, '#ff8f8f');
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
  textoMesa.setText(`Mesa: ${mesa}`);

  for (let i = 0; i < textosJugadores.length; i++) {
    const activo = i === jugadorActual;
    const eliminado = puntos[i] <= 0;

    textosJugadores[i].setText(
      eliminado ? `${jugadores[i]}: eliminado` : `${jugadores[i]}: ${puntos[i]}`
    );

    textosJugadores[i].setStyle({
      fontSize: activo && !eliminado ? '19px' : '17px',
      color: eliminado ? '#7f7f95' : activo ? '#ffd36a' : '#ffffff',
      fontStyle: activo && !eliminado ? 'bold' : 'normal'
    });

  }
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
    textoTurno.setText(`Gana ${ganador} 🎉`);
    textoResultado.setText(`${textoResultado.text}\nFin de la partida`);
    animarVictoria(scene);
  } else {
    textoTurno.setText('Sin ganador');
    textoResultado.setText(`${textoResultado.text}\nTodos quedaron fuera :(`);
  }
}

function animarVictoria(scene) {
  scene.cameras.main.flash(220, 255, 211, 106);
  textoTurno.setColor('#75f0a5');
  textoTurno.setScale(0.9);

  scene.tweens.add({
    targets: textoTurno,
    scale: 1.12,
    yoyo: true,
    duration: 360,
    ease: 'Back.easeOut',
    onComplete: () => {
      textoTurno.setScale(1);
      textoTurno.setColor('#ffffff');
    }
  });
}
