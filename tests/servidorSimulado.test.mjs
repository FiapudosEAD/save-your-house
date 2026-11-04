// Testes automatizados das regras do servidor simulado (mesmo contrato da API real).
// Rodar: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { requisicaoSimulada as req, reiniciarServidorSimulado, definirAtrasoSimulado } from '../src/api/mock/servidorSimulado.js';
import { sha256 } from '../src/api/mock/sha256.js';
import { nivelChuva, nivelRio, maiorNivel } from '../src/utils/nivel.js';

const IOT = { 'X-API-Key': 'iot-demo-key' };
definirAtrasoSimulado(0);
beforeEach(() => reiniciarServidorSimulado());

async function login(email, senha) {
  const r = await req('POST', '/api/auth/login', { email, senha });
  assert.equal(r.status, 200);
  return { Authorization: `Bearer ${r.dados.token}` };
}

test('CT01 login válido retorna token e não expõe a senha', async () => {
  const r = await req('POST', '/api/auth/login', { email: 'maria@email.com', senha: 'Maria@123' });
  assert.equal(r.status, 200);
  assert.ok(r.dados.token);
  assert.equal(r.dados.usuario.perfil, 'CIDADAO');
  assert.equal(r.dados.usuario.senhaHash, undefined);
});

test('CT02 login com senha errada retorna 401 com mensagem genérica', async () => {
  const r = await req('POST', '/api/auth/login', { email: 'maria@email.com', senha: 'errada' });
  assert.equal(r.status, 401);
  assert.equal(r.dados.mensagem, 'E-mail ou senha incorretos.');
});

test('CT03 cadastro valida campos e rejeita e-mail duplicado', async () => {
  const invalido = await req('POST', '/api/usuarios', { nome: 'A', email: 'x', senha: '123', bairroId: 99 });
  assert.equal(invalido.status, 400);
  assert.deepEqual(Object.keys(invalido.dados.erros).sort(), ['bairroId', 'email', 'nome', 'senha']);
  const dup = await req('POST', '/api/usuarios', { nome: 'Outra Maria', email: 'MARIA@email.com', senha: 'Senha1234', bairroId: 1 });
  assert.equal(dup.status, 409);
});

test('CT04 cadastro sempre cria CIDADAO, mesmo se pedir ADMIN', async () => {
  const r = await req('POST', '/api/usuarios', { nome: 'Pedro Teste', email: 'p@t.com', senha: 'Senha1234', bairroId: 2, perfil: 'ADMIN' });
  assert.equal(r.status, 201);
  assert.equal(r.dados.perfil, 'CIDADAO');
});

test('CT05 rota protegida sem token retorna 401', async () => {
  const r = await req('GET', '/api/reportes?meus=true');
  assert.equal(r.status, 401);
});

test('CT06 criar reporte remove HTML (XSS) e valida campos', async () => {
  const h = await login('maria@email.com', 'Maria@123');
  const ruim = await req('POST', '/api/reportes', { bairroId: 1, rua: 'ab', gravidade: 'MAR' }, h);
  assert.equal(ruim.status, 400);
  assert.ok(ruim.dados.erros.rua && ruim.dados.erros.gravidade);
  const r = await req('POST', '/api/reportes', { bairroId: 1, rua: '<script>alert(1)</script>Rua A', gravidade: 'JOELHO', descricao: '<b>alto</b>' }, h);
  assert.equal(r.status, 201);
  assert.equal(r.dados.rua, 'alert(1)Rua A');
  assert.equal(r.dados.descricao, 'alto');
  assert.equal(r.dados.status, 'PENDENTE');
});

test('CT07 cidadão não edita nem exclui reporte de outro (403); admin pode', async () => {
  const maria = await login('maria@email.com', 'Maria@123');
  const put = await req('PUT', '/api/reportes/1', { bairroId: 1, rua: 'Rua X', gravidade: 'CANELA' }, maria);
  assert.equal(put.status, 403);
  const del = await req('DELETE', '/api/reportes/1', undefined, maria);
  assert.equal(del.status, 403);
  const admin = await login('admin@alertabairro.com', 'Admin@123');
  assert.equal((await req('DELETE', '/api/reportes/1', undefined, admin)).status, 204);
  assert.equal((await req('GET', '/api/reportes/1', undefined, admin)).status, 404);
});

test('CT08 leitura sem chave do sensor é recusada (401)', async () => {
  const r = await req('POST', '/api/leituras', { codigoSensor: 'PLU-PANT-01', valor: 10 });
  assert.equal(r.status, 401);
});

test('CT09 leitura fora da faixa retorna 400', async () => {
  const r = await req('POST', '/api/leituras', { codigoSensor: 'PLU-PANT-01', valor: -5 }, IOT);
  assert.equal(r.status, 400);
});

test('CT10 chuva acima de 30 mm/h gera ALERTA no bairro', async () => {
  const r = await req('POST', '/api/leituras', { codigoSensor: 'PLU-PANT-01', valor: 35 }, IOT);
  assert.equal(r.status, 201);
  assert.equal(r.dados.nivelBairro, 'ALERTA');
  const alertas = await req('GET', '/api/alertas?bairroId=1&ativos=true');
  assert.equal(alertas.dados.length, 1);
  assert.equal(alertas.dados[0].nivel, 'ALERTA');
});

test('CT11 rio acima da cota gera EMERGENCIA e, ao baixar, o alerta é encerrado', async () => {
  await req('POST', '/api/leituras', { codigoSensor: 'RIO-PANT-01', valor: 410 }, IOT);
  let b = await req('GET', '/api/bairros/1');
  assert.equal(b.dados.nivelAlerta, 'EMERGENCIA');
  await req('POST', '/api/leituras', { codigoSensor: 'RIO-PANT-01', valor: 150 }, IOT);
  b = await req('GET', '/api/bairros/1');
  assert.equal(b.dados.nivelAlerta, 'NORMAL');
  assert.equal(b.dados.alertasAtivos.length, 0);
});

test('CT12 duas confirmações de outros cidadãos validam o reporte', async () => {
  const maria = await login('maria@email.com', 'Maria@123');
  const admin = await login('admin@alertabairro.com', 'Admin@123');
  assert.equal((await req('POST', '/api/reportes/1/confirmacoes', undefined, maria)).status, 201);
  assert.equal((await req('POST', '/api/reportes/1/confirmacoes', undefined, maria)).status, 409);
  const r = await req('POST', '/api/reportes/1/confirmacoes', undefined, admin);
  assert.equal(r.dados.status, 'CONFIRMADO');
  const joao = await login('joao@email.com', 'Joao@123');
  assert.equal((await req('POST', '/api/reportes/1/confirmacoes', undefined, joao)).status, 400);
});

test('CT13 regras de nível e hash SHA-256', () => {
  assert.equal(nivelChuva(10), 'NORMAL');
  assert.equal(nivelChuva(15), 'ATENCAO');
  assert.equal(nivelChuva(55), 'EMERGENCIA');
  assert.equal(nivelRio(280, 400), 'ATENCAO');
  assert.equal(nivelRio(360, 400), 'ALERTA');
  assert.equal(maiorNivel('ATENCAO', 'NORMAL', 'ALERTA'), 'ALERTA');
  const texto = 'Senha com acentuação 123';
  assert.equal(sha256(texto), createHash('sha256').update(texto).digest('hex'));
});
