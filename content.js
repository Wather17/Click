// content.js - Executa a tentativa periódica de atividade no Colab

(async function () {
    let reconnectEnabled = false;

    try {
        const settings = await chrome.storage.local.get("reconnectEnabled");
        reconnectEnabled = settings.reconnectEnabled === true;
    } catch (error) {
        console.warn("[Colab Clicker] Não foi possível ler a configuração de reconexão.", error);
    }

    if (reconnectEnabled) {
        const connectButton = document.querySelector("colab-connect-button");
        const reconnectTarget = connectButton && connectButton.shadowRoot
            ? connectButton.shadowRoot.querySelector("#connect")
            : null;

        if (reconnectTarget && isVisible(reconnectTarget) && !reconnectTarget.disabled) {
            try {
                reconnectTarget.click();
                console.log("[Colab Clicker] Tentativa de reconexão disparada.");
                return {
                    action: "reconnect",
                    outcome: "attempted",
                    reason: "connect-control-clicked"
                };
            } catch (error) {
                console.error("[Colab Clicker] Falha na reconexão:", error);
                return {
                    action: "reconnect",
                    outcome: "execution-error",
                    reason: error instanceof Error ? error.message : "unknown-error"
                };
            }
        }

        return {
            action: "reconnect",
            outcome: "reconnect-not-detected",
            reason: "visible-connect-control-not-found"
        };
    }

    const activityTarget = document.querySelector("colab-tab-layout-container");

    if (!activityTarget) {
        console.log("[Colab Clicker] Alvo de atividade não encontrado.");
        return {
            action: "periodic-click",
            outcome: "target-not-found",
            reason: "colab-tab-layout-container-not-found"
        };
    }

    try {
        const clickEvent = new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: 1,
            clientY: 1
        });

        activityTarget.dispatchEvent(clickEvent);
        console.log("[Colab Clicker] Tentativa periódica disparada.");

        return {
            action: "periodic-click",
            outcome: "attempted",
            reason: "activity-target-dispatched"
        };
    } catch (error) {
        console.error("[Colab Clicker] Falha na tentativa periódica:", error);

        return {
            action: "periodic-click",
            outcome: "execution-error",
            reason: error instanceof Error ? error.message : "unknown-error"
        };
    }

    function isVisible(element) {
        if (typeof element.getBoundingClientRect !== "function") {
            return false;
        }

        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }
})();
