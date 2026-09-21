# CanaGest

Gestão de fazendas de cana-de-açúcar: cadastro de **fazendas**, divisão em **talhões**, cadastro de **usinas** e registro de **colheitas** com remuneração e despesas. PWA instalável, pensado para rodar no celular e no computador.

| | |
|---|---|
| **Stack** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| **Banco de dados** | PostgreSQL — Neon (nuvem), via Prisma 7 + adapter Neon |
| **Validação** | Zod 4 |
| **Deploy** | Vercel (recomendado) |

## Funcionalidades

- Fazendas: nome. A área total é calculada automaticamente pela soma dos talhões.
- Talhões: identificação (ex.: T-01) e área informada em hectares ou tarefas (1 ha = 3,3 tarefas), exibida nas duas unidades.
- Usinas: cadastro com **modelo de remuneração** — **Pindorama** (preço da cana R$/t + ágio) ou **Coruripe** (ATR: kg ATR/t × preço do kg de ATR).
- Colheitas por fazenda (a usina reporta por fazenda; o talhão é só cadastro de área): data, tipo de corte, toneladas e **área colhida** em tarefas.
- Despesas: **CTC** (informado pela usina), **arrendamento** calculado (t/tarefa × preço da cana × tarefas), **adubo** calculado (sacos/tarefa conforme o corte × preço da tonelada), **herbicida** (itens da calda), **outros insumos** (calcário, pó de rocha, biológico, vinhaça…) e **despesas com a usina** — todas como listas dinâmicas de itens.
- Cálculo de resultado por colheita: receita, CTC, arrendamento, insumos, despesas e lucro (por colheita e por tonelada), calculado ao vivo no formulário.
- Lista de colheitas com filtros (fazenda, usina, tipo e período) e resumo dos totais.
- Relatórios completos com gráficos: toneladas por safra e por fazenda, destaques (maior/menor safra, maior/menor produtividade, maior/menor lucro), composição das despesas, comparativo por fazenda e botão de imprimir/PDF.
- Painel com resumo da safra: fazendas, talhões, área (ha e tarefas), total colhido e financeiro (receita, despesas, lucro e lucro/t).
- Produtividade calculada (t/ha) por talhão e por fazenda.
- PWA instalável com suporte offline: cache de navegação e recursos estáticos.

## Configuração local

Pré-requisitos: Node.js 20+ e uma conta no [Neon](https://neon.tech).

1. **Crie o banco no Neon**

   No console do Neon, crie um projeto e uma branch `main`. Copie as strings de conexão:

   - `DATABASE_URL` — pooled connection (para o app).
   - `DATABASE_URL_UNPOOLED` — conexão direta (para o Prisma CLI, migrations/seed com psql).

2. **Instale as dependências**

   ```bash
   npm install --legacy-peer-deps
   ```

   > Nota: use `--legacy-peer-deps` — o npm desta máquina apresenta um bug no resolver de dependências (arborist).

3. **Configure o ambiente**

   ```bash
   cp .env.example .env
   ```

   Preencha `DATABASE_URL` e `DATABASE_URL_UNPOOLED` no `.env` com as strings do Neon.

4. **Gere o client Prisma, crie as tabelas e popular dados de exemplo**

   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Rode o app**

   ```bash
   npm run dev
   ```

   Acesse `http://localhost:3000`.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Server de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Roda o build |
| `npm run typecheck` | TypeScript sem emitir arquivos |
| `npm run lint` | ESLint |
| `npm run db:push` | Sincroniza o schema no banco |
| `npm run db:seed` | Insere dados de exemplo |
| `npm run db:studio` | Prisma Studio |
| `npm run icons` | Regenera os ícones PNG do PWA |
| `npm run check:ui` | Checa layout/console (390px e 1440px) com Playwright |
| `npm run check:e2e` | Testa o CRUD completo (fazenda → talhão → colheita → excluir) |
| `npx tsx scripts/calc-check.ts` | Confere os cálculos de remuneração (Pindorama/Coruripe) |
| `npx tsx scripts/seed-usinas.ts` | Garante as usinas padrão (Pindorama e Coruripe) no banco |

> `check:ui` e `check:e2e` precisam de um servidor rodando (`npm run build` + `npm run start -p 3210`, ou ajuste `BASE_URL`). Usam o Edge instalado (`channel: "msedge"`).

## Deploy na Vercel

1. Suba o projeto para um repositório Git e importe-o na [Vercel](https://vercel.com).
2. Framework preset: **Next.js** (detectado automaticamente).
3. Adicione as variáveis de ambiente `DATABASE_URL` e `DATABASE_URL_UNPOOLED` no projeto.
4. No Neon, **libere o acesso à Vercel** (opção "Connect to Vercel") ou permita os IPs/Vercel regions na rede do banco. Isso evita erros de conexão no deploy e nas serverless functions.
5. Deploy. O `postinstall` (`prisma generate`) roda automaticamente no build — não é preciso um banco no momento do build, pois as páginas são `force-dynamic`.

## Offline e instalação

- `app/manifest.ts` gera o manifest; ícones em `public/` são gerados por `scripts/generate-icons.mjs` (`npm run icons`).
- O service worker estático `public/sw.js` faz cache-first de recursos estáticos e caching de navegação com fallback offline.
- Para instalar: no Chrome/Edge, use o ícone de instalar na barra do app; no iOS/Safari, "Adicionar à Tela de Início".

## Estrutura

```
prisma/            schema, config e seed
scripts/           geração de ícones
src/app/           páginas (App Router)
src/components/    UI (shell, forms, estados vazios, etc.)
src/lib/           db, server actions, validação, formatação
src/generated/     client Prisma (gerado, não versionado)
```