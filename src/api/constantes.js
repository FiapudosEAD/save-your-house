/**
 * Endereço da API do grupo (Java/Spring ou C#/ASP.NET).
 * - Emulador Android: http://10.0.2.2:8080
 * - Celular físico com Expo Go: http://IP_DO_SEU_PC:8080 (mesma rede Wi-Fi)
 * Pode ser trocado em tempo de execução na tela Perfil > Conexão.
 */
export const API_URL_PADRAO = 'http://10.0.2.2:8080';

/** Chave que os sensores (IoT) usam no cabeçalho X-API-Key ao enviar leituras. */
export const CHAVE_IOT_PADRAO = 'iot-demo-key';

/**
 * Modo demonstração: o app usa um servidor simulado dentro do próprio app,
 * com as mesmas rotas e respostas da API real. Útil enquanto a API não está pronta.
 */
export const MODO_DEMO_PADRAO = true;

export const TEMPO_LIMITE_MS = 8000;
