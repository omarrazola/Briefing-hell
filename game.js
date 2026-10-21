/**
 * BRIEFING HELL: La Venganza del UX
 * Arcade game engine in pure Canvas & Web Audio API
 */

// --- AUDIO SYNTHESIZER ENGINE (Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.step = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted && this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    } else if (!this.muted && !this.musicTimer) {
      this.startMusic();
    }
    return this.muted;
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15, pitchDrop = 0) {
    if (this.muted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (pitchDrop !== 0) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + pitchDrop), now + duration);
      }

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // Audio context safety
    }
  }

  playNoise(duration = 0.1, gainVal = 0.1) {
    if (this.muted || !this.ctx) return;
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      noise.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch (e) {}
  }

  // SFX Presets
  sfxSwing() {
    this.playTone(280, 'triangle', 0.08, 0.1, -140);
  }

  sfxReflect() {
    this.playTone(600, 'square', 0.12, 0.15, 600);
    setTimeout(() => this.playTone(1200, 'sine', 0.15, 0.12), 30);
  }

  sfxWhip() {
    this.playNoise(0.06, 0.18);
    this.playTone(450, 'sawtooth', 0.14, 0.2, -350);
  }

  sfxHurt() {
    this.playTone(160, 'sawtooth', 0.22, 0.25, -90);
    this.playNoise(0.12, 0.15);
  }

  sfxBossHurt() {
    this.playTone(90, 'square', 0.18, 0.25, -40);
    this.playNoise(0.09, 0.2);
  }

  sfxPhase2() {
    [300, 450, 600, 900].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'square', 0.2, 0.2), i * 140);
    });
  }

  sfxGameOver() {
    [400, 320, 240, 150].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.35, 0.2, -40), i * 180);
    });
  }

  sfxVictory() {
    const notes = [440, 554, 659, 880, 1108];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.25, 0.2), i * 120);
    });
  }

  // Chiptune / Synthwave sequencer
  startMusic() {
    if (this.musicTimer || this.muted) return;
    this.init();
    const bassline = [110, 110, 130, 110, 146, 130, 98, 110];
    const lead = [440, 0, 523, 587, 0, 659, 587, 523];

    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const bFreq = bassline[this.step % bassline.length];
      const lFreq = lead[this.step % lead.length];

      this.playTone(bFreq, 'sawtooth', 0.12, 0.05, -15);
      if (lFreq > 0) {
        this.playTone(lFreq, 'triangle', 0.1, 0.04);
      }
      this.step++;
    }, 180);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

// --- GAME LOGIC & ENGINE ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const sound = new SoundEngine();

// UI Elements
const screenStart = document.getElementById('screen-start');
const screenGameOver = document.getElementById('screen-gameover');
const screenVictory = document.getElementById('screen-victory');
const btnStart = document.getElementById('btn-start');
const btnRetry = document.getElementById('btn-retry');
const btnRestart = document.getElementById('btn-restart');
const btnAudio = document.getElementById('btn-audio');
const gameoverStats = document.getElementById('gameover-stats');
const victoryStats = document.getElementById('victory-stats');

// Game State
const GAME_STATE = {
  START: 'START',
  PHASE1: 'PHASE1',
  CUTSCENE: 'CUTSCENE',
  PHASE2: 'PHASE2',
  GAMEOVER: 'GAMEOVER',
  VICTORY: 'VICTORY'
};

let currentState = GAME_STATE.START;
let lastTime = 0;
let shakeTime = 0;
let shakeIntensity = 0;

// Briefing text pool
const BRIEFING_TEXTS = [
  "Hazlo viral",
  "Sin presupuesto",
  "Cámbialo para ayer",
  "Ponlo más grande",
  "Logo más grande",
  "Falta punch",
  "No me convence",
  "Ponle IA",
  "Reunión 5pm viernes",
  "¿Por qué tanto blanco?"
];

// Boss projectile texts
const BOSS_PROJECTILE_TEXTS = [
  "PRESUPUESTO CONGELADO",
  "EMAIL CON 30 COPIADOS",
  "REUNIÓN SIN TABLA",
  "PIVOT DE ESTRATEGIA",
  "CAMBIO EN PROD"
];

// Input handling
const keys = {
  left: false,
  right: false,
  up: false,
  action: false
};

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'KeyA', 'a'].includes(e.code)) keys.left = true;
  if (['ArrowRight', 'KeyD', 'd'].includes(e.code)) keys.right = true;
  if (['ArrowUp', 'KeyW', 'w'].includes(e.code)) keys.up = true;
  if (['Space', 'KeyJ', 'k'].includes(e.code)) {
    if (!keys.action) triggerPlayerAttack();
    keys.action = true;
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (['ArrowLeft', 'KeyA', 'a'].includes(e.code)) keys.left = false;
  if (['ArrowRight', 'KeyD', 'd'].includes(e.code)) keys.right = false;
  if (['ArrowUp', 'KeyW', 'w'].includes(e.code)) keys.up = false;
  if (['Space', 'KeyJ', 'k'].includes(e.code)) keys.action = false;
});

canvas.addEventListener('mousedown', () => {
  triggerPlayerAttack();
});

// Particles & Floating text
const particles = [];
const floatingTexts = [];

class Particle {
  constructor(x, y, color, vx, vy, size = 4, life = 1, isText = false, text = '') {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.isText = isText;
    this.text = text;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += 0.15; // gravity
    this.life -= dt;
  }

  draw(c) {
    c.save();
    c.globalAlpha = Math.max(0, this.life / this.maxLife);
    if (this.isText) {
      c.fillStyle = this.color;
      c.font = 'bold 12px "Space Grotesk", sans-serif';
      c.fillText(this.text, this.x, this.y);
    } else {
      c.fillStyle = this.color;
      c.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    c.restore();
  }
}

function spawnSparks(x, y, color = '#00f3ff', count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push(new Particle(
      x, y, color,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 2,
      2 + Math.random() * 4,
      0.4 + Math.random() * 0.4
    ));
  }
}

function spawnPaperShreds(x, y, count = 10) {
  const colors = ['#ffffff', '#e2e8f0', '#00f3ff', '#ffb800'];
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() - 0.5) * Math.PI;
    const speed = 3 + Math.random() * 5;
    particles.push(new Particle(
      x, y,
      colors[Math.floor(Math.random() * colors.length)],
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 3,
      4 + Math.random() * 5,
      0.6 + Math.random() * 0.5
    ));
  }
}

function addFloatingText(x, y, text, color = '#ffb800') {
  floatingTexts.push({
    x, y, text, color,
    vy: -1.2,
    alpha: 1,
    life: 1.2
  });
}

function triggerScreenShake(intensity = 6, duration = 0.25) {
  shakeIntensity = intensity;
  shakeTime = duration;
}

// --- ENTITIES ---

// Player: UX Designer
const player = {
  x: 140,
  y: 380,
  width: 44,
  height: 68,
  vx: 0,
  vy: 0,
  speed: 5.5,
  jumpPower: -11.5,
  isGrounded: true,
  patience: 100,
  maxPatience: 100,
  invulnerableTime: 0,

  // Attack state
  attackCooldown: 0,
  isAttacking: false,
  attackProgress: 0, // 0 to 1
  weapon: 'BAT', // 'BAT' in phase 1, 'WHIP' in phase 2

  // Whip cable points
  whipWave: 0,

  reset() {
    this.x = 140;
    this.y = 380;
    this.vx = 0;
    this.vy = 0;
    this.patience = 100;
    this.invulnerableTime = 0;
    this.attackCooldown = 0;
    this.isAttacking = false;
    this.weapon = 'BAT';
  },

  update(dt) {
    if (this.invulnerableTime > 0) this.invulnerableTime -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (this.isAttacking) {
      this.attackProgress += dt * 6.5;
      if (this.attackProgress >= 1) {
        this.isAttacking = false;
        this.attackProgress = 0;
      }
    }

    // Horizontal Movement
    if (keys.left) {
      this.vx = -this.speed;
    } else if (keys.right) {
      this.vx = this.speed;
    } else {
      this.vx *= 0.7;
    }

    // Jump
    if (keys.up && this.isGrounded) {
      this.vy = this.jumpPower;
      this.isGrounded = false;
      sound.playTone(320, 'triangle', 0.1, 0.1, 100);
    }

    // Physics
    this.vy += 0.55; // gravity
    this.x += this.vx;
    this.y += this.vy;

    // Floor boundary
    const floorY = 380;
    if (this.y >= floorY) {
      this.y = floorY;
      this.vy = 0;
      this.isGrounded = true;
    }

    // Screen bounds
    if (this.x < 30) this.x = 30;
    if (this.x > 880) this.x = 880;
  },

  draw(c) {
    c.save();

    // Blinking if invulnerable
    if (this.invulnerableTime > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      c.globalAlpha = 0.4;
    }

    const px = this.x;
    const py = this.y;

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath();
    c.ellipse(px + 22, 448, 22, 6, 0, 0, Math.PI * 2);
    c.fill();

    // Legs / Pants
    c.fillStyle = '#1e293b';
    c.fillRect(px + 10, py + 42, 10, 26);
    c.fillRect(px + 24, py + 42, 10, 26);

    // Shoes
    c.fillStyle = '#cbd5e1';
    c.fillRect(px + 8, py + 64, 13, 6);
    c.fillRect(px + 24, py + 64, 13, 6);

    // Torso: Black Designer Hoodie with Figma logo accent
    c.fillStyle = '#0f172a';
    c.fillRect(px + 6, py + 18, 32, 28);
    c.fillStyle = '#00f3ff';
    c.fillRect(px + 18, py + 26, 8, 8); // badge/lanyard

    // Neck / Head
    c.fillStyle = '#fcd34d'; // skin
    c.fillRect(px + 16, py + 14, 12, 6); // neck
    c.fillRect(px + 10, py - 4, 24, 20); // head

    // Hair: Messy creative bun / curls
    c.fillStyle = '#451a03';
    c.fillRect(px + 8, py - 10, 28, 9);
    c.fillRect(px + 6, py - 6, 6, 12);
    c.fillRect(px + 20, py - 14, 12, 6);

    // Face: Tired eyes with dark bags
    c.fillStyle = '#94a3b8'; // dark bags under eyes
    c.fillRect(px + 20, py + 5, 12, 4);

    // Big round designer glasses
    c.strokeStyle = '#00f3ff';
    c.lineWidth = 2;
    c.strokeRect(px + 19, py + 2, 7, 7);
    c.strokeRect(px + 26, py + 2, 7, 7);

    // Eyes (determined look)
    c.fillStyle = '#0f172a';
    c.fillRect(px + 22, py + 4, 2, 3);
    c.fillRect(px + 29, py + 4, 2, 3);

    // Determined mouth
    c.fillStyle = '#b91c1c';
    c.fillRect(px + 23, py + 12, 7, 2);

    // --- WEAPON & ATTACK ANIMATION ---
    if (this.weapon === 'BAT') {
      // Phase 1: Giant Apple Pencil / Stylus Bat
      const angle = this.isAttacking 
        ? -Math.PI / 4 + Math.sin(this.attackProgress * Math.PI) * 1.6
        : -0.3;

      c.save();
      c.translate(px + 28, py + 28);
      c.rotate(angle);

      // Stylus Body
      c.fillStyle = '#f8fafc';
      c.fillRect(0, -6, 44, 8);
      // Nib
      c.fillStyle = '#00f3ff';
      c.beginPath();
      c.moveTo(44, -6);
      c.lineTo(54, -2);
      c.lineTo(44, 2);
      c.fill();
      // Neon trail when swinging
      if (this.isAttacking) {
        c.strokeStyle = 'rgba(0, 243, 255, 0.6)';
        c.lineWidth = 6;
        c.strokeRect(-4, -8, 54, 12);
      }
      c.restore();
    } else {
      // Phase 2: USB-C High-Power Cable Whip!
      const startX = px + 30;
      const startY = py + 30;

      if (this.isAttacking) {
        const reach = 220;
        const progress = this.attackProgress;
        const swingArc = Math.sin(progress * Math.PI);

        c.save();
        c.beginPath();
        c.moveTo(startX, startY);

        // Sinusoidal whip wave curve
        const cp1x = startX + reach * 0.4;
        const cp1y = startY - 50 * swingArc + Math.sin(progress * 12) * 20;
        const cp2x = startX + reach * 0.75;
        const cp2y = startY + 40 * swingArc;
        const endX = startX + reach * Math.min(1, progress * 1.4);
        const endY = startY - 10 + Math.sin(progress * 14) * 30;

        c.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        c.strokeStyle = '#ff0077';
        c.lineWidth = 4;
        c.shadowColor = '#00f3ff';
        c.shadowBlur = 10;
        c.stroke();

        // High-voltage USB-C golden connector head
        c.fillStyle = '#ffb800';
        c.fillRect(endX - 6, endY - 5, 12, 10);
        c.fillStyle = '#00f3ff';
        c.fillRect(endX + 6, endY - 3, 5, 6); // USB-C male tip

        // Electric sparks at tip
        if (Math.random() < 0.6) {
          spawnSparks(endX, endY, '#00f3ff', 3);
        }
        c.restore();
      } else {
        // Coiled cable held in hand
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(startX + 6, startY + 6, 12, 0, Math.PI * 1.5);
        c.stroke();
      }
    }

    c.restore();
  },

  takeDamage(amount) {
    if (this.invulnerableTime > 0) return;
    this.patience = Math.max(0, this.patience - amount);
    this.invulnerableTime = 0.9;
    triggerScreenShake(7, 0.25);
    sound.sfxHurt();
    addFloatingText(this.x + 10, this.y - 15, `-${amount} PACIENCIA`, '#ff0077');

    if (this.patience <= 0) {
      triggerGameOver();
    }
  }
};

// Enemy Phase 1: Client / Product Owner
const clientEnemy = {
  x: 740,
  y: 360,
  width: 50,
  height: 85,
  hp: 100,
  maxHp: 100,
  frustrationLevel: 1, // 1 to 4
  shootTimer: 1.5,
  hurtTimer: 0,
  floatAnim: 0,

  reset() {
    this.x = 740;
    this.y = 360;
    this.hp = 100;
    this.frustrationLevel = 1;
    this.shootTimer = 1.2;
    this.hurtTimer = 0;
  },

  update(dt) {
    this.floatAnim += dt * 3;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    // Shooting rate increases with frustration
    const interval = Math.max(0.9, 2.2 - this.frustrationLevel * 0.35);
    this.shootTimer -= dt;
    if (this.shootTimer <= 0) {
      this.shootBriefing();
      this.shootTimer = interval;
    }
  },

  shootBriefing() {
    const text = BRIEFING_TEXTS[Math.floor(Math.random() * BRIEFING_TEXTS.length)];
    const speed = 4.2 + this.frustrationLevel * 0.6;
    briefings.push(new Briefing(this.x - 10, this.y + 20, -speed, text));
    sound.playTone(350, 'sawtooth', 0.08, 0.1, -120);
  },

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimer = 0.3;
    sound.sfxBossHurt();
    triggerScreenShake(4, 0.15);
    spawnPaperShreds(this.x + 20, this.y + 30, 8);

    // Increase frustration
    if (this.hp < 75 && this.frustrationLevel < 2) {
      this.frustrationLevel = 2;
      addFloatingText(this.x, this.y - 25, "¡FRUSTRACIÓN ++!", '#ffb800');
    } else if (this.hp < 40 && this.frustrationLevel < 3) {
      this.frustrationLevel = 3;
      addFloatingText(this.x, this.y - 25, "¡BURNOUT CLIENTE!", '#ff0077');
    }

    addFloatingText(this.x, this.y - 10, `-${amount}% CAMBIOS`, '#00ff88');

    if (this.hp <= 0) {
      startPhase2Transition();
    }
  },

  draw(c) {
    const cx = this.x;
    const cy = this.y + Math.sin(this.floatAnim) * 3;

    // Rage steam particles
    if (this.frustrationLevel >= 2 && Math.random() < 0.25) {
      particles.push(new Particle(cx + 20, cy - 10, '#f87171', (Math.random() - 0.5) * 2, -1.8, 3, 0.4));
    }

    c.save();
    if (this.hurtTimer > 0) {
      c.filter = 'brightness(2) contrast(1.5)';
    }

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.4)';
    c.beginPath();
    c.ellipse(cx + 25, 448, 25, 6, 0, 0, Math.PI * 2);
    c.fill();

    // Body: Corporate Suit (color turns redder with frustration)
    const suitColor = this.frustrationLevel === 1 ? '#334155' :
                      this.frustrationLevel === 2 ? '#475569' : '#7f1d1d';
    c.fillStyle = suitColor;
    c.fillRect(cx + 8, cy + 24, 34, 42);

    // White shirt collar + Red Tie
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(cx + 20, cy + 24);
    c.lineTo(cx + 25, cy + 34);
    c.lineTo(cx + 30, cy + 24);
    c.fill();

    c.fillStyle = '#ef4444'; // Red tie
    c.beginPath();
    c.moveTo(cx + 24, cy + 32);
    c.lineTo(cx + 26, cy + 32);
    c.lineTo(cx + 28, cy + 52);
    c.lineTo(cx + 25, cy + 56);
    c.lineTo(cx + 22, cy + 52);
    c.fill();

    // Head
    const skinTone = this.frustrationLevel >= 3 ? '#fca5a5' : '#fde047';
    c.fillStyle = skinTone;
    c.fillRect(cx + 12, cy - 2, 26, 26);

    // Slick corporate hair
    c.fillStyle = '#1e1b4b';
    c.fillRect(cx + 10, cy - 8, 30, 8);
    c.fillRect(cx + 32, cy - 4, 8, 14);

    // Eyes: widening stress
    c.fillStyle = '#ffffff';
    c.fillRect(cx + 16, cy + 4, 7, 6);
    c.fillRect(cx + 26, cy + 4, 7, 6);
    c.fillStyle = '#0f172a';
    c.fillRect(cx + 18, cy + 5, 3, 4);
    c.fillRect(cx + 28, cy + 5, 3, 4);

    // Mouth: Grimace/Stress teeth
    c.fillStyle = '#ffffff';
    c.fillRect(cx + 18, cy + 15, 14, 4);
    c.fillStyle = '#000000';
    c.strokeRect(cx + 18, cy + 15, 14, 4);

    // Holding iPhone to ear
    c.fillStyle = '#0f172a';
    c.fillRect(cx + 38, cy - 1, 6, 16);
    c.fillStyle = '#00f3ff';
    c.fillRect(cx + 39, cy + 2, 4, 10);

    // Speech bubble / status tag
    c.fillStyle = 'rgba(0, 0, 0, 0.7)';
    c.fillRect(cx - 20, cy - 30, 90, 18);
    c.strokeStyle = '#ffb800';
    c.strokeRect(cx - 20, cy - 30, 90, 18);
    c.fillStyle = '#ffb800';
    c.font = 'bold 9px "Press Start 2P", monospace';
    c.fillText(`PO LVL.${this.frustrationLevel}`, cx - 14, cy - 18);

    c.restore();
  }
};

// Projectile Phase 1: Briefing Paper Document
class Briefing {
  constructor(x, y, vx, text) {
    this.x = x;
    this.y = y;
    this.width = 62;
    this.height = 34;
    this.vx = vx;
    this.vy = (Math.random() - 0.5) * 0.8;
    this.text = text;
    this.isReflected = false;
    this.rotation = (Math.random() - 0.5) * 0.2;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.rotation += 0.02 * (this.isReflected ? -2 : 1);
  }

  draw(c) {
    c.save();
    c.translate(this.x + this.width / 2, this.y + this.height / 2);
    c.rotate(this.rotation);

    // Glow if reflected
    if (this.isReflected) {
      c.shadowColor = '#00ff88';
      c.shadowBlur = 12;
      c.fillStyle = '#052e16';
      c.strokeStyle = '#00ff88';
    } else {
      c.shadowColor = '#ff0077';
      c.shadowBlur = 6;
      c.fillStyle = '#1e1b4b';
      c.strokeStyle = '#f43f5e';
    }

    c.lineWidth = 2;
    c.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    c.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

    // Document header bar
    c.fillStyle = this.isReflected ? '#00ff88' : '#f43f5e';
    c.fillRect(-this.width / 2, -this.height / 2, this.width, 6);

    // Text on paper
    c.fillStyle = '#ffffff';
    c.font = 'bold 8px "Space Grotesk", sans-serif';
    c.textAlign = 'center';
    c.fillText(this.isReflected ? '¡REBOTADO!' : this.text, 0, 4);

    c.restore();
  }
}

// Boss Phase 2: El Director de Proyecto / Stakeholder Absoluto
const boss = {
  x: 680,
  y: 200,
  width: 170,
  height: 240,
  hp: 200,
  maxHp: 200,
  attackTimer: 2.2,
  attackPattern: 0,
  hurtTimer: 0,
  floatY: 0,
  coffeeLevel: 100,

  reset() {
    this.x = 680;
    this.y = 200;
    this.hp = 200;
    this.attackTimer = 1.8;
    this.hurtTimer = 0;
  },

  update(dt) {
    this.floatY += dt * 2.2;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    this.attackTimer -= dt;
    if (this.attackTimer <= 0) {
      this.executeBossAttack();
      this.attackTimer = 2.0 + Math.random() * 0.8;
    }
  },

  executeBossAttack() {
    const type = Math.floor(Math.random() * 3);
    if (type === 0) {
      // Presupuesto Congelado: Ice Block projectile
      bossProjectiles.push(new BossProjectile(
        this.x - 10,
        this.y + 80,
        -5.5,
        (player.y - (this.y + 80)) * 0.015,
        'ICE',
        'PRESUPUESTO 0€'
      ));
      sound.playTone(180, 'square', 0.2, 0.15, -60);
    } else if (type === 1) {
      // Reunión de última hora: Arc calendar invites
      for (let i = 0; i < 2; i++) {
        setTimeout(() => {
          bossProjectiles.push(new BossProjectile(
            this.x + 20,
            this.y + 40,
            -4.5 - i * 1.5,
            -2.5 + i * 2,
            'MEETING',
            'REUNIÓN 18:30h'
          ));
          sound.playTone(520, 'triangle', 0.1, 0.12, 100);
        }, i * 200);
      }
    } else {
      // Slack Notification Rain
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          bossProjectiles.push(new BossProjectile(
            player.x + (i - 1) * 80,
            60,
            0,
            4.8,
            'SLACK',
            '@channel ¿CÓMO VA ESTO?'
          ));
          sound.playTone(800, 'sine', 0.08, 0.1, -200);
        }, i * 250);
      }
    }
  },

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    this.hurtTimer = 0.25;
    sound.sfxBossHurt();
    triggerScreenShake(5, 0.18);
    spawnSparks(this.x + 30, this.y + 90, '#ff0077', 10);
    addFloatingText(this.x + 10, this.y + 30, `-${amount} STAKEHOLDER HP`, '#ff0077');

    if (this.hp <= 0) {
      triggerVictory();
    }
  },

  draw(c) {
    const bx = this.x;
    const by = this.y + Math.sin(this.floatY) * 6;

    c.save();
    if (this.hurtTimer > 0) {
      c.filter = 'brightness(2.2) contrast(1.6)';
    }

    // Shadow
    c.fillStyle = 'rgba(0,0,0,0.5)';
    c.beginPath();
    c.ellipse(bx + 80, 448, 70, 10, 0, 0, Math.PI * 2);
    c.fill();

    // Giant Herman Miller Chair backrest
    c.fillStyle = '#090d16';
    c.fillRect(bx + 15, by - 20, 130, 200);
    c.strokeStyle = '#00f3ff';
    c.lineWidth = 3;
    c.strokeRect(bx + 15, by - 20, 130, 200);

    // Torso: High-end executive blazer with golden cufflinks
    c.fillStyle = '#1e1e2f';
    c.fillRect(bx + 30, by + 60, 100, 120);

    // Silk vest + Gold chain
    c.fillStyle = '#312e81';
    c.fillRect(bx + 55, by + 70, 50, 90);
    c.strokeStyle = '#fbbf24';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(bx + 80, by + 120, 25, 0.2, Math.PI - 0.2);
    c.stroke();

    // Head: Big executive bald head with sharp glasses & smug grin
    c.fillStyle = '#fed7aa';
    c.fillRect(bx + 50, by, 60, 65);
    // Gray temples hair
    c.fillStyle = '#94a3b8';
    c.fillRect(bx + 46, by + 15, 6, 25);
    c.fillRect(bx + 108, by + 15, 6, 25);

    // Rimless executive glasses
    c.strokeStyle = '#00f3ff';
    c.lineWidth = 2.5;
    c.strokeRect(bx + 56, by + 18, 18, 12);
    c.strokeRect(bx + 86, by + 18, 18, 12);
    c.beginPath();
    c.moveTo(bx + 74, by + 24);
    c.lineTo(bx + 86, by + 24);
    c.stroke();

    // Piercing eyes
    c.fillStyle = '#ef4444';
    c.fillRect(bx + 63, by + 22, 5, 5);
    c.fillRect(bx + 93, by + 22, 5, 5);

    // Cigar / Smug mouth
    c.fillStyle = '#78350f';
    c.fillRect(bx + 90, by + 46, 18, 5);
    // Smoke from cigar
    if (Math.random() < 0.4) {
      particles.push(new Particle(bx + 108, by + 46, '#94a3b8', 0.5 + Math.random(), -1, 3, 0.5));
    }

    // Infinite Coffee Thermos in left hand
    c.fillStyle = '#475569';
    c.fillRect(bx - 10, by + 90, 32, 55);
    c.fillStyle = '#ff0077';
    c.font = 'bold 9px "Press Start 2P"';
    c.fillText('CAFÉ ∞', bx - 8, by + 120);

    // Floating Slack Notification Badge ("99+")
    c.save();
    c.shadowColor = '#f43f5e';
    c.shadowBlur = 15;
    c.fillStyle = '#e11d48';
    c.beginPath();
    c.arc(bx + 130, by + 15, 20, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.font = 'bold 12px "Space Grotesk", sans-serif';
    c.textAlign = 'center';
    c.fillText('99+', bx + 130, by + 20);
    c.restore();

    // Boss Name Tag
    c.fillStyle = '#0f172a';
    c.fillRect(bx, by - 45, 160, 20);
    c.strokeStyle = '#ff0077';
    c.strokeRect(bx, by - 45, 160, 20);
    c.fillStyle = '#ff0077';
    c.font = 'bold 8px "Press Start 2P"';
    c.textAlign = 'left';
    c.fillText('STAKEHOLDER ABSOLUTO', bx + 6, by - 31);

    c.restore();
  }
};

// Projectile Phase 2: Boss Obstacles
class BossProjectile {
  constructor(x, y, vx, vy, type, text) {
    this.x = x;
    this.y = y;
    this.width = type === 'ICE' ? 52 : 46;
    this.height = 36;
    this.vx = vx;
    this.vy = vy;
    this.type = type; // 'ICE', 'MEETING', 'SLACK'
    this.text = text;
    this.rotation = 0;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.rotation += 0.04;
  }

  draw(c) {
    c.save();
    c.translate(this.x + this.width / 2, this.y + this.height / 2);

    if (this.type === 'ICE') {
      // Ice crystal block
      c.rotate(this.rotation);
      c.fillStyle = 'rgba(56, 189, 248, 0.85)';
      c.strokeStyle = '#00f3ff';
      c.lineWidth = 2;
      c.fillRect(-22, -22, 44, 44);
      c.strokeRect(-22, -22, 44, 44);

      c.fillStyle = '#ffffff';
      c.font = 'bold 8px "Space Grotesk"';
      c.textAlign = 'center';
      c.fillText('🧊 0€', 0, 3);
    } else if (this.type === 'MEETING') {
      // Calendar Invite Card
      c.fillStyle = '#1e293b';
      c.strokeStyle = '#fbbf24';
      c.lineWidth = 2;
      c.fillRect(-30, -18, 60, 36);
      c.strokeRect(-30, -18, 60, 36);

      c.fillStyle = '#fbbf24';
      c.fillRect(-30, -18, 60, 8); // top bar
      c.fillStyle = '#ffffff';
      c.font = 'bold 8px "Space Grotesk"';
      c.textAlign = 'center';
      c.fillText('📅 ¿ACEPTAS?', 0, 6);
    } else if (this.type === 'SLACK') {
      // Slack alert
      c.fillStyle = '#4a154b';
      c.strokeStyle = '#ec4899';
      c.lineWidth = 2;
      c.fillRect(-26, -16, 52, 32);
      c.strokeRect(-26, -16, 52, 32);

      c.fillStyle = '#ffffff';
      c.font = 'bold 8px "Press Start 2P"';
      c.textAlign = 'center';
      c.fillText('SLACK!', 0, 4);
    }

    c.restore();
  }
}

let briefings = [];
let bossProjectiles = [];
let cutsceneTimer = 0;
let hoursBilled = 0;

// --- ACTIONS & COLLISION LOGIC ---

function triggerPlayerAttack() {
  if (currentState !== GAME_STATE.PHASE1 && currentState !== GAME_STATE.PHASE2) return;
  if (player.attackCooldown > 0) return;

  player.isAttacking = true;
  player.attackProgress = 0;
  player.attackCooldown = player.weapon === 'BAT' ? 0.28 : 0.42;

  if (player.weapon === 'BAT') {
    sound.sfxSwing();
    checkBatReflection();
  } else {
    sound.sfxWhip();
    checkWhipDamage();
  }
}

function checkBatReflection() {
  const batHitbox = {
    x: player.x + 20,
    y: player.y - 10,
    width: 65,
    height: 75
  };

  briefings.forEach(b => {
    if (!b.isReflected && checkAABB(batHitbox, b)) {
      b.isReflected = true;
      b.vx = Math.abs(b.vx) * 1.55; // Reverse and accelerate
      b.vy = (Math.random() - 0.5) * 1.5;
      sound.sfxReflect();
      triggerScreenShake(4, 0.15);
      spawnSparks(b.x, b.y, '#00ff88', 12);
      addFloatingText(b.x, b.y - 10, '¡DEVUELTO!', '#00ff88');
      hoursBilled += 150;
    }
  });
}

function checkWhipDamage() {
  const whipReach = 230;
  const whipBox = {
    x: player.x + 30,
    y: player.y - 15,
    width: whipReach,
    height: 70
  };

  if (checkAABB(whipBox, boss)) {
    boss.takeDamage(22);
    hoursBilled += 300;
  }
}

function checkAABB(r1, r2) {
  return r1.x < r2.x + r2.width &&
         r1.x + r1.width > r2.x &&
         r1.y < r2.y + r2.height &&
         r1.y + r1.height > r2.y;
}

// --- STATE TRANSITIONS ---

function startGame() {
  sound.init();
  sound.startMusic();
  currentState = GAME_STATE.PHASE1;
  player.reset();
  clientEnemy.reset();
  boss.reset();
  briefings = [];
  bossProjectiles = [];
  particles.length = 0;
  floatingTexts.length = 0;
  hoursBilled = 0;

  screenStart.classList.remove('active');
  screenGameOver.classList.remove('active');
  screenVictory.classList.remove('active');
}

function startPhase2Transition() {
  currentState = GAME_STATE.CUTSCENE;
  cutsceneTimer = 3.2;
  sound.sfxPhase2();
  spawnPaperShreds(clientEnemy.x + 20, clientEnemy.y + 30, 35);
  addFloatingText(480, 200, "¡CLIENTE DERROTADO!", '#00ff88');
}

function triggerGameOver() {
  currentState = GAME_STATE.GAMEOVER;
  sound.stopMusic();
  sound.sfxGameOver();
  gameoverStats.innerHTML = `<strong>HORAS FACTURADAS:</strong> $${hoursBilled}<br><strong>FASE ALCANZADA:</strong> ${player.weapon === 'BAT' ? 'FASE 1 (CLIENTE)' : 'FASE 2 (STAKEHOLDER)'}`;
  screenGameOver.classList.add('active');
}

function triggerVictory() {
  currentState = GAME_STATE.VICTORY;
  sound.stopMusic();
  sound.sfxVictory();
  victoryStats.innerHTML = `<strong>PRESUPUESTO TOTAL GANADO:</strong> $${hoursBilled + 5000}<br><strong>STATUS:</strong> PROYECTO 100% LIBRE DE CAMBIOS TÓXICOS`;
  screenVictory.classList.add('active');
}

// --- MAIN LOOP ---

function update(dt) {
  // Screen shake decay
  if (shakeTime > 0) {
    shakeTime -= dt;
  }

  // Floating text decay
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy * dt * 60;
    ft.life -= dt;
    ft.alpha = ft.life / 1.2;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }

  // Particles decay
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update(dt);
    if (p.life <= 0) particles.splice(i, 1);
  }

  if (currentState === GAME_STATE.PHASE1) {
    player.update(dt);
    clientEnemy.update(dt);

    // Update briefings
    for (let i = briefings.length - 1; i >= 0; i--) {
      const b = briefings[i];
      b.update(dt);

      // Hit player
      if (!b.isReflected && checkAABB(b, player)) {
        player.takeDamage(15);
        briefings.splice(i, 1);
        continue;
      }

      // Hit client when reflected
      if (b.isReflected && checkAABB(b, clientEnemy)) {
        clientEnemy.takeDamage(18);
        briefings.splice(i, 1);
        continue;
      }

      // Offscreen remove
      if (b.x < -100 || b.x > 1050) {
        briefings.splice(i, 1);
      }
    }
  } else if (currentState === GAME_STATE.CUTSCENE) {
    cutsceneTimer -= dt;
    player.update(dt);
    if (cutsceneTimer <= 0) {
      currentState = GAME_STATE.PHASE2;
      player.weapon = 'WHIP';
      boss.reset();
      addFloatingText(480, 220, "¡EQUIPADO: LÁTIGO USB-C 100W!", '#00f3ff');
    }
  } else if (currentState === GAME_STATE.PHASE2) {
    player.update(dt);
    boss.update(dt);

    // Boss projectiles
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
      const bp = bossProjectiles[i];
      bp.update(dt);

      // Hit player
      if (checkAABB(bp, player)) {
        const dmg = bp.type === 'ICE' ? 20 : 15;
        player.takeDamage(dmg);
        bossProjectiles.splice(i, 1);
        continue;
      }

      // Offscreen
      if (bp.x < -80 || bp.y > 560 || bp.x > 1050) {
        bossProjectiles.splice(i, 1);
      }
    }
  }
}

// Background office drawing
function drawEnvironment(c) {
  // Terminal / Corporate office background
  c.fillStyle = '#0c1017';
  c.fillRect(0, 0, canvas.width, canvas.height);

  // Background Figma Dot Matrix Grid
  c.fillStyle = 'rgba(0, 243, 255, 0.08)';
  for (let x = 20; x < canvas.width; x += 32) {
    for (let y = 20; y < 440; y += 32) {
      c.fillRect(x, y, 2, 2);
    }
  }

  // Distant server racks & office windows
  c.fillStyle = '#141a29';
  c.fillRect(80, 160, 90, 280);
  c.fillRect(220, 190, 80, 250);
  c.fillRect(360, 170, 100, 270);

  // Blinking server LEDs
  const t = Math.floor(Date.now() / 300);
  for (let i = 0; i < 6; i++) {
    c.fillStyle = (t + i) % 3 === 0 ? '#00ff88' : '#334155';
    c.fillRect(95, 200 + i * 25, 6, 6);
    c.fillStyle = (t + i * 2) % 4 === 0 ? '#00f3ff' : '#334155';
    c.fillRect(115, 200 + i * 25, 6, 6);
  }

  // Floor (Tech office carpeting with glowing neon boundary)
  c.fillStyle = '#111827';
  c.fillRect(0, 448, canvas.width, 92);
  c.fillStyle = '#00f3ff';
  c.fillRect(0, 448, canvas.width, 3);
  c.fillStyle = 'rgba(0, 243, 255, 0.15)';
  c.fillRect(0, 451, canvas.width, 10);
}

// HUD Drawing
function drawHUD(c) {
  // Player Patience Bar (Health)
  const barWidth = 240;
  const barHeight = 16;
  const px = 30;
  const py = 25;

  c.fillStyle = '#0f172a';
  c.fillRect(px, py, barWidth, barHeight);
  c.strokeStyle = '#334155';
  c.strokeRect(px, py, barWidth, barHeight);

  const curPatienceWidth = Math.max(0, (player.patience / player.maxPatience) * barWidth);
  const pGradient = c.createLinearGradient(px, 0, px + barWidth, 0);
  pGradient.addColorStop(0, '#ff0077');
  pGradient.addColorStop(1, '#00f3ff');
  c.fillStyle = pGradient;
  c.fillRect(px + 2, py + 2, Math.max(0, curPatienceWidth - 4), barHeight - 4);

  // Label
  c.fillStyle = '#e2e8f0';
  c.font = 'bold 9px "Press Start 2P"';
  c.fillText(`PACIENCIA UX: ${Math.round(player.patience)}%`, px, py - 8);

  // Weapon indicator
  c.fillStyle = '#ffb800';
  c.font = '8px "Press Start 2P"';
  c.fillText(`ARMA: ${player.weapon === 'BAT' ? 'FIGMA STYLUS' : 'LÁTIGO USB-C 100W'}`, px, py + 30);

  // Enemy Health Bar
  if (currentState === GAME_STATE.PHASE1) {
    const ex = 690;
    const ey = 25;
    c.fillStyle = '#0f172a';
    c.fillRect(ex, ey, barWidth, barHeight);
    c.strokeStyle = '#f43f5e';
    c.strokeRect(ex, ey, barWidth, barHeight);

    const clientHpWidth = (clientEnemy.hp / clientEnemy.maxHp) * barWidth;
    c.fillStyle = '#f43f5e';
    c.fillRect(ex + 2, ey + 2, Math.max(0, clientHpWidth - 4), barHeight - 4);

    c.fillStyle = '#f43f5e';
    c.font = 'bold 9px "Press Start 2P"';
    c.fillText(`ACEPTACIÓN CLIENTE: ${Math.round(clientEnemy.hp)}%`, ex - 40, ey - 8);
  } else if (currentState === GAME_STATE.PHASE2) {
    const ex = 690;
    const ey = 25;
    c.fillStyle = '#0f172a';
    c.fillRect(ex, ey, barWidth, barHeight);
    c.strokeStyle = '#ff0077';
    c.strokeRect(ex, ey, barWidth, barHeight);

    const bossHpWidth = (boss.hp / boss.maxHp) * barWidth;
    c.fillStyle = '#ff0077';
    c.fillRect(ex + 2, ey + 2, Math.max(0, bossHpWidth - 4), barHeight - 4);

    c.fillStyle = '#ff0077';
    c.font = 'bold 9px "Press Start 2P"';
    c.fillText(`STAKEHOLDER HP: ${Math.round(boss.hp)}`, ex - 20, ey - 8);
  }

  // Center Score / Hours Billed
  c.fillStyle = '#ffb800';
  c.font = 'bold 10px "Press Start 2P"';
  c.textAlign = 'center';
  c.fillText(`FACTURADO: $${hoursBilled}`, canvas.width / 2, 35);
  c.textAlign = 'left';
}

function render() {
  ctx.save();

  // Screen shake
  if (shakeTime > 0) {
    const dx = (Math.random() - 0.5) * shakeIntensity;
    const dy = (Math.random() - 0.5) * shakeIntensity;
    ctx.translate(dx, dy);
  }

  drawEnvironment(ctx);

  // Entities
  if (currentState === GAME_STATE.PHASE1 || currentState === GAME_STATE.CUTSCENE || currentState === GAME_STATE.PHASE2) {
    player.draw(ctx);
  }

  if (currentState === GAME_STATE.PHASE1) {
    clientEnemy.draw(ctx);
    briefings.forEach(b => b.draw(ctx));
  } else if (currentState === GAME_STATE.CUTSCENE) {
    // Cutscene text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(180, 160, 600, 140);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(180, 160, 600, 140);

    ctx.fillStyle = '#ff0077';
    ctx.font = 'bold 16px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('¡CLIENTE VENCIDO!', canvas.width / 2, 205);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px "Space Grotesk"';
    ctx.fillText('Pero el Director de Proyecto ha entrado en la llamada...', canvas.width / 2, 240);
    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 12px "Press Start 2P"';
    ctx.fillText('¡DESENCHUFA EL CARGADOR Y USA EL LÁTIGO!', canvas.width / 2, 275);
    ctx.textAlign = 'left';
  } else if (currentState === GAME_STATE.PHASE2) {
    boss.draw(ctx);
    bossProjectiles.forEach(bp => bp.draw(ctx));
  }

  // Particles
  particles.forEach(p => p.draw(ctx));

  // Floating text
  floatingTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 11px "Press Start 2P"';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });

  // HUD
  if (currentState === GAME_STATE.PHASE1 || currentState === GAME_STATE.PHASE2) {
    drawHUD(ctx);
  }

  ctx.restore();
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// Event Listeners for UI Buttons
btnStart.addEventListener('click', () => startGame());
btnRetry.addEventListener('click', () => startGame());
btnRestart.addEventListener('click', () => startGame());

btnAudio.addEventListener('click', () => {
  const isMuted = sound.toggleMute();
  btnAudio.textContent = isMuted ? '🔇' : '🔊';
});

// Start loop
requestAnimationFrame(gameLoop);
