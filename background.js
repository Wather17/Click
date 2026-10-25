// background.js - Service Worker da extensão

importScripts("core.js");

const ALARM_NAME = "colabClickerAlarm";
const COLAB_URL_PATTERN = "https://colab.research.google.com/*";

function getRuntimeError() {
    return chrome.runtime.lastError || null;
}

function sendPopupMessage(message) {
    chrome.runtime.sendMessage(message, () => {
        // Ler lastError no callback evita rejeições quando o popup está fechado.
        void getRuntimeError();
    });
}

function saveAttempt(attempt) {
    const now = new Date();
    const record = {
        ...attempt,
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString()
    };

    chrome.storage.local.set({
        lastAttempt: record,
        lastClickTime: record.time
    }, () => {
        const error = getRuntimeError();
        if (error) {
            console.error("[Colab Clicker] Erro ao salvar resultado:", error.message);
        }

        sendPopupMessage({
            action: "CLICK_EXECUTED",
            ...record
        });
    });
}

function queryAuthorizedTab(callback) {
    chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
        url: COLAB_URL_PATTERN
    }, (tabs) => {
        const error = getRuntimeError();
        if (error) {
            callback({
                code: "tabs-query-failed",
                message: error.message
            });
            return;
        }

        callback(null, selectTargetTab(tabs));
    });
}

function setStopped(callback) {
    chrome.storage.local.set({
        isRunning: false,
        targetTabId: null
    }, () => {
        const error = getRuntimeError();
        callback(error ? {
            code: "storage-write-failed",
            message: error.message
        } : null);
    });
}

function replaceAlarm(interval, callback) {
    chrome.alarms.clear(ALARM_NAME, () => {
        const clearError = getRuntimeError();
        if (clearError) {
            callback({
                code: "alarm-clear-failed",
                message: clearError.message
            });
            return;
        }

        chrome.alarms.create(ALARM_NAME, {
            delayInMinutes: interval,
            periodInMinutes: interval
        }, () => {
            const createError = getRuntimeError();
            callback(createError ? {
                code: "alarm-create-failed",
                message: createError.message
            } : null);
        });
    });
}

function executeClickOnTargetTab(tabId) {
    if (!isValidTabId(tabId)) {
        saveAttempt({
            tabId: null,
            action: "periodic-click",
            outcome: "tab-unavailable",
            reason: "target-tab-id-missing"
        });
        return;
    }

    chrome.tabs.get(tabId, () => {
        const tabError = getRuntimeError();
        if (tabError) {
            saveAttempt({
                tabId,
                action: "periodic-click",
                outcome: "tab-unavailable",
                reason: tabError.message
            });
            return;
        }

        chrome.scripting.executeScript({
            target: { tabId, frameIds: [0] },
            files: ["content.js"]
        }).then((results) => {
            const result = results && results[0] && results[0].result;
            if (!result || typeof result !== "object") {
                saveAttempt({
                    tabId,
                    action: "periodic-click",
                    outcome: "invalid-result",
                    reason: "content-script-returned-no-result"
                });
                return;
            }

            saveAttempt({
                tabId,
                ...result
            });
        }).catch((error) => {
            saveAttempt({
                tabId,
                action: "periodic-click",
                outcome: "injection-error",
                reason: error && error.message ? error.message : "unknown-injection-error"
            });
        });
    });
}

function startMonitoring(requestedInterval, sendResponse) {
    const interval = normalizeInterval(requestedInterval);
    if (interval === null) {
        sendResponse({
            success: false,
            error: {
                code: "invalid-interval",
                message: `Informe um intervalo inteiro entre ${MIN_INTERVAL_MINUTES} e ${MAX_INTERVAL_MINUTES} minutos.`
            }
        });
        return;
    }

    queryAuthorizedTab((queryError, tab) => {
        if (queryError) {
            sendResponse({ success: false, error: queryError });
            return;
        }

        if (!tab) {
            sendResponse({
                success: false,
                error: {
                    code: "no-colab-tab",
                    message: "Abra uma aba do Google Colab antes de iniciar."
                }
            });
            return;
        }

        chrome.storage.local.set({
            isRunning: true,
            intervalMinutes: interval,
            targetTabId: tab.id
        }, () => {
            const storageError = getRuntimeError();
            if (storageError) {
                sendResponse({
                    success: false,
                    error: {
                        code: "storage-write-failed",
                        message: storageError.message
                    }
                });
                return;
            }

            replaceAlarm(interval, (alarmError) => {
                if (alarmError) {
                    setStopped(() => {
                        sendResponse({ success: false, error: alarmError });
                    });
                    return;
                }

                sendResponse({
                    success: true,
                    targetTabId: tab.id,
                    intervalMinutes: interval
                });
                executeClickOnTargetTab(tab.id);
            });
        });
    });
}

function stopMonitoring(sendResponse) {
    chrome.alarms.clear(ALARM_NAME, () => {
        const alarmError = getRuntimeError();
        if (alarmError) {
            sendResponse({ success: false, error: {
                code: "alarm-clear-failed",
                message: alarmError.message
            } });
            return;
        }

        setStopped((storageError) => {
            if (storageError) {
                sendResponse({ success: false, error: storageError });
                return;
            }

            sendResponse({ success: true });
        });
    });
}

function reconcileState() {
    chrome.storage.local.get(["isRunning", "intervalMinutes", "targetTabId"], (result) => {
        const storageError = getRuntimeError();
        if (storageError) {
            console.error("[Colab Clicker] Erro ao recuperar estado:", storageError.message);
            return;
        }

        chrome.alarms.get(ALARM_NAME, (alarm) => {
            const alarmError = getRuntimeError();
            if (alarmError) {
                console.error("[Colab Clicker] Erro ao recuperar alarme:", alarmError.message);
                return;
            }

            const stateIsValid = isValidMonitoringState(result);

            if (!stateIsValid) {
                if (alarm || result.isRunning || result.targetTabId !== undefined) {
                    chrome.alarms.clear(ALARM_NAME, () => {
                        setStopped(() => {});
                    });
                }
                return;
            }

            chrome.tabs.get(result.targetTabId, () => {
                const tabError = getRuntimeError();
                if (tabError) {
                    chrome.alarms.clear(ALARM_NAME, () => {
                        setStopped(() => {});
                    });
                    return;
                }

                const alarmMatchesState = alarmMatchesInterval(alarm, result.intervalMinutes);
                if (!alarmMatchesState) {
                    replaceAlarm(result.intervalMinutes, (replaceError) => {
                        if (replaceError) {
                            console.error("[Colab Clicker] Erro ao reconciliar alarme:", replaceError.message);
                        }
                    });
                }
            });
        });
    });
}

function ensureDefaultSettings() {
    chrome.storage.local.get("reconnectEnabled", (result) => {
        const error = getRuntimeError();
        if (error) {
            console.error("[Colab Clicker] Erro ao recuperar configurações:", error.message);
            return;
        }

        if (result.reconnectEnabled === undefined) {
            chrome.storage.local.set({ reconnectEnabled: false }, () => {
                const storageError = getRuntimeError();
                if (storageError) {
                    console.error("[Colab Clicker] Erro ao definir configuração padrão:", storageError.message);
                }
            });
        }
    });
}

// Escuta mensagens do popup.js.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "START") {
        const requestedInterval = message.interval === undefined
            ? DEFAULT_INTERVAL_MINUTES
            : message.interval;
        startMonitoring(requestedInterval, sendResponse);
        return true;
    }

    if (message.action === "STOP") {
        stopMonitoring(sendResponse);
        return true;
    }

    return false;
});

// Recupera o estado depois que o navegador/service worker é inicializado.
chrome.runtime.onStartup.addListener(reconcileState);
chrome.runtime.onInstalled.addListener(() => {
    ensureDefaultSettings();
    reconcileState();
});

// Escuta o disparo do alarme.
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== ALARM_NAME) {
        return;
    }

    chrome.storage.local.get(["isRunning", "targetTabId"], (result) => {
        const error = getRuntimeError();
        if (error) {
            console.error("[Colab Clicker] Erro ao recuperar estado:", error.message);
            return;
        }

        if (result.isRunning && isValidTabId(result.targetTabId)) {
            console.log(`[Colab Clicker] Executando tentativa na aba ${result.targetTabId}.`);
            executeClickOnTargetTab(result.targetTabId);
            return;
        }

        reconcileState();
    });
});
