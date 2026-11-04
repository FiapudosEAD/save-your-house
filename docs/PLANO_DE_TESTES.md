# Plano de testes do app e das regras

## Testes automatizados (rodam com `npm test`)

Validam o contrato da API e as regras de negócio pelo servidor simulado. Os mesmos casos servem de roteiro para testar a API Java/C# no Postman ou no Swagger.

| ID | Cenário | Entrada | Saída esperada | Status |
|---|---|---|---|---|
| CT01 | Login válido | `maria@email.com` / `Maria@123` | 200, token, perfil CIDADAO, sem `senhaHash` | Passou |
| CT02 | Login com senha errada | senha `errada` | 401 "E-mail ou senha incorretos." | Passou |
| CT03 | Cadastro inválido e duplicado | nome "A", e-mail "x", senha "123"; depois e-mail já existente | 400 com erro em cada campo; 409 | Passou |
| CT04 | Cadastro tentando virar ADMIN | `perfil: "ADMIN"` no corpo | 201 com perfil CIDADAO | Passou |
| CT05 | Rota protegida sem token | GET `/api/reportes?meus=true` | 401 | Passou |
| CT06 | Reporte com HTML e campos inválidos | `rua: "<script>alert(1)</script>Rua A"` | 400 para inválidos; 201 com tags removidas | Passou |
| CT07 | Cidadão altera reporte de outro | PUT/DELETE no reporte 1 como Maria | 403; ADMIN exclui com 204 | Passou |
| CT08 | Leitura sem chave do sensor | POST `/api/leituras` sem `X-API-Key` | 401 | Passou |
| CT09 | Leitura fora da faixa | `valor: -5` | 400 | Passou |
| CT10 | Chuva forte gera alerta | PLU-PANT-01 = 35 mm/h | 201, bairro em ALERTA, 1 alerta ativo | Passou |
| CT11 | Rio transborda e depois baixa | RIO-PANT-01 = 410, depois 150 | EMERGENCIA, depois NORMAL sem alerta ativo | Passou |
| CT12 | Confirmação de vizinhos | 2 confirmações, repetição e confirmação do próprio autor | 201, 409, CONFIRMADO, 400 | Passou |
| CT13 | Limites e hash | chuva 10/15/55, rio 280/360 de 400, SHA-256 | NORMAL/ATENCAO/EMERGENCIA, ATENCAO/ALERTA, hash igual ao do Node | Passou |

## Testes manuais no app (roteiro para as evidências)

| ID | Cenário | Passos | Resultado esperado |
|---|---|---|---|
| CM01 | Login com campos vazios | Tocar em Entrar sem preencher | Aviso "Preencha e-mail e senha." |
| CM02 | Simulação de enchente | Admin > Sensores IoT > Iniciar > Enchente no Jardim Pantanal | Em cerca de 15 s o bairro vai para Emergência |
| CM03 | Alerta para o cidadão | Sair, entrar como Maria | Aviso vermelho no topo e card "Meu bairro" em Emergência |
| CM04 | Validação do reporte | Novo reporte > Enviar sem preencher | Erros embaixo de "Rua" e "Altura da água" |
| CM05 | Sem conexão com a API | Perfil > Conexão > desligar demo, URL inválida > Testar | "Sem conexão com a API..." |
| CM06 | Cidadão não vê o painel IoT | Entrar como Maria | Aba Sensores IoT não aparece |

## Evidências

Capturas do fluxo completo executado no navegador (viewport de celular) ficam em [`docs/evidencias/`](evidencias/): login, painel de sensores em Enchente, alerta chegando para a cidadã, detalhe do bairro com histórico dos sensores, validação do formulário, lista de reportes e erro de conexão com a API.
