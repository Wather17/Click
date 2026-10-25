# Contribuindo

Obrigado por contribuir com o Colab Clicker.

## Antes de começar

- Leia o README e as limitações do projeto.
- Não inclua credenciais, tokens, dados de notebooks ou conteúdo pessoal em issues e pull requests.
- Mudanças no DOM do Colab precisam de evidência e testes de fixture.

## Ambiente

- Node.js 20 ou superior;
- Python 3;
- Bash.

## Validação local

Execute:

```bash
npm test
npm run validate
```

## Pull requests

- Descreva o problema e o comportamento esperado.
- Mantenha cada PR em um escopo pequeno.
- Adicione testes para sucesso, erro e casos de borda.
- Não adicione permissões de extensão sem justificar o impacto.
- Não transforme uma tentativa sintética em promessa de sessão garantida.

## Issues

Inclua navegador, versão, passos de reprodução, logs relevantes e o resultado esperado. Para mudanças de seletor, inclua o estado visual do Colab que foi observado sem publicar dados de notebooks.
