const ALARM_NAME = "colabClickerAlarm";

const btnStart = document.getElementById("btnStart");
const btnStop = document.getElementById("btnStop");
const statusDisplay = document.getElementById("statusDisplay");
const intervalInput = document.getElementById("intervalInput");
const reconnectInput = document.getElementById("reconnectInput");
const targetDisplay = document.getElementById("targetDisplay");
const nextRunDisplay = document.getElementById("nextRunDisplay");
const lastAttemptDisplay = document.getElementById("lastAttemptDisplay");
const errorDisplay = document.getElementById("errorDisplay");

let isRunning = false;
let operationPending = false;

function getRuntimeError() {
    return chrome.runtime.lastError || null;
}

function setStatus(text, state) {
    statusDisplay.textContent = text;
    statusDisplay.className = `status-container status-${state}`;
}

function clearError() {
    errorDisplay.hidden = true;
    errorDisplay.textContent = "";
}

function showError(message) {
    const errorMessage = message || "Não foi possível atualizar o monitoramento.";
    errorDisplay.hidden = false;
    errorDisplay.textContent = errorMessage;
    setStatus("Erro", "error");
}

function setControls() {
    const disabled = operationPending || isRunning;
    btnStart.disabled = disabled;
    btnStop.disabled = !isRunning || operationPending;
    intervalInput.disabled = disabled;
    reconnectInput.disabled = operationPending;
}

function setStoppedState() {
    isRunning = false;
    operationPending = false;
    setControls();
    setStatus("Parado", "stopped");
    targetDisplay.textContent = "Aba monitorada: nenhuma";
    nextRunDisplay.textContent = "Próximo ciclo: --";
}

function setRunningState(tabId) {
    isRunning = true;
    operationPending = false;
    setControls();
    setStatus("Monitorando", "running");
    setTargetDisplay(tabId);
    refreshNextRun();
}

function setTargetDisplay(tabId) {
    if (!isValidTabId(tabId)) {
        targetDisplay.textContent = "Aba monitorada: indisponível";
        return;
    }

    chrome.tabs.get(tabId, (tab) => {
        const error = getRuntimeError();
        if (error || !tab) {
            targetDisplay.textContent = "Aba monitorada: indisponível";
            if (isRunning) {
                setStatus("Aba indisponível", "error");
            }
            return;
        }

        const label = tab.title || tab.url || `aba #${tabId}`;
        targetDisplay.textContent = `Aba monitorada: ${label}`;
    });
}

function refreshNextRun() {
    if (!isRunning) {
        nextRunDisplay.textContent = "Próximo ciclo: --";
        return;
    }

    chrome.alarms.get(ALARM_NAME, (alarm) => {
        const error = getRuntimeError();
        if (error || !alarm || !alarm.scheduledTime) {
            nextRunDisplay.textContent = "Próximo ciclo: não agendado";
            return;
        }

        nextRunDisplay.textContent = `Próximo ciclo: ${new Date(alarm.scheduledTime).toLocaleTimeString()}`;
    });
}

function formatAttempt(attempt) {
    if (!attempt) {
        return "Última tentativa: --";
    }

    const outcomeLabels = {
        attempted: "tentativa enviada",
        "target-not-found": "alvo não encontrado",
        "tab-unavailable": "aba indisponível",
        "injection-error": "falha na injeção",
        "execution-error": "falha na execução",
        "reconnect-not-detected": "reconexão não detectada",
        "invalid-result": "resultado inválido"
    };
    const label = outcomeLabels[attempt.outcome] || attempt.outcome || "resultado desconhecido";
    const time = attempt.time || (attempt.timestamp ? new Date(attempt.timestamp).toLocaleTimeString() : "--");
    return `Última tentativa: ${label} às ${time}`;
}

function renderAttempt(attempt) {
    lastAttemptDisplay.textContent = formatAttempt(attempt);
}

function loadState() {
    chrome.storage.local.get([
        "isRunning",
        "intervalMinutes",
        "targetTabId",
        "lastAttempt",
        "lastClickTime",
        "reconnectEnabled"
    ], (result) => {
        const error = getRuntimeError();
        if (error) {
            setStoppedState();
            showError(error.message);
            return;
        }

        if (isValidInterval(result.intervalMinutes)) {
            intervalInput.value = result.intervalMinutes;
        }
        reconnectInput.checked = result.reconnectEnabled === true;
        renderAttempt(result.lastAttempt || (result.lastClickTime ? {
            outcome: "attempted",
            time: result.lastClickTime
        } : null));

        if (result.isRunning && isValidTabId(result.targetTabId)) {
            setRunningState(result.targetTabId);
        } else {
            setStoppedState();
        }
    });
}

btnStart.addEventListener("click", () => {
    const interval = normalizeInterval(intervalInput.value);
    if (interval === null) {
        intervalInput.setCustomValidity("Informe um intervalo inteiro entre 1 e 60 minutos.");
        intervalInput.reportValidity();
        showError("Informe um intervalo inteiro entre 1 e 60 minutos.");
        return;
    }

    intervalInput.setCustomValidity("");
    clearError();
    operationPending = true;
    setControls();
    setStatus("Iniciando...", "starting");

    chrome.runtime.sendMessage({ action: "START", interval }, (response) => {
        const runtimeError = getRuntimeError();
        if (runtimeError) {
            setStoppedState();
            showError(runtimeError.message);
            return;
        }

        if (!response || !response.success) {
            setStoppedState();
            showError(response && response.error ? response.error.message : null);
            return;
        }

        clearError();
        setRunningState(response.targetTabId);
    });
});

btnStop.addEventListener("click", () => {
    clearError();
    operationPending = true;
    setControls();
    setStatus("Parando...", "starting");

    chrome.runtime.sendMessage({ action: "STOP" }, (response) => {
        const runtimeError = getRuntimeError();
        if (runtimeError) {
            showError(runtimeError.message);
            operationPending = false;
            setControls();
            return;
        }

        if (!response || !response.success) {
            showError(response && response.error ? response.error.message : null);
            operationPending = false;
            setControls();
            return;
        }

        clearError();
        setStoppedState();
    });
});

intervalInput.addEventListener("input", () => {
    intervalInput.setCustomValidity("");
    if (!errorDisplay.hidden) {
        clearError();
    }
});

reconnectInput.addEventListener("change", () => {
    const enabled = reconnectInput.checked;
    chrome.storage.local.set({ reconnectEnabled: enabled }, () => {
        const error = getRuntimeError();
        if (error) {
            reconnectInput.checked = !enabled;
            showError(error.message);
        } else {
            clearError();
        }
    });
});

chrome.runtime.onMessage.addListener((message) => {
    if (message.action !== "CLICK_EXECUTED") {
        return;
    }

    renderAttempt(message);
    refreshNextRun();
    if (isRunning && message.outcome !== "attempted") {
        setStatus(formatAttempt(message).replace("Última tentativa: ", ""), "error");
    } else if (isRunning) {
        setStatus("Monitorando", "running");
    }
});

loadState();
