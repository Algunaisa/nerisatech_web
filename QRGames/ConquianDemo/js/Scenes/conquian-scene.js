const temaBase = {
  marca: 'Nerisa Tech',
  titulo: 'Conquian QR',
  subtituloInicio: 'Reparte, toma y cierra con la mejor mano',
  footer: 'QR Games by Nerisa Tech',
  textos: {
    seccionJugadores: 'Jugadores',
    rangoJugadores: 'De 2 a 3 jugadores',
    seccionNombres: 'Nombres',
    botonCrear: 'COMENZAR JUEGO'
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
let jugadores = [];
let manos = [];
let mazo = [];
let descartes = [];
let jugadorActual = 0;
let cartasMano = [];
let formularioPartida = null;
let ganadorPartida = null;
let estadoTurno = 'esperandoInicio';
let textoTitulo;
let textoTurno;
let textoMensaje;
let textoDescarte;
let textoMesa;
let botonRobarMazo;
let botonRobarDescarte;
let botonNuevoJuego;
let botonReiniciar;
let fondoBotonRobarMazo;
let fondoBotonRobarDescarte;
let fondoBotonNuevoJuego;
let fondoBotonReiniciar;
let cartaContainer;
let marcadorPanel;
let textosJugadores = [];
let maximoCaracteresNombre = temaBase.maximoCaracteresNombre;

const palos = ['O', 'C', 'E', 'B'];
const rangos = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const ordenRango = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const simbolosPalo = { O: 'O', C: 'C', E: 'E', B: 'B' };

cargarTema().then(() => {
  const config = {
    type: Phaser.AUTO,
    width: 390,
    height: 700,
    backgroundColor: colorTema('fondo'),
    audio: {
      noAudio: true
    },
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

function create() {
  const scene = this;

  crearFondoJuego(scene);

  textoTitulo = scene.add.text(195, 58, textoTema('titulo').replace(' ', '\n'), {
    fontFamily: fuenteTema('titulo'),
    fontSize: '38px',
    color: colorTema('texto'),
    fontStyle: 'bold',
    align: 'center'
  }).setOrigin(0.5);
  textoTitulo.setShadow(0, 0, colorTema('texto'), 10, true, true);

  textoTurno = scene.add.text(195, 128, 'INGRESA JUGADORES', {
    fontFamily: fuenteTema(),
    fontSize: '19px',
    color: colorTema('textoSecundario'),
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 330 }
  }).setOrigin(0.5);

  textoMensaje = scene.add.text(195, 170, '', {
    fontFamily: fuenteTema(),
    fontSize: '16px',
    color: colorTema('principal'),
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 340 }
  }).setOrigin(0.5);

  textoDescarte = scene.add.text(195, 206, '', {
    fontFamily: fuenteTema(),
    fontSize: '20px',
    color: colorTema('acento'),
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 360 }
  }).setOrigin(0.5);

  textoMesa = scene.add.text(195, 244, '', {
    fontFamily: fuenteTema(),
    fontSize: '17px',
    color: colorTema('textoSecundario'),
    fontStyle: 'bold',
    align: 'center',
    wordWrap: { width: 360 }
  }).setOrigin(0.5);

  cartaContainer = scene.add.container(195, 330);

  crearBotonesAccion(scene);

  marcadorPanel = scene.add.graphics();
  marcadorPanel.setVisible(false);

  crearFooterJuego(scene);
  crearFormularioHTML(scene);
}

function crearBotonesAccion(scene) {
  fondoBotonRobarMazo = crearFondoBoton(scene, 94, 572, 156, 44, colorNumero('principal'));
  botonRobarMazo = scene.add.text(94, 572, 'ROBAR MAZO', {
    fontFamily: fuenteTema(),
    fontSize: '16px',
    color: colorTema('textoOscuro'),
    fontStyle: 'bold'
  }).setOrigin(0.5).setInteractive();
  botonRobarMazo.on('pointerdown', () => robarDesdeMazo(scene));

  fondoBotonRobarDescarte = crearFondoBoton(scene, 296, 572, 156, 44, colorNumero('acento'));
  botonRobarDescarte = scene.add.text(296, 572, 'ROBAR DESCARTE', {
    fontFamily: fuenteTema(),
    fontSize: '16px',
    color: colorTema('textoOscuro'),
    fontStyle: 'bold'
  }).setOrigin(0.5).setInteractive();
  botonRobarDescarte.on('pointerdown', () => robarDesdeDescarte(scene));

  fondoBotonNuevoJuego = crearFondoBoton(scene, 68, 28, 96, 36, colorNumero('acento'), 8);
  botonNuevoJuego = scene.add.text(68, 28, 'NUEVO', {
    fontFamily: fuenteTema(),
    fontSize: '15px',
    color: colorTema('textoOscuro'),
    fontStyle: 'bold'
  }).setOrigin(0.5).setInteractive();
  botonNuevoJuego.on('pointerdown', () => mostrarFormularioNuevaPartida(scene));

  fondoBotonReiniciar = crearFondoBoton(scene, 322, 28, 96, 36, colorNumero('principal'), 8);
  botonReiniciar = scene.add.text(322, 28, 'REINICIAR', {
    fontFamily: fuenteTema(),
    fontSize: '15px',
    color: colorTema('textoOscuro'),
    fontStyle: 'bold'
  }).setOrigin(0.5).setInteractive();
  botonReiniciar.on('pointerdown', () => reiniciarPartidaActual(scene));

  mostrarBoton(botonRobarMazo, fondoBotonRobarMazo, false);
  mostrarBoton(botonRobarDescarte, fondoBotonRobarDescarte, false);
  mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, false);
  mostrarBoton(botonReiniciar, fondoBotonReiniciar, false);
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

        <section style="
          margin-top: clamp(18px, 5dvh, 28px);
          padding: 16px 16px 18px;
          border: 2px solid ${colorTema('panelBorde')};
          border-radius: 16px;
          background: ${colorTema('panel')};
          box-shadow: 0 0 22px rgba(54, 214, 201, 0.06);
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 12px;
            color: ${colorTema('principal')};
            font-size: 21px;
            font-weight: 700;
            text-align: left;
          ">
            <span>${textoUITema('seccionJugadores')}</span>
          </div>

          <div style="
            margin-top: 12px;
            border-top: 1px dashed ${colorTema('principal')};
          "></div>

          <input id="numJugadores" type="hidden" min="2" max="3" value="2" />

          <div style="
            display: grid;
            grid-template-columns: 62px 1fr 62px;
            gap: 12px;
            align-items: center;
            margin-top: 20px;
          ">
            <button id="btnMenosJugadores" type="button" style="
              width: 62px;
              height: 62px;
              border: none;
              border-radius: 50%;
              background: ${colorTema('acento')};
              color: ${colorTema('textoOscuro')};
              font-size: 42px;
              line-height: 1;
              box-shadow: 0 0 14px rgba(255, 211, 106, 0.35);
            ">-</button>

            <div id="displayJugadores" style="
              height: 62px;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid ${colorTema('panelBorde')};
              border-radius: 16px;
              background: ${colorTema('panel')};
              color: ${colorTema('texto')};
              font-size: 36px;
              font-weight: 700;
            ">2</div>

            <button id="btnMasJugadores" type="button" style="
              width: 62px;
              height: 62px;
              border: none;
              border-radius: 50%;
              background: ${colorTema('acento')};
              color: ${colorTema('textoOscuro')};
              font-size: 42px;
              line-height: 1;
              box-shadow: 0 0 14px rgba(255, 211, 106, 0.35);
            ">+</button>
          </div>

          <div style="
            margin-top: 12px;
            color: ${colorTema('textoSecundario')};
            font-size: 14px;
          ">
            ${textoUITema('rangoJugadores')}
          </div>
        </section>

        <section style="
          margin-top: 14px;
          padding: 16px;
          border: 2px solid ${colorTema('panelBorde')};
          border-radius: 16px;
          background: ${colorTema('panel')};
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 12px;
            color: ${colorTema('principal')};
            font-size: 21px;
            font-weight: 700;
            text-align: left;
          ">
            <span>${textoUITema('seccionNombres')}</span>
          </div>

          <div style="
            margin-top: 12px;
            border-top: 1px dashed ${colorTema('principal')};
          "></div>

          <div id="camposJugadores" style="margin-top: 16px;"></div>
        </section>

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
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 24px auto 0;
          width: 78%;
          color: ${colorTema('principal')};
        ">
          <div style="flex: 1; border-top: 1px dashed ${colorTema('principal')};"></div>
          <div style="
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid ${colorTema('acento')};
            border-radius: 50%;
            color: ${colorTema('principal')};
            font-size: 18px;
          ">o</div>
          <div style="flex: 1; border-top: 1px dashed ${colorTema('principal')};"></div>
        </div>

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
  renderizarCamposJugadores();

  document.getElementById('btnMenosJugadores').onclick = () => {
    const input = document.getElementById('numJugadores');

    input.value = Number(input.value) - 1;
    renderizarCamposJugadores();
  };

  document.getElementById('btnMasJugadores').onclick = () => {
    const input = document.getElementById('numJugadores');

    input.value = Number(input.value) + 1;
    renderizarCamposJugadores();
  };

  document.getElementById('btnCrear').onclick = () => {
    const cantidad = obtenerCantidadJugadores();
    const inputsNombres = document.querySelectorAll('.nombreJugador');

    jugadores = [];
    manos = [];
    ganadorPartida = null;
    for (let i = 0; i < cantidad; i++) {
      const nombre = inputsNombres[i].value.trim();
      jugadores.push(nombre || `Jugador ${i + 1}`);
    }

    div.remove();
    formularioPartida = null;

    iniciarPartida(scene);
  };
}

function renderizarCamposJugadores() {
  const cantidad = obtenerCantidadJugadores();
  const contenedor = document.getElementById('camposJugadores');

  if (!contenedor) {
    return;
  }

  actualizarDisplayJugadores(cantidad);

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
    input.maxLength = maximoCaracteresNombre;
    input.placeholder = `Nombre ${i + 1}`;
    input.value = nombresActuales[i] || '';
    input.style.cssText = `
      width: 100%;
      margin-top: ${i === 0 ? '0' : '10px'};
      padding: 11px 14px;
      box-sizing: border-box;
      font-family: '${fuenteTema()}', monospace;
      font-size: 20px;
      font-weight: 700;
      color: ${colorTema('texto')};
      background: ${colorTema('panel')};
      border: 2px solid ${colorTema('panelBorde')};
      border-radius: 14px;
      outline: none;
      box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.25);
    `;

    contenedor.appendChild(input);
  }
}

function actualizarDisplayJugadores(cantidad) {
  const display = document.getElementById('displayJugadores');

  if (display) {
    display.textContent = cantidad;
  }
}

function obtenerCantidadJugadores() {
  const input = document.getElementById('numJugadores');
  let cantidad = Number(input.value);

  if (!Number.isFinite(cantidad)) {
    input.value = 2;
    return 2;
  }

  cantidad = Math.max(2, Math.min(3, Math.floor(cantidad)));
  input.value = cantidad;
  return cantidad;
}

function iniciarPartida(scene) {
  jugadorActual = 0;
  manos = [];
  mazo = crearMazoConquian();
  barajar(mazo);
  descartes = [];

  for (let i = 0; i < jugadores.length; i++) {
    manos.push(mazo.splice(0, 10));
  }

  descartes.push(mazo.splice(0, 1)[0]);
  estadoTurno = 'esperandoRobo';
  ganadorPartida = null;

  textoTurno.setText('TURNO DE');
  textoMensaje.setText(`Es turno de ${formatearNombreUI(jugadores[jugadorActual], maximoCaracteresNombre)}`);
  actualizarDescarte();
  actualizarMesa();
  actualizarMarcador();
  renderizarCartasMano(scene);
  mostrarBoton(botonRobarMazo, fondoBotonRobarMazo, true);
  mostrarBoton(botonRobarDescarte, fondoBotonRobarDescarte, true);
  mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, true);
  mostrarBoton(botonReiniciar, fondoBotonReiniciar, true);
}

function reiniciarPartidaActual(scene) {
  if (!jugadores.length) {
    return;
  }

  iniciarPartida(scene);
}

function mostrarFormularioNuevaPartida(scene) {
  if (scene) {
    scene.tweens.killAll();
  }

  jugadores = [];
  manos = [];
  mazo = [];
  descartes = [];
  jugadorActual = 0;
  ganadorPartida = null;
  estadoTurno = 'esperandoInicio';

  cartasMano.forEach((texto) => texto.destroy());
  cartasMano = [];
  cartaContainer.removeAll(true);

  textoTurno.setText('INGRESA JUGADORES');
  textoMensaje.setText('');
  textoDescarte.setText('');
  textoMesa.setText('');

  mostrarBoton(botonRobarMazo, fondoBotonRobarMazo, false);
  mostrarBoton(botonRobarDescarte, fondoBotonRobarDescarte, false);
  mostrarBoton(botonReiniciar, fondoBotonReiniciar, false);
  mostrarBoton(botonNuevoJuego, fondoBotonNuevoJuego, false);

  textosJugadores.forEach((texto) => texto.destroy());
  textosJugadores = [];

  crearFormularioHTML(scene);
}

function crearMazoConquian() {
  const mazoLocal = [];

  for (const palo of palos) {
    for (const rango of rangos) {
      mazoLocal.push({ palo, rango });
    }
  }

  return mazoLocal;
}

function barajar(mazoLocal) {
  for (let i = mazoLocal.length - 1; i > 0; i--) {
    const j = Phaser.Math.Between(0, i);
    [mazoLocal[i], mazoLocal[j]] = [mazoLocal[j], mazoLocal[i]];
  }
}

function robarDesdeMazo(scene) {
  if (estadoTurno !== 'esperandoRobo' || !mazo.length) {
    return;
  }

  manos[jugadorActual].push(mazo.pop());
  estadoTurno = 'esperandoDescartar';
  textoMensaje.setText('Selecciona una carta para descartar');
  actualizarMesa();
  actualizarDescarte();
  renderizarCartasMano(scene);
  actualizarBotonesAccion();
}

function robarDesdeDescarte(scene) {
  if (estadoTurno !== 'esperandoRobo' || !descartes.length) {
    return;
  }

  manos[jugadorActual].push(descartes.shift());
  estadoTurno = 'esperandoDescartar';
  textoMensaje.setText('Selecciona una carta para descartar');
  actualizarMesa();
  actualizarDescarte();
  renderizarCartasMano(scene);
  actualizarBotonesAccion();
}

function seleccionarCartaParaDescartar(scene, indice) {
  if (estadoTurno !== 'esperandoDescartar') {
    return;
  }

  const mano = manos[jugadorActual];

  if (indice < 0 || indice >= mano.length) {
    return;
  }

  const carta = mano.splice(indice, 1)[0];
  descartes.unshift(carta);

  if (mano.length !== 10) {
    textoMensaje.setText('Error al descartar. Intenta otra vez.');
    return;
  }

  actualizarDescarte();
  actualizarMesa();
  renderizarCartasMano(scene);

  if (puedeCerrarConquian(mano)) {
    finalizarPartida(jugadores[jugadorActual], scene);
    return;
  }

  siguienteJugador(scene);
}

function siguienteJugador(scene) {
  jugadorActual = (jugadorActual + 1) % jugadores.length;
  estadoTurno = 'esperandoRobo';
  textoMensaje.setText(`Es turno de ${formatearNombreUI(jugadores[jugadorActual], maximoCaracteresNombre)}`);
  actualizarDescarte();
  actualizarMesa();
  renderizarCartasMano(scene);
  actualizarMarcador();
  actualizarBotonesAccion();
}

function finalizarPartida(ganador, scene) {
  ganadorPartida = ganador;
  textoTurno.setText('FIN DE LA PARTIDA');
  textoMensaje.setText(`${formatearNombreUI(ganador, maximoCaracteresNombre).toUpperCase()} CIERRA CONQUIAN!`);
  mostrarBoton(botonRobarMazo, fondoBotonRobarMazo, false);
  mostrarBoton(botonRobarDescarte, fondoBotonRobarDescarte, false);
  actualizarMarcador();
  lanzarConfeti(scene);
}

function actualizarBotonesAccion() {
  if (estadoTurno === 'esperandoRobo') {
    mostrarBoton(botonRobarMazo, fondoBotonRobarMazo, !!mazo.length);
    botonRobarMazo.setInteractive(!!mazo.length);
    mostrarBoton(botonRobarDescarte, fondoBotonRobarDescarte, !!descartes.length);
    botonRobarDescarte.setInteractive(!!descartes.length);
  } else if (estadoTurno === 'esperandoDescartar') {
    mostrarBoton(botonRobarMazo, fondoBotonRobarMazo, false);
    mostrarBoton(botonRobarDescarte, fondoBotonRobarDescarte, false);
  } else {
    mostrarBoton(botonRobarMazo, fondoBotonRobarMazo, false);
    mostrarBoton(botonRobarDescarte, fondoBotonRobarDescarte, false);
  }
}

function actualizarDescarte() {
  if (descartes.length === 0) {
    textoDescarte.setText('Descarte: vacio');
  } else {
    textoDescarte.setText(`Descarte: ${formatearCarta(descartes[0])}  |  Mazo: ${mazo.length}`);
  }
}

function actualizarMesa() {
  textoMesa.setText(`Carta actual: ${manoInfoTexto()}  •  Cartas en mazo: ${mazo.length}  •  Descartes: ${descartes.length}`);
}

function manoInfoTexto() {
  return `${jugadores[jugadorActual]} tiene ${manos[jugadorActual]?.length ?? 0} cartas`;
}

function renderizarCartasMano(scene) {
  cartasMano.forEach((carta) => carta.destroy());
  cartasMano = [];
  cartaContainer.removeAll(true);

  const mano = manos[jugadorActual] || [];
  const columnas = 5;
  const separacionX = 74;
  const separacionY = 92;
  const ancho = 62;
  const alto = 84;

  for (let i = 0; i < mano.length; i++) {
    const fila = Math.floor(i / columnas);
    const columna = i % columnas;
    const x = (columna - (columnas - 1) / 2) * separacionX;
    const y = fila * separacionY;
    const carta = mano[i];

    const contenedor = scene.add.container(x, y);
    const fondo = scene.add.graphics();
    fondo.fillStyle(0xffffff, 1);
    fondo.lineStyle(2, colorNumero('panelBorde'), 1);
    fondo.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 10);
    fondo.strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, 10);
    contenedor.add(fondo);

    const etiquetaValor = scene.add.text(0, -18, `${carta.rango}`, {
      fontFamily: fuenteTema(),
      fontSize: '24px',
      color: colorTema('textoOscuro'),
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    contenedor.add(etiquetaValor);

    const etiquetaPalo = scene.add.text(0, 10, simbolosPalo[carta.palo], {
      fontFamily: fuenteTema(),
      fontSize: '28px',
      color: colorTema('principal'),
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    contenedor.add(etiquetaPalo);

    contenedor.setSize(ancho, alto);
    contenedor.setInteractive(
      new Phaser.Geom.Rectangle(-ancho / 2, -alto / 2, ancho, alto),
      Phaser.Geom.Rectangle.Contains
    );
    contenedor.on('pointerdown', () => seleccionarCartaParaDescartar(scene, i));
    contenedor.setScale(0.95);

    cartasMano.push(contenedor);
    cartaContainer.add(contenedor);
  }

  if (!mano.length) {
    const textoVacio = scene.add.text(0, 0, 'No hay cartas', {
      fontFamily: fuenteTema(),
      fontSize: '20px',
      color: colorTema('textoSecundario'),
      align: 'center'
    }).setOrigin(0.5);
    cartasMano.push(textoVacio);
    cartaContainer.add(textoVacio);
  }
}

function formatearCarta(carta) {
  return `${carta.rango}${simbolosPalo[carta.palo]}`;
}

function formatearNombreUI(nombre, maximo) {
  if (nombre.length <= maximo) {
    return nombre;
  }

  return `${nombre.slice(0, maximo - 1)}.`;
}

function puedeCerrarConquian(mano) {
  if (!mano || mano.length !== 10) {
    return false;
  }

  const cartas = mano.map((c) => ({ palo: c.palo, rango: c.rango }));
  cartas.sort((a, b) => {
    const indexA = ordenRango.indexOf(a.rango);
    const indexB = ordenRango.indexOf(b.rango);
    if (indexA !== indexB) {
      return indexA - indexB;
    }
    return palos.indexOf(a.palo) - palos.indexOf(b.palo);
  });

  return validarMelds(cartas);
}

function validarMelds(cartas) {
  if (cartas.length === 0) {
    return true;
  }

  const primero = cartas[0];
  const igualesRango = cartas.filter((c) => c.rango === primero.rango);

  if (igualesRango.length >= 3) {
    for (let size = 3; size <= igualesRango.length; size++) {
      const seleccion = igualesRango.slice(0, size);
      const resto = eliminarCartas(cartas, seleccion);
      if (validarMelds(resto)) {
        return true;
      }
    }
  }

  const mismaSola = cartas.filter((c) => c.palo === primero.palo);
  const ordenActual = ordenRango.indexOf(primero.rango);

  for (let size = 3; size <= mismaSola.length; size++) {
    const secuencia = [primero];
    let siguienteIndex = ordenActual;
    for (let k = 1; k < size; k++) {
      siguienteIndex = obtenerIndiceSiguiente(ordenRango, siguienteIndex);
      if (siguienteIndex === -1) {
        break;
      }
      const siguienteRango = ordenRango[siguienteIndex];
      const cartaSiguiente = mismaSola.find((c) => c.rango === siguienteRango);
      if (!cartaSiguiente) {
        break;
      }
      secuencia.push(cartaSiguiente);
    }

    if (secuencia.length === size) {
      const resto = eliminarCartas(cartas, secuencia);
      if (validarMelds(resto)) {
        return true;
      }
    }
  }

  return false;
}

function obtenerIndiceSiguiente(arr, index) {
  if (index < 0 || index >= arr.length - 1) {
    return -1;
  }

  return index + 1;
}

function eliminarCartas(cartas, seleccion) {
  const copia = [...cartas];

  for (const carta of seleccion) {
    const indice = copia.findIndex((c) => c.rango === carta.rango && c.palo === carta.palo);
    if (indice !== -1) {
      copia.splice(indice, 1);
    }
  }

  return copia;
}

function actualizarMarcador() {
  textosJugadores.forEach((texto) => texto.destroy());
  textosJugadores = [];

  if (!marcadorPanel) {
    return;
  }

  marcadorPanel.clear();
  marcadorPanel.fillStyle(colorNumero('panel'), 0.88);
  marcadorPanel.fillRoundedRect(28, 464, 334, 148, 14);
  marcadorPanel.lineStyle(2, colorNumero('panelBorde'), 1);
  marcadorPanel.strokeRoundedRect(28, 464, 334, 148, 14);

  for (let i = 0; i < jugadores.length; i++) {
    const y = 482 + i * 28;
    const activo = i === jugadorActual;
    const ganador = ganadorPartida === jugadores[i];
    const textoJugador = ` ${formatearNombreUI(jugadores[i], maximoCaracteresNombre)} · ${manos[i]?.length ?? 0} cartas ${ganador ? '· GANADOR' : ''}`;
    const estilo = {
      fontFamily: fuenteTema(),
      fontSize: activo ? '18px' : '16px',
      color: ganador ? colorTema('acento') : activo ? colorTema('principal') : colorTema('texto'),
      fontStyle: activo || ganador ? 'bold' : 'normal'
    };

    const texto = markerAddText(textoJugador, 40, y, estilo);
    textosJugadores.push(texto);
  }
}

function markerAddText(texto, x, y, estilo) {
  const scene = cartaContainer.scene;
  return scene.add.text(x, y, texto, estilo).setOrigin(0, 0);
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

function crearFooterJuego(scene) {
  scene.add.text(195, 684, textoTema('footer'), {
    fontFamily: fuenteTema(),
    fontSize: '14px',
    color: colorTema('textoSecundario'),
    fontStyle: 'bold'
  }).setOrigin(0.5);
}

function lanzarConfeti(scene) {
  const colores = [colorNumero('acento'), colorNumero('principal'), colorNumero('texto'), colorNumero('exito')];

  for (let i = 0; i < 34; i++) {
    const angulo = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radioInicial = Phaser.Math.Between(34, 84);
    const x = 195 + Math.cos(angulo) * radioInicial;
    const y = 350 + Math.sin(angulo) * radioInicial;
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
