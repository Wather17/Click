// content.js - Executa a tentativa periódica de atividade no Colab

(function () {
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
})();
