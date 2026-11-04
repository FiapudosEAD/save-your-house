import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { bairrosApi } from '../../api/servicos';
import { Aviso, Cartao, Carregando, ErroTela, NivelBadge } from '../../components/ui';
import { useAlertas } from '../../context/AlertaContext';
import { useAuth } from '../../context/AuthContext';
import { useRequisicao } from '../../hooks/useRequisicao';
import { cores, espaco, niveis } from '../../theme';
import { haQuantoTempo } from '../../utils/formato';

export default function Alertas() {
  const { usuario } = useAuth();
  const { ativos } = useAlertas();
  const { dados, erro, carregando, atualizando, recarregar } = useRequisicao(() => bairrosApi.listar(), []);

  // Atualiza a lista a cada 5 s enquanto a tela está aberta.
  useFocusEffect(
    useCallback(() => {
      recarregar(true);
      const t = setInterval(() => recarregar(true), 5000);
      return () => clearInterval(t);
    }, [recarregar]),
  );

  if (carregando && !dados) return <Carregando texto="Buscando a situação dos bairros..." />;
  if (erro && !dados) return <ErroTela erro={erro} aoTentarDeNovo={() => recarregar()} />;

  const meu = dados.find((b) => b.id === usuario.bairroId);
  const outros = [...dados].sort((a, b) => niveis[b.nivelAlerta].ordem - niveis[a.nivelAlerta].ordem || a.nome.localeCompare(b.nome));
  const alertaMeu = ativos[0];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={outros}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={st.lista}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={() => recarregar(true)} />}
        ListHeaderComponent={
          <View>
            {erro ? <Aviso texto={`Sem atualização: ${erro.message}`} /> : null}
            <Text style={st.ola}>Olá, {usuario.nome.split(' ')[0]}</Text>
            {meu ? (
              <Cartao
                style={[st.meu, { borderColor: niveis[meu.nivelAlerta].cor, backgroundColor: niveis[meu.nivelAlerta].fundo }]}
                onPress={() => router.push(`/bairro/${meu.id}`)}
                acessibilidade={`Meu bairro ${meu.nome}, nível ${niveis[meu.nivelAlerta].rotulo}`}
              >
                <Text style={st.rotulo}>MEU BAIRRO</Text>
                <Text style={st.meuNome}>{meu.nome}</Text>
                <View style={{ marginVertical: espaco.s }}>
                  <NivelBadge nivel={meu.nivelAlerta} grande />
                </View>
                <Text style={st.meuTexto}>
                  {alertaMeu ? alertaMeu.mensagem : 'Sem alertas no momento. Os sensores continuam monitorando o rio e a chuva.'}
                </Text>
                {alertaMeu ? <Text style={st.quando}>Emitido {haQuantoTempo(alertaMeu.criadoEm)}</Text> : null}
                <Text style={st.verMais}>Ver sensores e reportes ›</Text>
              </Cartao>
            ) : (
              <Aviso tipo="sucesso" texto="Escolha seu bairro no Perfil para receber alertas." />
            )}
            <Text style={st.secao}>Todos os bairros monitorados</Text>
          </View>
        }
        renderItem={({ item: b }) => (
          <Cartao onPress={() => router.push(`/bairro/${b.id}`)} acessibilidade={`${b.nome}, nível ${niveis[b.nivelAlerta].rotulo}`}>
            <View style={st.linha}>
              <View style={{ flex: 1 }}>
                <Text style={st.nome}>{b.nome}</Text>
                <Text style={st.sub}>
                  Zona {b.zona} · {b.corpoHidrico}
                </Text>
              </View>
              <NivelBadge nivel={b.nivelAlerta} />
            </View>
            <View style={[st.linha, { marginTop: espaco.s, gap: espaco.l }]}>
              <Text style={st.sub}>
                <Ionicons name="notifications-outline" size={13} /> {b.alertasAtivos} alerta(s) ativo(s)
              </Text>
              <Text style={st.sub}>
                <Ionicons name="water-outline" size={13} /> {b.reportesAbertos} reporte(s) aberto(s)
              </Text>
            </View>
          </Cartao>
        )}
      />
      <Pressable style={st.fab} onPress={() => router.push('/reporte/form')} accessibilityRole="button" accessibilityLabel="Reportar rua alagada">
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={st.fabTexto}>Reportar alagamento</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  lista: { padding: espaco.l, paddingBottom: 100, maxWidth: 720, width: '100%', alignSelf: 'center' },
  ola: { fontSize: 22, fontWeight: '800', color: cores.texto, marginBottom: espaco.m },
  meu: { borderWidth: 2 },
  rotulo: { fontSize: 12, fontWeight: '800', color: cores.textoSuave, letterSpacing: 1 },
  meuNome: { fontSize: 24, fontWeight: '800', color: cores.texto },
  meuTexto: { fontSize: 15, color: cores.texto, lineHeight: 21 },
  quando: { fontSize: 13, color: cores.textoSuave, marginTop: 4 },
  verMais: { color: cores.primaria, fontWeight: '700', marginTop: espaco.s },
  secao: { fontSize: 16, fontWeight: '700', color: cores.texto, marginTop: espaco.m, marginBottom: espaco.s },
  linha: { flexDirection: 'row', alignItems: 'center' },
  nome: { fontSize: 17, fontWeight: '700', color: cores.texto },
  sub: { fontSize: 13, color: cores.textoSuave },
  fab: { position: 'absolute', right: espaco.l, bottom: espaco.l, backgroundColor: cores.erro, borderRadius: 28, paddingHorizontal: 18, height: 52, flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  fabTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
