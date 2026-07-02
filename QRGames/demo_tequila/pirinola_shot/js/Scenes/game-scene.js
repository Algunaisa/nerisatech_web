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
let jugadorActual = 0;
let pirinola;
let textoTitulo;
let textoTurno;
let textoSiguienteTurno;
let textoResultado;
let botonGirar;

const opciones = [
  'Toma 1',
  'Toma 2',
  'Todos toman',
  'Elige quién toma',
  'Te salvaste',
  'Baila la macarena',
  'Canta una rola',
  'Cuenta un chiste'
];

function create() {
  const scene = this;

  textoTitulo = scene.add.text(195, 60, 'Pirinola - QR Games', {
    fontSize: '28px',
    color: '#ffffff',
    fontStyle: 'bold'
  }).setOrigin(0.5);

  textoTurno = scene.add.text(195, 120, 'Ingresa jugadores', {
    fontSize: '20px',
    color: '#ffffff'
  }).setOrigin(0.5);

  textoSiguienteTurno = scene.add.text(195, 500, 'Turno de ', {
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

  //const base = scene.add.triangle(0, 0, 0, 120, 80, -90, -80, -90, 0xffd36a);
  const base = scene.add.polygon(0, 0, [0, -60, 52, 30, -52, 30], 0x88ff00);
  const flecha = scene.add.rectangle(0, 0, 60, 0x88ff00);//scene.add.triangle(0, 0, 0, 30, 30, -30, -30, -30, 0xffd300);
  const centro = scene.add.circle(0, 0, 16, 0xffffff);

  pirinola.add([base, centro, flecha]);
  pirinola.setVisible(false);

  botonGirar = scene.add.text(195, 640, 'GIRAR', {
    fontSize: '28px',
    color: '#101020',
    backgroundColor: '#ffd36a',
    padding: { x: 35, y: 14 }
  })
  .setOrigin(0.5)
  .setInteractive()
  .setVisible(false);

  botonGirar.on('pointerdown', () => girarPirinola(scene));
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

    for (let i = 1; i <= cantidad; i++) {
      jugadores.push(`Jugador ${i}`);
    }

    div.remove();

    jugadorActual = 0;
    textoTurno.setText(`Turno de ${jugadores[jugadorActual]}`);
    textoResultado.setText('Toca GIRAR');
    pirinola.setVisible(true);
    botonGirar.setVisible(true);
  };
}

function girarPirinola(scene) {
  botonGirar.disableInteractive();
  textoResultado.setText('Girando...');

  const resultado = Phaser.Utils.Array.GetRandom(opciones);
  const vueltas = Phaser.Math.Between(4, 7);
  const anguloFinal = 360 * vueltas + Phaser.Math.Between(0, 360);

  scene.tweens.add({
    targets: pirinola,
    angle: pirinola.angle + anguloFinal,
    duration: 2200,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      textoResultado.setText(resultado);

      jugadorActual++;

      if (jugadorActual >= jugadores.length) {
        jugadorActual = 0;
      }

      textoTurno.setText(`Siguiente: ${jugadores[jugadorActual]}`);

      botonGirar.setInteractive();
    }
  });
}