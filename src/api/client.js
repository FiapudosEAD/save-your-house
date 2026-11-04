import { API_URL_PADRAO, MODO_DEMO_PADRAO, TEMPO_LIMITE_MS } from './constantes';
import { requisicaoSimulada } from './mock/servidorSimulado';

let config = { apiUrl: API_URL_PADRAO, modoDemo: MODO_DEMO_PADRAO };
let token = null;
let aoExpirarSessao = null;

export function definirConfig(nova) {
  config = { ...config, ...nova };
}
export function obterConfig() {
  return config;
}
export function definirToken(novo) {
  token = novo;
}
export function aoSessaoExpirar(fn) {
  aoExpirarSessao = fn;
}

/** Erro padronizado para as telas mostrarem uma mensagem amigável. */
export class ApiError extends Error {
  constructor(mensagem, { status = 0, tipo = 'HTTP', erros = null } = {}) {
    super(mensagem);
    this.status = status;
    this.tipo = tipo; // CONEXAO | TEMPO | HTTP
    this.erros = erros; // erros de validação por campo, ex.: { rua: 'obrigatório' }
  }
}

const MENSAGEM_POR_STATUS = {
  400: 'Dados inválidos. Revise os campos.',
  401: 'Sessão expirada. Entre novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Registro não encontrado.',
  409: 'Este registro já existe.',
  500: 'Erro no servidor. Tente de novo em instantes.',
};

function tratarResposta(status, dados) {
  if (status >= 200 && status < 300) return dados ?? null;
  if (status === 401 && token && aoExpirarSessao) aoExpirarSessao();
  const mensagem =
    dados?.mensagem || dados?.message || MENSAGEM_POR_STATUS[status] || `Erro inesperado (${status}).`;
  throw new ApiError(mensagem, { status, erros: dados?.erros || null });
}

/**
 * Faz uma requisição à API. No modo demonstração, a mesma chamada vai para o servidor simulado.
 * @param {'GET'|'POST'|'PUT'|'DELETE'} metodo
 * @param {string} caminho ex.: /api/bairros
 * @param {object} [corpo]
 * @param {object} [cabecalhos]
 */
export async function requisicao(metodo, caminho, corpo, cabecalhos = {}) {
  const headers = { Accept: 'application/json', ...cabecalhos };
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  if (config.modoDemo) {
    const { status, dados } = await requisicaoSimulada(metodo, caminho, corpo, headers);
    return tratarResposta(status, dados);
  }

  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  let resposta;
  try {
    resposta = await fetch(`${config.apiUrl.replace(/\/$/, '')}${caminho}`, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new ApiError('A API demorou demais para responder. Verifique sua conexão.', { tipo: 'TEMPO' });
    }
    throw new ApiError('Sem conexão com a API. Verifique a internet ou o endereço em Perfil > Conexão.', {
      tipo: 'CONEXAO',
    });
  } finally {
    clearTimeout(timer);
  }

  let dados = null;
  const texto = await resposta.text();
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = { mensagem: texto };
    }
  }
  return tratarResposta(resposta.status, dados);
}
