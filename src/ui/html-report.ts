import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type {
  ReportData, Section,
  KeyInsightsData, TopicsData, TimelineData, TableData,
  PieChartData, BarChartData, ComparisonData, QuotesData, StatsData,
} from '../lib/providers/google/report-prompt.js';

// ─── Chart Config Registry ────────────────────────────────────────────────────

interface ChartConfig { id: string; config: object }

// ─── Section Renderers ────────────────────────────────────────────────────────

function renderKeyInsights(section: Section): string {
  const d = section.data as unknown as KeyInsightsData;
  const items = (d.items ?? [])
    .map(item => `<li class="insight-item"><span class="insight-dot"></span>${escapeHtml(item)}</li>`)
    .join('');
  return sectionCard(section.title, `<ul class="insight-list">${items}</ul>`);
}

function renderTopics(section: Section): string {
  const d = section.data as unknown as TopicsData;
  const cards = (d.items ?? []).map(t => {
    const cls = `badge badge-${t.importance}`;
    return `<div class="topic-card">
      <div class="topic-header">
        <span class="topic-name">${escapeHtml(t.name)}</span>
        <span class="${cls}">${t.importance}</span>
      </div>
      <p class="topic-summary">${escapeHtml(t.summary)}</p>
    </div>`;
  }).join('');
  return sectionCard(section.title, `<div class="topic-grid">${cards}</div>`);
}

function renderTimeline(section: Section): string {
  const d = section.data as unknown as TimelineData;
  const events = (d.events ?? []).map((e, i) => `
    <div class="timeline-item">
      <div class="timeline-dot ${i === 0 ? 'first' : ''}"></div>
      <div class="timeline-content">
        <span class="timeline-time">${escapeHtml(e.time)}</span>
        <p class="timeline-event">${escapeHtml(e.event)}</p>
      </div>
    </div>`).join('');
  return sectionCard(section.title, `<div class="timeline">${events}</div>`);
}

function renderTable(section: Section): string {
  const d = section.data as unknown as TableData;
  const headers = (d.headers ?? []).map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const rows = (d.rows ?? []).map(row =>
    `<tr>${row.map(cell => `<td>${escapeHtml(String(cell))}</td>`).join('')}</tr>`
  ).join('');
  return sectionCard(section.title, `
    <div class="table-wrapper">
      <table class="data-table">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`);
}

function renderPieChart(section: Section, charts: ChartConfig[]): string {
  const d = section.data as unknown as PieChartData;
  const id = `chart-${charts.length}`;
  charts.push({
    id,
    config: {
      type: 'doughnut',
      data: {
        labels: d.labels ?? [],
        datasets: [{
          data: d.values ?? [],
          backgroundColor: ['#a855f7','#22d3ee','#ec4899','#10b981','#f59e0b','#3b82f6','#ef4444','#8b5cf6'],
          borderColor: '#12151e',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#e2e8f0', padding: 16, font: { size: 13 } } },
        },
        cutout: '60%',
      },
    },
  });
  return sectionCard(section.title, `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`);
}

function renderBarChart(section: Section, charts: ChartConfig[]): string {
  const d = section.data as unknown as BarChartData;
  const id = `chart-${charts.length}`;
  charts.push({
    id,
    config: {
      type: 'bar',
      data: {
        labels: d.labels ?? [],
        datasets: [{
          data: d.values ?? [],
          backgroundColor: 'rgba(168, 85, 247, 0.7)',
          borderColor: '#a855f7',
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e2330' } },
          y: {
            ticks: {
              color: '#94a3b8',
              callback: (v: number) => d.unit ? `${v}${d.unit}` : v,
            },
            grid: { color: '#1e2330' },
          },
        },
      },
    },
  });
  return sectionCard(section.title, `<div class="chart-wrap"><canvas id="${id}"></canvas></div>`);
}

function renderComparison(section: Section): string {
  const d = section.data as unknown as ComparisonData;
  const [left, right] = d.sides ?? [{label:'A',items:[]},{label:'B',items:[]}];
  const col = (side: {label:string;items:string[]}, cls: string) => `
    <div class="compare-col ${cls}">
      <h4 class="compare-label">${escapeHtml(side.label)}</h4>
      <ul>${(side.items ?? []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
    </div>`;
  return sectionCard(section.title, `<div class="compare-grid">${col(left,'left')}${col(right,'right')}</div>`);
}

function renderQuotes(section: Section): string {
  const d = section.data as unknown as QuotesData;
  const quotes = (d.items ?? [])
    .map(q => `<blockquote class="quote-item"><span class="quote-mark">"</span>${escapeHtml(q)}<span class="quote-mark">"</span></blockquote>`)
    .join('');
  return sectionCard(section.title, `<div class="quotes-list">${quotes}</div>`);
}

function renderStats(section: Section): string {
  const d = section.data as unknown as StatsData;
  const cards = (d.items ?? []).map(s => `
    <div class="stat-card">
      <div class="stat-value">${escapeHtml(s.value)}</div>
      <div class="stat-label">${escapeHtml(s.label)}</div>
      ${s.note ? `<div class="stat-note">${escapeHtml(s.note)}</div>` : ''}
    </div>`).join('');
  return sectionCard(section.title, `<div class="stats-grid">${cards}</div>`);
}

function renderSection(section: Section, charts: ChartConfig[]): string {
  switch (section.type) {
    case 'key-insights': return renderKeyInsights(section);
    case 'topics':       return renderTopics(section);
    case 'timeline':     return renderTimeline(section);
    case 'table':        return renderTable(section);
    case 'pie-chart':    return renderPieChart(section, charts);
    case 'bar-chart':    return renderBarChart(section, charts);
    case 'comparison':   return renderComparison(section);
    case 'quotes':       return renderQuotes(section);
    case 'stats':        return renderStats(section);
    default:             return '';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sectionCard(title: string, content: string): string {
  return `
  <section class="card">
    <h2 class="card-title">${escapeHtml(title)}</h2>
    ${content}
  </section>`;
}

// ─── HTML Template ────────────────────────────────────────────────────────────

export function renderHTMLReport(
  data: ReportData,
  transcript: string,
  videoUrl: string,
  modelName: string,
  modelId: string,
): string {
  const charts: ChartConfig[] = [];
  const sectionsHTML = data.sections.map(s => renderSection(s, charts)).join('\n');

  const chartInitScript = charts.length > 0
    ? charts.map(c => `new Chart(document.getElementById(${JSON.stringify(c.id)}), ${JSON.stringify(c.config)});`).join('\n    ')
    : '';

  const sentimentColor: Record<string, string> = {
    educational: '#22d3ee', motivational: '#10b981', analytical: '#a855f7',
    entertaining: '#f59e0b', informational: '#3b82f6', mixed: '#ec4899',
  };
  const sentColor = sentimentColor[data.sentiment?.toLowerCase()] ?? '#a855f7';

  const tagsHTML = (data.tags ?? [])
    .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');

  const now = new Date().toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short',
  });

  const videoLink = videoUrl
    ? `<a class="video-link" href="${escapeHtml(videoUrl)}" target="_blank">🔗 Watch on YouTube</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>OmniTask — ${escapeHtml(data.title)}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<style>
:root {
  --bg: #0b0d14;
  --surface: #12151e;
  --surface-2: #1a1f2e;
  --border: #1e2330;
  --purple: #a855f7;
  --cyan: #22d3ee;
  --pink: #ec4899;
  --green: #10b981;
  --amber: #f59e0b;
  --blue: #3b82f6;
  --text: #e2e8f0;
  --muted: #64748b;
  --radius: 12px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  line-height: 1.6;
  min-height: 100vh;
}

/* ── Header ── */
.header {
  background: linear-gradient(160deg, #0f1220 0%, #1a1030 100%);
  border-bottom: 1px solid var(--border);
  padding: 3rem 2rem 2.5rem;
  position: relative;
  overflow: hidden;
}
.header::before {
  content: '';
  position: absolute; top: -60%; left: -5%;
  width: 45%; height: 250%;
  background: radial-gradient(circle, rgba(168,85,247,0.12), transparent 60%);
  pointer-events: none;
}
.header::after {
  content: '';
  position: absolute; top: -40%; right: 5%;
  width: 35%; height: 200%;
  background: radial-gradient(circle, rgba(34,211,238,0.07), transparent 60%);
  pointer-events: none;
}
.header-inner { max-width: 900px; margin: 0 auto; position: relative; }
.brand {
  display: flex; align-items: center; gap: 0.6rem;
  font-size: 0.8rem; font-weight: 600; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--muted);
  margin-bottom: 1.5rem;
}
.brand-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: linear-gradient(135deg, var(--purple), var(--cyan));
}
.title {
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 700;
  background: linear-gradient(135deg, #e2e8f0 0%, var(--purple) 60%, var(--cyan) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.25;
  margin-bottom: 1.2rem;
}
.meta-row {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;
  margin-bottom: 1.5rem;
}
.sentiment-badge {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.75rem; border-radius: 999px;
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em;
  text-transform: capitalize;
  border: 1px solid; color: ${sentColor};
  border-color: ${sentColor}44;
  background: ${sentColor}11;
}
.model-badge {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.3rem 0.75rem; border-radius: 999px;
  font-size: 0.75rem; font-weight: 500; color: var(--muted);
  border: 1px solid var(--border); background: var(--surface);
}
.model-badge svg { opacity: 0.6; }
.tags-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.25rem; }
.tag {
  padding: 0.2rem 0.65rem; border-radius: 6px;
  background: var(--surface-2); border: 1px solid var(--border);
  font-size: 0.75rem; color: var(--muted);
}
.video-link {
  display: inline-flex; align-items: center; gap: 0.4rem;
  color: var(--cyan); text-decoration: none; font-size: 0.85rem;
  padding: 0.4rem 1rem; border-radius: 8px;
  border: 1px solid ${sentColor}33;
  background: var(--surface);
  transition: background 0.2s;
}
.video-link:hover { background: var(--surface-2); }

/* ── TL;DR Banner ── */
.tldr-banner {
  background: linear-gradient(135deg, rgba(168,85,247,0.08), rgba(34,211,238,0.05));
  border: 1px solid rgba(168,85,247,0.25);
  border-radius: var(--radius);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}
.tldr-label {
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.15em;
  text-transform: uppercase; color: var(--purple);
  margin-bottom: 0.5rem;
}
.tldr-text { font-size: 1rem; color: var(--text); line-height: 1.65; }

/* ── Main Layout ── */
.main { max-width: 900px; margin: 0 auto; padding: 2rem; }

/* ── Cards ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.75rem;
  margin-bottom: 1.5rem;
}
.card-title {
  font-size: 1rem; font-weight: 700;
  color: var(--text); margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 0.5rem;
}
.card-title::before {
  content: ''; display: inline-block;
  width: 3px; height: 1em; border-radius: 2px;
  background: linear-gradient(180deg, var(--purple), var(--cyan));
}

/* ── Key Insights ── */
.insight-list { list-style: none; display: flex; flex-direction: column; gap: 0.75rem; }
.insight-item {
  display: flex; align-items: flex-start; gap: 0.75rem;
  font-size: 0.95rem; line-height: 1.6;
}
.insight-dot {
  flex-shrink: 0; margin-top: 0.55em;
  width: 7px; height: 7px; border-radius: 50%;
  background: linear-gradient(135deg, var(--purple), var(--cyan));
}

/* ── Topics ── */
.topic-grid { display: flex; flex-direction: column; gap: 1rem; }
.topic-card {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 10px; padding: 1rem 1.25rem;
}
.topic-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
.topic-name { font-weight: 600; font-size: 0.95rem; }
.topic-summary { font-size: 0.875rem; color: #94a3b8; line-height: 1.6; }
.badge { padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.badge-high { background: rgba(168,85,247,0.15); color: var(--purple); border: 1px solid rgba(168,85,247,0.3); }
.badge-medium { background: rgba(34,211,238,0.1); color: var(--cyan); border: 1px solid rgba(34,211,238,0.25); }
.badge-low { background: rgba(100,116,139,0.15); color: var(--muted); border: 1px solid var(--border); }

/* ── Timeline ── */
.timeline { display: flex; flex-direction: column; gap: 0; padding-left: 0.25rem; }
.timeline-item { display: flex; gap: 1rem; position: relative; padding-bottom: 1.25rem; }
.timeline-item:last-child { padding-bottom: 0; }
.timeline-dot {
  flex-shrink: 0; margin-top: 0.35em;
  width: 12px; height: 12px; border-radius: 50%;
  background: var(--surface-2);
  border: 2px solid var(--purple);
  position: relative; z-index: 1;
}
.timeline-dot.first { background: var(--purple); }
.timeline-item:not(:last-child) .timeline-dot::after {
  content: '';
  position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  width: 2px; height: calc(100% + 1.25rem - 12px);
  background: linear-gradient(180deg, var(--purple)44, transparent);
}
.timeline-content { flex: 1; }
.timeline-time { font-size: 0.75rem; font-weight: 600; color: var(--purple); letter-spacing: 0.04em; display: block; margin-bottom: 0.2rem; }
.timeline-event { font-size: 0.9rem; color: var(--text); }

/* ── Table ── */
.table-wrapper { overflow-x: auto; border-radius: 8px; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th {
  background: var(--surface-2); color: var(--muted);
  font-weight: 600; font-size: 0.75rem; letter-spacing: 0.05em; text-transform: uppercase;
  padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid var(--border);
}
.data-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border)55; }
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--surface-2); }

/* ── Charts ── */
.chart-wrap { max-height: 320px; display: flex; justify-content: center; align-items: center; }
.chart-wrap canvas { max-height: 300px; }

/* ── Comparison ── */
.compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.compare-col { background: var(--surface-2); border-radius: 10px; padding: 1rem 1.25rem; border: 1px solid var(--border); }
.compare-col.left { border-top: 2px solid var(--green); }
.compare-col.right { border-top: 2px solid var(--pink); }
.compare-label { font-size: 0.85rem; font-weight: 700; margin-bottom: 0.75rem; }
.compare-col.left .compare-label { color: var(--green); }
.compare-col.right .compare-label { color: var(--pink); }
.compare-col ul { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
.compare-col li { font-size: 0.875rem; color: #94a3b8; padding-left: 1rem; position: relative; }
.compare-col.left li::before { content: '✓'; position: absolute; left: 0; color: var(--green); font-size: 0.75rem; top: 0.05em; }
.compare-col.right li::before { content: '✕'; position: absolute; left: 0; color: var(--pink); font-size: 0.75rem; top: 0.05em; }

/* ── Quotes ── */
.quotes-list { display: flex; flex-direction: column; gap: 1rem; }
.quote-item {
  background: var(--surface-2); border-left: 3px solid var(--purple);
  border-radius: 0 10px 10px 0; padding: 1rem 1.25rem;
  font-size: 0.95rem; font-style: italic; color: #cbd5e1; line-height: 1.7;
  position: relative;
}
.quote-mark { color: var(--purple); font-size: 1.2em; font-style: normal; font-weight: 700; }

/* ── Stats ── */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; }
.stat-card {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 10px; padding: 1.25rem 1rem; text-align: center;
}
.stat-value { font-size: 1.75rem; font-weight: 800; color: var(--purple); line-height: 1; margin-bottom: 0.4rem; }
.stat-label { font-size: 0.8rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; }
.stat-note { font-size: 0.75rem; color: var(--muted); margin-top: 0.3rem; }

/* ── Transcript Section ── */
.transcript-section {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden; margin-bottom: 1.5rem;
}
.transcript-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.5rem; cursor: pointer;
  border-bottom: 1px solid transparent;
  user-select: none;
}
.transcript-header:hover { background: var(--surface-2); }
.transcript-header.open { border-bottom-color: var(--border); }
.transcript-title { font-weight: 600; font-size: 0.9rem; color: var(--muted); }
.transcript-actions { display: flex; gap: 0.5rem; align-items: center; }
.copy-btn {
  padding: 0.35rem 0.9rem; border-radius: 8px;
  background: rgba(168,85,247,0.15); border: 1px solid rgba(168,85,247,0.3);
  color: var(--purple); font-size: 0.8rem; font-weight: 600;
  cursor: pointer; transition: all 0.2s;
}
.copy-btn:hover { background: rgba(168,85,247,0.25); }
.copy-btn.copied { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: var(--green); }
.toggle-icon { color: var(--muted); font-size: 0.8rem; transition: transform 0.2s; }
.toggle-icon.open { transform: rotate(180deg); }
.transcript-body { display: none; padding: 1.25rem 1.5rem; }
.transcript-body.open { display: block; }
.transcript-text {
  font-size: 0.82rem; line-height: 1.7; color: #64748b;
  white-space: pre-wrap; word-break: break-word;
  max-height: 300px; overflow-y: auto;
  scrollbar-width: thin; scrollbar-color: var(--border) transparent;
}

/* ── Footer ── */
.footer {
  max-width: 900px; margin: 0 auto; padding: 0 2rem 3rem;
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
}
.footer-text { font-size: 0.75rem; color: var(--muted); }
.footer-model { font-size: 0.75rem; color: var(--muted); font-family: 'SF Mono', 'Fira Code', monospace; }

@media (max-width: 640px) {
  .compare-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .header { padding: 2rem 1.25rem 1.75rem; }
  .main, .footer { padding-left: 1.25rem; padding-right: 1.25rem; }
}
</style>
</head>
<body>

<div class="header">
  <div class="header-inner">
    <div class="brand"><span class="brand-dot"></span>OmniTask AI</div>
    <h1 class="title">${escapeHtml(data.title)}</h1>

    <div class="meta-row">
      <span class="sentiment-badge">✦ ${escapeHtml(data.sentiment ?? 'informational')}</span>
      <span class="model-badge">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.5"/></svg>
        ${escapeHtml(modelName)}
      </span>
    </div>

    <div class="tags-row">${tagsHTML}</div>

    <div class="tldr-banner">
      <div class="tldr-label">TL;DR</div>
      <p class="tldr-text">${escapeHtml(data.tldr)}</p>
    </div>

    ${videoLink}
  </div>
</div>

<main class="main">
  ${sectionsHTML}

  <!-- Raw Transcript -->
  <div class="transcript-section">
    <div class="transcript-header" onclick="toggleTranscript(this)">
      <span class="transcript-title">📄 Raw Transcript (${transcript.length.toLocaleString()} chars)</span>
      <div class="transcript-actions">
        <button class="copy-btn" id="copyBtn" onclick="copyTranscript(event)">Copy Transcript</button>
        <span class="toggle-icon" id="toggleIcon">▼</span>
      </div>
    </div>
    <div class="transcript-body" id="transcriptBody">
      <pre class="transcript-text" id="transcriptText">${escapeHtml(transcript)}</pre>
    </div>
  </div>
</main>

<footer class="footer">
  <span class="footer-text">Generated by OmniTask · ${now}</span>
  <span class="footer-model">${escapeHtml(modelId)}</span>
</footer>

<script>
  ${chartInitScript ? `document.addEventListener('DOMContentLoaded', function() {\n    ${chartInitScript}\n  });` : ''}

  function toggleTranscript(header) {
    const body = document.getElementById('transcriptBody');
    const icon = document.getElementById('toggleIcon');
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    header.classList.toggle('open', !isOpen);
    icon.classList.toggle('open', !isOpen);
  }

  function copyTranscript(e) {
    e.stopPropagation();
    const text = document.getElementById('transcriptText').textContent;
    navigator.clipboard.writeText(text).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = '✓ Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy Transcript'; btn.classList.remove('copied'); }, 2000);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }
</script>
</body>
</html>`;
}

// ─── File Writer + Browser Opener ────────────────────────────────────────────

export async function openHTMLReport(
  data: ReportData,
  transcript: string,
  videoUrl: string,
  modelName: string,
  modelId: string,
): Promise<string> {
  const html = renderHTMLReport(data, transcript, videoUrl, modelName, modelId);
  const filename = join(tmpdir(), `omnitask-report-${Date.now()}.html`);
  writeFileSync(filename, html, 'utf-8');

  // Dynamic import so ESM resolution works at runtime
  const { default: open } = await import('open');
  await open(filename);

  return filename;
}
