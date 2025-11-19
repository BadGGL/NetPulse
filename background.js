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

// Initialize on install or startup
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    runAllTests();
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Browser started');
    runAllTests();
});

// Handle alarms for auto-refresh
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'autoRefresh') {
        runAllTests();
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'TEST_ALL') {
        runAllTests().then(() => sendResponse({ status: 'done' }));
        return true; // Keep channel open for async response
    } else if (request.type === 'UPDATE_SETTINGS') {
        handleSettingsUpdate(request.settings);
    } else if (request.type === 'UPDATE_SINGLE_RESULT') {
        // Popup tested a single site, we need to update badge and storage
        updateStorageAndBadgeWithSingleResult(request.index, request.result);
    }
});

async function handleSettingsUpdate(settings) {
    if (settings.autoRefresh) {
        chrome.alarms.create('autoRefresh', { periodInMinutes: settings.refreshInterval / 60 });
    } else {
        chrome.alarms.clear('autoRefresh');
    }
}

async function runAllTests() {
    console.log('Running all tests...');

    // Notify popup if open (optional, but good for UI feedback)
    try {
        chrome.runtime.sendMessage({ type: 'TEST_START' });
    } catch (e) { /* Popup not open */ }

    const results = await Promise.all(websites.map(async (site, index) => {
        const latency = await testLatency(site.url);
        return {
            index,
            name: site.name,
            url: site.url,
            latency: latency,
            timestamp: Date.now()
        };
    }));

    // Save results
    await chrome.storage.local.set({
        testResults: results,
        lastTestTime: Date.now()
    });

    updateBadge(results);

    // Notify popup
    try {
        chrome.runtime.sendMessage({ type: 'TEST_COMPLETE', results });
    } catch (e) { /* Popup not open */ }
}

async function testLatency(url) {
    const startTime = performance.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        // With host permissions, we can use normal fetch
        await fetch(url + '/favicon.ico', {
            method: 'HEAD',
            cache: 'no-cache',
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const endTime = performance.now();
        return Math.round(endTime - startTime);
    } catch (error) {
        console.log(`Test failed for ${url}:`, error);
        return null;
    }
}

async function updateStorageAndBadgeWithSingleResult(index, result) {
    const data = await chrome.storage.local.get('testResults');
    let results = data.testResults || [];

    // If results is empty (shouldn't happen if init ran), fill it with placeholders
    if (results.length === 0) {
        results = websites.map((site, i) => ({
            index: i,
            name: site.name,
            url: site.url,
            latency: null
        }));
    }

    results[index] = result;

    await chrome.storage.local.set({ testResults: results });
    updateBadge(results);
}

function updateBadge(results) {
    const total = results.length;
    const online = results.filter(r => r.latency !== null).length;

    if (online === total) {
        // All Good
        chrome.action.setBadgeText({ text: 'OK' });
        chrome.action.setBadgeBackgroundColor({ color: '#34c759' }); // Green
    } else if (online === 0) {
        // All Bad
        chrome.action.setBadgeText({ text: 'ERR' });
        chrome.action.setBadgeBackgroundColor({ color: '#ff3b30' }); // Red
    } else {
        // Partial
        chrome.action.setBadgeText({ text: `${online}/${total}` });
        chrome.action.setBadgeBackgroundColor({ color: '#ff9500' }); // Yellow
    }
}
