
// PUC Logic (Completo con 39 campos)

let allAccounts = [];

// Inicialización
async function loadPuc() {
    const token = localStorage.getItem('cyber_token');
    if (!token) return;

    try {
        const res = await fetch('/api/cuentas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            allAccounts = await res.json();
            renderPucTable(allAccounts);
        }
    } catch (e) {
        console.error("Error loading PUC:", e);
    }
}

function renderPucTable(data) {
    const tbody = document.getElementById('pucBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    data.forEach(cta => {
        // Build Full Code with dots if needed or just concatenating
        // Assuming simple concatenation for display
        const code = [cta.cuencla, cta.cuengru, cta.cuencue, cta.cuensub, cta.cuenax1, cta.cuenax2, cta.cuenax3]
            .filter(x => x !== null && x !== undefined && x !== 0) // Filter empty parts 
            .join(' ');

        // Or better, use the pre-calculated code logic if backend doesn't provide a full string
        // But for now, let's use the individual fields.

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="badge" style="background:#f1f5f9; color:#334155; font-family:monospace; font-size:0.9rem;">
                ${cta.cuencor}
            </span></td>
            <td><div style="font-weight:700; color:var(--text-main); font-size:0.95rem;">${cta.cuennom}</div></td>
            <td><span class="badge" style="background:${cta.cuensig === 'D' ? '#dbeafe' : '#fce7f3'}; color:${cta.cuensig === 'D' ? '#1e40af' : '#be185d'};">
                ${cta.cuensig === 'D' ? 'DÉBITO' : 'CRÉDITO'}
            </span></td>
            <td style="text-align:right;">
                <button class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="editPuc(${cta.cuencor})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem; background:#fee2e2; color:#ef4444; box-shadow:none;" onclick="deletePuc(${cta.cuencor})">
                     <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openPucModal() {
    document.getElementById('pucForm').reset();
    document.getElementById('pucIdEdit').value = '';

    // Switch to first tab by default
    switchTab('tab-general');

    document.getElementById('pucModal').classList.add('active');
}

function closePucModal() {
    document.getElementById('pucModal').classList.remove('active');
}

async function editPuc(id) {
    openPucModal();
    const token = localStorage.getItem('cyber_token');

    try {
        const res = await fetch(`/api/cuentas/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();

            // Map fields to inputs
            document.getElementById('pucIdEdit').value = data.cuencor;

            // General
            setVal('cuencla', data.cuencla);
            setVal('cuengru', data.cuengru);
            setVal('cuencue', data.cuencue);
            setVal('cuensub', data.cuensub);
            setVal('cuenax1', data.cuenax1);
            setVal('cuenax2', data.cuenax2);
            setVal('cuenax3', data.cuenax3);
            setVal('cuennom', data.cuennom);
            setVal('cuensig', data.cuensig);
            setVal('cdTpoPuc', data.cdTpoPuc);

            // Flags (Checkbox logic Y/N or S/N)
            setCheck('cAfctble', data.cAfctble);
            setCheck('cTrcro', data.cTrcro);
            setCheck('cBase', data.cBase);
            setCheck('cCntroCsto', data.cCntroCsto);
            setCheck('cDcmnto', data.cDcmnto);
            setCheck('cFcha', data.cFcha);
            setCheck('cChque', data.cChque);

            // Fiscal
            setVal('cuenfcod', data.cuenfcod);
            setVal('tipfcod', data.tipfcod);
            setVal('ajstbleInflcion', data.ajstbleInflcion);
            setVal('cmprtmntoFscal', data.cmprtmntoFscal);
            setVal('nroCuentaNif', data.nroCuentaNif);
            setVal('nmbreCtaNif', data.nmbreCtaNif);

            // Homologaciones
            setVal('hmlgcion1', data.hmlgcion1);
            setVal('nmbreHmlgcion1', data.nmbreHmlgcion1);
            setVal('hmlgcion2', data.hmlgcion2);
            setVal('nmbreHmlgcion2', data.nmbreHmlgcion2);
            setVal('hmlgcion3', data.hmlgcion3);
            setVal('nmbreHmlgcion3', data.nmbreHmlgcion3);
        }
    } catch (e) {
        console.error(e);
        alert('Error al cargar la cuenta');
    }
}

// Helpers
function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = (val === null || val === undefined) ? '' : val.toString().trim();
}

function setCheck(id, val) {
    const el = document.getElementById(id);
    // Oracle sends 'S', 'Y', '1' or similar. Assuming 'S' or 'Y' for true.
    if (el) el.checked = (val === 'S' || val === 'Y' || val === '1');
}

// Save Logic
document.getElementById('pucForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('cyber_token');

    // Construct Object
    const getVal = (id) => {
        const v = document.getElementById(id).value;
        return v === '' ? null : v;
    };

    const getInt = (id) => {
        const v = document.getElementById(id).value;
        return v === '' ? 0 : parseInt(v); // Default 0 for numeric/null logic if strict
    };

    // Checkbox mapping to Char (S/N)
    const getCheck = (id) => document.getElementById(id).checked ? 'S' : 'N';

    // Determine CUENCOR (Primary Key)
    // Strategy: Concatenate main hierarchy codes. 
    // Example: Class(1) + Group(1) + Account(05) + Sub(05) -> 110505
    // NOTE: This logic might need to be adjusted based on exact PK rules, but let's assume standard PUC structure.

    let pkParts = [
        document.getElementById('cuencla').value,
        document.getElementById('cuengru').value,
        document.getElementById('cuencue').value,
        document.getElementById('cuensub').value,
        document.getElementById('cuenax1').value,
        document.getElementById('cuenax2').value,
        document.getElementById('cuenax3').value
    ];

    // Filter empty parts and join without separators for the ID
    let genId = pkParts.filter(p => p).join('');

    // If editing, try to preserve ID, or if generating new...
    const editId = document.getElementById('pucIdEdit').value;
    const finalId = editId ? parseInt(editId) : (genId ? parseInt(genId) : 0);

    // Main NroCuenta might also be this generated ID
    const nroCuenta = finalId;

    const data = {
        cuencor: finalId,
        cuencla: getInt('cuencla'),
        cuengru: getInt('cuengru'),
        cuencue: getInt('cuencue'),
        cuensub: getInt('cuensub'),
        cuenax1: getInt('cuenax1'),
        cuenax2: getInt('cuenax2'),
        cuenax3: getInt('cuenax3'),
        cuennom: getVal('cuennom').toUpperCase(),
        cuensig: getVal('cuensig'),
        cdTpoPuc: getInt('cdTpoPuc'),

        cAfctble: getCheck('cAfctble'),
        cTrcro: getCheck('cTrcro'),
        cBase: getCheck('cBase'),
        cCntroCsto: getCheck('cCntroCsto'),
        cDcmnto: getCheck('cDcmnto'),
        cFcha: getCheck('cFcha'),
        cChque: getCheck('cChque'),

        cuenfcod: getInt('cuenfcod'),
        tipfcod: getInt('tipfcod'),
        ajstbleInflcion: getVal('ajstbleInflcion'),
        cmprtmntoFscal: document.getElementById('cmprtmntoFscal').value ? parseFloat(document.getElementById('cmprtmntoFscal').value) : null,
        nroCuentaNif: getVal('nroCuentaNif'),
        nmbreCtaNif: getVal('nmbreCtaNif'),

        hmlgcion1: getVal('hmlgcion1'),
        nmbreHmlgcion1: getVal('nmbreHmlgcion1'),
        hmlgcion2: getVal('hmlgcion2'),
        nmbreHmlgcion2: getVal('nmbreHmlgcion2'),
        hmlgcion3: getVal('hmlgcion3'),
        nmbreHmlgcion3: getVal('nmbreHmlgcion3'),

        nroCuenta: nroCuenta,
        fchaRgstro: new Date().toISOString()
    };

    const url = editId ? `/api/cuentas/${editId}` : '/api/cuentas';
    const method = editId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            closePucModal();
            loadPuc();
        } else {
            const err = await res.json();
            alert('Error al guardar: ' + (err.error || 'Desconocido'));
        }
    } catch (ex) {
        console.error(ex);
        alert('Error de conexión');
    }
});

async function deletePuc(id) {
    if (!confirm('¿Eliminar esta cuenta?')) return;
    const token = localStorage.getItem('cyber_token');
    await fetch(`/api/cuentas/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    loadPuc();
}

// Tabs Switching Logic
function switchTab(tabId) {
    // Hide all
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    // Show target
    document.getElementById(tabId).style.display = 'block';

    // Activate btn (finding by text content or onclick attr is tricky, so simpler to use event delegation or just iterate)
    const btns = document.querySelectorAll('.tab-btn');
    btns.forEach(b => {
        if (b.onclick && b.onclick.toString().includes(tabId)) b.classList.add('active');
        // Fallback for attribute check if property not set yet
        else if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId)) b.classList.add('active');
    });
}

// Search
if (document.getElementById('pucSearch')) {
    document.getElementById('pucSearch').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allAccounts.filter(a =>
            (a.cuencor && a.cuencor.toString().includes(term)) ||
            (a.cuennom && a.cuennom.toLowerCase().includes(term))
        );
        renderPucTable(filtered);
    });
}

// Expose functions globally
window.switchTab = switchTab;
window.loadPuc = loadPuc;
window.openPucModal = openPucModal;
window.closePucModal = closePucModal;
window.deletePuc = deletePuc;
window.editPuc = editPuc;
