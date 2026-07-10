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
let textoMesa;
let textosJugadores = [];

const opciones = [
  'Toma 1',
  'Toma 2',
  'Toma Todo',
  'Todos Ponen',
  'Pon 1',
  'Pon 2'
];

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
    fontSize: '26px',
    color: '#ffd36a',
    fontStyle: 'bold',
    align: 'center'
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
}

function crearFormularioHTML(scene) {
  const div = document.createElement('div');

  div.innerHTML = `
    <div style="
      position: absolute;
      top: 170px;
      left: 50%;
      transform: translateX(-50%);
      width: 300px;
      text-align: center;
      color: white;
    ">
      <input id="numJugadores" type="number" min="2" max="12" value="4"
        style="width: 90%; padding: 12px; font-size: 18px; border-radius: 8px; border: none;" />
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

  document.getElementById('btnCrear').onclick = () => {
    const cantidad = Number(document.getElementById('numJugadores').value);

    jugadores = [];
    puntos = [];
    mesa = 4;
    for (let i = 1; i <= cantidad; i++) {
      jugadores.push(`Jugador ${i}`);
      puntos.push(4);
    }

    div.remove();

    jugadorActual = 0;
    textoTurno.setText(`Turno de ${jugadores[jugadorActual]}`);
    textoResultado.setText('');
    pirinola.setVisible(true);
    botonGirar.setVisible(true);
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

  const resultado = Phaser.Utils.Array.GetRandom(opciones);
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

      const mensaje = actualizarPuntos(resultado);
      textoResultado.setText(`${resultado}\n${mensaje}`);
      revisarFinDePartida();

      if (partidaTerminada()) {
        botonSiguiente.setVisible(false);
        botonGirar.setVisible(false);
        botonGirar.disableInteractive();
        return;
      }

      botonSiguiente.setVisible(true);
      botonGirar.setVisible(false);
    }
  });
}

function siguienteJugador(scene) {
  jugadorActual = obtenerSiguienteJugadorActivo();
  textoTurno.setText(`Turno de ${jugadores[jugadorActual]}`);

  textoResultado.setText('');

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
        mensaje = 'La mesa esta vacia';
        break;
      }

      cantidad = Math.min(1, mesa);
      puntos[jugadorActual] += cantidad;
      mesa -= cantidad;
      mensaje = `${jugador} toma ${cantidad} de la mesa`;
      break;
    case 'Toma 2':
      if (mesa <= 0) {
        mensaje = 'La mesa esta vacia';
        break;
      }

      cantidad = Math.min(2, mesa);
      puntos[jugadorActual] += cantidad;
      mesa -= cantidad;
      mensaje = `${jugador} toma ${cantidad} de la mesa`;
      break;
    case 'Toma Todo':
      if (mesa <= 0) {
        mensaje = 'La mesa esta vacia';
        break;
      }

      puntos[jugadorActual] += mesa;
      mensaje = `${jugador} toma todo`;
      mesa = 0;
      break;
    case 'Todos Ponen':
      for (let i = 0; i < puntos.length; i++) {
        if(puntos[i] > 0){
          puntos[i]--;
          mesa++;
        }
      }
      mensaje = 'Todos ponen 1';
      break;
    case 'Pon 1':
      cantidad = Math.min(1, puntos[jugadorActual]);
      puntos[jugadorActual] -= cantidad;
      mesa += cantidad;
      mensaje = `${jugador} pone ${cantidad}`;
      break;
    case 'Pon 2':
      cantidad = Math.min(2, puntos[jugadorActual]);
      puntos[jugadorActual] -= cantidad;
      mesa += cantidad;
      mensaje = `${jugador} pone ${cantidad}`;
      break;
    default:
      console.error(`Resultado no reconocido: ${resultado}`);
  }

  actualizarMarcador();
  console.log(mensaje);
  return mensaje;
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

function revisarFinDePartida() {
  if (!partidaTerminada()) {
    return;
  }

  const ganador = obtenerGanador();

  if (ganador) {
    textoTurno.setText(`${ganador} gana`);
    textoResultado.setText(`${textoResultado.text}\nFin de la partida`);
  } else {
    textoTurno.setText('Sin ganador');
    textoResultado.setText(`${textoResultado.text}\nTodos quedaron fuera`);
  }
}
