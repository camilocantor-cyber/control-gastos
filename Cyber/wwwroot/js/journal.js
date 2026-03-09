
let journalDetails = [];
let accountsCache = [];
let tercerosCache = [];

async function initJournal() {
    // Load cache
    const token = localStorage.getItem('cyber_token');
    const headers = { 'Authorization': `Bearer ${token}` };

    // Get basic data
    try {
        const resAcc = await fetch('/api/cuentas', { headers });
        accountsCache = await resAcc.json();

        const resTerc = await fetch('/api/terceros', { headers });
        tercerosCache = await resTerc.json();

        // Add first empty row
        addJournalRow();
    } catch (e) {
        console.error("Error loading cache", e);
    }
}

function addJournalRow() {
    const tbody = document.getElementById('journalBody');
    const tr = document.createElement('tr');
    tr.className = "journal-row";

    // Build select options (simplified for prototype)
    const accOptions = accountsCache.map(a =>
        `<option value="${a.nroCuenta}">${a.nroCuenta} - ${a.cuennom}</option>`
    ).join('');

    const tercOptions = tercerosCache.map(t =>
        `<option value="${t.tercCod}">${t.tercCod} - ${t.tercNom}</option>`
    ).join('');

    tr.innerHTML = `
        <td>
            <input list="accList" class="input-glow account-input" placeholder="Buscar Cuenta..." onchange="validateRow(this)">
            <datalist id="accList">
                ${accOptions}
            </datalist>
        </td>
        <td>
            <input list="tercList" class="input-glow tercero-input" placeholder="NIT / Nombre">
            <datalist id="tercList">
                ${tercOptions}
            </datalist>
        </td>
        <td><input type="text" class="input-glow desc-input" placeholder="Detalle línea"></td>
        <td><input type="number" class="input-glow base-input" value="0" style="text-align:right;"></td>
        <td><input type="number" class="input-glow debit-input" value="0" style="text-align:right;" oninput="calcTotals()"></td>
        <td><input type="number" class="input-glow credit-input" value="0" style="text-align:right;" oninput="calcTotals()"></td>
        <td style="text-align:center;">
            <button class="btn-outline" onclick="removeJournalRow(this)" style="color:red; border:none;"><i class="fa-solid fa-trash"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
}

function removeJournalRow(btn) {
    btn.parentElement.parentElement.remove();
    calcTotals();
}

function calcTotals() {
    let sumD = 0;
    let sumC = 0;

    document.querySelectorAll('.journal-row').forEach(row => {
        sumD += parseFloat(row.querySelector('.debit-input').value) || 0;
        sumC += parseFloat(row.querySelector('.credit-input').value) || 0;
    });

    document.getElementById('totalDebito').textContent = sumD.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('totalCredito').textContent = sumC.toLocaleString('en-US', { minimumFractionDigits: 2 });

    const diff = Math.abs(sumD - sumC);
    const status = document.getElementById('journalStatus');
    const btn = document.getElementById('btnSaveJournal');

    if (diff < 0.01 && sumD > 0) {
        status.innerHTML = '<i class="fa-solid fa-check-circle"></i> ASIENTO CUADRADO';
        status.style.background = '#dcfce7';
        status.style.color = '#166534';
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.classList.add('pulse'); // Add glowing pulse effect
    } else {
        status.innerHTML = `<i class="fa-solid fa-scale-unbalanced"></i> DESCUADRE: ${diff.toFixed(2)}`;
        status.style.background = '#fee2e2';
        status.style.color = '#ef4444';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.classList.remove('pulse');
    }
}

async function saveJournal() {
    const token = localStorage.getItem('cyber_token');

    const rows = [];
    document.querySelectorAll('.journal-row').forEach(row => {
        const acc = row.querySelector('.account-input').value.split(' - ')[0]; // Extract code
        const terc = row.querySelector('.tercero-input').value.split(' - ')[0]; // Extract ID
        const desc = row.querySelector('.desc-input').value;
        const deb = parseFloat(row.querySelector('.debit-input').value) || 0;
        const cred = parseFloat(row.querySelector('.credit-input').value) || 0;
        const base = parseFloat(row.querySelector('.base-input').value) || 0;

        if (acc) {
            rows.push({
                CuentaCodigo: acc,
                TerceroId: terc,
                Descripcion: desc,
                Debito: deb,
                Credito: cred,
                Base: base
            });
        }
    });

    const payload = {
        Numero: 'NC-' + Date.now(), // Auto-generate simple ID
        Fecha: document.getElementById('asiFecha').value || new Date().toISOString(),
        Descripcion: document.getElementById('asiDesc').value,
        TotalDebito: parseFloat(document.getElementById('totalDebito').textContent.replace(/,/g, '')),
        TotalCredito: parseFloat(document.getElementById('totalCredito').textContent.replace(/,/g, '')),
        Detalles: rows
    };

    try {
        const res = await fetch('/api/asientos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('¡Asiento guardado exitosamente!');
            document.getElementById('journalBody').innerHTML = ''; // Clear rows
            addJournalRow(); // Reset
            document.getElementById('asiDesc').value = '';
            calcTotals(); // Reset totals
        } else {
            const err = await res.json();
            alert('Error: ' + err.error);
        }
    } catch (e) {
        console.error(e);
        alert('Error de red');
    }
}

// Expose to window
window.initJournal = initJournal;
window.addJournalRow = addJournalRow;
window.removeJournalRow = removeJournalRow;
window.calcTotals = calcTotals;
window.saveJournal = saveJournal;
