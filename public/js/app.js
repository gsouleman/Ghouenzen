// Al-Wasiyyah - Main JavaScript Utilities

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0 XAF';
    return new Intl.NumberFormat('en-US').format(Math.round(amount)) + ' XAF';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/public/login.html'; // In case we serve it statically, but route is /
        // Actually express serves public files at root.
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
}

async function apiGet(endpoint) {
    const res = await fetch(endpoint, {
        headers: { ...getAuthHeaders() }
    });
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'API request failed');
    }
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify(data)
    });
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }
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
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify(data)
    });
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('API Error:', err);
        throw new Error(err.error || 'API request failed');
    }
    return res.json();
}

async function apiDelete(endpoint) {
    const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: { ...getAuthHeaders() }
    });
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'API request failed');
    }
    return res.json();
}

async function resetData() {
    if (confirm('Start a new session? All data will be cleared.')) {
        await fetch('/api/reset', {
            method: 'POST',
            headers: { ...getAuthHeaders() }
        });
        window.location.reload();
    }
}

function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
