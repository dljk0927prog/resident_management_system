let currentPage = 1;
const recordsPerPage = 20;
let recordsRefreshInterval = null; // 扫描记录自动刷新定时器

// 检查登录状态（仅管理员）
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

// 退出登录
document.getElementById('logoutBtn').addEventListener('click', async function() {
    try {
        await fetch('api/logout.php');
        window.location.href = 'index.html';
    } catch (error) {
        console.error('退出登录失败:', error);
    }
});

// 生成二维码
document.getElementById('createQRForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const name = document.getElementById('qrName').value.trim();
    const building_unit = document.getElementById('qrBuildingUnit').value.trim();
    const room_number = document.getElementById('qrRoomNumber').value.trim();
    const qr_created_date = document.getElementById('qrCreatedDate').value;
    const phone = document.getElementById('qrPhone').value.trim();
    const resident_username = document.getElementById('qrResidentUsername').value.trim();
    const password = document.getElementById('qrPassword').value;
    
    if (!name) {
        alert(typeof t === 'function' ? t('errEnterName') : '请输入名字/备注');
        return;
    }
    if (!building_unit) {
        alert(typeof t === 'function' ? t('errEnterBuilding') : '请输入单元楼');
        return;
    }
    if (!room_number) {
        alert(typeof t === 'function' ? t('errEnterRoom') : '请输入门牌号');
        return;
    }
    if (!qr_created_date) {
        alert(typeof t === 'function' ? t('errEnterQRDate') : '请选择二维码创建日期');
        return;
    }
    if (!phone) {
        alert(typeof t === 'function' ? t('errEnterPhone') : '请输入电话号码');
        return;
    }
    if (!password) {
        alert(typeof t === 'function' ? t('errEnterPassword') : '请输入密码');
        return;
    }
    
    try {
        const response = await fetch('api/create_qr.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                building_unit,
                room_number,
                qr_created_date,
                phone,
                resident_username: resident_username || undefined,
                password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const qrResult = document.getElementById('qrResult');
            const qr = data.qr_code;
            const _t = typeof t === 'function' ? t : function(k) { return k; };
            qrResult.innerHTML = `
                <h3>${_t('qrCreatedSuccess')}</h3>
                <div class="qr-code-display">
                    <div class="qr-code-image">
                        <canvas id="qrCanvas"></canvas>
                    </div>
                    <div class="qr-code-info">
                        <p><strong>${_t('nameRemark')}：</strong>${escapeHtml(qr.name)}</p>
                        <p><strong>${_t('buildingUnit')}：</strong>${escapeHtml(qr.building_unit)}</p>
                        <p><strong>${_t('roomNumber')}：</strong>${escapeHtml(qr.room_number)}</p>
                        <p><strong>${_t('qrCreatedDate')}：</strong>${escapeHtml(qr.qr_created_date)}</p>
                        <p><strong>${_t('phone')}：</strong>${escapeHtml(qr.phone)}</p>
                        ${qr.resident_username ? `<p><strong>${_t('residentUsernameLabel')}</strong>${escapeHtml(qr.resident_username)}</p>` : ''}
                        <p><strong>${_t('scanLink')}：</strong></p>
                        <input type="text" value="${escapeHtml(qr.qr_url)}" readonly onclick="this.select()">
                        <p style="margin-top: 10px; font-size: 12px; color: #999;">${_t('clickToCopy')}</p>
                    </div>
                </div>
            `;
            qrResult.classList.add('show');
            
            if (typeof QRCode !== 'undefined') {
                QRCode.toCanvas(document.getElementById('qrCanvas'), qr.qr_url, {
                    width: 200,
                    margin: 2
                }, function (error) {
                    if (error) console.error('二维码生成失败:', error);
                });
            } else {
                document.querySelector('.qr-code-image').innerHTML = '<p class="qr-fallback-hint">' + (typeof t === 'function' ? t('qrImageLoadFail') : '二维码图片加载失败，请复制下方链接使用。') + '</p>';
            }
            
            document.getElementById('qrName').value = '';
            document.getElementById('qrBuildingUnit').value = '';
            document.getElementById('qrRoomNumber').value = '';
            document.getElementById('qrCreatedDate').value = '';
            document.getElementById('qrPhone').value = '';
            document.getElementById('qrResidentUsername').value = '';
            document.getElementById('qrPassword').value = '';
            
            loadQRCodes();
        } else {
            alert((typeof t === 'function' ? t('createFailed') : '生成失败：') + data.message);
        }
    } catch (error) {
        alert(typeof t === 'function' ? t('networkError') : '网络错误，请稍后重试');
        console.error('生成二维码失败:', error);
    }
});

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 加载二维码列表
async function loadQRCodes() {
    try {
        const response = await fetch('api/get_qr_codes.php?limit=3');
        const data = await response.json();
        
        if (data.success) {
            window._qrListForEdit = data.qr_codes;
            const qrList = document.getElementById('qrList');
            
            if (data.qr_codes.length === 0) {
                qrList.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">' + (typeof t === 'function' ? t('noQRCodes') : '暂无二维码，请先生成') + '</p>';
                return;
            }
            
            const _t = typeof t === 'function' ? t : function(k) { return k; };
            qrList.innerHTML = data.qr_codes.map(qr => `
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
        }
    } catch (error) {
        console.error('加载二维码列表失败:', error);
    }
}

// 显示二维码弹窗
function showQRCode(token, name) {
    const url = BASE_URL + 'scan.php?token=' + token;
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;';
    modal.id = 'qrModalOverlay';
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
        QRCode.toCanvas(canvasEl, url, { width: 250, margin: 2 }, function (err) {
            if (err && canvasEl.parentElement) canvasEl.parentElement.innerHTML = '<p class="qr-fallback-hint">' + (typeof t === 'function' ? t('qrImageLoadFail') : '请复制下方链接使用') + '</p>';
        });
    } else if (canvasEl && canvasEl.parentElement) {
        canvasEl.parentElement.innerHTML = '<p class="qr-fallback-hint">' + (typeof t === 'function' ? t('qrImageLoadFail') : '请复制下方链接使用') + '</p>';
    }
}

// 删除二维码
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
            loadQRCodes();
        } else {
            alert(data.message || (typeof t === 'function' ? t('deleteFailed') : '删除失败'));
        }
    } catch (e) {
        alert(typeof t === 'function' ? t('networkError') : '网络错误，请稍后重试');
    }
}

function adminSettingsMessage(data) {
    const _t = typeof t === 'function' ? t : function(k) { return k; };
    if (!data) return _t('settingsSaveFailed');
    if (data.message_key) return _t(data.message_key);
    return data.message || _t('settingsSaveFailed');
}

function openAdminSettingsModal() {
    const modal = document.getElementById('adminSettingsModal');
    if (!modal) return;
    modal.style.display = 'block';
    modal.setAttribute('aria-hidden', 'false');
    const errEl = document.getElementById('adminSettingsError');
    if (errEl) {
        errEl.classList.remove('show');
        errEl.textContent = '';
    }
    loadAdminSettingsProfile();
}

function closeAdminSettingsModal() {
    const modal = document.getElementById('adminSettingsModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    const form = document.getElementById('adminSettingsForm');
    if (form) form.reset();
}

async function loadAdminSettingsProfile() {
    const errEl = document.getElementById('adminSettingsError');
    if (!errEl) return;
    try {
        const res = await fetch('api/admin_settings.php');
        const data = await res.json();
        if (!data.success) {
            errEl.textContent = adminSettingsMessage(data);
            errEl.classList.add('show');
            return;
        }
        document.getElementById('settingsUsername').value = data.profile.username || '';
        document.getElementById('settingsPhone').value = data.profile.phone || '';
        document.getElementById('settingsEmail').value = data.profile.email || '';
        document.getElementById('settingsCurrentPassword').value = '';
        document.getElementById('settingsNewPassword').value = '';
        document.getElementById('settingsNewPassword2').value = '';
    } catch (e) {
        errEl.textContent = typeof t === 'function' ? t('settingsLoadFailed') : 'Load failed';
        errEl.classList.add('show');
    }
}

function wireAdminSettingsModal() {
    const settingsBtn = document.getElementById('adminSettingsBtn');
    const settingsModal = document.getElementById('adminSettingsModal');
    const settingsMask = document.getElementById('adminSettingsMask');
    const settingsClose = document.getElementById('adminSettingsClose');
    const settingsForm = document.getElementById('adminSettingsForm');
    if (!settingsBtn || !settingsModal || !settingsForm) return;

    settingsBtn.addEventListener('click', openAdminSettingsModal);
    if (settingsMask) settingsMask.addEventListener('click', closeAdminSettingsModal);
    if (settingsClose) settingsClose.addEventListener('click', closeAdminSettingsModal);

    settingsForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const errEl = document.getElementById('adminSettingsError');
        if (errEl) {
            errEl.classList.remove('show');
            errEl.textContent = '';
        }
        const body = {
            username: document.getElementById('settingsUsername').value.trim(),
            phone: document.getElementById('settingsPhone').value.trim(),
            email: document.getElementById('settingsEmail').value.trim(),
            current_password: document.getElementById('settingsCurrentPassword').value,
            new_password: document.getElementById('settingsNewPassword').value,
            new_password_confirm: document.getElementById('settingsNewPassword2').value
        };
        try {
            const res = await fetch('api/admin_settings.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                const label = typeof t === 'function' ? t('adminLabel') : 'Admin: ';
                document.getElementById('adminUsername').textContent = label + data.profile.username;
                alert(adminSettingsMessage(data));
                closeAdminSettingsModal();
            } else if (errEl) {
                errEl.textContent = adminSettingsMessage(data);
                errEl.classList.add('show');
            }
        } catch (err) {
            if (errEl) {
                errEl.textContent = typeof t === 'function' ? t('networkError') : 'Network error';
                errEl.classList.add('show');
            }
        }
    });
}

// 复制链接
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

// 加载扫描记录
async function loadRecords(page = 1) {
    try {
        const response = await fetch(`api/get_records.php?page=${page}&limit=${recordsPerPage}&today=1`);
        const data = await response.json();
        
        if (data.success) {
            const recordsBody = document.getElementById('recordsBody');
            
            const hintEl = document.getElementById('recordsRefreshHint');
            if (hintEl) hintEl.textContent = typeof t === 'function' ? t('recordsAutoRefresh') : '（每 15 秒自动更新）';
            
            if (data.records.length === 0) {
                recordsBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #999;">' + (typeof t === 'function' ? t('noRecords') : '暂无扫描记录') + '</td></tr>';
                return;
            }
            
            recordsBody.innerHTML = data.records.map(record => `
                <tr>
                    <td>${record.id}</td>
                    <td>${escapeHtml(record.qr_name)}</td>
                    <td>${escapeHtml(record.building_unit || '')}</td>
                    <td>${escapeHtml(record.room_number || '')}</td>
                    <td>${escapeHtml(record.qr_created_date || '')}</td>
                    <td>${escapeHtml(record.phone || '')}</td>
                    <td>${record.visitor_ip || '未知'}</td>
                    <td>${new Date(record.scanned_at).toLocaleString('zh-CN')}</td>
                </tr>
            `).join('');
            
            // 更新分页
            updatePagination(data.pagination);
        }
    } catch (error) {
        console.error('加载扫描记录失败:', error);
        document.getElementById('recordsBody').innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #dc3545;">' + (typeof t === 'function' ? t('loadFailed') : '加载失败，请刷新重试') + '</td></tr>';
    }
}

// 更新分页
function updatePagination(pagination) {
    const paginationDiv = document.getElementById('pagination');
    currentPage = pagination.page;
    
    if (pagination.total_pages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }
    
    let html = '';
    
    const _t = typeof t === 'function' ? t : function(k, p) { return k; };
    html += `<button ${currentPage <= 1 ? 'disabled' : ''} onclick="loadRecords(${currentPage - 1})">${_t('prevPage')}</button>`;
    html += `<span>${_t('pageInfo', { current: currentPage, total: pagination.total_pages, count: pagination.total })}</span>`;
    html += `<button ${currentPage >= pagination.total_pages ? 'disabled' : ''} onclick="loadRecords(${currentPage + 1})">${_t('nextPage')}</button>`;
    
    paginationDiv.innerHTML = html;
}

// 初始化（与登录页一致：在 DOMContentLoaded 中先同步语言并执行 applyPage，再执行异步逻辑）
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
    wireAdminSettingsModal();
    if (typeof initEditResidentModal === 'function') {
        initEditResidentModal(function() {
            loadQRCodes();
        });
    }
    window.addEventListener('langChange', function() {
        if (typeof loadQRCodes === 'function') loadQRCodes();
        if (typeof loadRecords === 'function') loadRecords(currentPage);
    });

    (async function() {
        var dateInput = document.getElementById('qrCreatedDate');
        if (dateInput) {
            dateInput.value = new Date().toISOString().slice(0, 10);
        }
        if (await checkAuth()) {
            loadQRCodes();
            loadRecords();
            if (recordsRefreshInterval) clearInterval(recordsRefreshInterval);
            recordsRefreshInterval = setInterval(function() {
                loadRecords(currentPage);
            }, 15000);
        }
    })();
});

// 定义BASE_URL（从config.php获取，这里使用相对路径）
const BASE_URL = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');

