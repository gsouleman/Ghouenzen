// Al-Wasiyyah - Main JavaScript Utilities

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0 XAF';
    return new Intl.NumberFormat('en-US').format(Math.round(amount)) + ' XAF';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

async function apiGet(endpoint) {
    const res = await fetch(endpoint);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'API request failed');
    }
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('API Error:', err);
        throw new Error(err.error || 'API request failed');
    }
    return res.json();
}

async function apiPut(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('API Error:', err);
        throw new Error(err.error || 'API request failed');
    }
    return res.json();
}

async function apiDelete(endpoint) {
    const res = await fetch(endpoint, { method: 'DELETE' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'API request failed');
    }
    return res.json();
}

async function resetData() {
    if (confirm('Start a new session? All data will be cleared.')) {
        await fetch('/api/reset', { method: 'POST' });
        window.location.href = '/';
    }
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
