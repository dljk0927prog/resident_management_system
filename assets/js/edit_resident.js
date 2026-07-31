(function(global) {
    var reloadCallback = function() {};
    var modalWired = false;

    function tKey(k) {
        return typeof global.t === 'function' ? global.t(k) : k;
    }

    function showErr(msg) {
        var el = document.getElementById('editResidentError');
        if (!el) return;
        el.textContent = msg;
        el.classList.add('show');
    }

    function hideErr() {
        var el = document.getElementById('editResidentError');
        if (!el) return;
        el.textContent = '';
        el.classList.remove('show');
    }

    function openEditResidentModal(qr) {
        hideErr();
        document.getElementById('editResidentId').value = qr.id;
        document.getElementById('editResidentName').value = qr.name || '';
        document.getElementById('editResidentBuilding').value = qr.building_unit || '';
        document.getElementById('editResidentRoom').value = qr.room_number || '';
        var d = qr.qr_created_date || '';
        document.getElementById('editResidentDate').value = d.length >= 10 ? d.slice(0, 10) : d;
        document.getElementById('editResidentPhone').value = qr.phone || '';
        document.getElementById('editResidentUsername').value = qr.resident_username || '';
        document.getElementById('editResidentPassword').value = '';
        var modal = document.getElementById('editResidentModal');
        if (!modal) return;
        modal.style.display = 'block';
        modal.setAttribute('aria-hidden', 'false');
        if (typeof global.applyPage === 'function') global.applyPage();
    }

    function closeEditResidentModal() {
        var modal = document.getElementById('editResidentModal');
        if (!modal) return;
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        var f = document.getElementById('editResidentForm');
        if (f) f.reset();
        hideErr();
    }

    global.openEditResidentById = function(id) {
        var list = global._qrListForEdit || [];
        var qr = list.find(function(x) { return Number(x.id) === Number(id); });
        if (!qr) return;
        openEditResidentModal(qr);
    };

    global.initEditResidentModal = function(onSuccess) {
        if (typeof onSuccess === 'function') reloadCallback = onSuccess;
        if (modalWired) return;
        modalWired = true;
        var mask = document.getElementById('editResidentMask');
        var closeBtn = document.getElementById('editResidentClose');
        if (mask) mask.addEventListener('click', closeEditResidentModal);
        if (closeBtn) closeBtn.addEventListener('click', closeEditResidentModal);
        var form = document.getElementById('editResidentForm');
        if (!form) return;
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            hideErr();
            var body = {
                id: parseInt(document.getElementById('editResidentId').value, 10),
                name: document.getElementById('editResidentName').value.trim(),
                building_unit: document.getElementById('editResidentBuilding').value.trim(),
                room_number: document.getElementById('editResidentRoom').value.trim(),
                qr_created_date: document.getElementById('editResidentDate').value,
                phone: document.getElementById('editResidentPhone').value.trim(),
                resident_username: document.getElementById('editResidentUsername').value.trim(),
                password: document.getElementById('editResidentPassword').value
            };
            try {
                var res = await fetch('api/update_qr.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                var data = await res.json();
                if (data.success) {
                    alert(data.message_key ? tKey(data.message_key) : tKey('residentUpdated'));
                    closeEditResidentModal();
                    reloadCallback();
                } else {
                    showErr(data.message_key ? tKey(data.message_key) : (data.message || tKey('residentUpdateFailed')));
                }
            } catch (err) {
                showErr(tKey('networkError'));
            }
        });
    };
})(window);
