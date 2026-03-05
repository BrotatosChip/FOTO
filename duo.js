let peer = null;
let conn = null;
let localStream = null;
let photos = [];
let isHost = false;
let isWaitingForReady = false;
let roomShortCode = "----";

// --- language support ---------------------------------------------------
let currentLang = localStorage.getItem('foto_lang') || 'en';

const duoStrings = {
    en: {
        title: 'Duo mode',
        sub: 'Grab a friend and connect with a simple code.',
        shareLabel: 'Share this code with your partner:',
        hint: 'After they join, you’ll pick a layout together.',
        layoutSub: 'Duo mode supports these styles only.',
        enterLabel: 'Enter the 4-letter/number code from your host:',
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
        statusEnterCode: 'Please enter a code.',
        statusConnecting: 'Connecting...',
        statusConnected: 'Connected! Pick layout and continue.',
        statusConnectedTo: 'Connected to ',
        statusCameraWaiting: 'Camera on. Waiting for partner...',
        statusCameraDenied: 'Camera access denied.'
    },
    kh: {
        title: 'ម៉ូដឌូ',
        sub: 'ហៅមិត្តភក្តិមក និងភ្ជាប់ដោយកូដសាមញ្ញ។',
        shareLabel: 'ចែករំលែកកូដនេះជាមួយដៃគូរបស់អ្នក៖',
        hint: 'បន្ទាប់ពីពួកគាខាប់ចូល អ្នកនឹងជ្រើសរើសប្លង់ដោយរួមគ្នា។',
        layoutSub: 'ម៉ូដឌូគាំទ្រព្រមទាំងប្លង់ទាំងនេះតែប៉ុណ្ណោះ។',
        enterLabel: 'បញ្ចូលកូដ ៤ អក្សរ/លេខពីអ្នកផ្ដ៖',
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

document.addEventListener('DOMContentLoaded', () => {
    updateDuoSteps(1);
    applyDuoLang(currentLang);
});

// ----- UI FLOW -----
function setActivePanel(id) {
    ['role-screen', 'layout-screen', 'call-screen'].forEach(pid => {
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
    if (!peer) {
        peer = new Peer();
        peer.on('connection', handleIncomingConnection);
        peer.on('call', handleIncomingCall);
        peer.on('error', (err) => {
            console.error('Peer error:', err);
            alert('Connection Error: ' + err.type + '. Please try again.');
        });
    }

    if (role === 'host') {
        isHost = true;
        const hostPanel = document.getElementById('host-panel');
        const joinPanel = document.getElementById('join-panel');
        if (hostPanel) hostPanel.classList.remove('hidden');
        if (joinPanel) joinPanel.classList.add('hidden');

        peer.on('open', id => {
            roomShortCode = id.slice(0, 4).toUpperCase();
            const codeSpan = document.getElementById('room-code');
            if (codeSpan) codeSpan.innerText = roomShortCode;
            updateStatus(duoStrings[currentLang].statusHosting + roomShortCode);
        });
    } else {
        isHost = false;
        const hostPanel = document.getElementById('host-panel');
        const joinPanel = document.getElementById('join-panel');
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
    conn = peer.connect(code);
    
    conn.on('error', (err) => {
        console.error('Connection error:', err);
        alert('Failed to connect: Invalid code or host is offline. Please check the code and try again.');
        if (status) status.innerText = 'Connection failed. Check the code!';
    });
    
    setupDataListeners();
    conn.on('open', () => {
        if (status) status.innerText = duoStrings[currentLang].statusConnected;
        updateStatus(duoStrings[currentLang].statusConnectedTo + code.toUpperCase());
        setShutterVisible(true);
    });
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

        if (!isHost && conn && conn.open) {
            // JOIN side calls HOST with video
            const call = peer.call(conn.peer, localStream);
            call.on('stream', remoteStream => {
                const rv = document.getElementById('remoteVideo');
                if (rv) rv.srcObject = remoteStream;
            });
        } else {
            // If we are host and already have a connection, wait for partner to call us
        }
    } catch (err) {
        alert(duoStrings[currentLang].statusCameraDenied);
    }
}

// ----- PEERJS HANDLERS -----
function handleIncomingConnection(connection) {
    conn = connection;
    setupDataListeners();
    updateStatus('Partner connected');
    setShutterVisible(true);
}

function handleIncomingCall(call) {
    if (!localStream) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
            localStream = stream;
            const v = document.getElementById('localVideo');
            if (v) v.srcObject = localStream;
            call.answer(localStream);
        }).catch(() => {
            call.close();
        });
    } else {
        call.answer(localStream);
    }

    call.on('stream', remoteStream => {
        const rv = document.getElementById('remoteVideo');
        if (rv) rv.srcObject = remoteStream;
    });
}

function setShutterVisible(visible) {
    const s = document.getElementById('shutter');
    if (!s) return;
    s.classList.toggle('hidden', !visible);
}

// ----- DATA CHANNEL / READY-UP -----
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
        }
    });
    
    conn.on('close', () => {
        alert('Partner left the room.');
        window.location.href = 'index.html';
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
                finishDuoSession();
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
    localStorage.setItem('duo_photos', JSON.stringify(photos));
    localStorage.setItem('duo_layout', config.layout);
    window.location.href = 'index.html?mode=edit';
}
