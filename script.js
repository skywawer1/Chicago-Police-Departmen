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
let currentUser = null;
let currentMode = "PATROL"; 
let loadedPhotos = [];
let chicagoLaws = [];

// Точные шаблоны отчетов
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
            chicagoLaws.sort((a, b) => a.code.localeCompare(b.code));
            refreshUI();
        });
    });

    db.collection('users').onSnapshot(snap => {
        users = {};
        snap.docs.forEach(d => {
            users[d.id] = d.data();
        });
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
    document.getElementById('disp-name').textContent = currentUser.name || "Без имени";
    document.getElementById('disp-unit').textContent = currentUser.unit || "NONE";
    document.getElementById('disp-rank-div').textContent = `${currentUser.rank || "USER"} / ${currentUser.division || "Unassigned"}`;
    
    const statusVal = currentUser.status || "OFF DUTY";
    const statusEl = document.getElementById('disp-status');
    statusEl.textContent = statusVal;
    statusEl.className = 'value status-badge ' + statusVal.replace(' ', '-').toLowerCase();
    
    const hasDetAccess = currentUser.rank === "ADMIN" || currentUser.rank === "DETECTIVE" || currentUser.division === "GED"; 
    const bureauBtn = document.getElementById('btn-switch-bureau');
    bureauBtn.style.display = hasDetAccess ? 'block' : 'none';
    bureauBtn.textContent = currentMode === "PATROL" ? "DETECTIVE BUREAU ⮂" : "PATROL DIVISION ⮂";
    renderNav();
}

// Функция переключения между подразделениями
window.changeMode = function(newMode) {
    currentMode = newMode;
    renderUI();
};

function renderUI() {
    if (!currentUser) return;

    const nameEl = document.getElementById('user-name');
    const rankEl = document.getElementById('user-rank');

    if (nameEl) nameEl.innerText = currentUser.name;
    if (rankEl) rankEl.innerText = `${currentUser.rank} | ${currentUser.unit}`;

    const sidebar = document.getElementById('sidebar-menu');
    sidebar.innerHTML = ""; 

    // Выпадающий список выбора подразделения (Стильный селектор)
    sidebar.innerHTML += `
        <div style="margin-bottom: 20px;">
            <p style="color: var(--text-gray); font-size: 11px; font-weight: bold; margin-bottom: 5px;">ПОДРАЗДЕЛЕНИЕ / РЕЖИМ:</p>
            <select onchange="changeMode(this.value)" style="width: 100%; padding: 10px; background: #0f172a; color: var(--accent-blue); border: 1px solid var(--border); border-radius: 4px; font-weight: bold; cursor: pointer; outline: none;">
                <option value="PATROL" ${currentMode === 'PATROL' ? 'selected' : ''}>🚓 PATROL DIVISION</option>
                ${(currentUser.rank !== 'PO' && currentUser.rank !== 'USER') ? `<option value="DETECTIVE" ${currentMode === 'DETECTIVE' ? 'selected' : ''}>🕵️ DETECTIVE BUREAU</option>` : ''}
                <option value="JSA" ${currentMode === 'JSA' ? 'selected' : ''}>⚖️ JSA LIAISON</option>
                <option value="DISPATCHER" disabled>📻 DISPATCHER (Доработка)</option>
            </select>
        </div>
    `;

    // Отрисовка кнопок в зависимости от выбранного режима
    if (currentMode === "JSA") {
        sidebar.innerHTML += `
            <button onclick="switchTab('Новости JSA')" class="menu-btn" style="border-left: 2px solid #eab308;">📰 НОВОСТИ ЮСТИЦИИ</button>
        `;
        // Если у человека ранг JSA или ADMIN — даем полный доступ
        if (currentUser.rank === 'JSA' || currentUser.rank === 'ADMIN') {
            sidebar.innerHTML += `
                <button onclick="switchTab('Заявления от сотрудников')" class="menu-btn">📥 ЗАЯВЛЕНИЯ В JSA</button>
                <button onclick="switchTab('Постановления JSA')" class="menu-btn">📜 ПОСТАНОВЛЕНИЯ</button>
                <button onclick="switchTab('Все сотрудники базы')" class="menu-btn">👥 ВСЕ СОТРУДНИКИ (БАЗА)</button>
            `;
        } else {
            sidebar.innerHTML += `
                <div style="padding: 15px; margin-top: 10px; background: rgba(234, 179, 8, 0.1); border-left: 3px solid #eab308; color: #cbd5e1; font-size: 12px; line-height: 1.5;">
                    🔒 Вы находитесь в разделе Юстиции. Доступ к документации JSA имеют только уполномоченные сотрудники и Сенат.
                </div>
            `;
        }
    } 
    else if (currentMode === "DETECTIVE") {
        sidebar.innerHTML += `
            <button onclick="switchTab('Все отчёты')" class="menu-btn">📊 ВСЕ КЕЙС-ФАЙЛЫ</button>
            <button onclick="switchTab('Кейс-файлы')" class="menu-btn">📂 НОВЫЙ КЕЙС-ФАЙЛ</button>
            <button onclick="switchTab('Сотрудники ГЕД')" class="menu-btn">🕵️‍♂️ СОТРУДНИКИ DB/GED</button>
            <button onclick="switchTab('Активные банды')" class="menu-btn">🎴 АКТИВНЫЕ БАНДЫ</button>
        `;
    } 
    else {
        // Обычный PATROL
        sidebar.innerHTML += `
            <button onclick="switchTab('Новости JSA')" class="menu-btn" style="border-left: 2px solid #eab308; margin-bottom: 15px;">📰 НОВОСТИ JSA</button>
            <button onclick="switchTab('Написать в JSA')" class="menu-btn">✉️ ПОДАТЬ ЗАЯВЛЕНИЕ В JSA</button>
            <hr style="border-color:var(--border); margin: 10px 0;">
            <button onclick="switchTab('Мои отчёты')" class="menu-btn">📄 МОИ РАПОРТЫ</button>
            <button onclick="switchTab('Новый отчёт')" class="menu-btn">📝 ПОДАТЬ РАПОРТ</button>
            <button onclick="switchTab('Все патрульные')" class="menu-btn">🚔 ВСЕ ПАТРУЛЬНЫЕ</button>
            <button onclick="switchTab('Законодательство')" class="menu-btn">⚖️ ЗАКОНОДАТЕЛЬСТВО</button>
        `;
    }

    if (currentUser.rank === "ADMIN") {
        sidebar.innerHTML += `
            <button onclick="switchTab('Панель Управления')" class="menu-btn" style="margin-top:20px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #f87171;">⚙️ АДМИН-ПАНЕЛЬ</button>
        `;
    }

    if (!document.querySelector('.tab-title')) {
        switchTab(currentUser.rank === "USER" ? 'Ожидание одобрения' : 'Мои отчёты');
    }
}

   // 1. Явно объявляем вкладки для терминала
    const terminalTabs = ['Главная', 'База Данных', 'JSA Liaison', 'Панель Управления'];

    // 2. Ищем контейнер бокового меню (на скриншоте 167 у тебя это 'sidebar')
    const nav = document.getElementById('sidebar-menu');

    if (nav) {
        // Очищаем старое меню, но оставляем шапку с профилем, если она рендерится внутри innerHTML выше
        // Если у тебя профиль затирается, эту строку nav.innerHTML = "" можно убрать.
        
        terminalTabs.forEach(item => {
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
    }

function switchTab(tab) {
    const container = document.getElementById('tab-container');
    // Очищаем контейнер и задаем базовый заголовок вкладки
    container.innerHTML = `<h2 class="tab-title">${tab.toUpperCase()}</h2>`;

    if (tab === 'Ожидание одобрения') {
        container.innerHTML += `<p class="empty-text">Вы успешно зарегистрированы в системе CPD.
        Обратитесь к шефу/администратору для привязки ранга к почте: <strong>${currentUser.email}</strong>.</p>`; 
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

        // Если это вкладка Кейс-файлы, выводим таблицу с кейс-файлами ниже формы
        if (isCase) {
            container.innerHTML += `<br><hr style="border-color:var(--border); margin: 25px 0;"><h3 style="color:var(--accent-blue); margin-bottom:15px;">АРХИВ КЕЙС-ФАЙЛОВ</h3>`;
            let caseFilesList = reports.filter(r => r.globalType === 'casefile' || r.type === 'casefile');
            renderReportTable(container, caseFilesList);
        }
     
    else if (tab === 'Постановления JSA') {
        let isJSA = (currentUser.rank === 'JSA' || currentUser.rank === 'ADMIN');
        
        let htmlContent = `
            <p class="tab-subtitle" style="color:var(--text-gray); margin-bottom: 20px;">Официальные постановления и судебные ордера от сотрудников Юстиции (JSA).</p>
        `;

        if (isJSA) {
            htmlContent += `
                <div class="form-box" style="border-left: 4px solid #eab308; margin-bottom: 30px;">
                    <h3 style="color:#eab308; margin-bottom: 15px;">📜 ИЗДАТЬ НОВОЕ ПОСТАНОВЛЕНИЕ / ОРДЕР</h3>
                    <select id="report-type" class="input-field" onchange="applyTemplate()" style="margin-bottom:15px; border-color:#eab308;">
                        <option value="">-- ВЫБЕРИТЕ ТИП ДОКУМЕНТА --</option>
                        <option value="постановление">ОФИЦИАЛЬНОЕ ПОСТАНОВЛЕНИЕ JSA</option>
                    </select>
                    <input type="text" id="jsa-title" class="input-field" placeholder="ЗАГОЛОВОК (Например: ПОСТАНОВЛЕНИЕ №042 — ОБЫСК ИМУЩЕСТВА)">
                    <textarea id="report-text" class="report-area" style="height: 200px;" placeholder="Выберите формат выше для генерации бланка..."></textarea>
                    <div class="actions">
                        <button onclick="submitJSADocument('постановление')" class="btn-primary" style="background:#eab308; color:#000; font-weight:bold;">ОПУБЛИКОВАТЬ ДОКУМЕНТ</button>
                    </div>
                </div>
            `;
        } else {
            htmlContent += `
                <div class="info-box" style="background: rgba(234, 179, 8, 0.1); border-left: 4px solid #eab308; padding: 15px; border-radius: 4px; margin-bottom: 20px; color: #f1f1f1;">
                    🔒 Публикация постановлений доступна только сотрудникам со статусом <strong>JSA Liaison / Судебная власть</strong>.
                </div>
            `;
        }

        htmlContent += `
            <br><hr style="border-color:var(--border); margin: 25px 0;">
            <h3 style="color:var(--accent-blue); margin-bottom:15px;">АРХИВ ПОСТАНОВЛЕНИЙ</h3>
        `;
        
        container.innerHTML += htmlContent;

        // Выводим существующие постановления
        let jsaList = reports.filter(r => r.globalType === 'jsa-doc' || r.type === 'постановление');
        renderReportTable(container, jsaList);
    }
    else if (tab === 'Обращения к JSA') {
        let htmlContent = `
            <p class="tab-subtitle" style="color:var(--text-gray); margin-bottom: 20px;">Подача и просмотр обращений, запросов на ордера и передача дел от Департамента Полиции в JSA.</p>
            
            <div class="form-box" style="margin-bottom: 30px;">
                <h3 style="color:var(--accent-blue); margin-bottom: 15px;">📥 ОТПРАВИТЬ ОБРАЩЕНИЕ / ЗАПРОС НА ОРДЕР</h3>
                <select id="report-type" class="input-field" onchange="applyTemplate()" style="margin-bottom:15px;">
                    <option value="">-- ВЫБЕРИТЕ ТИП ОБРАЩЕНИЯ --</option>
                    <option value="обращение">ОБРАЩЕНИЕ В ЮСТИЦИЮ ОТ ПОЛИЦИИ</option>
                </select>
                <input type="text" id="jsa-appeal-title" class="input-field" placeholder="ТЕМА ОБРАЩЕНИЯ (Например: Запрос ордера по Case File №012)">
                <textarea id="report-text" class="report-area" style="height: 180px;" placeholder="Выберите формат выше для генерации бланка..."></textarea>
                <div class="actions">
                    <button onclick="submitJSADocument('обращение')" class="btn-primary">ОТПРАВИТЬ В ЮСТИЦИЮ</button>
                </div>
            </div>

            <br><hr style="border-color:var(--border); margin: 25px 0;">
            <h3 style="color:var(--accent-blue); margin-bottom:15px;">СПИСОК НАПРАВЛЕННЫХ ОБРАЩЕНИЙ</h3>
        `;
        
        container.innerHTML += htmlContent;

        // Выводим существующие обращения
        let appealsList = reports.filter(r => r.globalType === 'jsa-appeal' || r.type === 'обращение');
        renderReportTable(container, appealsList);
    }
      else if (tab === 'Новости JSA') {
        let isJSA = (currentUser.rank === 'JSA' || currentUser.rank === 'ADMIN');
        
        container.innerHTML += `<p class="tab-subtitle" style="color:var(--text-gray); margin-bottom: 20px;">Официальные новостные сводки, изменения в регламентах и указы от Министерства Юстиции.</p>`;

        // Форма публикации новостей (только для JSA)
        if (isJSA) {
            container.innerHTML += `
                <div class="form-box" style="border-left: 4px solid #eab308; margin-bottom: 30px;">
                    <h3 style="color:#eab308; margin-bottom: 15px;">📰 ОПУБЛИКОВАТЬ НОВОСТЬ JSA</h3>
                    <input type="text" id="jsa-news-title" class="input-field" placeholder="Заголовок новости...">
                    <textarea id="report-text" class="report-area" style="height: 120px;" placeholder="Текст новостной сводки..."></textarea>
                    <button onclick="submitJSADocument('jsa-news')" class="btn-primary" style="background:#eab308; color:#000; font-weight:bold;">ПУБЛИКАЦИЯ ДЛЯ ВСЕХ</button>
                </div>
            `;
        }

        container.innerHTML += `<h3 style="color:var(--accent-blue); margin-bottom:15px;">ПОСЛЕДНИЕ НОВОСТИ</h3>`;
        let newsList = reports.filter(r => r.globalType === 'jsa-news' || r.type === 'jsa-news');
        renderReportTable(container, newsList);
    }
    else if (tab === 'Написать в JSA' || tab === 'Заявления от сотрудников') {
        let isAppealsView = (tab === 'Заявления от сотрудников'); // Режим просмотра для JSA
        
        if (!isAppealsView) {
            // Форма подачи заявления для патрульных
            container.innerHTML += `
                <div class="form-box" style="margin-bottom: 30px;">
                    <h3 style="color:var(--accent-blue); margin-bottom: 15px;">✉️ ПОДАТЬ ЗАЯВЛЕНИЕ / ЖАЛОБУ В JSA</h3>
                    <p style="font-size:12px; color:var(--text-gray); margin-bottom:15px;">Используйте эту форму для запроса ордеров, подачи жалоб на сотрудников или передачи дел в суд.</p>
                    <input type="text" id="jsa-appeal-title" class="input-field" placeholder="ТЕМА ОБРАЩЕНИЯ (Например: Запрос ордера, Жалоба)">
                    <textarea id="report-text" class="report-area" style="height: 180px;" placeholder="Суть вашего обращения..."></textarea>
                    <button onclick="submitJSADocument('обращение')" class="btn-primary">ОТПРАВИТЬ В ЮСТИЦИЮ</button>
                </div>
            `;
        }

        if (isAppealsView || currentUser.rank === 'JSA' || currentUser.rank === 'ADMIN') {
            container.innerHTML += `<br><h3 style="color:var(--accent-blue); margin-bottom:15px;">ПОСТУПИВШИЕ ЗАЯВЛЕНИЯ</h3>`;
            let appealsList = reports.filter(r => r.globalType === 'jsa-appeal' || r.type === 'обращение');
            renderReportTable(container, appealsList);
        }
    
    else if (tab === 'Все сотрудники базы') {
        // Вкладка для JSA, показывающая ВООБЩЕ ВСЕХ сотрудников всех отделов + выговоры
        const allStaff = Object.values(users).filter(u => u && u.rank !== "USER");
        
        container.innerHTML += `<p style="margin-bottom:15px; color:var(--text-gray);">Полная база данных сотрудников департамента. Доступна выдача взысканий (для SGT/ADMIN/JSA).</p>`;
        container.innerHTML += `<div class="staff-grid">`;
        
        allStaff.forEach(d => {
            const name = d.name || "Неизвестно";
            const rank = d.rank || "PO";
            const division = d.division || "—";
            const status = d.status || "OFF DUTY";
            const statusClass = status.replace(' ', '-').toLowerCase();
            
            // Считываем выговоры (если их нет, то 0)
            const strikes = d.strikes || 0;
            const verbal = d.verbalStrikes || 0;
            const email = d.email;

            // Кнопки выдачи выговора (Только для Сержантов, Админов и JSA)
            let strikeBtns = '';
            if (currentUser.rank === 'ADMIN' || currentUser.rank === 'SGT' || currentUser.rank === 'JSA') {
                strikeBtns = `
                    <div style="margin-top: 10px; display:flex; gap:5px;">
                        <button onclick="issueStrike('${email}', 'verbal')" style="flex:1; padding: 5px; font-size:10px; background:#f59e0b; color:#fff; border:none; border-radius:3px; cursor:pointer;">+ УСТНЫЙ</button>
                        <button onclick="issueStrike('${email}', 'written')" style="flex:1; padding: 5px; font-size:10px; background:#ef4444; color:#fff; border:none; border-radius:3px; cursor:pointer;">+ ПИСЬМЕННЫЙ</button>
                    </div>
                `;
            }

            container.innerHTML += `
                <div class="staff-card" style="position:relative; padding-bottom:15px;">
                    <h3>${name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${rank} | ${division}</p>
                    
                    <div style="margin-top:10px; padding:8px; background:rgba(0,0,0,0.2); border-radius:4px; font-size:11px;">
                        <span style="color:#ef4444; font-weight:bold;">Выговоров: ${strikes}</span><br>
                        <span style="color:#f59e0b; font-weight:bold;">Устных: ${verbal}</span>
                    </div>

                    <span class="status-badge ${statusClass}" style="margin-top:10px; display:inline-block;">${status}</span>
                    
                    ${strikeBtns}
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Мои отчёты' || tab === 'Все отчёты') {
        let list = reports;
        if (tab === 'Мои отчёты') list = reports.filter(r => r.email === currentUser.email); 
        else list = reports.filter(r => r.globalType === 'patrol');
        renderReportTable(container, list);
    }
    else if (tab === 'Все патрульные') {
        const patrolStaff = Object.values(users).filter(u => u && u.rank !== "USER" && u.rank !== "ADMIN" && u.division !== "GED");
        container.innerHTML += `<div class="staff-grid">`;
        
        patrolStaff.forEach(d => {
            const name = d.name || "Неизвестный Офицер";
            const rank = d.rank || "PO";
            const division = d.division || "Patrol Division";
            const unit = d.unit || "NONE";
            const status = d.status || "OFF DUTY";
            const statusClass = status.replace(' ', '-').toLowerCase();
            
            container.innerHTML += `
                <div class="staff-card">
                    <h3>${name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${rank}</p>
                    <p style="font-size:12px; color:var(--text-gray);">${division} | Маркировка: ${unit}</p>
                    <span class="status-badge ${statusClass}" style="margin-top:10px; display:inline-block;">${status}</span>
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
            .filter(email => users[email] && users[email].rank !== "USER")
            .map(email => ({ email, ...users[email], count: stats[email] || 0 }))
            .sort((a, b) => b.count - a.count);
        container.innerHTML += `<div class="stat-grid">`;
        activeUsers.forEach(u => {
            container.innerHTML += `
                <div class="stat-card">
                    <h3>${u.name || "Сотрудник"}</h3>
                    <p>Позывной: <strong>${u.unit || "—"}</strong></p>
                    <p>Дивизион: <strong>${u.division || "—"}</strong></p>
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
            if(users[email] && (users[email].rank === "DETECTIVE" || users[email].division === "GED" || users[email].rank === "ADMIN")) {
                container.innerHTML += `<div class="stat-card"><strong>${users[email].name || "Детектив"}</strong><br>Кейс-файлов: ${detStats[email] || 0}</div>`;
            }
        }
        container.innerHTML += `</div><hr style="border-color:var(--border); margin-bottom:20px;"><h3>АКТИВНЫЕ УЛИЧНЫЕ БАНДОФОРМИРОВАНИЯ</h3><div class="gang-grid" id="gang-container"></div>`;
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
        const dets = Object.values(users).filter(u => u && (u.division === "GED" || u.rank === "DETECTIVE" || u.rank === "ADMIN" || u.rank === "JSA"));
        container.innerHTML += `<div class="staff-grid">`;
        dets.forEach(d => {
            // ИСПРАВЛЕНО: Безопасные переменные для ГЕД (защита от краша скрипта при пустом d.status)
            const name = d.name || "Неизвестный Детектив";
            const rank = d.rank || "DETECTIVE";
            const division = d.division || "Detective Bureau";
            const unit = d.unit || "NONE";
            const status = d.status || "OFF DUTY";
            const statusClass = status.replace(' ', '-').toLowerCase();

            container.innerHTML += `
                <div class="staff-card">
                    <h3>${name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${rank}</p>
                    <p style="font-size:12px; color:var(--text-gray);">${division} | Маркировка: ${unit}</p>
                    <span class="status-badge ${statusClass}" style="margin-top:10px; display:inline-block;">${status}</span>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Панель Управления') {
        renderAdminPanel(container);
    }
}

// 1. ФУНКЦИЯ ОТРИСОВКИ ТАБЛИЦЫ (Понимает и обычные рапорты, и JSA)
function renderReportTable(container, list) {
    if (list.length === 0) {
        container.innerHTML += `<p class="empty-text">Отчетов или документов в базе данных не обнаружено.</p>`;
        return;
    }
    let table = `<table class="db-table">
        <thead>
            <tr>
                <th>ТИП ДОКУМЕНТА</th>
                <th>ДАТА ДОБАВЛЕНИЯ</th>
                <th>АВТОР</th>
                <th>ОТДЕЛ / ДОЛЖНОСТЬ</th>
            </tr>
        </thead>
        <tbody>`;
        
    list.forEach(r => {
        // Безопасное чтение данных
        const typeStr = (r.title || r.type || r.globalType || "ДОКУМЕНТ").toUpperCase();
        const dateStr = r.date || "—";
        const authorStr = r.author || r.name || "Неизвестно";
        const deptStr = r.division || r.rank || "—";
        
        // Вызываем правильную функцию viewReport(id)
        table += `<tr onclick="viewReport('${r.id}')" style="cursor: pointer;">
                <td style="color:var(--accent-blue); font-weight:bold;">${typeStr}</td>
                <td>${dateStr}</td>
                <td>${authorStr}</td>
                <td>${deptStr}</td>
            </tr>`; 
    });
    table += `</tbody></table>`;
    container.innerHTML += table;
}

// 2. ФУНКЦИЯ ОТКРЫТИЯ МОДАЛЬНОГО ОКНА (Связана с твоим modal-view)
function viewReport(id) {
    const r = reports.find(rep => rep.id === id);
    if(!r) return;
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';

    // Исправленная логика генерации фотокарточек
    let photoHtml = '';
    if (r.photos && r.photos.length > 0) {
        photoHtml = r.photos.map(photoSrc => 
            `<img src="${photoSrc}" class="report-photo" onclick="openPhotoViewer('${photoSrc}')">`
        ).join('');
    } else {
        photoHtml = '<p style="color:var(--text-gray)">Фото-доказательства отсутствуют.</p>';
    }

    // Безопасная проверка прав (проверяем, существует ли currentUser)
    let adminBtn = '';
    if (currentUser && currentUser.rank === "ADMIN") {
        adminBtn = `<button onclick="deleteReport('${r.id}')" class="btn-delete-action" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">УДАЛИТЬ</button>`;
    }

    let canEdit = false;
    if (currentUser) {
        canEdit = currentUser.email === r.email || currentUser.rank === "ADMIN" || currentUser.division === "GED" || currentUser.rank === "DETECTIVE";
    }

    let editBtns = '';
    if (canEdit) {
        editBtns = `
            <button onclick="editReportText('${r.id}')" class="btn-secondary" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">РЕДАКТИРОВАТЬ</button>
            <button onclick="addReportNote('${r.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">+ ЗАМЕТКА</button>
        `;
    }

    let notesHtml = '';
    if (r.notes && r.notes.length > 0) {
        notesHtml = `<h3 style="margin-top:20px; margin-bottom:10px; color:#F59E0B;">СЛУЖЕБНЫЕ ЗАМЕТКИ:</h3>`;
        r.notes.forEach(note => {
            notesHtml += `
                <div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #F59E0B; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 13px;">
                    <strong style="color:#F59E0B;">${note.author} (${note.date}):</strong><br>${note.text}
                </div>
            `;
        });
    }

    // Рендер тела модального окна (Строка 692 теперь полностью исправна)
    document.getElementById('modal-body').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="color:var(--accent-blue); margin:0; font-size:20px;">${r.type.toUpperCase()}</h1>
        <div style="display:flex; align-items:center;">
            <span style="color:var(--text-gray); font-size:14px;">${r.date}</span>
            ${editBtns}
            ${adminBtn}
        </div>
    </div>
    <p style="color: #cbd5e1; margin-bottom: 15px; font-size:14px;"><strong>ИСПОЛНИТЕЛЬ:</strong> ${r.author || "Неизвестно"} [${r.unit || "NONE"}] | <strong>ДИВИЗИОН:</strong> ${r.division || "Unassigned"}</p>
    <div class="report-content-view" style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); font-family:monospace; line-height:1.5;">${r.text}</div>
    ${notesHtml}
    <h3 style="margin-top:20px; margin-bottom:10px; color:var(--accent-blue);">ПРИКРЕПЛЕННЫЕ МАТЕРИАЛЫ / ФОТОФИКСАЦИЯ:</h3>
    <div class="report-photos-grid">${photoHtml}</div>`;
}

    // Безопасные переменные для шапки отчета
    const typeStr = (r.title || r.type || "ДОКУМЕНТ").toUpperCase();
    const authorStr = r.author || r.name || "Неизвестно";
    const unitStr = r.unit ? `[${r.unit}]` : "";
    const divStr = r.division || r.rank || "—";

    // Вставляем все данные внутрь modal-body
// // Вставляем все данные внутрь modal-body
document.getElementById('modal-body').innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="color:var(--accent-blue); margin:0; font-size:20px;">${typeStr}</h1>
        <div style="display:flex; align-items:center;">
            <span style="color:var(--text-gray); font-size:14px;">${r.date || ""}</span>
            ${editBtns}
            ${adminBtn}
        </div>
    </div>
    <div>
        <p style="color: #cbd5e1; margin-bottom: 15px; font-size:14px;"><strong>ИСПОЛНИТЕЛЬ:</strong> ${authorStr} ${unitStr} | <strong>ОТДЕЛ/ДОЛЖНОСТЬ:</strong> ${divStr}</p>
        <div class="report-content-view" style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); font-family:monospace; line-height:1.5;">${r.text}</div>
        ${notesHtml}
        <h3 style="margin-top:20px; margin-bottom:10px; color:var(--accent-blue);">ПРИКРЕПЛЕННЫЕ МАТЕРИАЛЫ / ФОТОФИКСАЦИЯ:</h3>
        <div class="report-photos-grid">${photoHtml}</div>
    </div>`;
}

function viewReport(id) {
    const r = reports.find(rep => rep.id === id);
    if(!r) return;
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';
    
    let photoHtml = r.photos && r.photos.length ? r.photos.map(p => `<img src="${p}" class="report-photo" onclick="window.open(this.src)">`).join('') : '<p style="color:var(--text-gray)">Фото-доказательства отсутствуют.</p>';
    // Пример того, как у тебя должна генерироваться картинка
// Добавь onclick="openPhotoViewer('${photoSrc}')"
let photosHtml = report.photos.map(photoSrc => 
    `<img src="${photoSrc}" class="report-photo" onclick="openPhotoViewer('${photoSrc}')">`
).join('');
    
    let adminBtn = currentUser.rank === "ADMIN" ? `<button onclick="deleteReport('${r.id}')" class="btn-delete-action" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">УДАЛИТЬ</button>` : '';
    let canEdit = currentUser.email === r.email || currentUser.rank === "ADMIN" || currentUser.division === "GED" || currentUser.rank === "DETECTIVE";
    
    let editBtns = canEdit ? `
        <button onclick="editReportText('${r.id}')" class="btn-secondary" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">РЕДАКТИРОВАТЬ</button>
        <button onclick="addReportNote('${r.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">+ ЗАМЕТКА</button>
    ` : '';

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
        <p style="color: #cbd5e1; margin-bottom: 15px; font-size:14px;"><strong>ИСПОЛНИТЕЛЬ:</strong> ${r.author || "Неизвестно"} [${r.unit || "NONE"}] | <strong>ДИВИЗИОН:</strong> ${r.division || "Unassigned"}</p>
        <div class="report-content-view" style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); font-family:monospace; line-height:1.5;">${r.text}</div>
        ${notesHtml}
        <h3 style="margin-top:20px; margin-bottom:10px; color:var(--accent-blue);">ПРИКРЕПЛЕННЫЕ МАТЕРИАЛЫ / ФОТОФИКСАЦИЯ:</h3>
        <div class="report-photos-grid">${photoHtml}</div>`;
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
        </div>`;
}

function saveEditedReport(id) {
    const newText = document.getElementById('edit-report-area').value;
    db.collection('reports').doc(id).update({ text: newText }).then(() => {
        alert("Документ обновлен!");
        viewReport(id); 
    }).catch(err => alert("Ошибка: " + err.message));
}

function addReportNote(id) {
    const r = reports.find(rep => rep.id === id);
    if(!r) return;

    const noteText = prompt("Введите служебную заметку:");
    if(noteText !== null && noteText.trim() !== "") {
        const newNote = { author: currentUser.name || "Аноним", date: new Date().toLocaleString(), text: noteText.trim() };
        let currentNotes = r.notes || [];
        currentNotes.push(newNote);
        
        db.collection('reports').doc(id).update({ notes: currentNotes }).then(() => {
            viewReport(id); 
        }).catch(err => alert("Ошибка добавления заметки: " + err.message));
    }
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
        author: currentUser.name || "Без имени",
        unit: currentUser.unit || "NONE",
        division: currentUser.division || "Unassigned",
        email: currentUser.email,
        date: new Date().toLocaleString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        photos: [...loadedPhotos],
        notes: []
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
    let photosHtml = g.photos && g.photos.length > 0 ? `<h3 style="margin-top:20px; color:var(--accent-blue);">ФОТО МАТЕРИАЛЫ:</h3><div class="report-photos-grid">${g.photos.map(p => `<img src="${p}" class="report-photo" onclick="window.open(this.src)">`).join('')}</div>` : '';

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
                <h3>ДОБАВЛЕНИЕ НОВОГО БАНДОФОРМИРОВАНИЯ</h3>
                <input id="adm-gang" class="input-field" placeholder="Название бандформирования">
                <textarea id="adm-gang-info" class="input-field" style="height:120px;" placeholder="Информация о банде..."></textarea>
                <input id="adm-gang-photos" class="input-field" placeholder="Ссылки на photo (через запятую)">
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
        </div>`;
    
    const gangList = document.getElementById('adm-delete-gangs-list');
    gangList.innerHTML = '';
    gangs.forEach(g => {
        gangList.innerHTML += `<div class="delete-item-row"><span>${g.name}</span> <button onclick="deleteGang('${g.id}')" class="btn-delete-action">УДАЛИТЬ</button></div>`;
    });

    const areaList = document.getElementById('adm-delete-areas-list');
    areaList.innerHTML = '';
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
        nameEl.value = ''; infoEl.value = ''; if(photosEl) photosEl.value = '';
    });
}

function editField(field) {
    let currentVal = currentUser[field] || '';
    let newVal = prompt(`Новое значение для ${field.toUpperCase()}:`, currentVal);
    if (newVal !== null && newVal.trim() !== '') {
        let updates = {};
        updates[field] = newVal.trim();
        db.collection('users').doc(currentUser.email).update(updates); 
    }
}

function toggleStatus() {
    const statuses = ["ON DUTY", "OFF DUTY", "ON SCENE"];
    const currentStatus = currentUser.status || "OFF DUTY";
    let nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
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

// Функции удаления
function deleteGang(id) {
    if (confirm(`Удалить банду?`)) {
        db.collection('gangs').doc(id).delete().then(() => switchTab('Панель Управления'));
    }
}

// Исправлено: корректное удаление поля из Firestore через firebase.firestore.FieldValue.delete()
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
// Функция для открытия фото в полном размере
function openPhotoViewer(imageSrc) {
    const viewer = document.getElementById('photoViewerModal');
    const fullSizeImg = document.getElementById('fullSizePhoto');
    
    fullSizeImg.src = imageSrc;
    viewer.style.display = 'flex'; // Показываем окно
}

// Функция для закрытия фото
function closePhotoViewer() {
    const viewer = document.getElementById('photoViewerModal');
    const fullSizeImg = document.getElementById('fullSizePhoto');
    
    viewer.style.display = 'none'; // Скрываем окно
    fullSizeImg.src = ""; // Очищаем источник, чтобы не было видно старой фото при следующем открытии
}
// 1. ФУНКЦИЯ ОТРИСОВКИ ТАБЛИЦЫ
window.renderReportTable = function(container, list) {
    if (!list || list.length === 0) {
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
        
        table += `<tr onclick="window.viewReport('${r.id}')" style="cursor: pointer; border-bottom: 1px solid var(--border);">
                <td style="padding:10px; color:var(--accent-blue); font-weight:bold;">${typeStr}</td>
                <td style="padding:10px;">${dateStr}</td>
                <td style="padding:10px;">${authorStr}</td>
                <td style="padding:10px;">${deptStr}</td>
            </tr>`; 
    });
    table += `</tbody></table>`;
    container.innerHTML += table;
};

// 2. ФУНКЦИЯ ОТКРЫТИЯ ОКНА (ГЛОБАЛЬНАЯ)
window.viewReport = function(id) {
    console.log("Попытка открыть документ с ID:", id); // Это появится в консоли (F12)
    
    if (!reports || reports.length === 0) {
        return alert("База отчетов еще не загрузилась. Подождите пару секунд.");
    }

    const r = reports.find(rep => rep.id === id);
    if (!r) {
        return alert("Ошибка: Документ с таким ID не найден в памяти!");
    }
    
    const m = document.getElementById('modal-view');
    if (!m) {
        return alert("Критическая ошибка: HTML-элемент 'modal-view' не найден на странице!");
    }
    
    // Подгружаем фото
    let photoHtml = r.photos && r.photos.length > 0 
        ? r.photos.map(p => `<img src="${p}" class="report-photo" style="max-width:200px; margin-right:10px; cursor:pointer; border-radius:4px;" onclick="window.open(this.src)">`).join('') 
        : '<p style="color:var(--text-gray)">Фото-доказательства отсутствуют.</p>';
    
    // Кнопки управления
    let adminBtn = currentUser.rank === "ADMIN" ? `<button onclick="deleteReport('${r.id}')" class="btn-delete-action" style="padding: 5px 10px; font-size: 11px; margin-left:10px; background:#ef4444; color:#fff; border:none; border-radius:3px; cursor:pointer;">УДАЛИТЬ</button>` : '';
    let canEdit = currentUser.email === r.email || currentUser.rank === "ADMIN" || currentUser.division === "GED" || currentUser.rank === "DETECTIVE" || currentUser.rank === "JSA";
    
    let editBtns = canEdit ? `
        <button onclick="editReportText('${r.id}')" class="btn-secondary" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">РЕДАКТИРОВАТЬ</button>
        <button onclick="addReportNote('${r.id}')" class="btn-primary" style="padding: 5px 10px; font-size: 11px; margin-left:10px;">+ ЗАМЕТКА</button>
    ` : '';

    // Подгружаем заметки
    let notesHtml = '';
    if (r.notes && r.notes.length > 0) {
        notesHtml = `<h3 style="margin-top:20px; margin-bottom:10px; color:#f59e0b;">СЛУЖЕБНЫЕ ЗАМЕТКИ:</h3>`;
        r.notes.forEach(note => {
            notesHtml += `<div style="background: rgba(245, 158, 11, 0.1); border-left: 3px solid #f59e0b; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 13px;">
                <strong style="color:#f59e0b;">${note.author} (${note.date}):</strong><br>${note.text}
            </div>`;
        });
    }

    // Собираем шапку
    const typeStr = (r.title || r.type || "ДОКУМЕНТ").toUpperCase();
    const authorStr = r.author || r.name || "Неизвестно";
    const unitStr = r.unit ? `[${r.unit}]` : "";
    const divStr = r.division || r.rank || "—";

    // Вставляем контент
    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color:var(--accent-blue); margin:0; font-size:20px;">${typeStr}</h1>
            <div style="display:flex; align-items:center;">
                <span style="color:var(--text-gray); font-size:14px;">${r.date || ""}</span>
                ${editBtns}
                ${adminBtn}
            </div>
        </div>
        <p style="color: #cbd5e1; margin-bottom: 15px; font-size:14px;"><strong>ИСПОЛНИТЕЛЬ:</strong> ${authorStr} ${unitStr} | <strong>ОТДЕЛ/ДОЛЖНОСТЬ:</strong> ${divStr}</p>
        <div class="report-content-view" style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); font-family:monospace; line-height:1.5;">${r.text}</div>
        ${notesHtml}
        <h3 style="margin-top:20px; margin-bottom:10px; color:var(--accent-blue);">ПРИКРЕПЛЕННЫЕ МАТЕРИАЛЫ / ФОТОФИКСАЦИЯ:</h3>
        <div class="report-photos-grid" style="display:flex; gap:10px; flex-wrap:wrap;">${photoHtml}</div>
    `;

    m.style.display = 'flex'; // Открываем
};

// ==========================================
// СИСТЕМА ВЫГОВОРОВ И НАКАЗАНИЙ
// ==========================================
window.issueStrike = function(userEmail, type) {
    // Проверка прав (Только ADMIN и SGT)
    if (currentUser.rank !== 'ADMIN' && currentUser.rank !== 'SGT' && currentUser.rank !== 'JSA') {
        return alert("У вас нет полномочий для выдачи дисциплинарных взысканий!");
    }

    const typeText = type === 'verbal' ? "УСТНЫЙ выговор" : "ПИСЬМЕННЫЙ выговор";
    const reason = prompt(`Выдача наказания: ${typeText}\nУкажите причину для офицера ${userEmail}:`);
    
    if (!reason) return; // Если нажали отмену

    // Обновляем счетчик в базе данных Firebase
    const userRef = db.collection('users').doc(userEmail);
    const increment = firebase.firestore.FieldValue.increment(1);
    
    let updateData = type === 'verbal' ? { verbalStrikes: increment } : { strikes: increment };

    userRef.update(updateData).then(() => {
        alert(`Успешно! ${typeText} выдан сотруднику.`);
        // Принудительно перезагружаем текущую вкладку, чтобы увидеть изменения
        const currentTabTitle = document.querySelector('.tab-title').innerText;
        switchTab(currentTabTitle.charAt(0) + currentTabTitle.slice(1).toLowerCase());
    }).catch(err => {
        console.error("Ошибка выдачи выговора: ", err);
        alert("Не удалось выдать выговор. Ошибка соединения с базой.");
    });
};
window.submitJSADocument = function(docType) {
    const isPostanovlenie = (docType === 'постановление');
    const isNews = (docType === 'jsa-news');
    
    // Ищем инпуты в зависимости от того, что публикуем
    let titleInputId = 'jsa-appeal-title';
    if (isPostanovlenie) titleInputId = 'jsa-title';
    if (isNews) titleInputId = 'jsa-news-title';

    const titleInput = document.getElementById(titleInputId);
    const textInput = document.getElementById('report-text');

    if (!titleInput || !textInput) return alert("Ошибка: Не удалось найти поля ввода!");

    const title = titleInput.value.trim();
    const text = textInput.value.trim();

    if (!title || !text || text.includes('Выберите формат')) {
        return alert("Заполните заголовок и основной текст документа!");
    }

    let glType = 'jsa-appeal';
    if (isPostanovlenie) glType = 'jsa-doc';
    if (isNews) glType = 'jsa-news';

    const docData = {
        title: title.toUpperCase(),
        text: text,
        type: docType,
        globalType: glType,
        name: currentUser.name || "Сотрудник",
        rank: currentUser.rank || "PO",
        email: currentUser.email,
        date: new Date().toLocaleString("ru-RU"),
        photos: [] 
    };

    db.collection('reports').add(docData).then(() => {
        alert("Успешно опубликовано!");
        titleInput.value = "";
        textInput.value = "";
        
        // Обновляем нужную вкладку
        if (isNews) switchTab('Новости JSA');
        else if (isPostanovlenie) switchTab('Постановления JSA');
        else switchTab('Написать в JSA');
    }).catch(err => {
        console.error("Ошибка сохранения: ", err);
    });
}
}
