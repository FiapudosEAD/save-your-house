import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { bairrosApi } from '../../api/servicos';
import { Aviso, Botao, Cartao, Seletor } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRequisicao } from '../../hooks/useRequisicao';
import { cores, espaco } from '../../theme';

export default function Perfil() {
  const { usuario, ehAdmin, config, atualizarUsuario, sair } = useAuth();
  const bairros = useRequisicao(() => bairrosApi.listar(), []);
  const [bairroId, setBairroId] = useState(usuario.bairroId);
  const [aviso, setAviso] = useState(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setSalvando(true);
    setAviso(null);
    try {
      await atualizarUsuario({ bairroId });
      setAviso({ tipo: 'sucesso', texto: 'Bairro atualizado. Você passa a receber os alertas dele.' });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e.message });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={st.conteudo}>
      <Cartao>
        <View style={st.linha}>
          <Ionicons name="person-circle" size={52} color={cores.primaria} />
          <View style={{ marginLeft: espaco.m, flex: 1 }}>
            <Text style={st.nome}>{usuario.nome}</Text>
            <Text style={st.sub}>{usuario.email}</Text>
            <Text style={[st.perfil, { backgroundColor: ehAdmin ? '#14213D' : cores.primariaClara, color: ehAdmin ? '#fff' : cores.primaria }]}>
              {ehAdmin ? 'ADMIN · Defesa Civil' : 'CIDADÃO'}
            </Text>
          </View>
        </View>
      </Cartao>

      <Text style={st.secao}>Bairro para alertas</Text>
      <Cartao>
        {aviso ? <Aviso tipo={aviso.tipo} texto={aviso.texto} /> : null}
        {bairros.dados ? (
          <Seletor opcoes={bairros.dados.map((b) => ({ valor: b.id, rotulo: b.nome }))} valor={bairroId} onChange={setBairroId} />
        ) : (
          <Text style={st.sub}>{bairros.erro ? bairros.erro.message : 'Carregando bairros...'}</Text>
        )}
        <Botao titulo="Salvar bairro" icone="save" onPress={salvar} carregando={salvando} desabilitado={bairroId === usuario.bairroId} />
      </Cartao>

      <Text style={st.secao}>Conexão</Text>
      <Cartao onPress={() => router.push('/conexao')} acessibilidade="Configurar conexão com a API">
        <View style={st.linha}>
          <Ionicons name={config.modoDemo ? 'flask' : 'server'} size={22} color={cores.primaria} />
          <View style={{ marginLeft: espaco.s, flex: 1 }}>
            <Text style={st.item}>{config.modoDemo ? 'Modo demonstração' : 'API do grupo'}</Text>
            <Text style={st.sub}>{config.modoDemo ? 'Servidor simulado dentro do app' : config.apiUrl}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={cores.textoSuave} />
        </View>
      </Cartao>

      <Text style={st.secao}>Sobre</Text>
      <Cartao>
        <Text style={st.texto}>
          O AlertaBairro junta sensores de nível do rio e de chuva com reportes dos moradores para avisar cada bairro sobre risco de alagamento.
        </Text>
        <Text style={[st.sub, { marginTop: espaco.s }]}>ODS 11 (Cidades sustentáveis) · ODS 13 (Ação climática) · ODS 3 (Saúde e bem-estar)</Text>
        <Text style={[st.sub, { marginTop: 4 }]}>Emergência: Defesa Civil 199 · Bombeiros 193</Text>
      </Cartao>

      <Botao titulo="Sair" icone="log-out" variante="perigo" onPress={sair} />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  conteudo: { padding: espaco.l, paddingBottom: espaco.xl * 2, maxWidth: 720, width: '100%', alignSelf: 'center' },
  linha: { flexDirection: 'row', alignItems: 'center' },
  nome: { fontSize: 19, fontWeight: '800', color: cores.texto },
  sub: { fontSize: 13, color: cores.textoSuave, marginTop: 2 },
  perfil: { alignSelf: 'flex-start', marginTop: 6, fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden' },
  secao: { fontSize: 17, fontWeight: '700', color: cores.texto, marginTop: espaco.m, marginBottom: espaco.s },
  item: { fontSize: 16, fontWeight: '700', color: cores.texto },
  texto: { fontSize: 15, color: cores.texto, lineHeight: 21 },
});
