const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const statusDisplay = document.getElementById('statusDisplay');
const intervalInput = document.getElementById('intervalInput');
const lastClickDisplay = document.getElementById('lastClickDisplay');

// Recupera o estado atual ao abrir o popup
chrome.storage.local.get(['isRunning', 'intervalMinutes', 'lastClickTime'], (result) => {
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

// Escuta evento do background quando um clique real acontecer e o popup estiver aberto
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "CLICK_EXECUTED") {
        updateLastClickUI(message.time);
    }
});
