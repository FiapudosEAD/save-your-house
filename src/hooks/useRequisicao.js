import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Executa uma chamada à API e controla carregando / erro / dados.
 * recarregar(true) faz um "puxar para atualizar" sem esconder a tela.
 */
export function useRequisicao(funcao, deps = []) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const montado = useRef(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const executar = useCallback(funcao, deps);

  const recarregar = useCallback(
    async (silencioso = false) => {
      if (silencioso) setAtualizando(true);
      else setCarregando(true);
      try {
        const r = await executar();
        if (!montado.current) return;
        setDados(r);
        setErro(null);
      } catch (e) {
        if (montado.current) setErro(e);
      } finally {
        if (montado.current) {
          setCarregando(false);
          setAtualizando(false);
        }
      }
    },
    [executar],
  );

  useEffect(() => {
    montado.current = true;
    recarregar();
    return () => {
      montado.current = false;
    };
  }, [recarregar]);

  return { dados, erro, carregando, atualizando, recarregar };
}
