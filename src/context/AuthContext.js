import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { aoSessaoExpirar, definirConfig, definirToken } from '../api/client';
import { carregarConfig, salvarConfig } from '../api/config';
import { authApi } from '../api/servicos';

const CHAVE_SESSAO = '@alertabairro/sessao';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);
  const [config, setConfig] = useState(null);

  const limparSessao = useCallback(async () => {
    definirToken(null);
    setUsuario(null);
    await AsyncStorage.removeItem(CHAVE_SESSAO);
  }, []);

  useEffect(() => {
    (async () => {
      const cfg = await carregarConfig();
      definirConfig(cfg);
      setConfig(cfg);
      // No modo demonstração o servidor simulado reinicia junto com o app, então a sessão antiga não vale.
      if (!cfg.modoDemo) {
        try {
          const salvo = JSON.parse((await AsyncStorage.getItem(CHAVE_SESSAO)) || 'null');
          if (salvo?.token) {
            definirToken(salvo.token);
            setUsuario(await authApi.eu());
          }
        } catch {
          await limparSessao();
        }
      }
      setCarregando(false);
    })();
    aoSessaoExpirar(() => limparSessao());
  }, [limparSessao]);

  const entrar = useCallback(async (email, senha) => {
    const { token, usuario: u } = await authApi.entrar(email.trim(), senha);
    definirToken(token);
    setUsuario(u);
    await AsyncStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token }));
    return u;
  }, []);

  const atualizarUsuario = useCallback(async (dados) => {
    const u = await authApi.atualizarEu(dados);
    setUsuario(u);
    return u;
  }, []);

  const alterarConfig = useCallback(
    async (nova) => {
      const cfg = { ...config, ...nova };
      definirConfig(cfg);
      setConfig(cfg);
      await salvarConfig(cfg);
      await limparSessao();
    },
    [config, limparSessao],
  );

  const valor = useMemo(
    () => ({
      carregando,
      usuario,
      config,
      ehAdmin: usuario?.perfil === 'ADMIN',
      entrar,
      sair: limparSessao,
      atualizarUsuario,
      alterarConfig,
    }),
    [carregando, usuario, config, entrar, limparSessao, atualizarUsuario, alterarConfig],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
