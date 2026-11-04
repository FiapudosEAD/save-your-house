import AsyncStorage from '@react-native-async-storage/async-storage';

export { API_URL_PADRAO, CHAVE_IOT_PADRAO, MODO_DEMO_PADRAO, TEMPO_LIMITE_MS } from './constantes';
import { API_URL_PADRAO, MODO_DEMO_PADRAO } from './constantes';

const CHAVE = '@alertabairro/config';

export async function carregarConfig() {
  try {
    const salvo = await AsyncStorage.getItem(CHAVE);
    if (salvo) return { apiUrl: API_URL_PADRAO, modoDemo: MODO_DEMO_PADRAO, ...JSON.parse(salvo) };
  } catch {
    // sem config salva: usa o padrão
  }
  return { apiUrl: API_URL_PADRAO, modoDemo: MODO_DEMO_PADRAO };
}

export async function salvarConfig(config) {
  await AsyncStorage.setItem(CHAVE, JSON.stringify(config));
}
