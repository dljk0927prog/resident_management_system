const BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');

let residentTodayRefreshInterval = null;

function getLocale() {
    var lang = typeof getLang === 'function' ? getLang() : 'en';
    if (lang === 'en') return 'en-US';
    if (lang === 'ms') return 'ms-MY';
    return 'zh-CN';
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
        if (!data.authenticated || data.role !== 'resident') {
            window.location.href = 'index.html';
            return false;
        }
        document.getElementById('residentInfo').textContent = data.resident.name
            ? data.resident.name + '（' + data.resident.phone + '）'
            : data.resident.phone;
        return true;
    } catch (e) {
        window.location.href = 'index.html';
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    var langSelect = document.getElementById('langSelect');
    if (langSelect && typeof getLang === 'function') {
        langSelect.value = getLang();
        langSelect.addEventListener('change', function() {
            var newLang = this.value;
            if (typeof setLang === 'function') setLang(newLang);
            if (typeof applyPage === 'function') applyPage();
            this.value = typeof getLang === 'function' ? getLang() : newLang;
        });
    }
    if (typeof applyPage === 'function') applyPage();
    window.addEventListener('langChange', function() {
        if (typeof loadData === 'function') loadData();
        if (typeof loadTodayRecords === 'function') loadTodayRecords();
    });
});

document.getElementById('logoutBtn').addEventListener('click', async function() {
    try {
        await fetch('api/logout.php');
        window.location.href = 'index.html';
    } catch (e) {
        console.error(e);
    }
});

function showQRCode(token, name) {
    const url = BASE_URL + 'scan.php?token=' + token;
    const modal = document.createElement('div');
    modal.id = 'qrModalOverlay';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
            <h3 style="margin-bottom: 20px;">${escapeHtml(name)}</h3>
            <div style="text-align: center; margin-bottom: 20px;">
                <canvas id="modalQR"></canvas>
            </div>
            <input type="text" value="${escapeHtml(url)}" readonly onclick="this.select()" style="width: 100%; padding: 8px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 4px;">
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-primary" onclick="navigator.clipboard.writeText(document.querySelector('#qrModalOverlay input').value).then(function(){ alert(typeof t==='function'?t('copied'):'已复制'); }); this.textContent=(typeof t==='function'?t('copied'):'已复制');">${typeof t === 'function' ? t('copyLink') : '复制链接'}</button>
                <button class="btn btn-secondary" onclick="document.getElementById('qrModalOverlay').remove();">${typeof t === 'function' ? t('close') : '关闭'}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const canvasEl = document.getElementById('modalQR');
    if (typeof QRCode !== 'undefined' && canvasEl) {
        QRCode.toCanvas(canvasEl, url, { width: 250, margin: 2 }, function (err) {
            if (err && canvasEl.parentElement) canvasEl.parentElement.innerHTML = '<p class="qr-fallback-hint">' + (typeof t === 'function' ? t('qrImageLoadFail') : '请复制下方链接使用') + '</p>';
        });
    } else if (canvasEl && canvasEl.parentElement) {
        canvasEl.parentElement.innerHTML = '<p class="qr-fallback-hint">' + (typeof t === 'function' ? t('qrImageLoadFail') : '请复制下方链接使用') + '</p>';
    }
}

async function loadData() {
    try {
        const response = await fetch('api/get_my_qr_codes.php');
        const data = await response.json();
        if (!data.success) {
            document.getElementById('qrList').innerHTML = '<p style="text-align:center;color:#999;">' + (typeof t === 'function' ? t('loadFailedResident') : '加载失败') + '</p>';
            return;
        }

        var resident = data.resident;
        var profileEl = document.getElementById('residentProfile');
        var _t = typeof t === 'function' ? t : function(k) { return k; };
        if (data.qr_codes.length > 0) {
            var first = data.qr_codes[0];
            profileEl.innerHTML = ''
                + '<p><strong>' + _t('nameLabel') + '</strong>' + escapeHtml(first.name) + '</p>'
                + '<p><strong>' + _t('phoneLabel') + '</strong>' + escapeHtml(resident.phone) + '</p>'
                + (first.resident_username ? '<p><strong>' + _t('residentUsernameLabel') + '</strong>' + escapeHtml(first.resident_username) + '</p>' : '')
                + '<p><strong>' + _t('buildingUnitLabel') + '</strong>' + escapeHtml(first.building_unit || '') + '</p>'
                + '<p><strong>' + _t('roomNumberLabel') + '</strong>' + escapeHtml(first.room_number || '') + '</p>'
                + '<p><strong>' + _t('qrCreatedDateLabel') + '</strong>' + escapeHtml(first.qr_created_date || '') + '</p>';
        } else {
            profileEl.innerHTML = '<p class="text-muted">' + _t('noProfile') + '</p>';
        }

        var qrList = document.getElementById('qrList');
        if (data.qr_codes.length === 0) {
            qrList.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">' + _t('noQR') + '</p>';
            return;
        }

        qrList.innerHTML = data.qr_codes.map(function(qr) {
            return '<div class="qr-card">'
                + '<h3>' + escapeHtml(qr.name) + '</h3>'
                + '<div class="qr-card-info">'
                + '<p>' + _t('buildingUnitLabel') + escapeHtml(qr.building_unit || '') + '</p>'
                + '<p>' + _t('roomNumberLabel') + escapeHtml(qr.room_number || '') + '</p>'
                + '<p>' + _t('qrCreatedDateLabel') + escapeHtml(qr.qr_created_date || '') + '</p>'
                + (qr.resident_username ? '<p>' + _t('residentUsernameLabel') + escapeHtml(qr.resident_username) + '</p>' : '')
                + '<p>' + _t('scanCountLabel') + qr.scan_count + '</p>'
                + '</div>'
                + '<div class="qr-card-actions">'
                + '<button class="btn btn-primary btn-small" onclick="showQRCode(\'' + qr.qr_token + '\', \'' + String(qr.name).replace(/'/g, "\\'") + '\')">' + _t('viewQR') + '</button>'
                + '</div></div>';
        }).join('');
    } catch (e) {
        console.error(e);
        document.getElementById('qrList').innerHTML = '<p style="text-align:center;color:#dc3545;">' + (typeof t === 'function' ? t('loadFailedResident') : '加载失败，请刷新重试') + '</p>';
    }
}

async function loadTodayRecords() {
    var tbody = document.getElementById('residentTodayRecordsBody');
    if (!tbody) return;
    try {
        var response = await fetch('api/get_resident_records.php?page=1&limit=100&today=1');
        var data = await response.json();
        var hintEl = document.getElementById('residentTodayRefreshHint');
        if (hintEl) hintEl.textContent = typeof t === 'function' ? t('residentScanRecordsAutoRefresh') : '';
        if (!data.success) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc3545;">' + (typeof t === 'function' ? t('loadFailedResident') : '加载失败') + '</td></tr>';
            return;
        }
        if (!data.records || data.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;">' + (typeof t === 'function' ? t('noRecords') : '暂无扫描记录') + '</td></tr>';
            return;
        }
        var unk = typeof t === 'function' ? t('unknownVisitorIP') : '未知';
        tbody.innerHTML = data.records.map(function(r) {
            return '<tr>'
                + '<td>' + r.id + '</td>'
                + '<td>' + escapeHtml(r.qr_name || '') + '</td>'
                + '<td>' + escapeHtml(r.building_unit || '') + '</td>'
                + '<td>' + escapeHtml(r.room_number || '') + '</td>'
                + '<td>' + escapeHtml(r.visitor_ip || unk) + '</td>'
                + '<td>' + new Date(r.scanned_at).toLocaleString(getLocale()) + '</td>'
                + '</tr>';
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#dc3545;">' + (typeof t === 'function' ? t('loadFailedResident') : '加载失败') + '</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof checkAuth === 'function' && typeof loadData === 'function') {
        checkAuth().then(function(ok) {
            if (!ok) return;
            loadData();
            if (typeof loadTodayRecords === 'function') loadTodayRecords();
            if (residentTodayRefreshInterval) clearInterval(residentTodayRefreshInterval);
            residentTodayRefreshInterval = setInterval(function() {
                if (typeof loadTodayRecords === 'function') loadTodayRecords();
            }, 15000);
        });
    }
});
