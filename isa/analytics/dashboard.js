(function () {
  'use strict';
  const config = window.SUPABASE_CONFIG;
  if (!config || !window.supabase) return;
  const client = window.supabase.createClient(config.url, config.anonKey);
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const formatDuration = (seconds) => {
    const value = Math.max(0, Math.round(seconds || 0));
    return `${Math.floor(value / 60)}m ${value % 60}s`;
  };
  const formatDate = (value) => value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value)) : '—';
  const countBy = (items, key) => items.reduce((result, item) => { const value = item[key] || 'Sin dato'; result[value] = (result[value] || 0) + 1; return result; }, {});
  const listCounts = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => `<p>${escapeHtml(name)}: <strong>${count}</strong></p>`).join('') || '<p>Sin datos.</p>';

  async function loadDashboard() {
    $('#updatedAt').textContent = 'Actualizando…';
    const [{ data: sessions, error: sessionError }, { data: events, error: eventError }] = await Promise.all([
      client.from('portfolio_sesion').select('id,id_visitante,inicio,ultima_actividad,pagina_entrada,pais').order('inicio', { ascending: false }).limit(200),
      client.from('portfolio_evento').select('id,id_sesion,fecha,tipo,pagina,elemento,detalle').order('fecha', { ascending: false }).limit(2000)
    ]);
    if (sessionError || eventError) { $('#updatedAt').textContent = 'No tienes autorización para consultar la analítica.'; return; }
    const rows = sessions || []; const eventRows = events || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const durations = rows.map((row) => (new Date(row.ultima_actividad || row.inicio) - new Date(row.inicio)) / 1000);
    const uniqueVisitors = new Set(rows.map((row) => row.id_visitante));
    const returning = Object.values(countBy(rows, 'id_visitante')).filter((amount) => amount > 1).length;
    const metrics = [['Visitantes únicos', uniqueVisitors.size], ['Sesiones totales', rows.length], ['Sesiones de hoy', rows.filter((row) => new Date(row.inicio) >= today).length], ['Tiempo activo promedio', formatDuration(durations.reduce((sum, value) => sum + value, 0) / Math.max(rows.length, 1))], ['Descargas de CV', eventRows.filter((event) => event.tipo === 'DESCARGAR_CV').length], ['Visitantes que regresaron', returning]];
    $('#metrics').innerHTML = metrics.map(([label, value]) => `<article class="card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></article>`).join('');
    $('#countries').innerHTML = listCounts(countBy(rows, 'pais'));
    const relevant = eventRows.filter((event) => event.tipo !== 'PAGE_VIEW' && !event.tipo.startsWith('SCROLL'));
    $('#projects').innerHTML = listCounts(countBy(relevant, 'tipo'));
    const bySession = countBy(eventRows, 'id_sesion');
    $('#sessions').innerHTML = rows.slice(0, 50).map((row) => `<tr data-session="${row.id}"><td>${escapeHtml(row.id_visitante.slice(0, 8))}…</td><td>${formatDate(row.inicio)}</td><td>${escapeHtml(row.pais || '—')}</td><td>${formatDuration((new Date(row.ultima_actividad || row.inicio) - new Date(row.inicio)) / 1000)}</td><td>${escapeHtml(row.pagina_entrada || '—')}</td><td>${bySession[row.id] || 0}</td></tr>`).join('') || '<tr><td colspan="6">Aún no hay sesiones.</td></tr>';
    document.querySelectorAll('[data-session]').forEach((row) => row.addEventListener('click', () => showSessionDetail(row.dataset.session, eventRows)));
    $('#updatedAt').textContent = `Actualizado: ${formatDate(new Date())}`;
  }

  function showSessionDetail(id, events) {
    const sessionEvents = events.filter((event) => event.id_sesion === id).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    $('#detail').textContent = sessionEvents.map((event) => `${new Date(event.fecha).toLocaleTimeString('es-MX')} ${event.tipo} ${event.pagina || ''}${event.detalle ? ` ${JSON.stringify(event.detalle)}` : ''}`).join('\n') || 'No hay eventos para esta sesión.';
  }

  async function start() {
    const { data: { session } } = await client.auth.getSession();
    if (session) { $('#loginPanel').classList.add('hidden'); $('#dashboard').classList.remove('hidden'); loadDashboard(); }
  }
  $('#loginForm').addEventListener('submit', async (event) => {
    event.preventDefault(); $('#loginMessage').textContent = 'Verificando…';
    const { error } = await client.auth.signInWithPassword({ email: $('#email').value, password: $('#password').value });
    if (error) { $('#loginMessage').textContent = 'No fue posible iniciar sesión.'; return; }
    $('#loginPanel').classList.add('hidden'); $('#dashboard').classList.remove('hidden'); loadDashboard();
  });
  $('#refresh').addEventListener('click', loadDashboard);
  $('#logout').addEventListener('click', async () => { await client.auth.signOut(); $('#dashboard').classList.add('hidden'); $('#loginPanel').classList.remove('hidden'); });
  start();
}());
