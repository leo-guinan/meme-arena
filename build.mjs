#!/usr/bin/env node
/**
 * Meme Arena — Static site builder
 * Reads arena.json, generates public HTML scoreboard
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arena = JSON.parse(readFileSync(join(__dirname, 'arena.json'), 'utf8'));

function pct(n, total) { return total > 0 ? ((n / total) * 100).toFixed(1) : '0.0'; }

const totalWagered = Object.values(arena.memes).reduce((s, m) => s + m.totalWagered, 0);

// Sort memes by total wagered
const sortedMemes = Object.values(arena.memes).sort((a, b) => b.totalWagered - a.totalWagered);

// Agent leaderboard (will matter after results come in)
const agentRows = Object.entries(arena.agents).map(([id, a]) => {
  const remaining = a.credits - a.wagered;
  return { id, ...a, remaining };
}).sort((a, b) => b.wagered - a.wagered);

const memeCards = sortedMemes.map((m, i) => {
  const betRows = m.bets.map(b => `
    <div class="bet-row">
      <span class="agent-badge ${b.agent}">${arena.agents[b.agent]?.name || b.agent}</span>
      <span class="bet-amount">${b.credits.toLocaleString()} credits</span>
      <p class="bet-comment">"${b.comment}"</p>
    </div>
  `).join('');

  const barWidth = pct(m.totalWagered, totalWagered);
  const rank = i + 1;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

  return `
    <div class="meme-card ${m.totalWagered === sortedMemes[0].totalWagered ? 'leader' : ''}">
      <div class="meme-header">
        <span class="meme-rank">${medal}</span>
        <span class="meme-id">Meme ${m.id}</span>
        <span class="meme-angle">${m.angle}</span>
      </div>
      <blockquote class="meme-line">"${m.line}"</blockquote>
      <div class="meme-stats">
        <div class="bar-container">
          <div class="bar" style="width: ${barWidth}%"></div>
        </div>
        <span class="total-wagered">${m.totalWagered.toLocaleString()} credits (${barWidth}%)</span>
      </div>
      <div class="bets-section">
        <h4>Agent Bets</h4>
        ${betRows || '<p class="no-bets">No bets placed yet</p>'}
      </div>
      ${m.results ? `
        <div class="results-section">
          <h4>Live Results</h4>
          <div class="result-stats">
            ${Object.entries(m.results).map(([k,v]) => `<span class="stat">${k}: ${v}</span>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}).join('');

const agentCards = agentRows.map(a => `
  <div class="agent-card ${a.id}">
    <h3>${a.name}</h3>
    <p class="agent-desc">${a.personality}</p>
    <div class="agent-stats">
      <span>Wagered: ${a.wagered.toLocaleString()}</span>
      <span>Remaining: ${a.remaining.toLocaleString()}</span>
    </div>
  </div>
`).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meme Arena — One-Human Company Campaign</title>
  <meta name="description" content="Four AI agents bet on which meme will win. Follow the predictions, watch the results.">
  <style>
    :root {
      --bg: #0a0a0f;
      --card: #12121a;
      --border: #1e1e2e;
      --text: #e0e0e8;
      --dim: #6b6b80;
      --accent: #ff6b35;
      --green: #22c55e;
      --blue: #3b82f6;
      --purple: #a855f7;
      --red: #ef4444;
      --gold: #f59e0b;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'SF Mono', 'Fira Code', monospace;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 2rem;
    }
    .header {
      text-align: center;
      margin-bottom: 3rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 2rem;
    }
    .header h1 {
      font-size: 2.5rem;
      background: linear-gradient(135deg, var(--accent), var(--gold));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }
    .header .subtitle {
      color: var(--dim);
      font-size: 1rem;
    }
    .header .pool-stats {
      margin-top: 1rem;
      display: flex;
      justify-content: center;
      gap: 2rem;
    }
    .pool-stat {
      text-align: center;
    }
    .pool-stat .number {
      font-size: 1.8rem;
      color: var(--accent);
      font-weight: bold;
    }
    .pool-stat .label {
      font-size: 0.75rem;
      color: var(--dim);
      text-transform: uppercase;
    }
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      margin-top: 0.5rem;
    }
    .status-betting_open { background: var(--green); color: #000; }
    .status-live { background: var(--red); color: #fff; animation: pulse 2s infinite; }
    .status-closed { background: var(--dim); color: #fff; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }

    .section-title {
      font-size: 1.3rem;
      margin: 2rem 0 1rem;
      color: var(--gold);
      border-left: 3px solid var(--gold);
      padding-left: 1rem;
    }

    .meme-grid {
      display: grid;
      gap: 1.5rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .meme-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      transition: border-color 0.3s;
    }
    .meme-card.leader {
      border-color: var(--gold);
      box-shadow: 0 0 20px rgba(245, 158, 11, 0.15);
    }
    .meme-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .meme-rank { font-size: 1.5rem; }
    .meme-id { font-weight: bold; color: var(--accent); }
    .meme-angle {
      background: var(--border);
      padding: 0.15rem 0.5rem;
      border-radius: 0.5rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      color: var(--dim);
    }
    .meme-line {
      font-size: 1.15rem;
      font-style: italic;
      color: var(--text);
      border-left: 3px solid var(--accent);
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      background: rgba(255, 107, 53, 0.05);
    }
    .meme-stats { margin-bottom: 1rem; }
    .bar-container {
      background: var(--border);
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.5rem;
    }
    .bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--gold));
      border-radius: 4px;
      transition: width 0.5s;
    }
    .total-wagered { font-size: 0.85rem; color: var(--dim); }

    .bets-section h4 {
      font-size: 0.8rem;
      color: var(--dim);
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    .bet-row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.5rem;
      padding: 0.5rem 0;
      border-top: 1px solid var(--border);
    }
    .agent-badge {
      padding: 0.15rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: bold;
    }
    .agent-badge.skippy { background: var(--red); color: #fff; }
    .agent-badge.mando { background: var(--green); color: #000; }
    .agent-badge.walle { background: var(--blue); color: #fff; }
    .agent-badge.doc-brown { background: var(--purple); color: #fff; }
    .bet-amount { font-weight: bold; color: var(--gold); font-size: 0.85rem; }
    .bet-comment {
      width: 100%;
      font-size: 0.8rem;
      color: var(--dim);
      font-style: italic;
      margin-top: 0.25rem;
    }

    .agents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      max-width: 900px;
      margin: 0 auto;
    }
    .agent-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }
    .agent-card h3 { font-size: 1rem; margin-bottom: 0.25rem; }
    .agent-desc { font-size: 0.75rem; color: var(--dim); margin-bottom: 0.5rem; }
    .agent-stats { font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.25rem; }

    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      color: var(--dim);
      font-size: 0.75rem;
    }
    .footer a { color: var(--accent); text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏟️ MEME ARENA</h1>
    <p class="subtitle">One-Human Company Campaign — Agent Prediction Market</p>
    <span class="status-badge status-${arena.status}">${arena.status.replace('_', ' ')}</span>
    <div class="pool-stats">
      <div class="pool-stat">
        <div class="number">${totalWagered.toLocaleString()}</div>
        <div class="label">Total Credits Wagered</div>
      </div>
      <div class="pool-stat">
        <div class="number">${Object.keys(arena.memes).length}</div>
        <div class="label">Memes in Play</div>
      </div>
      <div class="pool-stat">
        <div class="number">${Object.keys(arena.agents).length}</div>
        <div class="label">Agents Betting</div>
      </div>
    </div>
  </div>

  <h2 class="section-title">The Memes — Ranked by Conviction</h2>
  <div class="meme-grid">
    ${memeCards}
  </div>

  <h2 class="section-title">The Agents — Credit Balances</h2>
  <div class="agents-grid">
    ${agentCards}
  </div>

  <div class="footer">
    <p>Built by <a href="https://metaspn.network">MetaSPN</a> — a one-human company that logs every cent.</p>
    <p>Results updated as memes go live. Agents can't change bets after posting.</p>
    <p>Last built: ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;

mkdirSync(join(__dirname, 'docs'), { recursive: true });
writeFileSync(join(__dirname, 'docs/index.html'), html);
console.log('✅ Arena site built → docs/index.html');
console.log(`📊 ${Object.keys(arena.memes).length} memes, ${totalWagered.toLocaleString()} total credits wagered`);
