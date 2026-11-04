/**
 * Regra de negócio do alerta de alagamento.
 * A mesma regra deve existir no back-end (Service de alertas). Aqui ela é usada
 * pelo modo demonstração e para exibir o nível calculado de cada leitura.
 *
 * Sensor NIVEL_RIO (cm acima do leito): compara com a cota de transbordamento do bairro.
 *   >= 70% da cota  -> ATENCAO
 *   >= 90% da cota  -> ALERTA
 *   >= 100% da cota -> EMERGENCIA (rio transbordando)
 * Sensor PLUVIOMETRO (mm/h):
 *   >= 15 mm/h -> ATENCAO (chuva forte)
 *   >= 30 mm/h -> ALERTA (chuva muito forte)
 *   >= 50 mm/h -> EMERGENCIA (chuva extrema)
 * Reportes de cidadãos confirmados nas últimas 2 horas:
 *   >= 2 -> ATENCAO, >= 4 -> ALERTA
 * O nível do bairro é o maior entre os sensores e os reportes.
 */
export const ORDEM = ['NORMAL', 'ATENCAO', 'ALERTA', 'EMERGENCIA'];

export const LIMITES_CHUVA = { ATENCAO: 15, ALERTA: 30, EMERGENCIA: 50 };
export const LIMITES_RIO = { ATENCAO: 0.7, ALERTA: 0.9, EMERGENCIA: 1.0 };
export const LIMITES_REPORTES = { ATENCAO: 2, ALERTA: 4 };

export function nivelChuva(mmPorHora) {
  if (mmPorHora >= LIMITES_CHUVA.EMERGENCIA) return 'EMERGENCIA';
  if (mmPorHora >= LIMITES_CHUVA.ALERTA) return 'ALERTA';
  if (mmPorHora >= LIMITES_CHUVA.ATENCAO) return 'ATENCAO';
  return 'NORMAL';
}

export function nivelRio(cm, cotaTransbordamentoCm) {
  const proporcao = cm / cotaTransbordamentoCm;
  if (proporcao >= LIMITES_RIO.EMERGENCIA) return 'EMERGENCIA';
  if (proporcao >= LIMITES_RIO.ALERTA) return 'ALERTA';
  if (proporcao >= LIMITES_RIO.ATENCAO) return 'ATENCAO';
  return 'NORMAL';
}

export function nivelReportes(qtdConfirmados) {
  if (qtdConfirmados >= LIMITES_REPORTES.ALERTA) return 'ALERTA';
  if (qtdConfirmados >= LIMITES_REPORTES.ATENCAO) return 'ATENCAO';
  return 'NORMAL';
}

export function maiorNivel(...lista) {
  return lista.reduce((maior, n) => (ORDEM.indexOf(n) > ORDEM.indexOf(maior) ? n : maior), 'NORMAL');
}

export function nivelDaLeitura(sensor, valor, cotaTransbordamentoCm) {
  return sensor.tipo === 'NIVEL_RIO' ? nivelRio(valor, cotaTransbordamentoCm) : nivelChuva(valor);
}

export const MENSAGENS = {
  ATENCAO: 'Fique atento: evite áreas baixas e acompanhe as atualizações.',
  ALERTA: 'Risco alto de alagamento. Não atravesse ruas alagadas e proteja documentos e objetos.',
  EMERGENCIA: 'Alagamento em curso. Procure um local alto e seguro. Defesa Civil: 199. Bombeiros: 193.',
};
