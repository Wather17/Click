const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const statusDisplay = document.getElementById('statusDisplay');
const intervalInput = document.getElementById('intervalInput');
const lastClickDisplay = document.getElementById('lastClickDisplay');

// Recupera o estado atual ao abrir o popup
chrome.storage.local.get(['isRunning', 'intervalMinutes', 'lastClickTime'], (result) => {
    if (isValidInterval(result.intervalMinutes)) {
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
    const interval = normalizeInterval(intervalInput.value);
    if (interval === null) {
        intervalInput.setCustomValidity('Informe um intervalo inteiro entre 1 e 60 minutos.');
        intervalInput.reportValidity();
        return;
    }

    intervalInput.setCustomValidity('');

    chrome.runtime.sendMessage({ action: "START", interval: interval }, (response) => {
        if (response && response.success) {
            setUIState(true);
            return;
        }

        if (response && response.error) {
            statusDisplay.textContent = response.error.message;
        }
    });
});

intervalInput.addEventListener('input', () => {
    intervalInput.setCustomValidity('');
});

btnStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "STOP" }, (response) => {
        if (response && response.success) {
            setUIState(false);
            return;
        }

        if (response && response.error) {
            statusDisplay.textContent = response.error.message;
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
