class GameState {
    constructor() {
        // Vat State
        this.vat = {
            temperature: 20,
            humidity: 50,
            bacteria: 0,
            pathogens: 0,
            iron: 0,
            spores: 0,
            toxin: 0,
            rotLevel: 0, // 0 to 100
            color: { r: 255, g: 255, b: 255 }, // White milk
            status: "Свежее, пока что..."
        };

        // General Game Settings
        this.timeMultiplier = 1;
        this.lastTime = performance.now();

        // References to DOM
        this.dom = {
            tempSlider: document.getElementById('temp-slider'),
            humSlider: document.getElementById('humidity-slider'),
            timeSlider: document.getElementById('time-slider'),
            tempVal: document.getElementById('temp-val'),
            humVal: document.getElementById('humidity-val'),
            timeVal: document.getElementById('time-val'),
            statusText: document.getElementById('vat-status-text'),
            biohazard: document.getElementById('vat-biohazard')
        };

        this.initTabs();
        this.bindEvents();
    }

    initTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all
                document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                // Add active to clicked
                tab.classList.add('active');
                const contentId = tab.getAttribute('data-tab');
                document.getElementById(contentId).classList.add('active');
            });
        });
    }

    bindEvents() {
        this.dom.tempSlider.addEventListener('input', (e) => {
            this.vat.temperature = parseInt(e.target.value);
            this.dom.tempVal.innerText = this.vat.temperature;
        });
        this.dom.humSlider.addEventListener('input', (e) => {
            this.vat.humidity = parseInt(e.target.value);
            this.dom.humVal.innerText = this.vat.humidity;
        });
        this.dom.timeSlider.addEventListener('input', (e) => {
            this.timeMultiplier = parseInt(e.target.value);
            this.dom.timeVal.innerText = this.timeMultiplier;
        });
    }

    update(dt) {
        // Module updates will go here

        // Vat Update Hook
        if (typeof updateVat === 'function') updateVat(dt, this);

        // Rat Pen Update Hook
        if (typeof updateRats === 'function') updateRats(dt, this);

        // Run Mini-game Update Hook
        if (typeof updateRun === 'function') updateRun(dt, this);
    }
}

// Global state
const state = new GameState();

function gameLoop(timestamp) {
    const dt = (timestamp - state.lastTime) / 1000 * state.timeMultiplier; // dt in seconds scaled
    state.lastTime = timestamp;

    state.update(dt);

    requestAnimationFrame(gameLoop);
}

// Start loop
requestAnimationFrame(gameLoop);

// === MODULE 1: Молочный чан (Dairy Lab) ===
const vatCanvas = document.getElementById('vat-canvas');
const vatCtx = vatCanvas.getContext('2d');

let vatParticles = [];
for(let i=0; i<30; i++) {
    vatParticles.push({
        x: Math.random() * vatCanvas.width,
        y: Math.random() * vatCanvas.height,
        size: Math.random() * 3 + 1,
        speedY: (Math.random() - 0.5) * 2,
        speedX: (Math.random() - 0.5) * 1,
        type: 'bubble' // bubble or fly
    });
}

function updateVat(dt, s) {
    const v = s.vat;

    // Logic simulating milk breakdown
    let rotRate = 0;

    if (v.temperature < 0) {
        // Freeze
        rotRate = 0.01;
        v.status = "Кристаллизация, крио-деградация";
        targetColor(v.color, 240, 240, 255);
    } else if (v.temperature >= 0 && v.temperature < 6) {
        // Fridge
        rotRate = 0.05;
        v.status = "Медленное скисание (Сыворотка)";
        targetColor(v.color, 250, 250, 240);
    } else if (v.temperature >= 6 && v.temperature <= 35) {
        // Room
        rotRate = 0.5;
        v.status = "Молочнокислое брожение (Творожная масса)";
        targetColor(v.color, 240, 240, 180);
    } else if (v.temperature > 35 && v.temperature <= 58) {
        // Warm/Hot
        rotRate = 1.2;
        v.status = "Ускоренное гниение, анаэробная слизь";
        targetColor(v.color, 180, 200, 100);
    } else {
        // Extreme heat
        rotRate = 2.0;
        v.status = "Коагуляция белка, серная карамелизация";
        targetColor(v.color, 50, 30, 10);
    }

    // Modifiers based on state and humidity
    if (v.humidity > 80 && v.temperature > 20) {
        rotRate *= 1.5;
        if (v.rotLevel > 30) {
            v.status = "Гнойная зеленовато-желтая жижа (Ботулизм)";
            targetColor(v.color, 100, 150, 50);
            v.toxin += dt * 0.1;
        }
    } else if (v.humidity < 20 && v.temperature > 40) {
        rotRate *= 0.8;
        if (v.rotLevel > 50) {
            v.status = "Засохшая окаменелая черная корка";
            targetColor(v.color, 20, 20, 20);
        }
    }

    // Apply contamination modifiers
    if (v.pathogens > 10) {
        targetColor(v.color, 80, 0, 0); // Bloody
        if (v.rotLevel > 60) v.status = "Токсичная кровавая биомасса (Трупный яд)";
    }

    v.rotLevel = Math.min(100, v.rotLevel + (rotRate * dt * 0.5));

    // Update DOM texts
    s.dom.statusText.innerText = v.status + ` (Распад: ${Math.floor(v.rotLevel)}%)`;

    let hazard = "Низкая";
    if (v.rotLevel > 30) hazard = "Умеренная";
    if (v.rotLevel > 60 || v.toxin > 5) hazard = "КРИТИЧЕСКАЯ";
    s.dom.biohazard.innerText = hazard;
    if(hazard === "КРИТИЧЕСКАЯ") s.dom.biohazard.style.color = "red";
    else s.dom.biohazard.style.color = "";

    renderVat(dt, v);
}

function targetColor(current, r, g, b) {
    const ease = 0.01; // slow transition
    current.r += (r - current.r) * ease;
    current.g += (g - current.g) * ease;
    current.b += (b - current.b) * ease;
}

function renderVat(dt, v) {
    // Fill background
    vatCtx.fillStyle = `rgb(${v.color.r}, ${v.color.g}, ${v.color.b})`;
    vatCtx.fillRect(0, 0, vatCanvas.width, vatCanvas.height);

    // Particles
    vatCtx.fillStyle = v.temperature > 40 || v.rotLevel > 50 ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)';

    // More rot = more flies/spores
    let numParticles = 30 + Math.floor(v.rotLevel);
    while (vatParticles.length < numParticles) {
        vatParticles.push({
            x: Math.random() * vatCanvas.width,
            y: Math.random() * vatCanvas.height,
            size: Math.random() * 3 + 1,
            speedY: (Math.random() - 0.5) * (v.temperature / 10),
            speedX: (Math.random() - 0.5) * 2,
            type: v.rotLevel > 50 ? 'fly' : 'bubble'
        });
    }

    for (let p of vatParticles) {
        p.x += p.speedX;
        p.y += p.speedY;

        // Add bubbling effect if hot
        if (v.temperature > 40) p.y -= (v.temperature * 0.05);

        // Jitter for flies
        if (p.type === 'fly') {
            p.x += (Math.random() - 0.5) * 5;
            p.y += (Math.random() - 0.5) * 5;
            vatCtx.fillStyle = '#000';
        } else {
            vatCtx.fillStyle = 'rgba(200,200,200,0.8)';
        }

        // Wrap around
        if (p.y < 0) p.y = vatCanvas.height;
        if (p.y > vatCanvas.height) p.y = 0;
        if (p.x < 0) p.x = vatCanvas.width;
        if (p.x > vatCanvas.width) p.x = 0;

        vatCtx.beginPath();
        vatCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        vatCtx.fill();
    }
}

// === MODULE 2: Тир с Валерой (Knife Alley) ===
const knifeCanvas = document.getElementById('knife-canvas');
const knifeCtx = knifeCanvas.getContext('2d');
const weaponSelect = document.getElementById('weapon-select');
const throwBtn = document.getElementById('throw-btn');
const knifeLog = document.getElementById('knife-log');

let knives = [];
let valeraDummy = { x: 450, y: 150, width: 100, height: 200, hits: 0 };
let bloodSplashes = [];

throwBtn.addEventListener('click', () => {
    // Self harm check
    if (Math.random() < 0.05) {
        logKnife("ВЫ ПОРЕЗАЛИ ПАЛЬЦЫ! Кровь капает в молоко... (+Патогены, +Железо)");
        state.vat.pathogens += 5;
        state.vat.iron += 2;
        return;
    }

    const weapon = weaponSelect.value;
    let pathogenLoad = 0;
    if (weapon === 'rusty_shiv') pathogenLoad = 3;
    if (weapon === 'cleaver') pathogenLoad = 5;
    if (weapon === 'toxic_machete') pathogenLoad = 10;

    knives.push({
        x: 50,
        y: 350,
        vx: 15 + Math.random() * 5,
        vy: -15 - Math.random() * 5,
        angle: 0,
        weapon: weapon,
        pathogens: pathogenLoad,
        stuck: false
    });
});

function logKnife(msg) {
    knifeLog.innerHTML += `<div>> ${msg}</div>`;
    knifeLog.scrollTop = knifeLog.scrollHeight;
}

function updateKnifeAlley(dt, s) {
    // Clear
    knifeCtx.fillStyle = '#111';
    knifeCtx.fillRect(0, 0, knifeCanvas.width, knifeCanvas.height);

    // Draw Valera
    knifeCtx.fillStyle = '#553333';
    knifeCtx.fillRect(valeraDummy.x, valeraDummy.y, valeraDummy.width, valeraDummy.height);
    knifeCtx.fillStyle = '#fff';
    knifeCtx.font = '20px Courier';
    knifeCtx.fillText("ВАЛЕРА", valeraDummy.x + 10, valeraDummy.y + 30);

    // Draw Milk Vat outline at bottom
    knifeCtx.fillStyle = '#222';
    knifeCtx.fillRect(300, 350, 300, 50);
    knifeCtx.fillStyle = '#555';
    knifeCtx.fillText("ЧАН", 420, 380);

    // Update and draw knives
    for (let i = knives.length - 1; i >= 0; i--) {
        let k = knives[i];
        if (!k.stuck) {
            // Physics
            k.x += k.vx;
            k.y += k.vy;
            k.vy += 0.5; // Gravity
            k.angle += 0.2;

            // Collision with Valera
            if (k.x > valeraDummy.x && k.x < valeraDummy.x + valeraDummy.width &&
                k.y > valeraDummy.y && k.y < valeraDummy.y + valeraDummy.height) {
                k.stuck = true;
                valeraDummy.hits++;
                logKnife("Прямое попадание в Валеру! *ЧВАК*");
                // Create blood
                for(let b=0; b<10; b++) {
                    bloodSplashes.push({
                        x: k.x, y: k.y,
                        vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5,
                        life: 1.0
                    });
                }
            }
            // Missed and fell into vat
            else if (k.y > 350 && k.x > 300) {
                logKnife(`Оружие (${k.weapon}) упало в чан! Биохимия изменена (+${k.pathogens} патогенов).`);
                s.vat.pathogens += k.pathogens;
                s.vat.iron += 1;
                knives.splice(i, 1);
                continue;
            }
            // Off screen
            else if (k.y > knifeCanvas.height || k.x > knifeCanvas.width) {
                knives.splice(i, 1);
                continue;
            }
        }

        // Render Knife
        knifeCtx.save();
        knifeCtx.translate(k.x, k.y);
        knifeCtx.rotate(k.stuck ? 0 : k.angle);
        knifeCtx.fillStyle = '#aaa';
        knifeCtx.fillRect(-10, -2, 20, 4); // Basic blade shape
        knifeCtx.restore();
    }

    // Render Blood
    for (let i = bloodSplashes.length - 1; i >= 0; i--) {
        let b = bloodSplashes[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 0.02;
        if (b.life <= 0) {
            bloodSplashes.splice(i, 1);
            continue;
        }
        knifeCtx.fillStyle = `rgba(150, 0, 0, ${b.life})`;
        knifeCtx.beginPath();
        knifeCtx.arc(b.x, b.y, 3, 0, Math.PI*2);
        knifeCtx.fill();
    }
}

// Hook into game loop
const originalUpdate = GameState.prototype.update;
GameState.prototype.update = function(dt) {
    originalUpdate.call(this, dt);

    // Check if this tab is active to save rendering resources if desired,
    // but for state machines we can just update always or only visually when active.
    if (document.getElementById('tab-knife').classList.contains('active')) {
        updateKnifeAlley(dt, this);
    }
}


// === MODULE 3: Крысиный загон (Rat Pen) ===
const ratsCanvas = document.getElementById('rats-canvas');
const ratsCtx = ratsCanvas.getContext('2d');
const pourBtn = document.getElementById('pour-milk-btn');
const throwRatKnifeBtn = document.getElementById('throw-knife-rats-btn');
const ratsLog = document.getElementById('rats-log');

let rats = [];
// Initial rats
for(let i=0; i<5; i++) spawnRat();

let spilledMilk = [];

function spawnRat() {
    rats.push({
        x: Math.random() * (ratsCanvas.width - 20) + 10,
        y: Math.random() * (ratsCanvas.height - 20) + 10,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 10,
        mutated: false,
        bloated: 0, // 0 to 100
        dead: false
    });
}

function logRats(msg) {
    ratsLog.innerHTML += `<div>> ${msg}</div>`;
    ratsLog.scrollTop = ratsLog.scrollHeight;
}

pourBtn.addEventListener('click', () => {
    logRats(`Слита порция жижи. Уровень распада: ${Math.floor(state.vat.rotLevel)}%`);
    // Create a puddle
    spilledMilk.push({
        x: Math.random() * (ratsCanvas.width - 50) + 25,
        y: Math.random() * (ratsCanvas.height - 50) + 25,
        radius: 30,
        rot: state.vat.rotLevel,
        toxin: state.vat.toxin,
        color: {...state.vat.color}
    });
    // Reset a bit of vat rot as we poured it out
    state.vat.rotLevel = Math.max(0, state.vat.rotLevel - 10);
});

throwRatKnifeBtn.addEventListener('click', () => {
    let hitIndex = -1;
    // Simple random hit chance, higher if more rats
    if (rats.length > 0 && Math.random() < 0.5 + (rats.length * 0.05)) {
        // Pick a random alive rat
        let aliveRats = rats.filter(r => !r.dead);
        if (aliveRats.length > 0) {
            let r = aliveRats[Math.floor(Math.random() * aliveRats.length)];
            r.dead = true;
            logRats("Нож попал в крысу! Добыта свежая зараженная кровь (+Патогены в чан).");
            state.vat.pathogens += 10;
        } else {
             logRats("Промах! Все крысы уже мертвы.");
        }
    } else {
        logRats("Промах! Нож улетел в решетку стока.");
    }
});

function updateRatsPen(dt, s) {
    ratsCtx.fillStyle = '#1a1a1a';
    ratsCtx.fillRect(0, 0, ratsCanvas.width, ratsCanvas.height);

    // Draw puddles
    for (let i = spilledMilk.length - 1; i >= 0; i--) {
        let p = spilledMilk[i];
        ratsCtx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0.5)`;
        ratsCtx.beginPath();
        ratsCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ratsCtx.fill();

        p.radius -= dt * 0.5; // Milk gets absorbed/evaporates
        if (p.radius <= 0) {
            spilledMilk.splice(i, 1);
        }
    }

    // Update and draw rats
    for (let i = rats.length - 1; i >= 0; i--) {
        let r = rats[i];

        if (r.dead) {
            ratsCtx.fillStyle = '#500';
            ratsCtx.fillRect(r.x - r.size, r.y - r.size, r.size*2, r.size*2);
            continue;
        }

        r.x += r.vx;
        r.y += r.vy;

        // Bounce
        if (r.x < 0 || r.x > ratsCanvas.width) r.vx *= -1;
        if (r.y < 0 || r.y > ratsCanvas.height) r.vy *= -1;

        // Jitter
        if (Math.random() < 0.05) {
            r.vx += (Math.random() - 0.5);
            r.vy += (Math.random() - 0.5);
        }

        // Eat milk
        for (let p of spilledMilk) {
            let dx = r.x - p.x;
            let dy = r.y - p.y;
            let dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < p.radius) {
                // Eating effects
                if (p.rot > 70 || p.toxin > 5) {
                    r.bloated += dt * 10; // Rapid bloat from toxic sludge
                    r.mutated = true;
                } else if (p.rot > 40) {
                    // Moderate rot - multiply
                    if (Math.random() < 0.01) spawnRat();
                }
            }
        }

        if (r.bloated > 100) {
            logRats("Крыса лопнула от токсичных газов!");
            r.dead = true;
            // Explosion visual
            ratsCtx.fillStyle = '#0f0';
            ratsCtx.beginPath();
            ratsCtx.arc(r.x, r.y, 30, 0, Math.PI*2);
            ratsCtx.fill();
            continue;
        }

        // Draw rat
        ratsCtx.fillStyle = r.mutated ? '#4d8000' : '#888';
        if (r.bloated > 50) ratsCtx.fillStyle = '#a0522d';

        ratsCtx.beginPath();
        ratsCtx.arc(r.x, r.y, r.size + (r.bloated / 10), 0, Math.PI * 2);
        ratsCtx.fill();

        // Tail
        ratsCtx.strokeStyle = '#faa';
        ratsCtx.beginPath();
        ratsCtx.moveTo(r.x, r.y);
        ratsCtx.lineTo(r.x - r.vx * 10, r.y - r.vy * 10);
        ratsCtx.stroke();
    }
}

// Hook Rat Pen update
const originalUpdateAfterKnife = GameState.prototype.update;
GameState.prototype.update = function(dt) {
    originalUpdateAfterKnife.call(this, dt);

    if (document.getElementById('tab-rats').classList.contains('active')) {
        updateRatsPen(dt, this);
    }
}


// === MODULE 4: Дегустационная пыточная (Taster's Chamber) ===
const tasteBtn = document.getElementById('taste-btn');
const washBtn = document.getElementById('wash-btn');
const tasterHealthDisplay = document.getElementById('taster-health');
const tasterFace = document.getElementById('taster-face');
const interactiveCrisis = document.getElementById('interactive-crisis');
const autopsyReport = document.getElementById('autopsy-report');

// Crisis buttons
const btnToilet = document.getElementById('choice-toilet');
const btnVomit = document.getElementById('choice-vomit');
const btnAmbulance = document.getElementById('choice-ambulance');
const btnEndure = document.getElementById('choice-endure');

let tasterState = {
    status: 'Норма', // Норма -> Тошнота -> Кровавый спазм -> Острая токсикоинфекция -> Летальный исход
    toxicity: 0,
    dead: false,
    inCrisis: false,
    crisisTimer: 0
};

function updateTasterVisuals() {
    tasterHealthDisplay.innerText = tasterState.status;

    if (tasterState.dead) {
        tasterFace.style.backgroundColor = '#4a5d66'; // Cadaveric blue
        tasterFace.style.boxShadow = 'inset 0 0 50px #000';
    } else if (tasterState.toxicity > 80) {
        tasterFace.style.backgroundColor = '#8b0000'; // Bloody, popped vessels
        tasterFace.style.boxShadow = 'inset 0 0 30px #4d8000';
    } else if (tasterState.toxicity > 50) {
        tasterFace.style.backgroundColor = '#aacc88'; // Nauseous green
    } else if (tasterState.toxicity > 20) {
        tasterFace.style.backgroundColor = '#f4e5c2'; // Pale
    } else {
        tasterFace.style.backgroundColor = '#ffccaa'; // Normal
    }
}

function triggerCrisis() {
    tasterState.inCrisis = true;
    tasterState.status = 'КРИТИЧЕСКОЕ ОТРАВЛЕНИЕ!';
    interactiveCrisis.classList.remove('hidden');
    tasteBtn.disabled = true;
    washBtn.disabled = true;
    updateTasterVisuals();
}

function resolveCrisis(action) {
    interactiveCrisis.classList.add('hidden');
    tasterState.inCrisis = false;

    let survivalChance = 0;
    if (action === 'toilet') survivalChance = 0.3;
    if (action === 'vomit') survivalChance = 0.6;
    if (action === 'ambulance') survivalChance = 0.1; // Takes too long
    if (action === 'endure') survivalChance = 0.05;

    // Modify chance based on accumulated toxins
    survivalChance -= (state.vat.toxin * 0.05);

    if (Math.random() < survivalChance) {
        tasterState.status = 'Выжил (Острая токсикоинфекция, инвалидность)';
        tasterState.toxicity = 70;
        tasteBtn.disabled = false;
        washBtn.disabled = false;
    } else {
        die();
    }
    updateTasterVisuals();
}

function die() {
    tasterState.dead = true;
    tasterState.status = 'Летальный исход';

    // Generate Autopsy Report
    let cause = "Остановка сердца.";
    if (state.vat.rotLevel > 80) cause = "Обширный некроз внутренних органов от гнилостных бактерий.";
    if (state.vat.toxin > 5) cause = "Острый токсический шок (подозрение на ботулизм).";
    if (state.vat.pathogens > 20) cause = "Сепсис, вызванный трупным ядом и обильной патогенной флорой.";

    let report = `
=================================
ЗАКЛЮЧЕНИЕ СУДМЕДЭКСПЕРТИЗЫ №404
=================================
Пациент: Дегустатор №1
Время смерти: ${new Date().toLocaleTimeString()}
Причина смерти: ${cause}
Содержимое желудка: Черная/зеленая биомасса, не поддающаяся идентификации.
pH желудка: Неизмеримо.
=================================
`;
    autopsyReport.innerText = report;
    autopsyReport.classList.remove('hidden');
}

tasteBtn.addEventListener('click', () => {
    if(tasterState.dead || tasterState.inCrisis) return;

    let dmg = state.vat.rotLevel * 0.5 + state.vat.toxin * 2 + state.vat.pathogens;
    if (dmg < 10) {
        tasterState.toxicity += 5;
        tasterState.status = 'Легкая тошнота';
    } else if (dmg < 40) {
        tasterState.toxicity += 25;
        tasterState.status = 'Кровавый спазм';
    } else {
        tasterState.toxicity += 60;
        triggerCrisis();
        return;
    }

    if (tasterState.toxicity >= 100) {
        triggerCrisis();
    } else {
        updateTasterVisuals();
    }
});

washBtn.addEventListener('click', () => {
    if(tasterState.dead || tasterState.inCrisis) return;

    if (state.vat.rotLevel > 50 || state.vat.toxin > 2) {
        tasterState.toxicity += 40;
        tasterState.status = 'Химические ожоги лица, частичная слепота!';
        if (tasterState.toxicity >= 100) triggerCrisis();
    } else {
        tasterState.status = 'Лицо липкое, пахнет скисшим молоком.';
    }
    updateTasterVisuals();
});

// Bind crisis buttons
btnToilet.addEventListener('click', () => resolveCrisis('toilet'));
btnVomit.addEventListener('click', () => resolveCrisis('vomit'));
btnAmbulance.addEventListener('click', () => resolveCrisis('ambulance'));
btnEndure.addEventListener('click', () => resolveCrisis('endure'));


// === MODULE 5: Валера Ран (Valera Run) ===
const runCanvas = document.getElementById('run-canvas');
const runCtx = runCanvas.getContext('2d');
const startRunBtn = document.getElementById('start-run-btn');
const scoreDisplay = document.getElementById('run-score');
const rotDisplay = document.getElementById('run-rot');

let runState = {
    active: false,
    score: 0,
    rot: 0,
    speed: 5
};

let valeraRunner = {
    x: 50,
    y: 200, // Ground is 250, height 50
    width: 30,
    height: 50,
    vy: 0,
    gravity: 0.8,
    jumpPower: -12,
    isJumping: false,
    isDucking: false
};

let obstacles = [];
let collectibles = [];
let runTimer = 0;

function startRun() {
    runState.active = true;
    runState.score = 0;
    runState.rot = state.vat.rotLevel; // Starts with current vat rot
    runState.speed = 5;
    obstacles = [];
    collectibles = [];
    valeraRunner.y = 200;
    valeraRunner.vy = 0;
    startRunBtn.innerText = "Рестарт забега";
}

startRunBtn.addEventListener('click', startRun);

document.addEventListener('keydown', (e) => {
    if (!runState.active) return;
    if (e.code === 'Space' && !valeraRunner.isJumping) {
        valeraRunner.vy = valeraRunner.jumpPower;
        valeraRunner.isJumping = true;
        e.preventDefault();
    }
    if (e.code === 'ArrowDown') {
        valeraRunner.isDucking = true;
        valeraRunner.height = 25;
        if(!valeraRunner.isJumping) valeraRunner.y = 225;
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
        valeraRunner.isDucking = false;
        valeraRunner.height = 50;
        if(!valeraRunner.isJumping) valeraRunner.y = 200;
    }
});

function spawnObstacle() {
    const type = Math.random();
    if (type < 0.4) {
        // Flying cleaver (high)
        obstacles.push({ x: runCanvas.width, y: 150, width: 40, height: 20, type: 'cleaver', color: '#888' });
    } else if (type < 0.8) {
        // Boiling whey puddle (low)
        obstacles.push({ x: runCanvas.width, y: 240, width: 60, height: 10, type: 'puddle', color: '#bbaa00' });
    } else {
        // Carcass (block)
        obstacles.push({ x: runCanvas.width, y: 200, width: 40, height: 50, type: 'carcass', color: '#522' });
    }
}

function spawnCollectible() {
    const type = Math.random();
    if (type < 0.5) {
        // Antibiotics (reduces rot)
        collectibles.push({ x: runCanvas.width, y: 120 + Math.random()*80, width: 20, height: 20, type: 'antibiotic', color: '#fff' });
    } else {
        // Ferment (increases score/rot)
        collectibles.push({ x: runCanvas.width, y: 120 + Math.random()*80, width: 20, height: 20, type: 'ferment', color: '#0f0' });
    }
}

function updateRun(dt, s) {
    if (!runState.active) {
        // Draw idle screen
        runCtx.fillStyle = '#000';
        runCtx.fillRect(0, 0, runCanvas.width, runCanvas.height);
        runCtx.fillStyle = '#fff';
        runCtx.font = '20px Courier';
        runCtx.fillText("Нажмите 'Начать забег', чтобы бежать.", 200, 150);
        return;
    }

    runTimer += dt;
    runState.score += dt * 10;
    runState.speed += dt * 0.1; // Slowly increase speed

    // Physics
    valeraRunner.vy += valeraRunner.gravity;
    valeraRunner.y += valeraRunner.vy;

    if (valeraRunner.y > (250 - valeraRunner.height)) {
        valeraRunner.y = 250 - valeraRunner.height;
        valeraRunner.vy = 0;
        valeraRunner.isJumping = false;
    }

    // Spawning
    if (Math.random() < 0.01 + (runState.speed * 0.001)) spawnObstacle();
    if (Math.random() < 0.005) spawnCollectible();

    // Clear
    runCtx.fillStyle = '#111';
    runCtx.fillRect(0, 0, runCanvas.width, runCanvas.height);

    // Draw ground
    runCtx.fillStyle = '#333';
    runCtx.fillRect(0, 250, runCanvas.width, 50);

    // Update & Draw Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let o = obstacles[i];
        o.x -= runState.speed;

        runCtx.fillStyle = o.color;
        runCtx.fillRect(o.x, o.y, o.width, o.height);

        // Collision
        if (valeraRunner.x < o.x + o.width && valeraRunner.x + valeraRunner.width > o.x &&
            valeraRunner.y < o.y + o.height && valeraRunner.y + valeraRunner.height > o.y) {
            // Hit obstacle
            runState.active = false;
            alert(`Валера упал! Очки: ${Math.floor(runState.score)}. Уровень гнили бидона: ${Math.floor(runState.rot)}%`);
        }

        if (o.x < -100) obstacles.splice(i, 1);
    }

    // Update & Draw Collectibles
    for (let i = collectibles.length - 1; i >= 0; i--) {
        let c = collectibles[i];
        c.x -= runState.speed;

        runCtx.fillStyle = c.color;
        runCtx.beginPath();
        runCtx.arc(c.x + c.width/2, c.y + c.height/2, c.width/2, 0, Math.PI*2);
        runCtx.fill();

        // Collision
        if (valeraRunner.x < c.x + c.width && valeraRunner.x + valeraRunner.width > c.x &&
            valeraRunner.y < c.y + c.height && valeraRunner.y + valeraRunner.height > c.y) {

            if (c.type === 'antibiotic') {
                runState.rot = Math.max(0, runState.rot - 20);
            } else if (c.type === 'ferment') {
                runState.score += 500;
                runState.rot += 10;
            }
            collectibles.splice(i, 1);
            continue;
        }

        if (c.x < -100) collectibles.splice(i, 1);
    }

    // Draw Valera
    runCtx.fillStyle = '#a0522d';
    runCtx.fillRect(valeraRunner.x, valeraRunner.y, valeraRunner.width, valeraRunner.height);
    // Draw bidon
    runCtx.fillStyle = '#ccc';
    runCtx.fillRect(valeraRunner.x + valeraRunner.width, valeraRunner.y + 10, 15, 20);

    // Update HUD
    scoreDisplay.innerText = Math.floor(runState.score);
    rotDisplay.innerText = Math.floor(runState.rot);
}
