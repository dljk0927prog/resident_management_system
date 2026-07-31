let activityPage = 1;
const activityLimit = 5;
const activityDayLimit = 200;
let activitySearchTimer = null;
let activityRefreshTimer = null;
let activityDaySearchTimer = null;
let selectedActivityDate = '';

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getLocale() {
    const lang = typeof getLang === 'function' ? getLang() : 'en';
    if (lang === 'en') return 'en-US';
    if (lang === 'ms') return 'ms-MY';
    return 'zh-CN';
}

function _t(key, params, fallback) {
    if (typeof t === 'function') return t(key, params);
    return fallback || key;
}

function formatYM(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

async function checkAuth() {
    try {
        const response = await fetch('api/check_auth.php');
        const data = await response.json();
        if (!data.authenticated) {
            window.location.href = 'index.html';
            return false;
        }
        if (data.role === 'resident') {
            window.location.href = 'resident.html';
            return false;
        }
        document.getElementById('adminUsername').textContent = (typeof t === 'function' ? t('adminLabel') : 'Admin: ') + data.admin.username;
        return true;
    } catch (e) {
        window.location.href = 'index.html';
        return false;
    }
}

function buildQuery(page, opts, limitOverride) {
    const q = (opts.q || '').trim();
    const role = opts.role || '';
    const action = (opts.action || '').trim();
    const date = opts.date || '';
    const today = opts.today ? '1' : '';
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limitOverride || activityLimit));
    if (q) params.set('q', q);
    if (role) params.set('role', role);
    if (action) params.set('action', action);
    if (date) params.set('date', date);
    if (today) params.set('today', today);
    return params.toString();
}

function updatePagination(pagination) {
    const paginationDiv = document.getElementById('activityPagination');
    activityPage = pagination.page;
    if (pagination.total_pages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    const _t = typeof t === 'function' ? t : (k) => k;
    let html = '';
    html += `<button ${activityPage <= 1 ? 'disabled' : ''} onclick="loadTodayActivityLogs(${activityPage - 1})">${_t('prevPage')}</button>`;
    html += `<span>${_t('pageInfo', { current: activityPage, total: pagination.total_pages, count: pagination.total })}</span>`;
    html += `<button ${activityPage >= pagination.total_pages ? 'disabled' : ''} onclick="loadTodayActivityLogs(${activityPage + 1})">${_t('nextPage')}</button>`;
    paginationDiv.innerHTML = html;
}

function renderLogsRows(logs) {
    return logs.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${escapeHtml(item.actor_role || '')}</td>
            <td>${escapeHtml(item.actor_name || '-')}${item.actor_id ? ` (#${item.actor_id})` : ''}</td>
            <td>${escapeHtml(item.action || '')}</td>
            <td>${escapeHtml(item.target_type || '')}${item.target_id ? `:${escapeHtml(item.target_id)}` : ''}</td>
            <td>${escapeHtml(item.description || '')}</td>
            <td>${escapeHtml(item.ip_address || '')}</td>
            <td>${item.created_at ? new Date(item.created_at).toLocaleString(getLocale()) : ''}</td>
        </tr>
    `).join('');
}

async function loadTodayActivityLogs(page = 1) {
    const opts = {
        q: document.getElementById('activitySearchInput').value || '',
        role: document.getElementById('activityRoleSelect').value || '',
        action: document.getElementById('activityActionInput').value || '',
        today: true
    };
    try {
        const response = await fetch('api/get_activity_logs.php?' + buildQuery(page, opts));
        const data = await response.json();
        const tbody = document.getElementById('activityLogsBody');
        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#dc3545;">' + (typeof t === 'function' ? t('loadFailed') : '加载失败，请刷新重试') + '</td></tr>';
            return;
        }
        if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">' + (typeof t === 'function' ? t('noActivityLogs') : '暂无操作日志') + '</td></tr>';
            updatePagination({ page: 1, total_pages: 1, total: 0 });
            return;
        }
        tbody.innerHTML = renderLogsRows(data.logs);
        updatePagination(data.pagination || { page: 1, total_pages: 1, total: 0 });
    } catch (e) {
        document.getElementById('activityLogsBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:#dc3545;">' + (typeof t === 'function' ? t('loadFailed') : '加载失败，请刷新重试') + '</td></tr>';
    }
}

function scheduleSearch() {
    if (activitySearchTimer) clearTimeout(activitySearchTimer);
    activitySearchTimer = setTimeout(() => loadTodayActivityLogs(1), 250);
}

function renderActivityCalendar(ym, dateCounts) {
    const grid = document.getElementById('activityCalendarGrid');
    const [year, month] = ym.split('-').map(v => parseInt(v, 10));
    const first = new Date(year, month - 1, 1);
    const days = new Date(year, month, 0).getDate();
    const startWeekday = first.getDay();

    const weekLabels = [
        _t('weekSun', null, 'Sun'),
        _t('weekMon', null, 'Mon'),
        _t('weekTue', null, 'Tue'),
        _t('weekWed', null, 'Wed'),
        _t('weekThu', null, 'Thu'),
        _t('weekFri', null, 'Fri'),
        _t('weekSat', null, 'Sat')
    ];
    let html = '';
    weekLabels.forEach(w => {
        html += `<div class="records-calendar-day empty"><div class="records-calendar-date">${w}</div></div>`;
    });
    for (let i = 0; i < startWeekday; i++) {
        html += '<div class="records-calendar-day empty"></div>';
    }
    for (let d = 1; d <= days; d++) {
        const dateStr = `${ym}-${String(d).padStart(2, '0')}`;
        const count = dateCounts[dateStr] || 0;
        html += `
            <div class="records-calendar-day ${count > 0 ? 'has-record' : ''}" data-date="${dateStr}">
                <div class="records-calendar-date">${d}</div>
                <div class="records-calendar-count">${count > 0 ? _t('countRecords', { count: count }, `${count} records`) : _t('noRecordInDay', null, 'No records')}</div>
            </div>
        `;
    }
    grid.innerHTML = html;
    grid.querySelectorAll('.records-calendar-day[data-date]').forEach(el => {
        el.addEventListener('click', function() {
            openActivityDayModal(this.getAttribute('data-date'));
        });
    });
}

async function loadActivityCalendar() {
    const ym = document.getElementById('activityMonthInput').value || new Date().toISOString().slice(0, 7);
    try {
        const response = await fetch('api/get_activity_calendar.php?month=' + encodeURIComponent(ym));
        const data = await response.json();
        if (!data.success) {
            document.getElementById('activityCalendarGrid').innerHTML = '<p style="color:#dc3545;">' + _t('loadFailedRetry', null, 'Load failed, please try again') + '</p>';
            return;
        }
        renderActivityCalendar(ym, data.date_counts || {});
    } catch (e) {
        document.getElementById('activityCalendarGrid').innerHTML = '<p style="color:#dc3545;">' + _t('loadFailedRetry', null, 'Load failed, please try again') + '</p>';
    }
}

function shiftActivityMonth(delta) {
    const monthInput = document.getElementById('activityMonthInput');
    const base = monthInput.value ? new Date(monthInput.value + '-01T00:00:00') : new Date();
    base.setMonth(base.getMonth() + delta);
    monthInput.value = formatYM(base);
    loadActivityCalendar();
}

async function loadDayActivityLogs() {
    if (!selectedActivityDate) return;
    const opts = {
        q: document.getElementById('activityDaySearchInput').value || '',
        role: document.getElementById('activityDayRoleSelect').value || '',
        action: document.getElementById('activityDayActionInput').value || '',
        date: selectedActivityDate
    };
    try {
        const response = await fetch('api/get_activity_logs.php?' + buildQuery(1, opts, activityDayLimit));
        const data = await response.json();
        const tbody = document.getElementById('activityDayLogsBody');
        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#dc3545;">' + _t('loadFailedRetry', null, 'Load failed, please try again') + '</td></tr>';
            return;
        }
        if (!data.logs || data.logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">' + _t('dayNoMatchRecords', null, 'No matching records for this day') + '</td></tr>';
            return;
        }
        tbody.innerHTML = renderLogsRows(data.logs);
    } catch (e) {
        document.getElementById('activityDayLogsBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:#dc3545;">' + _t('loadFailedRetry', null, 'Load failed, please try again') + '</td></tr>';
    }
}

function openActivityDayModal(dateStr) {
    selectedActivityDate = dateStr;
    document.getElementById('activityDayTitle').textContent = _t('dayActivityLogsTitle', { date: dateStr }, `${dateStr} Activity Logs`);
    document.getElementById('activityDaySearchInput').value = '';
    document.getElementById('activityDayRoleSelect').value = '';
    document.getElementById('activityDayActionInput').value = '';
    document.getElementById('activityDayModal').style.display = 'block';
    loadDayActivityLogs();
}

function closeActivityDayModal() {
    document.getElementById('activityDayModal').style.display = 'none';
}

function scheduleDaySearch() {
    if (activityDaySearchTimer) clearTimeout(activityDaySearchTimer);
    activityDaySearchTimer = setTimeout(loadDayActivityLogs, 250);
}

document.addEventListener('DOMContentLoaded', function() {
    const langSelect = document.getElementById('langSelect');
    if (langSelect && typeof getLang === 'function') {
        langSelect.value = getLang();
        langSelect.addEventListener('change', function() {
            const newLang = this.value;
            if (typeof setLang === 'function') setLang(newLang);
            if (typeof applyPage === 'function') applyPage();
            this.value = typeof getLang === 'function' ? getLang() : newLang;
        });
    }
    if (typeof applyPage === 'function') applyPage();

    const hintEl = document.getElementById('activityRefreshHint');
    if (hintEl) hintEl.textContent = typeof t === 'function' ? t('activityAutoRefresh') : '(Auto-refresh every 10 seconds)';
    document.getElementById('activityMonthInput').value = new Date().toISOString().slice(0, 7);

    document.getElementById('activitySearchInput').addEventListener('input', scheduleSearch);
    document.getElementById('activityRoleSelect').addEventListener('change', () => loadTodayActivityLogs(1));
    document.getElementById('activityActionInput').addEventListener('input', scheduleSearch);
    document.getElementById('activityReloadCalendarBtn').addEventListener('click', loadActivityCalendar);
    document.getElementById('activityPrevMonthBtn').addEventListener('click', () => shiftActivityMonth(-1));
    document.getElementById('activityNextMonthBtn').addEventListener('click', () => shiftActivityMonth(1));
    document.getElementById('activityCurrentMonthBtn').addEventListener('click', function() {
        document.getElementById('activityMonthInput').value = formatYM(new Date());
        loadActivityCalendar();
    });
    document.getElementById('activityMonthInput').addEventListener('change', loadActivityCalendar);
    document.getElementById('closeActivityDayModal').addEventListener('click', closeActivityDayModal);
    document.querySelector('#activityDayModal .records-modal-mask').addEventListener('click', closeActivityDayModal);
    document.getElementById('activityDaySearchInput').addEventListener('input', scheduleDaySearch);
    document.getElementById('activityDayRoleSelect').addEventListener('change', loadDayActivityLogs);
    document.getElementById('activityDayActionInput').addEventListener('input', scheduleDaySearch);
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        await fetch('api/logout.php');
        window.location.href = 'index.html';
    });

    window.addEventListener('langChange', function() {
        if (hintEl) hintEl.textContent = typeof t === 'function' ? t('activityAutoRefresh') : '(Auto-refresh every 10 seconds)';
        loadTodayActivityLogs(activityPage);
        loadActivityCalendar();
        if (selectedActivityDate) {
            document.getElementById('activityDayTitle').textContent = _t('dayActivityLogsTitle', { date: selectedActivityDate }, `${selectedActivityDate} Activity Logs`);
            loadDayActivityLogs();
        }
    });

    checkAuth().then(ok => {
        if (!ok) return;
        loadTodayActivityLogs(1);
        loadActivityCalendar();
        if (activityRefreshTimer) clearInterval(activityRefreshTimer);
        activityRefreshTimer = setInterval(() => loadTodayActivityLogs(activityPage), 10000);
    });
});

