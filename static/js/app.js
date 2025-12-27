// Al-Wasiyyah - Main JavaScript Utilities

// Format currency in XAF
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0 XAF';
    return new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' XAF';
}

// Parse currency string to number
function parseCurrency(str) {
    if (!str) return 0;
    return parseFloat(str.replace(/[^\d.-]/g, '')) || 0;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// API helper functions
async function apiGet(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('API request failed');
    return response.json();
}

async function apiPost(endpoint, data) {
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
}

async function apiPut(endpoint, data) {
    const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
}

async function apiDelete(endpoint) {
    const response = await fetch(endpoint, { method: 'DELETE' });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
}

// Reset session
async function resetSession() {
    if (confirm('Are you sure you want to start a new session? All unsaved data will be lost.')) {
        await fetch('/api/reset', { method: 'POST' });
        window.location.href = '/';
    }
}

// Capitalize first letter
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}
