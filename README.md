# AlertaBairro · App mobile (React Native + Expo)

Alerta de alagamento por bairro. Sensores de **nível do rio** e de **chuva** mandam leituras para a API, a API decide o nível de risco de cada bairro, e o app avisa o morador. O próprio cidadão também **reporta ruas alagadas**, e os vizinhos confirmam.

Global Solution 2026/2 · FIAP · CitizenTech · ODS 11, 13 e 3.

> Vídeo pitch: _colocar o link público aqui_
> Integrantes: _nome · RM_

## O que o app tem

| Tela | O que faz | Rotas da API usadas |
|---|---|---|
| Login | Entrar com e-mail e senha, mostrar/ocultar senha | `POST /api/auth/login` |
| Criar conta | Cadastro do cidadão com escolha do bairro e validação | `POST /api/usuarios` |
| Alertas (início) | Situação do **meu bairro** e de todos os bairros, atualiza a cada 5 s | `GET /api/bairros`, `GET /api/alertas` |
| Situação do bairro | Alertas ativos, sensores com medidor e histórico, reportes, dicas de segurança | `GET /api/bairros/{id}`, `GET /api/sensores/{id}/leituras`, `POST /api/reportes/{id}/confirmacoes` |
| Reportar rua alagada | Cadastro e edição de reporte (rua, altura da água, detalhes) | `POST /api/reportes`, `PUT /api/reportes/{id}` |
| Reportes | Meus reportes, do meu bairro ou todos; editar, excluir, "água baixou" | `GET`, `PUT .../status`, `DELETE /api/reportes/{id}` |
| Sensores IoT (só ADMIN) | Simulador dos 10 sensores com cenários Normal, Chuva forte e Enchente | `GET /api/sensores`, `POST /api/leituras` |
| Perfil | Trocar o bairro dos alertas, conexão com a API, sair | `PUT /api/usuarios/me` |
| Conexão | Ligar/desligar o modo demonstração, endereço da API, testar conexão | |

Quando o nível do bairro do usuário **sobe**, aparece um aviso vermelho no topo de qualquer tela e o celular vibra.

**Perfis:** `CIDADAO` recebe alertas, reporta e confirma reportes de vizinhos, e edita ou exclui só os próprios reportes. `ADMIN` (Defesa Civil) também valida reportes, exclui qualquer um e controla os sensores.

**Tratamento de erros:** toda chamada tem tempo limite de 8 s. Sem conexão, a tela mostra "Sem conexão com a API" com botão "Tentar de novo". Erros de validação da API (`erros.<campo>`) aparecem embaixo do campo certo, e 401 encerra a sessão.

## Como rodar

Pré-requisitos: Node.js 20 ou mais novo e o app **Expo Go** no celular (versão compatível com o Expo SDK 58), ou um emulador Android/iOS.

```bash
npm install
npx expo start
```

- **Celular:** leia o QR code com o Expo Go (celular e PC na mesma rede Wi-Fi).
- **Emulador Android:** aperte `a` no terminal.
- **Navegador:** aperte `w` (ou `npm run web`).

O app abre no **modo demonstração**: um servidor simulado dentro do app responde às mesmas rotas da API, então dá para testar tudo sem o back-end.

### Contas de teste (modo demonstração)

| Perfil | E-mail | Senha |
|---|---|---|
| ADMIN (Defesa Civil) | `admin@alertabairro.com` | `Admin@123` |
| CIDADAO (Jardim Pantanal) | `maria@email.com` | `Maria@123` |
| CIDADAO (Jardim Pantanal) | `joao@email.com` | `Joao@123` |

Na tela de login, toque numa conta de teste para preencher.

### Usar com a API Java/C# do grupo

1. Suba a API seguindo o [contrato](docs/API_CONTRATO.md).
2. No app: **Conexão** (link no rodapé do login ou em Perfil) → desligue o **Modo demonstração** → informe o endereço:
   - emulador Android: `http://10.0.2.2:8080`
   - celular físico: `http://IP-DO-SEU-PC:8080`
3. Toque em **Testar conexão** e depois em **Salvar**.

A API precisa liberar CORS se for testar pelo navegador.

## Demonstração para o pitch (cerca de 40 s)

1. Entre como **admin** → aba **Sensores IoT** → **Iniciar simulação** → **Enchente** no Jardim Pantanal.
2. Em cerca de 15 s o rio passa da cota e o bairro vai para **Emergência**.
3. Perfil → **Sair** → entre como **Maria**: o aviso vermelho aparece no topo.
4. Toque no aviso: veja os sensores subindo no histórico e reporte uma rua alagada.

## Simulação de IoT

Explicação dos sensores, limites e cenários em [docs/IOT.md](docs/IOT.md). Para enviar leituras para a API real sem abrir o app:

```bash
npm run iot -- --api http://localhost:8080 --cenario ENCHENTE --bairro 1
```

## Testes

```bash
npm test
```

São 13 testes automatizados do contrato e das regras (login, permissões, validação, XSS, chave do sensor, geração e encerramento de alertas). O plano completo, com os testes manuais, está em [docs/PLANO_DE_TESTES.md](docs/PLANO_DE_TESTES.md).

## Segurança no app

- A senha nunca fica salva no aparelho: o app guarda só o token da sessão.
- Validação de entrada no app **e** na API (e-mail, senha forte, tamanho dos campos, valores dos sensores).
- Remoção de tags HTML em `rua` e `descricao` (XSS), e o React Native não interpreta HTML.
- Login com mensagem genérica (não revela se o e-mail existe).
- Cadastro público sempre cria `CIDADAO`, e a aba de sensores fica escondida e bloqueada para quem não é ADMIN.
- Sensores se autenticam com chave própria (`X-API-Key`), separada do login de pessoas.
- No modo demonstração a senha é guardada como hash SHA-256 com sal. Na API real, use BCrypt.

## Estrutura

```
src/
  app/                 telas (Expo Router: cada arquivo é uma rota)
    (tabs)/            abas: Alertas, Reportes, Sensores IoT, Perfil
    bairro/[id].js     situação do bairro
    reporte/form.js    cadastro e edição de reporte
    login.js, cadastro.js, conexao.js
  api/
    client.js          fetch com token, tempo limite e tratamento de erros
    servicos.js        uma função por rota da API
    mock/              servidor simulado (modo demonstração) e carga inicial
  context/             sessão do usuário e acompanhamento de alertas
  iot/                 modelo dos sensores e simulador do painel ADMIN
  utils/nivel.js       regra de nível de alerta (igual à da API)
iot-simulator/         script Node que envia leituras para a API
docs/                  contrato da API, IoT e plano de testes
tests/                 testes automatizados (node:test)
```

## Tecnologias

React Native 0.88, Expo SDK 58, Expo Router, AsyncStorage e Ionicons. Os testes usam só o `node:test`, sem dependência extra.

## Uso de IA generativa

_Preencher conforme o grupo usou._ Exemplo: o Claude (Anthropic) foi usado para gerar a estrutura inicial do app, o servidor simulado e a documentação. O grupo revisou, testou e adaptou o código.
