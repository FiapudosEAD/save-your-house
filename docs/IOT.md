# Simulação de IoT

## Sensores

| Sensor | Código | O que mede | Unidade | Como influencia o sistema |
|---|---|---|---|---|
| Nível do rio (ultrassônico na margem) | `RIO-XXXX-01` | Altura da água acima do leito do rio ou córrego do bairro | cm | Comparado com a cota de transbordamento do bairro: 70% Atenção, 90% Alerta, 100% Emergência |
| Pluviômetro | `PLU-XXXX-01` | Intensidade da chuva | mm/h | 15 mm/h Atenção, 30 mm/h Alerta, 50 mm/h Emergência |

Cada um dos 5 bairros tem os dois sensores, somando 10.

## Fluxo

1. O sensor (simulado) envia `POST /api/leituras` com `{ codigoSensor, valor }` e o cabeçalho `X-API-Key`.
2. A API grava a leitura e recalcula o nível do bairro (regra em `docs/API_CONTRATO.md`).
3. Se o nível mudou, a API encerra o alerta anterior e cria um novo.
4. O app do cidadão consulta `GET /api/alertas?bairroId=X&ativos=true` a cada 5 s. Quando o risco sobe, mostra um aviso vermelho no topo e vibra o celular.

## Cenários

| Cenário | Rio (fração da cota) | Chuva | Resultado esperado |
|---|---|---|---|
| `NORMAL` | 40% | 2 mm/h | Normal |
| `CHUVA_FORTE` | 80% | 24 mm/h | Atenção |
| `ENCHENTE` | 108% | 62 mm/h | Emergência em cerca de 15 s |

A cada envio, o valor anda 35% em direção ao alvo do cenário, com um pequeno ruído. Assim o rio sobe aos poucos, como acontece de verdade (`src/iot/modeloSensores.js`).

## Duas formas de simular

**No app (painel ADMIN):** entre como `admin@alertabairro.com`, abra a aba **Sensores IoT**, toque em **Iniciar simulação** e escolha **Enchente** em um bairro. Funciona tanto no modo demonstração quanto com a API real.

**Por script (sem o app):** com a API do grupo rodando,

```bash
npm run iot -- --api http://localhost:8080 --cenario ENCHENTE --bairro 1
npm run iot -- --cenario NORMAL --vezes 5                 # volta ao normal
npm run iot -- --json leituras.json --cenario CHUVA_FORTE --vezes 3   # só gera um JSON de exemplo
```
