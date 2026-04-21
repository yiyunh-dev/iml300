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
  console.log('bg loaded OK');
  startApp();
};
bgImage.onerror = function () {
  console.error('bg FAILED to load:', bgImage.src);
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
  "the weight i've been carrying",
  "words that were never said",
  "what could have been",
  "the version of myself i outgrew",
  "a love that ran its course",
  "all the unfinished goodbyes",
  "the fear of not being enough"
];

function startApp() {
  if (appStarted) return;
  appStarted = true;

  canvas.style.opacity = 1;
  resize();
  init();
  loadMessages();
  draw();
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
    hue: randBetween(195, 230),
    message: null,
    isBackground,
    born: false,
    flashStart: null
  };
}

function makeMessageStar(msg) {
  const s = makeStar(false);
  s.x = randBetween(W * 0.1, W * 0.9);
  s.y = randBetween(H * 0.2, H * 0.7);
  s.message = msg;
  s.vy = randBetween(-0.15, -0.05);
  s.vx = randBetween(-0.1, 0.1);
  s.hue = randBetween(200, 220);
  s.r = 0;
  s.born = false;
  s.flashStart = performance.now();
  return s;
}

function addSparkle(x, y) {
  for (let i = 0; i < 10; i++) {
    sparkles.push({
      x,
      y,
      vx: randBetween(-1.8, 1.8),
      vy: randBetween(-2.4, -0.6),
      life: 1,
      hue: randBetween(195, 225)
    });
  }
}

function drawGlow(x, y, r, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.8);
  g.addColorStop(0, `rgba(120, 200, 255, ${alpha})`);
  g.addColorStop(0.35, `rgba(90, 170, 255, ${alpha * 0.45})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.8, 0, Math.PI * 2);
  ctx.fill();
}

function init() {
  stars = [];

  for (let i = 0; i < 260; i++) {
    stars.push(makeStar(true));
  }

  SEEDS.forEach(m => {
    const s = makeMessageStar(m);
    s.r = s.targetR;
    s.opacity = randBetween(0.55, 0.95);
    s.born = true;
    stars.push(s);
  });
}

function loadMessages() {
  db.collection("releases")
    .orderBy("timestamp", "desc")
    .limit(60)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.message) {
            const s = makeMessageStar(data.message);
            s.r = s.targetR;
            s.opacity = randBetween(0.65, 1);
            s.born = true;
            s.x = randBetween(W * 0.05, W * 0.95);
            s.y = randBetween(H * 0.05, H * 0.85);
            stars.push(s);
          }
        }
      });
    });
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  if (bgImage.complete && bgImage.naturalWidth > 0) {
    ctx.drawImage(bgImage, 0, 0, W, H);
  }

  ctx.fillStyle = 'rgba(0, 0, 5, 0.2)';
  ctx.fillRect(0, 0, W, H);

  const nebula = ctx.createRadialGradient(W * 0.75, H * 0.7, 0, W * 0.75, H * 0.7, W * 0.45);
  nebula.addColorStop(0, 'rgba(10,30,80,0.15)');
  nebula.addColorStop(0.5, 'rgba(5,15,50,0.07)');
  nebula.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  const nebula2 = ctx.createRadialGradient(W * 0.15, H * 0.15, 0, W * 0.15, H * 0.15, W * 0.3);
  nebula2.addColorStop(0, 'rgba(10,20,60,0.1)');
  nebula2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebula2;
  ctx.fillRect(0, 0, W, H);

  let hoveredStar = null;
  let minDist = 38;
  const now = performance.now();

  for (let i = stars.length - 1; i >= 0; i--) {
    const s = stars[i];

    if (!s.born) {
      s.r += 0.12;
      if (s.r >= s.targetR) {
        s.r = s.targetR;
        s.born = true;
      }
      s.opacity = Math.min(1, s.opacity + 0.05);
    }

    s.twinklePhase += s.twinkleSpeed;
    const twinkle = 0.7 + 0.3 * Math.sin(s.twinklePhase);

    s.x += s.vx;
    s.y += s.vy;

    if (s.x < -20) s.x = W + 20;
    if (s.x > W + 20) s.x = -20;
    if (s.y < -20) {
      s.y = H + 20;
      s.x = randBetween(0, W);
    }

    const dist = Math.hypot(s.x - mouse.x, s.y - mouse.y);
    const isHovered = !s.isBackground && dist < minDist;
    if (isHovered) {
      hoveredStar = s;
      minDist = dist;
    }

    let flash = 1;
    if (!s.isBackground && s.flashStart) {
      const t = (now - s.flashStart) / 1000;
      if (t < 4) {
        flash = 1 + 1.15 * Math.sin(t * 14) * (1 - t / 4);
      }
    }

    if (!s.isBackground) {
      const glowStrength = (isHovered ? 1 : 0.75) * flash;
      drawGlow(s.x, s.y, s.r, s.opacity * 0.95 * twinkle * glowStrength);
    }

    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.shadowBlur = 0;

    if (s.isBackground) {
      ctx.fillStyle = `rgba(255,255,255,${s.opacity * twinkle})`;
    } else if (isHovered) {
      ctx.shadowColor = 'rgba(120, 200, 255, 0.95)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = `rgba(120, 200, 255, ${Math.min(1, s.opacity * twinkle * flash)})`;
    } else {
      ctx.shadowColor = 'rgba(120, 200, 255, 0.8)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = `rgba(120, 200, 255, ${Math.min(1, s.opacity * twinkle * flash)})`;
    }

    ctx.fill();
    ctx.shadowBlur = 0;
  }

  sparkles = sparkles.filter(p => p.life > 0);
  sparkles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 0.04;

    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8 * p.life, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(130, 210, 255, ${p.life})`;
    ctx.fill();
  });

  if (hoveredStar && hoveredStar.message) {
    if (tooltipStar !== hoveredStar) {
      tooltipStar = hoveredStar;
      tooltip.textContent = hoveredStar.message;
      tooltip.style.opacity = '1';
    }
    const tx = Math.min(mouse.x + 20, W - 240);
    const ty = Math.max(mouse.y - 50, 8);
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
  } else if (tooltipStar) {
    tooltipStar = null;
    tooltip.style.opacity = '0';
  }

  requestAnimationFrame(draw);
}

async function release() {
  const val = input.value.trim();
  if (!val) return;

  input.value = '';
  input.blur();

  try {
    await db.collection("releases").add({
      message: val,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    console.error("Firebase write failed:", e);
  }

  btn.disabled = true;
  btn.textContent = '✦ releasing ✦';
  btn.style.color = 'rgba(180,230,255,0.6)';

  const floatingText = document.createElement('div');
  floatingText.textContent = val;
  floatingText.style.cssText = `
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-family: Georgia, serif;
    font-size: 16px;
    color: rgba(200, 235, 255, 0.95);
    pointer-events: none;
    z-index: 100;
    text-align: center;
    letter-spacing: 0.08em;
    white-space: nowrap;
  `;
  document.body.appendChild(floatingText);

  let startTime = null;
  const duration = 2200;
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 2;
  const endX = startX + (Math.random() - 0.5) * 300;
  const endY = startY - 200 - Math.random() * 150;

  function animateToStar(timestamp) {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);

    const x = startX + (endX - startX) * ease;
    const y = startY + (endY - startY) * ease;
    const scale = 1 - ease * 0.85;
    const opacity = progress < 0.7 ? 1 : 1 - ((progress - 0.7) / 0.3);

    floatingText.style.left = x + 'px';
    floatingText.style.top = y + 'px';
    floatingText.style.transform = `translate(-50%, -50%) scale(${scale})`;
    floatingText.style.opacity = opacity;
    floatingText.style.filter = `blur(${ease * 3}px)`;

    if (progress < 1) {
      requestAnimationFrame(animateToStar);
    } else {
      document.body.removeChild(floatingText);

      const s = makeMessageStar(val);
      s.x = endX;
      s.y = endY;
      s.r = s.targetR;
      s.opacity = 1;
      s.born = true;
      s.flashStart = performance.now();
      addSparkle(s.x, s.y);
      stars.push(s);

      btn.disabled = false;
      btn.textContent = '✦ Release ✦';
      btn.style.color = '';
    }
  }

  requestAnimationFrame(animateToStar);
}

btn.addEventListener('click', release);
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') release();
});

canvas.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
}, { passive: false });

window.addEventListener('resize', resize);