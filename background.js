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

function startMonitoring(interval, sendResponse) {
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

            chrome.alarms.create(ALARM_NAME, {
                delayInMinutes: interval,
                periodInMinutes: interval
            }, () => {
                const alarmError = getRuntimeError();
                if (alarmError) {
                    chrome.storage.local.set({ isRunning: false }, () => {
                        sendResponse({
                            success: false,
                            error: {
                                code: "alarm-create-failed",
                                message: alarmError.message
                            }
                        });
                    });
                    return;
                }

                sendResponse({
                    success: true,
                    targetTabId: tab.id
                });
                executeClickOnTargetTab(tab.id);
            });
        });
    });
}

function stopMonitoring(sendResponse) {
    chrome.alarms.clear(ALARM_NAME, (wasCleared) => {
        const alarmError = getRuntimeError();
        if (alarmError) {
            sendResponse({
                success: false,
                error: {
                    code: "alarm-clear-failed",
                    message: alarmError.message
                }
            });
            return;
        }

        chrome.storage.local.set({
            isRunning: false,
            targetTabId: null
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

            sendResponse({ success: true, alarmCleared: wasCleared });
        });
    });
}

// Escuta mensagens do popup.js.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "START") {
        const interval = message.interval || 5;
        startMonitoring(interval, sendResponse);
        return true;
    }

    if (message.action === "STOP") {
        stopMonitoring(sendResponse);
        return true;
    }

    return false;
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
        }
    });
});
