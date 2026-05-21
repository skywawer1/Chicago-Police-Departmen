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

// --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (ПОЛНЫЙ НАБОР ИЗ БЭКАПА) ---
let users = {};
let jsaNews = [];
let jsaRequests = [];
let reports = [];
let gangs = [];
let shootingStats = {};
let drafts = JSON.parse(localStorage.getItem('cpd_v5_drafts')) || {};
let currentUser = null;
let currentMode = "PATROL"; // PATROL, DETECTIVE, DISPATCH
let loadedPhotos = [];
let chicagoLaws = [];

// Точные шаблоны отчетов
const TEMPLATES = {
    incident: `CHICAGO POLICE DEPARTMENT\nРАПОРТ ОБ ИНЦИДЕНТЕ\n--\nФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка)\nДата, время и место происшествия: XX-XX-2026 |\nXX-XX | (Указать место)\nОбстоятельства инцидента:\n(Тут описать всю ситуацию)\n\nЛица, причастные к инциденту:\n(Вписать ники как сотрудников причастных так и свидетелей)\n\nПредварительные выводы:\n(Опишите свой предварительный вывод)\n\nПринятые меры:\n(Тут описать все ваши принятые меры)\n__\n\nДата: XX.XX.2026\nВремя: XX-XX`,
    
    accident: `CHICAGO POLICE DEPARTMENT\nОТЧЕТ О ПРОИСШЕСТВИИ\n--\nФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка)\nДата, время и место происшествия: XX-XX-2026 |\nОбстоятельства инцидента:\n(Тут описать всю ситуацию)\n\nПринятые меры:\n(Тут описать все ваши принятые меры)\n__\n\nДата: XX.XX.2026\nПодпись: TEXT`,
    
    casefile: `CHICAGO CITY | GANG SUPPRESSION UNIT\n\n1. ОСНОВНАЯ ИНФОРМАЦИЯ\nНомер дела: D-\${Math.floor(Math.random()*900000 + 100000)}DT\nДата открытия: \${new Date().toLocaleDateString()}\nДетектив: Имя детектива\nОтдел: Gang Suppression Unit\nСтатус дела: OPEN\nТип преступления: Gang Activity\n\n2. ИНФОРМАЦИЯ О ПОДОЗРЕВАЕМОМ\nИмя Фамилия:\nБанда / группировка:\n\n3. ОПИСАНИЕ СИТУАЦИИ\nПодробно расписывается вся ситуация наблюдения и задержания.\n\n5. ДОКАЗАТЕЛЬСТВА\nИзъятое оружие, наркотики, записи с боди-камер.`
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
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) closeBtn.onclick = () => document.getElementById('modal-view').style.display = 'none';
}

function setupFirebaseListeners() {
    auth.onAuthStateChanged(user => {
        if (user) {
            db.collection('users').doc(user.email).onSnapshot(doc => {
                if (doc.exists) {
                    currentUser = doc.data();
                    if (currentUser.rank === "DISPATCHER" && currentMode !== "DISPATCH") {
                        currentMode = "DISPATCH";
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

    db.collection('jsa_news').orderBy('timestamp', 'desc').onSnapshot(snap => {
        jsaNews = snap.docs.map(d => ({id: d.id, ...d.data()}));
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
        if (activeNav) {
            switchTab(activeNav.textContent);
        } else {
            renderUI();
        }
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
    
    const hasSpecialAccess = currentUser.rank === "ADMIN" || currentUser.rank === "DETECTIVE" || currentUser.rank === "DISPATCHER" || currentUser.division === "GED"; 
    const bureauBtn = document.getElementById('btn-switch-bureau');
    
    bureauBtn.style.display = hasSpecialAccess ? 'block' : 'none';
    if (currentMode === "PATROL") bureauBtn.textContent = "DETECTIVE BUREAU ⮂";
    else if (currentMode === "DETECTIVE") bureauBtn.textContent = "DISPATCH PANEL ⮂";
    else bureauBtn.textContent = "PATROL DIVISION ⮂";

    renderNav();
}

function renderNav() {
    const nav = document.getElementById('sidebar-nav');
    const currentActiveText = document.querySelector('.nav-item.active') ? document.querySelector('.nav-item.active').textContent : null;
    nav.innerHTML = '';
    let menu = [];

    if (currentUser.rank === "USER") {
        menu.push('Ожидание одобрения');
    } else {
        // ДИНАМИЧЕСКОЕ СКРЫТИЕ ВКЛАДОК ПРИ OFF DUTY (КАК НА СКРИНШОТАХ)
        if (currentUser.status === "OFF DUTY") {
            menu.push('Законодательство', 'Новости JSA');
            if (currentUser.rank === "DISPATCHER" || currentMode === "DISPATCH") {
                menu.push('Статус диспетчера');
            } else {
                menu.push('Мои отчёты');
            }
        } else {
            // КОГДА НА СМЕНЕ (ON DUTY / ON SCENE) — ОТКРЫВАЮТСЯ ВСЕ ВКЛАДКИ
            if (currentUser.rank === "DISPATCHER" || currentMode === "DISPATCH") {
                menu.push('Панель диспетчера', 'Активные вызовы', 'Управление юнитами', 'Все патрульные', 'Законодательство', 'Новости JSA');
            } else if (currentMode === "PATROL") {
                menu.push('Новый отчёт', 'Мои отчёты', 'Все отчёты', 'Все патрульные', 'Законодательство', 'Статистика', 'Новости JSA', 'Постановления/Обращения', 'Система выговоров');
            } else if (currentMode === "DETECTIVE") {
                menu.push('Кейс-файлы', 'Активные банды', 'Сотрудники ГЕД', 'Статистика районов', 'Новости JSA', 'Постановления/Обращения');
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
    container.innerHTML = `<h2 class="tab-title">${tab.toUpperCase()}</h2>`;

    if (tab === 'Ожидание одобрения') {
        container.innerHTML += `<p class="empty-text">Вы успешно зарегистрированы в системе CPD. Обратитесь к руководству для привязки ранга к почте: <strong>\${currentUser.email}</strong>.</p>`; 
    }
    else if (tab === 'Статус диспетчера') {
        container.innerHTML += `<p class="empty-text" style="color:var(--warning);">Вы находитесь вне смены (OFF DUTY). Измените статус на панели слева, чтобы открыть полный доступ к координации.</p>`;
    }
    // --- ПОЛНОЦЕННЫЙ МЕНЮ-ИНТЕРФЕЙС ДИСПЕТЧЕРА ---
    else if (tab === 'Панель диспетчера') {
        container.innerHTML += `
            <div class="stat-grid">
                <div class="stat-card" style="border-left: 4px solid var(--accent-blue); background: #0b132b;">
                    <h3 style="color:var(--accent-blue)">Активные патрули</h3>
                    <p style="font-size: 28px; font-weight: bold; margin-top:5px; color:#fff;">
                        \${Object.values(users).filter(u => u.status !== "OFF DUTY" && u.rank !== "USER").length} юнитов
                    </p>
                </div>
                <div class="stat-card" style="border-left: 4px solid var(--success); background: #0b132b;">
                    <h3 style="color:var(--success)">Состояние частоты TAC-1</h3>
                    <p style="font-size: 16px; font-weight: bold; margin-top:5px; color:#fff;">СТАБИЛЬНО (Шифрование включено)</p>
                </div>
            </div>
            <div class="form-box" style="margin-top:20px;">
                <h3>Передать общую директиву диспетчерской в эфир</h3>
                <input type="text" id="dispatch-announcement" class="input-field" placeholder="Введите экстренный текст для всех патрульных экипажей...">
                <button onclick="alert('Директива успешно отправлена во внутренний эфир радиостанций!')" class="btn-primary" style="margin-top:10px; width:100%;">ОТПРАВИТЬ СООБЩЕНИЕ</button>
            </div>`;
    }
    else if (tab === 'Активные вызовы') {
        container.innerHTML += `
            <table class="db-table">
                <thead><tr><th>ID КАРТОЧКИ</th><th>ТИП ПРОИСШЕСТВИЯ</th><th>АДРЕС / ЛОКАЦИЯ</th><th>СТАТУС ВЫЗОВА</th><th>ЗАКРЕПЛЕННЫЕ ЭКИПАЖИ</th></tr></thead>
                <tbody>
                    <tr><td>#911-04</td><td style="color:#ef4444; font-weight:bold;">Code 3 | Огнестрельное ранение</td><td>South Chicago (115th St)</td><td><span class="status-badge on-scene">НА МЕСТЕ</span></td><td>1A-10, 2B-20</td></tr>
                    <tr><td>#911-05</td><td style="color:var(--warning); font-weight:bold;">Code 2 | Вооруженное ограбление магазина</td><td>Downtown Chicago</td><td><span class="status-badge on-duty">ОЖИДАНИЕ</span></td><td>NONE</td></tr>
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
                        <h3>\${u.name}</h3>
                        <p style="font-size:14px; color:var(--accent-blue); font-weight:bold; margin: 5px 0;">Маркировка: \${u.unit}</p>
                        <p style="font-size:12px; color:var(--text-gray);">\${u.division} | \${u.rank}</p>
                        <span class="status-badge \${u.status.replace(' ', '-').toLowerCase()}" style="margin-top:10px; display:inline-block;">\${u.status}</span>
                    </div>`;
            });
            container.innerHTML += `</div>`;
        }
    }
    // --- ВОССТАНОВЛЕННАЯ СИСТЕМА НОВОСТЕЙ JSA ---
    else if (tab === 'Новости JSA') {
        if(currentUser.rank === "ADMIN" || currentUser.rank === "DETECTIVE") {
            container.innerHTML += `
                <div class="form-box" style="margin-bottom:20px;">
                    <h3>Опубликовать новость / приказ JSA</h3>
                    <input id="jsa-news-title" class="input-field" placeholder="Заголовок публикации">
                    <textarea id="jsa-news-text" class="input-field" style="height:80px;" placeholder="Текст объявления..."></textarea>
                    <button onclick="publishJsaNews()" class="btn-primary">ОПУБЛИКОВАТЬ</button>
                </div>`;
        }
        if(jsaNews.length === 0) {
            container.innerHTML += `<p class="empty-text">Нет официальных публикаций от JSA.</p>`;
        } else {
            jsaNews.forEach(n => {
                let delBtn = currentUser.rank === "ADMIN" ? `<button onclick="deleteJsaNews('\${n.id}')" class="btn-delete-action" style="float:right;">Удалить</button>` : '';
                container.innerHTML += `
                    <div class="stat-card" style="margin-bottom:15px; border-left: 4px solid var(--warning);">
                        \${delBtn}
                        <h3 style="color:var(--warning)">\${n.title}</h3>
                        <p style="font-size:11px; color:var(--text-gray)">Автор: \${n.author} | \${n.date}</p>
                        <p style="margin-top:10px; white-space:pre-wrap; line-height:1.4;">\${n.text}</p>
                    </div>`;
            });
        }
    }
    // --- ВОССТАНОВЛЕННАЯ СИСТЕМА ПОСТАНОВЛЕНИЙ И ОБРАЩЕНИЙ ---
    else if (tab === 'Постановления/Обращения') {
        container.innerHTML += `
            <div class="form-box">
                <h3>Подать документ в архив JSA</h3>
                <select id="jsa-doc-type" class="input-field">
                    <option value="appeal">Обращение/Апелляция от сотрудника</option>
                    <option value="postanovlenie">Официальное постановление руководства</option>
                </select>
                <input id="jsa-doc-title" class="input-field" placeholder="Заголовок или номер документа">
                <textarea id="jsa-doc-text" class="report-area" placeholder="Полный текст документа..."></textarea>
                <button onclick="submitJsaDoc()" class="btn-primary">ОТПРАВИТЬ НА РЕГИСТРАЦИЮ</button>
            </div>`;
    }
    // --- ВОССТАНОВЛЕННАЯ СИСТЕМА ВЫГОВОРОВ ИЗ ЛИЧНЫХ ДЕЛ ---
    else if (tab === 'Система выговоров') {
        if(currentUser.rank === "ADMIN" || currentUser.rank === "SERGEANT") {
            container.innerHTML += `
                <div class="form-box" style="margin-bottom:20px;">
                    <h3>Выдать дисциплинарное взыскание</h3>
                    <input id="reprimand-email" class="input-field" placeholder="Email нарушителя">
                    <select id="reprimand-type" class="input-field">
                        <option value="Устный выговор">Устный выговор (1/2)</option>
                        <option value="Строгий выговор">Строгий выговор (1/3)</option>
                        <option value="Предупреждение">Предупреждение</option>
                    </select>
                    <input id="reprimand-reason" class="input-field" placeholder="Причина выговора / Статья устава">
                    <button onclick="addReprimand()" class="btn-primary">ЗАНЕСТИ В ЛИЧНОЕ ДЕЛО</button>
                </div>`;
        }
        
        container.innerHTML += `<h3>ЖУРНАЛ ДИСЦИПЛИНАРНЫХ ВЗЫСКАНИЙ</h3>`;
        let hasReprimands = false;
        Object.keys(users).forEach(email => {
            let u = users[email];
            if(u.reprimands && u.reprimands.length > 0) {
                hasReprimands = true;
                container.innerHTML += `
                    <div class="stat-card" style="margin-bottom:10px; border-left: 4px solid #ef4444;">
                        <strong>\${u.name} (\${email})</strong>
                        <div style="margin-top:5px; font-size:13px;">
                            \${u.reprimands.map((r, idx) => `
                                <div style="border-top:1px solid var(--border); padding:5px 0;">
                                    <span style="color:#ef4444; font-weight:bold;">[\${r.type}]</span> \${r.reason} | Выдал: \${r.issuedBy}
                                    \${currentUser.rank === "ADMIN" ? `<button onclick="removeReprimand('\${email}', \${idx})" class="btn-delete-action" style="padding:2px 5px; font-size:10px; margin-left:10px;">Снять</button>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
            }
        });
        if(!hasReprimands) container.innerHTML += `<p class="empty-text">Дисциплинарных нарушений у сотрудников не обнаружено.</p>`;
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
                    \${options}
                </select>
                <textarea id="report-text" class="report-area" placeholder="Текст отчета сгенерируется после выбора формата..."></textarea>
                <div class="photo-uploader">
                    <label for="photo-input" class="upload-label">📁 ДОБАВИТЬ ФОТОГРАФИИ ИЛИ СКРИНШОТЫ</label>
                    <input type="file" id="photo-input" multiple accept="image/*" style="display:none;" onchange="previewPhotos()">
                    <div id="photo-previews" class="preview-container"></div>
                </div>
                <div class="actions">
                    <button onclick="saveDraft()" class="btn-secondary">СОХРАНИТЬ В ЧЕРНОВИК</button>
                    <button onclick="submitReport('\${isCase ? 'casefile' : 'patrol'}')" class="btn-primary">ОТПРАВИТЬ В БАЗУ ДАННЫХ</button>
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
                    <h3>\${d.name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">\${d.rank}</p>
                    <p style="font-size:12px; color:var(--text-gray);">\${d.division} | Маркировка: \${d.unit}</p>
                    <span class="status-badge \${d.status.replace(' ', '-').toLowerCase()}" style="margin-top:10px; display:inline-block;">\${d.status}</span>
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
                    <h3>\${u.name}</h3>
                    <p>Позывной: <strong>\${u.unit}</strong></p>
                    <p>Дивизион: <strong>\${u.division}</strong></p>
                    <p style="margin-top:10px; color:var(--accent-blue);">Всего отчетов: <span style="font-size:20px; font-weight:bold;">\${u.count}</span></p>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Активные банды') {
        container.innerHTML += `<div class="gang-grid" id="gang-container"></div>`;
        const gCont = document.getElementById('gang-container');
        gangs.forEach(g => {
            const div = document.createElement('div');
            div.className = 'gang-card';
            div.innerHTML = `<h3>\${g.name}</h3><p style="color:var(--text-gray); font-size:12px; margin-top:10px;">Открыть архивы дела</p>`;
            div.onclick = () => viewGang(g);
            gCont.appendChild(div);
        });
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
        table += `<tr onclick="viewReport('\${r.id}')">
                <td style="color:var(--accent-blue); font-weight:bold;">\${r.type.toUpperCase()}</td>
                <td>\${r.date}</td><td>\${r.author}</td><td>\${r.unit}</td><td>\${r.division}</td>
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
                <h3 style="color: var(--warning);">\${law.code} - \${law.title}</h3>
                <p style="margin-top: 10px; font-size: 13px; color: var(--text-white);\精度">\${law.text}</p>
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
        cont.innerHTML += `<img src="\${base64}" class="preview-img">`; 
    }
}

function saveDraft() {
    const text = document.getElementById('report-text').value;
    const type = currentMode === 'PATROL' ? 'patrol' : 'casefile';
    if(!text) return alert("Нечего сохранять.");
    drafts[currentUser.email + '_' + type] = text;
    localStorage.setItem('cpd_v5_drafts', JSON.stringify(drafts));
    alert("Сохранено в черновик.");
}

function submitReport(globalType) {
    const type = document.getElementById('report-type').value;
    const text = document.getElementById('report-text').value;
    if (!type || !text) return alert("Заполните поля документа!");
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
        alert("Документ успешно сохранен в главную базу данных!");
        loadedPhotos = [];
        switchTab(currentMode === 'PATROL' ? 'Мои отчёты' : 'Кейс-файлы');
    });
}

function publishJsaNews() {
    const title = document.getElementById('jsa-news-title').value.trim();
    const text = document.getElementById('jsa-news-text').value.trim();
    if(!title || !text) return alert("Заполните заголовок и текст!");
    db.collection('jsa_news').add({
        title, text, author: currentUser.name, date: new Date().toLocaleString(), timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Новость опубликована!");
        switchTab('Новости JSA');
    });
}

function deleteJsaNews(id) {
    if(confirm("Удалить новость?")) {
        db.collection('jsa_news').doc(id).delete().then(() => switchTab('Новости JSA'));
    }
}

function submitJsaDoc() {
    const type = document.getElementById('jsa-doc-type').value;
    const title = document.getElementById('jsa-doc-title').value.trim();
    const text = document.getElementById('jsa-doc-text').value.trim();
    if(!title || !text) return alert("Заполните данные документа!");
    db.collection('reports').add({
        type: type.toUpperCase(), globalType: 'jsa-doc', text, author: currentUser.name, unit: currentUser.unit, division: currentUser.division, email: currentUser.email, date: new Date().toLocaleString(), timestamp: firebase.firestore.FieldValue.serverTimestamp(), photos: []
    }).then(() => {
        alert("Документ JSA успешно зарегистрирован!");
        document.getElementById('jsa-doc-title').value = '';
        document.getElementById('jsa-doc-text').value = '';
    });
}

function addReprimand() {
    const email = document.getElementById('reprimand-email').value.toLowerCase().trim();
    const type = document.getElementById('reprimand-type').value;
    const reason = document.getElementById('reprimand-reason').value.trim();
    if(!email || !reason) return alert("Укажите сотрудника и причину!");
    
    const target = users[email];
    if(!target) return alert("Сотрудник с таким Email не найден в базе данных!");
    let currentReps = target.reprimands || [];
    currentReps.push({ type, reason, issuedBy: currentUser.name });
    db.collection('users').doc(email).update({ reprimands: currentReps }).then(() => {
        alert("Дисциплинарное взыскание занесено!");
        switchTab('Система выговоров');
    });
}

function removeReprimand(email, index) {
    if(!confirm("Снять это взыскание?")) return;
    let currentReps = users[email].reprimands || [];
    currentReps.splice(index, 1);
    db.collection('users').doc(email).update({ reprimands: currentReps }).then(() => switchTab('Система выговоров'));
}

function viewReport(id) {
    const r = reports.find(rep => rep.id === id);
    if(!r) return;
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';
    let photoHtml = r.photos && r.photos.length ? r.photos.map(p => `<img src="\${p}" class="report-photo" onclick="window.open(this.src)">`).join('') : '<p style="color:var(--text-gray)">Фото отсутствуют.</p>';
    let adminBtn = currentUser.rank === "ADMIN" ? `<button onclick="deleteReport('\${r.id}')" class="btn-delete-action">УДАЛИТЬ ИЗ БАЗЫ</button>` : '';
    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border); padding-bottom: 10px;">
            <h1 style="color:var(--accent-blue); margin:0; font-size:20px;">\${r.type.toUpperCase()}</h1>
            <div>\${adminBtn} <span style="color:var(--text-gray); font-size:14px;">\${r.date}</span></div>
        </div>
        <p style="color: #cbd5e1; font-size:14px; margin-top:10px;"><strong>ИСПОЛНИТЕЛЬ:</strong> \${r.author} [\${r.unit}] | <strong>ОТДЕЛ:</strong> \${r.division}</p>
        <div style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); margin-top:15px; font-family:monospace;">\${r.text}</div>
        <div class="report-photos-grid" style="margin-top:15px;">\${photoHtml}</div>
    `;
}

function deleteReport(id) {
    if (confirm("Вы уверены, что хотите удалить отчет?")) {
        db.collection('reports').doc(id).delete().then(() => {
            document.getElementById('modal-view').style.display = 'none';
            alert("Документ удален."); 
        });
    }
}

function viewGang(g) {
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';
    document.getElementById('modal-body').innerHTML = `
        <h1 style="color:#ef4444; border-bottom: 2px solid var(--border); padding-bottom:10px; font-size:24px;">ДОСЬЕ ОПГ: \${g.name}</h1>
        <div style="margin-top:20px; white-space: pre-wrap; font-size:15px; color:#e2e8f0;">\${g.info}</div>
    `;
}

function renderAdminPanel(container) {
    container.innerHTML += `
        <div class="admin-panel-grid">
            <div class="form-box admin-box">
                <h3>УПРАВЛЕНИЕ РАНГАМИ И ДОСТУПОМ</h3>
                <input id="adm-email" class="input-field" placeholder="Email сотрудника (user@cpd.gov)">
                <input id="adm-name" class="input-field" placeholder="Позывной / Имя Фамилия">
                
                <select id="adm-rank" class="input-field">
                    <option value="USER">USER (Гражданский - без доступа)</option>
                    <option value="PO">PO (Patrol Officer)</option>
                    <option value="DISPATCHER">DISPATCHER (Диспетчер)</option>
                    <option value="SERGEANT">SERGEANT</option>
                    <option value="DETECTIVE">DETECTIVE (Доступ к Бюро)</option>
                    <option value="ADMIN">ADMIN (Суперадминистратор)</option>
                </select>
                
                <select id="adm-div" class="input-field">
                    <option value="Unassigned">Unassigned</option>
                    <option value="Patrol Division">Patrol Division</option>
                    <option value="Communications">Communications (Диспетчерская)</option>
                    <option value="GED">GED (Gang Suppression Unit)</option>
                    <option value="Detective Bureau">Detective Bureau</option>
                </select>
                <button onclick="updateUser()" class="btn-primary" style="width:100%; margin-top:10px;">ВЫДАТЬ ЗВАНИЕ И ПРАВА</button>
            </div>
            <div class="form-box admin-box">
                <h3>ДОБАВЛЕНИЕ ОПГ В КАРТОТЕКУ</h3>
                <input id="adm-gang" class="input-field" placeholder="Название ОПГ">
                <textarea id="adm-gang-info" class="input-field" style="height:80px;" placeholder="Сводка по ОПГ..."></textarea>
                <button onclick="addGang()" class="btn-primary" style="width:100%">ДОБАВИТЬ В БАЗУ ДАННЫХ</button>
            </div>
        </div>
        <div class="form-box admin-box" style="margin-top:15px;">
            <h3>ПУБЛИКАЦИЯ СТАТЬИ ЗАКОНОДАТЕЛЬСТВА</h3>
            <input id="adm-law-code" class="input-field" placeholder="Статья (например, 1.01)">
            <input id="adm-law-title" class="input-field" placeholder="Название закона">
            <textarea id="adm-law-text" class="input-field" style="height:60px;" placeholder="Описание уголовной или административной санкции..."></textarea>
            <button onclick="addLaw()" class="btn-primary" style="width:100%; margin-top:10px;">ОПУБЛИКОВАТЬ СТАТЬЮ</button>
        </div>`;
}

function updateUser() {
    const email = document.getElementById('adm-email').value.toLowerCase().trim();
    const name = document.getElementById('adm-name').value.trim();
    const rank = document.getElementById('adm-rank').value;
    const div = document.getElementById('adm-div').value;
    if (!email) return alert("Введите Email!");
    let updates = { rank, division: div };
    if (name) updates.name = name;
    db.collection('users').doc(email).update(updates).then(() => alert(`Данные сотрудника обновлены!`));
}

function addGang() {
    const name = document.getElementById('adm-gang').value.trim();
    const info = document.getElementById('adm-gang-info').value.trim();
    if(!name || !info) return alert("Заполните поля!");
    db.collection('gangs').add({ name, info, photos: [] }).then(() => {
        alert(`Группировка добавлена.`);
        document.getElementById('adm-gang').value = '';
        document.getElementById('adm-gang-info').value = '';
    });
}

function editField(field) {
    let currentVal = currentUser[field];
    let newVal = prompt(`Новое значение для \${field.toUpperCase()}:`, currentVal);
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
        renderNav(); // Мгновенно перерисовываем навигацию при клике на кнопку статуса!
    });
}

function switchMode() { 
    if (currentMode === "PATROL") currentMode = "DETECTIVE";
    else if (currentMode === "DETECTIVE") currentMode = "DISPATCH";
    else currentMode = "PATROL";
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

function addLaw() {
    const code = document.getElementById('adm-law-code').value.trim();
    const title = document.getElementById('adm-law-title').value.trim();
    const text = document.getElementById('adm-law-text').value.trim();
    if(!code || !title || !text) return alert("Заполните поля закона!");
    db.collection('laws').add({ code, title, text }).then(() => {
        alert(`Закон \${code} добавлен.`);
        document.getElementById('adm-law-code').value = '';
        document.getElementById('adm-law-title').value = '';
        document.getElementById('adm-law-text').value = '';
    });
}
