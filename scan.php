<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>住户扫描</title>
    <link rel="stylesheet" href="assets/css/style.css?v=20260616">
    <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>
</head>
<body data-i18n-title="titleScan">
    <div class="scan-container">
        <div class="scan-box scan-box-wide" style="position:relative;">
            <div class="lang-switcher" id="langSwitcher">
                <select id="langSelect" title="Language">
                    <option value="zh">中文</option>
                    <option value="en">English</option>
                    <option value="ms">Bahasa Melayu</option>
                </select>
            </div>
            <h1 data-i18n="titleScan">住户扫描</h1>

            <!-- 有 token：显示扫描中/成功/失败 -->
            <div id="scanStatus" class="scan-status" style="display: none;">
                <div class="loading-spinner"></div>
                <p data-i18n="recordingScan">正在记录扫描...</p>
            </div>
            <div id="scanResult" class="scan-result" style="display: none;">
                <div class="success-icon">✓</div>
                <h2 data-i18n="scanSuccess">扫描成功！</h2>
                <p id="qrNameDisplay"></p>
            </div>
            <div id="scanError" class="scan-error" style="display: none;">
                <div class="error-icon">✗</div>
                <h2 data-i18n="scanFailed">扫描失败</h2>
                <p id="errorMessage"></p>
            </div>

            <!-- 无 token：显示相机扫码界面 -->
            <div id="scannerArea" class="scanner-area" style="display: none;">
                <p class="scanner-hint" data-i18n="scannerHint">请将住户二维码对准下方框内</p>
                <div class="scanner-view-wrap">
                    <video id="scannerVideo" class="scanner-video" playsinline muted></video>
                    <canvas id="scannerCanvas" class="scanner-canvas"></canvas>
                    <div class="scanner-frame"></div>
                </div>
                <p id="scannerError" class="scanner-error"></p>
                <p class="scanner-tip" data-i18n="scannerTip">若无法使用相机，请直接点击管理员提供的扫描链接</p>
                <div class="scan-record-list-wrap">
                    <h3 class="scan-record-title" data-i18n="thisScanRecords">本次扫描记录</h3>
                    <p class="scan-record-hint" data-i18n="scanRecordHint">扫描成功的二维码将显示在下方，相机保持开启可继续扫描。</p>
                    <ul id="scanRecordList" class="scan-record-list"></ul>
                </div>
            </div>
        </div>
    </div>
    <script src="assets/js/i18n.js?v=20260731"></script>
    <script src="assets/js/scan.js"></script>
    <footer class="site-footer">
        <div class="site-footer-title">Resident Management System</div>
        <div class="site-footer-copy">Copyright &copy; 2026 Desmond Liew. All Rights Reserved.</div>
    </footer>
</body>
</html>
