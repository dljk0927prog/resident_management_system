(function() {
    var urlParams = new URLSearchParams(window.location.search);
    var token = urlParams.get('token');

    function t(key, params) {
        return typeof window.t === 'function' ? window.t(key, params) : key;
    }
    function applyLang() {
        var sel = document.getElementById('langSelect');
        if (sel && typeof getLang === 'function') {
            sel.value = getLang();
            sel.addEventListener('change', function() {
                var newLang = this.value;
                if (typeof setLang === 'function') setLang(newLang);
                if (typeof applyPage === 'function') applyPage();
                this.value = typeof getLang === 'function' ? getLang() : newLang;
            });
        }
        if (typeof applyPage === 'function') applyPage();
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyLang);
    } else {
        applyLang();
    }

    function show(el) { if (el) el.style.display = 'block'; }
    function hide(el) { if (el) el.style.display = 'none'; }

    function extractTokenFromUrl(url) {
        if (!url || typeof url !== 'string') return null;
        try {
            if (url.indexOf('scan.php') !== -1 && url.indexOf('token=') !== -1) {
                var match = url.match(/token=([^&\s#]+)/);
                return match ? match[1].trim() : null;
            }
            return null;
        } catch (e) { return null; }
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    if (token) {
        hide(document.getElementById('scannerArea'));
        show(document.getElementById('scanStatus'));
        fetch('api/scan.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            hide(document.getElementById('scanStatus'));
            if (data.success) {
                document.getElementById('qrNameDisplay').textContent = t('qrLabel') + (data.qr_name || '');
                show(document.getElementById('scanResult'));
            } else {
                document.getElementById('errorMessage').textContent = data.message || t('scanFailed');
                show(document.getElementById('scanError'));
            }
        })
        .catch(function() {
            hide(document.getElementById('scanStatus'));
            document.getElementById('errorMessage').textContent = t('networkError');
            show(document.getElementById('scanError'));
        });
        return;
    }

    // 无 token：显示相机 + 下方扫描记录列表，扫描成功后不关相机、不跳转
    show(document.getElementById('scannerArea'));
    var video = document.getElementById('scannerVideo');
    var canvas = document.getElementById('scannerCanvas');
    var ctx = canvas.getContext('2d');
    var scannerError = document.getElementById('scannerError');
    var stream = null;
    var lastScannedToken = '';
    var lastScannedTime = 0;
    var scanCooldownMs = 2500;

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(function(t) { t.stop(); });
            stream = null;
        }
    }

    function appendScanRecord(data) {
        var list = document.getElementById('scanRecordList');
        if (!list) return;
        var name = data.qr_name || '';
        var building = data.building_unit || '';
        var room = data.room_number || '';
        var date = data.qr_created_date || '';
        var time = data.scanned_at || new Date().toLocaleString('zh-CN');
        var li = document.createElement('li');
        li.innerHTML =
            '<div class="scan-record-name">' + escapeHtml(name) + '</div>' +
            '<div class="scan-record-meta">' +
            (building ? t('buildingUnitLabel') + escapeHtml(building) + '<br>' : '') +
            (room ? t('roomNumberLabel') + escapeHtml(room) + '<br>' : '') +
            (date ? t('qrCreatedDateLabel') + escapeHtml(date) + '<br>' : '') +
            '</div>' +
            '<div class="scan-record-time">' + t('scanTimeLabel') + escapeHtml(time) + '</div>';
        list.insertBefore(li, list.firstChild);
    }

    function onQrDetected(decodedToken) {
        var now = Date.now();
        if (decodedToken === lastScannedToken && (now - lastScannedTime) < scanCooldownMs) return;
        lastScannedToken = decodedToken;
        lastScannedTime = now;

        fetch('api/scan.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: decodedToken })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.success) {
                appendScanRecord(data);
            }
        })
        .catch(function() {});
    }

    function tick() {
        if (!stream || !video.videoWidth) {
            requestAnimationFrame(tick);
            return;
        }
        var w = video.videoWidth;
        var h = video.videoHeight;
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        ctx.drawImage(video, 0, 0);
        var imageData = ctx.getImageData(0, 0, w, h);
        if (typeof jsQR !== 'undefined') {
            var code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
            if (code && code.data) {
                var t = extractTokenFromUrl(code.data);
                if (t) {
                    onQrDetected(t);
                }
            }
        }
        requestAnimationFrame(tick);
    }

    scannerError.textContent = '';
    var constraints = { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } };
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        scannerError.textContent = t('scannerNoCamera');
        scannerError.style.display = 'block';
        return;
    }
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(s) {
            stream = s;
            video.srcObject = s;
            video.setAttribute('playsinline', true);
            video.play();
            tick();
        })
        .catch(function(err) {
            scannerError.textContent = t('scannerCameraError') + (err.message === 'Permission denied' ? t('permissionDenied') : err.message || t('unknownError'));
            scannerError.style.display = 'block';
        });

    window.addEventListener('beforeunload', stopCamera);
})();
