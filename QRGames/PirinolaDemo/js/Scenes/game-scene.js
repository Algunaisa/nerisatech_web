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
let textoSiguienteTurno;
let textoResultado;
let botonGirar;

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
      textoResultado.setText(resultado);

      actualizarPuntos(resultado);

      botonSiguiente.setVisible(true);
      botonGirar.setVisible(false);
    }
  });
}

function siguienteJugador(scene) {
  jugadorActual++;
  if (jugadorActual >= jugadores.length) {
    jugadorActual = 0;
  }
  textoTurno.setText(`${jugadores[jugadorActual]}`);

  textoResultado.setText('');

  botonSiguiente.setVisible(false);
  botonGirar.setVisible(true).setInteractive(true);

  pirinola.setPosition(pirinola.xi, pirinola.yi);
}

function actualizarPuntos(resultado){
  console.log(`***${jugadores[jugadorActual]}***`);
  console.log(`Resultado: ${resultado}`);
  switch(resultado){
    case 'Toma 1':
      puntos[jugadorActual]++;
      mesa--;
      break;
    case 'Toma 2':
      puntos[jugadorActual] = puntos[jugadorActual] - 2;
      mesa = mesa - 2;
      break;
    case 'Toma Todo':
      puntos[jugadorActual] = puntos[jugadorActual] + mesa;
      mesa = 0;
      break;
    case 'Todos Ponen':
      for (let i = 0; i < puntos.length; i++) {
        puntos[i]--;
        mesa++;
      }
      break;
    case 'Pon 1':
      puntos[jugadorActual]--;
      mesa++;
      break;
    case 'Pon 2':
      puntos[jugadorActual] = puntos[jugadorActual] - 2;
      mesa = mesa + 2;
      break;
    default:
      console.error(`Resultado no reconocido: ${resultado}`);
  }
  
  for (let i = 0; i < puntos.length; i++) {
    if(i === jugadorActual){
      console.log(`puntos *${jugadores[jugadorActual]}: ${puntos[i]}`);
    }
    else{
      console.log(`puntos ${jugadores[i]}: ${puntos[i]}`);
    }
  }
  console.log(`puntos mesa:${mesa}`);
}