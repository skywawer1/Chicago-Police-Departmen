
// Строгие шаблоны отчетов из ТЗ
const TEMPLATES = {
    incident: `CHICAGO POLICE DEPARTMENT
РАПОРТ ОБ ИНЦИДЕНТЕ
--
ФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка на рации)
Дата, время и место происшествия: XX-XX-2026 | XX-XX | (Указать место)

Обстоятельства инцидента:
(Тут описать всю ситуацию)

Лица, причастные к инциденту:
(Вписать ники как сотрудников причастных так и свидетелей при наличии)

Предварительные выводы:
(Опишите тут свой предварительный вывод по ситуации. Например какие действия были верны, как можно было бы сделать лучше, какие действия вы считаете оправданными и т.д.)

Принятые меры:
((Тут описать все ваши принятые меры. К примеру:
1. Помог осмотреть машину
2. Обыскал подозреваемого
3. Вызвал карету скорой помощи
и т.д.)
)
__

Дата: XX.XX.2026
Время: XX-XX | XX-XX`,
    
    accident: `CHICAGO POLICE DEPARTMENT
ОТЧЕТ О ПРОИСШЕСТВИИ
--
ФИО, звание, маркировка на рации: (Полный ник | Ранг | Маркировка на рации)
Дата, время и место происшествия: XX-XX-2026 | XX-XX | (Указать место)

Обстоятельства инцидента:
(Тут описать всю ситуацию)

Лица, причастные к инциденту:
(Вписать ники как сотрудников причастных так и свидетелей при наличии)

Предварительные выводы:
(Опишите тут свой предварительный вывод по ситуации. Например какие действия были верны, как можно было бы сделать лучше, какие действия вы считаете оправданными и т.д.)

Принятые меры:
((Тут описать все ваши принятые меры. К примеру:
1. Помог осмотреть машину
2. Обыскал подозреваемого
3. Вызвал карету скорой помощи
и т.д.)
)
__

Дата: XX.XX.2026
Время: XX-XX | XX-XX
Подпись: TEXT`,
    
    casefile: `CHICAGO CITY | GANG SUPPRESSION UNIT

1. ОСНОВНАЯ ИНФОРМАЦИЯ
Номер дела: D-${Math.floor(Math.random()*900000 + 100000)}DT
Дата открытия: ${new Date().toLocaleDateString()}
Детектив: Имя детектива
Отдел: Gang Suppression Unit
Статус дела: OPEN / CLOSED / SUSPENDED
Тип преступления: Gang Activity / Drug Trafficking / Assault / Murder / Illegal Weapons

2. ИНФОРМАЦИЯ О ПОДОЗРЕВАЕМОМ
Личные данные
Имя Фамилия:
Дата рождения:
Национальность:
Место проживания:
Номер телефона:
ID / CID:

Связи
Банда / группировка:
Ранг в банде:
Известные сообщники:
Транспорт:
Оружие:

3. ОПИСАНИЕ СИТУАЦИИ
Краткое описание
14.05.2026 примерно в 22:30 сотрудники Detective Division получили информацию о незаконной деятельности группировки в районе South Chicago. После наблюдения были замечены лица, проводившие обмен наркотических веществ и оружия.

Полный рапорт
Подробно расписывается:
что произошло;
где произошло;
кто участвовал;
какие действия предпринимались;
как задерживали;
что нашли;
сопротивление;
перестрелка;
преследование;
использование оружия.

5. ДОКАЗАТЕЛЬСТВA
Изъято:
Glock 17
AK-47
Наркотические вещества
Деньги
Телефоны
Маски
Документы

Фото-доказательства
Фото с места преступления
Фото оружия
Фото транспорта
BodyCam записи
CCTV камеры

7. ОБВИНЕНИЯ
Illegal Possession of Firearm
Drug Distribution
Gang Affiliation
Assault on Officer
Evading Police

8. ПРИЛОЖЕНИЯ
Screenshot #1
Screenshot #2
Video Evidence
Audio Recording
Witness Statement

9. ЗАКЛЮЧЕНИЕ ДЕТЕКТИВА
На основании собранных доказательств подозреваемый причастен к деятельности организованной преступной группировки и нарушению уголовного кодекса Chicago City.`
};

window.onload = () => {
    if (Object.keys(users).length === 0) {
        users["admin@cpd.gov"] = { password: "admin", name: "Chief Admin", rank: "ADMIN", division: "Command", unit: "CHIEF", status: "ON DUTY" };
        save();
    }
    bindEvents();
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

function login() {
    const email = document.getElementById('auth-email').value.toLowerCase().trim();
    const pass = document.getElementById('auth-password').value;
    
    if (users[email] && users[email].password === pass) {
        currentUser = { ...users[email], email: email };
        localStorage.setItem('cpd_v5_session', JSON.stringify(currentUser));
        document.getElementById('auth-error').innerText = "";
        checkAuth();
    } else {
        document.getElementById('auth-error').innerText = "Ошибка: неверный Email или пароль.";
    }
}

function register() {
    const email = document.getElementById('auth-email').value.toLowerCase().trim();
    const pass = document.getElementById('auth-password').value;
    
    if (!email || !pass) return alert("Введите Email и пароль!");
    if (users[email]) return alert("Эта почта уже зарегистрирована.");
    
    users[email] = { password: pass, name: "Офицер (" + email.split('@')[0] + ")", rank: "USER", division: "Unassigned", unit: "NONE", status: "OFF DUTY" };
    save();
    alert("Успешная регистрация! Выполняется автоматический вход...");
    login(); // Автоматический вход после регистрации
}

function logout() { 
    localStorage.removeItem('cpd_v5_session'); 
    location.reload(); 
}

function checkAuth() {
    if (currentUser && users[currentUser.email]) {
        currentUser = { ...users[currentUser.email], email: currentUser.email };
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
    document.getElementById('btn-switch-bureau').style.display = hasDetAccess ? 'block' : 'none';
    
    renderNav();
}

function renderNav() {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = '';
    let menu = [];

    if (currentUser.rank === "USER") {
        menu.push('Ожидание одобрения');
    } else {
        if (currentMode === "PATROL") {
            menu.push('Новый отчёт', 'Мои отчёты', 'Все отчёты', 'Все патрульные', 'Статистика');
        } else {
            menu.push('Кейс-файлы', 'Активные банды', 'Сотрудники ГЕД', 'Статистика районов');
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

function switchTab(tab) {
    const container = document.getElementById('tab-container');
    container.innerHTML = `<h2 class="tab-title">${tab.toUpperCase()}</h2>`;
    
    if (tab === 'Ожидание одобрения') {
        container.innerHTML += `<p class="empty-text">Вы успешно зарегистрированы в системе CPD, но администрация еще не выдала вам ранг полиции Чикаго. Обратитесь к шефу/администратору для привязки ранга и дивизиона к вашей почте: <strong>${currentUser.email}</strong>.</p>`;
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
                <textarea id="report-text" class="report-area" placeholder="Текст отчета сгенерируется после выбора формата сверху..."></textarea>
                
                <div class="photo-uploader">
                    <label for="photo-input" class="upload-label">📁 ДОБАВИТЬ МНОЖЕСТВО ФОТОГРАФИЙ ИЛИ СКРИНШОТОВ</label>
                    <input type="file" id="photo-input" multiple accept="image/*" style="display:none;" onchange="previewPhotos()">
                    <div id="photo-previews" class="preview-container"></div>
                </div>

                <div class="actions">
                    <button onclick="saveDraft()" class="btn-secondary">СОХРАНИТЬ В ЧЕРНОВИК</button>
                    <button onclick="submitReport('${isCase ? 'casefile' : 'patrol'}')" class="btn-primary">ОТПРАВИТЬ В БАЗУ ДАННЫХ</button>
                </div>
            </div>
        `;
        
        const currentType = isCase ? 'casefile' : 'patrol';
        if (drafts[currentUser.email + '_' + currentType]) {
            document.getElementById('report-text').value = drafts[currentUser.email + '_' + currentType];
        }
    } 
    else if (tab === 'Мои отчёты' || tab === 'Все отчёты') {
        let list = reports;
        if (tab === 'Мои отчёты') list = reports.filter(r => r.email === currentUser.email);
        else list = reports.filter(r => r.globalType === 'patrol');
        renderReportList(container, list);
    }
    else if (tab === 'Все патрульные') {
        const patrolUsers = Object.keys(users)
            .filter(email => users[email].division === "Patrol Division" || users[email].rank === "PO")
            .map(email => ({ email, ...users[email] }));
            
        container.innerHTML += `<div class="staff-grid">`;
        if (patrolUsers.length === 0) {
            container.innerHTML += `<p class="empty-text">Патрульных сотрудников пока нет в базе.</p>`;
        }
        patrolUsers.forEach(p => {
            container.innerHTML += `
                <div class="staff-card">
                    <img src="https://via.placeholder.com/60?text=CPD" style="border-radius:50%; margin-bottom:10px;">
                    <h3>${p.name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${p.rank}</p>
                    <p style="font-size:12px; color:var(--text-gray);">${p.division} | Маркировка: ${p.unit}</p>
                    <span class="status-badge ${p.status.replace(' ', '-').toLowerCase()}" style="margin-top:10px; display:inline-block;">${p.status}</span>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Статистика') {
        let stats = {};
        reports.forEach(r => { stats[r.email] = (stats[r.email] || 0) + 1; });
        
        let activeUsers = Object.keys(users)
            .filter(email => users[email].rank !== "USER")
            .map(email => ({ email, ...users[email], count: stats[email] || 0 }))
            .sort((a, b) => b.count - a.count);
            
        container.innerHTML += `<p class="empty-text" style="margin-bottom:15px;">Сотрудники, зарегистрированные в системе и написавшие наибольшее количество отчетов:</p><div class="stat-grid">`;
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
        
        container.innerHTML += `<h3 style="color:var(--accent-blue); margin-bottom:10px;">СТАТИСТИКА АКТИВНОСТИ ДЕТЕКТИВОВ (CASE FILES)</h3><div class="stat-grid" style="margin-bottom: 30px;">`;
        for(let email in users) {
            if(users[email].rank === "DETECTIVE" || users[email].division === "GED" || users[email].rank === "ADMIN") {
                container.innerHTML += `<div class="stat-card"><strong>${users[email].name}</strong><br>Кейс-файлов в базе: ${detStats[email] || 0}</div>`;
            }
        }
        container.innerHTML += `</div><hr style="border-color:var(--border); margin-bottom:20px;"><h3>СПИСОК КРИМИНАЛЬНЫХ ГРУППИРОВОК Чикаго</h3><div class="gang-grid" id="gang-container"></div>`;
        
        const gCont = document.getElementById('gang-container');
        gangs.forEach((g, idx) => {
            const div = document.createElement('div');
            div.className = 'gang-card';
            div.innerHTML = `<h3>${g.name}</h3><p style="color:var(--text-gray); font-size:12px; margin-top:10px;">Нажмите, чтобы открыть досье ОПГ</p>`;
            div.onclick = () => viewGang(g);
            gCont.appendChild(div);
        });
    }
    else if (tab === 'Статистика районов') {
        container.innerHTML += `<p class="empty-text" style="margin-bottom:15px;">Официа данные по росту и уровню уличной стрельбы по юрисдикциям:</p><div class="stat-grid">`;
        for (let area in shootingStats) {
            container.innerHTML += `<div class="stat-card"><strong>${area}</strong><br><span style="color:#ef4444; font-size: 18px; font-weight:bold; display:block; margin-top:5px;">Индекс стрельбы: ${shootingStats[area]}</span></div>`;
        }
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Сотрудники ГЕД') {
        const dets = Object.values(users).filter(u => u.division === "GED" || u.rank === "DETECTIVE" || u.rank === "ADMIN");
        container.innerHTML += `<div class="staff-grid">`;
        dets.forEach(d => {
            container.innerHTML += `
                <div class="staff-card">
                    <img src="https://via.placeholder.com/60?text=CPD" style="border-radius:50%; margin-bottom:10px;">
                    <h3>${d.name}</h3>
                    <p style="color:var(--accent-blue); font-size:13px; font-weight:bold;">${d.rank}</p>
                    <p style="font-size:12px; color:var(--text-gray);">${d.division} | Маркировка: ${d.unit}</p>
                    <span class="status-badge ${d.status.replace(' ', '-').toLowerCase()}" style="margin-top:10px; display:inline-block;">${d.status}</span>
                </div>`;
        });
        container.innerHTML += `</div>`;
    }
    else if (tab === 'Панель Управления') {
        renderAdminPanel(container);
    }
}

function renderReportList(container, list) {
    if (list.length === 0) {
        container.innerHTML += `<p class="empty-text">Отчетов данной категории не обнаружено.</p>`;
        return;
    }
    list.forEach(r => {
        const div = document.createElement('div');
        div.className = 'report-card';
        div.innerHTML = `
            <div class="report-card-header">
                <strong style="color:var(--accent-blue);">${r.type.toUpperCase()}</strong>
                <span style="font-size:12px; color:var(--text-gray);">${r.date}</span>
            </div>
            <div class="report-card-body">Автор рапорта: ${r.author} [${r.unit}] | Подразделение: ${r.division}</div>
        `;
        div.onclick = () => viewReport(r);
        container.appendChild(div);
    });
}

function applyTemplate() {
    const type = document.getElementById('report-type').value;
    if (TEMPLATES[type]) {
        document.getElementById('report-text').value = TEMPLATES[type];
    } else {
        document.getElementById('report-text').value = '';
    }
}

let loadedPhotos = [];
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
    alert("Ваш несохраненный отчет успешно записан в черновик текущей вкладки!");
}

async function submitReport(globalType) {
    const type = document.getElementById('report-type').value;
    const text = document.getElementById('report-text').value;
    
    if (!type || !text) return alert("Ошибка: выберите тип документа и заполните текстовые поля!");
    
    reports.unshift({
        id: Date.now(), // Уникальный ID для удаления
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
    save();
    
    alert("Документ успешно загружен и отправлен в архив Главного Управления!");
    loadedPhotos = [];
    switchTab(currentMode === 'PATROL' ? 'Мои отчёты' : 'Кейс-файлы');
}

function viewReport(r) {
    const m = document.getElementById('modal-view');
    m.style.display = 'flex';
    
    let photoHtml = r.photos && r.photos.length ? r.photos.map(p => `<img src="${p}" class="report-photo" onclick="window.open(this.src)">`).join('') : '<p style="color:var(--text-gray)">Фото-доказательства отсутствуют.</p>';
    
    // Кнопка удаления только для администратора
    let adminDeleteBtn = currentUser.rank === "ADMIN" ? 
        `<button onclick="deleteReport(${r.id})" class="btn-delete-action" style="margin-top: 20px; width: 100%; padding: 10px;">УДАЛИТЬ ОТЧЕТ ИЗ БАЗЫ</button>` : '';

    document.getElementById('modal-body').innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin-bottom: 20px;">
            <h1 style="color:var(--accent-blue); margin:0; font-size:20px;">${r.type.toUpperCase()}</h1>
            <span style="color:var(--text-gray); font-size:14px;">${r.date}</span>
        </div>
        <p style="color: #cbd5e1; margin-bottom: 15px; font-size:14px;"><strong>ИСПОЛНИТЕЛЬ:</strong> ${r.author} [${r.unit}] | <strong>ДИВИЗИОН:</strong> ${r.division} (${r.email})</p>
        <div class="report-content-view" style="white-space: pre-wrap; background:#050914; padding:20px; border-radius:4px; border:1px solid var(--border); font-family:monospace; line-height:1.5;">${r.text}</div>
        <h3 style="margin-top:20px; margin-bottom:10px; color:var(--accent-blue);">ПРИКРЕПЛЕННЫЕ МАТЕРИАЛЫ / ФОТОФИКСАЦИЯ:</h3>
        <div class="report-photos-grid">${photoHtml}</div>
        ${adminDeleteBtn}
    `;
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
                <h3>УПРАВЛЕНИЕ РАНГАМИ И ПОЧТАМИ ПОЛЬЗОВАТЕЛЕЙ</h3>
                <p style="font-size:11px; color:var(--text-gray); margin-bottom:10px;">Введите почту зарегистрированного юзера для настройки:</p>
                <input id="adm-email" class="input-field" placeholder="Email сотрудника (user@cpd.gov)">
                <input id="adm-name" class="input-field" placeholder="Позывной / Имя Фамилия (John Doe)">
                
                <label style="font-size:11px; color:var(--text-gray)">Ранг/Доступ:</label>
                <select id="adm-rank" class="input-field">
                    <option value="USER">USER (Гражданский - без доступа)</option>
                    <option value="PO">PO (Patrol Officer)</option>
                    <option value="SERGEANT">SERGEANT</option>
                    <option value="DETECTIVE">DETECTIVE (Доступ к Бюро)</option>
                    <option value="ADMIN">ADMIN (Суперадминистратор)</option>
                </select>
                
                <label style="font-size:11px; color:var(--text-gray)">Дивизион:</label>
                <select id="adm-div" class="input-field">
                    <option value="Unassigned">Unassigned</option>
                    <option value="Patrol Division">Patrol Division</option>
                    <option value="GED">GED (Gang Suppression Unit)</option>
                    <option value="Detective Bureau">Detective Bureau</option>
                </select>
                <button onclick="updateUser()" class="btn-primary" style="width:100%; margin-top:10px;">ВЫДАТЬ ЗВАНИЕ И ПРАВА</button>
            </div>

            <div class="form-box admin-box">
                <h3>ДОБАВЛЕНИЕ НОВОЙ АКТИВНОЙ БАНДЫ</h3>
                <input id="adm-gang" class="input-field" placeholder="Название ОПГ">
                <textarea id="adm-gang-info" class="input-field" style="height:120px;" placeholder="Заполните информацию о банде..."></textarea>
                <button onclick="addGang()" class="btn-primary" style="width:100%">ДОБАВИТЬ В БАЗУ ДАННЫХ ДЕТЕКТИВОВ</button>
            </div>

            <div class="form-box admin-box">
                <h3>РЕДАКТОР СТАТИСТИКИ СТРЕЛЬБЫ</h3>
                <input id="adm-area" class="input-field" placeholder="Название района (например, South Chicago)">
                <input id="adm-perc" class="input-field" placeholder="Процент / уровень опасности (например, 74%)">
                <button onclick="updateStats()" class="btn-primary" style="width:100%">ОБНОВИТЬ КАРТУ ПРЕСТУПНОСТИ</button>
            </div>
        </div>

        <div class="form-box admin-box" style="max-width: 100%; margin-top: 20px; border-color: var(--danger);">
            <h3 style="color: var(--danger);">УПРАВЛЕНИЕ УДАЛЕНИЕМ ДАННЫХ (БАНДЫ И РАЙОНЫ)</h3>
            <p style="font-size:12px; color:var(--text-gray); margin-bottom:15px;">Кликните по кнопке «УДАЛИТЬ», чтобы навсегда стереть объект из базы данных терминала.</p>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <div>
                    <h4 style="font-size:13px; margin-bottom:10px;">Активные банды:</h4>
                    <div id="adm-delete-gangs-list" style="display:flex; flex-direction:column; gap:5px;"></div>
                </div>
                <div>
                    <h4 style="font-size:13px; margin-bottom:10px;">Статистика районов:</h4>
                    <div id="adm-delete-areas-list" style="display:flex; flex-direction:column; gap:5px;"></div>
                </div>
            </div>
        </div>
    `;

    const gangList = document.getElementById('adm-delete-gangs-list');
    gangs.forEach((g, idx) => {
        gangList.innerHTML += `
            <div class="delete-item-row">
                <span>${g.name}</span>
                <button onclick="deleteGang(${idx})" class="btn-delete-action">УДАЛИТЬ</button>
            </div>`;
    });

    const areaList = document.getElementById('adm-delete-areas-list');
    for (let area in shootingStats) {
        areaList.innerHTML += `
            <div class="delete-item-row">
                <span>${area} (${shootingStats[area]})</span>
                <button onclick="deleteArea('${area}')" class="btn-delete-action">УДАЛИТЬ</button>
            </div>`;
    }
}

function updateUser() {
    const email = document.getElementById('adm-email').value.toLowerCase().trim();
    const name = document.getElementById('adm-name').value.trim();
    const rank = document.getElementById('adm-rank').value;
    const div = document.getElementById('adm-div').value;

    if (!email || !users[email]) return alert("Сотрудник с такой электронной почтой не найден в системе!");
    
    if(name) users[email].name = name;
    users[email].rank = rank;
    users[email].division = div;
    
    save();
    alert(`Права для ${email} успешно обновлены. Ранг: ${rank}, Отдел: ${div}`);
    if(currentUser.email === email) checkAuth();
}

function updateStats() {
    const area = document.getElementById('adm-area').value.trim();
    const val = document.getElementById('adm-perc').value.trim();
    
    if(!area || !val) return alert("Заполните все текстовые поля редактирования статистики!");
    
    shootingStats[area] = val;
    save();
    alert("Статистика района Чикаго пересчитана!");
}

function addGang() {
    const name = document.getElementById('adm-gang').value.trim();
    const info = document.getElementById('adm-gang-info').value.trim();
    
    if(!name || !info) return alert("Заполните имя ОПГ и карточку информации!");
    
    gangs.push({ name, info });
    save();
    alert(`Криминальная банда ${name} успешно внесена в архивы GED.`);
}

function editField(field) {
    let currentVal = currentUser[field];
    let newVal = prompt(`Изменение данных терминала. Введите новое значение для ${field.toUpperCase()}:`, currentVal);
    
    if (newVal !== null && newVal.trim() !== '') {
        currentUser[field] = newVal.trim();
        users[currentUser.email][field] = newVal.trim();
        save();
        renderUI();
    }
}

function toggleStatus() {
    const statuses = ["ON DUTY", "OFF DUTY", "ON SCENE"];
    let nextIdx = (statuses.indexOf(currentUser.status) + 1) % statuses.length;
    
    currentUser.status = statuses[nextIdx];
    users[currentUser.email].status = currentUser.status;
    save();
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

function save() {
    localStorage.setItem('cpd_v5_users', JSON.stringify(users));
    localStorage.setItem('cpd_v5_reports', JSON.stringify(reports));
    localStorage.setItem('cpd_v5_gangs', JSON.stringify(gangs));
    localStorage.setItem('cpd_v5_stats', JSON.stringify(shootingStats));
}

// Удаление банды
function deleteGang(index) {
    if (confirm(`Вы уверены, что хотите безвозвратно удалить банду "${gangs[index].name}" из базы данных?`)) {
        gangs.splice(index, 1);
        save();
        alert("Карточка ОПГ успешно удалена.");
        switchTab('Панель Управления'); 
    }
}

// Удаление статистики района
function deleteArea(areaName) {
    if (confirm(`Вы уверены, что хотите удалить район "${areaName}" из сводки по стрельбе?`)) {
        delete shootingStats[areaName];
        save();
        alert("Район удален из базы данных.");
        switchTab('Панель Управления'); 
    }
}

// Удаление отчета из базы
function deleteReport(reportId) {
    if (confirm("Вы уверены, что хотите удалить данный рапорт/кейс-файл из архивов Главного Управления?")) {
        reports = reports.filter(r => r.id !== reportId);
        save();
        document.getElementById('modal-view').style.display = 'none';
        alert("Документ успешно стерт из архива.");
        
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) activeNav.click();
    }
}
// ВСТАВЬТЕ СЮДА ВАШ URL ИЗ GOOGLE APPS SCRIPT
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyBPLqQ8Eyut5ICfWs4OB6GM0lOn6FCw1HAmNwM6h1YVaTvpwAVPiMsfE7TXixtGYZn/exec";

let usersList = []; // Список всех юзеров из таблицы
let  reports = [];   // Список всех отчетов из таблицы
let currentUser = JSON.parse(localStorage.getItem('cpd_v5_session')) || null;
let currentMode = "PATROL"; 

// Локальные данные, которые пока не в облаке (можно оставить так)
let gangs = JSON.parse(localStorage.getItem('cpd_v5_gangs')) || [
    { name: "Vice Lords", info: "Активная группировка Чикаго." },
    { name: "18th Street Gang", info: "Многонациональная банда." }
];
let shootingStats = JSON.parse(localStorage.getItem('cpd_v5_stats')) || { "South Chicago": "45%", "Englewood": "58%" };
let drafts = JSON.parse(localStorage.getItem('cpd_v5_drafts')) || {};

window.onload = () => {
    bindEvents();
    if (currentUser) {
        checkAuth();
        syncData(); // Сразу грузим данные из облака
    } else {
        checkAuth();
    }
    
    // Авто-обновление данных каждые 30 секунд
    setInterval(() => { if(currentUser) syncData(); }, 30000);
};

// --- СЕРВЕРНЫЕ ФУНКЦИИ (API) ---

async function syncData() {
    try {
        const response = await fetch(SCRIPT_URL + "?action=getData");
        const data = await response.json();
        
        // Форматируем данные из таблицы обратно в объекты
        usersList = data.users.map(u => ({ email: u[0], name: u[2], rank: u[3], division: u[4], unit: u[5], status: u[6] }));
        reports = data.reports.map(r => ({
            id: r[0], type: r[1], globalType: r[2], text: r[3],
            author: r[4], unit: r[5], division: r[6], email: r[7], date: r[8], photos: JSON.parse(r[9] || "[]")
        })).reverse(); // Новые сверху

        // Если текущий юзер обновился в таблице (вы дали ему ранг)
        const updatedMe = usersList.find(u => u.email === currentUser.email);
        if (updatedMe) {
            currentUser = { ...currentUser, ...updatedMe };
            localStorage.setItem('cpd_v5_session', JSON.stringify(currentUser));
        }
        
        renderUI();
    } catch (e) {
        console.error("Ошибка синхронизации:", e);
    }
}

async function login() {
    const email = document.getElementById('auth-email').value.toLowerCase().trim();
    const pass = document.getElementById('auth-password').value;
    const btn = document.getElementById('btn-login');
    
    if(!email || !pass) return alert("Введите данные!");
    
    btn.innerText = "ВХОД...";
    btn.disabled = true;

    try {
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "login", email: email, password: pass })
        });
        const result = await response.text();

        if (result !== "fail" && result !== "Error") {
            currentUser = JSON.parse(result);
            localStorage.setItem('cpd_v5_session', JSON.stringify(currentUser));
            document.getElementById('auth-error').innerText = "";
            checkAuth();
            syncData();
        } else {
            document.getElementById('auth-error').innerText = "Ошибка: неверный Email или пароль.";
        }
    } catch (e) {
        alert("Ошибка сервера. Проверьте URL скрипта.");
    } finally {
        btn.innerText = "Войти";
        btn.disabled = false;
    }
}

async function register() {
    const email = document.getElementById('auth-email').value.toLowerCase().trim();
    const pass = document.getElementById('auth-password').value;
    
    if (!email || !pass) return alert("Введите Email и пароль!");
    
    const btn = document.getElementById('btn-register');
    btn.innerText = "РЕГИСТРАЦИЯ...";
    
    try {
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "register", email: email, password: pass })
        });
        const result = await response.text();

        if (result === "success") {
            alert("Успешная регистрация! Теперь войдите в систему.");
            login();
        } else if (result === "exists") {
            alert("Эта почта уже занята.");
        }
    } catch (e) {
        alert("Ошибка при регистрации.");
    } finally {
        btn.innerText = "Регистрация";
    }
}

async function submitReport(globalType) {
    const type = document.getElementById('report-type').value;
    const text = document.getElementById('report-text').value;
    
    if (!type || !text) return alert("Заполните все поля!");
    
    const btn = document.querySelector('.btn-primary');
    btn.innerText = "ОТПРАВКА...";
    btn.disabled = true;

    const reportData = {
        action: "saveReport",
        type, globalType, text,
        author: currentUser.name,
        unit: currentUser.unit,
        division: currentUser.division,
        email: currentUser.email,
        photos: loadedPhotos
    };

    try {
        await fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(reportData) });
        alert("Отчет успешно сохранен в облачной базе данных!");
        delete drafts[currentUser.email + '_' + globalType];
        localStorage.setItem('cpd_v5_drafts', JSON.stringify(drafts));
        loadedPhotos = [];
        syncData(); // Обновляем список
        switchTab(currentMode === 'PATROL' ? 'Мои отчёты' : 'Кейс-файлы');
    } catch (e) {
        alert("Ошибка при отправке отчета.");
    }
}

// --- ВСЕ ОСТАЛЬНЫЕ ФУНКЦИИ (ИНТЕРФЕЙС) ---
// (Оставляем как в предыдущей версии, но меняем логику получения списков)

function checkAuth() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');

    if (!authScreen || !appScreen) {
        console.error("КРИТИЧЕСКАЯ ОШИБКА: В HTML не найдены блоки 'auth-screen' или 'app-screen'!");
        return;
    }

    if (currentUser) {
        authScreen.style.display = 'none';
        appScreen.style.display = 'flex';
        renderUI();
    } else {
        authScreen.style.display = 'flex';
        appScreen.style.display = 'none';
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
    document.getElementById('btn-switch-bureau').style.display = hasDetAccess ? 'block' : 'none';
    
    renderNav();
}

// ... (Добавьте сюда функции renderNav, switchTab, viewReport и шаблоны из предыдущего ответа) ...
// Единственное изменение: в switchTab('Все патрульные') используйте usersList вместо Object.keys(users)

function logout() { 
    localStorage.removeItem('cpd_v5_session'); 
    location.reload(); 
}

function bindEvents() {
    document.getElementById('btn-login').onclick = login;
    document.getElementById('btn-register').onclick = register;
    document.getElementById('btn-logout').onclick = logout;
    document.getElementById('status-toggle').onclick = () => alert("Для смены статуса, позывного или ранга обратитесь к ADMIN или измените данные в Google Таблице.");
    document.getElementById('btn-switch-bureau').onclick = () => {
        currentMode = currentMode === "PATROL" ? "DETECTIVE" : "PATROL"; 
        renderUI();
    };
}
async function syncData() {
    try {
        const response = await fetch(SCRIPT_URL + "?action=getData", {
            method: 'GET',
            mode: 'cors', // Добавляем этот режим
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        // ... твой код обработки данных ...
    } catch (e) {
        console.error("CORS или ошибка сети:", e);
    }
}
