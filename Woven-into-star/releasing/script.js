const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const input = document.getElementById('text-input-entry');
const btn = document.getElementById('release-btn');

let W, H, stars = [], mouse = { x: -999, y: -999 };
let tooltipStar = null, sparkles = [];
let appStarted = false;

const bgImage = new Image();
bgImage.onload = function () { startApp(); };
bgImage.onerror = function () { startApp(); };
bgImage.src = '../assets/bg.png';

const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "...",
  projectId: "...",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const SEEDS = [
  "i still look for you when i come home",
  "i keep thinking i hear your footsteps",
  "luv u, forever",
  "i didn’t realize how much of my life was you",
  "i hope you knew how loved you were",
  "i’m sorry i couldn’t protect you",
  "i don’t know what to do with your toys"
];

function startApp() {
  if (appStarted) return;
  appStarted = true;

  resize();
  init();
  loadMessages();
  draw();

  const witnessedMsg = localStorage.getItem('witnessedMessage');
  if (witnessedMsg) {
    localStorage.removeItem('witnessedMessage');

    setTimeout(() => {
      const target = stars.find(s => s.message === witnessedMsg);
      if (target) {
        target.witnessCount += 1;
        target.glowPulse = 1.5;
        target.flashTimer = 1.2;
        addSparkle(target.x, target.y);
      }
    }, 600);
  }
}

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function randBetween(a, b) {
  return a + Math.random() * (b - a);
}

function makeStar(isBackground = true) {
  return {
    x: randBetween(0, W),
    y: randBetween(0, H),
    r: isBackground ? randBetween(0.3, 1.4) : 0,
    targetR: isBackground ? randBetween(0.3, 1.4) : randBetween(6, 10),
    opacity: isBackground ? randBetween(0.2, 0.9) : 0,
    vx: randBetween(-0.08, 0.08),
    vy: randBetween(-0.06, -0.02),
    message: null,
    isBackground,
    born: false,
    witnessCount: 0,
    glowPulse: 0,
    flashTimer: 0
  };
}

function makeMessageStar(msg) {
  const s = makeStar(false);
  s.x = randBetween(W * 0.1, W * 0.9);
  s.y = randBetween(H * 0.2, H * 0.7);
  s.message = msg;
  s.r = s.targetR;
  s.opacity = 1;
  s.born = true;
  return s;
}

function addSparkle(x, y) {
  for (let i = 0; i < 10; i++) {
    sparkles.push({
      x, y,
      vx: randBetween(-1.8, 1.8),
      vy: randBetween(-2.4, -0.6),
      life: 1
    });
  }
}

function init() {
  stars = [];

  for (let i = 0; i < 200; i++) {
    stars.push(makeStar(true));
  }

  SEEDS.forEach(m => {
    stars.push(makeMessageStar(m));
  });
}

function loadMessages() {
  db.collection("releases")
    .orderBy("timestamp", "desc")
    .limit(50)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.message) {
            stars.push(makeMessageStar(data.message));
          }
        }
      });
    });
}

function showTooltip(star) {
  tooltip.textContent = star.message;
  tooltip.style.opacity = '1';
  tooltip.style.left = (mouse.x + 20) + 'px';
  tooltip.style.top = (mouse.y - 40) + 'px';
}

function hideTooltip() {
  tooltip.style.opacity = '0';
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  if (bgImage.complete) {
    ctx.drawImage(bgImage, 0, 0, W, H);
  }

  let hoveredStar = null;
  let minDist = 50;

  stars.forEach(s => {
    s.x += s.vx;
    s.y += s.vy;

    if (s.x < 0) s.x = W;
    if (s.x > W) s.x = 0;
    if (s.y < 0) s.y = H;
    if (s.y > H) s.y = 0;

    if (s.glowPulse > 0) s.glowPulse -= 0.01;

    let flash = 0;
    if (s.flashTimer > 0) {
      flash = Math.sin(s.flashTimer * 25) * 0.5 + 0.5;
      s.flashTimer -= 0.04;
    }

    const dist = Math.hypot(s.x - mouse.x, s.y - mouse.y);
    if (!s.isBackground && dist < minDist) {
      hoveredStar = s;
      minDist = dist;
    }

    const glowR = s.r * (4 + flash * 2);
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
    g.addColorStop(0, `rgba(120,200,255,${0.4 + flash})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120,200,255,0.9)";
    ctx.fill();
  });

  if (hoveredStar) showTooltip(hoveredStar);
  else hideTooltip();

  requestAnimationFrame(draw);
}

//////////////////////////////////////////////////////////
// ⭐ 输入生成星星（修复重点）
//////////////////////////////////////////////////////////

function release() {
  const val = input.value.trim();
  if (!val) return;

  input.value = '';

  const s = makeMessageStar(val);

  // ⭐ 强出现效果
  s.flashTimer = 1;
  s.glowPulse = 1;

  stars.push(s);
  addSparkle(s.x, s.y);

  db.collection("releases").add({
    message: val,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}

btn.addEventListener('click', release);

input.addEventListener('keydown', e => {
  if (e.key === 'Enter') release();
});

//////////////////////////////////////////////////////////

canvas.addEventListener('click', function(e) {
  let clickedStar = null;
  let minDist = 50;

  stars.forEach(s => {
    if (!s.message) return;
    const d = Math.hypot(s.x - e.clientX, s.y - e.clientY);
    if (d < minDist) {
      clickedStar = s;
      minDist = d;
    }
  });

  if (clickedStar) {
    localStorage.setItem('witnessMessage', clickedStar.message);
    setTimeout(() => {
      window.location.href = 'star.html';
    }, 300);
  }
});

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('resize', resize);