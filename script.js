// ВСТАВЬ СЮДА ССЫЛКУ НА СВОЙ GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbwCoF9Q7c4qd6KvapeRfEGu740FW4vB1E3bDafCnPkh3LeKPg_NcTrwiYF3GfHma_CD/exec"; 

let users = {};
let reports = [];
let gangs = [];
let shootingStats = {};
let drafts = JSON.parse(localStorage.getItem('cpd_v5_drafts')) || {};
let currentUser = JSON.parse(localStorage.getItem('cpd_v5_session')) || null;
let currentMode = "PATROL"; 

// НАСТОЯЩАЯ БАЗА ДАННЫХ ЗАКОНОДАТЕЛЬСТВА ЧИКАГО (CHICAGO MUNICIPAL CODE & ILCS)
const CHICAGO_LAWS = [
    { code: "720 ILCS 5/9-1", type: "uk", title: "First-Degree Murder (Умышленное убийство первой степени)", desc: "Предумышленное неправомерное причинение смерти человеку. Наказывается пожизненным заключением без права на досрочное освобождение. Изъятие оружия." },
    { code: "720 ILCS 5/12-2", type: "uk", title: "Aggravated Assault of a Peace Officer (Нападение на офицера полиции при отягчающих)", desc: "Нападение или угроза применения физического насилия/оружия в отношении сотрудника правоохранительных органов при исполнении обязанностей." },
    { code: "720 ILCS 5/12-4", type: "uk", title: "Aggravated Battery (Нанесение тяжких телесных повреждений)", desc: "Умышленное причинение сильного вреда здоровью, повлекшее увечья, с применением кастетов, холодного или огнестрельного оружия." },
    { code: "720 ILCS 5/18-2", type: "uk", title: "Armed Robbery (Вооруженное ограбление)", desc: "Хищение чужого имущества с применением насилия или угрозой его немедленного применения с использованием огнестрельного или иного оружия." },
    { code: "720 ILCS 5/19-1", type: "uk", title: "Burglary (Кража со взломом)", desc: "Незаконное проникновение в жилище, транспортное средство или коммерческое здание с целью совершения кражи или иного тяжкого преступления." },
    { code: "720 ILCS 5/24-1.1", type: "uk", title: "Unlawful Use of Weapons by Felons (Незаконный оборот оружия осужденными)", desc: "Ношение, хранение или перевозка огнестрельного оружия лицами, не имеющими лицензии FOID, либо ранее судимыми лицами. Конфискация оружия." },
    { code: "720 ILCS 5/31-1", type: "uk", title: "Resisting or Obstructing a Peace Officer (Сопротивление или препятствование офицеру)", desc: "Умышленное физическое сопротивление, отказ подчиниться законным требованиям офицера полиции или создание помех при задержании." },
    { code: "720 ILCS 5/31-4", type: "uk", title: "Obstructing Justice (Препятствование правосудию)", desc: "Умышленное уничтожение улик, дача ложных показаний, укрытие подозреваемых от органов правопорядка." },
    { code: "720 ILCS 5/4-102", type: "uk", title: "Vehicle Theft Conspiracy (Угон ТС или соучастие в угоне)", desc: "Неправомерное завладение чужим транспортным средством без согласия владельца, взлом замка зажигания или транспортировка угнанного ТС." },
    { code: "720 ILCS 570/401", type: "uk", title: "Manufacture or Delivery of Controlled Substances (Производство и сбыт наркотиков)", desc: "Изготовление, фасовка, хранение с целью продажи или прямая передача наркотических веществ. Карается арестом и полной конфискацией." },
    { code: "MCC 8-4-010", type: "ac", title: "Disorderly Conduct (Нарушение общественного порядка)", desc: "Действия, нарушающие покой граждан: нецензурная брань, необоснованный шум в ночное время, провокация драк в публичных местах. Штраф или арест до 30 дней." },
    { code: "MCC 8-4-030", type: "ac", title: "Loitering for Gang Activity (Бродяжничество в составе криминальной группировки)", desc: "Нахождение группы лиц (от 2 человек) в публичном месте с целью демонстрации принадлежности к уличной банде, блокирование проходов, вербовка." },
    { code: "MCC 9-76-140", type: "ac", title: "Driving Under the Influence (Управление ТС в состоянии опьянения)", desc: "Вождение автомобиля под воздействием алкоголя (выше 0.08% BAC) или наркотических средств. Немедленная эвакуация ТС, лишение прав." },
    { code: "MCC 9-12-010", type: "ac", title: "Reckless Driving (Опасное / Агрессивное вождение)", desc: "Игнорирование дорожных знаков, превышение скорости более чем на 20 миль/ч, создание прямой угрозы жизни пешеходов и других водителей." },
    { code: "MCC 9-40-060", type: "ac", title: "Fleeing or Attempting to Elude Police (Попытка скрыться на ТС)", desc: "Отказ остановить транспортное средство после подачи офицером звуковых и световых сигналов (крузеров). Переходит в категорию преследования." }
];

const TEMPLATES = {
    incident: `CHICAGO POLICE DEPARTMENT\nРАПОРТ ОБ ИНЦИДЕНТЕ\n--\nФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка)\nДата, время и место происшествия: XX-XX-2026 | XX-XX | (Указать место)\n\nОбстоятельства инцидента:\n(Тут описать всю ситуацию)\n\nЛица, причастные к инциденту:\n(Вписать ники как сотрудников причастных так и свидетелей при наличии)\n\nПредварительные выводы:\n(Опишите тут свой предварительный вывод по ситуации)\n\nПринятые меры:\n(1. Помог осмотреть машину\n2. Обыскал подозреваемого)\n__\nДата: XX.XX.2026\nВремя: XX-XX`,
    
    accident: `CHICAGO POLICE DEPARTMENT\nОТЧЕТ О ПРОИСШЕСТВИИ\n--\nФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка)\nДата, время и место происшествия: XX-XX-2026 | XX-XX | (Указать место)\n\nОбстоятельства инцидента:\n(Тут описать всю ситуацию)\n\nПринятые меры:\n(Опишите ваши действия на ситуации)\n__\nДата: XX.XX.2026\nПодпись: TEXT`,
    
    casefile: `CHICAGO CITY | GANG SUPPRESSION UNIT\n\n1. ОСНОВНАЯ ИНФОРМАЦИЯ\nНомер дела: D-${Math.floor(Math.random()*900000 + 100000)}DT\nДата открытия: ${new Date().toLocaleDateString()}\nДетектив: Имя детектива\nОтдел: Gang Suppression Unit\nСтатус дела: OPEN\nТип преступления: Gang Activity / Drug Trafficking\n\n2. ИНФОРМАЦИЯ О ПОДОЗРЕВАЕМОМ\nИмя Фамилия:\nБанда / группировка:\n\n3. ОПИСАНИЕ СИТУАЦИИ\n(Подробно расписывается хронология наблюдения и оперативной работы)\n\n5. ДОКАЗАТЕЛЬСТВА\n- Изъятые предметы\n- Фотофиксация\n\n7. ОБВИНЕНИЯ\n- Gang Affiliation\n- Drug Distribution`
};

window.onload = async () => {
    bindEvents();
    await fetchDatabase(); 
    
    if (Object.keys(users).length === 0) {
        users["admin@cpd.gov"] = { password: "admin", name: "Chief Admin", rank: "ADMIN", division: "Command", unit: "CHIEF", status: "ON DUTY" };
        await saveToServer();
    }
    checkAuth();
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

async function fetchDatabase() {
    if(!API_URL || API_URL.includes("https://script.google.com/macros/s/AKfycbw-QGJzNKaBtLAlWJRWNTnq7r29HuR1-F7U4mA1GeE_bJJzqvA3qJvND7c7HKbK_CwT/exec")) {
        loadLocalFallback();
        return;
    }
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        users = data.users || {};
        reports = data.reports || [];
        gangs = data.gangs || [];
        shootingStats = data.shootingStats || {};
    } catch (e) {
        console.error("Ошибка сети при чтении базы", e);
        loadLocalFallback();
    }
}

async function saveToServer() {
    if(!API_URL || API_URL.includes("ТВОЙ_URL")) {
        saveLocalFallback();
        return;
    }
    const dbState = { users, reports, gangs, shootingStats };
    try {
        // Отправляем данные как чистый текстовый JSON-поток (снимает лимиты на размер текста/фото)
        await fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors', 
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(dbState)
        });
        saveLocalFallback();
    } catch(e) {
        console.error("Ошибка сохранения на сервер", e);
        saveLocalFallback();
    }
}

function loadLocalFallback() {
    users = JSON.parse(localStorage.getItem('cpd_db_users')) || {};
    reports = JSON.parse(localStorage.getItem('cpd_db_reports')) || [];
    gangs = JSON.parse(localStorage.getItem('cpd_db_gangs')) || [];
    shootingStats = JSON.parse(localStorage.getItem('cpd_db_stats')) || {};
}
function saveLocalFallback() {
    localStorage.setItem('cpd_db_users', JSON.stringify(users));
    localStorage.setItem('cpd_db_reports', JSON.stringify(reports));
    localStorage.setItem('cpd_db_gangs', JSON.stringify(gangs));
    localStorage.setItem('cpd_db_stats', JSON.stringify(shootingStats));
}

function login() {
    const email = document.getElementById('auth-email').value.toLowerCase().trim();
    const pass = document.getElementById('auth-password').value;
    if (users[email] && users[email].password === pass) {
        currentUser = { ...users[email], email: email };
        localStorage.setItem('cpd_v5_session', JSON.stringify(currentUser));
        checkAuth();
    } else {
        document.getElementById('auth-error').innerText = "Ошибка: неверный Email или пароль.";
    }
}

async function register() {
    const email = document.getElementById('auth-email').value.toLowerCase().trim();
    const pass = document.getElementById('auth-password').value;
    if (!email || !pass) return alert("Введите Email и пароль!");
    if (users[email]) return alert("Эта почта уже зарегистрирована.");
    
    users[email] = { password: pass, name: "Civilian (" + email.split('@')[0] + ")", rank: "USER", division: "Unassigned", unit: "NONE", status: "OFF DUTY" };
    await saveToServer();
    alert("Успешная регистрация! Ваш аккаунт находится в статусе гражданского (USER). Доступ заблокирован до одобрения шефом.");
    currentUser = { ...users[email], email: email };
    localStorage.setItem('cpd_v5_session', JSON.stringify(currentUser));
    checkAuth();
}

function logout() { 
    localStorage.removeItem('cpd_v5_session'); 
    location.reload(); 
}

function checkAuth() {
    if (currentUser) {
        currentUser = { ...users[currentUser.email], email: currentUser.email };
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'flex';
        
        if (currentUser.rank === "USER") {
            document.getElementById('sidebar-el').style.display = 'none';
            document.getElementById('topbar-el').style.display = 'none';
            renderLockScreen();
        } else {
            document.getElementById('sidebar-el').style.display = 'flex';
            document.getElementById('topbar-el').style.display = 'flex';
            renderUI();
        }
    } else {
        document.getElementById('auth-screen').style.display = 'flex';
        document.getElementById('app-screen').style.display = 'none';
    }
}

function renderLockScreen() {
    const container = document.getElementById('tab-container');
    container.innerHTML = `
        <div class="lock-screen-container">
            <div class="lock-box">
                <div class="lock-icon">🛑</div>
                <div class="lock-title">Access Denied / Отказано в доступе</div>
                <div class="lock-subtitle">CHICAGO POLICE DEPARTMENT — SECURE DATA TERMINAL</div>
                <div class="lock-text">
                    Ваша учетная запись <strong>${currentUser.email}</strong> успешно зарегистрирована в системе терминала CPD.<br><br>
                    Однако на текущий момент у вас установлен статус гражданского (USER). Доступ к закрытой тактической информации, просмотр личного состава, рапортов и активных банд заблокирован.<br><br>
                    <strong>Что делать?</strong> Обратитесь к руководству (Command Staff) или Шефу Департамента для верификации вашей личности, назначения дивизиона и изменения системного ранга.
                </div>
                <button onclick="logout()" class="btn-primary" style="background:#ef4444; border-color:#ef4444;">ВЫЙТИ ИЗ АККАУНТА</button>
            </div>
        </div>
    `;
}

function renderUI() {
    document.getElementById('disp-name').textContent = currentUser.name;
    document.getElementById('disp-unit').textContent = currentUser.unit;
    document.getElementById('disp-rank-div').textContent = `${currentUser.rank} / ${currentUser.division}`;
    
    const statusEl = document.getElementById('disp-status');
    statusEl.textContent = currentUser.status;
    statusEl.className = 'value status-badge ' + currentUser.status.replace(' ', '-').toLowerCase();
    
    // Переключатель Детективного Бюро виден только админам, детективам и ГЕД
    const hasDetAccess = checkGedOrDetectiveAccess();
    document.getElementById('btn-switch-bureau').style.display = hasDetAccess ? 'block' : 'none';
    
    // Если доступ потерян (например, админ сменил ранг прямо во время сессии), возвращаем в патрульный режим
    if (!hasDetAccess && currentMode === "DETECTIVE") {
        currentMode = "PATROL";
    }
    
    renderNav();
}

// Вспомогательная функция проверки прав для GED и Детективов
function checkGedOrDetectiveAccess() {
    if (!currentUser) return false;
    const r = currentUser.rank;
    const d = currentUser.division;
    return (r === "ADMIN" || r === "DETECTIVE" || d === "GED" || d === "GED Patrol Division");
}

function renderNav() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';
    let menu = [];
    
    if (currentMode === "PATROL") {
        menu.push('Новый отчёт', 'Мои отчёты', 'Все отчёты', 'Все патрульные', 'Законы Чикаго', 'Статистика');
    } else {
        menu.push('Кейс-файлы', 'Активные банды', 'Сотрудники ГЕД', 'Законы Чикаго', 'Статистика районов');
    }
    if (currentUser.rank === "ADMIN") menu.push('Панель Управления');

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
    
    // ЖЕСТКАЯ ПРОВЕРКА НА ПРАВА КЕЙС-ФАЙЛОВ
    if (tab === 'Кейс-файлы') {
        if (!checkGedOrDetectiveAccess()) {
            container.innerHTML += `
                <div style="background: rgba(239, 64, 64, 0.1); border: 2px dashed #ef4444; border-radius: 6px; padding: 30px; text-align: center; margin-top: 20px;">
                    <h3 style="color: #ef4444; margin-top: 0; letter-spacing: 1px;">[ДОСТУП ОГРАНИЧЕН]</h3>
                    <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin: 0;">
                        Просмотр, редактирование и добавление материалов в категорию <strong>Кейс-файлы (Case Files)</strong> разрешены исключительно авторизованным сотрудникам <strong>Gang Suppression Unit (GED)</strong> и следственному составу Детективного Бюро.
                    </p>
                </div>
            `;
            return; 
        }

        // Если проверка пройдена — рендерим полноценный интерфейс кейс-файлов
        container.innerHTML += `
            <div class="form-box">
                <select id="report-type" class="input-field" onchange="applyTemplate()">
                    <option value="">-- ВЫБЕРИТЕ ФОРМАТ ОТЧЕТА --</option>
                    <option value="casefile">CASE FILE — DETECTIVE DIVISION</option>
                </select>
                <textarea id="report-text" class="report-area" placeholder="Текст отчета сгенерируется после выбора формата..."></textarea>
                
                <div class="photo-uploader">
                    <label for="photo-input" class="upload-label">📁 ДОБАВИТЬ МНОЖЕСТВО ФОТОГРАФИЙ</label>
                    <input type="file" id="photo-input" multiple accept="image/*" style="display:none;" onchange="previewPhotos()">
                    <div id="photo-previews" class="preview-container"></div>
                </div>

                <div class="actions">
                    <button onclick="saveDraft()" class="btn-secondary">СОХРАНИТЬ В ЧЕРНОВИК</button>
                    <button onclick="submitReport('casefile')" class="btn-primary">ОТПРАВИТЬ В БАЗУ ДАННЫХ</button>
                </div>
            </div>
            
            <h3 style="margin-top: 40px; color: var(--accent-blue);">АРХИВ КЕЙС-ФАЙЛОВ ДЕПАРТАМЕНТА</h3>
        `;
        
        if (drafts[currentUser.email + '_casefile']) {
            document.getElementById('report-text').value = drafts[currentUser.email + '_casefile'];
        }

        // Выводим существующие кейс-файлы ниже формы
        let caseLists = reports.filter(r => r.globalType === 'casefile');
        renderReportList(container, caseLists);
        return;
    }

    // Рендер всех остальных стандартных вкладок
    if (tab === 'Новый отчёт') {
        container.innerHTML += `
            <div class="form-box">
                <select id="report-type" class="input-field" onchange="applyTemplate()">
                    <option value="">-- ВЫБЕРИТЕ ФОРМАТ ОТЧЕТА --</option>
                    <option value="incident">РАПОРТ ОБ ИНЦИДЕНТЕ</option>
                    <option value="accident">ОТЧЕТ О ПРОИСШЕСТВИИ</option>
                </select>
                <textarea id="report-text" class="report-area" placeholder="Текст отчета сгенерируется после выбора формата..."></textarea>
                
                <div class="photo-uploader">
                    <label for="photo-input" class="upload-label">📁 ДОБАВИТЬ МНОЖЕСТВО ФОТОГРАФИЙ</label>
                    <input type="file" id="photo-input" multiple accept="image/*" style="display:none;" onchange="previewPhotos()">
                    <div id="photo-previews" class="preview-container"></div>
                </div>

                <div class="actions">
                    <button onclick="saveDraft()" class="btn-secondary">СОХРАНИТЬ В ЧЕРНОВИК</button>
                    <button onclick="submitReport('patrol')" class="btn-primary">ОТПРАВИТЬ В БАЗУ ДАННЫХ</button>
                </div>
            </div>
        `;
        if (drafts[currentUser.email + '_patrol']) {
            document.getElementById('report-text').value = drafts[currentUser.email + '_patrol'];
        }
    } 
    else if (tab === 'Мои отчёты' || tab === 'Все отчёты') {
        let list = reports;
        if (tab === 'Мои отчёты') list = reports.filter(r => r.email === currentUser.email);
        else list = reports.filter(r => r.globalType === 'patrol');
        renderReportList(container, list);
    }
    else if (tab === 'Все патрульные' || tab === 'Сотрудники ГЕД') {
        const isGED = tab === 'Сотрудники ГЕД';
        const staff = Object.values(users).filter(u => {
            if (u.rank === "USER") return false; 
            if (isGED) return u.division === "GED" || u.division === "GED Patrol Division" || u.rank === "DETECTIVE" || u.rank === "ADMIN";
            return true; 
        });
        
        container.innerHTML += `<div class="staff-grid">`;
        staff.forEach(d => {
            container.innerHTML += `
                <div class="staff-card">
                    <img src="logo.png" style="width:50px; border-radius:50%; margin-bottom:10px;">
                    <h3>${d.name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${d.rank}</p>
                    <p style="font-size:12px; color:var(--text-gray);">${d.division} | Маркировка: ${d.unit}</p>
                    <span class="status-badge ${d.status.replace(' ', '-').toLowerCase()}" style="margin-top:10px; display:inline-block;">${d.status}</span>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Законы Чикаго') {
        container.innerHTML += `
            <div class="search-box">
                <input type="text" id="law-search" class="input-field" placeholder="Начните вводить название, статью или ключевое слово (например: Murder, Оружие, 720...)" oninput="filterLaws()">
            </div>
            <div id="laws-list" class="laws-grid"></div>
        `;
        filterLaws();
    }
    else if (tab === 'Активные банды') {
        container.innerHTML += `<h3>ЗАРЕГИСТРИРОВАННЫЕ ПРЕСТУПНЫЕ ГРУППИРОВКИ</h3><div class="gang-grid" id="gang-container"></div>`;
        const gCont = document.getElementById('gang-container');
        gangs.forEach((g) => {
            const div = document.createElement('div');
            div.className = 'gang-card';
            div.innerHTML = `<h3>${g.name}</h3><p style="color:var(--text-gray); font-size:12px; margin-top:10px;">Нажмите для открытия личного дела</p>`;
            div.onclick = () => viewGang(g);
            gCont.appendChild(div);
        });
    }
    else if (tab === 'Статистика районов') {
        container.innerHTML += `<div class="stat-grid">`;
        for (let area in shootingStats) {
            container.innerHTML += `<div class="stat-card"><strong>${area}</strong><br><span style="color:#ef4444; font-size: 18px; font-weight:bold; display:block; margin-top:5px;">Индекс стрельбы: ${shootingStats[area]}</span></div>`;
        }
        container.innerHTML += `</div>`;
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
                    <p>Маркировка: <strong>${u.unit}</strong></p>
                    <p>Дивизион: <strong>${u.division}</strong></p>
                    <p style="margin-top:10px; color:var(--accent-blue);">Написано отчетов: <span style="font-size:20px; font-weight:bold;">${u.count}</span></p>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Панель Управления') {
        renderAdminPanel(container);
    }
}

function filterLaws() {
    const query = document.getElementById('law-search') ? document.getElementById('law-search').value.toLowerCase().trim() : '';
    const listCont = document.getElementById('laws-list');
    if(!listCont) return;
    listCont.innerHTML = '';
    
    const filtered = CHICAGO_LAWS.filter(law => 
        law.code.toLowerCase().includes(query) || 
        law.title.toLowerCase().includes(query) || 
        law.desc.toLowerCase().includes(query)
    );
    
    if(filtered.length === 0) {
        listCont.innerHTML = '<p class="empty-text" style="color:var(--text-gray); padding:10px;">По данному поисковому запросу ничего не найдено в кодексе.</p>';
        return;
    }
    
    filtered.forEach(law => {
        listCont.innerHTML += `
            <div class="law-card">
                <div class="law-header">
                    <span class="law-code ${law.type === 'ac' ? 'ac' : ''}">${law.code}</span>
                    <h4 class="law-title">${law.title}</h4>
                </div>
                <p class="law-desc">${law.desc}</p>
            </div>
        `;
    });
}

function renderReportList(container, list) {
    if (list.length === 0) {
        container.innerHTML += `<p class="empty-text" style="color:var(--text-gray); padding: 10px;">Записей данной категории не обнаружено.</p>`;
        return;
    }
    list.forEach(r => {
        const div = document.createElement('div');
        div.className = 'report-card';
        div.innerHTML = `
            <div class="report-card-header">
                <strong style="color:${r.globalType === 'casefile' ? '#ef4444' : 'var(--accent-blue)'};">${r.type.toUpperCase()}</strong>
                <span style="font-size:12px; color:var(--text-gray);">${r.date}</span>
            </div>
            <div class="report-card-body">Автор: ${r.author} [${r.unit}] | ${r.division}</div>
        `;
        div.onclick = () => viewReport(r);
        container.appendChild(div);
    });
}

function applyTemplate() {
    const type = document.getElementById('report-type').value;
    if (TEMPLATES[type]) {
        document.getElementById('report-text').value = TEMPLATES[type];
    }
}

let loadedPhotos = [];
async function previewPhotos() {
    const files = document.getElementById('photo-input').files;
    const cont = document.getElementById('photo-previews');
    
    for(let file of files) {
        const base64 = await toBase64(file);
        loadedPhotos.push(base64);
        cont.innerHTML += `<img src="${base64}" class="preview-img">`;
    }
}

function saveDraft() {
    const text = document.getElementById('report-text').value;
    const type = currentMode === 'PATROL' ? 'patrol' : 'casefile';
    if(!text) return alert("Нечего сохранять.");
    
    drafts[currentUser.email + '_' + type] = text;
    localStorage.setItem('cpd_v5_drafts', JSON.stringify(drafts));
    alert("Черновик сохранен на вашем ПК.");
}

async function submitReport(globalType) {
    const type = document.getElementById('report-type').value;
    const text = document.getElementById('report-text').value;
    if (!type || !text) return alert("Заполните текст отчета!");
    
    reports.unshift({
        id: Date.now().toString(),
        type: type,
        globalType: globalType,
        text: text,
        author: currentUser.name,
        unit: currentUser.unit,
        division: currentUser.division,
        email: currentUser.email,
        date: new Date().toLocaleString(),
        photos: [...loadedPhotos]
    });
    
    delete drafts[currentUser.email + '_' + globalType];
    localStorage.setItem('cpd_v5_drafts', JSON.stringify(drafts));
    
    await saveToServer();
    alert("Запись успешно синхронизирована с таблицей!");
    loadedPhotos = [];
    
    if (globalType === 'casefile') {
        switchTab('Кейс-файлы');
    } else {
        switchTab('Мои отчёты');
    }
}

function viewReport(r) {
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';
    let photoHtml = r.photos && r.photos.length ? r.photos.map(p => `<img src="${p}" class="report-photo" onclick="window.open(this.src)">`).join('') : '<p style="color:var(--text-gray)">Фото отсутствуют.</p>';
    let adminBtn = currentUser.rank === "ADMIN" ? `<button onclick="deleteReport('${r.id}')" class="btn-delete-action" style="margin-top:15px; padding: 10px;">УДАЛИТЬ ИЗ ТАБЛИЦЫ</button>` : '';

    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color:${r.globalType === 'casefile' ? '#ef4444' : 'var(--accent-blue)'}; margin:0; font-size:20px;">${r.type.toUpperCase()}</h1>
            <span style="color:var(--text-gray); font-size:14px;">${r.date}</span>
        </div>
        <p style="color: #cbd5e1; margin-bottom: 15px; font-size:14px;"><strong>ИСПОЛНИТЕЛЬ:</strong> ${r.author} [${r.unit}] | <strong>ДИВИЗИОН:</strong> ${r.division}</p>
        <div class="report-content-view" style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); font-family:monospace; line-height:1.5;">${r.text}</div>
        <h3 style="margin-top:20px; margin-bottom:10px; color:var(--accent-blue);">ПРИКРЕПЛЕННЫЕ МАТЕРИАЛЫ:</h3>
        <div class="report-photos-grid">${photoHtml}</div>
        ${adminBtn}
    `;
}

async function deleteReport(id) {
    if (confirm("Удалить эту запись из таблицы окончательно?")) {
        reports = reports.filter(r => r.id !== id);
        await saveToServer();
        document.getElementById('modal-view').style.display = 'none';
        alert("Удалено.");
        document.querySelector('.nav-item.active').click();
    }
}

function viewGang(g) {
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';
    document.getElementById('modal-body').innerHTML = `
        <h1 style="color:#ef4444; border-bottom: 2px solid var(--border); padding-bottom:10px; font-size:24px;">ДОСЬЕ ОПГ: ${g.name}</h1>
        <div class="report-content-view" style="margin-top:20px; white-space: pre-wrap; font-size:15px; line-height:1.6; color:#e2e8f0;">${g.info}</div>
    `;
}

function renderAdminPanel(container) {
    container.innerHTML += `
        <div class="admin-panel-grid">
            <div class="form-box admin-box">
                <h3>УПРАВЛЕНИЕ РАНГАМИ</h3>
                <input id="adm-email" class="input-field" placeholder="Email сотрудника (user@cpd.gov)">
                <input id="adm-name" class="input-field" placeholder="Позывной / Имя Фамилия (John Doe)">
                <label style="font-size:11px; color:var(--text-gray)">Ранг/Доступ:</label>
                <select id="adm-rank" class="input-field">
                    <option value="USER">USER (Без доступа)</option>
                    <option value="PO">PO (Patrol Officer)</option>
                    <option value="SERGEANT">SERGEANT</option>
                    <option value="DETECTIVE">DETECTIVE</option>
                    <option value="ADMIN">ADMIN</option>
                </select>
                <label style="font-size:11px; color:var(--text-gray)">Дивизион:</label>
                <select id="adm-div" class="input-field">
                    <option value="Unassigned">Unassigned</option>
                    <option value="Patrol Division">Patrol Division</option>
                    <option value="GED Patrol Division">GED Patrol Division</option>
                    <option value="GED">GED (Gang Suppression Unit)</option>
                    <option value="Detective Bureau">Detective Bureau</option>
                </select>
                <button onclick="updateUser()" class="btn-primary" style="width:100%; margin-top:10px;">ВЫДАТЬ ЗВАНИЕ</button>
            </div>

            <div class="form-box admin-box">
                <h3>ДОБАВЛЕНИЕ БАНДЫ</h3>
                <input id="adm-gang" class="input-field" placeholder="Название ОПГ">
                <textarea id="adm-gang-info" class="input-field" style="height:120px;" placeholder="Информация о банде..."></textarea>
                <button onclick="addGang()" class="btn-primary" style="width:100%">ДОБАВИТЬ В БАЗУ</button>
            </div>

            <div class="form-box admin-box">
                <h3>РЕДАКТОР СТРЕЛЬБЫ</h3>
                <input id="adm-area" class="input-field" placeholder="Район">
                <input id="adm-perc" class="input-field" placeholder="Процент опасности (например, 74%)">
                <button onclick="updateStats()" class="btn-primary" style="width:100%">ОБНОВИТЬ</button>
            </div>
        </div>
        <div class="form-box admin-box" style="margin-top: 20px; border-color: var(--danger);">
            <h3 style="color: var(--danger);">УДАЛЕНИЕ ДАННЫХ ИЗ ТАБЛИЦЫ</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div id="adm-delete-gangs-list"><h4>Активные банды:</h4></div>
                <div id="adm-delete-areas-list"><h4>Статистика районов:</h4></div>
            </div>
        </div>
    `;

    const gangList = document.getElementById('adm-delete-gangs-list');
    gangs.forEach((g, idx) => {
        gangList.innerHTML += `<div class="delete-item-row"><span>${g.name}</span><button onclick="deleteGang(${idx})" class="btn-delete-action">УДАЛИТЬ</button></div>`;
    });

    const areaList = document.getElementById('adm-delete-areas-list');
    for (let area in shootingStats) {
        areaList.innerHTML += `<div class="delete-item-row"><span>${area}</span><button onclick="deleteArea('${area}')" class="btn-delete-action">УДАЛИТЬ</button></div>`;
    }
}

async function updateUser() {
    const email = document.getElementById('adm-email').value.toLowerCase().trim();
    if (!users[email]) return alert("Сотрудник не найден!");
    
    if(document.getElementById('adm-name').value) users[email].name = document.getElementById('adm-name').value;
    users[email].rank = document.getElementById('adm-rank').value;
    users[email].division = document.getElementById('adm-div').value;
    
    await saveToServer();
    alert(`Звание и доступы для ${email} изменены!`);
    if(currentUser.email === email) checkAuth();
    else switchTab('Панель Управления');
}

async function addGang() {
    const name = document.getElementById('adm-gang').value.trim();
    const info = document.getElementById('adm-gang-info').value.trim();
    if(!name || !info) return alert("Заполните название и информацию о ОПГ!");
    
    gangs.push({ name, info });
    await saveToServer();
    alert("Банда успешно внесена в электронную таблицу!");
    switchTab('Панель Управления'); 
}

async function updateStats() {
    const area = document.getElementById('adm-area').value.trim();
    const val = document.getElementById('adm-perc').value.trim();
    if(!area || !val) return;
    shootingStats[area] = val;
    await saveToServer();
    alert("Статистика района обновлена!");
    switchTab('Панель Управления');
}

async function deleteGang(index) {
    if (confirm("Удалить банду из таблицы?")) {
        gangs.splice(index, 1);
        await saveToServer();
        switchTab('Панель Управления');
    }
}

async function deleteArea(areaName) {
    if (confirm("Удалить район?")) {
        delete shootingStats[areaName];
        await saveToServer();
        switchTab('Панель Управления');
    }
}

async function editField(field) {
    let newVal = prompt(`Новое значение для ${field.toUpperCase()}:`, currentUser[field]);
    if (newVal) {
        currentUser[field] = newVal.trim();
        users[currentUser.email][field] = newVal.trim();
        await saveToServer();
        renderUI();
    }
}

async function toggleStatus() {
    const statuses = ["ON DUTY", "OFF DUTY", "ON SCENE"];
    currentUser.status = statuses[(statuses.indexOf(currentUser.status) + 1) % statuses.length];
    users[currentUser.email].status = currentUser.status;
    await saveToServer();
    renderUI();
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
// Полностью исправленная функция смены статуса
function changeStatus(newStatus) {
    if (!currentUser) {
        alert("Ошибка: Вы должны авторизоваться в системе!");
        return;
    }

    // 1. Обновляем статус в оперативной памяти сессии
    currentUser.status = newStatus;

    // 2. Обновляем статус в глобальной базе данных пользователей
    if (window.users && window.users[currentUser.username]) {
        window.users[currentUser.username].status = newStatus;
    } else if (typeof users !== 'undefined' && users[currentUser.username]) {
        users[currentUser.username].status = newStatus;
    }

    // 3. БЕЗОПАСНОЕ обновление текста на странице (без вылета в ошибку)
    // Код переберет все возможные варианты ID элементов, которые могут отвечать за статус
    const statusTextSelectors = ['user-status-text', 'status-text', 'current-status', 'officer-status'];
    let updatedVisual = false;

    for (let id of statusTextSelectors) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = newStatus;
            updatedVisual = true;
            break; 
        }
    }

    // Если ни один ID не подошел, ищем элемент через класс или текст, чтобы сайт не падал
    if (!updatedVisual) {
        const fallbackEl = document.querySelector('.status-value') || document.querySelector('.badge-status');
        if (fallbackEl) fallbackEl.textContent = newStatus;
    }

    console.log(`[CPD] Статус изменен на: ${newStatus}`);

    // 4. Отправляем обновленную базу на Google Диск через твой рабочий saveToServer
    if (typeof saveToServer === "function") {
        saveToServer();
    }
}

// Умная привязка к кнопкам по их ID или по тексту на кнопке
document.addEventListener("DOMContentLoaded", () => {
    // Вариант А: Ищем кнопки по точным ID
    const btnOnDuty = document.getElementById('btn-on-duty');
    const btnOffDuty = document.getElementById('btn-off-duty');
    const btnOnScene = document.getElementById('btn-on-scene');

    if (btnOnDuty) btnOnDuty.addEventListener('click', () => changeStatus('On Duty'));
    if (btnOffDuty) btnOffDuty.addEventListener('click', () => changeStatus('Off Duty'));
    if (btnOnScene) btnOnScene.addEventListener('click', () => changeStatus('On Scene'));

    // Вариант Б (Подстраховка): Если ID в HTML нет, находим кнопки просто по их тексту
    if (!btnOnDuty || !btnOffDuty || !btnOnScene) {
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(button => {
            const text = button.textContent.trim().toLowerCase();
            if (text === 'on duty') {
                button.addEventListener('click', () => changeStatus('On Duty'));
            } else if (text === 'off duty') {
                button.addEventListener('click', () => changeStatus('Off Duty'));
            } else if (text === 'on scene') {
                button.addEventListener('click', () => changeStatus('On Scene'));
            }
        });
    }
});

// Автоматическая привязка функций к кнопкам после загрузки страницы
document.addEventListener("DOMContentLoaded", () => {
    // Привязка для кнопки ON DUTY
    const btnOnDuty = document.getElementById('btn-on-duty') || document.querySelector('.btn-success');
    if (btnOnDuty) {
        btnOnDuty.addEventListener('click', () => changeStatus('On Duty'));
    }

    // Привязка для кнопки OFF DUTY
    const btnOffDuty = document.getElementById('btn-off-duty') || document.querySelector('.btn-danger');
    if (btnOffDuty) {
        btnOffDuty.addEventListener('click', () => changeStatus('Off Duty'));
    }

    // Привязка для кнопки ON SCENE
    const btnOnScene = document.getElementById('btn-on-scene') || document.querySelector('.btn-warning');
    if (btnOnScene) {
        btnOnScene.addEventListener('click', () => changeStatus('On Scene'));
    }
});
