const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const input = document.getElementById('text-input-entry');
const btn = document.getElementById('release-btn');

let W, H, stars = [], mouse = { x: -999, y: -999 };
let tooltipStar = null, sparkles = [];
let appStarted = false;

const bgImage = new Image();
bgImage.onload = function () {
  startApp();
};
bgImage.onerror = function () {
  startApp();
};
bgImage.src = '../assets/bg.png';

const firebaseConfig = {
  apiKey: "AIzaSyAFZvcDv7a6P07IVblTYURNPWazuwUdwDk",
  authDomain: "iml-demo.firebaseapp.com",
  databaseURL: "https://iml-demo-default-rtdb.firebaseio.com",
  projectId: "iml-demo",
  storageBucket: "iml-demo.firebasestorage.app",
  messagingSenderId: "218648189128",
  appId: "1:218648189128:web:730c2bb54753b9a343edfd"
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
        target.glowPulse = 1;
        addSparkle(target.x, target.y);
        let flashes = 0;
        const flashInterval = setInterval(function() {
          target.glowPulse = 1;
          addSparkle(target.x, target.y);
          flashes++;
          if (flashes >= 3) { clearInterval(flashInterval); }
        }, 600);
      }
    }, 800);
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
    twinkleSpeed: randBetween(0.003, 0.012),
    twinklePhase: randBetween(0, Math.PI * 2),
    vx: randBetween(-0.08, 0.08),
    vy: randBetween(-0.06, -0.02),
    message: null,
    isBackground,
    born: false,
    flashStart: null,
    witnessCount: 0,
    glowPulse: 0
  };
}

function makeMessageStar(msg) {
  const s = makeStar(false);
  s.x = randBetween(W * 0.1, W * 0.9);
  s.y = randBetween(H * 0.2, H * 0.7);
  s.message = msg;
  s.vy = randBetween(-0.15, -0.05);
  s.vx = randBetween(-0.1, 0.1);
  s.r = 0;
  s.born = false;
  s.flashStart = performance.now();
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
    const s = makeMessageStar(m);
    s.r = s.targetR;
    s.opacity = 0.8;
    s.born = true;
    stars.push(s);
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
            const s = makeMessageStar(data.message);
            s.r = s.targetR;
            s.opacity = 0.9;
            s.born = true;
            stars.push(s);
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

    if (s.glowPulse > 0) { s.glowPulse = Math.max(0, s.glowPulse - 0.008); }

    const dist = Math.hypot(s.x - mouse.x, s.y - mouse.y);
    if (!s.isBackground && dist < minDist) {
      hoveredStar = s;
      minDist = dist;
    }

    const glowBoost = 1 + (s.witnessCount || 0) * 0.3 + (s.glowPulse || 0) * 0.5;
    const glowR = s.r * 4.5 * glowBoost;
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
    g.addColorStop(0, `rgba(120, 200, 255, ${0.35 + (s.glowPulse || 0) * 0.2})`);
    g.addColorStop(0.4, `rgba(90, 160, 255, ${0.12 + (s.glowPulse || 0) * 0.1})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
    ctx.fill();

    const coreR = s.r * (1 + (s.witnessCount || 0) * 0.1);
    const core = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, coreR);
    core.addColorStop(0, `rgba(200, 235, 255, ${0.9 + (s.glowPulse || 0) * 0.1})`);
    core.addColorStop(0.5, `rgba(120, 200, 255, 0.6)`);
    core.addColorStop(1, `rgba(80, 160, 255, 0)`);
    ctx.beginPath();
    ctx.arc(s.x, s.y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  if (hoveredStar) {
    showTooltip(hoveredStar);
  } else {
    hideTooltip();
  }

  requestAnimationFrame(draw);
}

canvas.addEventListener('click', function(e) {
  const clickX = e.clientX;
  const clickY = e.clientY;

  let clickedStar = null;
  let minDist = 50;

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    if (!s.message) continue;
    const dist = Math.hypot(s.x - clickX, s.y - clickY);
    if (dist < minDist) {
      clickedStar = s;
      minDist = dist;
    }
  }

  
  if (clickedStar) {
    localStorage.setItem('witnessMessage', clickedStar.message);

    clickedStar.flashTimer = 1.2;
    clickedStar.glowPulse = 1.5;

    addSparkle(clickedStar.x, clickedStar.y);

    const overlay = document.getElementById('transition');
    if (overlay) {
      overlay.style.opacity = 1;
    }

    setTimeout(() => {
      window.location.href = 'star.html';
    }, 500);
  }

}); 
document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('resize', resize);