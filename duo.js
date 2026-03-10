let peer = null;
let conn = null;
let localStream = null;
let photos = [];
let isHost = false;
let isWaitingForReady = false;
let isWaitingForDesign = false;
let isWaitingForRetake = false;
let roomShortCode = "----";

// create a simple 4-char alphanumeric code for the room/peer ID
function generateRoomCode() {
    // use base36 to get letters+digits, trim leading "0."
    return Math.random().toString(36).substr(2, 4);
}

// --- language support ---------------------------------------------------
let currentLang = localStorage.getItem('foto_lang') || 'en';

const duoStrings = {
    en: {
        title: 'Duo mode',
        sub: 'Grab a friend and connect with a simple code.',
        shareLabel: 'Share this 4‑character code with your partner:',
        hint: 'Just read them the code above; your partner will paste it in the next screen.',
        layoutSub: 'Duo mode supports these styles only.',
        enterLabel: 'Enter the 4‑character code your host gave you:',
        hostBtn: 'Host',
        joinBtn: 'Join',
        nextLayout: 'Next: Pick layout',
        continueCamera: 'Continue to camera',
        you: 'YOU',
        partner: 'PARTNER',
        filterNatural: 'Natural',
        filterBW: 'B&W',
        filterRetro: 'Retro',
        filterVivid: 'Vivid',
        step1: 'Layout',
        step2: 'Snap',
        step3: 'Design',

        statusHosting: 'Hosting room ',
        statusJoining: 'Joining a room',
        statusEnterCode: 'Please paste the ID.',
        statusConnecting: 'Connecting...',
        statusConnected: 'Connected! Pick layout and continue.',
        statusConnectedTo: 'Connected to ',
        statusCameraWaiting: 'Camera on. Waiting for partner...',
        statusCameraDenied: 'Camera access denied.'
    },
    kh: {
        title: 'ម៉ូដឌូ',
        sub: 'ហៅមិត្តភក្តិមក និងភ្ជាប់ដោយកូដសាមញ្ញ។',
        shareLabel: 'ចែករំលែកកូដ ៤ តួអក្សរនេះជាមួយដៃគូរបស់អ្នក៖',
        hint: 'ប្រាប់ពួកគេពីកូដខាងលើ។ ដៃគូររបស់អ្នកនឹងបម្លែងវាទៅក្នុងអេក្រង់បន្ទាប់។',
        layoutSub: 'ម៉ូដឌូគាំទ្រព្រមទាំងប្លង់ទាំងនេះតែប៉ុណ្ណោះ។',
        enterLabel: 'បញ្ចូលកូដ ៤ តួអក្សរដែលអ្នកផ្ដបាន៖',
        hostBtn: 'ម្ចាស់',
        joinBtn: 'ចូល',
        nextLayout: 'បន្ទាប់៖ ជ្រើសប្លង់',
        continueCamera: 'ទៅកាមេរ៉ា',
        you: 'អ្នក',
        partner: 'ដៃគូ',
        filterNatural: 'ធម្មជាតិ',
        filterBW: 'ខ្មៅស',
        filterRetro: 'រ៉ែត្រូ',
        filterVivid: 'ចម្រុះ',
        step1: 'ម៉ូត',
        step2: 'ថតរូប',
        step3: 'រចនា',

        statusHosting: 'កំពុងធ្វើម្ចាស់បន្ទប់ ',
        statusJoining: 'កំពុងចូលកន្លែង',
        statusEnterCode: 'សូមបញ្ចូលកូដ។',
        statusConnecting: 'កំពុងភ្ជាប់...',
        statusConnected: 'បានភ្ជាប់! ជ្រើសប្លង់ហើយបន្ត។',
        statusConnectedTo: 'បានភ្ជាប់ទៅ ',
        statusCameraWaiting: 'កាមេរ៉ាដំណើរការ។ កំពុងរង់ចាំដៃគូ...',
        statusCameraDenied: 'ការកម្មង់កាមេរ៉ាត្រូវបានដាច់។'
    }
};

function applyDuoLang(lang) {
    currentLang = lang;
    document.title = 'FOTO. | ' + duoStrings[lang].title;
    document.getElementById('duo-title').innerText = duoStrings[lang].title;
    document.getElementById('duo-sub').innerText = duoStrings[lang].sub;
    const layoutSubEl = document.getElementById('duo-layout-sub');
    if (layoutSubEl) layoutSubEl.innerText = duoStrings[lang].layoutSub;
    document.getElementById('duo-share-label').innerText = duoStrings[lang].shareLabel;
    document.getElementById('duo-hint').innerText = duoStrings[lang].hint;
    document.getElementById('duo-enter-label').innerText = duoStrings[lang].enterLabel;
    document.getElementById('btn-host').innerText = duoStrings[lang].hostBtn;
    document.getElementById('btn-join').innerText = duoStrings[lang].joinBtn;
    document.getElementById('btn-next-layout').innerText = duoStrings[lang].nextLayout;
    document.getElementById('btn-cont-camera').innerText = duoStrings[lang].continueCamera;
    document.getElementById('label-you').innerText = duoStrings[lang].you;
    document.getElementById('label-partner').innerText = duoStrings[lang].partner;

    // filters
    document.getElementById('filter-natural').innerText = duoStrings[lang].filterNatural;
    document.getElementById('filter-bw').innerText = duoStrings[lang].filterBW;
    document.getElementById('filter-retro').innerText = duoStrings[lang].filterRetro;
    document.getElementById('filter-vivid').innerText = duoStrings[lang].filterVivid;

    // progress steps
    const s1 = document.getElementById('duo-step1');
    const s2 = document.getElementById('duo-step2');
    const s3 = document.getElementById('duo-step3');
    if (s1) s1.innerText = duoStrings[lang].step1;
    if (s2) s2.innerText = duoStrings[lang].step2;
    if (s3) s3.innerText = duoStrings[lang].step3;
}

// listen for language change notifications from settings-shared
window.addEventListener('fotoLangChange', e => applyDuoLang(e.detail));

// Sticker categories. Update these paths to match your sticker folders.
const STICKER_SETS = {
    Peppe: [
        'stickers/Peppe/peppe-heart.png',
        'stickers/Peppe/peppe-sad.png',
        'stickers/Peppe/peppe-love.png'
    ],
    'Pengo-motes': [
        'stickers/Pengo-motes/pengo-smile.png',
        'stickers/Pengo-motes/pengo-cry.png'
    ]
};

const DUO_LAYOUT_DEFS = {
    D: { max: 2 },
    F: { max: 4 },
    K: { max: 4 },
    L: { max: 4 },
    M: { max: 2 },
    N: { max: 4 },
    O: { max: 2 }
};

const config = {
    layout: "D",
    maxPhotos: DUO_LAYOUT_DEFS.D.max,
    filter: "none"
};

function updateDuoSteps(step) {
    const bar = document.getElementById('progress-bar');
    if (!bar) return;
    const boxes = bar.querySelectorAll('.step-box');
    boxes.forEach((box, idx) => {
        box.classList.toggle('active', idx + 1 <= step);
    });
}

function showNextButton() {
    const next = document.getElementById('next-step');
    if (next) {
        next.classList.remove('hidden');
    }
}

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

    document.addEventListener('mousemove', (e) => {
        const strip = document.getElementById('final-strip');
        if (!strip) return;
        const stripRect = strip.getBoundingClientRect();

        if (drag) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newLeft = startLeft + dx - stripRect.left;
            const newTop = startTop + dy - stripRect.top;
            wrapper.style.left = `${newLeft}px`;
            wrapper.style.top = `${newTop}px`;
            wrapper.style.transform = ''; // disable centering transform once moved
        } else if (resize) {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const size = Math.max(30, startWidth + dx, startHeight + dy);
            wrapper.style.width = `${size}px`;
            wrapper.style.height = `${size}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        drag = false;
        resize = false;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DUO.JS: Page loaded, initializing...');
    updateDuoSteps(1);
    applyDuoLang(currentLang);
    initStickerPanel();
    console.log('DUO.JS: Initialization complete');
});

// ----- UI FLOW -----
function setActivePanel(id) {
    ['role-screen', 'layout-screen', 'call-screen', 'design-screen'].forEach(pid => {
        const el = document.getElementById(pid);
        if (!el) return;
        el.classList.toggle('active', pid === id);
        el.classList.toggle('hidden', pid !== id);
    });
}

function updateStatus(text) {
    const s = document.getElementById('duo-status-text');
    if (s) s.innerText = text;
}

function chooseRole(role) {
    console.log('chooseRole called with:', role);
    
    if (!peer) {
        console.log('Creating new Peer...');
        if (role === 'host') {
            // generate a 4‑char code and use it as the actual PeerJS id so that
            // the joiner can simply supply the same string later
            roomShortCode = generateRoomCode();
            peer = new Peer(roomShortCode);
        } else {
            peer = new Peer();
        }

        peer.on('connection', handleIncomingConnection);
        peer.on('call', handleIncomingCall);
        peer.on('error', (err) => {
            console.error('Peer error:', err);
            // if the host id was already taken, pick a new one and retry
            if (role === 'host' && err.type === 'unavailable-id') {
                console.warn('Room code collision, generating new code');
                // create a fresh peer and overwrite old one
                peer.destroy();
                peer = null;
                chooseRole('host');
                return;
            }
            alert('Connection Error: ' + err.type + '. Please try again.');
        });
        peer.on('open', id => {
            console.log('Peer opened with ID:', id);
            roomShortCode = id; // host will have chosen this already
            const codeSpan = document.getElementById('room-code');
            if (codeSpan && isHost) {
                // display the code directly (it's already short)
                codeSpan.textContent = roomShortCode.toUpperCase();
            }
        });
    }

    if (role === 'host') {
        console.log('Setting as host');
        isHost = true;
        const hostPanel = document.getElementById('host-panel');
        const joinPanel = document.getElementById('join-panel');
        console.log('Host panel found:', !!hostPanel, 'Join panel found:', !!joinPanel);
        if (hostPanel) hostPanel.classList.remove('hidden');
        if (joinPanel) joinPanel.classList.add('hidden');
        updateStatus(duoStrings[currentLang].statusHosting + (roomShortCode ? roomShortCode.slice(0, 4).toUpperCase() : 'Loading...'));
    } else {
        console.log('Setting as joiner');
        isHost = false;
        const hostPanel = document.getElementById('host-panel');
        const joinPanel = document.getElementById('join-panel');
        console.log('Host panel found:', !!hostPanel, 'Join panel found:', !!joinPanel);
        if (hostPanel) hostPanel.classList.add('hidden');
        if (joinPanel) joinPanel.classList.remove('hidden');
        updateStatus(duoStrings[currentLang].statusJoining);
    }
}

function connectJoin() {
    const input = document.getElementById('join-code');
    const status = document.getElementById('join-status');
    if (!input) return;
    const code = input.value.trim().toLowerCase();
    if (!code) {
        if (status) status.innerText = duoStrings[currentLang].statusEnterCode;
        return;
    }
    if (!peer) {
        peer = new Peer();
        peer.on('connection', handleIncomingConnection);
        peer.on('call', handleIncomingCall);
        peer.on('open', () => doConnect(code));
    } else {
        doConnect(code);
    }
}

function doConnect(code) {
    const status = document.getElementById('join-status');
    if (status) status.innerText = duoStrings[currentLang].statusConnecting;

    // our host uses the 4‑char ID itself, so the value provided is the
    // entire peer ID (no slicing required).  case is normalized already.
    const fullCode = code.toLowerCase().trim();

    conn = peer.connect(fullCode);

    // Set up event handlers immediately after creating connection
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        alert('Failed to connect: "' + fullCode + '" is invalid or the host is offline.\n\nMake sure you typed the correct 4‑character code from the host.');
        if (status) status.innerText = 'Connection failed. Check the code!';
    });
    conn.on('open', () => {
        if (status) status.innerText = duoStrings[currentLang].statusConnected;
        updateStatus(duoStrings[currentLang].statusConnectedTo + fullCode.slice(0, 4).toUpperCase());
        setShutterVisible(true);
        // For joiner, hide input/join button and wait for host to select layout
        if (!isHost) {
            document.getElementById('join-code').style.display = 'none';
            document.querySelector('#join-panel .duo-primary').style.display = 'none';
            if (status) status.innerText = 'Connected! Waiting for host to select layout...';
        }
    });

    setupDataListeners();
}

function goToLayout() {
    setActivePanel('layout-screen');
    updateDuoSteps(1);
}

function setDuoLayout(code, el) {
    if (!DUO_LAYOUT_DEFS[code]) return;
    config.layout = code;
    config.maxPhotos = DUO_LAYOUT_DEFS[code].max;

    const cards = document.querySelectorAll('.duo-layout-card');
    cards.forEach(btn => btn.classList.remove('active'));
    if (el) el.classList.add('active');
}

async function enterCall() {
    setActivePanel('call-screen');
    updateDuoSteps(2);
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        const localVideo = document.getElementById('localVideo');
        if (localVideo) localVideo.srcObject = localStream;
        updateStatus(duoStrings[currentLang].statusCameraWaiting);

        if (conn && conn.open && peer) {
            // Both sides initiate a call to ensure the media stream is exchanged
            // Host calls first, but joiner also calls to guarantee symmetry
            const call = peer.call(conn.peer, localStream);
            call.on('stream', remoteStream => {
                const rv = document.getElementById('remoteVideo');
                if (rv) rv.srcObject = remoteStream;
                console.log('Received remote stream');
            });
            call.on('error', (err) => {
                console.error('Call error:', err);
            });
        }
        // If host, notify joiner to start their camera
        if (isHost && conn && conn.open) {
            conn.send({ type: 'ENTER_CAMERA', ready: true });
        }
        // Joiner notifies host that their camera is ready
        if (!isHost && conn && conn.open) {
            conn.send({ type: 'CAMERA_READY', ready: true });
        }
    } catch (err) {
        console.error('Camera error:', err);
        alert(duoStrings[currentLang].statusCameraDenied + ' (' + err.message + ')');
        setActivePanel('layout-screen');
    }
}

// ----- PEERJS HANDLERS -----
function handleIncomingConnection(connection) {
    conn = connection;
    setupDataListeners();
    updateStatus('Partner connected');
    setShutterVisible(true);
    // Hide the full ID once connected
    if (isHost) {
        const codeSpan = document.getElementById('room-code');
        if (codeSpan) codeSpan.innerHTML = 'Partner connected!';
    }
}

function handleIncomingCall(call) {
    console.log('Incoming call received');
    if (!localStream) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                localStream = stream;
                const v = document.getElementById('localVideo');
                if (v) {
                    v.srcObject = localStream;
                    console.log('Local video element updated');
                }
                call.answer(localStream);
                console.log('Call answered with stream');
            })
            .catch(err => {
                console.error('Failed to get media on incoming call:', err);
                call.close();
            });
    } else {
        console.log('Local stream already exists, answering with it');
        call.answer(localStream);
    }

    call.on('stream', remoteStream => {
        console.log('Remote stream received from incoming call');
        const rv = document.getElementById('remoteVideo');
        if (rv) {
            rv.srcObject = remoteStream;
            console.log('Remote video element updated');
        }
    });
    
    call.on('error', (err) => {
        console.error('Incoming call error:', err);
    });
}

function setShutterVisible(visible) {
    const s = document.getElementById('shutter');
    if (!s) return;
    s.classList.toggle('hidden', !visible);

    // hide/show continue button together with shutter in normal flow
    const next = document.getElementById('next-step');
    if (next && visible) {
        next.classList.add('hidden');
    }
}

// Setup handlers for incoming data messages about camera readiness
function setupDataListeners() {
    if (!conn) return;
    conn.on('data', data => {
        if (data.type === 'SYNC_SNAP') {
            startCountdown();
        } else if (data.type === 'READY_REQUEST') {
            const ok = confirm('Your partner wants to take photos. Ready?');
            if (ok) {
                conn.send({ type: 'READY_OK' });
            }
        } else if (data.type === 'READY_OK') {
            if (isWaitingForReady) {
                isWaitingForReady = false;
                conn.send({ type: 'SYNC_SNAP' });
                startCountdown();
            }
        } else if (data.type === 'NEXT_REQUEST') {
            const ok = confirm('Your partner wants to continue to design. Ready?');
            if (ok) {
                conn.send({ type: 'NEXT_OK' });
                renderDuoEditor();
            }
        } else if (data.type === 'NEXT_OK') {
            if (isWaitingForDesign) {
                isWaitingForDesign = false;
                renderDuoEditor();
            }
        } else if (data.type === 'RETAKE_REQUEST') {
            const ok = confirm('Your partner wants to retake the photos. Retake now?');
            if (ok) {
                conn.send({ type: 'RETAKE_OK' });
                startRetakeFlow();
            }
        } else if (data.type === 'RETAKE_OK') {
            if (isWaitingForRetake) {
                isWaitingForRetake = false;
                startRetakeFlow();
            }
        } else if (data.type === 'ENTER_CAMERA') {
            // Host is telling joiner to start camera
            console.log('Host says: Enter camera');
            enterCall();
        } else if (data.type === 'CAMERA_READY') {
            // Joiner is telling host they are ready
            console.log('Joiner camera is ready');
        }
    });
    
    conn.on('close', () => {
        // Partner left the Duo room; keep this page open so any open editor tab still works
        alert('Your partner has left the Duo session.');
    });
}

function setDuoFilter(f, btn) {
    config.filter = f;
    const localV = document.getElementById('localVideo');
    const remoteV = document.getElementById('remoteVideo');
    [localV, remoteV].forEach(v => {
        if (v) v.style.filter = f;
    });

    const pills = document.querySelectorAll('.duo-filters .f-pill');
    pills.forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
}


// --- DESIGN / EDITOR ---
function renderDuoEditor() {
    updateDuoSteps(3);
    setActivePanel('design-screen');
    const inner = document.getElementById('strip-inner');
    inner.innerHTML = '';

    // vertical layouts in duo: D, F. Others use horizontal engine.
    const isVertical = config.layout === 'D' || config.layout === 'F';
    inner.className = isVertical ? 'v-mode' : 'h-mode';
    inner.classList.add(`mode-${config.layout}`);

    photos.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        inner.appendChild(img);
    });
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

function generateDownload() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const isV = config.layout === 'D' || config.layout === 'F';
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

    // draw photos according to orientation (simple strip)
    photos.forEach((src, i) => {
        const img = new Image();
        img.src = src;
        let x, y, w, h;
        if (isV) {
            w = usableW;
            h = (usableH - (photos.length - 1) * gap) / photos.length;
            x = pad;
            y = pad + i * (h + gap);
        } else {
            h = usableH;
            w = (usableW - (photos.length - 1) * gap) / photos.length;
            x = pad + i * (w + gap);
            y = pad;
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

    const now = new Date();
    const timeStr = now.toLocaleDateString() + " " + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    ctx.fillStyle = '#111';
    ctx.textAlign = "center";
    ctx.font = "900 40px Inter";
    ctx.fillText("FOTO.", canvas.width / 2, canvas.height - (bottomSpace/2 + 10));
    ctx.font = "600 18px Inter";
    ctx.globalAlpha = 0.4;
    ctx.fillText(timeStr, canvas.width / 2, canvas.height - (bottomSpace/2 - 25));
    ctx.globalAlpha = 1.0;
    
    return canvas.toDataURL('image/png', 1.0);
}

function finishSession() {
    const btn = document.getElementById('btn-save');
    if (btn) {
        btn.innerText = "Generating...";
        btn.disabled = true;
    }
    setTimeout(() => {
        const finalImage = generateDownload();
        const gallery = JSON.parse(localStorage.getItem('foto_gallery') || '[]');
        gallery.unshift(finalImage);
        localStorage.setItem('foto_gallery', JSON.stringify(gallery.slice(0, 15)));
        const link = document.createElement('a');
        link.download = `FOTO_${Date.now()}.png`;
        link.href = finalImage;
        link.click();
        if (btn) {
            btn.innerText = "Saved!";
            setTimeout(() => location.reload(), 1500);
        } else {
            location.reload();
        }
    }, 500);
}

function syncShutter() {
    // Solo fallback if not connected
    if (!conn || !conn.open) {
        // No partner yet – do not allow snapping in Duo mode
        alert('Waiting for your partner to join before snapping.');
        return;
    }
    if (!isWaitingForReady) {
        isWaitingForReady = true;
        conn.send({ type: 'READY_REQUEST' });
        alert('Ready request sent. Waiting for your partner...');
    }
}

function startCountdown() {
    let timer = 3;
    const cd = document.getElementById('countdown');
    const shutter = document.getElementById('shutter');
    
    if (shutter) shutter.classList.add('hidden');
    if (!cd) return;

    cd.classList.remove('hidden');
    cd.innerText = timer;

    const interval = setInterval(() => {
        timer--;
        cd.innerText = timer;
        if (timer === 0) {
            clearInterval(interval);
            cd.classList.add('hidden');
            captureLocal();
            
            if (photos.length < config.maxPhotos) {
                setTimeout(startCountdown, 1500);
            } else {
                // finished all snaps for this layout: show Continue in place of shutter
                const next = document.getElementById('next-step');
                if (next) next.classList.remove('hidden');
            }
        }
    }, 1000);
}

function captureLocal() {
    const v = document.getElementById('localVideo');
    const r = document.getElementById('remoteVideo');
    if (!v) return;
    const c = document.createElement('canvas');
    const w = v.videoWidth || 640;
    const h = v.videoHeight || 480;
    c.width = w; 
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.filter = config.filter || 'none';
    
    // Left half: host
    ctx.drawImage(v, 0, 0, w / 2, h);

    // Right half: partner (fallback to host if remote not ready)
    if (r && r.videoWidth && r.videoHeight) {
        ctx.drawImage(r, w / 2, 0, w / 2, h);
    } else {
        ctx.drawImage(v, w / 2, 0, w / 2, h);
    }
    
    photos.push(c.toDataURL('image/png'));
    
    const flash = document.getElementById('flash');
    if (flash) {
        flash.style.opacity = 1;
        setTimeout(() => flash.style.opacity = 0, 100);
    }
}

function finishDuoSession() {
    // Save the final designed image into the shared gallery, but keep the Duo tab open
    finishSession();
}

function requestDesignStep() {
    // If no peer connection, just show local editor
    if (!conn || !conn.open) {
        renderDuoEditor();
        return;
    }

    if (!isWaitingForDesign) {
        isWaitingForDesign = true;
        conn.send({ type: 'NEXT_REQUEST' });
        alert('Continue request sent. Waiting for your partner...');
    }
}

function startRetakeFlow() {
    // Clear current combined photos and go back to camera step
    photos = [];
    setActivePanel('call-screen');
    updateDuoSteps(2);

    // Hide continue button, show shutter again
    const next = document.getElementById('next-step');
    if (next) next.classList.add('hidden');
    setShutterVisible(true);
}

function requestRetake() {
    // If no connection, just locally reset to camera
    if (!conn || !conn.open) {
        startRetakeFlow();
        return;
    }

    if (!isWaitingForRetake) {
        isWaitingForRetake = true;
        conn.send({ type: 'RETAKE_REQUEST' });
        alert('Retake request sent. Waiting for your partner...');
    }
}