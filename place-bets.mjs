#!/usr/bin/env node
/**
 * Place agent bets into arena.json
 * Usage: node place-bets.mjs --agent skippy --bets '{"A":{"credits":200000,"comment":"..."},...}'
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARENA_FILE = join(__dirname, 'arena.json');

const args = process.argv.slice(2);
const agentIdx = args.indexOf('--agent');
const betsIdx = args.indexOf('--bets');

if (agentIdx === -1 || betsIdx === -1) {
  console.log('Usage: node place-bets.mjs --agent <name> --bets \'{"A":{"credits":N,"comment":"..."}}\'');
  process.exit(1);
}

const agentId = args[agentIdx + 1];
const betsRaw = args[betsIdx + 1];

const arena = JSON.parse(readFileSync(ARENA_FILE, 'utf8'));
let bets;
try {
  bets = JSON.parse(betsRaw);
} catch (e) {
  console.error('Invalid JSON for bets:', e.message);
  process.exit(1);
}

if (!arena.agents[agentId]) {
  console.error(`Unknown agent: ${agentId}`);
  process.exit(1);
}

let totalBet = 0;
for (const [memeId, bet] of Object.entries(bets)) {
  if (!arena.memes[memeId]) {
    console.error(`Unknown meme: ${memeId}`);
    continue;
  }
  totalBet += bet.credits;
}

if (totalBet > arena.agents[agentId].credits) {
  console.error(`${agentId} only has ${arena.agents[agentId].credits} credits but tried to bet ${totalBet}`);
  process.exit(1);
}

// Place bets
for (const [memeId, bet] of Object.entries(bets)) {
  if (!arena.memes[memeId] || bet.credits === 0) continue;
  
  // Remove any existing bet from this agent on this meme
  arena.memes[memeId].bets = arena.memes[memeId].bets.filter(b => b.agent !== agentId);
  
  arena.memes[memeId].bets.push({
    agent: agentId,
    credits: bet.credits,
    comment: bet.comment,
    timestamp: new Date().toISOString()
  });
  
  arena.memes[memeId].totalWagered = arena.memes[memeId].bets.reduce((s, b) => s + b.credits, 0);
}

arena.agents[agentId].wagered = totalBet;
arena.agents[agentId].credits = 1000000; // Keep original, wagered tracked separately

writeFileSync(ARENA_FILE, JSON.stringify(arena, null, 2));
console.log(`✅ ${agentId} placed bets: ${totalBet.toLocaleString()} credits across ${Object.keys(bets).filter(k => bets[k].credits > 0).length} memes`);
