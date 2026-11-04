#!/usr/bin/env node
/**
 * Simulador de sensores IoT do AlertaBairro (fora do app).
 * Envia leituras de nível do rio (cm) e de chuva (mm/h) para a API do grupo.
 *
 * Uso:
 *   node iot-simulator/simulador.mjs --api http://localhost:8080 --cenario ENCHENTE --bairro 1
 *   npm run iot -- --cenario CHUVA_FORTE
 *
 * Opções:
 *   --api URL        endereço da API (padrão http://localhost:8080)
 *   --chave KEY      chave enviada no cabeçalho X-API-Key (padrão iot-demo-key)
 *   --cenario NOME   NORMAL | CHUVA_FORTE | ENCHENTE (padrão NORMAL)
 *   --bairro ID      aplica o cenário só neste bairro (os outros ficam NORMAL)
 *   --intervalo SEG  segundos entre envios (padrão 5)
 *   --vezes N        número de ciclos (padrão: infinito)
 *   --json ARQUIVO   em vez de enviar, grava as leituras em um arquivo JSON
 */
import { writeFileSync } from 'node:fs';
import { CENARIOS, proximaLeitura } from '../src/iot/modeloSensores.js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
const API = (args.api || 'http://localhost:8080').replace(/\/$/, '');
const CHAVE = args.chave || 'iot-demo-key';
const CENARIO = (args.cenario || 'NORMAL').toUpperCase();
const BAIRRO = args.bairro ? Number(args.bairro) : null;
const INTERVALO = Number(args.intervalo || 5) * 1000;
const VEZES = args.vezes ? Number(args.vezes) : Infinity;

if (!CENARIOS[CENARIO]) {
  console.error(`Cenário inválido: ${CENARIO}. Use ${Object.keys(CENARIOS).join(', ')}.`);
  process.exit(1);
}

// Sensores usados quando a API não responde (mesma carga inicial do banco), para o modo --json.
const SENSORES_PADRAO = [
  ['RIO-PANT-01', 'NIVEL_RIO', 1, 400], ['PLU-PANT-01', 'PLUVIOMETRO', 1, 400],
  ['RIO-ROMA-01', 'NIVEL_RIO', 2, 380], ['PLU-ROMA-01', 'PLUVIOMETRO', 2, 380],
  ['RIO-ITAI-01', 'NIVEL_RIO', 3, 250], ['PLU-ITAI-01', 'PLUVIOMETRO', 3, 250],
  ['RIO-NMUN-01', 'NIVEL_RIO', 4, 420], ['PLU-NMUN-01', 'PLUVIOMETRO', 4, 420],
  ['RIO-PRUD-01', 'NIVEL_RIO', 5, 220], ['PLU-PRUD-01', 'PLUVIOMETRO', 5, 220],
].map(([codigo, tipo, bairroId, cota]) => ({ codigo, tipo, bairroId, cota, unidade: tipo === 'NIVEL_RIO' ? 'cm' : 'mm/h' }));

async function carregarSensores() {
  if (args.json) return SENSORES_PADRAO;
  try {
    const [sensores, bairros] = await Promise.all([
      fetch(`${API}/api/sensores`).then((r) => r.json()),
      fetch(`${API}/api/bairros`).then((r) => r.json()),
    ]);
    const cotas = Object.fromEntries(bairros.map((b) => [b.id, b.cotaTransbordamentoCm]));
    return sensores.filter((s) => s.ativo !== false).map((s) => ({ ...s, cota: cotas[s.bairroId] }));
  } catch (e) {
    console.error(`Não consegui ler os sensores em ${API}/api/sensores (${e.message}).`);
    console.error('Confira se a API está rodando ou use --json leituras.json para gerar um arquivo.');
    process.exit(1);
  }
}

const sensores = await carregarSensores();
const valores = {};
const geradas = [];
console.log(`AlertaBairro IoT · ${sensores.length} sensores · cenário ${CENARIO}${BAIRRO ? ` no bairro ${BAIRRO}` : ''} · ${args.json ? `arquivo ${args.json}` : API}`);

for (let ciclo = 1; ciclo <= VEZES; ciclo++) {
  for (const s of sensores) {
    const cenario = !BAIRRO || s.bairroId === BAIRRO ? CENARIO : 'NORMAL';
    const valor = proximaLeitura(valores[s.codigo], s, cenario, s.cota);
    valores[s.codigo] = valor;
    const leitura = { codigoSensor: s.codigo, valor, registradaEm: new Date().toISOString() };
    if (args.json) {
      geradas.push(leitura);
      continue;
    }
    try {
      const r = await fetch(`${API}/api/leituras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': CHAVE },
        body: JSON.stringify({ codigoSensor: s.codigo, valor }),
      });
      const corpo = await r.json().catch(() => ({}));
      console.log(`${r.status} ${s.codigo.padEnd(12)} ${String(valor).padStart(6)} ${s.unidade.padEnd(4)} ${corpo.nivel ? `nível ${corpo.nivel}` : corpo.mensagem || ''}`);
    } catch (e) {
      console.log(`ERRO ${s.codigo}: ${e.message}`);
    }
  }
  if (ciclo < VEZES && !args.json) await new Promise((r) => setTimeout(r, INTERVALO));
  if (args.json && !Number.isFinite(VEZES)) break;
}

if (args.json) {
  writeFileSync(args.json, JSON.stringify(geradas, null, 2));
  console.log(`${geradas.length} leituras gravadas em ${args.json}`);
}
