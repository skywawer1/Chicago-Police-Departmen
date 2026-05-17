// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
let reports = [];
let gangs = [];
let shootingStats = {};
let drafts = JSON.parse(localStorage.getItem('cpd_v5_drafts')) || {};
// Черновики остаются локально 
let currentUser = null;
let currentMode = "PATROL"; 
let loadedPhotos = [];
// Настоящая база данных законов Чикаго (расширенная) 
let chicagoLaws = [];

// Точные шаблоны отчетов по запросу 
const TEMPLATES = {
    incident: `CHICAGO POLICE DEPARTMENT\nРАПОРТ ОБ ИНЦИДЕНТЕ\n--\nФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка на рации)\nДата, время и место происшествия: XX-XX-2026 | XX-XX | (Указать место)\nОбстоятельства инцидента:\n(Тут описать всю ситуацию)\n\nЛица, причастные к инциденту:\n(Вписать ники как сотрудников причастных так и свидетелей при наличии)\n\nПредварительные выводы:\n(Опишите тут свой предварительный вывод по ситуации. Например какие действия были верны, как можно было бы сделать лучше, какие действия вы считаете оправданными и т.д.)\n\nПринятые меры:\n((Тут описать все ваши принятые меры. К примеру:\nПомог осмотреть машину,\nОбыскал подозреваемого,\nВызвал карету скорой помощи,\nи т.д.)\n)\n__\n\nДата: XX.XX.2026\nВремя: XX-XX | XX-XX`,
    
    accident: `CHICAGO POLICE DEPARTMENT\nОТЧЕТ О ПРОИСШЕСТВИИ\n--\nФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка на рации)\nДата, время и место происшествия: XX-XX-2026 | XX-XX | (Указать место)\nОбстоятельства инцидента:\n(Тут описать всю ситуацию)\n\nЛица, причастные к инциденту:\n(Вписать ники как сотрудников причастных так и свидетелей при наличии)\n\nПредварительные выводы:\n(Опишите тут свой предварительный вывод по ситуации. Например какие действия были верны, как можно было бы сделать лучше, какие действия вы считаете оправданными и т.д.)\n\nПринятые меры:\n((Тут описать все ваши принятые меры. К примеру:\nПомог осмотреть машину\nОбыскал подозреваемого\nВызвал карету скорой помощи\nи т.д.)\n)\n__\n\nДата: XX.XX.2026\nВремя: XX-XX | XX-XX\nПодпись: TEXT`,
    
    casefile: `CHICAGO CITY | GANG SUPPRESSION UNIT\n\n1. ОСНОВНАЯ ИНФОРМАЦИЯ\nНомер дела: D-${Math.floor(Math.random()*900000 + 100000)}DT\nДата открытия: ${new Date().toLocaleDateString()}\nДетектив: Имя детектива\nОтдел: Gang Suppression Unit\nСтатус дела: OPEN / CLOSED / SUSPENDED\nТип преступления: Gang Activity / Drug Trafficking / Assault / Murder / Illegal Weapons\n\n2. ИНФОРМАЦИЯ О ПОДОЗРЕВАЕМОМ\nЛичные данные\nИмя Фамилия:\nДата рождения:\nНациональность:\nМесто проживания:\nНомер телефона:\nID / CID:\n\nСвязи\nБанда / группировка:\nРанг в банде:\nИзвестные сообщники:\nТранспорт:\nОружие:\n\n3. ОПИСАНИЕ СИТУАЦИИ\nКраткое описание\n14.05.2026 примерно в 22:30 сотрудники Detective Division получили информацию о незаконной деятельности группировки в районе South Chicago. После наблюдения были замечены лица, проводившие обмен наркотических веществ и оружия.\n\nПолный рапорт\nПодробно расписывается:\nчто произошло;\nгде произошло;\nкто участвовал;\nкакие действия предпринимались;\nкак задерживали;\nчто нашли;\nсопротивление;\nперестрелка;\nпреследование;\nиспользование оружия.\n\n5. ДОКАЗАТЕЛЬСТВA\nИзъято:\nGlock 17\nAK-47\nНаркотические вещества\nДеньги\nТелефоны\nМаски\nДокументы\n\nФото-доказательства\nФото с места преступления\nФото оружия\nФото транспорта\nBodyCam записи\nCCTV камеры\n\n7. ОБВИНЕНИЯ\nIllegal Possession of Firearm\nDrug Distribution\nGang Affiliation\nAssault on Officer\nEvading Police\n\n8. ПРИЛОЖЕНИЯ\nScreenshot #1\nScreenshot #2\nVideo Evidence\nAudio Recording\nWitness Statement\n\n9. ЗАКЛЮЧЕНИЕ ДЕТЕКТИВА\nНа основании собранных доказательств подозреваемый причастен к деятельности организованной преступной группировки и нарушению уголовного кодекса Chicago City.`
};

window.onload = () => {
    bindEvents();
    setupFirebaseListeners();
};

function bindEvents() {
    document.getElementById('btn-login').onclick = login;
    document.getElementById('btn-register').onclick = register;
    document.getElementById('btn-logout').onclick = logout;
    document.getElementById('unit-edit').onclick = () => editField('unit');
    document.getElementById('name-edit').onclick = () => editField('name');
    document.getElementById('status-toggle').onclick = toggleStatus;
    document.getElementById('btn-switch-bureau').onclick = switchMode;
    document.querySelector('.close-modal').onclick = () => document.getElementById('modal-view').style.display = 'none';
}

function setupFirebaseListeners() {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.email).onSnapshot(doc => {
                if (doc.exists) {
                    currentUser = doc.data();
                    checkAuth();
                } else {
                    currentUser = { email: user.email, name: "Офицер (" + user.email.split('@')[0] + ")", rank: "USER", division: "Unassigned", unit: "NONE", status: "OFF DUTY" };
                    db.collection('users').doc(user.email).set(currentUser);
                }
            });
        } else {
            currentUser = null;
            checkAuth();
        }
        db.collection('laws').onSnapshot(snap => {
            chicagoLaws = snap.docs.map(d => ({id: d.id, ...d.data()}));
            chicagoLaws.sort((a, b) => a.code.localeCompare(b.code)); // Сортируем по номеру статьи
            refreshUI();
        });
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
    document.getElementById('disp-name').textContent = currentUser.name;
    document.getElementById('disp-unit').textContent = currentUser.unit;
    document.getElementById('disp-rank-div').textContent = `${currentUser.rank} / ${currentUser.division}`;
    
    const statusEl = document.getElementById('disp-status');
    statusEl.textContent = currentUser.status;
    statusEl.className = 'value status-badge ' + currentUser.status.replace(' ', '-').toLowerCase();
    
    const hasDetAccess = currentUser.rank === "ADMIN" || currentUser.rank === "DETECTIVE" || currentUser.division === "GED"; 
    const bureauBtn = document.getElementById('btn-switch-bureau');
    bureauBtn.style.display = hasDetAccess ? 'block' : 'none';
    bureauBtn.textContent = currentMode === "PATROL" ? "DETECTIVE BUREAU ⮂" : "PATROL DIVISION ⮂";
    renderNav();
}

function renderNav() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';
    let menu = [];

    // Гражданские пользователи не видят базу 
    if (currentUser.rank === "USER") {
        menu.push('Ожидание одобрения');
    } else {
        if (currentMode === "PATROL") {
            menu.push('Новый отчёт', 'Мои отчёты', 'Все отчёты', 'Все патрульные', 'Законодательство', 'Статистика');
        } else {
            // Вкладка Кейс-файлы и новая JSA Liaison
            menu.push('Кейс-файлы', 'Активные банды', 'Сотрудники ГЕД', 'Статистика районов', 'JSA Liaison');
        }
        if (currentUser.rank === "ADMIN") menu.push('Панель Управления');
    }

    menu.forEach(item => {
        const a = document.createElement('a');
        a.className = 'nav-item';
        a.textContent = item;
        a.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            a.classList.add('active');
            switchTab(item);
        };
        nav.appendChild(a);
    });

    if(nav.firstChild) {
        nav.firstChild.classList.add('active');
        switchTab(menu[0]);
    }
}

    menu.forEach(item => {
        const a = document.createElement('a');
        a.className = 'nav-item';
        a.textContent = item;
        a.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            a.classList.add('active');
            switchTab(item);
        };
        nav.appendChild(a);
    });

    if(nav.firstChild) {
        nav.firstChild.classList.add('active');
        switchTab(menu[0]);
    }
}

function switchTab(tab) {
    const container = document.getElementById('tab-container');
    container.innerHTML = `<h2 class="tab-title">${tab.toUpperCase()}</h2>`;
    
    if (tab === 'Ожидание одобрения') {
        container.innerHTML += `<p class="empty-text">Вы успешно зарегистрированы в системе CPD. Обратитесь к шефу/администратору для привязки ранга к почте: <strong>${currentUser.email}</strong>.</p>`; 
    }
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
        const patrolStaff = Object.values(users).filter(u => u.rank === "PO" || u.rank === "SERGEANT" || u.rank === "DETECTIVE" || u.rank === "ADMIN");
        
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
    else if (tab === 'JSA Liaison') {
        container.innerHTML += `
            <div class="form-box">
                <h3 style="color:var(--accent-blue);">СВЯЗЬ С СУДЕБНОЙ СИСТЕМОЙ (JSA LIAISON)</h3>
                <p style="color:var(--text-gray); margin-bottom: 15px;">Здесь вы можете оформлять ордера, передавать дела в суд и взаимодействовать с прокуратурой.</p>
                <textarea id="jsa-request-text" class="report-area" style="height: 200px;" placeholder="Опишите ваш запрос, ордер или прикрепите материалы для прокуратуры..."></textarea>
                <div class="actions">
                    <button onclick="alert('Запрос отправлен в прокуратуру (Функция в разработке)')" class="btn-primary">ОТПРАВИТЬ ЗАПРОС</button>
                </div>
            </div>
        `;
    }
    else if (tab === 'Панель Управления') {
        renderAdminPanel(container);
    }
}

function renderReportTable(container, list) {
    if (list.length === 0) {
        container.innerHTML += `<p class="empty-text">Отчетов в базе данных не обнаружено.</p>`;
        return;
    }
    let table = `<table class="db-table">
        <thead><tr><th>ТИП ДОКУМЕНТА</th><th>ДАТА ДОБАВЛЕНИЯ</th><th>АВТОР</th><th>МАРКИРОВКА</th><th>ОТДЕЛ</th></tr></thead>
        <tbody>`;
    list.forEach(r => {
        table += `<tr onclick="viewReport('${r.id}')">
                <td style="color:var(--accent-blue); font-weight:bold;">${r.type.toUpperCase()}</td>
                <td>${r.date}</td><td>${r.author}</td><td>${r.unit}</td><td>${r.division}</td>
            </tr>`; 
    });
    table += `</tbody></table>`;
    container.innerHTML += table;
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

function viewReport(id) {
    const r = reports.find(rep => rep.id === id);
    if(!r) return;
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';
    
    let photoHtml = r.photos && r.photos.length ? r.photos.map(p => `<img src="${p}" class="report-photo" onclick="window.open(this.src)">`).join('') : '<p style="color:var(--text-gray)">Фото-доказательства отсутствуют.</p>';
    
    // Кнопки управления доступом
    let adminBtn = currentUser.rank === "ADMIN" ? `<button onclick="deleteReport('${r.id}')" class="btn-delete-action" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">УДАЛИТЬ</button>` : '';
    let canEdit = currentUser.email === r.email || currentUser.rank === "ADMIN" || currentUser.division === "GED" || currentUser.rank === "DETECTIVE";
    
    let editBtns = canEdit ? `
        <button onclick="editReportText('${r.id}')" class="btn-secondary" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">РЕДАКТИРОВАТЬ</button>
        <button onclick="addReportNote('${r.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">+ ЗАМЕТКА</button>
    ` : '';

    // Отрисовка заметок
    let notesHtml = '';
    if (r.notes && r.notes.length > 0) {
        notesHtml = `<h3 style="margin-top:20px; margin-bottom:10px; color:#f59e0b;">СЛУЖЕБНЫЕ ЗАМЕТКИ:</h3>`;
        r.notes.forEach(note => {
            notesHtml += `<div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 13px;">
                <strong style="color:#f59e0b;">${note.author} (${note.date}):</strong><br>${note.text}
            </div>`;
        });
    }

    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color:var(--accent-blue); margin:0; font-size:20px;">${r.type.toUpperCase()}</h1>
            <div style="display:flex; align-items:center;">
                <span style="color:var(--text-gray); font-size:14px;">${r.date}</span>
                ${editBtns}
                ${adminBtn}
            </div>
        </div>
        <p style="color: #cbd5e1; margin-bottom: 15px; font-size:14px;"><strong>ИСПОЛНИТЕЛЬ:</strong> ${r.author} [${r.unit}] | <strong>ДИВИЗИОН:</strong> ${r.division}</p>
        
        <div class="report-content-view" style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); font-family:monospace; line-height:1.5;">${r.text}</div>
        
        ${notesHtml}

        <h3 style="margin-top:20px; margin-bottom:10px; color:var(--accent-blue);">ПРИКРЕПЛЕННЫЕ МАТЕРИАЛЫ / ФОТОФИКСАЦИЯ:</h3>
        <div class="report-photos-grid">${photoHtml}</div>
    `;
}

function deleteReport(id) {
    if (confirm("Вы уверены, что хотите навсегда удалить этот отчет из базы данных?")) {
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
                          ${g.photos.map(p => `<img src="${p}" class="report-photo" onclick="window.open(this.src)">`).join('')}
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
                    <option value="SERGEANT">SERGEANT</option>
                    <option value="DETECTIVE">DETECTIVE (Доступ к Бюро)</option>
                    <option value="ADMIN">ADMIN (Суперадминистратор)</option>
                </select>
                <select id="adm-div" class="input-field">
                    <option value="Unassigned">Unassigned</option>
                    <option value="Patrol Division">Patrol Division</option>
                    <option value="GED">GED (Gang Suppression Unit)</option>
                    <option value="Detective Bureau">Detective Bureau</option>
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

    if (!nameEl || !infoEl) {
        console.warn("Поля ОПГ еще не отрисованы на экране.");
        return;
    }

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
    db.collection('users').doc(currentUser.email).update({status: statuses[nextIdx]});
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
function editReportText(id) {
    const r = reports.find(rep => rep.id === id);
    if(!r) return;
    
    document.getElementById('modal-body').innerHTML = `
        <h2 style="color:var(--accent-blue); margin-bottom: 15px;">РЕДАКТИРОВАНИЕ ДОКУМЕНТА</h2>
        <textarea id="edit-report-area" class="report-area" style="height: 400px; width: 100%; font-family:monospace; font-size:14px;">${r.text}</textarea>
        <div class="actions" style="margin-top: 15px;">
            <button onclick="saveEditedReport('${id}')" class="btn-primary">СОХРАНИТЬ ИЗМЕНЕНИЯ</button>
            <button onclick="viewReport('${id}')" class="btn-secondary">ОТМЕНА</button>
        </div>
    `;
}

function saveEditedReport(id) {
    const newText = document.getElementById('edit-report-area').value;
    db.collection('reports').doc(id).update({
        text: newText
    }).then(() => {
        alert("Документ успешно обновлен!");
        viewReport(id); 
    }).catch(err => alert("Ошибка: " + err.message));
}

function addReportNote(id) {
    const r = reports.find(rep => rep.id === id);
    if(!r) return;

    const noteText = prompt("Введите текст служебной заметки (ордера, комментарии, обновления по делу):");
    if(noteText !== null && noteText.trim() !== "") {
        const newNote = {
            author: currentUser.name,
            date: new Date().toLocaleString(),
            text: noteText.trim()
        };
        
        let currentNotes = r.notes || [];
        currentNotes.push(newNote);
        
        db.collection('reports').doc(id).update({
            notes: currentNotes
        }).then(() => {
            viewReport(id); 
        }).catch(err => alert("Ошибка добавления заметки: " + err.message));
    }
}
