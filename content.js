// content.js - Executa ações para manter a sessão do Colab ativa

(function () {
    console.log("[Colab Clicker] Tentando manter sessão ativa...");

    // Estratégia 1: Botão de "Connect" — SÓ clica se estiver DESCONECTADO
    const connectButton = document.querySelector('colab-connect-button');
    if (connectButton && connectButton.shadowRoot) {
        const btn = connectButton.shadowRoot.querySelector('#connect');
        if (btn) {
            // Verifica o texto do botão para saber o estado real
            const btnText = btn.textContent.trim().toLowerCase();
            // Se o texto indica desconexão (connect, reconnect), clica
            // Se já está conectado (mostra RAM/Disco ou "Connected"), NÃO clica
            if (btnText === 'connect' || btnText === 'reconnect') {
                btn.click();
                console.log("[Colab Clicker] ✅ Cliquei no botão Reconnect/Connect (estava desconectado).");
                return;
            } else {
                console.log(`[Colab Clicker] ℹ️ Já conectado (botão: "${btnText}"). Pulando para fallback.`);
            }
        }
    }

    // Estratégia 2: Ok button em diálogos de "Ainda está aí?"
    const dialogBtn = document.querySelector('mwc-button[dialogaction="ok"]');
    if (dialogBtn) {
        dialogBtn.click();
        console.log("[Colab Clicker] ✅ Cliquei no botão OK do diálogo ativo.");
        return;
    }

    // Estratégia 3 (M2): Simular atividade real reconhecida pelo Colab
    // O Colab detecta inatividade via eventos de interação. Em background, 
    // MouseEvent sintéticos são ignorados. Scroll + teclado são mais eficazes.
    try {
        // 3a: Micro-scroll — o Colab monitora scroll como sinal de presença
        window.scrollBy(0, 1);
        window.scrollBy(0, -1);

        // 3b: Simular digitação no notebook para registrar atividade
        // O event.isTrusted será false, mas o Colab registra o listener
        document.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'Escape',
            code: 'Escape',
            keyCode: 27,
            bubbles: true,
            cancelable: true
        }));

        // 3c: Clicar no header como fallback adicional
        const header = document.querySelector('colab-tab-layout-container') || document.body;
        if (header) {
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: 1,
                clientY: 1
            });
            header.dispatchEvent(clickEvent);
        }

        console.log("[Colab Clicker] ✅ Fallback multi-estratégia (scroll + keypress + click) disparado.");
    } catch (e) {
        console.error("[Colab Clicker] ❌ Erro no fallback:", e);
    }
})();
