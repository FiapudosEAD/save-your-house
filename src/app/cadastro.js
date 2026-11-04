import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { bairrosApi, authApi } from '../api/servicos';
import { Aviso, Botao, Campo, Carregando, ErroTela, Seletor } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useRequisicao } from '../hooks/useRequisicao';
import { cores, espaco } from '../theme';

export default function Cadastro() {
  const { entrar } = useAuth();
  const bairros = useRequisicao(() => bairrosApi.listar(), []);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '', bairroId: null });
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const mudar = (campo) => (v) => setForm((f) => ({ ...f, [campo]: v }));

  function validar() {
    const e = {};
    if (form.nome.trim().length < 3) e.nome = 'Informe seu nome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = 'E-mail inválido.';
    if (form.senha.length < 8 || !/[A-Za-z]/.test(form.senha) || !/\d/.test(form.senha)) e.senha = 'Mínimo de 8 caracteres, com letras e números.';
    if (form.confirmar !== form.senha) e.confirmar = 'As senhas não conferem.';
    if (!form.bairroId) e.bairroId = 'Selecione seu bairro.';
    return e;
  }

  async function enviar() {
    const e = validar();
    setErros(e);
    setErroGeral('');
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      await authApi.cadastrar({ nome: form.nome.trim(), email: form.email.trim(), senha: form.senha, bairroId: form.bairroId });
      await entrar(form.email, form.senha);
      router.replace('/');
    } catch (err) {
      setErroGeral(err.message);
      if (err.erros) setErros(err.erros);
    } finally {
      setEnviando(false);
    }
  }

  if (bairros.carregando) return <Carregando texto="Carregando bairros..." />;
  if (bairros.erro) return <ErroTela erro={bairros.erro} aoTentarDeNovo={() => bairros.recarregar()} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: espaco.l, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: cores.textoSuave, marginBottom: espaco.l, fontSize: 15 }}>
          Crie sua conta para receber alertas do seu bairro e reportar ruas alagadas.
        </Text>
        <Aviso texto={erroGeral} />
        <Campo rotulo="Nome" value={form.nome} onChangeText={mudar('nome')} erro={erros.nome} autoComplete="name" />
        <Campo rotulo="E-mail" value={form.email} onChangeText={mudar('email')} erro={erros.email} autoCapitalize="none" keyboardType="email-address" />
        <Campo rotulo="Senha" value={form.senha} onChangeText={mudar('senha')} erro={erros.senha} secureTextEntry dica="Mínimo de 8 caracteres, com letras e números." />
        <Campo rotulo="Confirmar senha" value={form.confirmar} onChangeText={mudar('confirmar')} erro={erros.confirmar} secureTextEntry />
        <Seletor
          rotulo="Seu bairro"
          opcoes={bairros.dados.map((b) => ({ valor: b.id, rotulo: b.nome }))}
          valor={form.bairroId}
          onChange={mudar('bairroId')}
          erro={erros.bairroId}
        />
        <Botao titulo="Criar conta" icone="person-add" onPress={enviar} carregando={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
