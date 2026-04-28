var bgImage = new Image();
var bgLoaded = false;
bgImage.onload = function() { bgLoaded = true; };
bgImage.src = 'assets/bg.png';

var firebaseConfig = {
  apiKey: "AIzaSyAFZvcDv7a6P07IVblTYURNPWazuwUdwDk",
  authDomain: "iml-demo.firebaseapp.com",
  databaseURL: "https://iml-demo-default-rtdb.firebaseio.com",
  projectId: "iml-demo",
  storageBucket: "iml-demo.firebasestorage.app",
  messagingSenderId: "218648189128",
  appId: "1:218648189128:web:730c2bb54753b9a343edfd"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

var canvas = document.getElementById('stars-canvas');
var ctx = canvas.getContext('2d');
var tooltip = document.getElementById('stars-tooltip');
var witnessBtn = document.getElementById('witness-btn');

var W, H;
var stars = [];
var sparkles = [];
var mouse = { x: -999, y: -999 };
var hoveredStar = null;
var loadedIds = {};

function resize() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

function randBetween(a, b) {
  return a + Math.random() * (b - a);
}

function makeBgStar() {
  return {
    x: randBetween(0, W),
    y: randBetween(0, H),
    r: randBetween(0.3, 1.4),
    opacity: randBetween(0.2, 0.9),
    twinkleSpeed: randBetween(0.003, 0.012),
    twinklePhase: randBetween(0, Math.PI * 2),
    vx: randBetween(-0.06, 0.06),
    vy: randBetween(-0.05, -0.01),
    isMessage: false
  };
}

function makeMessageStar(msg, id) {
  return {
    x: randBetween(W * 0.08, W * 0.92),
    y: randBetween(H * 0.08, H * 0.88),
    r: randBetween(5, 9),
    opacity: randBetween(0.6, 0.9),
    twinkleSpeed: randBetween(0.004, 0.01),
    twinklePhase: randBetween(0, Math.PI * 2),
    vx: randBetween(-0.09, 0.09),
    vy: randBetween(-0.12, -0.04),
    isMessage: true,
    message: msg,
    id: id,
    witnessCount: 0,
    glowPulse: 0
  };
}

function addSparkle(x, y) {
  for (var i = 0; i < 12; i++) {
    sparkles.push({
      x: x, y: y,
      vx: randBetween(-2.2, 2.2),
      vy: randBetween(-2.8, -0.5),
      life: 1,
      hue: randBetween(190, 230)
    });
  }
}

function drawGlow(x, y, r, alpha, witnessCount) {
  var boost = 1 + witnessCount * 0.3;
  var glowR = r * 3.8 * boost;
  var g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  g.addColorStop(0, 'rgba(120,200,255,' + alpha + ')');
  g.addColorStop(0.35, 'rgba(90,170,255,' + (alpha * 0.45) + ')');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();
}

function loadMessages() {
  db.collection("releases")
    .orderBy("timestamp", "desc")
    .limit(80)
    .onSnapshot(function(snapshot) {
      snapshot.docChanges().forEach(function(change) {
        if (change.type === "added") {
          var id = change.doc.id;
          if (loadedIds[id]) { return; }
          loadedIds[id] = true;
          var data = change.doc.data();
          if (data.message) {
            stars.push(makeMessageStar(data.message, id));
          }
        }
      });
    });
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  if (bgLoaded) {
    ctx.drawImage(bgImage, 0, 0, W, H);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
  }

  ctx.fillStyle = 'rgba(0,0,5,0.2)';
  ctx.fillRect(0, 0, W, H);

  var nebula = ctx.createRadialGradient(W * 0.75, H * 0.7, 0, W * 0.75, H * 0.7, W * 0.45);
  nebula.addColorStop(0, 'rgba(10,30,80,0.15)');
  nebula.addColorStop(0.5, 'rgba(5,15,50,0.07)');
  nebula.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  var minDist = 45;
  hoveredStar = null;

  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];

    s.twinklePhase += s.twinkleSpeed;
    var twinkle = 0.7 + 0.3 * Math.sin(s.twinklePhase);

    s.x += s.vx;
    s.y += s.vy;
    if (s.x < -20) { s.x = W + 20; }
    if (s.x > W + 20) { s.x = -20; }
    if (s.y < -20) { s.y = H + 20; s.x = randBetween(0, W); }

    if (s.isMessage) {
      // 衰减 pulse
      if (s.glowPulse > 0) { s.glowPulse -= 0.012; }
      if (s.glowPulse < 0) { s.glowPulse = 0; }

      var dist = Math.hypot(s.x - mouse.x, s.y - mouse.y);
      var isHovered = dist < minDist;
      if (isHovered) { hoveredStar = s; minDist = dist; }

      var baseAlpha = 0.75 + s.witnessCount * 0.08;
      var pulseBoost = s.glowPulse * 0.6;
      var glowAlpha = Math.min(1, (isHovered ? baseAlpha + 0.15 : baseAlpha) + pulseBoost) * s.opacity * twinkle;

      drawGlow(s.x, s.y, s.r, glowAlpha, s.witnessCount);

      var starR = s.r * (1 + s.witnessCount * 0.12 + s.glowPulse * 0.15);
      ctx.beginPath();
      ctx.arc(s.x, s.y, starR, 0, Math.PI * 2);
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'rgba(120,200,255,0.9)';
      ctx.shadowBlur = 12 + s.witnessCount * 4 + s.glowPulse * 10;
      ctx.fillStyle = 'rgba(120,200,255,' + Math.min(1, s.opacity * twinkle + s.witnessCount * 0.05) + ')';
      ctx.fill();
      ctx.shadowBlur = 0;

    } else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,' + (s.opacity * twinkle) + ')';
      ctx.fill();
    }
  }

  sparkles = sparkles.filter(function(p) { return p.life > 0; });
  sparkles.forEach(function(p) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.05;
    p.life -= 0.03;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(130,210,255,' + p.life + ')';
    ctx.fill();
  });

  if (hoveredStar) {
    tooltip.textContent = hoveredStar.message;
    tooltip.style.opacity = '1';
    var tx = Math.min(mouse.x + 20, W - 240);
    var ty = Math.max(mouse.y - 80, 8);
    tooltip.style.left = tx + 'px';
    tooltip.style.top = ty + 'px';
    witnessBtn.classList.add('visible');
  } else {
    tooltip.style.opacity = '0';
    witnessBtn.classList.remove('visible');
  }

  requestAnimationFrame(draw);
}

witnessBtn.addEventListener('click', function() {
  if (!hoveredStar) { return; }
  hoveredStar.witnessCount += 1;
  hoveredStar.glowPulse = 1;
  addSparkle(hoveredStar.x, hoveredStar.y);
});

document.addEventListener('mousemove', function(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
}, { passive: false });

window.addEventListener('resize', resize);

resize();
for (var i = 0; i < 250; i++) { stars.push(makeBgStar()); }
loadMessages();
draw();