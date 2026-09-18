/* Analítica propia del portafolio. No utiliza fingerprinting ni bloquea la experiencia. */
(function () {
  'use strict';

  const CONFIG = window.SUPABASE_CONFIG;
  const HEARTBEAT_MS = 45000;
  const ACTIVITY_THROTTLE_MS = 10000;
  let supabaseClient;
  let sessionId;
  let activityToken;
  let lastActivitySent = 0;
  const scrollEventsSent = new Set();

  function safeRun(action) {
    try {
      const result = action();
      if (result && typeof result.catch === 'function') result.catch(() => {});
      return result;
    } catch (_) {
      return undefined;
    }
  }

  function getVisitorId() {
    const key = 'portfolio_visitante_id';
    let id = localStorage.getItem(key);
    if (!id && window.crypto && typeof window.crypto.randomUUID === 'function') {
      id = window.crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  }

  function getTechnicalData() {
    const ua = navigator.userAgent || '';
    const lowerUa = ua.toLowerCase();
    const device = /ipad|tablet/.test(lowerUa) ? 'tablet' : /mobi|android/.test(lowerUa) ? 'movil' : 'escritorio';
    const browser = /edg\//.test(lowerUa) ? 'edge' : /firefox\//.test(lowerUa) ? 'firefox' : /chrome\//.test(lowerUa) ? 'chrome' : /safari\//.test(lowerUa) ? 'safari' : 'otro';
    const os = /windows/.test(lowerUa) ? 'windows' : /android/.test(lowerUa) ? 'android' : /iphone|ipad|ipod/.test(lowerUa) ? 'ios' : /mac os/.test(lowerUa) ? 'macos' : /linux/.test(lowerUa) ? 'linux' : 'otro';
    return {
      idioma_navegador: navigator.language || null,
      tipo_dispositivo: device,
      sistema_operativo: os,
      navegador: browser,
      ancho_pantalla: Number.isInteger(screen.width) ? screen.width : null,
      alto_pantalla: Number.isInteger(screen.height) ? screen.height : null
    };
  }

  async function getApproximateLocation() {
    // No usa GPS. La consulta es opcional y el proveedor sólo recibe la IP por la conexión HTTPS.
    if (!CONFIG || CONFIG.approximateGeolocation !== true) return {};
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      if (!response.ok) return {};
      const data = await response.json();
      return {
        pais: typeof data.country_name === 'string' ? data.country_name : null,
        codigo_pais: typeof data.country_code === 'string' ? data.country_code.slice(0, 2).toUpperCase() : null,
        region: typeof data.region === 'string' ? data.region : null,
        ciudad: typeof data.city === 'string' ? data.city : null
      };
    } catch (_) {
      return {};
    } finally {
      clearTimeout(timeout);
    }
  }

  async function registerEvent(type, element, detail) {
    if (!supabaseClient || !sessionId) return;
    await supabaseClient.from('portfolio_evento').insert({
      id_sesion: sessionId,
      tipo: type,
      pagina: window.location.pathname,
      elemento: element || null,
      detalle: detail || null
    });
  }

  async function updateActivity(closeSession) {
    if (!supabaseClient || !sessionId || !activityToken || (!closeSession && document.visibilityState !== 'visible')) return;
    const now = Date.now();
    if (!closeSession && now - lastActivitySent < ACTIVITY_THROTTLE_MS) return;
    lastActivitySent = now;
    await supabaseClient.rpc('actualizar_actividad_portafolio', {
      p_sesion_id: sessionId,
      p_token_actividad: activityToken,
      p_pagina_salida: closeSession ? window.location.pathname : null
    });
  }

  function bindPortfolioEvents() {
    const trackedLinks = [
      ['a[href="https://nerisatech.com/QRGames/PirinolaDemo/index.html"]', 'VER_PIRINOLA', 'Pirinola Pocket', 'demo'],
      ['a[href="https://github.com/Algunaisa/WebGames"]', 'VER_CODIGO_PIRINOLA', 'Pirinola Pocket', 'GitHub'],
      ['a[href="https://isamov3k.itch.io/rupestralia"]', 'VER_RUPESTRALIA', 'Rupestralia', 'itch.io'],
      ['a[href="https://isamov3k.itch.io/spaceroses-delivery"]', 'VER_SPACE_ROSES', 'Space Roses Delivery', 'itch.io'],
      ['a[href="Isa_Flores_CV.pdf"]', 'DESCARGAR_CV', 'CV', 'PDF'],
      ['a[href="https://github.com/Algunaisa"]', 'VER_GITHUB', 'GitHub', 'perfil'],
      ['a[href="https://www.linkedin.com/in/algunaisa/"]', 'VER_LINKEDIN', 'LinkedIn', 'perfil'],
      ['a[href="https://isamov3k.itch.io"]', 'VER_ITCHIO', 'itch.io', 'perfil']
    ];
    trackedLinks.forEach(([selector, type, project, destination]) => {
      document.querySelectorAll(selector).forEach((link) => {
        link.addEventListener('click', () => safeRun(() => registerEvent(type, link.textContent.trim(), {
          proyecto: project,
          destino: destination,
          link_url: link.href
        })));
      });
    });
  }

  function bindActivity() {
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((eventName) => {
      window.addEventListener(eventName, () => safeRun(() => updateActivity(false)), { passive: true });
    });
    window.addEventListener('scroll', () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const percent = (window.scrollY / maxScroll) * 100;
      [[50, 'SCROLL_50'], [90, 'SCROLL_90']].forEach(([threshold, type]) => {
        if (percent >= threshold && !scrollEventsSent.has(type)) {
          scrollEventsSent.add(type);
          safeRun(() => registerEvent(type, 'documento', { porcentaje: threshold }));
        }
      });
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') safeRun(() => updateActivity(false));
    });
    window.addEventListener('pagehide', () => safeRun(() => updateActivity(true)));
    setInterval(() => {
      if (document.visibilityState === 'visible') safeRun(() => updateActivity(false));
    }, HEARTBEAT_MS);
  }

  async function init() {
    if (!CONFIG || !CONFIG.url || !CONFIG.anonKey || !window.supabase) return;
    const visitorId = getVisitorId();
    if (!visitorId) return;
    supabaseClient = window.supabase.createClient(CONFIG.url, CONFIG.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const location = await getApproximateLocation();
    const { data, error } = await supabaseClient.rpc('iniciar_sesion_portafolio', {
      p_visitante_id: visitorId,
      p_pagina_entrada: window.location.pathname,
      p_referrer: document.referrer || null,
      p_datos_tecnicos: getTechnicalData(),
      p_ubicacion: location
    });
    if (error || !data || !data[0]) return;
    sessionId = data[0].id_sesion;
    activityToken = data[0].token_actividad;
    safeRun(() => registerEvent('PAGE_VIEW', 'pagina', { titulo: document.title }));
    bindPortfolioEvents();
    bindActivity();
  }

  safeRun(init);
}());
