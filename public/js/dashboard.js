// Al-Wasiyyah - Dashboard JavaScript

let testatorId = null;

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
        const tbody = document.getElementById('creditors-tbody');
        if (creditors.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No creditors registered</td></tr>';
            document.getElementById('creditors-total').textContent = '0 XAF';
            return;
        }
        tbody.innerHTML = creditors.map(c => `
            <tr>
                <td>${c.full_name}</td>
                <td>${c.reason || '-'}</td>
                <td>${formatCurrency(c.amount)}</td>
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
    if (e.key === 'Escape') closeModal();
});
