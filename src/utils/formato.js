export function dataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function haQuantoTempo(iso) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return dataHora(iso);
}

export const GRAVIDADE_REPORTE = {
  CALCADA: 'Água na calçada',
  CANELA: 'Até a canela',
  JOELHO: 'Até o joelho',
  CINTURA: 'Acima do joelho',
};

export const STATUS_REPORTE = {
  PENDENTE: 'Aguardando confirmação',
  CONFIRMADO: 'Confirmado',
  RESOLVIDO: 'Água baixou',
};
