const firebaseConfig = {
    apiKey: "AIzaSyCft0F9eXhL4BerMbYoi7K6cVkBs8MhBqU",
    authDomain: "mdt-chp.firebaseapp.com",
    projectId: "mdt-chp",
    storageBucket: "mdt-chp.firebasestorage.app",
    messagingSenderId: "244207302651",
    appId: "1:244207302651:web:5f82587e90772f2d607d5e",
    measurementId: "G-T6X4VYJPLV"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
let users = {};
let jsaNews = [];
let jsaRequests = [];
let reports = [];
let gangs = [];
let shootingStats = {};
let drafts = JSON.parse(localStorage.getItem('cpd_v5_drafts')) || {}; 
let currentUser = null;
let currentMode = "PATROL";
let loadedPhotos = [];
let chicagoLaws = [];

// Точные шаблоны отчетов
const TEMPLATES = {
    incident: `CHICAGO POLICE DEPARTMENT\nРАПОРТ ОБ ИНЦИДЕНТЕ\n--\nФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка на рации)\nДата, время и место происшествия: XX-XX-2026 |\nXX-XX | (Указать место)\nОбстоятельства инцидента:\n(Тут описать всю ситуацию)\n\nЛица, причастные к инциденту:\n(Вписать ники как сотрудников причастных так и свидетелей при наличии)\n\nПредварительные выводы:\n(Опишите тут свой предварительный вывод по ситуации.)\n\nПринятые меры:\n((Тут описать все ваши принятые меры.)\n)\n__\n\nДата: XX.XX.2026\nВремя: XX-XX |\nXX-XX`,
    accident: `CHICAGO POLICE DEPARTMENT\nОТЧЕТ О ПРОИСШЕСТВИИ\n--\nФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка на рации)\nДата, время и место происшествия: XX-XX-2026 |\nXX-XX | (Указать место)\nОбстоятельства инцидента:\n(Тут описать всю ситуацию)\n\nЛица, причастные к инциденту:\n(Вписать ники как сотрудников причастных так и свидетелей при наличии)\n\nПредварительные выводы:\n(Опишите тут свой предварительный вывод по ситуации.)\n\nПринятые меры:\n((Тут описать все ваши принятые меры.)\n)\n__\n\nДата: XX.XX.2026\nВремя: XX-XX |\nXX-XX\nПодпись: TEXT`,
    casefile: `CHICAGO CITY | GANG SUPPRESSION UNIT\n\n1. ОСНОВНАЯ ИНФОРМАЦИЯ\nНомер дела: D-${Math.floor(Math.random()*900000 + 100000)}DT\nДата открытия: ${new Date().toLocaleDateString()}\nДетектив: Имя детектива\nОтдел: Gang Suppression Unit\nСтатус дела: OPEN / CLOSED / SUSPENDED\nТип преступления: Gang Activity / Drug Trafficking / Assault / Murder / Illegal Weapons\n\n2. ИНФОРМАЦИЯ О ПОДОЗРЕВАЕМОМ\nЛичные данные\nИмя Фамилия:\nДата рождения:\nНациональность:\nМесто проживания:\nНомер телефона:\nID / CID:\n\nСвязи\nБанда / группировка:\nРанг в банде:\nИзвестные сообщники:\nТранспорт:\nОружие:\n\n3. ОПИСАНИЕ СИТУАЦИИ\nКраткое описание\n14.05.2026 примерно в 22:30 сотрудники Detective Division получили информацию о незаконной деятельности группировки в районе South Chicago.\nПосле наблюдения были замечены лица, проводившие обмен наркотических веществ и оружия.\n\nПолный рапорт\nПодробно расписывается:\nчто произошло;\nгде произошло;\nкто участвовал;\nкакие действия предпринимались;\nкак задерживали;\nчто нашли;\nсопротивление;\nперестрелка;\nпреследование;\nиспользование оружия.\n\n5. ДОКАЗАТЕЛЬСТВA\nИзъято:\nGlock 17\nAK-47\nНаркотические вещества\nДеньги\nТелефоны\nМаски\nДокументы\n\nФото-доказательства\nФото с места преступления\nФото оружия\nФото транспорта\nBodyCam записи\nCCTV камеры\n\n7. ОБВИНЕНИЯ\nIllegal Possession of Firearm\nDrug Distribution\nGang Affiliation\nAssault on Officer\nEvading Police\n\n8. ПРИЛОЖЕНИЯ\nScreenshot #1\nScreenshot #2\nVideo Evidence\nAudio Recording\nWitness Statement\n\n9. ЗАКЛЮЧЕНИЕ ДЕТЕКТИВА\nНа основании собранных доказательств подозреваемый причастен к деятельности организованной преступной группировки и нарушению уголовного кодекса Chicago City.`
};

window.onload = () => {
    bindEvents();
    setupFirebaseListeners();
};

function bindEvents() {
    if(document.getElementById('btn-login')) document.getElementById('btn-login').onclick = login;
    if(document.getElementById('btn-register')) document.getElementById('btn-register').onclick = register;
    if(document.getElementById('btn-logout')) document.getElementById('btn-logout').onclick = logout;
    if(document.getElementById('unit-edit')) document.getElementById('unit-edit').onclick = () => editField('unit');
    if(document.getElementById('name-edit')) document.getElementById('name-edit').onclick = () => editField('name');
    if(document.getElementById('status-toggle')) document.getElementById('status-toggle').onclick = toggleStatus;
    if(document.getElementById('btn-switch-bureau')) document.getElementById('btn-switch-bureau').onclick = switchMode;
    
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) closeBtn.onclick = () => document.getElementById('modal-view').style.display = 'none';
}

function setupFirebaseListeners() {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.email).onSnapshot(doc => {
                if (doc.exists) {
                    currentUser = doc.data();
                    if (currentUser.rank === "DISPATCHER" && currentMode !== "DISPATCHER") {
                        currentMode = "DISPATCHER";
                    }
                    checkAuth();
                } else {
                    currentUser = { email: user.email, name: "Офицер (" + user.email.split('@')[0] + ")", rank: "USER", division: "Unassigned", unit: "NONE", status: "OFF DUTY", reprimands: [] };
                    db.collection('users').doc(user.email).set(currentUser);
                }
            });
        } else {
            currentUser = null;
            checkAuth();
        }
    });

    db.collection('laws').onSnapshot(snap => {
        chicagoLaws = snap.docs.map(d => ({id: d.id, ...d.data()}));
        chicagoLaws.sort((a, b) => a.code.localeCompare(b.code));
        refreshUI();
    });

    db.collection('jsa_news').orderBy('timestamp', 'desc').onSnapshot(snap => {
        jsaNews = snap.docs.map(d => ({id: d.id, ...d.data()}));
        refreshUI();
    });
    
    db.collection('jsa_requests').orderBy('timestamp', 'desc').onSnapshot(snap => {
        jsaRequests = snap.docs.map(d => ({id: d.id, ...d.data()}));
        refreshUI();
    });

    db.collection('users').onSnapshot(snap => {
        users = {};
        snap.docs.forEach(d => users[d.id] = d.data());
        refreshUI();
    });

    db.collection('reports').orderBy('timestamp', 'desc').onSnapshot(snap => {
        reports = snap.docs.map(d => ({id: d.id, ...d.data()}));
        refreshUI();
    });

    db.collection('gangs').onSnapshot(snap => {
        gangs = snap.docs.map(d => ({id: d.id, ...d.data()}));
        refreshUI();
    });

    db.collection('stats').doc('shooting').onSnapshot(doc => {
        if (doc.exists) shootingStats = doc.data();
        refreshUI();
    });
}

function refreshUI() {
    if (document.getElementById('app-screen').style.display === 'flex') {
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) switchTab(activeNav.textContent);
        renderUI();
    }
}

function login() {
    const email = document.getElementById('auth-email').value.toLowerCase().trim();
    const pass = document.getElementById('auth-password').value;
    auth.signInWithEmailAndPassword(email, pass).catch(err => {
        document.getElementById('auth-error').innerText = "Ошибка входа: " + err.message;
    });
}

function register() {
    const email = document.getElementById('auth-email').value.toLowerCase().trim();
    const pass = document.getElementById('auth-password').value;
    auth.createUserWithEmailAndPassword(email, pass).then(() => {
        alert("Регистрация успешна! Ожидайте выдачи ранга Администратором."); 
    }).catch(err => {
        document.getElementById('auth-error').innerText = "Ошибка: " + err.message;
    });
}

function logout() { auth.signOut(); }

function checkAuth() {
    if (currentUser) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        renderUI();
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    }
}

function renderUI() {
    if(!currentUser) return;

    if(document.getElementById('disp-name')) document.getElementById('disp-name').textContent = currentUser.name;
    if(document.getElementById('disp-unit')) document.getElementById('disp-unit').textContent = currentUser.unit;
    if(document.getElementById('disp-rank-div')) document.getElementById('disp-rank-div').textContent = `${currentUser.rank} / ${currentUser.division}`;
    
    // Обновляем точку статуса
    const topDot = document.getElementById('top-status-dot');
    if (topDot) {
        if (currentUser.status === "ON DUTY") {
            topDot.style.backgroundColor = "#22c55e";
            topDot.style.boxShadow = "0 0 8px #22c55e";
        } else if (currentUser.status === "OFF DUTY") {
            topDot.style.backgroundColor = "#ef4444";
            topDot.style.boxShadow = "0 0 8px #ef4444";
        } else {
            topDot.style.backgroundColor = "#eab308";
            topDot.style.boxShadow = "0 0 8px #eab308";
        }
    }

    const currentDivName = document.getElementById('current-division-name');
    if (currentDivName) {
        if (currentMode === "PATROL") currentDivName.textContent = "Patrol Division";
        else if (currentMode === "DETECTIVE") currentDivName.textContent = "Detective Bureau";
        else if (currentMode === "JSA") currentDivName.textContent = "JSA Liason";
        else if (currentMode === "DISPATCHER") currentDivName.textContent = "Dispatcher";
    }

    const divBtns = document.getElementById('div-btns');
    if (divBtns) {
        divBtns.innerHTML = '';
        const addDivBtn = (name, modeCode, allowedRanks, allowedDivs) => {
            const hasAccess = currentUser.rank === "ADMIN" || allowedRanks.includes(currentUser.rank) || allowedDivs.includes(currentUser.division);
            if (hasAccess) {
                const btn = document.createElement('button');
                btn.style.width = '100%';
                btn.style.padding = '8px';
                btn.style.background = currentMode === modeCode ? '#3b82f6' : 'transparent';
                btn.style.color = currentMode === modeCode ? '#ffffff' : '#94a3b8';
                btn.style.border = currentMode === modeCode ? 'none' : '1px solid #1e293b';
                btn.style.borderRadius = '4px';
                btn.style.cursor = 'pointer';
                btn.style.fontSize = '14px';
                btn.textContent = name;
                btn.onclick = () => { 
                    currentMode = modeCode;
                    document.getElementById('division-panel').style.display = 'none'; 
                    renderUI();
                };
                divBtns.appendChild(btn);
            }
        };
        addDivBtn('Patrol Division', 'PATROL', ['PO', 'SERGEANT', 'DETECTIVE', 'JSA', 'DISPATCHER'], ['Patrol Division', 'GED', 'Detective Bureau', 'JSA Liason', 'Communications']);
        addDivBtn('Detective Bureau', 'DETECTIVE', ['DETECTIVE', 'SERGEANT'], ['GED', 'Detective Bureau']);
        addDivBtn('JSA Liason', 'JSA', ['JSA'], ['JSA Liason']);
        addDivBtn('Dispatcher', 'DISPATCHER', ['DISPATCHER', 'SERGEANT', 'JSA'], ['Communications', 'JSA Liason']);
    }

    const oldBureauBtn = document.getElementById('btn-switch-bureau');
    if (oldBureauBtn) oldBureauBtn.style.display = 'none';

    renderNav();
}

window.toggleDivisionPanel = function() {
    const panel = document.getElementById('division-panel');
    if (panel) {
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
    }
}

function renderNav() {
    const nav = document.getElementById('sidebar-nav');
    if(!nav) return;
    const currentActiveText = document.querySelector('.nav-item.active') ? document.querySelector('.nav-item.active').textContent : null;
    nav.innerHTML = '';
    let menu = [];

    if (currentUser.rank === "USER") {
        menu.push('Ожидание одобрения');
    } else {
        // --- ДИНАМИЧЕСКОЕ СКРЫТИЕ ПРИ OFF DUTY ---
        if (currentUser.status === "OFF DUTY") {
            menu.push('Законодательство', 'Новости JSA');
            if (currentUser.rank === "DISPATCHER" || currentMode === "DISPATCHER") {
                menu.push('Статус диспетчера');
            } else {
                menu.push('Мои отчёты');
            }
        } else {
            // --- ПОЛНОЕ МЕНЮ ПРИ ON DUTY / ON SCENE ---
            if (currentMode === "PATROL") {
                menu.push('Новый отчёт', 'Мои отчёты', 'Все отчёты', 'Все патрульные', 'Законодательство', 'Статистика', 'Заявление от сотрудников', 'Новости JSA');
            } else if (currentMode === "DETECTIVE") {
                menu.push('Кейс-файлы', 'Активные банды', 'Сотрудники ГЕД', 'Статистика районов');
            } else if (currentMode === "JSA") {
                menu.push('Заявление от сотрудников', 'Управление новостями', 'Список всех сотрудников', 'Система выговоров');
            } else if (currentMode === "DISPATCHER") {
                menu.push('Панель диспетчера (CAD)', 'Активные вызовы', 'Управление юнитами', 'Все патрульные', 'Законодательство');
            }
        }
        if (currentUser.rank === "ADMIN") menu.push('Панель Управления');
    }

    menu.forEach(item => {
        const a = document.createElement('a');
        a.className = 'nav-item';
        a.textContent = item;
        if (currentActiveText && item === currentActiveText) {
            a.classList.add('active');
        }
        a.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            a.classList.add('active');
            switchTab(item);
        };
        nav.appendChild(a);
    });

    if(nav.firstChild && !document.querySelector('.nav-item.active')) {
        nav.firstChild.classList.add('active');
        switchTab(menu[0]);
    }
}

function switchTab(tab) {
    const container = document.getElementById('tab-container');
    if(!container) return;
    container.innerHTML = `<h2 class="tab-title">${tab.toUpperCase()}</h2>`;

    if (tab === 'Ожидание одобрения') {
        container.innerHTML += `<p class="empty-text">Вы успешно зарегистрированы в системе CPD. Обратитесь к шефу/администратору для привязки ранга к почте: <strong>${currentUser.email}</strong>.</p>`; 
    }
    // --- ВКЛАДКИ ДИСПЕТЧЕРА ---
    else if (tab === 'Статус диспетчера') {
        container.innerHTML += `<p class="empty-text" style="color:var(--warning);">Вы находитесь вне смены (OFF DUTY). Измените статус на панели слева (или сверху), чтобы открыть доступ к терминалу CAD.</p>`;
    }
    else if (tab === 'Панель диспетчера (CAD)') {
        container.innerHTML += `
            <div class="stat-grid" style="margin-bottom:20px;">
                <div class="stat-card" style="border-left: 4px solid var(--accent-blue);">
                    <h3 style="color:var(--accent-blue)">Активные патрули</h3>
                    <p style="font-size: 28px; font-weight: bold; margin-top:5px; color:#fff;">
                        ${Object.values(users).filter(u => u.status !== "OFF DUTY" && u.rank !== "USER").length}
                    </p>
                </div>
                <div class="stat-card" style="border-left: 4px solid var(--success);">
                    <h3 style="color:var(--success)">Статус частоты TAC-1</h3>
                    <p style="font-size: 16px; font-weight: bold; margin-top:5px; color:#fff;">СТАБИЛЬНО (Шифрование ON)</p>
                </div>
            </div>
            <div class="form-box">
                <h3>Трансляция общей директивы (BOLO)</h3>
                <input type="text" id="dispatch-announcement" class="input-field" placeholder="Введите экстренное сообщение для всех патрулей...">
                <button onclick="alert('Директива успешно отправлена во внутренний эфир радиостанций!')" class="btn-primary" style="margin-top:10px;">ОТПРАВИТЬ В ЭФИР</button>
            </div>`;
    }
    else if (tab === 'Активные вызовы') {
        container.innerHTML += `
            <table class="db-table" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border); background: rgba(0,0,0,0.3);">
                        <th style="padding: 10px;">CALL#</th>
                        <th style="padding: 10px;">NATURE (ТИП)</th>
                        <th style="padding: 10px;">LOCATION (АДРЕС)</th>
                        <th style="padding: 10px;">STATUS</th>
                        <th style="padding: 10px;">UNITS</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px;">77</td>
                        <td style="color:#22c55e; font-weight:bold; padding: 10px;">TRAFFIC / TRAF</td>
                        <td style="padding: 10px;">221 ROUTE 68</td>
                        <td style="padding: 10px;"><span style="color:#3b82f6; font-weight:bold;">ENRT</span></td>
                        <td style="padding: 10px; color:#22c55e;">807, 860</td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px;">76</td>
                        <td style="color:#eab308; font-weight:bold; padding: 10px;">DISTURBANCE</td>
                        <td style="padding: 10px;">091 PROCOPIO DR.</td>
                        <td style="padding: 10px;"><span style="color:#ef4444; font-weight:bold;">PENDING</span></td>
                        <td style="padding: 10px;"></td>
                    </tr>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <td style="padding: 10px;">75</td>
                        <td style="color:#ef4444; font-weight:bold; padding: 10px;">ACTIVE SHOOTER</td>
                        <td style="padding: 10px;">342 JOSHUA RD.</td>
                        <td style="padding: 10px;"><span style="color:#ef4444; font-weight:bold;">ACTIVE</span></td>
                        <td style="padding: 10px; color:#ef4444;">626, 737</td>
                    </tr>
                </tbody>
            </table>`;
    }
    else if (tab === 'Управление юнитами') {
        const activeUnits = Object.values(users).filter(u => u.rank !== "USER" && u.status !== "OFF DUTY");
        if(activeUnits.length === 0) {
            container.innerHTML += `<p class="empty-text">Нет активных юнитов на маркировках в данный момент.</p>`;
        } else {
            container.innerHTML += `<div class="staff-grid">`;
            activeUnits.forEach(u => {
                container.innerHTML += `
                    <div class="staff-card" style="border-top: 3px solid var(--accent-blue);">
                        <h3>${u.name}</h3>
                        <p style="font-size:14px; color:var(--accent-blue); font-weight:bold; margin: 5px 0;">UNIT: ${u.unit}</p>
                        <p style="font-size:12px; color:var(--text-gray);">${u.division} | ${u.rank}</p>
                        <span class="status-badge ${u.status.replace(' ', '-').toLowerCase()}" style="margin-top:10px; display:inline-block;">${u.status}</span>
                    </div>`;
            });
            container.innerHTML += `</div>`;
        }
    }
    // --- СТАНДАРТНЫЕ ВКЛАДКИ ---
    else if (tab === 'Новый отчёт' || tab === 'Кейс-файлы') {
        let isCase = (tab === 'Кейс-файлы');
        let options = !isCase ? 
            `<option value="incident">РАПОРТ ОБ ИНЦИДЕНТЕ</option><option value="accident">ОТЧЕТ О ПРОИСШЕСТВИИ</option>` :  
            `<option value="casefile">CASE FILE — DETECTIVE DIVISION</option>`;
            
        container.innerHTML += `
            <div class="form-box">
                <select id="report-type" class="input-field" onchange="applyTemplate()">
                    <option value="">-- ВЫБЕРИТЕ ФОРМАТ ОТЧЕТА --</option>
                    ${options}
                </select>
                <textarea id="report-text" class="report-area" placeholder="Текст отчета сгенерируется после выбора формата..."></textarea>
                <div class="photo-uploader">
                    <label for="photo-input" class="upload-label">📁 ДОБАВИТЬ МНОЖЕСТВО ФОТОГРАФИЙ ИЛИ СКРИНШОТОВ</label>
                    <input type="file" id="photo-input" multiple accept="image/*" style="display:none;" onchange="previewPhotos()">
                    <div id="photo-previews" class="preview-container"></div>
                </div>
                <div class="actions">
                    <button onclick="saveDraft()" class="btn-secondary">СОХРАНИТЬ В ЧЕРНОВИК</button>
                    <button onclick="submitReport('${isCase ? 'casefile' : 'patrol'}')" class="btn-primary">ОТПРАВИТЬ В БАЗУ ДАННЫХ</button>
                </div>
            </div>`;
            
        const currentType = isCase ? 'casefile' : 'patrol';
        if (drafts[currentUser.email + '_' + currentType]) {
            document.getElementById('report-text').value = drafts[currentUser.email + '_' + currentType];
        }
    } 
    else if (tab === 'Мои отчёты' || tab === 'Все отчёты') {
        let list = reports;
        if (tab === 'Мои отчёты') list = reports.filter(r => r.email === currentUser.email); 
        else list = reports.filter(r => r.globalType === 'patrol');
        renderReportTable(container, list);
    }
    else if (tab === 'Все патрульные') {
        const patrolStaff = Object.values(users).filter(u => u.rank !== "USER" && u.rank !== "ADMIN" && u.division !== "GED");
        container.innerHTML += `<div class="staff-grid">`;
        patrolStaff.forEach(d => {
            container.innerHTML += `
                <div class="staff-card">
                    <h3>${d.name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${d.rank}</p>
                    <p style="font-size:12px; color:var(--text-gray);">${d.division} | Маркировка: ${d.unit}</p>
                    <span class="status-badge ${d.status.replace(' ', '-').toLowerCase()}" style="margin-top:10px; display:inline-block;">${d.status}</span>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Законодательство') {
        container.innerHTML += `
            <input type="text" id="law-search" class="input-field" placeholder="Поиск по статьям и названиям законов..." onkeyup="filterLaws()" style="margin-bottom: 20px;">
            <div id="laws-container" class="stat-grid"></div>`;
        renderLaws(chicagoLaws);
    }
    else if (tab === 'Статистика') {
        let stats = {};
        reports.forEach(r => { stats[r.email] = (stats[r.email] || 0) + 1; });
        let activeUsers = Object.keys(users)
            .filter(email => users[email].rank !== "USER")
            .map(email => ({ email, ...users[email], count: stats[email] || 0 }))
            .sort((a, b) => b.count - a.count);
            
        container.innerHTML += `<div class="stat-grid">`;
        activeUsers.forEach(u => {
            container.innerHTML += `
                <div class="stat-card">
                    <h3>${u.name}</h3>
                    <p>Позывной: <strong>${u.unit}</strong></p>
                    <p>Дивизион: <strong>${u.division}</strong></p>
                    <p style="margin-top:10px; color:var(--accent-blue);">Всего отчетов: <span style="font-size:20px; font-weight:bold;">${u.count}</span></p>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Активные банды') {
        let detStats = {};
        reports.filter(r => r.type === 'casefile').forEach(r => { detStats[r.email] = (detStats[r.email] || 0) + 1; });
        container.innerHTML += `<h3 style="color:var(--accent-blue); margin-bottom:10px;">АКТИВНОСТЬ ДЕТЕКТИВОВ</h3><div class="stat-grid" style="margin-bottom: 30px;">`; 
        for(let email in users) {
            if(users[email].rank === "DETECTIVE" || users[email].division === "GED" || users[email].rank === "ADMIN") {
                container.innerHTML += `<div class="stat-card"><strong>${users[email].name}</strong><br>Кейс-файлов: ${detStats[email] || 0}</div>`;
            }
        }
        container.innerHTML += `</div><hr style="border-color:var(--border); margin-bottom:20px;"><h3>СПИСОК ОПГ ЧИКАГО</h3><div class="gang-grid" id="gang-container"></div>`;
        
        const gCont = document.getElementById('gang-container');
        gangs.forEach(g => {
            const div = document.createElement('div');
            div.className = 'gang-card';
            div.innerHTML = `<h3>${g.name}</h3><p style="color:var(--text-gray); font-size:12px; margin-top:10px;">Нажмите, чтобы открыть досье</p>`;
            div.onclick = () => viewGang(g);
            gCont.appendChild(div);
        });
    }
    else if (tab === 'Статистика районов') {
        container.innerHTML += `<div class="stat-grid">`;
        for (let area in shootingStats) {
            container.innerHTML += `<div class="stat-card"><strong>${area}</strong><br><span style="color:#ef4444; font-size: 18px; font-weight:bold; display:block; margin-top:5px;">Индекс: ${shootingStats[area]}</span></div>`;
        }
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Сотрудники ГЕД') {
        const dets = Object.values(users).filter(u => u.division === "GED" || u.rank === "DETECTIVE" || u.rank === "ADMIN");
        container.innerHTML += `<div class="staff-grid">`;
        dets.forEach(d => {
            container.innerHTML += `
                <div class="staff-card">
                    <h3>${d.name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${d.rank}</p>
                    <p style="font-size:12px; color:var(--text-gray);">${d.division} | Маркировка: ${d.unit}</p>
                    <span class="status-badge ${d.status.replace(' ', '-').toLowerCase()}" style="margin-top:10px; display:inline-block;">${d.status}</span>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    // --- JSA И ВЫГОВОРЫ ---
    else if (tab === 'Заявление от сотрудников') {
        container.innerHTML += `
            <div class="form-box">
                <h3 style="color:var(--accent-blue); margin-bottom: 10px;">ПОДАТЬ ЗАЯВЛЕНИЕ / ЖАЛОБУ В JSA</h3>
                <input type="text" id="req-title" class="input-field" placeholder="Тема заявления">
                <textarea id="req-text" class="report-area" placeholder="Опишите суть заявления..."></textarea>
                <button onclick="submitRequest()" class="btn-primary">ОТПРАВИТЬ В JSA</button>
            </div>
            <div id="requests-list" style="margin-top: 20px;"></div>`;
            
        const reqList = document.getElementById('requests-list');
        if (currentUser.rank === 'JSA' || currentUser.rank === 'ADMIN') {
            if (jsaRequests.length === 0) reqList.innerHTML = `<p class="empty-text">Заявлений не найдено.</p>`;
            jsaRequests.forEach(r => {
                reqList.innerHTML += `<div class="stat-card" style="margin-bottom:10px;">
                    <p style="font-size:12px; color:var(--text-gray);">${r.date} | От: ${r.author}</p>
                    <h4 style="margin: 5px 0;">${r.title}</h4>
                    <p style="font-size:14px; white-space:pre-wrap;">${r.text}</p>
                </div>`;
            });
        } else {
            reqList.innerHTML = `<p class="empty-text" style="color: #64748b;">Ваши заявления конфиденциальны и видны только сотрудникам отдела JSA.</p>`;
        }
    }
    else if (tab === 'Управление новостями') {
        container.innerHTML += `
            <div class="form-box">
                <h3 style="color:var(--warning); margin-bottom: 15px;">ОПУБЛИКОВАТЬ НОВОСТЬ JSA</h3>
                <input type="text" id="news-title" class="input-field" placeholder="Заголовок новости" style="margin-bottom: 15px;">
                <textarea id="news-text" class="report-area" style="height: 120px; margin-bottom: 15px;" placeholder="Текст новости для сотрудников..."></textarea>
                <button onclick="submitNews()" class="btn-primary" style="width: 100%; padding: 12px; font-weight: bold;">ОПУБЛИКОВАТЬ ДЛЯ ВСЕХ</button>
            </div>`;
    }
    else if (tab === 'Новости JSA') {
        container.innerHTML += `<div id="news-list" style="display:flex; flex-direction:column; gap:15px;"></div>`;
        const newsList = document.getElementById('news-list');
        if (jsaNews.length === 0) newsList.innerHTML = `<p class="empty-text">Новостей от JSA пока нет.</p>`;
        
        jsaNews.forEach(n => {
            let deleteBtn = (currentUser.rank === 'JSA' || currentUser.rank === 'ADMIN') 
                ? `<button onclick="deleteNews('${n.id}')" style="position:absolute; top:15px; right:15px; background:none; border:1px solid #ef4444; border-radius:4px; padding:4px 8px; color:#ef4444; cursor:pointer; font-size:10px; font-weight:bold;">УДАЛИТЬ</button>` 
                : '';
                
            newsList.innerHTML += `<div class="stat-card" style="border-left: 4px solid var(--warning); position:relative; padding-right: 80px;">
                ${deleteBtn}
                <p style="font-size:12px; color:var(--text-gray);">${n.date} | Автор: ${n.author}</p>
                <h3 style="margin: 5px 0; color:var(--accent-blue);">${n.title}</h3>
                <p style="font-size:14px; white-space:pre-wrap; color: #cbd5e1;">${n.text}</p>
            </div>`;
        });
    }
    else if (tab === 'Список всех сотрудников') {
        container.innerHTML += `<div class="staff-grid"></div>`;
        const grid = container.querySelector('.staff-grid');
        Object.values(users).forEach(u => {
            const repCount = u.reprimands ? u.reprimands.length : 0;
            grid.innerHTML += `
                <div class="staff-card">
                    <h3>${u.name}</h3>
                    <p style="color:var(--danger); font-size:12px; font-weight:bold; margin-top:3px; margin-bottom:5px;">⚠️ Выговоров: ${repCount}</p>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${u.rank} | ${u.division}</p>
                    <p style="font-size:12px; color:var(--text-gray);">Маркировка: ${u.unit} | Статус: ${u.status}</p>
                </div>`;
        });
    }
    else if (tab === 'Система выговоров') {
        let isAuthorized = currentUser.rank === "ADMIN" || currentUser.rank === "SERGEANT" || currentUser.rank === "JSA";
        if (!isAuthorized) {
            container.innerHTML += `<p class="empty-text">У вас нет доступа к выдаче выговоров. Только ADMIN, JSA и SERGEANT.</p>`;
        } else {
            container.innerHTML += `
                <div class="form-box" style="margin-bottom: 20px;">
                    <h3 style="color:var(--danger); margin-bottom:10px;">ВЫДАТЬ ВЫГОВОР СОТРУДНИКУ</h3>
                    <select id="rep-email" class="input-field">
                        <option value="">-- Выберите сотрудника --</option>
                        ${Object.values(users).filter(u => u.email !== currentUser.email && u.rank !== 'USER').map(u => `<option value="${u.email}">${u.name} (${u.rank})</option>`).join('')}
                    </select>
                    <select id="rep-type" class="input-field">
                        <option value="Устный выговор">Устный выговор</option>
                        <option value="Строгий выговор">Строгий выговор</option>
                    </select>
                    <input type="text" id="rep-reason" class="input-field" placeholder="Причина выдачи выговора...">
                    <button onclick="issueReprimand()" class="btn-danger" style="width:100%; padding:10px; background:var(--danger); color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">ВЫДАТЬ ВЫГОВОР</button>
                </div>
                <h3 style="margin-bottom:10px;">Действующие выговоры:</h3>
                <div id="reprimands-list" class="stat-grid"></div>
            `;
            const repList = document.getElementById('reprimands-list');
            Object.values(users).forEach(u => {
                if (u.reprimands && u.reprimands.length > 0) {
                    let repHtml = u.reprimands.map((r, i) => `<li style="font-size:13px; margin-bottom:4px;"><strong>${r.type}</strong>: ${r.reason} (Выдал: ${r.issuedBy}) <button onclick="removeReprimand('${u.email}', ${i})" style="font-size:10px; background:none; color:var(--danger); border:1px solid var(--danger); cursor:pointer; margin-left:5px;">СНЯТЬ</button></li>`).join('');
                    repList.innerHTML += `<div class="stat-card">
                        <h4 style="color:var(--accent-blue);">${u.name}</h4>
                        <ul style="padding-left:15px; margin-top:10px; color:#e2e8f0;">${repHtml}</ul>
                    </div>`;
                }
            });
        }
    }
    else if (tab === 'Панель Управления') {
        renderAdminPanel(container);
    }
}

function renderReportTable(container, list) {
    if (list.length === 0) {
        container.innerHTML += `<p class="empty-text">Отчетов или документов в базе данных не обнаружено.</p>`;
        return;
    }
    let table = `<table class="db-table" style="width:100%; text-align:left; border-collapse: collapse; margin-top:15px;">
        <thead>
            <tr style="border-bottom: 2px solid var(--border);">
                <th style="padding:10px;">ТИП ДОКУМЕНТА</th>
                <th style="padding:10px;">ДАТА ДОБАВЛЕНИЯ</th>
                <th style="padding:10px;">АВТОР</th>
                <th style="padding:10px;">ОТДЕЛ / ДОЛЖНОСТЬ</th>
            </tr>
        </thead>
        <tbody>`;
        
    list.forEach(r => {
        const typeStr = (r.title || r.type || r.globalType || "ДОКУМЕНТ").toUpperCase();
        const dateStr = r.date || "—";
        const authorStr = r.author || r.name || "Неизвестно";
        const deptStr = r.division || r.rank || "—";
        
        table += `<tr onclick="viewReport('${r.id}')" style="cursor: pointer; border-bottom: 1px solid var(--border);">
                <td style="padding:10px; color:var(--accent-blue); font-weight:bold;">${typeStr}</td>
                <td style="padding:10px;">${dateStr}</td>
                <td style="padding:10px;">${authorStr}</td>
                <td style="padding:10px;">${deptStr}</td>
            </tr>`; 
    });
    table += `</tbody></table>`;
    container.innerHTML += table;
}

function viewReport(id) {
    if (!reports || reports.length === 0) return alert("База отчетов загружается...");
    const r = reports.find(rep => rep.id === id);
    if (!r) return alert("Документ не найден!");
    
    const m = document.getElementById('modal-view');
    if (!m) return;
    
    let photoHtml = r.photos && r.photos.length > 0 
        ? r.photos.map(p => `<img src="${p}" class="report-photo" style="max-width:200px; margin-right:10px; cursor:pointer; border-radius:4px;" onclick="window.open(this.src)">`).join('') 
        : '<p style="color:var(--text-gray)">Фото-доказательства отсутствуют.</p>';
        
    let adminBtn = currentUser.rank === "ADMIN" ? `<button onclick="deleteReport('${r.id}')" class="btn-delete-action" style="padding: 5px 10px; font-size: 11px; margin-left:10px; background:#ef4444; color:#fff; border:none; border-radius:3px; cursor:pointer;">УДАЛИТЬ</button>` : '';
    
    const typeStr = (r.title || r.type || "ДОКУМЕНТ").toUpperCase();
    const authorStr = r.author || r.name || "Неизвестно";
    const unitStr = r.unit ? `[${r.unit}]` : "";
    const divStr = r.division || r.rank || "—";

    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color:var(--accent-blue); margin:0; font-size:20px;">${typeStr}</h1>
            <div style="display:flex; align-items:center;">
                <span style="color:var(--text-gray); font-size:14px;">${r.date || ""}</span>
                ${adminBtn}
            </div>
        </div>
        <p style="color: #cbd5e1; margin-bottom: 15px; font-size:14px;"><strong>ИСПОЛНИТЕЛЬ:</strong> ${authorStr} ${unitStr} | <strong>ОТДЕЛ/ДОЛЖНОСТЬ:</strong> ${divStr}</p>
        <div class="report-content-view" style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); font-family:monospace; line-height:1.5;">${r.text}</div>
        <h3 style="margin-top:20px; margin-bottom:10px; color:var(--accent-blue);">ПРИКРЕПЛЕННЫЕ МАТЕРИАЛЫ:</h3>
        <div class="report-photos-grid" style="display:flex; gap:10px; flex-wrap:wrap;">${photoHtml}</div>
    `;
    m.style.display = 'flex';
}

function renderLaws(lawsArray) {
    const cont = document.getElementById('laws-container');
    if(!cont) return;
    cont.innerHTML = '';
    lawsArray.forEach(law => {
        cont.innerHTML += `
            <div class="stat-card law-card">
                <h3 style="color: var(--warning);">${law.code} - ${law.title}</h3>
                <p style="margin-top: 10px; font-size: 13px; color: var(--text-white);">${law.text}</p>
            </div>`;
    });
}

function filterLaws() {
    const query = document.getElementById('law-search').value.toLowerCase();
    const filtered = chicagoLaws.filter(l => l.title.toLowerCase().includes(query) || l.code.includes(query) || l.text.toLowerCase().includes(query));
    renderLaws(filtered);
}

function applyTemplate() {
    const type = document.getElementById('report-type').value;
    document.getElementById('report-text').value = TEMPLATES[type] ? TEMPLATES[type] : '';
}

async function previewPhotos() {
    const files = document.getElementById('photo-input').files;
    const cont = document.getElementById('photo-previews');
    cont.innerHTML = '';
    loadedPhotos = [];
    for(let file of files) {
        const base64 = await toBase64(file);
        loadedPhotos.push(base64);
        cont.innerHTML += `<img src="${base64}" class="preview-img">`; 
    }
}

function saveDraft() {
    const text = document.getElementById('report-text').value;
    const type = currentMode === 'PATROL' ? 'patrol' : 'casefile';
    if(!text) return alert("Нечего сохранять в черновик.");
    drafts[currentUser.email + '_' + type] = text;
    localStorage.setItem('cpd_v5_drafts', JSON.stringify(drafts));
    alert("Ваш отчет успешно записан в черновик!");
}

function submitReport(globalType) {
    const type = document.getElementById('report-type').value;
    const text = document.getElementById('report-text').value;
    if (!type || !text) return alert("Ошибка: выберите тип документа и заполните текстовые поля!");
    const reportData = {
        type: type,
        globalType: globalType,
        text: text,
        author: currentUser.name,
        unit: currentUser.unit,
        division: currentUser.division,
        email: currentUser.email,
        date: new Date().toLocaleString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        photos: [...loadedPhotos]
    };
    db.collection('reports').add(reportData).then(() => {
        delete drafts[currentUser.email + '_' + globalType];
        localStorage.setItem('cpd_v5_drafts', JSON.stringify(drafts));
        alert("Документ успешно загружен в базу данных!");
        loadedPhotos = [];
        switchTab(currentMode === 'PATROL' ? 'Мои отчёты' : 'Кейс-файлы');
    });
}

function deleteReport(id) {
    if (confirm("Вы уверены, что хотите навсегда удалить этот отчет?")) {
        db.collection('reports').doc(id).delete().then(() => {
            document.getElementById('modal-view').style.display = 'none';
            alert("Отчет удален."); 
        });
    }
}

function viewGang(g) {
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';
    let photosHtml = '';
    if (g.photos && g.photos.length > 0) {
        photosHtml = `<h3 style="margin-top:20px; color:var(--accent-blue);">ФОТО МАТЕРИАЛЫ:</h3>
                      <div class="report-photos-grid">
                          ${g.photos.map(p => `<img src="${p}" class="report-photo" style="max-width:200px; margin-right:10px; cursor:pointer;" onclick="window.open(this.src)">`).join('')}
                      </div>`;
    }

    document.getElementById('modal-body').innerHTML = `
        <h1 style="color:#ef4444; border-bottom: 2px solid var(--border); padding-bottom:10px; font-size:24px;">ДОСЬЕ ОПГ: ${g.name}</h1>
        <div class="report-content-view" style="margin-top:20px; white-space: pre-wrap; font-size:15px; line-height:1.6; color:#e2e8f0;">${g.info}</div>
        ${photosHtml}
    `;
}

function renderAdminPanel(container) {
    container.innerHTML += `
        <div class="admin-panel-grid">
            <div class="form-box admin-box">
                <h3>УПРАВЛЕНИЕ РАНГАМИ</h3>
                <input id="adm-email" class="input-field" placeholder="Email сотрудника (user@cpd.gov)">
                <input id="adm-name" class="input-field" placeholder="Позывной / Имя Фамилия (Опционально)">
                <select id="adm-rank" class="input-field">
                    <option value="USER">USER (Гражданский - без доступа)</option>
                    <option value="PO">PO (Patrol Officer)</option>
                    <option value="DISPATCHER">DISPATCHER (Диспетчер)</option>
                    <option value="SERGEANT">SERGEANT</option>
                    <option value="DETECTIVE">DETECTIVE (Доступ к Бюро)</option>
                    <option value="JSA">JSA (Внутренние расследования)</option>
                    <option value="ADMIN">ADMIN (Суперадминистратор)</option>
                </select>
                <select id="adm-div" class="input-field">
                    <option value="Unassigned">Unassigned</option>
                    <option value="Patrol Division">Patrol Division</option>
                    <option value="Communications">Communications (Диспетчерская)</option>
                    <option value="GED">GED (Gang Suppression Unit)</option>
                    <option value="Detective Bureau">Detective Bureau</option>
                    <option value="JSA Liason">JSA Liason</option>
                </select>
                <button onclick="updateUser()" class="btn-primary" style="width:100%; margin-top:10px;">ВЫДАТЬ ЗВАНИЕ И ПРАВА</button>
            </div>

            <div class="form-box admin-box">
                <h3>ДОБАВЛЕНИЕ НОВОЙ ОПГ</h3>
                <input id="adm-gang" class="input-field" placeholder="Название ОПГ">
                <textarea id="adm-gang-info" class="input-field" style="height:120px;" placeholder="Информация о банде..."></textarea>
                <input id="adm-gang-photos" class="input-field" placeholder="Ссылки на фото (через запятую)">
                <button onclick="addGang()" class="btn-primary" style="width:100%">ДОБАВИТЬ В БАЗУ ДАННЫХ</button>
            </div>

            <div class="form-box admin-box">
                <h3>СТАТИСТИКА СТРЕЛЬБЫ</h3>
                <input id="adm-area" class="input-field" placeholder="Название района (например, South Chicago)">
                <input id="adm-perc" class="input-field" placeholder="Уровень опасности (например, 74%)">
                <button onclick="updateStats()" class="btn-primary" style="width:100%">ОБНОВИТЬ КАРТУ</button>
            </div>
        </div>
      
        <div class="form-box admin-box">
            <h3>ДОБАВЛЕНИЕ ЗАКОНА</h3>
            <input id="adm-law-code" class="input-field" placeholder="Статья (например, 1.01)">
            <input id="adm-law-title" class="input-field" placeholder="Название (например, Убийство)">
            <textarea id="adm-law-text" class="input-field" style="height:60px;" placeholder="Описание закона..."></textarea>
            <button onclick="addLaw()" class="btn-primary" style="width:100%; margin-top:10px;">ОПУБЛИКОВАТЬ ЗАКОН</button>
        </div>

        <div class="form-box admin-box" style="max-width: 100%; margin-top: 20px; border-color: var(--danger);">
            <h3 style="color: var(--danger);">УПРАВЛЕНИЕ УДАЛЕНИЕМ ДАННЫХ (БАНДЫ И РАЙОНЫ)</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-top: 15px;">
                <div><h4 style="font-size:13px; margin-bottom:10px;">Активные банды:</h4><div id="adm-delete-gangs-list" style="display:flex; flex-direction:column; gap:5px;"></div></div>
                <div><h4 style="font-size:13px; margin-bottom:10px;">Статистика районов:</h4><div id="adm-delete-areas-list" style="display:flex; flex-direction:column; gap:5px;"></div></div>
            </div>
        </div>
    `;

    const gangList = document.getElementById('adm-delete-gangs-list');
    gangs.forEach(g => {
        gangList.innerHTML += `<div class="delete-item-row"><span>${g.name}</span> <button onclick="deleteGang('${g.id}')" class="btn-delete-action">УДАЛИТЬ</button></div>`;
    });

    const areaList = document.getElementById('adm-delete-areas-list');
    for (let area in shootingStats) {
        areaList.innerHTML += `<div class="delete-item-row"><span>${area} (${shootingStats[area]})</span> <button onclick="deleteArea('${area}')" class="btn-delete-action">УДАЛИТЬ</button></div>`;
    }
}

function updateUser() {
    const email = document.getElementById('adm-email').value.toLowerCase().trim();
    const name = document.getElementById('adm-name').value.trim();
    const rank = document.getElementById('adm-rank').value;
    const div = document.getElementById('adm-div').value;

    if (!email) return alert("Введите Email сотрудника!");
    let updates = { rank: rank, division: div };
    if (name) updates.name = name;
    db.collection('users').doc(email).update(updates).then(() => {
        alert(`Права обновлены! Ранг: ${rank}, Отдел: ${div}`); 
    }).catch(e => alert("Ошибка! Юзер не найден или нет прав."));
}

function updateStats() {
    const area = document.getElementById('adm-area').value.trim();
    const val = document.getElementById('adm-perc').value.trim();
    if(!area || !val) return alert("Заполните все поля!");
    let updates = {};
    updates[area] = val;
    db.collection('stats').doc('shooting').set(updates, {merge: true}).then(() => alert("Статистика пересчитана!"));
}

function addGang() {
    const nameEl = document.getElementById('adm-gang');
    const infoEl = document.getElementById('adm-gang-info');
    const photosEl = document.getElementById('adm-gang-photos');

    if (!nameEl || !infoEl) return;
    const name = nameEl.value.trim();
    const info = infoEl.value.trim();
    const photosInput = photosEl ? photosEl.value.trim() : '';
    const photos = photosInput ? photosInput.split(',').map(url => url.trim()) : [];

    if(!name || !info) return alert("Заполните имя и карточку банды!");
    db.collection('gangs').add({ name: name, info: info, photos: photos }).then(() => {
        alert(`Банда ${name} внесена в архивы.`);
        nameEl.value = '';
        infoEl.value = '';
        if(photosEl) photosEl.value = '';
    }).catch(err => alert("Ошибка Firestore: " + err.message));
}

function editField(field) {
    let currentVal = currentUser[field];
    let newVal = prompt(`Новое значение для ${field.toUpperCase()}:`, currentVal);
    if (newVal !== null && newVal.trim() !== '') {
        let updates = {};
        updates[field] = newVal.trim();
        db.collection('users').doc(currentUser.email).update(updates); 
    }
}

function toggleStatus() {
    const statuses = ["ON DUTY", "OFF DUTY", "ON SCENE"];
    let nextIdx = (statuses.indexOf(currentUser.status) + 1) % statuses.length;
    db.collection('users').doc(currentUser.email).update({status: statuses[nextIdx]}).then(() => {
        renderNav(); 
    });
}

function switchMode() { 
    currentMode = currentMode === "PATROL" ? "DETECTIVE" : "PATROL"; 
    renderUI();
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function deleteGang(id) {
    if (confirm(`Удалить банду?`)) {
        db.collection('gangs').doc(id).delete().then(() => switchTab('Панель Управления'));
    }
}

function deleteArea(areaName) {
    if (confirm(`Удалить район "${areaName}"?`)) {
        let updates = {};
        updates[areaName] = firebase.firestore.FieldValue.delete();
        db.collection('stats').doc('shooting').update(updates).then(() => switchTab('Панель Управления'));
    }
}

function addLaw() {
    const code = document.getElementById('adm-law-code').value.trim();
    const title = document.getElementById('adm-law-title').value.trim();
    const text = document.getElementById('adm-law-text').value.trim();

    if(!code || !title || !text) return alert("Заполните все поля закона!");
    db.collection('laws').add({ code, title, text }).then(() => {
        alert(`Закон ${code} успешно добавлен.`);
        document.getElementById('adm-law-code').value = '';
        document.getElementById('adm-law-title').value = '';
        document.getElementById('adm-law-text').value = '';
    });
}

function submitRequest() {
    const title = document.getElementById('req-title').value.trim();
    const text = document.getElementById('req-text').value.trim();
    if(!title || !text) return alert("Заполните все поля!");
    db.collection('jsa_requests').add({
        title: title, 
        text: text,
        author: currentUser.name, 
        email: currentUser.email,
        date: new Date().toLocaleString(), 
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Заявление успешно отправлено в JSA.");
        switchTab('Заявление от сотрудников');
    });
}

function submitNews() {
    const title = document.getElementById('news-title').value.trim();
    const text = document.getElementById('news-text').value.trim();
    if(!title || !text) return alert("Заполните все поля!");
    db.collection('jsa_news').add({
        title: title, 
        text: text,
        author: currentUser.name, 
        date: new Date().toLocaleString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Новость опубликована для всех патрульных.");
        switchTab('Новости JSA');
    });
}

function issueReprimand() {
    const email = document.getElementById('rep-email').value;
    const type = document.getElementById('rep-type').value;
    const reason = document.getElementById('rep-reason').value.trim();
    if(!email || !reason) return alert("Выберите сотрудника и обязательно укажите причину!");
    
    const targetUser = users[email];
    let currentReps = targetUser.reprimands || [];
    currentReps.push({ type: type, reason: reason, issuedBy: currentUser.name });
    
    db.collection('users').doc(email).update({ reprimands: currentReps }).then(() => {
        alert("Выговор успешно выдан и занесен в личное дело.");
        switchTab('Система выговоров');
    });
}

function removeReprimand(email, index) {
    if(!confirm("Вы уверены, что хотите снять этот выговор?")) return;
    let currentReps = users[email].reprimands || [];
    currentReps.splice(index, 1);
    db.collection('users').doc(email).update({ reprimands: currentReps }).then(() => {
        switchTab('Система выговоров');
    });
}

function deleteNews(id) {
    if(confirm("Вы уверены, что хотите навсегда удалить эту новость?")) {
        db.collection('jsa_news').doc(id).delete().then(() => {
            alert("Новость успешно удалена!");
            switchTab('Новости JSA');
        }).catch(err => alert("Ошибка удаления: " + err.message));
    }
}
