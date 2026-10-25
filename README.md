# Colab Clicker

Extensão Chromium de código aberto que faz tentativas periódicas de atividade em uma aba autorizada do Google Colab.

O projeto é uma ferramenta de melhor esforço. Ele não garante que o Colab aceite eventos sintéticos, não impede limites de uso e não substitui as políticas ou os mecanismos de desconexão do Google Colab.

## Estado do projeto

O projeto está em pré-lançamento. A primeira versão pública planejada é a `0.1.0`.

## O que a extensão faz

- Captura a aba ativa do Colab no momento em que o monitoramento é iniciado.
- Executa tentativas periódicas somente nessa aba.
- Permite configurar um intervalo inteiro entre 1 e 60 minutos.
- Mostra o resultado de cada tentativa no popup.
- Oferece reconexão opcional somente quando o controle seguro do Colab é identificado.

Por padrão, a reconexão fica desligada e o comportamento principal é o clicker periódico.

## Limitações importantes

- Eventos criados por JavaScript podem não ser considerados atividade real pelo navegador ou pelo servidor.
- A extensão não usa a permissão `debugger` nem simula entrada física do usuário.
- O DOM do Colab pode mudar sem aviso; quando um alvo não é reconhecido, a extensão registra um resultado de não detecção e não clica em elementos genéricos.
- Fechar a aba autorizada não faz o monitoramento migrar para outra aba.
- O estado “tentativa enviada” não significa que a sessão permaneceu conectada.

## Instalação para desenvolvimento

1. Clone ou extraia este repositório.
2. Abra `chrome://extensions` no Chrome ou a página equivalente no Edge.
3. Ative o modo de desenvolvedor.
4. Clique em **Load unpacked** / **Carregar sem compactação**.
5. Selecione a pasta que contém o `manifest.json` na raiz.

O ZIP de release deve ser extraído antes de usar **Load unpacked**. O ZIP é o artefato de distribuição para lojas e releases; o carregamento local usa a pasta.

## Uso

1. Abra um notebook em `https://colab.research.google.com/`.
2. Deixe esse notebook como a aba ativa.
3. Abra o popup da extensão.
4. Escolha o intervalo e clique em **Iniciar**.
5. Ative a opção de reconexão somente se quiser habilitar esse comportamento separado.
6. Use **Parar** para remover o alarme e encerrar o monitoramento.

O popup informa a aba monitorada, o próximo ciclo, a última tentativa e o resultado observado.

## Dados e privacidade

A extensão não possui servidor próprio, analytics ou coleta remota. O estado operacional é salvo em `chrome.storage.local`, no perfil local do navegador. Isso pode incluir:

- estado ligado/desligado;
- intervalo escolhido;
- id da aba autorizada;
- configuração de reconexão;
- resultado e horário da última tentativa.

A permissão de host é limitada a `https://colab.research.google.com/*` porque a extensão precisa executar o script apenas no Colab.

Consulte também [`PRIVACY.md`](PRIVACY.md).

## Desenvolvimento

Requisitos:

- Node.js 20 ou superior;
- Python 3 para validar JSON;
- Bash para os scripts do projeto.

Comandos:

```bash
npm test
npm run validate
```

O projeto não exige dependências npm externas neste momento.

## Release

As versões seguem o formato semântico no `manifest.json` e nas tags Git. Para criar um release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

A workflow de release valida o projeto, gera `colab-clicker-v0.1.0.zip` com o `manifest.json` na raiz, cria `SHA256SUMS` e publica os dois arquivos no GitHub Release. O envio para lojas de extensões é uma etapa manual separada.

## Estrutura

- `manifest.json`: capacidades e metadados da extensão.
- `background.js`: estado, alarme e injeção no alvo autorizado.
- `content.js`: tentativa periódica e modo opt-in de reconexão.
- `core.js`: regras puras compartilhadas e testáveis.
- `popup.html` / `popup.js`: interface e observabilidade.
- `tests/`: testes sem dependência de uma sessão real do Colab.
- `scripts/`: validação e automação do projeto.

## Troubleshooting

### “Abra uma aba do Google Colab antes de iniciar”

Deixe uma aba do Colab ativa antes de clicar em **Iniciar**. A extensão não escolhe outra aba automaticamente.

### “Alvo não encontrado”

O layout do Colab pode ter mudado ou ainda não estar pronto. A extensão não usa `document.body` nem confirma diálogos genéricos como fallback.

### A sessão desconectou mesmo com a extensão ativa

Isso é possível e esperado dentro das limitações do projeto. O status indica que uma tentativa foi enviada, não que o backend do Colab aceitou a atividade.

## Contribuição

Leia [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de abrir uma issue ou pull request.

## Licença

Distribuído sob a licença MIT. Consulte [`LICENSE`](LICENSE).
