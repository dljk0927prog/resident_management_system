const BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');

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
    } catch (error) {
        window.location.href = 'index.html';
        return false;
    }
}

document.getElementById('logoutBtn').addEventListener('click', async function() {
    try {
        await fetch('api/logout.php');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('退出登录失败:', error);
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
                <button class="btn btn-primary" onclick="copyLink(document.querySelector('#qrModalOverlay input').value); this.textContent=(typeof t==='function'?t('copied'):'已复制');">${typeof t === 'function' ? t('copyLink') : '复制链接'}</button>
                <button class="btn btn-secondary" onclick="document.getElementById('qrModalOverlay').remove();">${typeof t === 'function' ? t('close') : '关闭'}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    const canvasEl = document.getElementById('modalQR');
    if (typeof QRCode !== 'undefined' && canvasEl) {
        QRCode.toCanvas(canvasEl, url, { width: 250, margin: 2 }, function(err) {
            if (err && canvasEl.parentElement) canvasEl.parentElement.innerHTML = '<p class="qr-fallback-hint">' + (typeof t === 'function' ? t('qrImageLoadFail') : '请复制下方链接使用') + '</p>';
        });
    } else if (canvasEl && canvasEl.parentElement) {
        canvasEl.parentElement.innerHTML = '<p class="qr-fallback-hint">' + (typeof t === 'function' ? t('qrImageLoadFail') : '请复制下方链接使用') + '</p>';
    }
}

function copyLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        alert(typeof t === 'function' ? t('linkCopied') : '链接已复制到剪贴板');
    }).catch(() => {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert(typeof t === 'function' ? t('linkCopied') : '链接已复制到剪贴板');
    });
}

async function deleteQR(id, name) {
    const msg = typeof t === 'function' ? t('deleteQRConfirm', { name: name }) : '确定要删除二维码「' + name + '」吗？删除后相关扫描记录也会被移除。';
    if (!confirm(msg)) return;
    try {
        const response = await fetch('api/delete_qr.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await response.json();
        if (data.success) {
            loadAllUsers();
        } else {
            alert(data.message || (typeof t === 'function' ? t('deleteFailed') : '删除失败'));
        }
    } catch (e) {
        alert(typeof t === 'function' ? t('networkError') : '网络错误，请稍后重试');
    }
}

async function loadAllUsers() {
    const kw = (document.getElementById('userSearchInput').value || '').trim();
    try {
        const url = kw ? ('api/get_qr_codes.php?q=' + encodeURIComponent(kw)) : 'api/get_qr_codes.php';
        const response = await fetch(url);
        const data = await response.json();
        const wrap = document.getElementById('allUsersList');
        const _t = typeof t === 'function' ? t : function(k) { return k; };

        if (!data.success) {
            wrap.innerHTML = '<p style="text-align:center;color:#dc3545;">' + _t('loadFailed') + '</p>';
            return;
        }
        window._qrListForEdit = data.qr_codes;
        if (!data.qr_codes || data.qr_codes.length === 0) {
            wrap.innerHTML = '<p style="text-align:center;color:#999;padding:30px;">' + _t('noUserFound') + '</p>';
            return;
        }

        wrap.innerHTML = data.qr_codes.map(qr => `
            <div class="qr-card">
                <h3>${escapeHtml(qr.name)}</h3>
                <div class="qr-card-info">
                    <p>${_t('buildingUnitLabel')}${escapeHtml(qr.building_unit || '')}</p>
                    <p>${_t('roomNumberLabel')}${escapeHtml(qr.room_number || '')}</p>
                    <p>${_t('phoneLabel')}${escapeHtml(qr.phone || '')}</p>
                    ${qr.resident_username ? `<p>${_t('residentUsernameLabel')}${escapeHtml(qr.resident_username)}</p>` : ''}
                    <p>${_t('qrCreatedDateLabel')}${escapeHtml(qr.qr_created_date || '')}</p>
                    <p>${_t('createdTimeLabel')}${new Date(qr.created_at).toLocaleString('zh-CN')}</p>
                    <p>${_t('scanCountLabel')}${qr.scan_count}</p>
                    <p>${_t('statusLabel')}${qr.is_active ? _t('active') : _t('inactive')}</p>
                </div>
                <div class="qr-card-actions">
                    <button type="button" class="btn btn-secondary btn-small" onclick="openEditResidentById(${qr.id})">${_t('editResident')}</button>
                    <button class="btn btn-primary btn-small" onclick="showQRCode('${qr.qr_token}', '${String(qr.name).replace(/'/g, "\\'")}')">${_t('viewQR')}</button>
                    <button class="btn btn-secondary btn-small" onclick="copyLink('${qr.qr_url}')">${_t('copyLink')}</button>
                    <button class="btn btn-danger btn-small" onclick="deleteQR(${qr.id}, '${String(qr.name).replace(/'/g, "\\'")}')">${_t('delete')}</button>
                </div>
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('allUsersList').innerHTML = '<p style="text-align:center;color:#dc3545;">' + (typeof t === 'function' ? t('loadFailed') : '加载失败') + '</p>';
    }
}

let searchDebounceTimer = null;
function scheduleAutoSearch() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(function() {
        loadAllUsers();
    }, 250);
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
    if (typeof initEditResidentModal === 'function') {
        initEditResidentModal(function() {
            loadAllUsers();
        });
    }
    window.addEventListener('langChange', function() {
        loadAllUsers();
    });

    const searchInput = document.getElementById('userSearchInput');
    searchInput.addEventListener('input', scheduleAutoSearch);
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
            loadAllUsers();
        }
    });

    checkAuth().then(function(ok) {
        if (ok) loadAllUsers();
    });
});
