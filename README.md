# ScarBot

Base moderna para bot Discord com suporte a comandos prefix e slash, MongoDB, sharding, blacklist global e monitoramento de memoria.

## Features

- Comandos prefix e slash carregados automaticamente por pasta
- Registro automatico de comandos slash no boot
- Persistencia com MongoDB (usuarios e servidores)
- Blacklist global por usuario
- Prefixo por servidor
- Logs via webhook (comandos, erros, servidores, blacklist e memoria)
- Sharding em producao
- Monitoramento de memoria com GC manual quando disponivel

## Stack

- Node.js (ESM)
- discord.js v14
- mongoose
- dotenv

## Requisitos

- Node.js 20+
- MongoDB (local ou Atlas)
- Bot Discord configurado no Developer Portal

## Instalacao

```bash
npm install
```

## Configuracao

O projeto carrega:

- `.env.development` quando `NODE_ENV=development`
- `.env` nos demais ambientes

Crie um arquivo `.env.development` para desenvolvimento local:

```env
# Obrigatorias
DISCORD_TOKEN=seu_token_do_bot
DATABASE_URL=sua_connection_string_mongodb
DEFAULT_PREFIX=!
MESSAGE_SWEEP_INTERVAL_SECONDS=300
MESSAGE_CACHE_LIFETIME_SECONDS=600

# Opcional (fallback: "database")
DATABASE_NAME=scarbot

# Webhooks opcionais para observabilidade
LOG_WEBHOOK_COMMANDS_URL=
LOG_WEBHOOK_ERRORS_URL=
LOG_WEBHOOK_BLACKLIST_URL=
LOG_WEBHOOK_MEMORY_URL=
LOG_WEBHOOK_GUILD_CREATE_URL=
LOG_WEBHOOK_GUILD_DELETE_URL=
```

### Variaveis obrigatorias em runtime

As seguintes variaveis sao exigidas na inicializacao do bot:

- `DISCORD_TOKEN`
- `DATABASE_URL`
- `MESSAGE_SWEEP_INTERVAL_SECONDS`
- `MESSAGE_CACHE_LIFETIME_SECONDS`

Tambem e **fortemente recomendado** definir:

- `DEFAULT_PREFIX`

## Scripts

- `npm run start`: inicia em modo producao com `shard.js` (sharding ativo)
- `npm run canary`: inicia em modo desenvolvimento (`NODE_ENV=development`) sem sharding

## Rodando localmente

1. Configure o `.env.development`
2. Execute:

```bash
npm run canary
```

Para simular producao:

```bash
npm run start
```

## Intents utilizados

O bot inicia com:

- `Guilds`
- `GuildMembers`
- `GuildMessages`
- `MessageContent`
- `GuildMessageReactions`
- `GuildModeration`
- `GuildExpressions`

Garanta que os intents privilegiados necessarios estejam habilitados no Developer Portal (especialmente `Message Content`, se seus comandos prefix dependem disso).

## Comandos atualmente implementados

### Prefix

- `setprefix` (alias: `changeprefix`)
  - Permissao necessaria: `ManageGuild`
  - Uso: `!setprefix ?`
- `blacklist <add/remove> <userId|@usuario> [motivo]`
  - Apenas dev (`devOnly`)
  - Blacklist global por usuario
- `botstatus [show]`
  - Apenas dev (`devOnly`)
  - Sem argumento: envia status tecnico por DM
  - Com `show`: envia status no canal

### Slash

- `/ping`
  - Retorna latencia do bot e da gateway

## Eventos e comportamento

- Ao mencionar o bot (`@Bot`), ele responde com o prefixo atual do servidor
- Ao entrar/sair de servidor, registra log por webhook e cria/remove dados de guild no banco
- Monitor de memoria roda a cada 60s e pode disparar alertas por webhook
- Interacoes de componentes (botao/select/modal) sao roteadas por loader dinamico

## Estrutura resumida

```text
src/
  commands/
    prefix/
      dev/
      utility/
    slash/
  events/
    client/
    discord/
  functions/
  handler/
  resources/configs/
  schemas/
  utils/
```

## Banco de dados

Colecoes principais:

- `Guilds`
  - `id`
  - `prefix`
  - `premium`
  - `blacklist`
- `Users`
  - `id`
  - `language`
  - `executedCommands`
  - `blacklist` (`isBanned`, `since`, `reason`)
  - `isSuspect`
  - `verified`

## Observabilidade

Se os webhooks forem configurados, o bot envia:

- Logs de comandos executados
- Alertas de memoria
- Eventos de entrada/saida de servidores
- Acoes de blacklist
- Erros de runtime

Sem webhook configurado, o bot continua funcionando normalmente e apenas faz aviso no console.

## Notas importantes

- Existe referencia a comando de ajuda na resposta de mencao (`help`), mas nao ha comando `help` implementado nesta base ainda.
- O arquivo `settings.json` controla cores, emojis, link de suporte e IDs de dev.

## Licenca

ISC
