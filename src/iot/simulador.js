import { sensoresApi } from '../api/servicos';
import { CENARIOS, proximaLeitura } from './modeloSensores';

/**
 * Simulador de sensores dentro do app (painel do ADMIN).
 * A cada INTERVALO_MS, gera uma leitura para cada sensor e ENVIA PELA API (POST /api/leituras),
 * exatamente como um dispositivo IoT faria. A API decide se a leitura dispara um alerta.
 */
export const INTERVALO_MS = 3000;

const estado = {
  rodando: false,
  cenarios: {}, // bairroId -> NORMAL | CHUVA_FORTE | ENCHENTE
  valores: {}, // codigoSensor -> último valor enviado
  log: [], // últimas mensagens
  envios: 0,
};
let sensores = [];
let cotas = {};
let timer = null;
const ouvintes = new Set();

function avisar() {
  const copia = { ...estado, cenarios: { ...estado.cenarios }, valores: { ...estado.valores }, log: [...estado.log] };
  ouvintes.forEach((fn) => fn(copia));
}

function registrar(texto, tipo = 'info') {
  estado.log.unshift({ id: `${Date.now()}-${Math.random()}`, texto, tipo, em: new Date().toISOString() });
  estado.log = estado.log.slice(0, 30);
}

async function ciclo() {
  for (const s of sensores) {
    const cenario = estado.cenarios[s.bairroId] || 'NORMAL';
    const valor = proximaLeitura(estado.valores[s.codigo], s, cenario, cotas[s.bairroId]);
    try {
      const r = await sensoresApi.enviarLeitura(s.codigo, valor);
      estado.valores[s.codigo] = valor;
      estado.envios += 1;
      if (r?.nivel && r.nivel !== 'NORMAL') registrar(`${s.codigo}: ${valor} ${s.unidade} → ${r.nivel}`, 'alerta');
    } catch (e) {
      registrar(`${s.codigo}: falha ao enviar (${e.message})`, 'erro');
    }
  }
  avisar();
}

export const simulador = {
  CENARIOS,
  iniciar(listaSensores, bairros) {
    sensores = listaSensores.filter((s) => s.ativo);
    cotas = Object.fromEntries(bairros.map((b) => [b.id, b.cotaTransbordamentoCm]));
    listaSensores.forEach((s) => {
      if (estado.valores[s.codigo] === undefined && s.ultimaLeitura) estado.valores[s.codigo] = s.ultimaLeitura.valor;
    });
    if (estado.rodando) return;
    estado.rodando = true;
    registrar(`Simulação iniciada com ${sensores.length} sensores.`);
    ciclo();
    timer = setInterval(ciclo, INTERVALO_MS);
    avisar();
  },
  parar() {
    clearInterval(timer);
    timer = null;
    estado.rodando = false;
    registrar('Simulação pausada.');
    avisar();
  },
  definirCenario(bairroId, cenario, nomeBairro = `#${bairroId}`) {
    estado.cenarios[bairroId] = cenario;
    registrar(`Cenário "${CENARIOS[cenario].rotulo}" em ${nomeBairro}.`);
    avisar();
  },
  enviarAgora: () => ciclo(),
  assinar(fn) {
    ouvintes.add(fn);
    avisar();
    return () => ouvintes.delete(fn);
  },
};
