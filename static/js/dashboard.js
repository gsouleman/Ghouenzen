// Al-Wasiyyah - Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    loadAllData();
    initForms();
});

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = document.getElementById(`panel-${tab.dataset.tab}`);
            if (panel) panel.classList.add('active');
        });
    });
}

function initForms() {
    const testatorForm = document.getElementById('testator-form');
    if (testatorForm) {
        testatorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                full_name: document.getElementById('testator-fullname').value,
                address: document.getElementById('testator-address').value
            };
            try {
                const testatorRes = await fetch('/api/testator');
                if (testatorRes.ok) {
                    await apiPut('/api/testator', data);
                } else {
                    await apiPost('/api/testator', data);
                }
                showToast('Testator information saved!', 'success');
                loadAllData();
            } catch (error) {
                showToast('Error saving testator', 'error');
            }
        });
    }
}

async function loadAllData() {
    try {
        const summaryRes = await fetch('/api/summary');
        if (summaryRes.ok) {
            const summary = await summaryRes.json();
            updateSummaryCards(summary);
            updateTestatorForm(summary.testator);
            updateInheritancePanel(summary);
        }
        await loadHeirs();
        await loadExecutors();
        await loadDebtors();
        await loadCreditors();
        await loadAssets();
    } catch (error) {
        console.log('No data loaded yet');
    }
}

function updateSummaryCards(summary) {
    const totals = summary.totals;
    document.getElementById('total-assets').textContent = formatCurrency(totals.assets);
    document.getElementById('total-debtors').textContent = formatCurrency(totals.debtors);
    document.getElementById('total-creditors').textContent = formatCurrency(totals.creditors);
    document.getElementById('net-estate').textContent = formatCurrency(totals.net_estate);
    if (summary.testator) {
        document.getElementById('testator-name').textContent = summary.testator.full_name;
    }
}

function updateTestatorForm(testator) {
    if (testator) {
        document.getElementById('testator-fullname').value = testator.full_name || '';
        document.getElementById('testator-address').value = testator.address || '';
    }
}

function updateInheritancePanel(summary) {
    const totals = summary.totals;
    document.getElementById('calc-assets').textContent = formatCurrency(totals.assets);
    document.getElementById('calc-debtors').textContent = '+ ' + formatCurrency(totals.debtors);
    document.getElementById('calc-pool').textContent = formatCurrency(totals.total_pool);
    document.getElementById('calc-liabilities').textContent = '- ' + formatCurrency(totals.creditors);
    document.getElementById('calc-net').textContent = formatCurrency(totals.net_estate);
    const tbody = document.getElementById('inheritance-table-body');
    if (summary.inheritance && summary.inheritance.shares && summary.inheritance.shares.length > 0) {
        tbody.innerHTML = summary.inheritance.shares.map(s => `
            <tr><td>${s.name}</td><td>${s.relation}</td><td>${s.fraction}</td><td>${formatCurrency(s.amount)}</td></tr>
        `).join('');
    } else {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Add heirs and assets to see distribution</td></tr>';
    }
}

async function loadHeirs() {
    try {
        const heirs = await apiGet('/api/heirs');
        const tbody = document.getElementById('heirs-table-body');
        if (heirs.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No heirs registered</td></tr>';
            return;
        }
        tbody.innerHTML = heirs.map(h => `
            <tr>
                <td>${capitalize(h.relation)}</td>
                <td>${h.full_name}</td>
                <td>${h.share_type === 'fixed' ? 'Fixed Share' : 'Residue (Asaba)'}</td>
                <td>
                    <button class="action-btn edit" onclick="editHeir(${h.id}, '${h.relation}', '${h.full_name.replace(/'/g, "\\'")}', '${h.share_type}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteHeir(${h.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) { console.log('No heirs data'); }
}

async function loadExecutors() {
    try {
        const executors = await apiGet('/api/executors');
        const tbody = document.getElementById('executors-table-body');
        if (executors.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No executors registered</td></tr>';
            return;
        }
        tbody.innerHTML = executors.map(e => `
            <tr>
                <td>${e.full_name}</td>
                <td>${e.contact || '-'}</td>
                <td>
                    <button class="action-btn edit" onclick="editExecutor(${e.id}, '${e.full_name.replace(/'/g, "\\'")}', '${(e.contact || '').replace(/'/g, "\\'")}')">Edit</button>
                    <button class="action-btn delete" onclick="deleteExecutor(${e.id})">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) { console.log('No executors data'); }
}

async function loadDebtors() {
    try {
        const debtors = await apiGet('/api/debtors');
        const tbody = document.getElementById('debtors-table-body');
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
                    <button class="action-btn edit" onclick="editDebtor(${d.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteDebtor(${d.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('debtors-total').textContent = formatCurrency(debtors.reduce((sum, d) => sum + d.amount, 0));
    } catch (error) { console.log('No debtors data'); }
}

async function loadCreditors() {
    try {
        const creditors = await apiGet('/api/creditors');
        const tbody = document.getElementById('creditors-table-body');
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
                    <button class="action-btn edit" onclick="editCreditor(${c.id})">Edit</button>
                    <button class="action-btn delete" onclick="deleteCreditor(${c.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('creditors-total').textContent = formatCurrency(creditors.reduce((sum, c) => sum + c.amount, 0));
    } catch (error) { console.log('No creditors data'); }
}

async function loadAssets() {
    try {
        const assets = await apiGet('/api/assets');
        renderAssetTable('immovable-assets-body', assets.filter(a => a.category === 'immovable'), 'immovable-total');
        renderAssetTable('movable-assets-body', assets.filter(a => a.category === 'movable'), 'movable-total');
        renderAssetTable('other-assets-body', assets.filter(a => a.category === 'other'), 'other-total');
        document.getElementById('assets-grand-total').textContent = formatCurrency(assets.reduce((sum, a) => sum + a.estimated_value, 0));
    } catch (error) { console.log('No assets data'); }
}

function renderAssetTable(tbodyId, assets, totalId) {
    const tbody = document.getElementById(tbodyId);
    if (assets.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No assets in this category</td></tr>';
        document.getElementById(totalId).textContent = '0 XAF';
        return;
    }
    tbody.innerHTML = assets.map(a => `
        <tr>
            <td>${a.description}</td>
            <td>${a.location || '-'}</td>
            <td>${formatCurrency(a.estimated_value)}</td>
            <td>
                <button class="action-btn edit" onclick="editAsset(${a.id})">Edit</button>
                <button class="action-btn delete" onclick="deleteAsset(${a.id})">Delete</button>
            </td>
        </tr>
    `).join('');
    document.getElementById(totalId).textContent = formatCurrency(assets.reduce((sum, a) => sum + a.estimated_value, 0));
}

function showAddModal(type) {
    const modal = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    let formHtml = '';
    switch(type) {
        case 'heir':
            title.textContent = 'Add Heir';
            formHtml = `<form id="add-heir-form" class="form">
                <div class="form-group"><label>Relation</label><select id="heir-relation" required>
                    <option value="">Select relation</option><option value="wife">Wife</option><option value="mother">Mother</option>
                    <option value="father">Father</option><option value="son">Son</option><option value="daughter">Daughter</option>
                </select></div>
                <div class="form-group"><label>Full Name</label><input type="text" id="heir-name" required placeholder="Enter full name"></div>
                <button type="submit" class="btn btn-primary">Add Heir</button></form>`;
            break;
        case 'executor':
            title.textContent = 'Add Executor';
            formHtml = `<form id="add-executor-form" class="form">
                <div class="form-group"><label>Full Name</label><input type="text" id="executor-name" required placeholder="Enter full name"></div>
                <div class="form-group"><label>Contact</label><input type="text" id="executor-contact" placeholder="Phone or email"></div>
                <button type="submit" class="btn btn-primary">Add Executor</button></form>`;
            break;
        case 'debtor':
            title.textContent = 'Add Debtor';
            formHtml = `<form id="add-debtor-form" class="form">
                <div class="form-group"><label>Full Name</label><input type="text" id="debtor-name" required placeholder="Person who owes you"></div>
                <div class="form-group"><label>Reason</label><input type="text" id="debtor-reason" placeholder="Why they owe you"></div>
                <div class="form-group"><label>Amount (XAF)</label><input type="number" id="debtor-amount" required placeholder="0"></div>
                <div class="form-group"><label>Notes</label><textarea id="debtor-notes" rows="2"></textarea></div>
                <button type="submit" class="btn btn-primary">Add Debtor</button></form>`;
            break;
        case 'creditor':
            title.textContent = 'Add Creditor';
            formHtml = `<form id="add-creditor-form" class="form">
                <div class="form-group"><label>Name</label><input type="text" id="creditor-name" required placeholder="Person/institution you owe"></div>
                <div class="form-group"><label>Reason</label><input type="text" id="creditor-reason" placeholder="Why you owe them"></div>
                <div class="form-group"><label>Amount (XAF)</label><input type="number" id="creditor-amount" required placeholder="0"></div>
                <div class="form-group"><label>Notes</label><textarea id="creditor-notes" rows="2"></textarea></div>
                <button type="submit" class="btn btn-primary">Add Creditor</button></form>`;
            break;
        case 'asset':
            title.textContent = 'Add Asset';
            formHtml = `<form id="add-asset-form" class="form">
                <div class="form-group"><label>Category</label><select id="asset-category" required>
                    <option value="">Select category</option><option value="immovable">Immovable Property</option>
                    <option value="movable">Movable Property</option><option value="other">Other</option>
                </select></div>
                <div class="form-group"><label>Description</label><input type="text" id="asset-description" required placeholder="e.g., Land - 500 m²"></div>
                <div class="form-group"><label>Location</label><input type="text" id="asset-location" placeholder="e.g., Douala"></div>
                <div class="form-group"><label>Estimated Value (XAF)</label><input type="number" id="asset-value" required placeholder="0"></div>
                <div class="form-group"><label>Notes</label><textarea id="asset-notes" rows="2"></textarea></div>
                <button type="submit" class="btn btn-primary">Add Asset</button></form>`;
            break;
    }
    body.innerHTML = formHtml;
    modal.classList.add('active');
    setTimeout(() => {
        const form = body.querySelector('form');
        if (form) form.addEventListener('submit', (e) => handleFormSubmit(e, type));
    }, 100);
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('active'); }

async function handleFormSubmit(e, type) {
    e.preventDefault();
    try {
        let data = {};
        switch(type) {
            case 'heir':
                const relation = document.getElementById('heir-relation').value;
                data = { relation, full_name: document.getElementById('heir-name').value, share_type: ['wife', 'mother', 'father'].includes(relation) ? 'fixed' : 'residue' };
                await apiPost('/api/heirs', data);
                break;
            case 'executor':
                data = { full_name: document.getElementById('executor-name').value, contact: document.getElementById('executor-contact').value };
                await apiPost('/api/executors', data);
                break;
            case 'debtor':
                data = { full_name: document.getElementById('debtor-name').value, reason: document.getElementById('debtor-reason').value, amount: parseFloat(document.getElementById('debtor-amount').value) || 0, notes: document.getElementById('debtor-notes').value };
                await apiPost('/api/debtors', data);
                break;
            case 'creditor':
                data = { full_name: document.getElementById('creditor-name').value, reason: document.getElementById('creditor-reason').value, amount: parseFloat(document.getElementById('creditor-amount').value) || 0, notes: document.getElementById('creditor-notes').value };
                await apiPost('/api/creditors', data);
                break;
            case 'asset':
                data = { category: document.getElementById('asset-category').value, description: document.getElementById('asset-description').value, location: document.getElementById('asset-location').value, estimated_value: parseFloat(document.getElementById('asset-value').value) || 0, notes: document.getElementById('asset-notes').value };
                await apiPost('/api/assets', data);
                break;
        }
        closeModal();
        showToast(`${capitalize(type)} added successfully!`, 'success');
        loadAllData();
    } catch (error) { showToast(`Error adding ${type}`, 'error'); }
}

async function deleteHeir(id) { if (confirm('Delete this heir?')) { await apiDelete(`/api/heirs/${id}`); showToast('Deleted', 'success'); loadAllData(); } }
async function deleteExecutor(id) { if (confirm('Delete this executor?')) { await apiDelete(`/api/executors/${id}`); showToast('Deleted', 'success'); loadAllData(); } }
async function deleteDebtor(id) { if (confirm('Delete this debtor?')) { await apiDelete(`/api/debtors/${id}`); showToast('Deleted', 'success'); loadAllData(); } }
async function deleteCreditor(id) { if (confirm('Delete this creditor?')) { await apiDelete(`/api/creditors/${id}`); showToast('Deleted', 'success'); loadAllData(); } }
async function deleteAsset(id) { if (confirm('Delete this asset?')) { await apiDelete(`/api/assets/${id}`); showToast('Deleted', 'success'); loadAllData(); } }

function editHeir(id, relation, name, shareType) {
    showAddModal('heir');
    setTimeout(() => {
        document.getElementById('heir-relation').value = relation;
        document.getElementById('heir-name').value = name;
        document.getElementById('modal-title').textContent = 'Edit Heir';
        document.getElementById('add-heir-form').onsubmit = async (e) => {
            e.preventDefault();
            const rel = document.getElementById('heir-relation').value;
            await apiPut(`/api/heirs/${id}`, { relation: rel, full_name: document.getElementById('heir-name').value, share_type: ['wife', 'mother', 'father'].includes(rel) ? 'fixed' : 'residue' });
            closeModal(); showToast('Updated', 'success'); loadAllData();
        };
    }, 150);
}

function editExecutor(id, name, contact) {
    showAddModal('executor');
    setTimeout(() => {
        document.getElementById('executor-name').value = name;
        document.getElementById('executor-contact').value = contact;
        document.getElementById('modal-title').textContent = 'Edit Executor';
        document.getElementById('add-executor-form').onsubmit = async (e) => {
            e.preventDefault();
            await apiPut(`/api/executors/${id}`, { full_name: document.getElementById('executor-name').value, contact: document.getElementById('executor-contact').value });
            closeModal(); showToast('Updated', 'success'); loadAllData();
        };
    }, 150);
}

async function editDebtor(id) {
    const debtors = await apiGet('/api/debtors');
    const d = debtors.find(x => x.id === id);
    if (!d) return;
    showAddModal('debtor');
    setTimeout(() => {
        document.getElementById('debtor-name').value = d.full_name;
        document.getElementById('debtor-reason').value = d.reason || '';
        document.getElementById('debtor-amount').value = d.amount;
        document.getElementById('debtor-notes').value = d.notes || '';
        document.getElementById('modal-title').textContent = 'Edit Debtor';
        document.getElementById('add-debtor-form').onsubmit = async (e) => {
            e.preventDefault();
            await apiPut(`/api/debtors/${id}`, { full_name: document.getElementById('debtor-name').value, reason: document.getElementById('debtor-reason').value, amount: parseFloat(document.getElementById('debtor-amount').value) || 0, notes: document.getElementById('debtor-notes').value });
            closeModal(); showToast('Updated', 'success'); loadAllData();
        };
    }, 150);
}

async function editCreditor(id) {
    const creditors = await apiGet('/api/creditors');
    const c = creditors.find(x => x.id === id);
    if (!c) return;
    showAddModal('creditor');
    setTimeout(() => {
        document.getElementById('creditor-name').value = c.full_name;
        document.getElementById('creditor-reason').value = c.reason || '';
        document.getElementById('creditor-amount').value = c.amount;
        document.getElementById('creditor-notes').value = c.notes || '';
        document.getElementById('modal-title').textContent = 'Edit Creditor';
        document.getElementById('add-creditor-form').onsubmit = async (e) => {
            e.preventDefault();
            await apiPut(`/api/creditors/${id}`, { full_name: document.getElementById('creditor-name').value, reason: document.getElementById('creditor-reason').value, amount: parseFloat(document.getElementById('creditor-amount').value) || 0, notes: document.getElementById('creditor-notes').value });
            closeModal(); showToast('Updated', 'success'); loadAllData();
        };
    }, 150);
}

async function editAsset(id) {
    const assets = await apiGet('/api/assets');
    const a = assets.find(x => x.id === id);
    if (!a) return;
    showAddModal('asset');
    setTimeout(() => {
        document.getElementById('asset-category').value = a.category;
        document.getElementById('asset-description').value = a.description;
        document.getElementById('asset-location').value = a.location || '';
        document.getElementById('asset-value').value = a.estimated_value;
        document.getElementById('asset-notes').value = a.notes || '';
        document.getElementById('modal-title').textContent = 'Edit Asset';
        document.getElementById('add-asset-form').onsubmit = async (e) => {
            e.preventDefault();
            await apiPut(`/api/assets/${id}`, { category: document.getElementById('asset-category').value, description: document.getElementById('asset-description').value, location: document.getElementById('asset-location').value, estimated_value: parseFloat(document.getElementById('asset-value').value) || 0, notes: document.getElementById('asset-notes').value });
            closeModal(); showToast('Updated', 'success'); loadAllData();
        };
    }, 150);
}

document.getElementById('modal-overlay').addEventListener('click', (e) => { if (e.target.id === 'modal-overlay') closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
