
// ── KONFIGURASI ──────────────────────────────────────────────
const CURRENCIES = ['USD', 'JPY', 'SGD', 'MYR', 'THB', 'KRW'];

const CURRENCY_COLORS = {
  USD: '#3b82f6',
  JPY: '#f59e0b',
  SGD: '#10b981',
  MYR: '#8b5cf6',
  THB: '#ef4444',
  KRW: '#06b6d4',
};

const CURRENCY_NAMES = {
  USD: 'Dolar Amerika',
  JPY: 'Yen Jepang',
  SGD: 'Dolar Singapura',
  MYR: 'Ringgit Malaysia',
  THB: 'Baht Thailand',
  KRW: 'Won Korea Selatan',
};

const TIMEFRAMES = [
  { id: '7H', label: '7 Hari', days: 7 },
  { id: '30H', label: '30 Hari', days: 30 },
  { id: '3B', label: '3 Bulan', days: 90 },
  { id: '1T', label: '1 Tahun', days: 365 },
];

let selectedTimeframe = '30H';

Chart.defaults.color = '#64748b';
Chart.defaults.borderColor = '#1e2d45';
Chart.defaults.font.family = "'JetBrains Mono', monospace";
Chart.defaults.font.size = 11;

let historicalData = {};   
let latestRates    = {};   
let weekAgoRates   = {};   
let activeLines    = new Set(['USD']);
let lineChartInst  = null;
let barChartInst   = null;
let scatterChartInst = null;

// ── LOADING OVERLAY 
function showLoading() {
  const el = document.createElement('div');
  el.className = 'loading-overlay';
  el.id = 'loading-overlay';
  el.innerHTML = `
    <div class="loading-spinner"></div>
    <div class="loading-text">Mengambil data dari Frankfurter API...</div>
  `;
  document.body.prepend(el);
}

function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) {
    el.classList.add('hidden');
    setTimeout(() => el.remove(), 600);
  }
}

// ── DATE HELPERS
function getDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString().split('T')[0];
}

async function fetchHistorical(currency, startDate, endDate) {
  const url = `https://api.frankfurter.dev/v1/${startDate}..${endDate}?from=${currency}&to=IDR`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal fetch ${currency}`);
  const json = await res.json();
  // json.rates = { "2024-06-01": { IDR: 15800 }, ... }
  return Object.entries(json.rates)
    .map(([date, r]) => ({ date, rate: r.IDR }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchAllData(maxDays = 365) {
  const endDate   = getDateStr(1);   // kemarin (hari ini mungkin belum update)
  const startDate = getDateStr(maxDays);

  const promises = CURRENCIES.map(c => fetchHistorical(c, startDate, endDate));
  const results  = await Promise.all(promises);

  CURRENCIES.forEach((c, i) => {
    historicalData[c] = results[i];
    const arr = results[i];
    latestRates[c]  = arr[arr.length - 1]?.rate ?? 0;
    weekAgoRates[c] = arr[arr.length - 8]?.rate ?? arr[0]?.rate ?? 0;
  });
}

// ── KPI CARDS
function animateCountUp(element, targetValue, decimals = 0) {
  const duration = 1200;
  const start    = performance.now();
  const from     = 0;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = from + (targetValue - from) * ease;
    element.textContent = current.toLocaleString('id-ID', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderKPICards() {
  const timeframe = getSelectedTimeframe();

  CURRENCIES.forEach(c => {
    const card    = document.getElementById(`kpi-${c.toLowerCase()}`);
    if (!card) return;
    const valEl   = card.querySelector('.kpi-value');
    const chgEl   = card.querySelector('.kpi-change');
    const latest  = latestRates[c];
    const history = getFilteredHistory(c);
    const start   = history[0]?.rate ?? latest;
    const pct     = start ? ((latest - start) / start) * 100 : 0;
    const isUp    = pct >= 0;

    const decimals = latest < 100 ? 2 : 0;
    animateCountUp(valEl, latest, decimals);

    chgEl.textContent = `${isUp ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}% (${timeframe.id})`;
    chgEl.className   = `kpi-change ${isUp ? 'up' : 'down'}`;
  });
}

// ── CHART 1: LINE ────────────────────────────────────────────

// Toggle handler untuk Line Chart
function getSelectedTimeframe() {
  return TIMEFRAMES.find(frame => frame.id === selectedTimeframe) ?? TIMEFRAMES[1];
}

function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

function getFilteredHistory(currency) {
  const days = getSelectedTimeframe().days;
  const history = historicalData[currency] || [];
  if (!history.length) return [];

  const rateByDate = history.reduce((map, entry) => {
    map[entry.date] = entry.rate;
    return map;
  }, {});

  const latestDate = new Date(history[history.length - 1].date);
  const startDate = new Date(latestDate);
  startDate.setDate(latestDate.getDate() - (days - 1));

  const filled = [];
  let lastRate = history[0].rate;

  for (const entry of history) {
    if (new Date(entry.date) <= startDate) {
      lastRate = entry.rate;
    }
  }

  for (let dt = new Date(startDate); dt <= latestDate; dt.setDate(dt.getDate() + 1)) {
    const dateKey = formatDateKey(dt);
    if (rateByDate[dateKey] !== undefined) {
      lastRate = rateByDate[dateKey];
    }
    filled.push({ date: dateKey, rate: lastRate });
  }

  return filled;
}

function formatLineTitle() {
  return `Pergerakan Kurs Rupiah ${getSelectedTimeframe().label}`;
}

function prepareLineChartData() {
  const labels = getFilteredHistory('USD').map(d => {
    const dt = new Date(d.date);
    return `${dt.getDate()} ${dt.toLocaleString('id-ID', { month: 'short' })}`;
  });

  const datasets = CURRENCIES.map(c => {
    const filtered = getFilteredHistory(c);
    return {
      label: c,
      data: filtered.map(d => d.rate),
      borderColor:     CURRENCY_COLORS[c],
      backgroundColor: CURRENCY_COLORS[c] + '22',
      borderWidth:     2,
      pointRadius:     2,
      pointHoverRadius: 6,
      tension:         0.4,
      fill:            false,
      hidden:          !activeLines.has(c),
    };
  });

  return { labels, datasets };
}

function updateLineChartTitle() {
  const titleEl = document.getElementById('line-chart-title');
  if (titleEl) titleEl.textContent = formatLineTitle();
}

function buildLineChart() {
  const { labels, datasets } = prepareLineChartData();

  const ctx = document.getElementById('lineChart').getContext('2d');
  lineChartInst = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111827',
          borderColor:     '#1e2d45',
          borderWidth:     1,
          titleColor:      '#e2e8f0',
          bodyColor:       '#94a3b8',
          padding:         12,
          callbacks: {
            title: items => `📅 ${items[0].label}`,
            label: ctx => {
              const name = CURRENCY_NAMES[ctx.dataset.label] || ctx.dataset.label;
              return ` ${ctx.dataset.label} (${name}): Rp ${ctx.parsed.y.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid:   { color: '#1e2d4540' },
          ticks:  { maxTicksLimit: 8 },
        },
        y: {
          beginAtZero: false,
          grid:   { color: '#1e2d4540' },
          ticks:  {
            callback: v => 'Rp ' + v.toLocaleString('id-ID'),
          },
        },
      },
    },
  });
  updateLineChartTitle();
}

function updateLineChart() {
  if (!lineChartInst) return;

  const { labels, datasets } = prepareLineChartData();
  lineChartInst.data.labels = labels;
  lineChartInst.data.datasets = datasets;
  lineChartInst.update();
  updateLineChartTitle();
  renderKPICards();
}

function initLineToggle() {
  const btns = document.querySelectorAll('#line-toggle .toggle-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const currency = btn.dataset.currency;
      const isActive = btn.classList.toggle('active');

      if (isActive) {
        activeLines.add(currency);
      } else {
        activeLines.delete(currency);
      }

      lineChartInst.data.datasets.forEach(ds => {
        if (ds.label === currency) ds.hidden = !isActive;
      });
      lineChartInst.update();
    });
  });
}

function syncLineToggleButtons() {
  const btns = document.querySelectorAll('#line-toggle .toggle-btn');
  btns.forEach(btn => {
    const currency = btn.dataset.currency;
    btn.classList.toggle('active', activeLines.has(currency));
  });
}

function initTimeframeToggle() {
  const btns = document.querySelectorAll('#timeframe-toggle .toggle-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const range = btn.dataset.range;
      if (range === selectedTimeframe) return;

      selectedTimeframe = range;
      btns.forEach(b => b.classList.toggle('active', b.dataset.range === range));
          updateLineChart();
          if (typeof updateBarChart === 'function') updateBarChart();
          if (typeof generateInsight === 'function') generateInsight();
    });
  });
}

// ── CHART 2: BAR ─────────────────────────────────────────────
function updateBarChart() {
  const timeframe = getSelectedTimeframe();
  const pctChanges = CURRENCIES.map(c => {
    const hist = getFilteredHistory(c);
    const start = hist[0]?.rate ?? latestRates[c] ?? 0;
    const end   = hist[hist.length - 1]?.rate ?? latestRates[c] ?? 0;
    return start ? parseFloat(((end - start) / start * 100).toFixed(2)) : 0;
  });

  const bg = pctChanges.map(v => v >= 0 ? 'rgba(0,255,136,0.7)' : 'rgba(255,77,109,0.7)');
  const bd = pctChanges.map(v => v >= 0 ? '#00ff88' : '#ff4d6d');

  const data = {
    labels: CURRENCIES,
    datasets: [{
      label: `Perubahan % (${timeframe.label})`,
      data: pctChanges,
      backgroundColor: bg,
      borderColor: bd,
      borderWidth: 1,
      borderRadius: 6,
    }],
  };

  const ctx = document.getElementById('barChart').getContext('2d');

  if (!barChartInst) {
    barChartInst = new Chart(ctx, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            borderColor:     '#1e2d45',
            borderWidth:     1,
            titleColor:      '#e2e8f0',
            bodyColor:       '#94a3b8',
            padding:         12,
            callbacks: {
              title: items => `${items[0].label} — ${CURRENCY_NAMES[items[0].label]}`,
              label: ctx => {
                const v = ctx.parsed.y;
                return ` ${v >= 0 ? '▲ Menguat' : '▼ Melemah'} ${Math.abs(v).toFixed(2)}% vs IDR (${timeframe.label})`;
              },
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid:   { color: '#1e2d4540' },
            ticks:  { callback: v => v + '%' },
          },
        },
      },
    });
  } else {
    barChartInst.data = data;
    if (barChartInst.options && barChartInst.options.plugins && barChartInst.options.plugins.tooltip && barChartInst.options.plugins.tooltip.callbacks) {
      barChartInst.options.plugins.tooltip.callbacks.label = ctx2 => {
        const v = ctx2.parsed.y;
        return ` ${v >= 0 ? '▲ Menguat' : '▼ Melemah'} ${Math.abs(v).toFixed(2)}% vs IDR (${timeframe.label})`;
      };
    }
    barChartInst.update();
  }
}

// ── CHART 3: SCATTER 
function calcVolatility(currency) {
  const rates = historicalData[currency].map(d => d.rate);
  if (rates.length < 2) return 0;
  const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
  const variance = rates.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / rates.length;
  const stddev = Math.sqrt(variance);
  return parseFloat(((stddev / mean) * 100).toFixed(3)); // coefficient of variation (%)
}

function buildScatterChart() {
  const scatterData = CURRENCIES.map(c => ({
    x:    calcVolatility(c),
    y:    parseFloat(latestRates[c].toFixed(2)),
    currency: c,
  }));

  const ctx = document.getElementById('scatterChart').getContext('2d');
  scatterChartInst = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: CURRENCIES.map((c, i) => ({
        label: c,
        data:  [scatterData[i]],
        backgroundColor: CURRENCY_COLORS[c] + 'cc',
        borderColor:     CURRENCY_COLORS[c],
        borderWidth:     2,
        pointRadius:     10,
        pointHoverRadius: 14,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display:  true,
          position: 'bottom',
          labels:   { boxWidth: 10, padding: 12, color: '#64748b' },
        },
        tooltip: {
          backgroundColor: '#111827',
          borderColor:     '#1e2d45',
          borderWidth:     1,
          titleColor:      '#e2e8f0',
          bodyColor:       '#94a3b8',
          padding:         12,
          callbacks: {
            title: items => `${items[0].dataset.label} — ${CURRENCY_NAMES[items[0].dataset.label]}`,
            label: ctx => [
              ` Volatilitas: ${ctx.parsed.x.toFixed(3)}%`,
              ` Nilai saat ini: Rp ${ctx.parsed.y.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            ],
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Volatilitas 30 Hari (%)', color: '#64748b' },
          grid:  { color: '#1e2d4540' },
        },
        y: {
          title: { display: true, text: 'Nilai vs IDR (Rp)', color: '#64748b' },
          grid:  { color: '#1e2d4540' },
          ticks: { callback: v => 'Rp ' + v.toLocaleString('id-ID') },
        },
      },
    },
  });
}

// ── INSIGHT 
function generateInsight() {
  const changes = CURRENCIES.map(c => ({
    c,
    pct: weekAgoRates[c] ? ((latestRates[c] - weekAgoRates[c]) / weekAgoRates[c]) * 100 : 0,
  }));

  const strongest  = changes.reduce((a, b) => a.pct > b.pct ? a : b);
  const weakest    = changes.reduce((a, b) => a.pct < b.pct ? a : b);
  const volatilities = CURRENCIES.map(c => ({ c, v: calcVolatility(c) }));
  const mostVolatile = volatilities.reduce((a, b) => a.v > b.v ? a : b);

  const strongDir = strongest.pct >= 0 ? 'menguat' : 'melemah paling sedikit';
  const weakDir   = weakest.pct < 0   ? 'melemah' : 'menguat paling sedikit';

  document.getElementById('insight-text').innerHTML =
    `Dalam 7 hari terakhir, <strong style="color:#00ff88">${strongest.c} (${CURRENCY_NAMES[strongest.c]})</strong> 
    ${strongDir} paling signifikan terhadap Rupiah sebesar <strong>${Math.abs(strongest.pct).toFixed(2)}%</strong>. 
    Sementara <strong style="color:#ff4d6d">${weakest.c} (${CURRENCY_NAMES[weakest.c]})</strong> 
    ${weakDir} sebesar <strong>${Math.abs(weakest.pct).toFixed(2)}%</strong>. 
    Berdasarkan data 30 hari, <strong style="color:#f59e0b">${mostVolatile.c}</strong> 
    merupakan mata uang paling volatil dengan koefisien variasi <strong>${mostVolatile.v.toFixed(3)}%</strong>.`;
}

// ── UPDATE LAST UPDATED 
function updateTimestamp() {
  const now = new Date();
  document.getElementById('last-updated').textContent =
    `Update: ${now.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
}

// ── MAIN INIT 
async function init() {
  showLoading();
  try {
    await fetchAllData();
    hideLoading();
    renderKPICards();
    buildLineChart();
    initLineToggle();
    syncLineToggleButtons();
    initTimeframeToggle();
    updateBarChart();
    buildScatterChart();
    generateInsight();
    updateTimestamp();
  } catch (err) {
    hideLoading();
    console.error('Error fetching data:', err);
    // Fallback: tampilkan pesan error
    const container = document.querySelector('.container');
    const errBanner = document.createElement('div');
    errBanner.className = 'error-banner';
    errBanner.style.display = 'block';
    errBanner.textContent = `⚠ Gagal memuat data dari Frankfurter API. Periksa koneksi internet dan coba refresh halaman. (${err.message})`;
    container.prepend(errBanner);
  }
}

document.addEventListener('DOMContentLoaded', init);
