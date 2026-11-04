// Modelo dos sensores simulados. Sem dependências do React Native:
// é usado pelo simulador dentro do app e pelo script iot-simulator/simulador.mjs.

export const CENARIOS = {
  NORMAL: { rotulo: 'Tempo normal', descricao: 'Sem chuva relevante, rio em nível baixo.', rio: 0.4, chuva: 2 },
  CHUVA_FORTE: { rotulo: 'Chuva forte', descricao: 'Temporal de verão: chuva acima de 15 mm/h e rio subindo.', rio: 0.8, chuva: 24 },
  ENCHENTE: { rotulo: 'Enchente', descricao: 'Chuva extrema e rio acima da cota de transbordamento.', rio: 1.08, chuva: 62 },
};

/** Valor-alvo do sensor no cenário escolhido. */
export function alvo(sensor, cenario, cotaTransbordamentoCm) {
  const c = CENARIOS[cenario] || CENARIOS.NORMAL;
  return sensor.tipo === 'NIVEL_RIO' ? c.rio * cotaTransbordamentoCm : c.chuva;
}

/**
 * Próxima leitura: anda 35% em direção ao alvo e soma um ruído pequeno,
 * imitando um sensor real (o rio sobe aos poucos, a chuva oscila).
 */
export function proximaLeitura(atual, sensor, cenario, cotaTransbordamentoCm, aleatorio = Math.random) {
  const destino = alvo(sensor, cenario, cotaTransbordamentoCm);
  const base = atual ?? alvo(sensor, 'NORMAL', cotaTransbordamentoCm);
  const amplitudeRuido = sensor.tipo === 'NIVEL_RIO' ? cotaTransbordamentoCm * 0.01 : Math.max(1, destino * 0.12);
  const ruido = (aleatorio() * 2 - 1) * amplitudeRuido;
  const valor = base + (destino - base) * 0.35 + ruido;
  return Math.max(0, Math.round(valor * 10) / 10);
}
