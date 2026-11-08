import { Game } from './game.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');
const ui = new UI();
const game = new Game(canvas, ui);
window.__game = game;

window.render_game_to_text = () => JSON.stringify(game.snapshot());
window.advanceTime = (ms) => game.advanceTime(ms);

// test helpers for Playwright
window.__forceLaunch = (vx, vy) => game.forceLaunch(vx, vy);
window.__forceFinish = () => game.forceFinish();
window.__reset = () => game.reset();

console.log('[氧气的一生] ready');
