// background.js - Service Worker da extensão

const ALARM_NAME = "colabClickerAlarm";

// =============================================
// SISTEMA DE LOG PERSISTENTE (M3)
// =============================================
function logAction(action, detail) {
    chrome.storage.local.get(['clickLog'], (result) => {
        const log = result.clickLog || [];
        log.push({
            time: new Date().toISOString(),
            action,
            detail
        });
        // Manter apenas os últimos 50 registros
        if (log.length > 50) log.splice(0, log.length - 50);
        chrome.storage.local.set({ clickLog: log });
    });
}

// =============================================
// ESCUTA MENSAGENS DO POPUP
// =============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "START") {
        const interval = message.interval || 5;

        // Salva estado
        chrome.storage.local.set({ isRunning: true, intervalMinutes: interval });

        // Cria o alarme
        chrome.alarms.create(ALARM_NAME, {
            delayInMinutes: interval,
            periodInMinutes: interval
        });

        logAction("START", `Intervalo: ${interval} min`);
        console.log(`[Colab Clicker] Iniciado. Clicando a cada ${interval} minutos.`);
        executeClickOnActiveTabs(); // Clica agora mesmo para iniciar
        sendResponse({ success: true });

    } else if (message.action === "STOP") {
        // Remove alarme e reseta estado
        chrome.alarms.clear(ALARM_NAME);
        chrome.storage.local.set({ isRunning: false });

        logAction("STOP", "Extensão parada pelo usuário");
        console.log("[Colab Clicker] Parado.");
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});

// =============================================
// ESCUTA O DISPARO DO ALARME
// =============================================
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
        chrome.storage.local.get(['isRunning'], (result) => {
            if (result.isRunning) {
                console.log("[Colab Clicker] Alarme disparou. Executando clique...");
                executeClickOnActiveTabs();
            }
        });
    }
});

// =============================================
// INJEÇÃO DE SCRIPT NAS ABAS DO COLAB (M1 + M3)
// =============================================
function executeClickOnActiveTabs() {
    chrome.tabs.query({ url: "https://colab.research.google.com/*" }, (tabs) => {

        // Formata hora do clique
        const now = new Date();
        const timeStr = now.toLocaleTimeString();

        // Salva visual para o popup pegar na abertura
        chrome.storage.local.set({ lastClickTime: timeStr });

        // Manda o evento pro popup, caso ele esteja aberto para refletir ao vivo
        chrome.runtime.sendMessage({ action: "CLICK_EXECUTED", time: timeStr }).catch(() => { });

        if (tabs.length === 0) {
            logAction("WARN", "Nenhuma aba do Colab encontrada");
            console.warn("[Colab Clicker] Nenhuma aba do Colab aberta.");
            return;
        }

        tabs.forEach((tab) => {
            // M1: Detectar aba descartada pelo Memory Saver do Brave/Chrome
            if (tab.discarded) {
                logAction("RELOAD", `Aba ${tab.id} descartada pelo navegador. Recarregando...`);
                console.warn(`[Colab Clicker] Aba ${tab.id} descartada. Recarregando...`);
                chrome.tabs.reload(tab.id).catch(err => {
                    logAction("ERROR", `Falha ao recarregar aba ${tab.id}: ${err.message}`);
                });
                return; // Pula injeção nessa iteração — o content.js rodará após reload
            }

            // Injeta o content script
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }).then(() => {
                logAction("CLICK", `Injeção OK na aba ${tab.id}`);
            }).catch(err => {
                logAction("ERROR", `Falha na injeção (aba ${tab.id}): ${err.message}`);
                console.error("[Colab Clicker] Erro ao injetar script:", err);
            });
        });
    });
}
