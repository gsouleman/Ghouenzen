// Al-Wasiyyah - Dashboard JavaScript

let testatorId = null;
let testatorData = {};
let creditorsData = [];
let debtorsData = [];

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
        await loadDebtors();
        await loadCreditors();
        await loadAssets();
        await loadBeneficiaries();
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
    } catch (err) { }
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
    } catch (err) { }
}

async function loadDebtors() {
    try {
        const debtors = await apiGet('/api/debtors');
        debtorsData = debtors;
        const tbody = document.getElementById('debtors-tbody');
        if (debtors.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No debtors registered</td></tr>';
            document.getElementById('debtors-total').textContent = '0 XAF';
            return;
        }
        tbody.innerHTML = debtors.map(d => `
            <tr>
                <td>${d.full_name}</td>
                <td>${d.reason || '-'}</td>
                <td>${formatCurrency(d.amount)}</td>
                <td>
                    <button class="stmt-btn view" onclick="viewDebtorStatement(${d.id})">👁 View</button>
                    <button class="stmt-btn print" onclick="printDebtorStatement(${d.id})">🖨 Print</button>
                </td>
                <td>
                    <button class="action-btn edit" onclick='editDebtor(${JSON.stringify(d)})'>Edit</button>
                    <button class="action-btn delete" onclick="deleteItem('debtors', ${d.id})">Delete</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('debtors-total').textContent = formatCurrency(debtors.reduce((s, d) => s + d.amount, 0));
    } catch (err) { }
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
    } catch (err) { }
}

async function loadAssets() {
    try {
        const assets = await apiGet('/api/assets');
        renderAssets('immovable-tbody', assets.filter(a => a.category === 'immovable'), 'immovable-total');
        renderAssets('movable-tbody', assets.filter(a => a.category === 'movable'), 'movable-total');
        renderAssets('other-tbody', assets.filter(a => a.category === 'other'), 'other-total');
        document.getElementById('assets-grand-total').textContent = formatCurrency(assets.reduce((s, a) => s + a.estimated_value, 0));
        document.getElementById('assets-grand-total').textContent = formatCurrency(assets.reduce((s, a) => s + a.estimated_value, 0));
    } catch (err) { }
}

async function loadBeneficiaries() {
    try {
        const beneficiaries = await apiGet('/api/beneficiaries');
        const tbody = document.getElementById('beneficiaries-tbody');
        if (beneficiaries.length === 0) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="4">No beneficiaries designated</td></tr>';
            return;
        }
        tbody.innerHTML = beneficiaries.map(b => {
            let shareDisplay = b.allocation_type === 'percentage'
                ? `${b.allocation_value}%`
                : formatCurrency(b.allocation_value);

            if (b.allocation_type === 'residue') shareDisplay = 'Residue (Remaining Estate)';

            return `
            <tr>
                <td>${b.full_name}</td>
                <td>${b.relationship || '-'}</td>
                <td>${shareDisplay}</td>
                <td>
                    <button class="action-btn edit" onclick='editBeneficiary(${JSON.stringify(b)})'>Edit</button>
                    <button class="action-btn delete" onclick="deleteItem('beneficiaries', ${b.id})">Delete</button>
                </td>
            </tr>
        `}).join('');
    } catch (err) { }
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
            <div class="form-row">
                <div class="form-group"><label>Gender</label>
                    <select id="f-gender">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                </div>
                <div class="form-group"><label>Language</label>
                    <select id="f-language">
                        <option value="english">English</option>
                        <option value="french">French</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Contact</label><input type="text" id="f-contact"></div>
            
            <div class="line-items-section">
                <div class="line-items-header">
                    <h4>Debt Items</h4>
                    <button type="button" class="btn btn-sm btn-outline" onclick="addLineItem('debtor')">+ Add Item</button>
                </div>
                <div id="line-items-container">
                    <div class="line-item" data-index="0">
                        <div class="form-group"><label>Reason</label><input type="text" class="item-reason"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Amount (XAF)</label><input type="number" class="item-amount" required></div>
                            <div class="form-group"><label>Notes</label><input type="text" class="item-notes"></div>
                        </div>
                    </div>
                </div>
                <div class="line-items-total">
                    <strong>Total: <span id="items-total">0 XAF</span></strong>
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Debtor</button>
        </form>`,
        creditor: `<form id="modal-form" class="form">
            <div class="form-group"><label>Name</label><input type="text" id="f-name" required></div>
            <div class="form-row">
                <div class="form-group"><label>Gender</label>
                    <select id="f-gender">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                </div>
                <div class="form-group"><label>Language</label>
                    <select id="f-language">
                        <option value="english">English</option>
                        <option value="french">French</option>
                    </select>
                </div>
            </div>
            <div class="form-group"><label>Contact</label><input type="text" id="f-contact"></div>
            
            <div class="line-items-section">
                <div class="line-items-header">
                    <h4>Debt Items</h4>
                    <button type="button" class="btn btn-sm btn-outline" onclick="addLineItem('creditor')">+ Add Item</button>
                </div>
                <div id="line-items-container">
                    <div class="line-item" data-index="0">
                        <div class="form-group"><label>Reason</label><input type="text" class="item-reason"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Amount (XAF)</label><input type="number" class="item-amount" required></div>
                            <div class="form-group"><label>Notes</label><input type="text" class="item-notes"></div>
                        </div>
                    </div>
                </div>
                <div class="line-items-total">
                    <strong>Total: <span id="items-total">0 XAF</span></strong>
                </div>
            </div>
            
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
            
            <!-- Area Section for Immovable Property -->
            <div id="area-section" style="display: none; background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 1rem;">
                <div class="form-group"><label>Total Area (m²)</label><input type="number" id="f-total-area" step="0.01"></div>
                <div class="form-group"><label>Price per m² (XAF)</label><input type="number" id="f-price-per-m2" step="0.01"></div>
            </div>

            <div class="form-group"><label>Description</label><input type="text" id="f-description" required></div>
            <div class="form-group"><label>Location</label><input type="text" id="f-location"></div>
            
            <div class="form-group" style="background: #fdf6e7; padding: 10px; border-radius: 6px; border: 1px solid #e0cca7; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="checkbox" id="f-is-liquidated" checked style="width: auto; margin: 0;">
                    <label for="f-is-liquidated" style="margin: 0; font-weight: bold; cursor: pointer;">Liquidate to pay debt?</label>
                </div>
                
                <!-- Dynamic Quantity to Sell -->
                <div id="sell-qty-wrapper" style="margin-top: 10px; padding-left: 25px;">
                   <div class="form-group" style="margin-bottom: 5px;">
                       <label id="l-area-sell-unit" style="font-size: 0.9em;">Quantity to Sell (m²)</label>
                       <input type="number" id="f-area-to-sell" step="0.01" style="width: 100%;">
                   </div>
                   <p style="margin: 0; font-size: 0.8rem; color: #666;">Balance will be included in the asset sale.</p>
                </div>
            </div>

            <div class="form-group"><label>Estimated Value (XAF)</label><input type="number" id="f-value" required></div>
            <div class="form-group"><label>Notes</label><textarea id="f-notes" rows="2"></textarea></div>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Asset</button>
        </form>`,
        beneficiary: `<form id="modal-form" class="form">
            <div class="form-group"><label>Full Name</label><input type="text" id="f-name" required></div>
            <div class="form-group"><label>Relationship</label><input type="text" id="f-relation" placeholder="e.g. Friend, Charity, Cousin"></div>
            
            <div class="form-group"><label>Allocation Type</label>
                <select id="f-alloc-type" onchange="toggleAllocInput()">
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (XAF)</option>
                    <option value="residue">Residue (Remainder)</option>
                </select>
            </div>

            <div class="form-group" id="alloc-val-group">
                <label id="l-alloc-val">Percentage Value (%)</label>
                <input type="number" id="f-alloc-val" step="0.01">
            </div>
            
            <div class="form-group"><label>Notes</label><textarea id="f-notes" rows="2"></textarea></div>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Update' : 'Add'} Beneficiary</button>
        </form>`,
        setupAssetListeners: () => {
            const cat = document.getElementById('f-category');
            const areaSec = document.getElementById('area-section');
            const totalArea = document.getElementById('f-total-area');
            const areaSell = document.getElementById('f-area-to-sell');
            const sellLabel = document.getElementById('l-area-sell-unit');
            const liqCb = document.getElementById('f-is-liquidated');
            const sellWrapper = document.getElementById('sell-qty-wrapper');
            const val = document.getElementById('f-value');
            const priceInput = document.getElementById('f-price-per-m2');

            // Calculation Hook
            const calculateValue = () => {
                if (cat.value !== 'immovable') return;
                if (!liqCb.checked) {
                    val.value = 0;
                    return;
                }

                const price = parseFloat(priceInput.value) || 0;
                let sellQty = parseFloat(areaSell.value) || 0;

                // Check unit
                if (sellLabel.dataset.unit === 'ha') {
                    sellQty = sellQty * 10000;
                }

                const calculated = sellQty * price;
                val.value = Math.round(calculated);
            };

            // Toggle Area Section based on category
            const updateCategory = () => {
                if (cat.value === 'immovable') {
                    areaSec.style.display = 'block';
                    if (liqCb.checked) val.readOnly = true;
                } else {
                    areaSec.style.display = 'none';
                    totalArea.value = ''; // Clear if not land
                    priceInput.value = '';
                    val.readOnly = false;
                }
                updateUnits(); // Re-check units
            };
            if (cat) cat.addEventListener('change', updateCategory);

            // Unit Logic
            const updateUnits = () => {
                // Should we show the sell input at all? Only if liquidated is checked
                // And logic: if Total Area >= 10,000 => ha, else m2
                const tVal = parseFloat(totalArea.value) || 0;
                if (tVal >= 10000) {
                    sellLabel.textContent = 'Quantity to Sell (ha)';
                    sellLabel.dataset.unit = 'ha';
                } else {
                    sellLabel.textContent = 'Quantity to Sell (m²)';
                    sellLabel.dataset.unit = 'm2';
                }
                calculateValue();
            };
            if (totalArea) totalArea.addEventListener('input', updateUnits);
            if (priceInput) priceInput.addEventListener('input', calculateValue);
            if (areaSell) areaSell.addEventListener('input', calculateValue);

            // Liquidated Toggle
            if (liqCb) {
                liqCb.addEventListener('change', () => {
                    if (!liqCb.checked) {
                        val.dataset.oldValue = val.value;
                        val.value = 0;
                        val.readOnly = true;
                        val.style.backgroundColor = "#eee";

                        sellWrapper.style.display = 'none';
                        areaSell.value = 0;
                    } else {
                        val.readOnly = cat.value === 'immovable';
                        val.style.backgroundColor = "";
                        if (val.value == 0 && val.dataset.oldValue) val.value = val.dataset.oldValue;

                        sellWrapper.style.display = 'block';
                        if (cat.value === 'immovable') calculateValue();
                    }
                });
                // Initialize
                if (!liqCb.checked) {
                    val.value = 0; val.readOnly = true; val.style.backgroundColor = "#eee";
                    sellWrapper.style.display = 'none';
                } else {
                    sellWrapper.style.display = 'block';
                }
            }

            // Run once
            updateCategory();
        }
    };

    title.textContent = `${isEdit ? 'Edit' : 'Add'} ${capitalize(type)}`;
    body.innerHTML = forms[type];
    modal.classList.add('active');

    // Fill form if editing
    if (data) {
        setTimeout(() => fillForm(type, data), 50);
    }

    // Setup line item total calculation
    if (type === 'debtor' || type === 'creditor') {
        setTimeout(() => {
            document.querySelectorAll('.item-amount').forEach(input => {
                input.addEventListener('input', updateItemsTotal);
            });
        }, 100);
    }

    // Setup asset listeners
    if (type === 'asset' && forms.setupAssetListeners) {
        setTimeout(forms.setupAssetListeners, 100);
    }

    document.getElementById('modal-form').onsubmit = (e) => handleSubmit(e, type, data?.id);
}

function addLineItem(type) {
    const container = document.getElementById('line-items-container');
    const index = container.children.length;
    const itemHTML = `
        <div class="line-item" data-index="${index}">
            <div class="line-item-header">
                <span>Item ${index + 1}</span>
                <button type="button" class="btn-remove-item" onclick="removeLineItem(this)">✕</button>
            </div>
            <div class="form-group"><label>Reason</label><input type="text" class="item-reason"></div>
            <div class="form-row">
                <div class="form-group"><label>Amount (XAF)</label><input type="number" class="item-amount" required></div>
                <div class="form-group"><label>Notes</label><input type="text" class="item-notes"></div>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', itemHTML);

    // Add event listener for new amount input
    const newAmountInput = container.lastElementChild.querySelector('.item-amount');
    newAmountInput.addEventListener('input', updateItemsTotal);
}

function removeLineItem(btn) {
    const container = document.getElementById('line-items-container');
    if (container.children.length > 1) {
        btn.closest('.line-item').remove();
        updateItemsTotal();
    } else {
        showToast('At least one item is required', 'error');
    }
}

function updateItemsTotal() {
    const amounts = document.querySelectorAll('.item-amount');
    let total = 0;
    amounts.forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('items-total').textContent = formatCurrency(total);
}

function getLineItems() {
    const items = [];
    document.querySelectorAll('.line-item').forEach(item => {
        items.push({
            reason: item.querySelector('.item-reason').value || '',
            amount: parseFloat(item.querySelector('.item-amount').value) || 0,
            notes: item.querySelector('.item-notes').value || ''
        });
    });
    return items;
}

function fillForm(type, data) {
    switch (type) {
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
            document.getElementById('f-gender').value = data.gender || 'male';
            document.getElementById('f-language').value = data.language || 'english';
            document.getElementById('f-contact').value = data.contact || '';

            // Fill line items
            const container = document.getElementById('line-items-container');
            container.innerHTML = '';

            const items = data.items && data.items.length > 0 ? data.items : [{ reason: '', amount: 0, notes: '' }];
            items.forEach((item, index) => {
                const itemHTML = `
                    <div class="line-item" data-index="${index}">
                        ${index > 0 ? `<div class="line-item-header"><span>Item ${index + 1}</span><button type="button" class="btn-remove-item" onclick="removeLineItem(this)">✕</button></div>` : ''}
                        <div class="form-group"><label>Reason</label><input type="text" class="item-reason" value="${item.reason || ''}"></div>
                        <div class="form-row">
                            <div class="form-group"><label>Amount (XAF)</label><input type="number" class="item-amount" value="${item.amount || 0}" required></div>
                            <div class="form-group"><label>Notes</label><input type="text" class="item-notes" value="${item.notes || ''}"></div>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', itemHTML);
            });

            // Add event listeners and update total
            document.querySelectorAll('.item-amount').forEach(input => {
                input.addEventListener('input', updateItemsTotal);
            });
            updateItemsTotal();
            break;
        case 'asset':
            document.getElementById('f-category').value = data.category;
            // Trigger category change manually to show/hide area
            document.getElementById('f-category').dispatchEvent(new Event('change'));

            document.getElementById('f-description').value = data.description;
            document.getElementById('f-location').value = data.location || '';
            document.getElementById('f-value').value = data.estimated_value;
            document.getElementById('f-notes').value = data.notes || '';

            // Populate areas
            const tArea = data.total_area || 0;
            document.getElementById('f-total-area').value = tArea;
            document.getElementById('f-price-per-m2').value = data.price_per_m2 || '';
            document.getElementById('f-total-area').dispatchEvent(new Event('input')); // Update label unit

            // Handle Sell Area Unit Conversion
            const sellLabel = document.getElementById('l-area-sell-unit');
            const storedSell = data.area_to_sell || 0;
            if (tArea >= 10000 && sellLabel.dataset.unit === 'ha') {
                document.getElementById('f-area-to-sell').value = storedSell / 10000;
            } else {
                document.getElementById('f-area-to-sell').value = storedSell;
            }

            const liqCb = document.getElementById('f-is-liquidated');
            if (liqCb) {
                liqCb.checked = data.is_liquidated !== false; // Default true
                liqCb.dispatchEvent(new Event('change'));
            }
            break;
        case 'beneficiary':
            document.getElementById('f-name').value = data.full_name;
            document.getElementById('f-relation').value = data.relationship || '';
            document.getElementById('f-alloc-type').value = data.allocation_type || 'percentage';
            document.getElementById('f-alloc-val').value = data.allocation_value || '';
            document.getElementById('f-notes').value = data.notes || '';
            // Trigger change to update label
            setTimeout(() => toggleAllocInput(), 0);
            break;
    }
}

// Helper for beneficiary form
function toggleAllocInput() {
    const type = document.getElementById('f-alloc-type').value;
    const group = document.getElementById('alloc-val-group');
    const label = document.getElementById('l-alloc-val');

    if (type === 'residue') {
        group.style.display = 'none';
    } else {
        group.style.display = 'block';
        if (type === 'percentage') {
            label.textContent = 'Percentage Value (%)';
        } else {
            label.textContent = 'Amount (XAF)';
        }
    }
}

async function handleSubmit(e, type, id) {
    e.preventDefault();
    let data = {};

    switch (type) {
        case 'heir':
            const rel = document.getElementById('f-relation').value;
            data = { relation: rel, full_name: document.getElementById('f-name').value, share_type: ['wife', 'mother', 'father'].includes(rel) ? 'fixed' : 'residue' };
            break;
        case 'executor':
            data = { full_name: document.getElementById('f-name').value, contact: document.getElementById('f-contact').value };
            break;
        case 'debtor':
        case 'creditor':
            data = {
                full_name: document.getElementById('f-name').value,
                gender: document.getElementById('f-gender').value,
                language: document.getElementById('f-language').value,
                contact: document.getElementById('f-contact').value,
                items: getLineItems()
            };
            break;
        case 'asset':
            const isLiq = document.getElementById('f-is-liquidated').checked;

            // Handle Unit Conversion for Save
            let areaSell = parseFloat(document.getElementById('f-area-to-sell').value) || 0;
            const unitType = document.getElementById('l-area-sell-unit').dataset.unit;
            if (unitType === 'ha') {
                areaSell = areaSell * 10000;
            }

            data = {
                category: document.getElementById('f-category').value,
                description: document.getElementById('f-description').value,
                location: document.getElementById('f-location').value,
                estimated_value: parseFloat(document.getElementById('f-value').value) || 0,
                notes: document.getElementById('f-notes').value,
                is_liquidated: isLiq,
                total_area: parseFloat(document.getElementById('f-total-area').value) || 0,
                area_to_sell: areaSell,
                price_per_m2: parseFloat(document.getElementById('f-price-per-m2').value) || 0
            };
            break;
        case 'beneficiary':
            data = {
                full_name: document.getElementById('f-name').value,
                relationship: document.getElementById('f-relation').value,
                allocation_type: document.getElementById('f-alloc-type').value,
                allocation_value: parseFloat(document.getElementById('f-alloc-val').value) || 0,
                notes: document.getElementById('f-notes').value
            };
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
function editBeneficiary(b) { showModal('beneficiary', b); }

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
// STATEMENT FUNCTIONS (CREDITORS & DEBTORS)
// ============================================

function formatCurrencyXAF(amount) {
    if (amount === null || amount === undefined || amount === 0) return '0 XAF';
    return new Intl.NumberFormat('en-US').format(Math.round(amount)) + ' XAF';
}

function numberToWordsEnglish(num) {
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

function numberToWordsFrench(num) {
    if (num === 0) return 'zéro';

    const ones = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
        'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
        'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

    function convertGroup(n) {
        if (n === 0) return '';
        if (n < 20) return ones[n];
        if (n < 70) return tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '');
        if (n < 80) return 'soixante-' + ones[n - 60];
        if (n < 100) return 'quatre-vingt' + (n === 80 ? 's' : '-' + ones[n - 80]);
        if (n < 200) return 'cent' + (n > 100 ? ' ' + convertGroup(n - 100) : '');
        return ones[Math.floor(n / 100)] + ' cent' + (n % 100 ? ' ' + convertGroup(n % 100) : 's');
    }

    let result = '';
    num = Math.abs(Math.round(num));

    if (num >= 1000000000) {
        const billions = Math.floor(num / 1000000000);
        result += (billions === 1 ? 'un milliard' : convertGroup(billions) + ' milliards');
        num %= 1000000000;
        if (num > 0) result += ' ';
    }
    if (num >= 1000000) {
        const millions = Math.floor(num / 1000000);
        result += (millions === 1 ? 'un million' : convertGroup(millions) + ' millions');
        num %= 1000000;
        if (num > 0) result += ' ';
    }
    if (num >= 1000) {
        const thousands = Math.floor(num / 1000);
        result += (thousands === 1 ? 'mille' : convertGroup(thousands) + ' mille');
        num %= 1000;
        if (num > 0) result += ' ';
    }
    if (num > 0) {
        result += convertGroup(num);
    }

    return result.trim();
}

function getTitle(gender, language) {
    if (language === 'french') {
        return gender === 'female' ? 'Mme ' : 'M. ';
    }
    return gender === 'female' ? 'Mrs. ' : 'Mr. ';
}

function getDateFormatted(language) {
    const today = new Date();
    if (language === 'french') {
        return today.toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }
    return today.toLocaleDateString('en-GB', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

function generateCreditorStatementHTML(creditor) {
    const lang = creditor.language || 'english';
    const gender = creditor.gender || 'male';
    const today = getDateFormatted(lang);
    const title = getTitle(gender, lang);
    const totalAmount = creditor.amount || 0;
    const amountNumeric = formatCurrencyXAF(totalAmount);
    const amountWords = lang === 'french' ? numberToWordsFrench(totalAmount) : numberToWordsEnglish(totalAmount);
    const amountWordsFormatted = amountWords.charAt(0).toUpperCase() + amountWords.slice(1) + (lang === 'french' ? ' Francs CFA' : ' CFA Francs');

    const items = creditor.items || [];
    const hasMultipleItems = items.length > 1;

    // Generate items table HTML
    const itemsTableHTML = items.length > 0 ? `
        <table class="items-table" style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
            <thead>
                <tr style="background: #f5f0e6;">
                    <th style="padding: 0.5rem; border: 1px solid #ddd; text-align: left;">#</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd; text-align: left;">${lang === 'french' ? 'Motif' : 'Reason'}</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;">${lang === 'french' ? 'Montant' : 'Amount'}</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd; text-align: left;">${lang === 'french' ? 'Notes' : 'Notes'}</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, idx) => `
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #ddd;">${idx + 1}</td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd;">${item.reason || '-'}</td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;">${formatCurrencyXAF(item.amount)}</td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd;">${item.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr style="background: #f5f0e6; font-weight: bold;">
                    <td colspan="2" style="padding: 0.5rem; border: 1px solid #ddd;">${lang === 'french' ? 'TOTAL' : 'TOTAL'}</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;">${amountNumeric}</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd;"></td>
                </tr>
            </tfoot>
        </table>
    ` : '';

    if (lang === 'french') {
        return `
            <div class="print-statement" id="printable-statement">
                <div class="letterhead">
                    <h2>RELEVÉ DE CONFIRMATION DE DETTE</h2>
                </div>
                <div class="date-line"><strong>Date:</strong> ${today}</div>
                <div class="recipient">
                    <p><strong>À:</strong> ${title}${creditor.full_name}</p>
                    ${creditor.contact ? `<p><strong>Contact:</strong> ${creditor.contact}</p>` : ''}
                </div>
                <div class="subject">Objet: Confirmation de dette impayée</div>
                <div class="body-text">
                    <p>Cher/Chère ${title}${creditor.full_name},</p>
                    <p>Ceci représente ce que je dois à ${title}${creditor.full_name} à la date du (${today}).</p>
                    <p>Cette lettre constitue une reconnaissance formelle de la dette que je, 
                    <strong>${testatorData.full_name || '[Nom du Testateur]'}</strong>, 
                    résidant à <strong>${testatorData.address || '[Adresse]'}</strong>, 
                    vous dois à la date indiquée ci-dessus.</p>
                </div>
                ${hasMultipleItems ? `<div class="items-section"><h4>Détail des dettes:</h4>${itemsTableHTML}</div>` : (items[0]?.reason ? `<p><strong>Motif de la dette:</strong> ${items[0].reason}</p>` : '')}
                <div class="amount-box">
                    <p><strong>Montant total dû:</strong></p>
                    <p class="amount-numeric">${amountNumeric}</p>
                    <p class="amount-words">(${amountWordsFormatted} seulement)</p>
                </div>
                <div class="body-text">
                    <p>Je vous prie de bien vouloir vérifier ce relevé et confirmer son exactitude. 
                    S'il y a des écarts, des omissions ou des montants supplémentaires à inclure, 
                    veuillez les indiquer dans la section ci-dessous.</p>
                </div>
                <div class="confirmation-box">
                    <h4>CONFIRMATION DU CRÉANCIER</h4>
                    <p>Veuillez cocher la case appropriée et signer ci-dessous:</p>
                    <div class="confirm-line">
                        <span class="confirm-checkbox"></span>
                        <span>Je confirme que le montant indiqué ci-dessus (<strong>${amountNumeric}</strong>) est correct et complet.</span>
                    </div>
                    <div class="confirm-line">
                        <span class="confirm-checkbox"></span>
                        <span>Le montant indiqué est incorrect. Le montant correct est: __________________ XAF</span>
                    </div>
                    <div class="confirm-line">
                        <span class="confirm-checkbox"></span>
                        <span>Il y a des montants/éléments supplémentaires non inclus. Détails: </span>
                    </div>
                    <p style="border-bottom: 1px solid #333; min-height: 60px; margin-top: 0.5rem;"></p>
                </div>
                <div class="signature-area">
                    <p><strong>Signature du créancier:</strong> <span class="sig-line"></span></p>
                    <p style="margin-top: 1rem;"><strong>Date:</strong> <span class="sig-line"></span></p>
                    <p style="margin-top: 1rem;"><strong>Numéro de téléphone:</strong> <span class="sig-line"></span></p>
                </div>
            </div>
        `;
    }

    // English version
    return `
        <div class="print-statement" id="printable-statement">
            <div class="letterhead">
                <h2>DEBT CONFIRMATION STATEMENT</h2>
            </div>
            <div class="date-line"><strong>Date:</strong> ${today}</div>
            <div class="recipient">
                <p><strong>To:</strong> ${title}${creditor.full_name}</p>
                ${creditor.contact ? `<p><strong>Contact:</strong> ${creditor.contact}</p>` : ''}
            </div>
            <div class="subject">Subject: Confirmation of Outstanding Debt</div>
            <div class="body-text">
                <p>Dear ${title}${creditor.full_name},</p>
                <p>This is what I owe to ${title}${creditor.full_name} as of this date (${today}).</p>
                <p>This letter serves as a formal acknowledgment and statement of the debt that I, 
                <strong>${testatorData.full_name || '[Testator Name]'}</strong>, 
                residing at <strong>${testatorData.address || '[Address]'}</strong>, 
                owe to you as of the date indicated above.</p>
            </div>
            ${hasMultipleItems ? `<div class="items-section"><h4>Debt Details:</h4>${itemsTableHTML}</div>` : (items[0]?.reason ? `<p><strong>Reason for debt:</strong> ${items[0].reason}</p>` : '')}
            <div class="amount-box">
                <p><strong>Total Amount Owed:</strong></p>
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
            </div>
            <div class="signature-area">
                <p><strong>Creditor's Signature:</strong> <span class="sig-line"></span></p>
                <p style="margin-top: 1rem;"><strong>Date:</strong> <span class="sig-line"></span></p>
                <p style="margin-top: 1rem;"><strong>Contact Number:</strong> <span class="sig-line"></span></p>
            </div>
        </div>
    `;
}

function generateDebtorStatementHTML(debtor) {
    const lang = debtor.language || 'english';
    const gender = debtor.gender || 'male';
    const today = getDateFormatted(lang);
    const title = getTitle(gender, lang);
    const totalAmount = debtor.amount || 0;
    const amountNumeric = formatCurrencyXAF(totalAmount);
    const amountWords = lang === 'french' ? numberToWordsFrench(totalAmount) : numberToWordsEnglish(totalAmount);
    const amountWordsFormatted = amountWords.charAt(0).toUpperCase() + amountWords.slice(1) + (lang === 'french' ? ' Francs CFA' : ' CFA Francs');

    const items = debtor.items || [];
    const hasMultipleItems = items.length > 1;

    // Generate items table HTML
    const itemsTableHTML = items.length > 0 ? `
        <table class="items-table" style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
            <thead>
                <tr style="background: #f5f0e6;">
                    <th style="padding: 0.5rem; border: 1px solid #ddd; text-align: left;">#</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd; text-align: left;">${lang === 'french' ? 'Motif' : 'Reason'}</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;">${lang === 'french' ? 'Montant' : 'Amount'}</th>
                    <th style="padding: 0.5rem; border: 1px solid #ddd; text-align: left;">${lang === 'french' ? 'Notes' : 'Notes'}</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, idx) => `
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #ddd;">${idx + 1}</td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd;">${item.reason || '-'}</td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;">${formatCurrencyXAF(item.amount)}</td>
                        <td style="padding: 0.5rem; border: 1px solid #ddd;">${item.notes || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot>
                <tr style="background: #f5f0e6; font-weight: bold;">
                    <td colspan="2" style="padding: 0.5rem; border: 1px solid #ddd;">${lang === 'french' ? 'TOTAL' : 'TOTAL'}</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;">${amountNumeric}</td>
                    <td style="padding: 0.5rem; border: 1px solid #ddd;"></td>
                </tr>
            </tfoot>
        </table>
    ` : '';

    if (lang === 'french') {
        return `
            <div class="print-statement" id="printable-statement">
                <div class="letterhead">
                    <h2>RELEVÉ DE CONFIRMATION DE CRÉANCE</h2>
                </div>
                <div class="date-line"><strong>Date:</strong> ${today}</div>
                <div class="recipient">
                    <p><strong>À:</strong> ${title}${debtor.full_name}</p>
                    ${debtor.contact ? `<p><strong>Contact:</strong> ${debtor.contact}</p>` : ''}
                </div>
                <div class="subject">Objet: Confirmation de créance à recouvrer</div>
                <div class="body-text">
                    <p>Cher/Chère ${title}${debtor.full_name},</p>
                    <p>Ceci représente ce que ${title}${debtor.full_name} me doit à la date du (${today}).</p>
                    <p>Cette lettre constitue un relevé formel de la créance que ${title}${debtor.full_name} 
                    doit à moi, <strong>${testatorData.full_name || '[Nom du Testateur]'}</strong>, 
                    résidant à <strong>${testatorData.address || '[Adresse]'}</strong>, 
                    à la date indiquée ci-dessus.</p>
                </div>
                ${hasMultipleItems ? `<div class="items-section"><h4>Détail des créances:</h4>${itemsTableHTML}</div>` : (items[0]?.reason ? `<p><strong>Motif de la créance:</strong> ${items[0].reason}</p>` : '')}
                <div class="amount-box">
                    <p><strong>Montant total dû:</strong></p>
                    <p class="amount-numeric">${amountNumeric}</p>
                    <p class="amount-words">(${amountWordsFormatted} seulement)</p>
                </div>
                <div class="body-text">
                    <p>Je vous prie de bien vouloir vérifier ce relevé et confirmer son exactitude. 
                    S'il y a des écarts, des omissions ou des montants supplémentaires à inclure, 
                    veuillez les indiquer dans la section ci-dessous.</p>
                </div>
                <div class="confirmation-box">
                    <h4>CONFIRMATION DU DÉBITEUR</h4>
                    <p>Veuillez cocher la case appropriée et signer ci-dessous:</p>
                    <div class="confirm-line">
                        <span class="confirm-checkbox"></span>
                        <span>Je confirme que le montant indiqué ci-dessus (<strong>${amountNumeric}</strong>) est correct et complet.</span>
                    </div>
                    <div class="confirm-line">
                        <span class="confirm-checkbox"></span>
                        <span>Le montant indiqué est incorrect. Le montant correct est: __________________ XAF</span>
                    </div>
                    <div class="confirm-line">
                        <span class="confirm-checkbox"></span>
                        <span>Il y a des montants/éléments supplémentaires non inclus. Détails: </span>
                    </div>
                    <p style="border-bottom: 1px solid #333; min-height: 60px; margin-top: 0.5rem;"></p>
                </div>
                <div class="signature-area">
                    <p><strong>Signature du débiteur:</strong> <span class="sig-line"></span></p>
                    <p style="margin-top: 1rem;"><strong>Date:</strong> <span class="sig-line"></span></p>
                    <p style="margin-top: 1rem;"><strong>Numéro de téléphone:</strong> <span class="sig-line"></span></p>
                </div>
            </div>
        `;
    }

    // English version
    return `
        <div class="print-statement" id="printable-statement">
            <div class="letterhead">
                <h2>DEBT CONFIRMATION STATEMENT</h2>
            </div>
            <div class="date-line"><strong>Date:</strong> ${today}</div>
            <div class="recipient">
                <p><strong>To:</strong> ${title}${debtor.full_name}</p>
                ${debtor.contact ? `<p><strong>Contact:</strong> ${debtor.contact}</p>` : ''}
            </div>
            <div class="subject">Subject: Confirmation of Outstanding Debt Owed to Estate</div>
            <div class="body-text">
                <p>Dear ${title}${debtor.full_name},</p>
                <p>This is what ${title}${debtor.full_name} owes to me as of this date (${today}).</p>
                <p>This letter serves as a formal statement of the debt that ${title}${debtor.full_name} 
                owes to me, <strong>${testatorData.full_name || '[Testator Name]'}</strong>, 
                residing at <strong>${testatorData.address || '[Address]'}</strong>, 
                as of the date indicated above.</p>
            </div>
            ${hasMultipleItems ? `<div class="items-section"><h4>Debt Details:</h4>${itemsTableHTML}</div>` : (items[0]?.reason ? `<p><strong>Reason for debt:</strong> ${items[0].reason}</p>` : '')}
            <div class="amount-box">
                <p><strong>Total Amount Owed:</strong></p>
                <p class="amount-numeric">${amountNumeric}</p>
                <p class="amount-words">(${amountWordsFormatted} Only)</p>
            </div>
            <div class="body-text">
                <p>I kindly request that you review this statement and confirm its accuracy. 
                If there are any discrepancies, omissions, or additional amounts that should be included, 
                please indicate them in the section below.</p>
            </div>
            <div class="confirmation-box">
                <h4>DEBTOR'S CONFIRMATION</h4>
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
            </div>
            <div class="signature-area">
                <p><strong>Debtor's Signature:</strong> <span class="sig-line"></span></p>
                <p style="margin-top: 1rem;"><strong>Date:</strong> <span class="sig-line"></span></p>
                <p style="margin-top: 1rem;"><strong>Contact Number:</strong> <span class="sig-line"></span></p>
            </div>
        </div>
    `;
}

const printStyles = `
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
`;

function viewCreditorStatement(creditorId) {
    const creditor = creditorsData.find(c => c.id === creditorId);
    if (!creditor) return;
    document.getElementById('statement-body').innerHTML = generateCreditorStatementHTML(creditor);
    document.getElementById('statement-overlay').classList.add('active');
}

function printCreditorStatement(creditorId) {
    const creditor = creditorsData.find(c => c.id === creditorId);
    if (!creditor) return;
    const statementHTML = generateCreditorStatementHTML(creditor);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Creditor Statement - ${creditor.full_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>${printStyles}</style></head><body>${statementHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
}

function viewDebtorStatement(debtorId) {
    const debtor = debtorsData.find(d => d.id === debtorId);
    if (!debtor) return;
    document.getElementById('statement-body').innerHTML = generateDebtorStatementHTML(debtor);
    document.getElementById('statement-overlay').classList.add('active');
}

function printDebtorStatement(debtorId) {
    const debtor = debtorsData.find(d => d.id === debtorId);
    if (!debtor) return;
    const statementHTML = generateDebtorStatementHTML(debtor);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Debtor Statement - ${debtor.full_name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>${printStyles}</style></head><body>${statementHTML}</body></html>`);
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

function printList(type) {
    const isDebtor = type === 'debtor';
    const data = isDebtor ? debtorsData : creditorsData;
    const title = isDebtor ? 'Debtors List (People Who Owe You)' : 'Creditors List (People You Owe)';
    const totalLabel = isDebtor ? 'Total to Collect' : 'Total Liabilities';
    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const rows = data.map((item, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${item.full_name}</td>
            <td>${item.reason || '-'}</td>
            <td>${item.contact || '-'}</td>
            <td style="text-align: right;">${formatCurrency(item.amount)}</td>
        </tr>
    `).join('');

    const listHTML = `
        <div class="letterhead">
            <h2>Al-Wasiyyah Estate Management</h2>
            <p><strong>Testator:</strong> ${testatorData.full_name || '[Name]'}</p>
        </div>
        <div class="date-line">Date: ${today}</div>
        <h3 class="subject" style="text-align: center;">${title}</h3>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
            <thead>
                <tr style="background: #f5f0e6;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 50px;">#</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Name</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Reason</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Contact</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Amount</th>
                </tr>
            </thead>
            <tbody>
                ${rows.length > 0 ? rows : '<tr><td colspan="5" style="text-align:center; padding: 1rem;">No records found</td></tr>'}
            </tbody>
            <tfoot>
                <tr style="background: #f5f0e6; font-weight: bold;">
                    <td colspan="4" style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalLabel}:</td>
                    <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${formatCurrency(totalAmount)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            ${printStyles}
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; }
            th { background-color: #f5f0e6; color: #0d4d3a; }
        </style>
    </head><body>${listHTML}</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
}
