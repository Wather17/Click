// content.js - Executa literalmente um clique na interface para manter vivo

(function () {
    console.log("[Colab Clicker] Tentando manter sessão ativa...");

    // Estratégia 1: Botão padrão de "Connect" (quando cai e pede reconexão)
    const connectButton = document.querySelector('colab-connect-button');
    if (connectButton && connectButton.shadowRoot) {
        const btn = connectButton.shadowRoot.querySelector('#connect');
        if (btn) {
            btn.click();
            console.log("[Colab Clicker] Cliquei no botão Reconnect/Connect.");
            return;
        }
    }

    // Estratégia 2: Ok button em diálogos de "Ainda está aí?"
    const dialogBtn = document.querySelector('mwc-button[dialogaction="ok"]');
    if (dialogBtn) {
        dialogBtn.click();
        console.log("[Colab Clicker] Cliquei no botão OK do diálogo ativo.");
        return;
    }

    // Estratégia 3: Clicar sutilmente em um elemento inofensivo no topo (Header)
    // para simplesmente simular atividade de mouse.
    const header = document.querySelector('colab-tab-layout-container') || document.body;
    if (header) {
        // Clica no canto (1,1) para não esbarrar em nenhum atalho.
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: 1,
            clientY: 1
        });
        header.dispatchEvent(clickEvent);
        console.log("[Colab Clicker] Clique de fallback (simulação de presença) disparado.");
    }
})();
