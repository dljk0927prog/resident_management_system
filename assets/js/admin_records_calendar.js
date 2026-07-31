let selectedDate = '';
let daySearchTimer = null;

function _t(key, params, fallback) {
    if (typeof t === 'function') return t(key, params);
    return fallback || key;
}

function localeByLang() {
    const lang = typeof getLang === 'function' ? getLang() : 'en';
    if (lang === 'en') return 'en-US';
    if (lang === 'ms') return 'ms-MY';
    return 'zh-CN';
}

function formatYM(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function shiftMonth(delta) {
    const monthInput = document.getElementById('monthInput');
    const base = monthInput.value ? new Date(monthInput.value + '-01T00:00:00') : new Date();
    base.setMonth(base.getMonth() + delta);
    monthInput.value = formatYM(base);
    loadCalendar();
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

function getMonthRange(ym) {
    const [y, m] = ym.split('-').map(n => parseInt(n, 10));
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    return { first, last };
}

function renderCalendar(ym, dateCounts) {
    const grid = document.getElementById('recordsCalendarGrid');
    const { first, last } = getMonthRange(ym);
    const startWeekday = first.getDay(); // 0-6
    const daysInMonth = last.getDate();

    let html = '';
    const weekLabels = [
        _t('weekSun', null, 'Sun'),
        _t('weekMon', null, 'Mon'),
        _t('weekTue', null, 'Tue'),
        _t('weekWed', null, 'Wed'),
        _t('weekThu', null, 'Thu'),
        _t('weekFri', null, 'Fri'),
        _t('weekSat', null, 'Sat')
    ];
    for (const w of weekLabels) {
        html += `<div class="records-calendar-day empty"><div class="records-calendar-date">${w}</div></div>`;
    }

    for (let i = 0; i < startWeekday; i++) {
        html += '<div class="records-calendar-day empty"></div>';
    }

    for (let d = 1; d <= daysInMonth; d++) {
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
            const date = this.getAttribute('data-date');
            openDayModal(date);
        });
    });
}

async function loadCalendar() {
    const monthInput = document.getElementById('monthInput');
    const ym = monthInput.value || new Date().toISOString().slice(0, 7);
    try {
        const response = await fetch('api/get_records_calendar.php?month=' + encodeURIComponent(ym));
        const data = await response.json();
        if (!data.success) {
            document.getElementById('recordsCalendarGrid').innerHTML = '<p style="color:#dc3545;">' + _t('loadFailedRetry', null, 'Load failed, please try again') + '</p>';
            return;
        }
        renderCalendar(ym, data.date_counts || {});
    } catch (e) {
        document.getElementById('recordsCalendarGrid').innerHTML = '<p style="color:#dc3545;">' + _t('loadFailedRetry', null, 'Load failed, please try again') + '</p>';
    }
}

async function loadDayRecords() {
    if (!selectedDate) return;
    const kw = (document.getElementById('dayRecordSearchInput').value || '').trim();
    const url = `api/get_records.php?date=${encodeURIComponent(selectedDate)}&limit=200&page=1` + (kw ? `&q=${encodeURIComponent(kw)}` : '');
    try {
        const response = await fetch(url);
        const data = await response.json();
        const tbody = document.getElementById('dayRecordTableBody');
        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="7" style="color:#dc3545;">' + _t('loadFailedRetry', null, 'Load failed, please try again') + '</td></tr>';
            return;
        }
        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="color:#999;">' + _t('dayNoMatchRecords', null, 'No matching records for this day') + '</td></tr>';
            return;
        }
        tbody.innerHTML = data.records.map(r => `
            <tr>
                <td>${r.id}</td>
                <td>${escapeHtml(r.qr_name || '')}</td>
                <td>${escapeHtml(r.building_unit || '')}</td>
                <td>${escapeHtml(r.room_number || '')}</td>
                <td>${escapeHtml(r.phone || '')}</td>
                <td>${escapeHtml(r.visitor_ip || '')}</td>
                <td>${new Date(r.scanned_at).toLocaleString(localeByLang())}</td>
            </tr>
        `).join('');
    } catch (e) {
        document.getElementById('dayRecordTableBody').innerHTML = '<tr><td colspan="7" style="color:#dc3545;">' + _t('loadFailedRetry', null, 'Load failed, please try again') + '</td></tr>';
    }
}

function openDayModal(date) {
    selectedDate = date;
    document.getElementById('dayRecordsTitle').textContent = _t('dayScanRecordsTitle', { date: date }, `${date} Scan Records`);
    document.getElementById('dayRecordSearchInput').value = '';
    document.getElementById('dayRecordsModal').style.display = 'block';
    loadDayRecords();
}

function closeDayModal() {
    document.getElementById('dayRecordsModal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() {
    const monthInput = document.getElementById('monthInput');
    monthInput.value = new Date().toISOString().slice(0, 7);

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
    window.addEventListener('langChange', function() {
        if (selectedDate) {
            document.getElementById('dayRecordsTitle').textContent = _t('dayScanRecordsTitle', { date: selectedDate }, `${selectedDate} Scan Records`);
            loadDayRecords();
        }
        loadCalendar();
    });

    document.getElementById('reloadCalendarBtn').addEventListener('click', loadCalendar);
    document.getElementById('prevMonthBtn').addEventListener('click', function() {
        shiftMonth(-1);
    });
    document.getElementById('nextMonthBtn').addEventListener('click', function() {
        shiftMonth(1);
    });
    document.getElementById('currentMonthBtn').addEventListener('click', function() {
        monthInput.value = formatYM(new Date());
        loadCalendar();
    });
    monthInput.addEventListener('change', loadCalendar);

    document.getElementById('closeDayRecordsModal').addEventListener('click', closeDayModal);
    document.querySelector('#dayRecordsModal .records-modal-mask').addEventListener('click', closeDayModal);
    document.getElementById('dayRecordSearchInput').addEventListener('input', function() {
        if (daySearchTimer) clearTimeout(daySearchTimer);
        daySearchTimer = setTimeout(loadDayRecords, 250);
    });

    document.getElementById('logoutBtn').addEventListener('click', async function() {
        await fetch('api/logout.php');
        window.location.href = 'index.html';
    });

    checkAuth().then(ok => {
        if (ok) loadCalendar();
    });
});

