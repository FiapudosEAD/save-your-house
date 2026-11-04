import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { alertasApi } from '../api/servicos';
import { ORDEM } from '../utils/nivel';
import { useAuth } from './AuthContext';

/**
 * Acompanha os alertas ativos do bairro do cidadão.
 * Consulta GET /api/alertas?bairroId=X&ativos=true a cada INTERVALO_MS e,
 * quando surge um alerta novo, mostra um aviso no topo do app e vibra o celular.
 */
const INTERVALO_MS = 5000;
const AlertaContext = createContext(null);

export function AlertaProvider({ children }) {
  const { usuario } = useAuth();
  const [ativos, setAtivos] = useState([]);
  const [novo, setNovo] = useState(null);
  const [semConexao, setSemConexao] = useState(false);
  const vistos = useRef(new Set());
  const primeiraCarga = useRef(true);
  const ultimoNivel = useRef('NORMAL');
  const bairroId = usuario?.bairroId;

  const consultar = useCallback(async () => {
    if (!bairroId) return;
    try {
      const lista = await alertasApi.listar({ bairroId, ativos: true });
      setSemConexao(false);
      setAtivos(lista);
      const inedito = lista.find((a) => !vistos.current.has(a.id));
      lista.forEach((a) => vistos.current.add(a.id));
      // Só avisa quando o risco SOBE (ou no primeiro alerta), para não repetir o aviso a cada oscilação do sensor.
      const nivelAtual = lista[0]?.nivel ?? 'NORMAL';
      const subiu = ORDEM.indexOf(nivelAtual) > ORDEM.indexOf(ultimoNivel.current);
      if (inedito && subiu) {
        setNovo(inedito);
        if (!primeiraCarga.current) Vibration.vibrate([0, 400, 200, 400]);
      }
      if (!lista.length) setNovo(null);
      ultimoNivel.current = nivelAtual;
      primeiraCarga.current = false;
    } catch {
      setSemConexao(true);
    }
  }, [bairroId]);

  useEffect(() => {
    vistos.current = new Set();
    primeiraCarga.current = true;
    ultimoNivel.current = 'NORMAL';
    setAtivos([]);
    setNovo(null);
    if (!bairroId) return undefined;
    consultar();
    const t = setInterval(consultar, INTERVALO_MS);
    return () => clearInterval(t);
  }, [bairroId, consultar]);

  return (
    <AlertaContext.Provider value={{ ativos, novo, dispensar: () => setNovo(null), semConexao, atualizar: consultar }}>
      {children}
    </AlertaContext.Provider>
  );
}

export const useAlertas = () => useContext(AlertaContext);
