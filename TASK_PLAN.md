# Plano de Tarefa: Flatten da estrutura do projeto

## Objetivo
Mover todo o conteúdo de `app/` para a raiz do repositório, corrigir referências quebradas, garantir que `yarn build` e `yarn lint` continuem passando, e integrar a branch `project-router` na `main` com push.

## Perguntas de clarificação (a responder)
1. A branch principal é `main` (confirmado por `git branch -a`).
2. O histórico de commits existente deve ser preservado (sim, merge comum).
3. O README raiz deve ser reescrito para refletir a nova estrutura flattenada.

## Passos
1. Mover arquivos de `app/` para a raiz (preservando `.gitignore`, `package.json`, `vite.config.ts`, etc.).
2. Atualizar `.gitignore` da raiz para incluir regras que estavam em `app/.gitignore`.
3. Remover pasta `app/` vazia.
4. Atualizar `README.md` da raiz para refletir a nova estrutura e comandos.
5. Verificar e corrigir caminhos relativos em scripts e configs.
6. Rodar `yarn install`, `yarn lint`, `yarn build`.
7. Atualizar skills afetadas (`working-in-cadernia`) para refletir que comandos agora rodam na raiz.
8. Commit.
9. Checkout `main`, merge `project-router`, push.

## Critérios de aceitação
- [ ] Não existe mais pasta `app/`.
- [ ] `yarn lint` passa.
- [ ] `yarn build` passa.
- [ ] README raiz descreve a estrutura flattenada.
- [ ] Merge realizado na `main` e push feito.
