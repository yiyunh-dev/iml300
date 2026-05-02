var bgImage = new Image();
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
    hue: randBetween(195, 230),
    isMessage: false
  };
}

function makeMessageStar(msg, id) {
  return {
    x: randBetween(W * 0.08, W * 0.92),
    y: randBetween(H * 0.08, H * 0.88),
    r: randBetween(2.8, 4.8),
    opacity: randBetween(0.55, 0.9),
    twinkleSpeed: randBetween(0.004, 0.01),
    twinklePhase: randBetween(0, Math.PI * 2),
    vx: randBetween(-0.09, 0.09),
    vy: randBetween(-0.12, -0.04),
    hue: randBetween(185, 225),
    isMessage: true,
    message: msg,
    id: id,
    witnessed: false,
    witnessGlow: 0
  };
}

function addSparkle(x, y) {
  for (var i = 0; i < 10; i++) {
    sparkles.push({
      x: x, y: y,
      vx: randBetween(-2, 2),
      vy: randBetween(-2.5, -0.5),
      life: 1,
      hue: randBetween(190, 230)
    });
  }
}

function drawGlow(x, y, r, hue, alpha) {
  var g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
  g.addColorStop(0, 'hsla(' + hue + ',90%,95%,' + alpha + ')');
  g.addColorStop(0.4, 'hsla(' + hue + ',80%,80%,' + (alpha * 0.4) + ')');
  g.addColorStop(1, 'hsla(' + hue + ',70%,70%,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 4, 0, Math.PI * 2);
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
            var s = makeMessageStar(data.message, id);
            stars.push(s);
          }
        }
      });
    });
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(bgImage, 0, 0, W, H);
  ctx.fillStyle = 'rgba(0, 0, 5, 0.2)';
  ctx.fillRect(0, 0, W, H);

  var nebula = ctx.createRadialGradient(W * 0.75, H * 0.7, 0, W * 0.75, H * 0.7, W * 0.45);
  nebula.addColorStop(0, 'rgba(10,30,80,0.15)');
  nebula.addColorStop(0.5, 'rgba(5,15,50,0.07)');
  nebula.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, H);

  var minDist = 42;
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
      if (s.witnessed && s.witnessGlow < 1) {
        s.witnessGlow = Math.min(1, s.witnessGlow + 0.008);
      }

      var dist = Math.hypot(s.x - mouse.x, s.y - mouse.y);
      var isHovered = dist < minDist;
      if (isHovered) { hoveredStar = s; minDist = dist; }

      var glowAlpha = s.witnessed ?
        (0.6 + s.witnessGlow * 0.4) * s.opacity * twinkle :
        (isHovered ? 0.7 : 0.45) * s.opacity * twinkle;

      var glowR = s.witnessed ? s.r * (1 + s.witnessGlow * 0.8) : s.r;
      drawGlow(s.x, s.y, glowR, s.hue, glowAlpha);

      var starR = s.witnessed ? s.r * (1 + s.witnessGlow * 0.4) : s.r;
      ctx.beginPath();
      ctx.arc(s.x, s.y, starR, 0, Math.PI * 2);
      ctx.shadowBlur = 0;

      if (isHovered || s.witnessed) {
        ctx.fillStyle = 'hsla(' + s.hue + ',90%,98%,1)';
        ctx.shadowColor = 'hsla(' + s.hue + ',80%,95%,0.9)';
        ctx.shadowBlur = s.witnessed ? 18 : 12;
      } else {
        ctx.fillStyle = 'hsla(' + s.hue + ',80%,95%,' + (s.opacity * twinkle) + ')';
      }
      ctx.fill();
      ctx.shadowBlur = 0;

    } else {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + s.hue + ',60%,92%,' + (s.opacity * twinkle) + ')';
      ctx.fill();
    }
  }

  sparkles = sparkles.filter(function(p) { return p.life > 0; });
  sparkles.forEach(function(p) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04;
    p.life -= 0.025;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI * 2);
    ctx.fillStyle = 'hsla(' + p.hue + ',80%,92%,' + p.life + ')';
    ctx.fill();
  });

  if (hoveredStar) {
    tooltip.textContent = hoveredStar.message;
    tooltip.style.opacity = '1';
    var tx = Math.min(mouse.x + 20, W - 240);
    var ty = Math.max(mouse.y - 50, 8);
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
  if (hoveredStar.witnessed) { return; }
  hoveredStar.witnessed = true;
  addSparkle(hoveredStar.x, hoveredStar.y);
  setTimeout(function() {
    if (hoveredStar) { addSparkle(hoveredStar.x, hoveredStar.y); }
  }, 300);
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