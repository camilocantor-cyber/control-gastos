
async function loadBalance() {
    const token = localStorage.getItem('cyber_token');
    if (!token) return;

    const tbody = document.getElementById('reportesBody');
    if (!tbody) return; // Guard clause if element doesn't exist yet

    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando...</td></tr>';

    try {
        const res = await fetch('/api/reportes/balance-prueba', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            tbody.innerHTML = '';

            let totalDeb = 0;
            let totalCred = 0;

            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No hay movimientos registrados.</td></tr>';
                return;
            }

            data.forEach(row => {
                totalDeb += row.totaL_DEBITO;
                totalCred += row.totaL_CREDITO;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 700; color: var(--primary);">${row.cuenta_codigo}</td>
                    <td>${row.nombre_cuenta || '---'}</td>
                    <td style="text-align: right;">${formatCurrency(row.totaL_DEBITO)}</td>
                    <td style="text-align: right;">${formatCurrency(row.totaL_CREDITO)}</td>
                    <td style="text-align: right; font-weight: 700; color: ${row.saldo_neto >= 0 ? 'var(--text-main)' : 'red'}">
                        ${formatCurrency(row.saldo_neto)}
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Update footer totals if exists
            const tfDeb = document.getElementById('repTotalDebito');
            const tfCred = document.getElementById('repTotalCredito');
            if (tfDeb) tfDeb.textContent = formatCurrency(totalDeb);
            if (tfCred) tfCred.textContent = formatCurrency(totalCred);

        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error al cargar reporte.</td></tr>';
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error de conexión.</td></tr>';
    }
}

function formatCurrency(val) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val);
}

// Global expose
window.loadBalance = loadBalance;
