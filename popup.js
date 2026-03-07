const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const statusDisplay = document.getElementById('statusDisplay');
const intervalInput = document.getElementById('intervalInput');
const lastClickDisplay = document.getElementById('lastClickDisplay');
const logContainer = document.getElementById('logContainer');
const btnToggleLog = document.getElementById('btnToggleLog');

// Recupera o estado atual ao abrir o popup
chrome.storage.local.get(['isRunning', 'intervalMinutes', 'lastClickTime', 'clickLog'], (result) => {
    if (result.intervalMinutes) {
        intervalInput.value = result.intervalMinutes;
    }

    if (result.lastClickTime) {
        updateLastClickUI(result.lastClickTime);
    }

    if (result.isRunning) {
        setUIState(true);
    } else {
        setUIState(false);
    }

    if (result.clickLog) {
        renderLog(result.clickLog);
    }
});

btnStart.addEventListener('click', () => {
    const interval = parseInt(intervalInput.value, 10) || 5;

    chrome.runtime.sendMessage({ action: "START", interval: interval }, (response) => {
        if (response && response.success) {
            setUIState(true);
        }
    });
});

btnStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "STOP" }, (response) => {
        if (response && response.success) {
            setUIState(false);
        }
    });
});

// Toggle do painel de log
btnToggleLog.addEventListener('click', () => {
    const isVisible = logContainer.style.display !== 'none';
    logContainer.style.display = isVisible ? 'none' : 'block';
    btnToggleLog.textContent = isVisible ? '📋 Ver Log' : '📋 Ocultar Log';

    // Recarregar log quando abrir
    if (!isVisible) {
        chrome.storage.local.get(['clickLog'], (result) => {
            renderLog(result.clickLog || []);
        });
    }
});

function setUIState(isRunning) {
    if (isRunning) {
        btnStart.disabled = true;
        btnStop.disabled = false;
        intervalInput.disabled = true;
        statusDisplay.innerHTML = '<span class="status-running">Rodando Ativamente</span>';
        lastClickDisplay.style.display = 'block';
    } else {
        btnStart.disabled = false;
        btnStop.disabled = true;
        intervalInput.disabled = false;
        statusDisplay.innerHTML = '<span class="status-stopped">Parado</span>';
        lastClickDisplay.style.display = 'none';
    }
}

function updateLastClickUI(timeStr) {
    lastClickDisplay.innerText = `Último clique: ${timeStr}`;
}

function renderLog(log) {
    if (!log || log.length === 0) {
        logContainer.innerHTML = '<div class="log-empty">Nenhum evento registrado.</div>';
        return;
    }

    // Mostra os últimos 15 eventos (mais recente primeiro)
    const recent = log.slice(-15).reverse();
    logContainer.innerHTML = recent.map(entry => {
        const time = new Date(entry.time).toLocaleTimeString();
        const icon = getLogIcon(entry.action);
        return `<div class="log-entry log-${entry.action.toLowerCase()}">${icon} <span class="log-time">${time}</span> ${entry.detail}</div>`;
    }).join('');
}

function getLogIcon(action) {
    const icons = {
        'START': '▶️',
        'STOP': '⏹️',
        'CLICK': '✅',
        'WARN': '⚠️',
        'RELOAD': '🔄',
        'ERROR': '❌'
    };
    return icons[action] || '📌';
}

// Escuta evento do background quando um clique real acontecer e o popup estiver aberto
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "CLICK_EXECUTED") {
        updateLastClickUI(message.time);
        // Atualiza log se estiver visível
        if (logContainer.style.display !== 'none') {
            chrome.storage.local.get(['clickLog'], (result) => {
                renderLog(result.clickLog || []);
            });
        }
    }
});
