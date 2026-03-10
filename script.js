let photos = [];
let config = { 
    layout: 'A', 
    filter: 'none', 
    lang: localStorage.getItem('foto_lang') || 'en', 
    maxPhotos: 3, 
    orientation: 'v' 
};

// --- DUO STATE ---
let peer;
let conn;
let isDuoMode = false;
let isHostRole = false;
let localStream = null;
let isAwaitingReady = false;

const i18n = {
    en: { 
        start: "START SESSION", layout: "Select Style", step1: "Layout", step2: "Snap", 
        step3: "Design", frame: "Frame Design", save: "Save & Finish", discard: "Discard",
        spotlight: "Your Spotlight", back: "← Back", empty: "No memories captured yet!",
        duoConnected: "Duo Connected!",
        duoPromptCode: "Enter partner's 4-digit code:",
        duoConfirmReady: "Your partner wants to take photos together. Ready up?",
        duoCancelSnap: "You cancelled the snap request.",
        duoPartnerDisconnected: "Partner disconnected. Returning to home.",
        duoConnectionLost: "Connection lost.",
        duoReadySent: "Ready request sent. Waiting for your partner..."
    },
    kh: { 
        start: "ចាប់ផ្តើម", layout: "ជ្រើសរើសម៉ូត", step1: "ម៉ូត", step2: "ថតរូប", 
        step3: "រចនា", frame: "ពណ៌ស៊ុម", save: "រក្សាទុក", discard: "បោះបង់",
        spotlight: "ការចងចាំរបស់អ្នក", back: "← ត្រឡប់ក្រោយ", empty: "មិនទាន់មានរូបភាពនៅឡើយទេ!",
        duoConnected: "ឌូខៀឌាប់!", // approximate Khmer spelling of "Duo Connected"
        duoPromptCode: "បញ្ចូលកូដ 4 ខ្ទង់របស់ដៃគូររបស់អ្នក:",
        duoConfirmReady: "ដៃគូរបស់អ្នកចង់ថតរូបជាមួយ។ តើអ្នករួចស្រេចទេ?",
        duoCancelSnap: "អ្នកបានបោះបង់សំណើថតរូប។",
        duoPartnerDisconnected: "ដៃគូបានផ្តាច់។ កំពុងត្រឡប់ទៅផ្ទះ។",
        duoConnectionLost: "ការតភ្ជាប់បានខូច។",
        duoReadySent: "បានផ្ញើសំណើររៀបចំ។ កំពុងរង់ចាំដៃគូររបស់អ្នក..."
    }
};

const LAYOUT_DEFS = {
    A: { max: 3, type: 'v' }, B: { max: 4, type: 'v' }, C: { max: 4, type: 'v' },
    D: { max: 2, type: 'v' }, E: { max: 3, type: 'v' }, F: { max: 4, type: 'v' },
    G: { max: 3, type: 'v' }, H: { max: 2, type: 'v' }, I: { max: 1, type: 'h' },
    J: { max: 4, type: 'h' }, K: { max: 4, type: 'h' }, L: { max: 4, type: 'h' },
    M: { max: 2, type: 'h' }, N: { max: 4, type: 'h' }, O: { max: 2, type: 'h' }
};

// --- THEME & LANG MEMORY ---
(function initApp() {
    const savedTheme = localStorage.getItem('foto_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    window.addEventListener('DOMContentLoaded', () => {
        if (savedTheme === 'dark') {
            document.querySelector('.sun-path')?.classList.add('hidden');
            document.querySelector('.moon-path')?.classList.remove('hidden');
        }
        setLang(config.lang);
    });
})();

// --- DUO CONNECTION LOGIC ---
function initDuo(isHost) {
    isHostRole = isHost;
    peer = new Peer();
    
    peer.on('open', (id) => {
        if (isHost) {
            const shortCode = id.slice(0, 4).toUpperCase();
            alert("Share this Room ID: " + shortCode);
            isDuoMode = true;
        } else {
            const connectTo = prompt(i18n[config.lang].duoPromptCode).toLowerCase();
            conn = peer.connect(connectTo);
            isDuoMode = true;
            setupConn();
        }
    });

    peer.on('connection', (connection) => {
        conn = connection;
        isDuoMode = true;
        setupConn();
    });

    // Handle incoming media calls (remote video)
    peer.on('call', (call) => {
        if (!localStream) {
            // If camera not started yet, just remember to answer once it is
            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                localStream = stream;
                const v = document.getElementById('video');
                if (v) v.srcObject = localStream;
                call.answer(localStream);
            }).catch(() => {
                call.close();
            });
        } else {
            call.answer(localStream);
        }

        call.on('stream', (remoteStream) => {
            const rv = document.getElementById('remoteVideo');
            if (rv) {
                rv.srcObject = remoteStream;
                rv.classList.remove('hidden');
            }
        });
    });
}

function setupConn() {
    conn.on('data', (data) => {
        if (data.type === 'READY_REQUEST') {
            const ok = confirm(i18n[config.lang].duoConfirmReady);
            if (ok) {
                conn.send({ type: 'READY_CONFIRM' });
                alert("Nice! Get ready for the countdown.");
            } else {
                alert(i18n[config.lang].duoCancelSnap);
            }
        } else if (data.type === 'READY_CONFIRM') {
            if (isAwaitingReady) {
                isAwaitingReady = false;
                // Start synchronized capture on both sides
                conn.send({ type: 'SNAP_SIGNAL' });
                runCapture();
            }
        } else if (data.type === 'SNAP_SIGNAL') {
            runCapture(); 
        } else if (data.type === 'PHOTO_DATA') {
            photos.push(data.img);
            document.getElementById('count-num').innerText = photos.length;
            if (photos.length >= config.maxPhotos) renderEditor();
        }
    });

    // --- NEW: Connection Health Handlers ---
    conn.on('close', () => {
        alert(i18n[config.lang].duoPartnerDisconnected);
        location.reload();
    });

    conn.on('error', (err) => {
        console.error("Duo Error:", err);
        alert(i18n[config.lang].duoConnectionLost);
        location.reload();
    });

    // --- Added logic for Duo UI and Alert ---
    const badge = document.getElementById('duo-status');
    if (badge) badge.classList.remove('hidden');
    
    alert(i18n[config.lang].duoConnected);
    startApp();

    // If our camera is already running, initiate a media call from the JOIN side
    if (!isHostRole && localStream && peer && conn && conn.open) {
        const call = peer.call(conn.peer, localStream);
        call.on('stream', (remoteStream) => {
            const rv = document.getElementById('remoteVideo');
            if (rv) {
                rv.srcObject = remoteStream;
                rv.classList.remove('hidden');
            }
        });
    }
}

function syncShutter() {
    if (isDuoMode && conn && conn.open) {
        if (!isAwaitingReady) {
            isAwaitingReady = true;
            conn.send({ type: 'READY_REQUEST' });
            alert(i18n[config.lang].duoReadySent);
        }
    } else {
        runCapture();
    }
}

// --- NAVIGATION ---
function setLang(l) {
    config.lang = l;
    localStorage.setItem('foto_lang', l);
    document.querySelectorAll('.lang-toggle button').forEach(b => b.classList.toggle('active', b.id === `btn-${l}`));
    document.getElementById('btn-start').innerText = i18n[l].start;
    document.getElementById('title-layout').innerText = i18n[l].layout;
    document.getElementById('lbl-step1').innerText = i18n[l].step1;
    document.getElementById('lbl-step2').innerText = i18n[l].step2;
    document.getElementById('lbl-step3').innerText = i18n[l].step3;
    document.getElementById('title-frame').innerText = i18n[l].frame;
    document.getElementById('btn-save').innerText = i18n[l].save;
    document.getElementById('btn-discard').innerText = i18n[l].discard;
    const spotlightLbl = document.getElementById('lbl-spotlight');
    if (spotlightLbl) spotlightLbl.innerText = l === 'kh' ? "ការចងចាំ" : "Memories";
}

// theme toggle is already wired up in settings-shared.js.  the
// original inline handler here caused the button to fire twice (one
// listener from this file and one from settings-shared), which meant the
// theme would immediately flip back and the user would see no change.
// keeping the initialization code above but removing the click binding
// prevents the double-toggle bug.
//
// If you ever want to handle the toggle here instead of in
// settings-shared.js, just re-add a single listener or call
// settingsShared.toggleTheme();


function updateSteps(n) {
    document.getElementById('progress-bar').classList.toggle('hidden', n === 0);
    const spotlight = document.getElementById('spotlight-btn');
    if (spotlight) spotlight.classList.toggle('hidden', n !== 0);
    document.querySelectorAll('.step-box').forEach((box, i) => {
        box.classList.toggle('active', i + 1 <= n);
    });
}

function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function startApp() {
    photos = [];
    updateSteps(1);
    showView('view-layout');
}

function scrollLayouts(direction) {
    const viewport = document.getElementById('layout-viewport');
    viewport.scrollBy({ left: direction * 220, behavior: 'smooth' });
}

// --- CAMERA & CAPTURE ---
async function selectLayout(id) {
    const def = LAYOUT_DEFS[id];
    config.layout = id;
    config.maxPhotos = def.max;
    config.orientation = def.type;
    document.getElementById('max-num').innerText = config.maxPhotos;
    document.getElementById('count-num').innerText = "0";
    updateSteps(2);
    showView('view-camera');
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    localStream = stream;
    document.getElementById('video').srcObject = stream;

    // If we're in DUO mode and are the JOIN side, start the media call so we can see our partner
    if (isDuoMode && !isHostRole && peer && conn && conn.open) {
        const call = peer.call(conn.peer, localStream);
        call.on('stream', (remoteStream) => {
            const rv = document.getElementById('remoteVideo');
            if (rv) {
                rv.srcObject = remoteStream;
                rv.classList.remove('hidden');
            }
        });
    }
}

function setFilter(f) {
    config.filter = f;
    document.getElementById('video').style.filter = f;
    document.querySelectorAll('.f-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(f));
    });
}

function runCapture() {
    photos = [];
    document.getElementById('shutter').classList.add('hidden');
    autoSnap();
}

function autoSnap() {
    if (photos.length >= config.maxPhotos) {
        const stream = document.getElementById('video').srcObject;
        if (stream) stream.getTracks().forEach(track => track.stop());
        renderEditor();
        return;
    }
    let timer = 3;
    const cd = document.getElementById('countdown');
    cd.innerText = timer;
    cd.classList.remove('hidden');
    const interval = setInterval(() => {
        timer--;
        cd.innerText = timer;
        if (timer === 0) {
            clearInterval(interval);
            cd.classList.add('hidden');
            flash();
            takePhoto();
            document.getElementById('count-num').innerText = photos.length;
            setTimeout(autoSnap, 1000);
        }
    }, 1000);
}

function flash() {
    const f = document.getElementById('flash');
    f.style.opacity = 1;
    setTimeout(() => f.style.opacity = 0, 100);
}

function takePhoto() {
    const v = document.getElementById('video');
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    ctx.filter = config.filter;
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0);
    
    const localImg = c.toDataURL();
    photos.push(localImg);

    if (isDuoMode && conn && conn.open) {
        conn.send({ type: 'PHOTO_DATA', img: localImg });
    }
}

// --- STICKERS (shared with duo) ---
const STICKER_SETS = {
    Peppe: [
        'stickers/Peppe/sticker_1.webp',
        'stickers/Peppe/sticker_2.webp',
        'stickers/Peppe/sticker_3.webp',
        'stickers/Peppe/sticker_4.webp',
        'stickers/Peppe/sticker_5.webp',
        'stickers/Peppe/sticker_6.webp',
        'stickers/Peppe/sticker_7.webp',
        'stickers/Peppe/sticker_8.webp',
        'stickers/Peppe/sticker_9.png',
        'stickers/Peppe/sticker_10.webp',
        'stickers/Peppe/sticker_11.webp',
        'stickers/Peppe/sticker_12.webp',
        'stickers/Peppe/sticker_13.png',
        'stickers/Peppe/sticker_14.webp',
        'stickers/Peppe/sticker_15.webp',
        'stickers/Peppe/sticker_16.png',
        'stickers/Peppe/sticker_17.webp'
    ],
    'Pengo-motes': [
        'stickers/Pengo-motes/sticker_1.png',
        'stickers/Pengo-motes/sticker_2.webp',
        'stickers/Pengo-motes/sticker_3.png',
        'stickers/Pengo-motes/sticker_4.webp',
        'stickers/Pengo-motes/sticker_5.png',
        'stickers/Pengo-motes/sticker_7.png',
        'stickers/Pengo-motes/sticker_8.webp',
        'stickers/Pengo-motes/sticker_12.png',
        'stickers/Pengo-motes/sticker_13.png',
        'stickers/Pengo-motes/sticker_15.png',
        'stickers/Pengo-motes/sticker_19.png',
        'stickers/Pengo-motes/sticker_20.png',
        'stickers/Pengo-motes/sticker_14.webp',
        'stickers/Pengo-motes/sticker_22.webp',
        'stickers/Pengo-motes/sticker_23.png',
        'stickers/Pengo-motes/sticker_27.png',
        'stickers/Pengo-motes/sticker_penquin.png',
        'stickers/Pengo-motes/sticker_26.png'
    ]
};

function initStickerPanel() {
    const tabsEl = document.getElementById('sticker-tabs');
    const gridEl = document.getElementById('sticker-grid');
    if (!tabsEl || !gridEl) return;

    tabsEl.innerHTML = '';

    const categories = Object.keys(STICKER_SETS);
    categories.forEach((name, index) => {
        const btn = document.createElement('button');
        btn.className = 'sticker-tab-btn' + (index === 0 ? ' active' : '');
        btn.innerText = name;
        btn.onclick = () => {
            document.querySelectorAll('.sticker-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            populateStickerGrid(name);
        };
        tabsEl.appendChild(btn);
    });

    if (categories.length > 0) {
        populateStickerGrid(categories[0]);
    }
}

function populateStickerGrid(category) {
    const gridEl = document.getElementById('sticker-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    const stickers = STICKER_SETS[category] || [];
    stickers.forEach(src => {
        const cell = document.createElement('div');
        cell.className = 'sticker-thumb';
        const img = document.createElement('img');
        img.src = src;
        cell.appendChild(img);
        cell.onclick = () => addStickerInstance(src);
        gridEl.appendChild(cell);
    });
}

function addStickerInstance(src) {
    const strip = document.getElementById('final-strip');
    if (!strip) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'sticker-instance';

    const img = document.createElement('img');
    img.src = src;
    wrapper.appendChild(img);

    const handle = document.createElement('div');
    handle.className = 'sticker-handle';
    wrapper.appendChild(handle);

    strip.appendChild(wrapper);
    enableStickerDraggingAndResizing(wrapper, handle);
}

function enableStickerDraggingAndResizing(wrapper, handle) {
    let drag = false;
    let resize = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    let startWidth = 0;
    let startHeight = 0;

    wrapper.addEventListener('mousedown', (e) => {
        if (e.target === handle) return;
        drag = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = wrapper.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        e.preventDefault();
    });

    handle.addEventListener('mousedown', (e) => {
        resize = true;
        const rect = wrapper.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startWidth = rect.width;
        startHeight = rect.height;
        e.stopPropagation();
        e.preventDefault();
    });

    // touch support
    wrapper.addEventListener('touchstart', (e) => {
        if (e.target === handle) return;
        const t = e.touches[0];
        drag = true;
        startX = t.clientX;
        startY = t.clientY;
        const rect = wrapper.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        e.preventDefault();
    }, { passive: false });

    handle.addEventListener('touchstart', (e) => {
        const rect = wrapper.getBoundingClientRect();
        const t = e.touches[0];
        resize = true;
        startX = t.clientX;
        startY = t.clientY;
        startWidth = rect.width;
        startHeight = rect.height;
        e.stopPropagation();
        e.preventDefault();
    }, { passive: false });

    function handlePointerMove(clientX, clientY) {
        const strip = document.getElementById('final-strip');
        if (!strip) return;
        const stripRect = strip.getBoundingClientRect();

        if (drag) {
            const dx = clientX - startX;
            const dy = clientY - startY;
            const newLeft = startLeft + dx - stripRect.left;
            const newTop = startTop + dy - stripRect.top;
            wrapper.style.left = `${newLeft}px`;
            wrapper.style.top = `${newTop}px`;
            wrapper.style.transform = '';
        } else if (resize) {
            const dx = clientX - startX;
            const dy = clientY - startY;
            const size = Math.max(30, startWidth + dx, startHeight + dy);
            wrapper.style.width = `${size}px`;
            wrapper.style.height = `${size}px`;
        }
    }

    document.addEventListener('mousemove', (e) => {
        handlePointerMove(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', () => {
        drag = false;
        resize = false;
    });

    document.addEventListener('touchmove', (e) => {
        if (!drag && !resize) return;
        const t = e.touches[0];
        handlePointerMove(t.clientX, t.clientY);
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => {
        drag = false;
        resize = false;
    });
}

// --- EDITOR & DESIGN ---
function renderEditor() {
    updateSteps(3);
    showView('view-editor');
    const inner = document.getElementById('strip-inner');
    inner.innerHTML = '';
    inner.className = config.orientation === 'v' ? "v-mode" : "h-mode"; 
    inner.classList.add(`mode-${config.layout}`);
    photos.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        inner.appendChild(img);
    });

    // initialize stickers once editor is visible
    initStickerPanel();
}

function changeDesign(type) {
    const strip = document.getElementById('final-strip');
    const footer = document.getElementById('strip-footer-text');
    
    strip.classList.remove('film-mode', 'frame-90s', 'frame-polaroid');
    strip.style.backgroundColor = "";

    if (type === 'film') {
        strip.classList.add('film-mode');
        strip.style.backgroundColor = '#111111';
        footer.style.color = '#555';
    } else if (type === '90s') {
        strip.classList.add('frame-90s');
        footer.style.color = '#111';
    } else if (type === 'polaroid') {
        strip.classList.add('frame-polaroid');
        strip.style.backgroundColor = '#ffffff';
        footer.style.color = '#111';
    } else {
        const colorMap = { 'white': '#ffffff', 'pink': '#fce4ec' };
        strip.style.backgroundColor = colorMap[type] || type;
        footer.style.color = '#111';
    }
}

// --- EXPORT ENGINE ---
function generateDownload() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const isV = config.orientation === 'v';
    const strip = document.getElementById('final-strip');
    
    canvas.width = isV ? 600 : 1800;
    canvas.height = isV ? 1800 : 1200;

    let bgColor = window.getComputedStyle(strip).backgroundColor;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (strip.classList.contains('frame-90s')) {
        ctx.fillStyle = "rgba(0,0,0,0.02)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const pad = 50;
    const gap = 25;
    const bottomSpace = strip.classList.contains('frame-polaroid') ? 220 : 120;
    const usableW = canvas.width - (pad * 2);
    const usableH = canvas.height - (pad * 2) - bottomSpace;

    photos.forEach((src, i) => {
        const img = new Image();
        img.src = src;
        let x, y, w, h;

        if (isV) {
            let rows = (config.layout === 'F') ? 2 : config.maxPhotos;
            let cols = (config.layout === 'F') ? 2 : 1;
            w = (usableW / cols) - (cols > 1 ? gap/2 : 0);
            h = (usableH / rows) - gap;
            x = pad + (i % cols) * (w + gap);
            y = pad + Math.floor(i / cols) * (h + gap);
        } else {
            if (config.layout === 'J') {
                if (i === 0) { w = usableW; h = usableH * 0.65; x = pad; y = pad; }
                else { w = (usableW/3) - gap; h = usableH * 0.3; x = pad + (i-1)*(w+gap); y = pad + (usableH*0.65) + gap; }
            } else if (config.layout === 'I') {
                w = usableW; h = usableH; x = pad; y = pad;
            } else {
                let cols = 2;
                w = (usableW / cols) - gap/2;
                h = (config.maxPhotos > 2) ? (usableH / 2 - gap/2) : usableH;
                x = pad + (i % cols) * (w + gap);
                y = pad + Math.floor(i / cols) * (h + gap);
            }
        }
        ctx.drawImage(img, x, y, w, h);
    });

    // draw stickers on top
    const stripRect = strip.getBoundingClientRect();
    const stickers = strip.querySelectorAll('.sticker-instance img');
    stickers.forEach(el => {
        const wrapper = el.parentElement;
        const r = wrapper.getBoundingClientRect();
        const scaleX = canvas.width / stripRect.width;
        const scaleY = canvas.height / stripRect.height;
        const x = (r.left - stripRect.left) * scaleX;
        const y = (r.top - stripRect.top) * scaleY;
        const w = r.width * scaleX;
        const h = r.height * scaleY;
        ctx.drawImage(el, x, y, w, h);
    });

    const isDarkFrame = (bgColor === "rgb(17, 17, 17)");
    const textColor = isDarkFrame ? "#ffffff" : "#111111";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.font = "900 40px Inter";
    ctx.fillText("FOTO.", canvas.width / 2, canvas.height - (bottomSpace/2 + 10));
    
    const now = new Date();
    const timeStr = now.toLocaleDateString() + " " + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    ctx.font = "600 18px Inter";
    ctx.globalAlpha = isDarkFrame ? 0.3 : 0.4;
    ctx.fillText(timeStr, canvas.width / 2, canvas.height - (bottomSpace/2 - 25));
    ctx.globalAlpha = 1.0;
    
    return canvas.toDataURL('image/png', 1.0);
}

function finishSession() {
    const btn = document.getElementById('btn-save');
    btn.innerText = "Generating...";
    btn.disabled = true;
    setTimeout(() => {
        const finalImage = generateDownload();
        const gallery = JSON.parse(localStorage.getItem('foto_gallery') || '[]');
        gallery.unshift(finalImage);
        localStorage.setItem('foto_gallery', JSON.stringify(gallery.slice(0, 15)));
        const link = document.createElement('a');
        link.download = `FOTO_${Date.now()}.png`;
        link.href = finalImage;
        link.click();
        btn.innerText = "Saved!";
        setTimeout(() => location.reload(), 1500);
    }, 500);
}
