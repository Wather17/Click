// background.js - Service Worker da extensão

const ALARM_NAME = "colabClickerAlarm";

// Escuta mensagens do popup.js
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

        console.log(`[Colab Clicker] Iniciado. Clicando a cada ${interval} minutos.`);
        executeClickOnActiveTabs(); // Clica agora mesmo para iniciar
        sendResponse({ success: true });

    } else if (message.action === "STOP") {
        // Remove alarma e reseta estado
        chrome.alarms.clear(ALARM_NAME);
        chrome.storage.local.set({ isRunning: false });

        console.log("[Colab Clicker] Parado.");
        sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
});

// Escuta o disparo do alarme
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

// Função para injetar e executar o clique em todas as abas do Colab abertas
function executeClickOnActiveTabs() {
    chrome.tabs.query({ url: "https://colab.research.google.com/*" }, (tabs) => {

        // Formata hora do clique
        const now = new Date();
        const timeStr = now.toLocaleTimeString();

        // Salva visual para o popup pegar na abertura
        chrome.storage.local.set({ lastClickTime: timeStr });

        // Manda o evento pro popup, caso ele esteja aberto para refletir ao vivo
        chrome.runtime.sendMessage({ action: "CLICK_EXECUTED", time: timeStr }).catch(() => { });

        tabs.forEach((tab) => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            }).catch(err => console.error("[Colab Clicker] Erro ao injetar script:", err));
        });
    });
}
