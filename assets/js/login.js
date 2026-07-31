document.addEventListener('DOMContentLoaded', function() {
    var langSelect = document.getElementById('langSelect');
    if (langSelect) {
        langSelect.value = typeof getLang === 'function' ? getLang() : 'en';
        langSelect.addEventListener('change', function() {
            var newLang = this.value;
            if (typeof setLang === 'function') setLang(newLang);
            if (typeof applyPage === 'function') applyPage();
            this.value = typeof getLang === 'function' ? getLang() : newLang;
        });
    }
    if (typeof applyPage === 'function') applyPage();

    var tabAdmin = document.querySelector('.login-tab[data-tab="admin"]');
    var tabResident = document.querySelector('.login-tab[data-tab="resident"]');
    var formAdmin = document.getElementById('loginFormAdmin');
    var formResident = document.getElementById('loginFormResident');
    var errAdmin = document.getElementById('loginErrorAdmin');
    var errResident = document.getElementById('loginErrorResident');

    function showTab(tab) {
        tabAdmin.classList.toggle('active', tab === 'admin');
        tabResident.classList.toggle('active', tab === 'resident');
        formAdmin.style.display = tab === 'admin' ? 'block' : 'none';
        formResident.style.display = tab === 'resident' ? 'block' : 'none';
        errAdmin.classList.remove('show');
        errResident.classList.remove('show');
    }

    tabAdmin.addEventListener('click', function() { showTab('admin'); });
    tabResident.addEventListener('click', function() { showTab('resident'); });

    formAdmin.addEventListener('submit', async function(e) {
        e.preventDefault();
        errAdmin.classList.remove('show');
        var username = document.getElementById('username').value.trim();
        var password = document.getElementById('password').value;
        if (!username || !password) {
            errAdmin.textContent = typeof t === 'function' ? t('errEnterUserPwd') : '请输入用户名和密码';
            errAdmin.classList.add('show');
            return;
        }
        try {
            var response = await fetch('api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'admin', username: username, password: password })
            });
            var data = await response.json();
            if (data.success) {
                window.location.href = 'admin.html';
            } else {
                errAdmin.textContent = data.message || (typeof t === 'function' ? t('loginFailed') : '登录失败');
                errAdmin.classList.add('show');
            }
        } catch (error) {
            errAdmin.textContent = typeof t === 'function' ? t('networkError') : '网络错误，请稍后重试';
            errAdmin.classList.add('show');
        }
    });

    formResident.addEventListener('submit', async function(e) {
        e.preventDefault();
        errResident.classList.remove('show');
        var account = document.getElementById('residentAccount').value.trim();
        var password = document.getElementById('residentPassword').value;
        if (!account || !password) {
            errResident.textContent = typeof t === 'function' ? t('errEnterAccountPwd') : '请输入账号和密码';
            errResident.classList.add('show');
            return;
        }
        try {
            var response = await fetch('api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: 'resident', account: account, password: password })
            });
            var data = await response.json();
            if (data.success) {
                window.location.href = 'resident.html';
            } else {
                errResident.textContent = data.message || (typeof t === 'function' ? t('loginFailed') : '登录失败');
                errResident.classList.add('show');
            }
        } catch (error) {
            errResident.textContent = typeof t === 'function' ? t('networkError') : '网络错误，请稍后重试';
            errResident.classList.add('show');
        }
    });

    var forgotModal = document.getElementById('forgotPasswordModal');
    var forgotMask = document.getElementById('forgotPasswordMask');
    var forgotClose = document.getElementById('forgotPasswordClose');
    var forgotLink = document.getElementById('forgotPasswordLink');
    var forgotStep1 = document.getElementById('forgotStep1');
    var forgotStep2 = document.getElementById('forgotStep2');
    var forgotErr1 = document.getElementById('forgotError');
    var forgotErr2 = document.getElementById('forgotError2');

    function forgotMsg(data) {
        if (!data) return '';
        if (data.message_key) {
            if (data.message_key === 'forgotRateLimit' && data.retry_after != null) {
                return typeof t === 'function' ? t('forgotRateLimit', { seconds: data.retry_after }) : '';
            }
            return typeof t === 'function' ? t(data.message_key) : data.message_key;
        }
        return data.message || '';
    }

    function showForgotErr(el, text) {
        if (!el) return;
        el.textContent = text || '';
        if (text) el.classList.add('show'); else el.classList.remove('show');
    }

    function setForgotStep(step, email) {
        if (!forgotStep1 || !forgotStep2) return;
        forgotStep1.style.display = step === 1 ? 'block' : 'none';
        forgotStep2.style.display = step === 2 ? 'block' : 'none';
        if (step === 2 && email) {
            var line = document.getElementById('forgotStep2EmailLine');
            var hid = document.getElementById('forgotEmailHidden');
            if (hid) hid.value = email;
            if (line) line.textContent = email;
        }
    }

    async function refreshForgotStatus() {
        try {
            var res = await fetch('api/forgot_password_status.php', { credentials: 'same-origin' });
            var d = await res.json();
            if (d.success && d.step === 2 && d.email) {
                setForgotStep(2, d.email);
            } else {
                setForgotStep(1);
            }
        } catch (e) {
            setForgotStep(1);
        }
    }

    function openForgotModal() {
        if (!forgotModal) return;
        showForgotErr(forgotErr1, '');
        showForgotErr(forgotErr2, '');
        forgotModal.style.display = 'block';
        forgotModal.setAttribute('aria-hidden', 'false');
        document.getElementById('forgotEmail').value = '';
        document.getElementById('forgotCode').value = '';
        document.getElementById('forgotNewPassword').value = '';
        document.getElementById('forgotConfirmPassword').value = '';
        refreshForgotStatus().then(function() {
            if (typeof applyPage === 'function') applyPage();
        });
    }

    function closeForgotModal() {
        if (!forgotModal) return;
        forgotModal.style.display = 'none';
        forgotModal.setAttribute('aria-hidden', 'true');
    }

    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            openForgotModal();
        });
    }
    if (forgotMask) forgotMask.addEventListener('click', closeForgotModal);
    if (forgotClose) forgotClose.addEventListener('click', closeForgotModal);

    var forgotSendBtn = document.getElementById('forgotSendCode');
    if (forgotSendBtn) {
        forgotSendBtn.addEventListener('click', async function() {
            showForgotErr(forgotErr1, '');
            var email = (document.getElementById('forgotEmail') && document.getElementById('forgotEmail').value || '').trim();
            try {
                var response = await fetch('api/forgot_password_send.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                var data = await response.json();
                if (data.success) {
                    var msg = typeof t === 'function' ? t('forgotCodeSent') : '';
                    if (data.dev_code) {
                        msg = (typeof t === 'function' ? t('forgotDevCode', { code: data.dev_code }) : data.dev_code) + '\n\n' + msg;
                    }
                    alert(msg);
                    refreshForgotStatus().then(function() {
                        if (typeof applyPage === 'function') applyPage();
                    });
                } else {
                    showForgotErr(forgotErr1, forgotMsg(data));
                }
            } catch (err) {
                showForgotErr(forgotErr1, typeof t === 'function' ? t('networkError') : 'Network error');
            }
        });
    }

    var forgotVerifyBtn = document.getElementById('forgotVerifyBtn');
    if (forgotVerifyBtn) {
        forgotVerifyBtn.addEventListener('click', async function() {
            showForgotErr(forgotErr2, '');
            var email = (document.getElementById('forgotEmailHidden') && document.getElementById('forgotEmailHidden').value || '').trim();
            var code = (document.getElementById('forgotCode') && document.getElementById('forgotCode').value || '').replace(/\D/g, '');
            var np = document.getElementById('forgotNewPassword') ? document.getElementById('forgotNewPassword').value : '';
            var cp = document.getElementById('forgotConfirmPassword') ? document.getElementById('forgotConfirmPassword').value : '';
            try {
                var response = await fetch('api/forgot_password_reset.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        code: code,
                        new_password: np,
                        confirm_password: cp
                    })
                });
                var data = await response.json();
                if (data.success) {
                    alert(typeof t === 'function' ? t('forgotPasswordUpdated') : 'OK');
                    closeForgotModal();
                    fetch('api/forgot_password_cancel.php', { method: 'POST', credentials: 'same-origin' });
                    setForgotStep(1);
                } else {
                    showForgotErr(forgotErr2, forgotMsg(data));
                }
            } catch (err) {
                showForgotErr(forgotErr2, typeof t === 'function' ? t('networkError') : 'Network error');
            }
        });
    }

    var forgotStartOver = document.getElementById('forgotStartOver');
    if (forgotStartOver) {
        forgotStartOver.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('api/forgot_password_cancel.php', { method: 'POST', credentials: 'same-origin' }).then(function() {
                setForgotStep(1);
                showForgotErr(forgotErr2, '');
                document.getElementById('forgotCode').value = '';
                document.getElementById('forgotNewPassword').value = '';
                document.getElementById('forgotConfirmPassword').value = '';
            });
        });
    }
});
