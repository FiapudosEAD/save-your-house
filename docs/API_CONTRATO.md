# Contrato da API do AlertaBairro

O app consome estas rotas. O **modo demonstração** do app (`src/api/mock/servidorSimulado.js`) implementa exatamente este contrato, então a API Java/Spring ou C#/ASP.NET do grupo deve seguir os mesmos caminhos, campos e status HTTP para o app funcionar sem mudar nada.

Base: `http://HOST:8080`. Corpo sempre em JSON. Rotas marcadas com 🔒 exigem `Authorization: Bearer <token>`.

## Formato de erro (todas as rotas)

```json
{ "status": 400, "mensagem": "Dados inválidos. Revise os campos.", "erros": { "rua": "Informe a rua (3 a 120 caracteres)." } }
```

O app mostra `mensagem` em um aviso e `erros.<campo>` embaixo de cada campo do formulário.

## Entidades (recursos)

| Entidade | Campos principais |
|---|---|
| **Usuario** | id, nome, email, senhaHash, perfil (`ADMIN` \| `CIDADAO`), bairroId (FK) |
| **Bairro** | id, nome, cidade, zona, corpoHidrico, cotaTransbordamentoCm, nivelAlerta |
| **Sensor** | id, codigo (único), tipo (`NIVEL_RIO` \| `PLUVIOMETRO`), unidade, descricao, ativo, bairroId (FK) |
| **Leitura** | id, sensorId (FK), valor, registradaEm |
| **Alerta** | id, bairroId (FK), nivel (`ATENCAO` \| `ALERTA` \| `EMERGENCIA`), origem (`SENSOR` \| `REPORTE`), mensagem, ativo, criadoEm, encerradoEm |
| **Reporte** | id, usuarioId (FK), bairroId (FK), rua, gravidade (`CALCADA` \| `CANELA` \| `JOELHO` \| `CINTURA`), descricao, status (`PENDENTE` \| `CONFIRMADO` \| `RESOLVIDO`), criadoEm, atualizadoEm |
| **ConfirmacaoReporte** | reporteId (FK), usuarioId (FK), criadoEm. PK composta: um cidadão confirma cada reporte uma vez |

Relações: Bairro 1:N Sensor, Sensor 1:N Leitura, Bairro 1:N Alerta, Bairro 1:N Reporte, Usuario 1:N Reporte, Usuario N:N Reporte (por ConfirmacaoReporte), Bairro 1:N Usuario.

## Autenticação e usuários

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{ email, senha }` | 200 `{ token, tipo: "Bearer", usuario }` | 400 campos vazios, 401 "E-mail ou senha incorretos." |
| POST | `/api/usuarios` | `{ nome, email, senha, bairroId }` | 201 `usuario` | 400 validação, 409 e-mail já existe |
| GET 🔒 | `/api/usuarios/me` | | 200 `usuario` | 401 |
| PUT 🔒 | `/api/usuarios/me` | `{ nome?, bairroId? }` | 200 `usuario` | 400, 401 |

`usuario` = `{ id, nome, email, perfil, bairroId }` e **nunca** inclui a senha ou o hash. O cadastro público sempre cria `CIDADAO`, mesmo que o corpo mande outro perfil. Senha: mínimo de 8 caracteres, com letras e números, guardada com BCrypt.

## Bairros e alertas

| Método | Rota | Sucesso |
|---|---|---|
| GET | `/api/bairros` | 200 `[ { ...bairro, alertasAtivos: 1, reportesAbertos: 2 } ]` |
| GET | `/api/bairros/{id}` | 200 `{ ...bairro, sensores: [sensorComLeitura], alertasAtivos: [alerta], reportes: [reporte] }` ou 404 |
| GET | `/api/alertas?bairroId=1&ativos=true` | 200 `[ { ...alerta, bairroNome } ]`, do mais novo para o mais antigo |

## Sensores e leituras (IoT)

| Método | Rota | Corpo / cabeçalho | Sucesso | Erros |
|---|---|---|---|---|
| GET | `/api/sensores?bairroId=1` | | 200 `[sensorComLeitura]` | |
| GET | `/api/sensores/{id}/leituras?limite=20` | | 200 `[ { id, sensorId, valor, registradaEm, nivel } ]`, mais nova primeiro | 404 |
| POST | `/api/leituras` | `X-API-Key: <chave>` + `{ codigoSensor, valor }` | 201 `{ ...leitura, nivel, nivelBairro }` | 401 chave inválida, 404 sensor, 400 valor fora da faixa |

`sensorComLeitura` = `{ id, codigo, tipo, unidade, descricao, ativo, bairroId, bairroNome, limite, ultimaLeitura: { valor, registradaEm, nivel } }`, em que `limite` é a cota do bairro para `NIVEL_RIO` e `null` para pluviômetro.

Os sensores não fazem login de usuário: enviam a chave do dispositivo no cabeçalho `X-API-Key` (padrão de demonstração `iot-demo-key`). Faixas aceitas: rio de 0 a 2000 cm, chuva de 0 a 300 mm/h.

### Regra de alerta (AlertaService)

A cada leitura nova, e a cada mudança de status ou confirmação de reporte, a API recalcula o nível do bairro:

- **Nível do rio** em relação à cota de transbordamento: ≥ 70% `ATENCAO`, ≥ 90% `ALERTA`, ≥ 100% `EMERGENCIA`.
- **Chuva**: ≥ 15 mm/h `ATENCAO`, ≥ 30 mm/h `ALERTA`, ≥ 50 mm/h `EMERGENCIA`.
- **Reportes `CONFIRMADO` nas últimas 2 h**: ≥ 2 `ATENCAO`, ≥ 4 `ALERTA`.
- O nível do bairro é o **maior** dos três. Se mudou, a API encerra os alertas ativos (`ativo=false`, `encerradoEm=agora`) e, se o novo nível não for `NORMAL`, cria um alerta novo.

A mesma regra está em `src/utils/nivel.js`.

## Reportes de ruas alagadas

| Método | Rota | Corpo | Sucesso | Erros |
|---|---|---|---|---|
| GET 🔒 | `/api/reportes?bairroId=1&meus=true` | | 200 `[reporte]` | 401 |
| GET 🔒 | `/api/reportes/{id}` | | 200 `reporte` | 404 |
| POST 🔒 | `/api/reportes` | `{ bairroId, rua, gravidade, descricao? }` | 201 `reporte` (status `PENDENTE`) | 400 |
| PUT 🔒 | `/api/reportes/{id}` | `{ bairroId, rua, gravidade, descricao? }` | 200 `reporte` | 400, 403 se não for o autor nem ADMIN, 404 |
| PUT 🔒 | `/api/reportes/{id}/status` | `{ status }` | 200 `reporte` | 403: só ADMIN muda status; o autor pode marcar `RESOLVIDO` |
| POST 🔒 | `/api/reportes/{id}/confirmacoes` | | 201 `reporte` | 400 próprio reporte ou já resolvido, 409 já confirmou |
| DELETE 🔒 | `/api/reportes/{id}` | | 204 | 403 se não for o autor nem ADMIN, 404 |

`reporte` = `{ id, bairroId, bairroNome, rua, gravidade, descricao, status, autorNome, usuarioId, totalConfirmacoes, confirmadoPorMim, criadoEm, atualizadoEm }`.

Com **2 confirmações** de outros cidadãos, um reporte `PENDENTE` passa para `CONFIRMADO` automaticamente. `rua` e `descricao` passam por remoção de tags HTML antes de salvar, como proteção contra XSS.

## Carga inicial usada no modo demonstração

- Bairros: Jardim Pantanal (cota 400 cm), Jardim Romano (380), Vila Itaim (250), Parque Novo Mundo (420), Vila Prudente (220).
- Sensores: `RIO-PANT-01`, `PLU-PANT-01`, `RIO-ROMA-01`, `PLU-ROMA-01`, `RIO-ITAI-01`, `PLU-ITAI-01`, `RIO-NMUN-01`, `PLU-NMUN-01`, `RIO-PRUD-01`, `PLU-PRUD-01`.
- Usuários: `admin@alertabairro.com` / `Admin@123` (ADMIN), `maria@email.com` / `Maria@123` e `joao@email.com` / `Joao@123` (CIDADAO, Jardim Pantanal).

Use a mesma carga nos INSERTs do script `.sql` para o app e a API mostrarem os mesmos dados.
