# TechOS - Gerenciador de Assistência Técnica

Projeto Integrador da UC5 — **Tema 9: Gerenciador de Ordens de Serviço**.

Aplicativo desktop para uma assistência técnica cadastrar clientes, os
equipamentos que cada cliente leva para conserto, abrir e acompanhar ordens de
serviço (OS), e consultar o faturamento com base nas OS finalizadas.

## Funcionalidades

- **Clientes**: cadastrar, listar, editar e excluir.
- **Equipamentos**: cadastrar (vinculado a um cliente), listar, editar e
  excluir. Lista de marcas atendidas pela assistência.
- **Ordens de serviço**: abrir (vinculada a um equipamento), listar, avançar o
  status (`aberta` → `em andamento` → `finalizada`, com valor cobrado
  informado ao finalizar), excluir. Filtro por cliente e por status.
- **Relatório de faturamento**: soma das OS finalizadas, com filtro por
  período. Inclui uma busca por cliente nas OS finalizadas, com destaque do
  termo encontrado e um filtro adicional que atua sobre a lista já carregada
  (sem nova consulta ao banco).
- **Tratamento de erros**: toda operação que toca o banco tem retorno
  padronizado (`{ sucesso, dados, erro }`), com mensagens específicas para
  dado inválido, registro vinculado (ex: cliente com equipamento cadastrado) e
  falha de conexão — nunca uma mensagem crua do Postgres na tela.

## Stack

- Electron + Vite + TypeScript (modo estrito, sem `any`)
- PostgreSQL via [Neon](https://neon.tech), acessado só pelo processo Main
  através do driver `pg`
- Empacotamento com `electron-builder` (instalador NSIS para Windows)

## Modelo de dados

Três tabelas relacionadas por chave estrangeira (`REFERENCES ... ON DELETE
RESTRICT`, para nunca perder histórico apagando um cliente ou equipamento que
ainda tem registros vinculados). O schema completo está versionado em
[`sql/schema.sql`](sql/schema.sql) — rode esse arquivo no seu banco antes de usar o
app pela primeira vez.

A listagem de ordens de serviço faz um `JOIN` real entre as três tabelas
(`ordens_servico` → `equipamentos` → `clientes`), trazendo nome do cliente,
marca e modelo do equipamento numa consulta só — nada de cruzar tabelas
manualmente no Renderer.

## Como rodar

### Modo desenvolvimento

```bash
npm install
```

Crie um arquivo `.env` na raiz do projeto com a connection string do seu banco
Neon:

```
DATABASE_URL=postgresql://usuario:senha@host/banco?sslmode=require
```

Rode [`sql/schema.sql`](sql/schema.sql) nesse banco (pelo DBeaver, pelo SQL Editor do
Neon, ou por qualquer cliente Postgres), depois:

```bash
npm run dev
```

### Gerar o instalador

```bash
npm run build
```

Gera o instalador NSIS em `release/TechOS - Gerenciador de Assistência Técnica
Setup <versão>.exe`. O instalador **não** inclui o `.env` (por segurança) —
depois de instalar, é necessário colocar um arquivo `.env` com a
`DATABASE_URL` na mesma pasta onde o app foi instalado para ele conseguir se
conectar ao banco.

## Telas

**Clientes**

![Tela de Clientes](prints/clientes.png)

**Equipamentos**

![Tela de Equipamentos](prints/equipamentos.png)

**Ordens de Serviço**

![Tela de Ordens de Serviço](prints/ordens-servico.png)

**Relatório de Faturamento**

![Tela de Relatório](prints/relatorio.png)

## Arquitetura

O Renderer nunca acessa o banco nem conhece a string de conexão — toda
comunicação passa pelo `preload.ts` via `contextBridge`, chamando canais IPC
expostos pelo processo Main (`contextIsolation: true`, `nodeIntegration:
false`). Todo SQL fica em `src/main.ts` e `src/db.ts`.

## Histórico de manutenção

O arquivo [`erros.log`](erros.log) documenta os problemas reais encontrados
durante a construção do app (sintoma, causa e correção), para consulta rápida
em manutenções futuras.

## Autor

Andréllv
