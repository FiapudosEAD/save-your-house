/**
 * Servidor simulado do modo demonstração.
 * Implementa as MESMAS rotas, regras e respostas descritas em docs/API_CONTRATO.md,
 * para que o app funcione antes da API Java/C# do grupo ficar pronta.
 * Quando a API real estiver no ar, basta desligar o modo demonstração em Perfil > Conexão.
 */
import { CHAVE_IOT_PADRAO } from '../constantes';
import { MENSAGENS, maiorNivel, nivelDaLeitura, nivelReportes } from '../../utils/nivel';
import { criarDadosIniciais } from './dadosIniciais';
import { hashSenha } from './sha256';

let db = criarDadosIniciais();
let atrasoMs = 250;

export function reiniciarServidorSimulado() {
  db = criarDadosIniciais();
}
export function definirAtrasoSimulado(ms) {
  atrasoMs = ms;
}

// ---------- utilitários ----------
const ok = (dados, status = 200) => ({ status, dados });
const erro = (status, mensagem, erros) => ({ status, dados: { status, mensagem, ...(erros ? { erros } : {}) } });
const agora = () => new Date().toISOString();
const GRAVIDADES = ['CALCADA', 'CANELA', 'JOELHO', 'CINTURA'];
const STATUS = ['PENDENTE', 'CONFIRMADO', 'RESOLVIDO'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Remove tags HTML e espaços extras (proteção contra XSS armazenado). */
function sanitizar(texto) {
  return String(texto ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function semSenha(u) {
  const { senhaHash, sal, ...publico } = u;
  return publico;
}

function usuarioDoToken(headers) {
  const auth = headers.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const id = token && db.sessoes[token];
  return id ? db.usuarios.find((u) => u.id === id) : null;
}

function gerarToken() {
  return `demo.${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function ultimaLeitura(sensorId) {
  for (let i = db.leituras.length - 1; i >= 0; i--) if (db.leituras[i].sensorId === sensorId) return db.leituras[i];
  return null;
}

function sensorComLeitura(s) {
  const b = db.bairros.find((x) => x.id === s.bairroId);
  const ult = ultimaLeitura(s.id);
  return {
    ...s,
    bairroNome: b?.nome,
    ultimaLeitura: ult ? { ...ult, nivel: nivelDaLeitura(s, ult.valor, b.cotaTransbordamentoCm) } : null,
    limite: s.tipo === 'NIVEL_RIO' ? b.cotaTransbordamentoCm : null,
  };
}

function reporteCompleto(r, usuario) {
  const autor = db.usuarios.find((u) => u.id === r.usuarioId);
  const bairro = db.bairros.find((b) => b.id === r.bairroId);
  return {
    id: r.id,
    bairroId: r.bairroId,
    bairroNome: bairro?.nome,
    rua: r.rua,
    gravidade: r.gravidade,
    descricao: r.descricao,
    status: r.status,
    autorNome: autor ? autor.nome.split(' ')[0] : 'Cidadão',
    usuarioId: r.usuarioId,
    totalConfirmacoes: r.confirmacoes.length,
    confirmadoPorMim: usuario ? r.confirmacoes.includes(usuario.id) : false,
    criadoEm: r.criadoEm,
    atualizadoEm: r.atualizadoEm,
  };
}

// ---------- regra de alerta (equivale ao AlertaService da API) ----------
function recalcularNivelBairro(bairroId, origem, detalhe) {
  const bairro = db.bairros.find((b) => b.id === bairroId);
  const niveisSensores = db.sensores
    .filter((s) => s.bairroId === bairroId && s.ativo)
    .map((s) => {
      const ult = ultimaLeitura(s.id);
      return ult ? nivelDaLeitura(s, ult.valor, bairro.cotaTransbordamentoCm) : 'NORMAL';
    });
  const duasHoras = Date.now() - 2 * 3600 * 1000;
  const confirmados = db.reportes.filter(
    (r) => r.bairroId === bairroId && r.status === 'CONFIRMADO' && new Date(r.criadoEm).getTime() >= duasHoras,
  ).length;
  const novo = maiorNivel(...niveisSensores, nivelReportes(confirmados));
  if (novo === bairro.nivelAlerta) return;

  const ativos = db.alertas.filter((a) => a.bairroId === bairroId && a.ativo);
  ativos.forEach((a) => {
    a.ativo = false;
    a.encerradoEm = agora();
  });
  bairro.nivelAlerta = novo;
  if (novo !== 'NORMAL') {
    db.alertas.push({
      id: db.proximoId.alerta++,
      bairroId,
      nivel: novo,
      origem,
      mensagem: `${detalhe} ${MENSAGENS[novo]}`,
      ativo: true,
      criadoEm: agora(),
      encerradoEm: null,
    });
  }
}

// ---------- validações ----------
function validarReporte(corpo) {
  const erros = {};
  const rua = sanitizar(corpo?.rua);
  const descricao = sanitizar(corpo?.descricao);
  const bairroId = Number(corpo?.bairroId);
  if (!db.bairros.some((b) => b.id === bairroId)) erros.bairroId = 'Selecione um bairro válido.';
  if (rua.length < 3 || rua.length > 120) erros.rua = 'Informe a rua (3 a 120 caracteres).';
  if (!GRAVIDADES.includes(corpo?.gravidade)) erros.gravidade = 'Escolha a altura da água.';
  if (descricao.length > 500) erros.descricao = 'Máximo de 500 caracteres.';
  return { erros, valores: { rua, descricao, bairroId, gravidade: corpo?.gravidade } };
}

// ---------- rotas ----------
const rotas = [];
const rota = (metodo, padrao, handler, { auth = true, perfil = null } = {}) => {
  const nomes = [];
  const re = new RegExp(`^${padrao.replace(/:(\w+)/g, (_, n) => (nomes.push(n), '(\\d+)'))}$`);
  rotas.push({ metodo, re, nomes, handler, auth, perfil });
};

// Auth
rota('POST', '/api/auth/login', ({ corpo }) => {
  const email = String(corpo?.email ?? '').trim().toLowerCase();
  const senha = String(corpo?.senha ?? '');
  if (!email || !senha) return erro(400, 'Informe e-mail e senha.');
  const u = db.usuarios.find((x) => x.email === email);
  // Mesma mensagem para e-mail ou senha errados: não revela quais e-mails existem.
  if (!u || u.senhaHash !== hashSenha(senha, u.sal)) return erro(401, 'E-mail ou senha incorretos.');
  const token = gerarToken();
  db.sessoes[token] = u.id;
  return ok({ token, tipo: 'Bearer', usuario: semSenha(u) });
}, { auth: false });

rota('POST', '/api/usuarios', ({ corpo }) => {
  const erros = {};
  const nome = sanitizar(corpo?.nome);
  const email = String(corpo?.email ?? '').trim().toLowerCase();
  const senha = String(corpo?.senha ?? '');
  const bairroId = Number(corpo?.bairroId);
  if (nome.length < 3) erros.nome = 'Informe seu nome.';
  if (!EMAIL_RE.test(email)) erros.email = 'E-mail inválido.';
  if (senha.length < 8 || !/[A-Za-z]/.test(senha) || !/\d/.test(senha)) erros.senha = 'Mínimo de 8 caracteres, com letras e números.';
  if (!db.bairros.some((b) => b.id === bairroId)) erros.bairroId = 'Selecione seu bairro.';
  if (Object.keys(erros).length) return erro(400, 'Dados inválidos. Revise os campos.', erros);
  if (db.usuarios.some((u) => u.email === email)) return erro(409, 'Já existe uma conta com este e-mail.', { email: 'E-mail já cadastrado.' });
  const sal = `sal-${Math.random().toString(36).slice(2)}`;
  // Cadastro público sempre cria CIDADAO: o perfil enviado pelo cliente é ignorado.
  const u = { id: db.proximoId.usuario++, nome, email, perfil: 'CIDADAO', bairroId, sal, senhaHash: hashSenha(senha, sal) };
  db.usuarios.push(u);
  return ok(semSenha(u), 201);
}, { auth: false });

rota('GET', '/api/usuarios/me', ({ usuario }) => ok(semSenha(usuario)));

rota('PUT', '/api/usuarios/me', ({ usuario, corpo }) => {
  const erros = {};
  const nome = corpo?.nome !== undefined ? sanitizar(corpo.nome) : usuario.nome;
  const bairroId = corpo?.bairroId !== undefined ? Number(corpo.bairroId) : usuario.bairroId;
  if (nome.length < 3) erros.nome = 'Informe seu nome.';
  if (bairroId !== null && !db.bairros.some((b) => b.id === bairroId)) erros.bairroId = 'Bairro inválido.';
  if (Object.keys(erros).length) return erro(400, 'Dados inválidos. Revise os campos.', erros);
  usuario.nome = nome;
  usuario.bairroId = bairroId;
  return ok(semSenha(usuario));
});

// Bairros
rota('GET', '/api/bairros', () =>
  ok(
    db.bairros.map((b) => ({
      ...b,
      alertasAtivos: db.alertas.filter((a) => a.bairroId === b.id && a.ativo).length,
      reportesAbertos: db.reportes.filter((r) => r.bairroId === b.id && r.status !== 'RESOLVIDO').length,
    })),
  ),
{ auth: false });

rota('GET', '/api/bairros/:id', ({ params, usuario }) => {
  const b = db.bairros.find((x) => x.id === params.id);
  if (!b) return erro(404, 'Bairro não encontrado.');
  return ok({
    ...b,
    sensores: db.sensores.filter((s) => s.bairroId === b.id).map(sensorComLeitura),
    alertasAtivos: db.alertas.filter((a) => a.bairroId === b.id && a.ativo),
    reportes: db.reportes
      .filter((r) => r.bairroId === b.id && r.status !== 'RESOLVIDO')
      .sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))
      .map((r) => reporteCompleto(r, usuario)),
  });
}, { auth: false });

// Alertas
rota('GET', '/api/alertas', ({ query }) => {
  let lista = db.alertas;
  if (query.bairroId) lista = lista.filter((a) => a.bairroId === Number(query.bairroId));
  if (query.ativos === 'true') lista = lista.filter((a) => a.ativo);
  return ok(
    [...lista]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .map((a) => ({ ...a, bairroNome: db.bairros.find((b) => b.id === a.bairroId)?.nome })),
  );
}, { auth: false });

// Sensores e leituras (IoT)
rota('GET', '/api/sensores', ({ query }) => {
  let lista = db.sensores;
  if (query.bairroId) lista = lista.filter((s) => s.bairroId === Number(query.bairroId));
  return ok(lista.map(sensorComLeitura));
}, { auth: false });

rota('GET', '/api/sensores/:id/leituras', ({ params, query }) => {
  const s = db.sensores.find((x) => x.id === params.id);
  if (!s) return erro(404, 'Sensor não encontrado.');
  const limite = Math.min(Math.max(Number(query.limite) || 20, 1), 100);
  const b = db.bairros.find((x) => x.id === s.bairroId);
  const lista = db.leituras.filter((l) => l.sensorId === s.id).slice(-limite).reverse();
  return ok(lista.map((l) => ({ ...l, nivel: nivelDaLeitura(s, l.valor, b.cotaTransbordamentoCm) })));
}, { auth: false });

rota('POST', '/api/leituras', ({ corpo, headers }) => {
  if (headers['X-API-Key'] !== CHAVE_IOT_PADRAO) return erro(401, 'Chave do sensor inválida.');
  const s = db.sensores.find((x) => x.codigo === corpo?.codigoSensor);
  if (!s) return erro(404, 'Sensor não encontrado.');
  if (!s.ativo) return erro(400, 'Sensor desativado.');
  const valor = Number(corpo?.valor);
  const max = s.tipo === 'NIVEL_RIO' ? 2000 : 300;
  if (!Number.isFinite(valor) || valor < 0 || valor > max) {
    return erro(400, 'Valor da leitura fora da faixa do sensor.', { valor: `Entre 0 e ${max} ${s.unidade}.` });
  }
  const leitura = { id: db.proximoId.leitura++, sensorId: s.id, valor: Math.round(valor * 10) / 10, registradaEm: agora() };
  db.leituras.push(leitura);
  if (db.leituras.length > 3000) db.leituras.splice(0, 1000);
  const b = db.bairros.find((x) => x.id === s.bairroId);
  const rotulo = s.tipo === 'NIVEL_RIO' ? `${b.corpoHidrico} a ${leitura.valor} cm (cota ${b.cotaTransbordamentoCm} cm).` : `Chuva de ${leitura.valor} mm/h.`;
  recalcularNivelBairro(s.bairroId, 'SENSOR', `Sensor ${s.codigo}: ${rotulo}`);
  return ok({ ...leitura, nivel: nivelDaLeitura(s, leitura.valor, b.cotaTransbordamentoCm), nivelBairro: b.nivelAlerta }, 201);
}, { auth: false });

// Reportes de ruas alagadas
rota('GET', '/api/reportes', ({ query, usuario }) => {
  let lista = db.reportes;
  if (query.bairroId) lista = lista.filter((r) => r.bairroId === Number(query.bairroId));
  if (query.meus === 'true') lista = lista.filter((r) => r.usuarioId === usuario.id);
  return ok([...lista].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)).map((r) => reporteCompleto(r, usuario)));
});

rota('GET', '/api/reportes/:id', ({ params, usuario }) => {
  const r = db.reportes.find((x) => x.id === params.id);
  return r ? ok(reporteCompleto(r, usuario)) : erro(404, 'Reporte não encontrado.');
});

rota('POST', '/api/reportes', ({ corpo, usuario }) => {
  const { erros, valores } = validarReporte(corpo);
  if (Object.keys(erros).length) return erro(400, 'Dados inválidos. Revise os campos.', erros);
  const r = { id: db.proximoId.reporte++, usuarioId: usuario.id, ...valores, status: 'PENDENTE', confirmacoes: [], criadoEm: agora(), atualizadoEm: agora() };
  db.reportes.push(r);
  return ok(reporteCompleto(r, usuario), 201);
});

rota('PUT', '/api/reportes/:id', ({ params, corpo, usuario }) => {
  const r = db.reportes.find((x) => x.id === params.id);
  if (!r) return erro(404, 'Reporte não encontrado.');
  if (r.usuarioId !== usuario.id && usuario.perfil !== 'ADMIN') return erro(403, 'Você só pode editar seus próprios reportes.');
  const { erros, valores } = validarReporte(corpo);
  if (Object.keys(erros).length) return erro(400, 'Dados inválidos. Revise os campos.', erros);
  const bairroAntigo = r.bairroId;
  Object.assign(r, valores, { atualizadoEm: agora() });
  recalcularNivelBairro(bairroAntigo, 'REPORTE', 'Reporte atualizado.');
  if (bairroAntigo !== r.bairroId) recalcularNivelBairro(r.bairroId, 'REPORTE', 'Reporte atualizado.');
  return ok(reporteCompleto(r, usuario));
});

rota('PUT', '/api/reportes/:id/status', ({ params, corpo, usuario }) => {
  const r = db.reportes.find((x) => x.id === params.id);
  if (!r) return erro(404, 'Reporte não encontrado.');
  if (!STATUS.includes(corpo?.status)) return erro(400, 'Status inválido.', { status: STATUS.join(', ') });
  // Cidadão pode marcar o próprio reporte como resolvido; confirmar é papel do ADMIN.
  const podeCidadao = r.usuarioId === usuario.id && corpo.status === 'RESOLVIDO';
  if (usuario.perfil !== 'ADMIN' && !podeCidadao) return erro(403, 'Apenas a Defesa Civil pode alterar este status.');
  r.status = corpo.status;
  r.atualizadoEm = agora();
  recalcularNivelBairro(r.bairroId, 'REPORTE', `Reportes de cidadãos em ${db.bairros.find((b) => b.id === r.bairroId).nome}.`);
  return ok(reporteCompleto(r, usuario));
});

rota('POST', '/api/reportes/:id/confirmacoes', ({ params, usuario }) => {
  const r = db.reportes.find((x) => x.id === params.id);
  if (!r) return erro(404, 'Reporte não encontrado.');
  if (r.usuarioId === usuario.id) return erro(400, 'Você não pode confirmar o próprio reporte.');
  if (r.status === 'RESOLVIDO') return erro(400, 'Este reporte já foi resolvido.');
  if (r.confirmacoes.includes(usuario.id)) return erro(409, 'Você já confirmou este reporte.');
  r.confirmacoes.push(usuario.id);
  // Duas confirmações de outros cidadãos validam o reporte automaticamente.
  if (r.confirmacoes.length >= 2 && r.status === 'PENDENTE') r.status = 'CONFIRMADO';
  r.atualizadoEm = agora();
  recalcularNivelBairro(r.bairroId, 'REPORTE', `Reportes de cidadãos em ${db.bairros.find((b) => b.id === r.bairroId).nome}.`);
  return ok(reporteCompleto(r, usuario), 201);
});

rota('DELETE', '/api/reportes/:id', ({ params, usuario }) => {
  const i = db.reportes.findIndex((x) => x.id === params.id);
  if (i < 0) return erro(404, 'Reporte não encontrado.');
  const r = db.reportes[i];
  if (r.usuarioId !== usuario.id && usuario.perfil !== 'ADMIN') return erro(403, 'Você só pode excluir seus próprios reportes.');
  db.reportes.splice(i, 1);
  recalcularNivelBairro(r.bairroId, 'REPORTE', 'Reporte removido.');
  return ok(null, 204);
});

// ---------- despacho ----------
export async function requisicaoSimulada(metodo, caminhoCompleto, corpo, headers = {}) {
  if (atrasoMs) await new Promise((r) => setTimeout(r, atrasoMs));
  const [caminho, busca = ''] = caminhoCompleto.split('?');
  const query = Object.fromEntries(
    busca
      .split('&')
      .filter(Boolean)
      .map((p) => p.split('=').map(decodeURIComponent)),
  );
  for (const r of rotas) {
    if (r.metodo !== metodo) continue;
    const m = caminho.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.nomes.map((n, i) => [n, Number(m[i + 1])]));
    const usuario = usuarioDoToken(headers);
    if (r.auth && !usuario) return erro(401, 'Faça login para continuar.');
    if (r.perfil && usuario.perfil !== r.perfil) return erro(403, 'Você não tem permissão para esta ação.');
    try {
      // Cópia profunda: a tela nunca altera o "banco" por referência.
      const res = r.handler({ params, query, corpo, headers, usuario });
      return { status: res.status, dados: res.dados == null ? null : JSON.parse(JSON.stringify(res.dados)) };
    } catch (e) {
      return erro(500, 'Erro interno no servidor simulado.');
    }
  }
  return erro(404, `Rota não encontrada: ${metodo} ${caminho}`);
}
