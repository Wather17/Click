# Extensão Colab Clicker

Uma extensão para navegador (Chrome/Edge) simples e direta que mantém sessões do Google Colab ativas simulando cliques na interface e garantindo que os scripts rodem por horas sem interrupções de ociosidade (idle timeout).

## Proposta de Valor
Evita a desconexão por inatividade de notebooks do Colab durante execuções longas sem a necessidade de reescrever códigos na célula ou manter a aba sempre em foco manual.

## Estrutura Atual
- `manifest.json`: Definições da extensão.
- `popup.html` / `popup.js`: Interface com botões de Iniciar/Parar.
- `content.js`: O script que será injetado e rodará isolado na aba do Colab para fazer os cliques.
- `background.js` (se necessário): Para gerenciar o estado global da extensão.
