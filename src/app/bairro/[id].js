import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { bairrosApi, reportesApi, sensoresApi } from '../../api/servicos';
import { Aviso, Botao, Cartao, Carregando, ErroTela, Medidor, NivelBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRequisicao } from '../../hooks/useRequisicao';
import { cores, espaco, niveis } from '../../theme';
import { GRAVIDADE_REPORTE, STATUS_REPORTE, haQuantoTempo } from '../../utils/formato';
import { LIMITES_CHUVA } from '../../utils/nivel';

const DICAS = [
  'Não atravesse ruas alagadas, nem a pé nem de carro.',
  'Desligue a energia se a água entrar em casa.',
  'Guarde documentos e remédios em local alto.',
  'Emergência: Defesa Civil 199 · Bombeiros 193.',
];

async function carregar(id) {
  const bairro = await bairrosApi.detalhe(id);
  const historicos = await Promise.all(bairro.sensores.map((s) => sensoresApi.leituras(s.id, 12)));
  bairro.sensores = bairro.sensores.map((s, i) => ({ ...s, historico: historicos[i].slice().reverse() }));
  return bairro;
}

function Historico({ leituras, maximo }) {
  if (!leituras?.length) return null;
  return (
    <View style={st.grafico} accessibilityLabel="Histórico das últimas leituras">
      {leituras.map((l) => (
        <View key={l.id} style={st.colunaFundo}>
          <View style={[st.coluna, { height: `${Math.max(4, Math.min(100, (l.valor / maximo) * 100))}%`, backgroundColor: niveis[l.nivel].cor }]} />
        </View>
      ))}
    </View>
  );
}

export default function DetalheBairro() {
  const { id } = useLocalSearchParams();
  const { usuario, ehAdmin } = useAuth();
  const { dados: b, erro, carregando, atualizando, recarregar } = useRequisicao(() => carregar(Number(id)), [id]);
  const [acao, setAcao] = useState({ id: null, erro: '', ok: '' });

  useFocusEffect(
    useCallback(() => {
      const t = setInterval(() => recarregar(true), 5000);
      return () => clearInterval(t);
    }, [recarregar]),
  );

  async function executar(reporteId, fn, mensagemOk) {
    setAcao({ id: reporteId, erro: '', ok: '' });
    try {
      await fn();
      setAcao({ id: null, erro: '', ok: mensagemOk });
      recarregar(true);
    } catch (e) {
      setAcao({ id: null, erro: e.message, ok: '' });
    }
  }

  if (carregando && !b) return <Carregando />;
  if (erro && !b) return <ErroTela erro={erro} aoTentarDeNovo={() => recarregar()} />;
  const n = niveis[b.nivelAlerta];

  return (
    <ScrollView
      contentContainerStyle={st.conteudo}
      refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => recarregar(true)} />}
    >
      <Stack.Screen options={{ title: b.nome }} />
      <Cartao style={{ borderColor: n.cor, borderWidth: 2, backgroundColor: n.fundo }}>
        <Text style={st.nome}>{b.nome}</Text>
        <Text style={st.sub}>
          {b.cidade} · Zona {b.zona} · {b.corpoHidrico}
        </Text>
        <View style={{ marginTop: espaco.s }}>
          <NivelBadge nivel={b.nivelAlerta} grande />
        </View>
        {b.alertasAtivos.map((a) => (
          <View key={a.id} style={{ marginTop: espaco.s }}>
            <Text style={st.texto}>{a.mensagem}</Text>
            <Text style={st.sub}>
              Origem: {a.origem === 'SENSOR' ? 'sensor' : 'reportes de cidadãos'} · {haQuantoTempo(a.criadoEm)}
            </Text>
          </View>
        ))}
        {!b.alertasAtivos.length ? <Text style={[st.texto, { marginTop: espaco.s }]}>Nenhum alerta ativo.</Text> : null}
      </Cartao>

      <Text style={st.secao}>Sensores</Text>
      {b.sensores.map((s) => {
        const ult = s.ultimaLeitura;
        const maximo = s.tipo === 'NIVEL_RIO' ? s.limite : LIMITES_CHUVA.EMERGENCIA;
        return (
          <Cartao key={s.id}>
            <View style={st.linha}>
              <Ionicons name={s.tipo === 'NIVEL_RIO' ? 'water' : 'rainy'} size={22} color={cores.primaria} />
              <View style={{ flex: 1, marginLeft: espaco.s }}>
                <Text style={st.sensorNome}>{s.tipo === 'NIVEL_RIO' ? 'Nível do rio' : 'Chuva'}</Text>
                <Text style={st.sub}>
                  {s.codigo} · {s.descricao}
                </Text>
              </View>
              {ult ? <NivelBadge nivel={ult.nivel} /> : null}
            </View>
            {ult ? (
              <>
                <Text style={st.valor}>
                  {ult.valor} <Text style={st.unidade}>{s.unidade}</Text>
                </Text>
                <Medidor valor={ult.valor} maximo={maximo} nivel={ult.nivel} />
                <Text style={st.sub}>
                  {s.tipo === 'NIVEL_RIO' ? `Cota de transbordamento: ${s.limite} cm` : `Chuva extrema a partir de ${LIMITES_CHUVA.EMERGENCIA} mm/h`} · leitura{' '}
                  {haQuantoTempo(ult.registradaEm)}
                </Text>
                <Historico leituras={s.historico} maximo={maximo} />
              </>
            ) : (
              <Text style={st.sub}>Sem leituras ainda.</Text>
            )}
          </Cartao>
        );
      })}

      <View style={[st.linha, { justifyContent: 'space-between', marginTop: espaco.m }]}>
        <Text style={[st.secao, { marginTop: 0 }]}>Ruas alagadas reportadas</Text>
      </View>
      <Aviso texto={acao.erro} />
      <Aviso tipo="sucesso" texto={acao.ok} />
      {b.reportes.length === 0 ? <Text style={[st.sub, { marginBottom: espaco.m }]}>Nenhum reporte aberto neste bairro.</Text> : null}
      {b.reportes.map((r) => {
        const meu = r.usuarioId === usuario.id;
        return (
          <Cartao key={r.id}>
            <Text style={st.sensorNome}>{r.rua}</Text>
            <Text style={st.sub}>
              {GRAVIDADE_REPORTE[r.gravidade]} · {STATUS_REPORTE[r.status]} · por {meu ? 'você' : r.autorNome} {haQuantoTempo(r.criadoEm)}
            </Text>
            {r.descricao ? <Text style={[st.texto, { marginTop: 4 }]}>{r.descricao}</Text> : null}
            <Text style={[st.sub, { marginTop: 4 }]}>{r.totalConfirmacoes} vizinho(s) confirmaram</Text>
            {!meu && !r.confirmadoPorMim && r.status === 'PENDENTE' ? (
              <Botao
                titulo="Também vejo alagamento aqui"
                icone="hand-left"
                variante="secundario"
                carregando={acao.id === r.id}
                onPress={() => executar(r.id, () => reportesApi.confirmar(r.id), 'Obrigado! Sua confirmação foi registrada.')}
              />
            ) : null}
            {ehAdmin && r.status === 'PENDENTE' ? (
              <Botao titulo="Validar reporte (Defesa Civil)" icone="shield-checkmark" carregando={acao.id === r.id} onPress={() => executar(r.id, () => reportesApi.alterarStatus(r.id, 'CONFIRMADO'), 'Reporte validado.')} />
            ) : null}
            {ehAdmin || meu ? (
              <Botao titulo="Água baixou" icone="checkmark-done" variante="secundario" carregando={acao.id === r.id} onPress={() => executar(r.id, () => reportesApi.alterarStatus(r.id, 'RESOLVIDO'), 'Reporte marcado como resolvido.')} />
            ) : null}
          </Cartao>
        );
      })}
      <Botao titulo="Reportar rua alagada aqui" icone="add-circle" onPress={() => router.push({ pathname: '/reporte/form', params: { bairroId: b.id } })} />

      <Text style={st.secao}>Como se proteger</Text>
      <Cartao>
        {DICAS.map((d) => (
          <Text key={d} style={[st.texto, { marginBottom: 6 }]}>
            • {d}
          </Text>
        ))}
      </Cartao>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  conteudo: { padding: espaco.l, paddingBottom: espaco.xl * 2, maxWidth: 720, width: '100%', alignSelf: 'center' },
  nome: { fontSize: 24, fontWeight: '800', color: cores.texto },
  sub: { fontSize: 13, color: cores.textoSuave, marginTop: 2 },
  texto: { fontSize: 15, color: cores.texto, lineHeight: 21 },
  secao: { fontSize: 17, fontWeight: '700', color: cores.texto, marginTop: espaco.m, marginBottom: espaco.s },
  linha: { flexDirection: 'row', alignItems: 'center' },
  sensorNome: { fontSize: 16, fontWeight: '700', color: cores.texto },
  valor: { fontSize: 28, fontWeight: '800', color: cores.texto, marginTop: espaco.s },
  unidade: { fontSize: 15, fontWeight: '600', color: cores.textoSuave },
  grafico: { flexDirection: 'row', alignItems: 'flex-end', height: 48, gap: 3, marginTop: espaco.m },
  colunaFundo: { flex: 1, height: '100%', justifyContent: 'flex-end', backgroundColor: '#F0F3F7', borderRadius: 3 },
  coluna: { borderRadius: 3 },
});
