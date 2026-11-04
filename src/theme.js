export const cores = {
  primaria: '#0B4F8A',
  primariaClara: '#E3EEF9',
  fundo: '#F4F7FB',
  cartao: '#FFFFFF',
  texto: '#14213D',
  textoSuave: '#5B6B82',
  borda: '#D9E2EC',
  erro: '#C62828',
  sucesso: '#2E7D32',
};

// Cores e rótulos de cada nível de alerta. Contraste testado para leitura em sol forte.
export const niveis = {
  NORMAL: { rotulo: 'Normal', cor: '#2E7D32', fundo: '#E8F5E9', icone: 'checkmark-circle', ordem: 0 },
  ATENCAO: { rotulo: 'Atenção', cor: '#B26A00', fundo: '#FFF4E0', icone: 'warning', ordem: 1 },
  ALERTA: { rotulo: 'Alerta', cor: '#D84315', fundo: '#FBE9E7', icone: 'alert-circle', ordem: 2 },
  EMERGENCIA: { rotulo: 'Emergência', cor: '#B71C1C', fundo: '#FFEBEE', icone: 'flame', ordem: 3 },
};

export const espaco = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
