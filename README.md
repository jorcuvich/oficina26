# Oficina de Impacto

Guia interativo de 14 etapas que leva o aluno do problema socioambiental até o site publicado.

Três arquivos, sem dependência nenhuma. Não precisa de build, de Node, de npm nem de servidor. É só hospedar a pasta.

```
index.html    a página
style.css     as cores e o layout
script.js     o comportamento e os geradores de código
```

A única coisa que vem de fora são as fontes do Google Fonts. Se a escola bloquear esse domínio, a página continua funcionando com as fontes do sistema.

---

## Publicar no GitHub Pages

1. Entre em `github.com` e faça login.
2. Clique no `+` do canto superior direito e escolha **New repository**.
3. Em **Repository name**, escreva `oficina-de-impacto` (minúsculo, com hífen).
4. Marque **Public**. Precisa ser público para o site funcionar no plano gratuito.
5. Não marque nenhuma das caixas de baixo. Clique em **Create repository**.
6. Na tela que abrir, clique no link **uploading an existing file**.
7. Arraste os três arquivos (`index.html`, `style.css`, `script.js`) para a área de upload. Arraste os arquivos soltos, não a pasta.
8. Espere a barra de progresso terminar, role a página e clique em **Commit changes**.
9. Clique na aba **Settings**, no topo do repositório.
10. No menu da esquerda, seção **Code and automation**, clique em **Pages**.
11. Em **Source**, escolha **Deploy from a branch**. Em **Branch**, escolha **main** e deixe a pasta em **/ (root)**. Clique em **Save**.
12. Espere de 1 a 3 minutos e atualize a página. Aparece o endereço:

```
https://SEU-USUARIO.github.io/oficina-de-impacto/
```

Esse é o link que você passa para os alunos.

### Atualizar depois

Repositório, **Add file**, **Upload files**, arraste o arquivo novo, **Commit changes**. Um minuto depois o site já está atualizado. Se a mudança não aparecer, atualize com `Ctrl + F5`.

---

## Alternativa mais rápida: Netlify

Se quiser o link no ar em dois minutos, sem criar repositório: abra `app.netlify.com/drop` e arraste a pasta inteira. Depois clique em **Claim** para criar a conta gratuita e tornar o link permanente. Em **Site configuration** você troca o endereço para algo apresentável.

---

## Onde ficam os dados dos alunos

Tudo que o aluno preenche (Canvas, campos, progresso, checklists) fica no `localStorage` do navegador dele, naquele aparelho. Nada é enviado para lugar nenhum e você não tem acesso às respostas.

Consequências práticas para avisar a turma:

- Trocar de computador significa preencher de novo. A página tem um botão que copia o resumo do projeto; oriente a guardar esse texto.
- Limpar dados de navegação apaga tudo.
- Aba anônima não guarda nada depois de fechada.

---

## O que o aluno consegue fazer na página

- Preencher o Canvas de Impacto e escolher o ODS
- Montar os campos da ficha do sistema dele
- Receber os cinco prompts de IA já preenchidos com os dados do projeto dele
- Ver o `index.html`, o `style.css` e o `script.js` do projeto dele gerados na hora
- Baixar tudo isso como um `.zip` pronto para descompactar e usar
- Marcar o progresso nas 14 etapas
- Usar o solucionador de erros por sintoma
- Copiar o resumo final do projeto

O `.zip` é montado no próprio navegador, sem biblioteca externa. O projeto que sai dele tem cadastro, busca, filtro, painel de números, apagar, exportar e importar dados em JSON.

---

## Personalizar

**Cores:** todas estão no bloco `:root`, no começo do `style.css`.

**Prazos, nomes, regras da sua escola:** procure no `index.html` pela seção que quer mudar. O HTML está comentado por etapa, no formato `<!-- ============ 7 ============ -->`.

**Textos dos prompts:** ficam no `script.js`, nas funções `prompt1` até `prompt5`.

**Itens das checklists:** no `script.js`, nas listas `ITENS_TESTE` e `ITENS_ENTREGA`.

**Sintomas do solucionador de erros:** no `script.js`, na lista `ERROS`.
