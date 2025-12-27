// Al-Wasiyyah - Dashboard JavaScript

let testatorId = null;
let testatorData = {};
let creditorsData = [];

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initTestatorForm();
    loadAllData();
});

function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
        });
    });
}

function initTestatorForm() {
    document.getElementById('testator-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            full_name: document.getElementById('testator-name').value,
            address: document.getElementById('testator-address').value
        };
        try {
            if (testatorId) {
                await apiPut(`/api/testator/${testatorId}`, data);
            } else {
                const res = await apiPost('/api/testator', data);
                testatorId = res.id;
            }
            showToast('Testator information saved!', 'success');
            loadAllData();
        } catch (err) {
            showToast('Error saving testator', 'error');
        }
    });
}

async function loadAllData() {
    try {
        // First try to get testator
        const testatorRes = await fetch('/api/testator');
        if (testatorRes.ok) {
            const testator = await testatorRes.json();
            testatorId = testator.id;
            testatorData = testator;
            document.getElementById('testator-name').value = testator.full_name || '';
            document.getElementById('testator-address').value = testator.address || '';
            document.getElementById('testator-display').textContent = testator.full_name || 'No testator registered';
        }
        
        // Then get summary
        const res = await fetch('/api/summary');
        if (res.ok) {
            const data = await res.json();
            updateSummary(data);
            updateInheritance(data);
        }
        
        await loadHeirs();
        await loadExecutors();
        await loadDebtors();
        await loadCreditors();
        await loadAssets();
    } catch (err) {
        console.log('No data yet - please load demo data or create a testator');
    }
}

function updateSummary(data) {
    const t = data.totals;
    document.getElementById('total-assets').textContent = formatCurrency(t.assets);
    document.getElementById('total-debtors').textContent = formatCurrency(t.debtors);
    document.getElementById('total-creditors').textContent = formatCurrency(t.creditors);
    document.getElementById('net-estate').textContent = formatCurrency(t.net_estate);
}

function updateInheritance(data) {
    const t = data.totals;
    document.getElementById('calc-assets').textContent = formatCurrency(t.assets);
    document.getElementById('calc-debtors').textContent = '+ ' + formatCurrency(t.debtors);
    document.getElementById('calc-pool').textContent = formatCurrency(t.total_pool);
    document.getElementById('calc-liabilities').textContent = '- ' + formatCurrency(t.creditors);
    document.getElementById('calc-net').textContent = formatCurrency(t.net_estate);
    
    const tbody = document.getElementById('inheritance-tbody');
    if (data.inheritance?.shares?.length > 0) {
        tbody.innerHTML = data.inheritance.shares.map(s => 
            `<tr><td>${s.name}</td><td>${s.relation}</td><td>${s.fraction}</td><td>${formatCurrency(s.amount)}</td></tr>`
        ).join('');
    } else {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Add heirs and assets to see distribution</td></tr>';
    }
}

async function loadHeirs() {
    try {
        const heirs = await apiGet('/api/heirs');
        const tbody = document.getElementById('heirs-tbody');
        if (heirs.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No heirs registered</td></tr>';
            return;
        }
        tbody.innerHTML = heirs.map(h => `
            <tr>
                <td>${capitalize(h.relation)}</td>
                <td>${h.full_name}</td>
                <td>${h.share_type === 'fixed' ? 'Fixed Share' : 'Residue'}</td>
                <td>
                    <button class="action-btn edit" onclick='editHeir(${JSON.stringify(h)})'>Edit</button>
                    <button class="action-btn delete" onclick="deleteItem('heirs', ${h.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {}
}

async function loadExecutors() {
    try {
        const executors = await apiGet('/api/executors');
        const tbody = document.getElementById('executors-tbody');
        if (executors.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No executors registered</td></tr>';
            return;
        }
        tbody.innerHTML = executors.map(e => `
            <tr>
                <td>${e.full_name}</td>
                <td>${e.contact || '-'}</td>
                <td>
                    <button class="action-btn edit" onclick='editExecutor(${JSON.stringify(e)})'>Edit</button>
                    <button class="action-btn delete" onclick="deleteItem('executors', ${e.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {}
}

async function loadDebtors() {
    try {
        const debtors = await apiGet('/api/debtors');
        const tbody = document.getElementById('debtors-tbody');
        if (debtors.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No debtors registered</td></tr>';
            document.getElementById('debtors-total').textContent = '0 XAF';
            return;
        }
        tbody.innerHTML = debtors.map(d => `
            <tr>
                <td>${d.full_name}</td>
                <td>${d.reason || '-'}</td>
                <td>${formatCurrency(d.amount)}</td>
                <td>
                    <button class="action-btn edit" onclick='editDebtor(${JSON.stringify(d)})'>Edit</button>
                    <button class="action-btn delete" onclick="deleteItem('debtors', ${d.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('debtors-total').textContent = formatCurrency(debtors.reduce((s, d) => s + d.amount, 0));
    } catch (err) {}
}

async function loadCreditors() {
    try {
        const creditors = await apiGet('/api/creditors');
        creditorsData = creditors;
        const tbody = document.getElementById('creditors-tbody');
        if (creditors.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No creditors registered</td></tr>';
            document.getElementById('creditors-total').textContent = '0 XAF';
            return;
        }
        tbody.innerHTML = creditors.map(c => `
            <tr>
                <td>${c.full_name}</td>
                <td>${c.reason || '-'}</td>
                <td>${formatCurrency(c.amount)}</td>
                <td>
                    <button class="stmt-btn view" onclick="viewCreditorStatement(${c.id})">👁 View</button>
                    <button class="stmt-btn print" onclick="printCreditorStatement(${c.id})">🖨 Print</button>
                </td>
                <td>
                    <button class="action-btn edit" onclick='editCreditor(${JSON.stringify(c)})'>Edit</button>
                    <button class="action-btn delete" onclick="deleteItem('creditors', ${c.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('creditors-total').textContent = formatCurrency(creditors.reduce((s, c) => s + c.amount, 0));
    } catch (err) {}
}

async function loadAssets() {
    try {
        const assets = await apiGet('/api/assets');
        renderAssets('immovable-tbody', assets.filter(a => a.category === 'immovable'), 'immovable-total');
        renderAssets('movable-tbody', assets.filter(a => a.category === 'movable'), 'movable-total');
        renderAssets('other-tbody', assets.filter(a => a.category === 'other'), 'other-total');
        document.getElementById('assets-grand-total').textContent = formatCurrency(assets.reduce((s, a) => s + a.estimated_value, 0));
    } catch (err) {}
}

function renderAssets(tbodyId, assets, totalId) {
    const tbody = document.getElementById(tbodyId);
    if (assets.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No assets</td></tr>';
        document.getElementById(totalId).textContent = '0 XAF';
        return;
    }
    tbody.innerHTML = assets.map(a => `
        <tr>
            <td>${a.description}</td>
            <td>${a.location || '-'}</td>
            <td>${formatCurrency(a.estimated_value)}</td>
            <td>
                <button class="action-btn edit" onclick='editAsset(${JSON.stringify(a)})'>Edit</button>
                <button class="action-btn delete" onclick="deleteItem('assets', ${a.id})">Delete</button>
            </td>
        </tr>
    `).join('');
    document.getElementById(totalId).textContent = formatCurrency(assets.reduce((s, a) => s + a.estimated_value, 0));
}

async function deleteItem(type, id) {
    if (confirm('Delete this item?')) {
        await apiDelete(`/api/${type}/${id}`);
        showToast('Deleted', 'success');
        loadAllData();
    }
}

// Modal Functions
function showModal(type, data = null) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    const isEdit = data !== null;

    const forms = {
        heir: `<form id="modal-form" class="form">
            <div class="form-group"><label>Relation</label>
                <select id="f-relation" required>
                    <option value="">Select...</option>
                    <option value="wife">Wife</option>
                    <option value="mother">Mother</option>
                    <option value="father">Father</option>
                    <option value="son">Son</option>
                    <option value="daughter">Daughter</option>
                </select>
            </div>
            <div class="form-group"><label>Full Name</label><input type="text" id="f-name" required></div>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Heir</button>
        </form>`,
        executor: `<form id="modal-form" class="form">
            <div class="form-group"><label>Full Name</label><input type="text" id="f-name" required></div>
            <div class="form-group"><label>Contact</label><input type="text" id="f-contact"></div>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Executor</button>
        </form>`,
        debtor: `<form id="modal-form" class="form">
            <div class="form-group"><label>Full Name</label><input type="text" id="f-name" required></div>
            <div class="form-group"><label>Reason</label><input type="text" id="f-reason"></div>
            <div class="form-group"><label>Amount (XAF)</label><input type="number" id="f-amount" required></div>
            <div class="form-group"><label>Notes</label><textarea id="f-notes" rows="2"></textarea></div>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Debtor</button>
        </form>`,
        creditor: `<form id="modal-form" class="form">
            <div class="form-group"><label>Name</label><input type="text" id="f-name" required></div>
            <div class="form-group"><label>Reason</label><input type="text" id="f-reason"></div>
            <div class="form-group"><label>Amount (XAF)</label><input type="number" id="f-amount" required></div>
            <div class="form-group"><label>Notes</label><textarea id="f-notes" rows="2"></textarea></div>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Creditor</button>
        </form>`,
        asset: `<form id="modal-form" class="form">
            <div class="form-group"><label>Category</label>
                <select id="f-category" required>
                    <option value="">Select...</option>
                    <option value="immovable">Immovable Property</option>
                    <option value="movable">Movable Property</option>
                    <option value="other">Other</option>
                </select>
            </div>
            <div class="form-group"><label>Description</label><input type="text" id="f-description" required></div>
            <div class="form-group"><label>Location</label><input type="text" id="f-location"></div>
            <div class="form-group"><label>Estimated Value (XAF)</label><input type="number" id="f-value" required></div>
            <div class="form-group"><label>Notes</label><textarea id="f-notes" rows="2"></textarea></div>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Asset</button>
        </form>`
    };

    title.textContent = `${isEdit ? 'Edit' : 'Add'} ${capitalize(type)}`;
    body.innerHTML = forms[type];
    modal.classList.add('active');

    // Fill form if editing
    if (data) {
        setTimeout(() => fillForm(type, data), 50);
    }

    document.getElementById('modal-form').onsubmit = (e) => handleSubmit(e, type, data?.id);
}

function fillForm(type, data) {
    switch(type) {
        case 'heir':
            document.getElementById('f-relation').value = data.relation;
            document.getElementById('f-name').value = data.full_name;
            break;
        case 'executor':
            document.getElementById('f-name').value = data.full_name;
            document.getElementById('f-contact').value = data.contact || '';
            break;
        case 'debtor':
        case 'creditor':
            document.getElementById('f-name').value = data.full_name;
            document.getElementById('f-reason').value = data.reason || '';
            document.getElementById('f-amount').value = data.amount;
            document.getElementById('f-notes').value = data.notes || '';
            break;
        case 'asset':
            document.getElementById('f-category').value = data.category;
            document.getElementById('f-description').value = data.description;
            document.getElementById('f-location').value = data.location || '';
            document.getElementById('f-value').value = data.estimated_value;
            document.getElementById('f-notes').value = data.notes || '';
            break;
    }
}

async function handleSubmit(e, type, id) {
    e.preventDefault();
    let data = {};
    
    switch(type) {
        case 'heir':
            const rel = document.getElementById('f-relation').value;
            data = { relation: rel, full_name: document.getElementById('f-name').value, share_type: ['wife','mother','father'].includes(rel) ? 'fixed' : 'residue' };
            break;
        case 'executor':
            data = { full_name: document.getElementById('f-name').value, contact: document.getElementById('f-contact').value };
            break;
        case 'debtor':
        case 'creditor':
            data = { full_name: document.getElementById('f-name').value, reason: document.getElementById('f-reason').value, amount: parseFloat(document.getElementById('f-amount').value) || 0, notes: document.getElementById('f-notes').value };
            break;
        case 'asset':
            data = { category: document.getElementById('f-category').value, description: document.getElementById('f-description').value, location: document.getElementById('f-location').value, estimated_value: parseFloat(document.getElementById('f-value').value) || 0, notes: document.getElementById('f-notes').value };
            break;
    }

    try {
        if (id) {
            await apiPut(`/api/${type}s/${id}`, data);
        } else {
            await apiPost(`/api/${type}s`, data);
        }
        closeModal();
        showToast(`${capitalize(type)} ${id ? 'updated' : 'added'}!`, 'success');
        loadAllData();
    } catch (err) {
        showToast('Error saving', 'error');
    }
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// Edit functions
function editHeir(h) { showModal('heir', h); }
function editExecutor(e) { showModal('executor', e); }
function editDebtor(d) { showModal('debtor', d); }
function editCreditor(c) { showModal('creditor', c); }
function editAsset(a) { showModal('asset', a); }

// Close modal on overlay click or Escape
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeStatement();
    }
});

// ============================================
// CREDITOR STATEMENT FUNCTIONS
// ============================================

function formatCurrencyXAF(amount) {
    if (amount === null || amount === undefined || amount === 0) return '0 XAF';
    return new Intl.NumberFormat('en-US').format(Math.round(amount)) + ' XAF';
}

function numberToWords(num) {
    if (num === 0) return 'zero';
    
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
                 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
                 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million', 'billion'];

    function convertGroup(n) {
        if (n === 0) return '';
        if (n < 20) return ones[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
        return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + convertGroup(n % 100) : '');
    }

    let result = '';
    let scaleIndex = 0;
    num = Math.abs(Math.round(num));

    while (num > 0) {
        const group = num % 1000;
        if (group !== 0) {
            const groupStr = convertGroup(group);
            result = groupStr + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (result ? ' ' + result : '');
        }
        num = Math.floor(num / 1000);
        scaleIndex++;
    }

    return result.trim();
}

function generateStatementHTML(creditor) {
    const today = new Date().toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const amountNumeric = formatCurrencyXAF(creditor.amount);
    const amountWords = numberToWords(creditor.amount);
    const amountWordsFormatted = amountWords.charAt(0).toUpperCase() + amountWords.slice(1) + ' CFA Francs';
    
    const title = creditor.full_name.toUpperCase().startsWith('MR') || 
                  creditor.full_name.toUpperCase().startsWith('MRS') || 
                  creditor.full_name.toUpperCase().startsWith('MS') ? '' : 'Mr./Mrs. ';

    return `
        <div class="print-statement" id="printable-statement">
            <div class="letterhead">
                <h2>DEBT CONFIRMATION STATEMENT</h2>
                <p>Al-Wasiyyah Estate Management</p>
            </div>

            <div class="date-line">
                <strong>Date:</strong> ${today}
            </div>

            <div class="recipient">
                <p><strong>To:</strong> ${title}${creditor.full_name}</p>
                ${creditor.contact ? `<p><strong>Contact:</strong> ${creditor.contact}</p>` : ''}
            </div>

            <div class="subject">
                Subject: Confirmation of Outstanding Debt
            </div>

            <div class="body-text">
                <p>Dear ${title}${creditor.full_name},</p>
                
                <p>This is what I owe to ${title}${creditor.full_name} as of this date (${today}).</p>

                <p>This letter serves as a formal acknowledgment and statement of the debt that I, 
                <strong>${testatorData.full_name || '[Testator Name]'}</strong>, 
                residing at <strong>${testatorData.address || '[Address]'}</strong>, 
                owe to you as of the date indicated above.</p>

                ${creditor.reason ? `<p><strong>Reason for debt:</strong> ${creditor.reason}</p>` : ''}
            </div>

            <div class="amount-box">
                <p><strong>Amount Owed:</strong></p>
                <p class="amount-numeric">${amountNumeric}</p>
                <p class="amount-words">(${amountWordsFormatted} Only)</p>
            </div>

            <div class="body-text">
                <p>I kindly request that you review this statement and confirm its accuracy. 
                If there are any discrepancies, omissions, or additional amounts that should be included, 
                please indicate them in the section below.</p>
            </div>

            <div class="confirmation-box">
                <h4>CREDITOR'S CONFIRMATION</h4>
                <p>Please tick the appropriate box and sign below:</p>
                
                <div class="confirm-line">
                    <span class="confirm-checkbox"></span>
                    <span>I confirm that the amount stated above (<strong>${amountNumeric}</strong>) is correct and complete.</span>
                </div>
                
                <div class="confirm-line">
                    <span class="confirm-checkbox"></span>
                    <span>The amount stated is incorrect. The correct amount is: __________________ XAF</span>
                </div>
                
                <div class="confirm-line">
                    <span class="confirm-checkbox"></span>
                    <span>There are additional amounts/items not included. Details: </span>
                </div>
                <p style="border-bottom: 1px solid #333; min-height: 60px; margin-top: 0.5rem;"></p>

                ${creditor.notes ? `<p style="margin-top: 1rem;"><strong>Additional Notes from Debtor:</strong> ${creditor.notes}</p>` : ''}
            </div>

            <div class="signature-area">
                <p><strong>Creditor's Signature:</strong> <span class="sig-line"></span></p>
                <p style="margin-top: 1rem;"><strong>Date:</strong> <span class="sig-line"></span></p>
                <p style="margin-top: 1rem;"><strong>Contact Number:</strong> <span class="sig-line"></span></p>
            </div>

            <div style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #ccc; font-size: 0.85rem; color: #666;">
                <p><em>This document is generated for estate planning purposes as part of the preparation of an Islamic Will (Al-Wasiyyah). 
                Please return the signed copy to the testator or their designated executor.</em></p>
            </div>
        </div>
    `;
}

function viewCreditorStatement(creditorId) {
    const creditor = creditorsData.find(c => c.id === creditorId);
    if (!creditor) return;

    document.getElementById('statement-body').innerHTML = generateStatementHTML(creditor);
    document.getElementById('statement-overlay').classList.add('active');
}

function printCreditorStatement(creditorId) {
    const creditor = creditorsData.find(c => c.id === creditorId);
    if (!creditor) return;

    const statementHTML = generateStatementHTML(creditor);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Creditor Statement - ${creditor.full_name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: 'Outfit', sans-serif; padding: 2rem; line-height: 1.8; color: #1a1a1a; }
                .letterhead { text-align: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #1a6b52; }
                .letterhead h2 { color: #0d4d3a; margin-bottom: 0.25rem; }
                .date-line { text-align: right; margin-bottom: 2rem; }
                .recipient { margin-bottom: 2rem; }
                .subject { font-weight: 600; margin-bottom: 1.5rem; text-decoration: underline; }
                .body-text { margin-bottom: 1.5rem; text-align: justify; }
                .amount-box { background: #f5f0e6; padding: 1rem; border-radius: 8px; margin: 1.5rem 0; border-left: 4px solid #c9a227; }
                .amount-numeric { font-size: 1.25rem; font-weight: 700; color: #0d4d3a; }
                .amount-words { font-style: italic; color: #4a4a4a; margin-top: 0.5rem; }
                .confirmation-box { background: #fff9e6; padding: 1.5rem; border: 2px dashed #c9a227; border-radius: 8px; margin: 2rem 0; }
                .confirmation-box h4 { margin-bottom: 1rem; color: #0d4d3a; }
                .confirm-line { display: flex; gap: 1rem; margin-bottom: 0.75rem; align-items: flex-start; }
                .confirm-checkbox { width: 18px; height: 18px; border: 2px solid #1a1a1a; display: inline-block; flex-shrink: 0; margin-top: 4px; }
                .signature-area { margin-top: 3rem; }
                .sig-line { border-bottom: 1px solid #1a1a1a; min-width: 200px; display: inline-block; margin-left: 1rem; }
                @media print { body { padding: 1rem; } }
            </style>
        </head>
        <body>${statementHTML}</body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
}

function closeStatement() {
    document.getElementById('statement-overlay').classList.remove('active');
}

// Close statement modal on overlay click
document.getElementById('statement-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'statement-overlay') closeStatement();
});
