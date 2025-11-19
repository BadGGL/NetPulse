// Configuration
const websites = [
    { name: 'Google', url: 'https://www.google.com', icon: 'https://www.google.com/favicon.ico' },
    { name: 'YouTube', url: 'https://www.youtube.com', icon: 'https://www.youtube.com/favicon.ico' },
    { name: 'Twitter', url: 'https://twitter.com', icon: 'https://abs.twimg.com/favicons/twitter.ico' },
    { name: 'Facebook', url: 'https://www.facebook.com', icon: 'https://www.facebook.com/favicon.ico' },
    { name: 'Instagram', url: 'https://www.instagram.com', icon: 'https://www.instagram.com/static/images/ico/favicon.ico/36b3ee2d91ed.ico' },
    { name: 'GitHub', url: 'https://github.com', icon: 'https://github.com/favicon.ico' },
    { name: 'Reddit', url: 'https://www.reddit.com', icon: 'https://www.reddit.com/favicon.ico' },
    { name: 'Netflix', url: 'https://www.netflix.com', icon: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico' },
    { name: 'OpenAI', url: 'https://openai.com', icon: 'https://openai.com/favicon.ico' },
    { name: 'Wikipedia', url: 'https://www.wikipedia.org', icon: 'https://www.wikipedia.org/static/favicon/wikipedia.ico' },
    { name: 'Amazon', url: 'https://www.amazon.com', icon: 'https://www.amazon.com/favicon.ico' },
    { name: 'Telegram', url: 'https://telegram.org', icon: 'https://telegram.org/favicon.ico' }
];

const TIMEOUT = 10000;
let testingInProgress = false;
let currentApiChannel = 'auto';
let lastSuccessfulApi = null;

// IP APIs Configuration
const IP_APIS = [
    {
        name: 'ipapi.co',
        fetch: async () => {
            const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('API request failed');
            return await res.json();
        },
        parse: (data) => ({
            ip: data.ip,
            country: data.country_name,
            countryCode: data.country_code,
            city: data.city,
            region: data.region,
            isp: data.org,
            timezone: data.timezone
        })
    },
    {
        name: 'ipinfo.io',
        fetch: async () => {
            const res = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('API request failed');
            return await res.json();
        },
        parse: (data) => ({
            ip: data.ip,
            country: data.country,
            countryCode: data.country,
            city: data.city,
            region: data.region,
            isp: data.org,
            timezone: data.timezone
        })
    },
    {
        name: 'ip-api.com',
        fetch: async () => {
            const res = await fetch('http://ip-api.com/json/', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('API request failed');
            return await res.json();
        },
        parse: (data) => ({
            ip: data.query,
            country: data.country,
            countryCode: data.countryCode,
            city: data.city,
            region: data.regionName,
            isp: data.isp,
            timezone: data.timezone
        })
    },
    {
        name: 'Cloudflare',
        fetch: async () => {
            const res = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('API request failed');
            const text = await res.text();
            const data = {};
            text.split('\n').forEach(line => {
                const [key, value] = line.split('=');
                if (key && value) data[key] = value;
            });
            return data;
        },
        parse: (data) => ({
            ip: data.ip,
            country: data.loc || 'Unknown',
            countryCode: data.loc || 'XX',
            city: 'N/A',
            region: 'N/A',
            isp: 'Cloudflare',
            timezone: 'N/A'
        })
    },
    {
        name: 'ipify.org',
        fetch: async () => {
            const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) });
            if (!res.ok) throw new Error('API request failed');
            return await res.json();
        },
        parse: (data) => ({
            ip: data.ip,
            country: 'Unknown',
            countryCode: 'XX',
            city: 'N/A',
            region: 'N/A',
            isp: 'N/A',
            timezone: 'N/A'
        })
    }
];

const countryFlags = {
    'US': '🇺🇸', 'CN': '🇨🇳', 'JP': '🇯🇵', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷',
    'CA': '🇨🇦', 'AU': '🇦🇺', 'KR': '🇰🇷', 'SG': '🇸🇬', 'HK': '🇭🇰', 'TW': '🇹🇼',
    'NL': '🇳🇱', 'SE': '🇸🇪', 'CH': '🇨🇭', 'IT': '🇮🇹', 'ES': '🇪🇸', 'BR': '🇧🇷',
    'IN': '🇮🇳', 'RU': '🇷🇺', 'MX': '🇲🇽', 'ID': '🇮🇩', 'TR': '🇹🇷', 'SA': '🇸🇦',
    'PL': '🇵🇱', 'BE': '🇧🇪', 'AT': '🇦🇹', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮',
    'IE': '🇮🇪', 'NZ': '🇳🇿', 'PT': '🇵🇹', 'CZ': '🇨🇿', 'IL': '🇮🇱', 'MY': '🇲🇾',
    'TH': '🇹🇭', 'PH': '🇵🇭', 'VN': '🇻🇳', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴'
};

function getCountryFlag(countryCode) {
    return countryFlags[countryCode] || '🌐';
}

// ==================== Initialization ====================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    renderWebsites();
    await loadCachedResults();
    loadSettings();
    fetchUserIpInfo(null);

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'TEST_COMPLETE') {
            updateUIWithResults(message.results);
            testingInProgress = false;
            updateTestButtonState(false);
        } else if (message.type === 'TEST_START') {
            testingInProgress = true;
            updateTestButtonState(true);
        }
    });
});

// ==================== Core Logic ====================
async function loadCachedResults() {
    const data = await chrome.storage.local.get(['testResults', 'lastTestTime']);
    if (data.testResults) {
        updateUIWithResults(data.testResults);
    }
    if (data.lastTestTime) {
        updateLastTestTime(data.lastTestTime);
    }
}

function updateUIWithResults(results) {
    results.forEach(result => {
        updateWebsiteCard(result.index, result.latency);
    });
    updateStats(results);
}

function loadSettings() {
    chrome.storage.local.get(['autoRefresh', 'refreshInterval', 'apiChannel'], (result) => {
        if (result.autoRefresh !== undefined) {
            document.getElementById('autoRefresh').checked = result.autoRefresh;
        }
        if (result.refreshInterval) {
            document.getElementById('refreshInterval').value = result.refreshInterval;
        }
        if (result.apiChannel) {
            document.getElementById('apiSelector').value = result.apiChannel;
            currentApiChannel = result.apiChannel;
        }
    });
}

// ==================== IP Geolocation ====================
async function fetchUserIpInfo(forceApi = null) {
    const statusEl = document.getElementById('apiStatus');

    if (forceApi === null) {
        const cached = await chrome.storage.local.get(['cachedIpInfo']);
        if (cached.cachedIpInfo) {
            console.log('Using cached IP info');
            displayIpInfo(cached.cachedIpInfo, cached.cachedIpInfo.apiName || 'Cached');
            if (statusEl) statusEl.className = 'api-status';
            return cached.cachedIpInfo;
        }
    }

    if (statusEl) statusEl.className = 'api-status loading';

    let apisToTry = [];
    if (forceApi !== null && forceApi !== 'auto') {
        apisToTry = [IP_APIS[parseInt(forceApi)]];
    } else {
        if (lastSuccessfulApi !== null) {
            apisToTry = [IP_APIS[lastSuccessfulApi], ...IP_APIS.filter((_, i) => i !== lastSuccessfulApi)];
        } else {
            apisToTry = [...IP_APIS];
        }
    }

    for (let i = 0; i < apisToTry.length; i++) {
        const api = apisToTry[i];
        try {
            const rawData = await api.fetch();
            const data = api.parse(rawData);

            lastSuccessfulApi = IP_APIS.indexOf(api);
            if (statusEl) statusEl.className = 'api-status';

            data.apiName = api.name;
            await chrome.storage.local.set({
                cachedIpInfo: data,
                cachedIpInfoTime: Date.now()
            });

            displayIpInfo(data, api.name);
            return data;
        } catch (error) {
            if (i === apisToTry.length - 1) {
                if (statusEl) statusEl.className = 'api-status error';
                displayIpInfoError();
                return null;
            }
            continue;
        }
    }
}

function displayIpInfo(data, apiName) {
    const ipCard = document.getElementById('ipInfoCard');
    const flag = getCountryFlag(data.countryCode);

    ipCard.innerHTML = `
        <div class="ip-info-content">
            <div class="ip-value">${data.ip}</div>
            <div class="ip-location">
                <span class="country-flag">${flag}</span>
                <span>${data.country} · ${data.city}</span>
            </div>
            <div class="ip-details">
                <div class="ip-detail-item">
                    <div class="ip-detail-label">地区</div>
                    <div class="ip-detail-value">${data.region || 'N/A'}</div>
                </div>
                <div class="ip-detail-item">
                    <div class="ip-detail-label">ISP</div>
                    <div class="ip-detail-value">${data.isp ? data.isp.substring(0, 10) : 'N/A'}</div>
                </div>
                <div class="ip-detail-item">
                    <div class="ip-detail-label">API</div>
                    <div class="ip-detail-value">${apiName.split('.')[0]}</div>
                </div>
            </div>
        </div>
    `;
}

function displayIpInfoError() {
    const ipCard = document.getElementById('ipInfoCard');
    ipCard.innerHTML = `
        <div class="ip-info-content">
            <div class="ip-value">⚠️ 无法获取IP</div>
            <div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">
                请检查网络连接
            </div>
        </div>
    `;
}

// ==================== Latency Testing ====================
async function testLatency(url) {
    const startTime = performance.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        await fetch(url + '/favicon.ico', {
            method: 'HEAD',
            mode: 'no-cors',
            cache: 'no-cache',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const endTime = performance.now();
        return Math.round(endTime - startTime);
    } catch (error) {
        try {
            return await testLatencyWithImage(url);
        } catch (imgError) {
            return null;
        }
    }
}

function testLatencyWithImage(url) {
    return new Promise((resolve, reject) => {
        const startTime = performance.now();
        const img = new Image();
        const timeout = setTimeout(() => {
            img.src = '';
            reject(new Error('Timeout'));
        }, TIMEOUT);

        img.onload = img.onerror = () => {
            clearTimeout(timeout);
            const endTime = performance.now();
            resolve(Math.round(endTime - startTime));
        };

        img.src = url + '/favicon.ico?' + Date.now();
    });
}

// ==================== UI Helpers ====================
function getStatusClass(latency) {
    if (latency === null) return 'status-offline';
    if (latency < 200) return 'status-excellent';
    if (latency < 500) return 'status-good';
    if (latency < 1000) return 'status-fair';
    return 'status-poor';
}

function renderWebsites() {
    const grid = document.getElementById('websitesGrid');
    grid.innerHTML = websites.map((site, index) => `
        <div class="website-card" data-index="${index}">
            <div class="website-header">
                <img src="${site.icon}" alt="${site.name}" class="website-logo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2224%22 height=%2224%22><text y=%2218%22 font-size=%2218%22>🌐</text></svg>'">
                <div class="website-info">
                    <div class="website-name">${site.name}</div>
                </div>
            </div>
            <div class="latency-display">
                <span class="latency-value status-offline" id="latency-${index}">--</span>
                <span class="status-indicator status-offline" id="indicator-${index}"></span>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.website-card').forEach(card => {
        card.addEventListener('click', () => {
            const index = parseInt(card.getAttribute('data-index'));
            testSingleWebsite(index);
        });
    });
}

function updateWebsiteCard(index, latency) {
    const latencyEl = document.getElementById(`latency-${index}`);
    const indicatorEl = document.getElementById(`indicator-${index}`);
    const statusClass = getStatusClass(latency);

    if (latency === null) {
        latencyEl.textContent = '超时';
        latencyEl.className = 'latency-value ' + statusClass;
    } else {
        latencyEl.textContent = latency + 'ms';
        latencyEl.className = 'latency-value ' + statusClass;
    }

    indicatorEl.className = 'status-indicator ' + statusClass;
}

function updateStats(results) {
    const latencies = results.filter(r => r.latency !== null).map(r => r.latency);
    const onlineCount = latencies.length;

    const avgLatencyEl = document.getElementById('avgLatency');
    if (latencies.length > 0) {
        const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
        avgLatencyEl.innerHTML = `${avg}<span>ms</span>`;
    } else {
        avgLatencyEl.innerHTML = `--<span>ms</span>`;
    }

    document.getElementById('onlineCount').innerHTML = `${onlineCount}<span>/12</span>`;
}

function updateLastTestTime(timestamp) {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('lastTest').textContent = timeStr;
}

function updateTestButtonState(isTesting) {
    const btn = document.getElementById('testAllBtn');
    const icon = document.getElementById('testAllIcon');
    const text = document.getElementById('testAllText');

    if (isTesting) {
        btn.disabled = true;
        icon.innerHTML = '<div class="spinner"></div>';
        text.textContent = '测试中';
    } else {
        btn.disabled = false;
        icon.textContent = '▶️';
        text.textContent = '测试所有';
    }
}

// ==================== Actions ====================
async function testSingleWebsite(index) {
    if (testingInProgress) return;

    const card = document.querySelector(`[data-index="${index}"]`);
    card.classList.add('testing');

    const latencyEl = document.getElementById(`latency-${index}`);
    latencyEl.textContent = '...';

    const latency = await testLatency(websites[index].url);
    updateWebsiteCard(index, latency);

    const result = {
        index,
        name: websites[index].name,
        url: websites[index].url,
        latency,
        timestamp: Date.now()
    };

    chrome.runtime.sendMessage({
        type: 'UPDATE_SINGLE_RESULT',
        index,
        result
    });

    card.classList.remove('testing');

    const data = await chrome.storage.local.get('testResults');
    let results = data.testResults || [];
    results[index] = result;
    updateStats(results);
}

function testAllWebsites() {
    if (testingInProgress) return;

    updateTestButtonState(true);
    testingInProgress = true;

    // Also refresh IP info when testing all
    fetchUserIpInfo('auto');

    // Send message to background to run tests
    chrome.runtime.sendMessage({ type: 'TEST_ALL' });
}

// ==================== Theme & Settings ====================
function initTheme() {
    chrome.storage.local.get(['theme'], (result) => {
        const theme = result.theme || 'light';
        document.documentElement.setAttribute('data-theme', theme);
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    chrome.storage.local.set({ theme: newTheme });
}

function saveSettings() {
    const autoRefresh = document.getElementById('autoRefresh').checked;
    const refreshInterval = parseInt(document.getElementById('refreshInterval').value);
    const apiChannel = document.getElementById('apiSelector').value;

    const settings = { autoRefresh, refreshInterval, apiChannel };
    chrome.storage.local.set(settings);

    chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', settings });
}

// ==================== Event Listeners ====================
document.getElementById('testAllBtn').addEventListener('click', testAllWebsites);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);
document.getElementById('apiSelector').addEventListener('change', (e) => {
    currentApiChannel = e.target.value;
    fetchUserIpInfo(currentApiChannel === 'auto' ? null : currentApiChannel);
    saveSettings();
});
document.getElementById('autoRefresh').addEventListener('change', saveSettings);
document.getElementById('refreshInterval').addEventListener('change', saveSettings);
