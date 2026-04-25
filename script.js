/* =====================================================================
   PULSE 4D — interactive engine
   ===================================================================== */

/* ---------- 1. NAV / SCROLL SPY ---------- */
const navLinks = document.querySelectorAll('.nav-links a');
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const t = document.getElementById(link.dataset.target);
    if (t) t.scrollIntoView({ behavior: 'smooth' });
  });
});
const sections = ['hero', 'dashboard', 'workouts', 'progress', 'coach'].map(id => document.getElementById(id));
window.addEventListener('scroll', () => {
  const y = window.scrollY + 200;
  let active = sections[0];
  sections.forEach(s => { if (s && s.offsetTop <= y) active = s; });
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.target === active.id));
}, { passive: true });

/* ---------- 2. COUNT-UP ANIMATIONS ---------- */
const animateCount = (el, target, duration = 1600) => {
  const isFloat = target % 1 !== 0;
  const start = performance.now();
  const tick = now => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = target * eased;
    el.textContent = isFloat ? v.toFixed(1) : Math.floor(v).toLocaleString();
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = isFloat ? target.toFixed(1) : target.toLocaleString();
  };
  requestAnimationFrame(tick);
};
const countObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      animateCount(el, parseFloat(el.dataset.count));
      countObserver.unobserve(el);
    }
  });
}, { threshold: 0.4 });
document.querySelectorAll('[data-count]').forEach(el => countObserver.observe(el));

/* ---------- 3. TILT (mouse-tracking 3D) ---------- */
document.querySelectorAll('.tilt').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rx = ((y / r.height) - 0.5) * -10;
    const ry = ((x / r.width) - 0.5) * 10;
    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
    el.style.setProperty('--mx', `${x}px`);
    el.style.setProperty('--my', `${y}px`);
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = '';
  });
});

/* ---------- 4. WORKOUT CARD TILT (deeper) ---------- */
document.querySelectorAll('.w-card').forEach(el => {
  el.style.setProperty('--bg-card', el.dataset.bg);
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rx = ((y / r.height) - 0.5) * -14;
    const ry = ((x / r.width) - 0.5) * 14;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(20px) scale(1.02)`;
    el.style.setProperty('--mx', `${(x / r.width) * 100}%`);
    el.style.setProperty('--my', `${(y / r.height) * 100}%`);
  });
  el.addEventListener('mouseleave', () => { el.style.transform = ''; });
});

/* ---------- 5. CHARTS ---------- */
const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
const setupCanvas = c => {
  const r = c.getBoundingClientRect();
  c.width = r.width * dpr();
  c.height = r.height * dpr();
  const ctx = c.getContext('2d');
  ctx.scale(dpr(), dpr());
  return { ctx, w: r.width, h: r.height };
};

const drawArea = (canvas, data, opts = {}) => {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...data) * 1.1;
  const min = Math.min(...data) * 0.9;
  const step = w / (data.length - 1);

  // gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, opts.color1 || 'rgba(34,211,238,.5)');
  grad.addColorStop(1, 'rgba(34,211,238,0)');

  ctx.beginPath();
  ctx.moveTo(0, h);
  data.forEach((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min)) * (h - 10) - 5;
    if (i === 0) ctx.lineTo(x, y);
    else {
      const px = (i - 1) * step;
      const py = h - ((data[i - 1] - min) / (max - min)) * (h - 10) - 5;
      const cpx = (px + x) / 2;
      ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
    }
  });
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // line
  ctx.beginPath();
  data.forEach((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min)) * (h - 10) - 5;
    if (i === 0) ctx.moveTo(x, y);
    else {
      const px = (i - 1) * step;
      const py = h - ((data[i - 1] - min) / (max - min)) * (h - 10) - 5;
      const cpx = (px + x) / 2;
      ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
    }
  });
  ctx.strokeStyle = opts.stroke || '#22d3ee';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = opts.stroke || '#22d3ee';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
};

const drawBars = (canvas, data, labels) => {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...data) * 1.15;
  const bw = w / data.length;
  data.forEach((v, i) => {
    const bh = (v / max) * (h - 30);
    const x = i * bw + bw * 0.15;
    const y = h - bh - 20;
    const grad = ctx.createLinearGradient(0, y, 0, h);
    grad.addColorStop(0, '#22d3ee');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    const r = 6;
    const bw2 = bw * 0.7;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + bw2, y, x + bw2, y + r, r);
    ctx.lineTo(x + bw2, h - 20);
    ctx.lineTo(x, h - 20);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#7a86b6';
    ctx.font = '11px Space Grotesk';
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + bw2 / 2, h - 5);
  });
};

const drawMultiLine = (canvas, datasets) => {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  // grid
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const y = (h / 5) * i + 10;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  datasets.forEach(ds => {
    const max = Math.max(...ds.data) * 1.15;
    const min = Math.min(...ds.data) * 0.85;
    const step = w / (ds.data.length - 1);
    ctx.beginPath();
    ds.data.forEach((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / (max - min)) * (h - 30) - 15;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const px = (i - 1) * step;
        const py = h - ((ds.data[i - 1] - min) / (max - min)) * (h - 30) - 15;
        const cpx = (px + x) / 2;
        ctx.bezierCurveTo(cpx, py, cpx, y, x, y);
      }
    });
    ctx.strokeStyle = ds.color;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ds.color;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });
};

/* gen sample data */
const genWalk = (n, base, vol) => {
  const out = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.5) * vol;
    out.push(Math.max(0, v));
  }
  return out;
};

const drawAll = () => {
  const a = document.getElementById('activity-chart');
  if (a) drawArea(a, genWalk(40, 60, 18), { stroke: '#22d3ee', color1: 'rgba(34,211,238,.4)' });
  const hr = document.getElementById('hr-chart');
  if (hr) drawArea(hr, genWalk(30, 140, 10), { stroke: '#ec4899', color1: 'rgba(236,72,153,.4)' });
  const b = document.getElementById('bar-chart');
  if (b) drawBars(b, [4200, 5800, 4900, 6400, 7200, 5500, 6800], ['M','T','W','T','F','S','S']);
  const l = document.getElementById('line-chart');
  if (l) drawMultiLine(l, [
    { data: [62, 63, 63.5, 64, 64.8, 65.2, 66, 66.4, 67, 67.5, 68, 68.6], color: '#22d3ee' },
    { data: [22, 21.5, 21, 20.4, 20, 19.6, 19.3, 19, 18.7, 18.5, 18.2, 18], color: '#a855f7' },
    { data: [80, 80.5, 80.3, 80.8, 81, 81.2, 81.6, 82, 82.3, 82.8, 83.2, 83.6], color: '#f59e0b' }
  ]);
};
drawAll();
window.addEventListener('resize', drawAll);

/* ---------- 6. LIVE BPM TICKER ---------- */
const bpmEl = document.getElementById('bpm-num');
const hudBpm = document.getElementById('hud-bpm');
const hudVo2 = document.getElementById('hud-vo2');
const hudPow = document.getElementById('hud-pow');
const hudForm = document.getElementById('hud-form');
let bpm = 142, vo2 = 48.6, pow = 320, form = 96;
setInterval(() => {
  bpm = Math.round(140 + Math.sin(Date.now() / 800) * 8 + (Math.random() - 0.5) * 4);
  vo2 = (48 + Math.sin(Date.now() / 1500) * 1.5).toFixed(1);
  pow = Math.round(310 + Math.sin(Date.now() / 600) * 30);
  form = Math.round(94 + Math.sin(Date.now() / 1200) * 3);
  if (bpmEl) bpmEl.textContent = bpm;
  if (hudBpm) hudBpm.textContent = bpm;
  if (hudVo2) hudVo2.textContent = vo2;
  if (hudPow) hudPow.textContent = pow;
  if (hudForm) hudForm.textContent = form;
}, 600);

/* ---------- 7. THREE.JS HERO 3D ---------- */
const initHero3D = () => {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const r = canvas.getBoundingClientRect();
  const camera = new THREE.PerspectiveCamera(50, r.width / r.height, 0.1, 100);
  camera.position.set(0, 0, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(r.width, r.height, false);

  // group: stylized 4D orb made of icosahedron + wireframe + particles
  const group = new THREE.Group();
  scene.add(group);

  // outer wireframe icosahedron
  const ico = new THREE.IcosahedronGeometry(1.6, 1);
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(ico),
    new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.7 })
  );
  group.add(wire);

  // inner glowing core
  const coreGeo = new THREE.IcosahedronGeometry(0.9, 2);
  const coreMat = new THREE.MeshPhongMaterial({
    color: 0xa855f7, emissive: 0xa855f7, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.85, shininess: 100, flatShading: true
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);

  // mid wireframe
  const mid = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.2, 0)),
    new THREE.LineBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.5 })
  );
  group.add(mid);

  // particles
  const pCount = 400;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    const r2 = 2.4 + Math.random() * 0.8;
    pos[i * 3] = r2 * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r2 * Math.sin(p) * Math.sin(t);
    pos[i * 3 + 2] = r2 * Math.cos(p);
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({ color: 0x22d3ee, size: 0.04, transparent: true, opacity: 0.8 })
  );
  group.add(particles);

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const l1 = new THREE.PointLight(0x22d3ee, 1.4, 20); l1.position.set(4, 2, 4); scene.add(l1);
  const l2 = new THREE.PointLight(0xec4899, 1.2, 20); l2.position.set(-4, -2, 3); scene.add(l2);

  // mouse interactivity
  let mx = 0, my = 0;
  window.addEventListener('mousemove', e => {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  });

  const animate = t => {
    t *= 0.001;
    group.rotation.y = t * 0.3 + mx * 0.4;
    group.rotation.x = Math.sin(t * 0.4) * 0.2 + my * 0.3;
    wire.rotation.y -= 0.005;
    mid.rotation.x += 0.008;
    mid.rotation.z += 0.004;
    particles.rotation.y += 0.001;
    core.scale.setScalar(1 + Math.sin(t * 2) * 0.05);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  const onResize = () => {
    const r2 = canvas.getBoundingClientRect();
    camera.aspect = r2.width / r2.height;
    camera.updateProjectionMatrix();
    renderer.setSize(r2.width, r2.height, false);
  };
  window.addEventListener('resize', onResize);
};
initHero3D();

/* ---------- 8. THREE.JS COACH (3D human silhouette with motion lines) ---------- */
const initCoach3D = () => {
  const canvas = document.getElementById('coach-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const r = canvas.getBoundingClientRect();
  const camera = new THREE.PerspectiveCamera(45, r.width / r.height, 0.1, 100);
  camera.position.set(0, 0.5, 6);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(r.width, r.height, false);

  const group = new THREE.Group();
  scene.add(group);

  // simple humanoid skeleton out of spheres + lines
  const joints = [
    [0, 2.2, 0],     // 0 head
    [0, 1.5, 0],     // 1 neck
    [-0.7, 1.4, 0],  // 2 L shoulder
    [0.7, 1.4, 0],   // 3 R shoulder
    [-1.0, 0.5, 0],  // 4 L elbow
    [1.0, 0.5, 0],   // 5 R elbow
    [-1.1, -0.4, 0], // 6 L hand
    [1.1, -0.4, 0],  // 7 R hand
    [0, 0.6, 0],     // 8 chest
    [-0.3, -0.4, 0], // 9 L hip
    [0.3, -0.4, 0],  // 10 R hip
    [-0.4, -1.6, 0], // 11 L knee
    [0.4, -1.6, 0],  // 12 R knee
    [-0.45, -2.6, 0],// 13 L foot
    [0.45, -2.6, 0]  // 14 R foot
  ];
  const bones = [
    [0, 1], [1, 8], [8, 2], [8, 3], [2, 4], [3, 5], [4, 6], [5, 7],
    [8, 9], [8, 10], [9, 10], [9, 11], [10, 12], [11, 13], [12, 14]
  ];

  const jointMeshes = [];
  joints.forEach(j => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshPhongMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.7 })
    );
    m.position.set(...j);
    group.add(m);
    jointMeshes.push(m);
  });

  const boneMeshes = [];
  bones.forEach(([a, b]) => {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...joints[a]), new THREE.Vector3(...joints[b])
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xa855f7, linewidth: 2 }));
    group.add(line);
    boneMeshes.push({ line, a, b });
  });

  // outer aura ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.02, 12, 80),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.4 })
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const ring2 = ring.clone();
  ring2.material = ring.material.clone();
  ring2.material.color.setHex(0xec4899);
  ring2.scale.setScalar(0.7);
  group.add(ring2);

  // particle field
  const pCount = 200;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 8;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 4 - 2;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.4 }));
  scene.add(dust);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const l = new THREE.PointLight(0x22d3ee, 2, 20);
  l.position.set(3, 3, 5);
  scene.add(l);

  const animate = t => {
    t *= 0.001;
    group.rotation.y = Math.sin(t * 0.4) * 0.4;

    // animate squat motion
    const s = Math.sin(t * 1.2) * 0.5 + 0.5; // 0..1
    // hips & knees
    jointMeshes[9].position.y = -0.4 - s * 0.5;
    jointMeshes[10].position.y = -0.4 - s * 0.5;
    jointMeshes[11].position.y = -1.6 + s * 0.4;
    jointMeshes[12].position.y = -1.6 + s * 0.4;
    jointMeshes[8].position.y = 0.6 - s * 0.4;
    jointMeshes[1].position.y = 1.5 - s * 0.4;
    jointMeshes[0].position.y = 2.2 - s * 0.4;
    jointMeshes[2].position.y = 1.4 - s * 0.4;
    jointMeshes[3].position.y = 1.4 - s * 0.4;
    jointMeshes[4].position.y = 0.5 - s * 0.4;
    jointMeshes[5].position.y = 0.5 - s * 0.4;
    jointMeshes[6].position.y = -0.4 - s * 0.4;
    jointMeshes[7].position.y = -0.4 - s * 0.4;

    // update bones
    boneMeshes.forEach(bm => {
      const pa = jointMeshes[bm.a].position;
      const pb = jointMeshes[bm.b].position;
      const arr = new Float32Array([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z]);
      bm.line.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    });

    ring.rotation.z += 0.005;
    ring2.rotation.z -= 0.008;
    dust.rotation.y += 0.0008;

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  const onResize = () => {
    const r2 = canvas.getBoundingClientRect();
    camera.aspect = r2.width / r2.height;
    camera.updateProjectionMatrix();
    renderer.setSize(r2.width, r2.height, false);
  };
  window.addEventListener('resize', onResize);
};
initCoach3D();

/* ---------- 9. WORKOUT OVERLAY / TIMER ---------- */
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const closeBtn = document.getElementById('close-overlay');
const tTime = document.getElementById('t-time');
const tFill = document.getElementById('t-fill');
let timerInt, secs = 0;
const TOTAL = 90;

const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const renderTimer = () => {
  tTime.textContent = fmt(secs);
  tFill.style.strokeDashoffset = 628 - (628 * (secs % TOTAL) / TOTAL);
};
const openOverlay = () => {
  overlay.classList.add('active');
  secs = 0;
  renderTimer();
  clearInterval(timerInt);
  timerInt = setInterval(() => { secs++; renderTimer(); }, 1000);
};
const closeOverlay = () => {
  overlay.classList.remove('active');
  clearInterval(timerInt);
};
if (startBtn) startBtn.addEventListener('click', openOverlay);
if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });

document.querySelectorAll('.w-card').forEach(card => {
  card.addEventListener('click', () => {
    document.getElementById('ov-title').textContent = card.querySelector('h3').textContent;
    document.getElementById('ov-ex').textContent = card.querySelector('p').textContent;
    openOverlay();
  });
});

let setNum = 2;
document.getElementById('next-set').addEventListener('click', () => {
  setNum = Math.min(4, setNum + 1);
  document.getElementById('ov-set').textContent = setNum;
  secs = 0;
});
document.getElementById('prev-set').addEventListener('click', () => {
  setNum = Math.max(1, setNum - 1);
  document.getElementById('ov-set').textContent = setNum;
});

/* ---------- 10. CHAT INPUT ---------- */
const chatInput = document.querySelector('.chat-input input');
const chatSend = document.querySelector('.chat-input button');
const chatBox = document.querySelector('.coach-chat');
const sendMsg = () => {
  const v = chatInput.value.trim();
  if (!v) return;
  const me = document.createElement('div');
  me.className = 'msg msg-me';
  me.innerHTML = `<div class="bubble">${v.replace(/[<>]/g, '')}</div>`;
  chatBox.insertBefore(me, document.querySelector('.msg.typing'));
  chatInput.value = '';

  setTimeout(() => {
    const replies = [
      "Great question — let me check your data.",
      "Based on your last 7 days, I'd suggest a deload.",
      "Your HRV trend is strong — push intensity tomorrow.",
      "Adding 2.5kg next session keeps you progressing safely.",
      "Sleep quality dipped Tuesday. Prioritize recovery."
    ];
    const bot = document.createElement('div');
    bot.className = 'msg msg-bot';
    bot.innerHTML = `<div class="avatar">P4</div><div class="bubble">${replies[Math.floor(Math.random() * replies.length)]}</div>`;
    chatBox.insertBefore(bot, document.querySelector('.msg.typing'));
  }, 900);
};
chatSend.addEventListener('click', sendMsg);
chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendMsg(); });

/* ---------- 11. INTERSECTION ANIMATIONS ---------- */
const fadeObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.style.opacity = '1';
      e.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.card, .w-card, .pr-row, .section-head').forEach((el, i) => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = `opacity .7s ${i * 0.05}s cubic-bezier(.2,.8,.2,1), transform .7s ${i * 0.05}s cubic-bezier(.2,.8,.2,1)`;
  fadeObs.observe(el);
});
