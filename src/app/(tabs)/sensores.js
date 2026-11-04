import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { bairrosApi, sensoresApi } from '../../api/servicos';
import { Botao, Cartao, Carregando, ErroTela, NivelBadge, Seletor } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRequisicao } from '../../hooks/useRequisicao';
import { CENARIOS } from '../../iot/modeloSensores';
import { INTERVALO_MS, simulador } from '../../iot/simulador';
import { cores, espaco } from '../../theme';
import { dataHora } from '../../utils/formato';

const COR_CENARIO = { NORMAL: '#2E7D32', CHUVA_FORTE: '#B26A00', ENCHENTE: '#B71C1C' };

/** Painel da Defesa Civil: controla os sensores simulados e acompanha as leituras que chegam pela API. */
export default function Sensores() {
  const { ehAdmin } = useAuth();
  const { dados, erro, carregando, atualizando, recarregar } = useRequisicao(
    async () => ({ sensores: await sensoresApi.listar(), bairros: await bairrosApi.listar() }),
    [],
  );
  const [sim, setSim] = useState(null);

  useEffect(() => simulador.assinar(setSim), []);
  useFocusEffect(
    useCallback(() => {
      const t = setInterval(() => recarregar(true), INTERVALO_MS);
      return () => clearInterval(t);
    }, [recarregar]),
  );

  if (!ehAdmin) return <Redirect href="/" />;
  if (carregando && !dados) return <Carregando />;
  if (erro && !dados) return <ErroTela erro={erro} aoTentarDeNovo={() => recarregar()} />;

  const { sensores, bairros } = dados;

  return (
    <ScrollView contentContainerStyle={st.conteudo} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => recarregar(true)} />}>
      <Cartao>
        <View style={st.linha}>
          <Ionicons name="hardware-chip" size={22} color={cores.primaria} />
          <Text style={[st.titulo, { marginLeft: 8, flex: 1 }]}>Simulador de sensores</Text>
          <View style={[st.ponto, { backgroundColor: sim?.rodando ? cores.sucesso : cores.textoSuave }]} />
          <Text style={st.sub}>{sim?.rodando ? 'enviando' : 'parado'}</Text>
        </View>
        <Text style={[st.sub, { marginTop: 6 }]}>
          {sensores.length} sensores ({bairros.length} bairros × nível do rio + pluviômetro). A cada {INTERVALO_MS / 1000} s cada sensor envia uma
          leitura para POST /api/leituras. A API compara com os limites e cria ou encerra alertas.
        </Text>
        <Text style={[st.sub, { marginTop: 4 }]}>Leituras enviadas nesta sessão: {sim?.envios ?? 0}</Text>
        {sim?.rodando ? (
          <Botao titulo="Pausar simulação" icone="pause" variante="secundario" onPress={() => simulador.parar()} />
        ) : (
          <Botao titulo="Iniciar simulação" icone="play" onPress={() => simulador.iniciar(sensores, bairros)} />
        )}
      </Cartao>

      <Text style={st.secao}>Cenário por bairro</Text>
      {bairros.map((b) => (
        <Cartao key={b.id}>
          <View style={[st.linha, { marginBottom: espaco.s }]}>
            <Text style={[st.nome, { flex: 1 }]}>{b.nome}</Text>
            <NivelBadge nivel={b.nivelAlerta} />
          </View>
          <Seletor
            opcoes={Object.entries(CENARIOS).map(([valor, c]) => ({ valor, rotulo: c.rotulo, cor: COR_CENARIO[valor] }))}
            valor={sim?.cenarios[b.id] || 'NORMAL'}
            onChange={(c) => simulador.definirCenario(b.id, c, b.nome)}
          />
          {sensores
            .filter((s) => s.bairroId === b.id)
            .map((s) => (
              <View key={s.id} style={st.sensor}>
                <Ionicons name={s.tipo === 'NIVEL_RIO' ? 'water' : 'rainy'} size={16} color={cores.primaria} />
                <Text style={[st.sub, { flex: 1, marginLeft: 6 }]}>{s.codigo}</Text>
                <Text style={st.valor}>
                  {s.ultimaLeitura ? `${s.ultimaLeitura.valor} ${s.unidade}` : '—'}
                  {s.tipo === 'NIVEL_RIO' ? <Text style={st.sub}> / {s.limite}</Text> : null}
                </Text>
              </View>
            ))}
        </Cartao>
      ))}

      <Text style={st.secao}>Registro do simulador</Text>
      <Cartao>
        {!sim?.log.length ? <Text style={st.sub}>Nada ainda. Inicie a simulação e escolha “Enchente” em um bairro.</Text> : null}
        {sim?.log.map((l) => (
          <Text key={l.id} style={[st.log, l.tipo === 'erro' && { color: cores.erro }, l.tipo === 'alerta' && { color: '#D84315' }]}>
            {dataHora(l.em).slice(6)} {l.texto}
          </Text>
        ))}
      </Cartao>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  conteudo: { padding: espaco.l, paddingBottom: espaco.xl * 2, maxWidth: 720, width: '100%', alignSelf: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center' },
  titulo: { fontSize: 17, fontWeight: '800', color: cores.texto },
  nome: { fontSize: 16, fontWeight: '700', color: cores.texto },
  secao: { fontSize: 17, fontWeight: '700', color: cores.texto, marginTop: espaco.m, marginBottom: espaco.s },
  sub: { fontSize: 13, color: cores.textoSuave },
  ponto: { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
  sensor: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  valor: { fontSize: 15, fontWeight: '700', color: cores.texto },
  log: { fontSize: 12, color: cores.texto, fontFamily: 'monospace', marginBottom: 2 },
});
