const API_BASE = 'https://electricity-usage-monitoring-agent-1.onrender.com/api';

// Global State
let currentUser = null; // Stores user_id
let isLoginMode = false; // SIGN UP by default now

// Chart Instances
let dailyUsageChart = null;
let timeUsageChart = null;
let deviceShareChart = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    attachEventListeners();
    renderAuthUI(); // Configure initial mode appearance
});

function renderAuthUI() {
    const signupFields = document.getElementById('signup-fields');
    const identityLabel = document.getElementById('identity-label');
    const btn = document.getElementById('btn-login');
    const toggleText = document.getElementById('auth-toggle-text');
    const subtitle = document.getElementById('auth-subtitle');

    if (isLoginMode) {
        signupFields.classList.add('hidden');
        identityLabel.textContent = "Email / Mobile / Username";
        btn.textContent = "Log In";
        subtitle.textContent = "Welcome back to your energy dashboard.";
        toggleText.innerHTML = `Don't have an account? <a href="#" id="toggle-auth-mode">Sign Up</a>`;
    } else {
        signupFields.classList.remove('hidden');
        identityLabel.textContent = "Choose a Username";
        btn.textContent = "Sign Up";
        subtitle.textContent = "Create an account to track your energy.";
        toggleText.innerHTML = `Already have an account? <a href="#" id="toggle-auth-mode">Log In</a>`;
        
        // Enforce required fields
        document.getElementById('name_input').required = true;
        document.getElementById('email_input').required = true;
    }

    // Reattach toggler after innerHTML change
    document.getElementById('toggle-auth-mode').addEventListener('click', (e) => {
        e.preventDefault();
        isLoginMode = !isLoginMode;
        
        // Reset requirements if hiding
        if (isLoginMode) {
            document.getElementById('name_input').required = false;
            document.getElementById('email_input').required = false;
        }

        renderAuthUI();
    });
}

function attachEventListeners() {
    // Form Submissions
    document.getElementById('auth-form').addEventListener('submit', handleAuth);
    document.getElementById('usage-form').addEventListener('submit', handleUsageSubmit);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);

    // Tab Navigation
    document.querySelectorAll('#tab-nav li').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
}

// --- AUTH LOGIC ---
function checkAuthStatus() {
    const storedUser = localStorage.getItem('poweruser_id');
    if (storedUser) {
        currentUser = storedUser;
        showView('app-view');
        loadDashboardData();
    } else {
        showView('auth-view');
    }
}

async function handleAuth(e) {
    e.preventDefault();
    
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;

    if (p.length < 8) {
        alert("Your password must be at least 8 characters long.");
        return;
    }

    let endpoint, payload;

    if (isLoginMode) {
        endpoint = '/login';
        payload = {
            identifier: u,
            password: p
        };
    } else {
        endpoint = '/register';
        payload = {
            username: u,
            name: document.getElementById('name_input').value,
            email: document.getElementById('email_input').value,
            mobile: document.getElementById('mobile_input').value || null,
            password: p
        };
    }

    let btn = document.getElementById('btn-login');
    const originalText = btn.textContent;
    btn.textContent = "Connecting...";
    btn.disabled = true;

    try {
        const res = await fetch(API_BASE + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('poweruser_id', data.user_id);
            currentUser = data.user_id;
            document.getElementById('auth-form').reset();
            showView('app-view');
            loadDashboardData();
        } else {
            alert("Error: " + data.detail);
        }
    } catch (err) {
        console.error(err);
        alert("Unable to connect to the server. Please try again.");
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function handleLogout() {
    localStorage.removeItem('poweruser_id');
    currentUser = null;
    showView('auth-view');
}

// --- VIEW & TAB LOGIC ---
function showView(viewId) {
    document.getElementById('auth-view').classList.add('hidden');
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById(viewId).classList.remove('hidden');
}

function switchTab(tabId) {
    // Nav highlight
    document.querySelectorAll('#tab-nav li').forEach(t => t.classList.remove('active'));
    document.querySelector(`#tab-nav li[data-tab="${tabId}"]`).classList.add('active');

    // Panes
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');
    
    // Resize charts if they become visible
    if(tabId === 'devices' && deviceShareChart) deviceShareChart.resize();
}

// --- DATA FETCHING & CHARTS ---
async function loadDashboardData() {
    await fetchAnalysis();
    await fetchUsages();
}

const getHeaders = () => ({
    'Content-Type': 'application/json',
    'user-id': currentUser.toString()
});

async function fetchAnalysis() {
    try {
        const res = await fetch(API_BASE + '/analysis', { headers: getHeaders() });
        const data = await res.json();
        
        // Update top metrics
        const metrics = data.dashboard_metrics;
        document.getElementById('val-today').textContent = metrics.today_usage;
        document.getElementById('val-month').textContent = metrics.month_usage;
        document.getElementById('val-bill').textContent = metrics.est_bill;
        document.getElementById('val-peak').textContent = metrics.peak_load;
        
        // Update Bill Prediction Tab
        document.getElementById('sim-bill').textContent = `₹${metrics.est_bill}`;
        
        // Update Insights
        const list = document.getElementById('tips-list');
        list.innerHTML = '';
        data.saving_suggestions.forEach(t => {
            const li = document.createElement('li');
            li.textContent = t;
            list.appendChild(li);
        });

    } catch (e) { console.error('Analysis error', e); }
}

async function fetchUsages() {
    try {
        const res = await fetch(API_BASE + '/usage', { headers: getHeaders() });
        const data = await res.json();
        renderCharts(data);
    } catch(e) { console.error('Usage fetch error', e); }
}

async function handleUsageSubmit(e) {
    e.preventDefault();
    const payload = {
        appliance: document.getElementById('appliance').value,
        kwh: parseFloat(document.getElementById('kwh').value),
        cost: parseFloat(document.getElementById('cost').value)
    };
    
    try {
        await fetch(API_BASE + '/usage', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });
        document.getElementById('usage-form').reset();
        await loadDashboardData(); // Refresh all UI
    } catch(e) { console.error('Usage submit error', e); }
}

function renderCharts(data) {
    // Destroy existing to prevent overlaps
    if (dailyUsageChart) dailyUsageChart.destroy();
    if (timeUsageChart) timeUsageChart.destroy();
    if (deviceShareChart) deviceShareChart.destroy();

    // Data Processing
    const applianceMap = {};
    const dateMap = {};

    data.forEach(item => {
        applianceMap[item.appliance] = (applianceMap[item.appliance] || 0) + item.kwh;
        // Simple aggregate by date
        dateMap[item.date] = (dateMap[item.date] || 0) + item.kwh;
    });

    const standardChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#8b8d98' } } },
        scales: {
            x: { ticks: { color: '#8b8d98' }, grid: { display: false } },
            y: { ticks: { color: '#8b8d98' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
    };

    // 1. Bar Chart (Device totals)
    const ctx1 = document.getElementById('dailyUsageChart').getContext('2d');
    dailyUsageChart = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: Object.keys(applianceMap),
            datasets: [{
                label: 'Usage (kWh)',
                data: Object.values(applianceMap),
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: standardChartOptions
    });

    // 2. Line Chart (Time history)
    const ctx2 = document.getElementById('timeUsageChart').getContext('2d');
    timeUsageChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: Object.keys(dateMap),
            datasets: [{
                label: 'Total Daily Usage',
                data: Object.values(dateMap),
                borderColor: '#f59e0b',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(245, 158, 11, 0.1)'
            }]
        },
        options: standardChartOptions
    });

    // 3. Doughnut (Device distribution)
    const ctx3 = document.getElementById('deviceShareChart').getContext('2d');
    deviceShareChart = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: Object.keys(applianceMap),
            datasets: [{
                data: Object.values(applianceMap),
                backgroundColor: ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#8b8d98' } }
            }
        }
    });
}
