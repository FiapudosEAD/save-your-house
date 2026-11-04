import { requisicao } from './client';
import { CHAVE_IOT_PADRAO } from './constantes';

const qs = (params) => {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return partes.length ? `?${partes.join('&')}` : '';
};

export const authApi = {
  entrar: (email, senha) => requisicao('POST', '/api/auth/login', { email, senha }),
  cadastrar: (dados) => requisicao('POST', '/api/usuarios', dados),
  eu: () => requisicao('GET', '/api/usuarios/me'),
  atualizarEu: (dados) => requisicao('PUT', '/api/usuarios/me', dados),
};

export const bairrosApi = {
  listar: () => requisicao('GET', '/api/bairros'),
  detalhe: (id) => requisicao('GET', `/api/bairros/${id}`),
};

export const alertasApi = {
  listar: ({ bairroId, ativos } = {}) => requisicao('GET', `/api/alertas${qs({ bairroId, ativos })}`),
};

export const sensoresApi = {
  listar: ({ bairroId } = {}) => requisicao('GET', `/api/sensores${qs({ bairroId })}`),
  leituras: (id, limite = 20) => requisicao('GET', `/api/sensores/${id}/leituras${qs({ limite })}`),
  enviarLeitura: (codigoSensor, valor, chave = CHAVE_IOT_PADRAO) =>
    requisicao('POST', '/api/leituras', { codigoSensor, valor }, { 'X-API-Key': chave }),
};

export const reportesApi = {
  listar: ({ bairroId, meus } = {}) => requisicao('GET', `/api/reportes${qs({ bairroId, meus })}`),
  detalhe: (id) => requisicao('GET', `/api/reportes/${id}`),
  criar: (dados) => requisicao('POST', '/api/reportes', dados),
  atualizar: (id, dados) => requisicao('PUT', `/api/reportes/${id}`, dados),
  alterarStatus: (id, status) => requisicao('PUT', `/api/reportes/${id}/status`, { status }),
  confirmar: (id) => requisicao('POST', `/api/reportes/${id}/confirmacoes`),
  excluir: (id) => requisicao('DELETE', `/api/reportes/${id}`),
};
