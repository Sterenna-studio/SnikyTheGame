const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const levelLabelEl = document.getElementById('level-label');
const progressEl = document.getElementById('progress');
const ammoEl = document.getElementById('ammo');
const scoreEl = document.getElementById('score');
const distanceEl = document.getElementById('distance');
const speedEl = document.getElementById('speed');
const comboEl = document.getElementById('combo');
const bestEl = document.getElementById('best');
const stateEl = document.getElementById('state');

const levelSelect = document.getElementById('level');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const resetBtn = document.getElementById('reset');

const bestScoreKey = 'sniky-runner-best-score';
const unlockedLevelKey = 'sniky-runner-unlocked-level';
const maxAmmo = 5;
const groundY = 296;
const gravity = 0.93;
const jumpForce = -15;

const levels = [
  {
    name: 'Ruines',
    duration: 30,
    speed: 5.2,
    speedGain: 0.0014,
    spawnDelay: 1180,
    minSpawnDelay: 620,
    bonusDelay: 6900,
    startAmmo: 1,
    enemyPool: ['rock', 'spike'],
    colors: ['#20364a', '#121b27'],
  },
  {
    name: 'Drones',
    duration: 35,
    speed: 5.5,
    speedGain: 0.0017,
    spawnDelay: 1120,
    minSpawnDelay: 590,
    bonusDelay: 7200,
    startAmmo: 1,
    enemyPool: ['rock', 'spike', 'drone'],
    colors: ['#263446', '#111923'],
  },
  {
    name: 'Charge',
    duration: 40,
    speed: 5.9,
    speedGain: 0.0019,
    spawnDelay: 1060,
    minSpawnDelay: 560,
    bonusDelay: 7600,
    startAmmo: 2,
    enemyPool: ['rock', 'spike', 'charger'],
    colors: ['#2d3145', '#151823'],
  },
  {
    name: 'Signal',
    duration: 45,
    speed: 6.1,
    speedGain: 0.0021,
    spawnDelay: 1010,
    minSpawnDelay: 540,
    bonusDelay: 7900,
    startAmmo: 2,
    enemyPool: ['drone', 'shifter', 'rock', 'spike'],
    colors: ['#233a3d', '#111d21'],
  },
  {
    name: 'Essaim',
    duration: 50,
    speed: 6.4,
    speedGain: 0.0024,
    spawnDelay: 960,
    minSpawnDelay: 510,
    bonusDelay: 8200,
    startAmmo: 2,
    enemyPool: ['drone', 'shifter', 'charger', 'swarm'],
    colors: ['#372d46', '#181521'],
  },
];

const enemyTypes = {
  rock: {
    sprite: 'rock',
    y: groundY - 48,
    w: 52,
    h: 48,
    score: 10,
    speedMod: 0,
    color: '#ff746d',
  },
  spike: {
    sprite: 'spike',
    y: groundY - 42,
    w: 54,
    h: 42,
    score: 14,
    speedMod: 0.1,
    color: '#ff9f6d',
  },
  drone: {
    sprite: 'drone',
    y: groundY - 128,
    w: 80,
    h: 38,
    score: 18,
    speedMod: -0.2,
    color: '#8f96ff',
  },
  charger: {
    sprite: 'rock',
    y: groundY - 44,
    w: 50,
    h: 44,
    score: 22,
    speedMod: 0.7,
    color: '#ffcc66',
    behavior: 'charge',
  },
  shifter: {
    sprite: 'drone',
    y: groundY - 118,
    w: 74,
    h: 36,
    score: 24,
    speedMod: 0.2,
    color: '#6fffd2',
    behavior: 'shift',
  },
  swarm: {
    sprite: 'drone',
    y: groundY - 96,
    w: 54,
    h: 30,
    score: 26,
    speedMod: 1,
    color: '#f56fff',
    behavior: 'wave',
  },
};

const sprites = {
  runA: loadSprite('assets/sniky-run-1.svg'),
  runB: loadSprite('assets/sniky-run-2.svg'),
  jump: loadSprite('assets/sniky-jump.svg'),
  rock: loadSprite('assets/obstacle-rock.svg'),
  spike: loadSprite('assets/obstacle-spike.svg'),
  drone: loadSprite('assets/obstacle-drone.svg'),
};

let bestScore = readNumber(bestScoreKey, 0);
let unlockedLevel = clamp(readNumber(unlockedLevelKey, 1), 1, levels.length);

let player;
let enemies;
let bullets;
let bonuses;
let particles;
let score;
let distance;
let speed;
let dodgeCombo;
let enemyTimer;
let bonusTimer;
let lastTime;
let running;
let paused;
let finished;
let frameId;
let worldTime;
let levelTime;
let currentLevelIndex;

bestEl.textContent = bestScore;

function readNumber(key, fallback) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function writeNumber(key, value) {
  localStorage.setItem(key, String(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function loadSprite(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function levelConfig() {
  return levels[currentLevelIndex];
}

function renderLevelOptions(preferredLevel = Number(levelSelect.value || 1)) {
  const selectedLevel = clamp(preferredLevel, 1, unlockedLevel);
  levelSelect.replaceChildren();

  levels.forEach((level, index) => {
    const option = document.createElement('option');
    option.value = String(index + 1);
    option.textContent = `${index + 1} - ${level.name}`;
    option.disabled = index + 1 > unlockedLevel;
    levelSelect.appendChild(option);
  });

  levelSelect.value = String(selectedLevel);
}

function newGame(levelNumber = Number(levelSelect.value || 1)) {
  cancelAnimationFrame(frameId);

  currentLevelIndex = clamp(levelNumber, 1, unlockedLevel) - 1;
  const config = levelConfig();

  player = {
    x: 120,
    y: groundY - 58,
    w: 56,
    h: 58,
    vy: 0,
    onGround: true,
    animTimer: 0,
    animFrame: 0,
    ammo: config.startAmmo,
  };

  enemies = [];
  bullets = [];
  bonuses = [];
  particles = [];
  score = 0;
  distance = 0;
  speed = config.speed;
  dodgeCombo = 0;
  enemyTimer = config.spawnDelay * 0.45;
  bonusTimer = config.bonusDelay * 0.55;
  lastTime = 0;
  worldTime = 0;
  levelTime = 0;
  running = false;
  paused = false;
  finished = false;

  updateHud('Prêt');
  draw();
}

function startGame() {
  if (finished) {
    newGame();
  }

  if (running) return;

  running = true;
  paused = false;
  updateHud('En cours');
  lastTime = performance.now();
  frameId = requestAnimationFrame(loop);
}

function pauseGame() {
  if (!running) return;
  paused = !paused;

  if (paused) {
    updateHud('Pause');
    cancelAnimationFrame(frameId);
  } else {
    updateHud('En cours');
    lastTime = performance.now();
    frameId = requestAnimationFrame(loop);
  }
}

function finishRun(stateText) {
  running = false;
  paused = false;
  finished = true;
  cancelAnimationFrame(frameId);

  if (score > bestScore) {
    bestScore = Math.floor(score);
    bestEl.textContent = bestScore;
    writeNumber(bestScoreKey, bestScore);
  }

  updateHud(stateText);
}

function gameOver() {
  createBurst(player.x + player.w / 2, player.y + player.h / 2, '#ff6e6e', 22);
  finishRun('Perdu');
}

function completeLevel() {
  const completedLevel = currentLevelIndex + 1;
  score += 75 + completedLevel * 25 + Math.floor(player.ammo * 15);

  if (completedLevel === unlockedLevel && unlockedLevel < levels.length) {
    unlockedLevel += 1;
    writeNumber(unlockedLevelKey, unlockedLevel);
    renderLevelOptions(unlockedLevel);
  }

  createBurst(canvas.width - 130, 64, '#58dcff', 32);
  finishRun(completedLevel === levels.length ? 'Campagne terminée' : 'Niveau terminé');
}

function jump() {
  if (!running) {
    startGame();
    return;
  }

  if (!paused && player.onGround) {
    player.vy = jumpForce;
    player.onGround = false;
    createDust(9);
  }
}

function shoot() {
  if (!running) {
    startGame();
    return;
  }

  if (paused || player.ammo <= 0) return;

  player.ammo -= 1;
  bullets.push({
    x: player.x + player.w - 4,
    y: player.y + player.h * 0.45,
    w: 26,
    h: 6,
    speed: 13 + speed * 0.25,
  });
  createMuzzleFlash(player.x + player.w, player.y + player.h * 0.47);
  updateHud('En cours');
}

function createDust(amount) {
  for (let i = 0; i < amount; i += 1) {
    particles.push({
      x: player.x + 18,
      y: groundY - 4,
      vx: -(Math.random() * 2.2 + 0.4),
      vy: -(Math.random() * 1.4 + 0.2),
      life: 16 + Math.random() * 10,
      size: 2 + Math.random() * 2,
      color: '#ffd786',
    });
  }
}

function createMuzzleFlash(x, y) {
  for (let i = 0; i < 6; i += 1) {
    particles.push({
      x,
      y,
      vx: Math.random() * 2.6 + 0.8,
      vy: Math.random() * 1.4 - 0.7,
      life: 8 + Math.random() * 6,
      size: 2 + Math.random() * 2,
      color: '#58dcff',
    });
  }
}

function createBurst(x, y, color, amount) {
  for (let i = 0; i < amount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const power = Math.random() * 3.2 + 0.8;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      life: 18 + Math.random() * 18,
      size: 2 + Math.random() * 3,
      color,
    });
  }
}

function createEnemy() {
  const config = levelConfig();
  const typeName = config.enemyPool[Math.floor(Math.random() * config.enemyPool.length)];
  const type = enemyTypes[typeName];
  const spacing = 30 + Math.random() * 90;

  enemies.push({
    type: typeName,
    sprite: type.sprite,
    x: canvas.width + spacing,
    y: type.y,
    baseY: type.y,
    w: type.w,
    h: type.h,
    speed: speed + type.speedMod + currentLevelIndex * 0.18,
    color: type.color,
    behavior: type.behavior || 'straight',
    phase: Math.random() * Math.PI * 2,
    shifted: false,
    passed: false,
    scoreValue: type.score,
  });
}

function createBonus() {
  bonuses.push({
    x: canvas.width + 80,
    y: groundY - 76,
    baseY: groundY - 76,
    w: 34,
    h: 34,
    speed: Math.max(4.5, speed * 0.85),
    phase: Math.random() * Math.PI * 2,
    value: 1,
  });
}

function collides(a, b) {
  const margin = 6;
  return (
    a.x + margin < b.x + b.w &&
    a.x + a.w - margin > b.x &&
    a.y + margin < b.y + b.h &&
    a.y + a.h - margin > b.y
  );
}

function update(dt) {
  const config = levelConfig();
  const factor = dt / 16.67;
  worldTime += dt;
  levelTime += dt;

  speed += config.speedGain * dt;
  distance += (speed * dt) / 120;

  player.vy += gravity * factor;
  player.y += player.vy * factor;

  if (player.y + player.h >= groundY) {
    if (!player.onGround) {
      createDust(5);
    }
    player.y = groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  player.animTimer += dt;
  if (player.animTimer > 110) {
    player.animTimer = 0;
    player.animFrame = (player.animFrame + 1) % 2;
  }

  enemyTimer += dt;
  const spawnDelay = Math.max(config.minSpawnDelay, config.spawnDelay - speed * 48);
  if (enemyTimer >= spawnDelay) {
    enemyTimer = 0;
    createEnemy();
  }

  bonusTimer += dt;
  if (bonusTimer >= config.bonusDelay) {
    bonusTimer = 0;
    createBonus();
  }

  enemies.forEach((enemy) => {
    enemy.x -= enemy.speed * factor;

    if (enemy.behavior === 'charge') {
      enemy.speed += 0.006 * dt;
    }

    if (enemy.behavior === 'shift') {
      enemy.y = enemy.baseY + Math.sin(worldTime * 0.006 + enemy.phase) * 26;
      if (!enemy.shifted && enemy.x < canvas.width * 0.55) {
        enemy.baseY = enemy.baseY === groundY - 118 ? groundY - 72 : groundY - 118;
        enemy.shifted = true;
      }
    }

    if (enemy.behavior === 'wave') {
      enemy.y = enemy.baseY + Math.sin(worldTime * 0.009 + enemy.phase) * 32;
    }

    if (!enemy.passed && enemy.x + enemy.w < player.x) {
      enemy.passed = true;
      dodgeCombo += 1;
      score += enemy.scoreValue + Math.min(28, dodgeCombo * 2);
    }

    if (collides(player, enemy)) {
      gameOver();
    }
  });

  if (!running) return;

  bullets.forEach((bullet) => {
    bullet.x += bullet.speed * factor;
  });

  bonuses.forEach((bonus) => {
    bonus.x -= bonus.speed * factor;
    bonus.y = bonus.baseY + Math.sin(worldTime * 0.008 + bonus.phase) * 9;

    if (collides(player, bonus)) {
      bonus.picked = true;
      player.ammo = Math.min(maxAmmo, player.ammo + bonus.value);
      score += 15;
      createBurst(bonus.x + bonus.w / 2, bonus.y + bonus.h / 2, '#58dcff', 10);
    }
  });

  bullets.forEach((bullet) => {
    enemies.forEach((enemy) => {
      if (!enemy.hit && collides(bullet, enemy)) {
        bullet.hit = true;
        enemy.hit = true;
        score += enemy.scoreValue + 18;
        createBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.color, 14);
      }
    });
  });

  enemies = enemies.filter((enemy) => !enemy.hit && enemy.x + enemy.w > -40);
  bullets = bullets.filter((bullet) => !bullet.hit && bullet.x < canvas.width + 40);
  bonuses = bonuses.filter((bonus) => !bonus.picked && bonus.x + bonus.w > -20);

  particles.forEach((particle) => {
    particle.x += particle.vx * factor;
    particle.y += particle.vy * factor;
    particle.vy += 0.14 * factor;
    particle.life -= factor;
  });
  particles = particles.filter((particle) => particle.life > 0);

  if (player.onGround && dodgeCombo > 0 && Math.random() < 0.01) {
    dodgeCombo -= 1;
  }

  if (levelTime >= config.duration * 1000) {
    completeLevel();
    return;
  }

  updateHud('En cours');
}

function drawBackground() {
  const config = levelConfig();
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, config.colors[0]);
  sky.addColorStop(1, config.colors[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, groundY);

  drawParallaxLayer(48, 0.18, '#27384c', 80, 18);
  drawParallaxLayer(64, 0.35, '#32465f', 116, 24);
  drawParallaxLayer(92, 0.52, 'rgba(88, 220, 255, 0.11)', 164, 14);

  ctx.fillStyle = '#1a2736';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(canvas.width, groundY);
  ctx.stroke();

  const roadOffset = -((worldTime * speed * 0.04) % 44);
  ctx.fillStyle = '#40566f';
  for (let x = roadOffset; x < canvas.width + 50; x += 44) {
    ctx.fillRect(x, groundY + 24, 20, 4);
  }

  const progress = Math.min(1, levelTime / (config.duration * 1000));
  ctx.fillStyle = 'rgba(88, 220, 255, 0.18)';
  ctx.fillRect(0, 0, canvas.width, 8);
  ctx.fillStyle = '#58dcff';
  ctx.fillRect(0, 0, canvas.width * progress, 8);
}

function drawParallaxLayer(baseY, ratio, color, width, minHeight) {
  const offset = -((worldTime * speed * ratio) % width);
  ctx.fillStyle = color;
  for (let x = offset; x < canvas.width + width; x += width) {
    const shapeHeight = minHeight + ((x / width) % 3) * 10;
    ctx.fillRect(x, groundY - baseY - shapeHeight, width - 8, shapeHeight);
  }
}

function drawPlayer() {
  let image = sprites.runA;
  if (!player.onGround) {
    image = sprites.jump;
  } else {
    image = player.animFrame === 0 ? sprites.runA : sprites.runB;
  }

  if (player.ammo > 0) {
    ctx.shadowColor = 'rgba(88, 220, 255, 0.55)';
    ctx.shadowBlur = 14;
  }

  if (image.complete) {
    ctx.drawImage(image, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = '#74ffab';
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  ctx.shadowBlur = 0;
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    const image = sprites[enemy.sprite];
    if (image && image.complete) {
      ctx.drawImage(image, enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      ctx.globalAlpha = 1;
      return;
    }

    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
  });
}

function drawBullets() {
  bullets.forEach((bullet) => {
    ctx.fillStyle = '#58dcff';
    ctx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
    ctx.fillStyle = 'rgba(88, 220, 255, 0.22)';
    ctx.fillRect(bullet.x - 12, bullet.y + 1, 12, bullet.h - 2);
  });
}

function drawBonuses() {
  bonuses.forEach((bonus) => {
    const cx = bonus.x + bonus.w / 2;
    const cy = bonus.y + bonus.h / 2;
    ctx.fillStyle = 'rgba(88, 220, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(cx, cy, bonus.w * 0.72, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#58dcff';
    ctx.beginPath();
    ctx.moveTo(cx, bonus.y);
    ctx.lineTo(bonus.x + bonus.w, cy);
    ctx.lineTo(cx, bonus.y + bonus.h);
    ctx.lineTo(bonus.x, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0c1118';
    ctx.fillRect(cx - 2, cy - 9, 4, 18);
    ctx.fillRect(cx - 9, cy - 2, 18, 4);
  });
}

function drawParticles() {
  particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, particle.life / 26);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.globalAlpha = 1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawBonuses();
  drawEnemies();
  drawBullets();
  drawPlayer();
  drawParticles();
}

function loop(timestamp) {
  if (!running || paused) return;

  const dt = Math.min(40, timestamp - lastTime || 16.67);
  lastTime = timestamp;

  update(dt);
  draw();

  if (running) {
    frameId = requestAnimationFrame(loop);
  }
}

function updateHud(stateText) {
  const config = levelConfig();
  const progress = Math.min(100, Math.floor((levelTime / (config.duration * 1000)) * 100));

  levelLabelEl.textContent = `${currentLevelIndex + 1}/${levels.length}`;
  progressEl.textContent = `${progress}%`;
  ammoEl.textContent = player ? player.ammo : 0;
  scoreEl.textContent = Math.floor(score);
  distanceEl.textContent = `${Math.floor(distance)} m`;
  speedEl.textContent = `${(speed / config.speed).toFixed(1)}x`;
  comboEl.textContent = `x${dodgeCombo}`;
  stateEl.textContent = stateText;
  levelSelect.disabled = running;
}

function handleActionKey(event) {
  const key = event.key.toLowerCase();
  if ([' ', 'arrowup', 'z', 'w'].includes(key)) {
    event.preventDefault();
    jump();
  }

  if (['f', 'x'].includes(key)) {
    event.preventDefault();
    shoot();
  }

  if (key === 'p') {
    pauseGame();
  }
}

document.addEventListener('keydown', handleActionKey);
canvas.addEventListener('pointerdown', shoot);
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', () => {
  newGame();
});
levelSelect.addEventListener('change', () => {
  newGame(Number(levelSelect.value));
});

renderLevelOptions(1);
newGame(1);
