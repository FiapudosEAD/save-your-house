import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Aviso, Botao, Campo } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { cores, espaco } from '../theme';

const CONTAS_DEMO = [
  { rotulo: 'Cidadã (Maria)', email: 'maria@email.com', senha: 'Maria@123' },
  { rotulo: 'Defesa Civil (Admin)', email: 'admin@alertabairro.com', senha: 'Admin@123' },
];

export default function Login() {
  const { entrar, config } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function aoEntrar() {
    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }
    setErro('');
    setEnviando(true);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.primaria }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={st.conteudo} keyboardShouldPersistTaps="handled">
          <View style={st.topo}>
            <View style={st.logo}>
              <Ionicons name="water" size={40} color={cores.primaria} />
            </View>
            <Text style={st.nome}>AlertaBairro</Text>
            <Text style={st.slogan}>Alerta de alagamento no seu bairro, com sensores e com a sua ajuda.</Text>
          </View>

          <View style={st.cartao}>
            <Text style={st.titulo}>Entrar</Text>
            <Aviso texto={erro} />
            <Campo rotulo="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
            <Campo rotulo="Senha" value={senha} onChangeText={setSenha} placeholder="Sua senha" secureTextEntry={!mostrarSenha} autoComplete="password" textContentType="password" onSubmitEditing={aoEntrar} />
            <Pressable onPress={() => setMostrarSenha((v) => !v)} accessibilityRole="button" style={{ alignSelf: 'flex-end', marginTop: -6 }}>
              <Text style={st.link}>{mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}</Text>
            </Pressable>
            <Botao titulo="Entrar" icone="log-in" onPress={aoEntrar} carregando={enviando} />
            <Botao titulo="Criar conta" variante="secundario" onPress={() => router.push('/cadastro')} />

            {config?.modoDemo ? (
              <View style={st.demo}>
                <Text style={st.demoTitulo}>Modo demonstração · contas de teste</Text>
                {CONTAS_DEMO.map((c) => (
                  <Pressable key={c.email} onPress={() => { setEmail(c.email); setSenha(c.senha); }} style={st.demoLinha} accessibilityRole="button">
                    <Text style={st.demoTexto}>{c.rotulo}</Text>
                    <Text style={st.demoEmail}>{c.email} / {c.senha}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <Link href="/conexao" style={st.conexao}>
            <Ionicons name="settings-outline" size={14} color="#fff" /> {config?.modoDemo ? 'Usando servidor de demonstração' : `API: ${config?.apiUrl}`} · alterar
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  conteudo: { flexGrow: 1, justifyContent: 'center', padding: espaco.l, maxWidth: 520, width: '100%', alignSelf: 'center' },
  topo: { alignItems: 'center', marginBottom: espaco.xl },
  logo: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nome: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: espaco.s },
  slogan: { color: '#DCE9F7', fontSize: 15, textAlign: 'center', marginTop: 4 },
  cartao: { backgroundColor: '#fff', borderRadius: 16, padding: espaco.xl },
  titulo: { fontSize: 22, fontWeight: '800', color: cores.texto, marginBottom: espaco.m },
  link: { color: cores.primaria, fontWeight: '600', fontSize: 14 },
  demo: { marginTop: espaco.l, padding: espaco.m, borderRadius: 10, backgroundColor: cores.primariaClara },
  demoTitulo: { fontWeight: '700', color: cores.primaria, marginBottom: 6 },
  demoLinha: { paddingVertical: 6 },
  demoTexto: { fontWeight: '600', color: cores.texto },
  demoEmail: { color: cores.textoSuave, fontSize: 13 },
  conexao: { color: '#fff', textAlign: 'center', marginTop: espaco.l, fontSize: 13 },
});
