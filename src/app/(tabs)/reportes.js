import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { reportesApi } from '../../api/servicos';
import { Aviso, Botao, Cartao, Carregando, ErroTela, Seletor, Vazio } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRequisicao } from '../../hooks/useRequisicao';
import { cores, espaco } from '../../theme';
import { confirmar } from '../../utils/confirmar';
import { GRAVIDADE_REPORTE, STATUS_REPORTE, haQuantoTempo } from '../../utils/formato';

const COR_STATUS = { PENDENTE: '#B26A00', CONFIRMADO: '#C62828', RESOLVIDO: '#2E7D32' };

export default function Reportes() {
  const { usuario, ehAdmin } = useAuth();
  const [filtro, setFiltro] = useState(ehAdmin ? 'todos' : 'meus');
  const consulta = {
    meus: { meus: true },
    bairro: { bairroId: usuario.bairroId },
    todos: {},
  }[filtro];
  const { dados, erro, carregando, atualizando, recarregar } = useRequisicao(() => reportesApi.listar(consulta), [filtro]);
  const [aviso, setAviso] = useState(null);

  useFocusEffect(
    useCallback(() => {
      recarregar(true);
    }, [recarregar]),
  );

  async function acao(fn, ok) {
    setAviso(null);
    try {
      await fn();
      setAviso({ tipo: 'sucesso', texto: ok });
      recarregar(true);
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message });
    }
  }

  async function excluir(r) {
    if (await confirmar('Excluir reporte', `Excluir o reporte de "${r.rua}"?`, 'Excluir')) {
      acao(() => reportesApi.excluir(r.id), 'Reporte excluído.');
    }
  }

  const opcoes = [
    { valor: 'meus', rotulo: 'Meus reportes' },
    ...(usuario.bairroId ? [{ valor: 'bairro', rotulo: 'Do meu bairro' }] : []),
    { valor: 'todos', rotulo: 'Todos' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={dados || []}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={st.lista}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => recarregar(true)} />}
        ListHeaderComponent={
          <View>
            <Seletor opcoes={opcoes} valor={filtro} onChange={setFiltro} />
            {aviso ? <Aviso tipo={aviso.tipo} texto={aviso.texto} /> : null}
            {carregando ? <Carregando /> : null}
            {erro ? <ErroTela erro={erro} aoTentarDeNovo={() => recarregar()} /> : null}
          </View>
        }
        ListEmptyComponent={
          !carregando && !erro ? (
            <Vazio icone="water-outline" titulo="Nenhum reporte" texto="Viu uma rua alagada? Toque em “Novo reporte” e avise seus vizinhos." />
          ) : null
        }
        renderItem={({ item: r }) => {
          const meu = r.usuarioId === usuario.id;
          return (
            <Cartao>
              <View style={st.linha}>
                <Text style={[st.status, { color: COR_STATUS[r.status], borderColor: COR_STATUS[r.status] }]}>{STATUS_REPORTE[r.status]}</Text>
                <Text style={st.sub}>{haQuantoTempo(r.criadoEm)}</Text>
              </View>
              <Text style={st.rua}>{r.rua}</Text>
              <Text style={st.sub}>
                {r.bairroNome} · {GRAVIDADE_REPORTE[r.gravidade]} · {r.totalConfirmacoes} confirmação(ões) · por {meu ? 'você' : r.autorNome}
              </Text>
              {r.descricao ? <Text style={st.desc}>{r.descricao}</Text> : null}
              <View style={st.acoes}>
                <Pressable style={st.acao} onPress={() => router.push(`/bairro/${r.bairroId}`)} accessibilityRole="button">
                  <Ionicons name="map-outline" size={16} color={cores.primaria} />
                  <Text style={st.acaoTexto}>Ver bairro</Text>
                </Pressable>
                {meu || ehAdmin ? (
                  <Pressable style={st.acao} onPress={() => router.push({ pathname: '/reporte/form', params: { id: r.id } })} accessibilityRole="button">
                    <Ionicons name="create-outline" size={16} color={cores.primaria} />
                    <Text style={st.acaoTexto}>Editar</Text>
                  </Pressable>
                ) : null}
                {(meu || ehAdmin) && r.status !== 'RESOLVIDO' ? (
                  <Pressable style={st.acao} onPress={() => acao(() => reportesApi.alterarStatus(r.id, 'RESOLVIDO'), 'Marcado como resolvido.')} accessibilityRole="button">
                    <Ionicons name="checkmark-done" size={16} color={cores.sucesso} />
                    <Text style={[st.acaoTexto, { color: cores.sucesso }]}>Água baixou</Text>
                  </Pressable>
                ) : null}
                {ehAdmin && r.status === 'PENDENTE' ? (
                  <Pressable style={st.acao} onPress={() => acao(() => reportesApi.alterarStatus(r.id, 'CONFIRMADO'), 'Reporte validado.')} accessibilityRole="button">
                    <Ionicons name="shield-checkmark-outline" size={16} color={cores.primaria} />
                    <Text style={st.acaoTexto}>Validar</Text>
                  </Pressable>
                ) : null}
                {meu || ehAdmin ? (
                  <Pressable style={st.acao} onPress={() => excluir(r)} accessibilityRole="button" accessibilityLabel={`Excluir reporte ${r.rua}`}>
                    <Ionicons name="trash-outline" size={16} color={cores.erro} />
                    <Text style={[st.acaoTexto, { color: cores.erro }]}>Excluir</Text>
                  </Pressable>
                ) : null}
              </View>
            </Cartao>
          );
        }}
        ListFooterComponent={<View style={{ height: 70 }} />}
      />
      <View style={st.rodape}>
        <Botao titulo="Novo reporte" icone="add-circle" onPress={() => router.push('/reporte/form')} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  lista: { padding: espaco.l, maxWidth: 720, width: '100%', alignSelf: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { fontSize: 12, fontWeight: '800', borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  rua: { fontSize: 17, fontWeight: '700', color: cores.texto, marginTop: espaco.s },
  sub: { fontSize: 13, color: cores.textoSuave, marginTop: 2 },
  desc: { fontSize: 15, color: cores.texto, marginTop: 6 },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.l, marginTop: espaco.m, borderTopWidth: 1, borderTopColor: cores.borda, paddingTop: espaco.s },
  acao: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  acaoTexto: { color: cores.primaria, fontWeight: '700', fontSize: 14 },
  rodape: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: espaco.m, paddingTop: 0, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
