import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { definirConfig, obterConfig } from '../api/client';
import { bairrosApi } from '../api/servicos';
import { Aviso, Botao, Campo, Cartao } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { cores, espaco } from '../theme';

export default function Conexao() {
  const { config, alterarConfig } = useAuth();
  const [modoDemo, setModoDemo] = useState(config.modoDemo);
  const [apiUrl, setApiUrl] = useState(config.apiUrl);
  const [resultado, setResultado] = useState(null);
  const [testando, setTestando] = useState(false);

  async function testar() {
    setTestando(true);
    setResultado(null);
    const anterior = obterConfig();
    definirConfig({ modoDemo, apiUrl });
    try {
      const lista = await bairrosApi.listar();
      setResultado({ tipo: 'sucesso', texto: `Conectado! A API respondeu com ${lista.length} bairros.` });
    } catch (e) {
      setResultado({ tipo: 'erro', texto: e.message });
    } finally {
      definirConfig(anterior);
      setTestando(false);
    }
  }

  async function salvar() {
    await alterarConfig({ modoDemo, apiUrl: apiUrl.trim() });
    router.replace('/login');
  }

  return (
    <ScrollView contentContainerStyle={{ padding: espaco.l, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <Cartao>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: espaco.m }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>Modo demonstração</Text>
            <Text style={{ color: cores.textoSuave, marginTop: 4 }}>
              Usa um servidor simulado dentro do app, com as mesmas rotas da API. Desligue para usar a API Java/C# do grupo.
            </Text>
          </View>
          <Switch value={modoDemo} onValueChange={setModoDemo} accessibilityLabel="Modo demonstração" />
        </View>
      </Cartao>
      {!modoDemo ? (
        <Campo
          rotulo="Endereço da API"
          value={apiUrl}
          onChangeText={setApiUrl}
          autoCapitalize="none"
          keyboardType="url"
          dica="Emulador Android: http://10.0.2.2:8080 · Celular: http://IP-DO-PC:8080"
        />
      ) : null}
      {resultado ? <Aviso tipo={resultado.tipo} texto={resultado.texto} /> : null}
      <Botao titulo="Testar conexão" variante="secundario" icone="pulse" onPress={testar} carregando={testando} />
      <Botao titulo="Salvar e voltar ao login" icone="save" onPress={salvar} />
      <Text style={{ color: cores.textoSuave, fontSize: 13, marginTop: espaco.m }}>Ao salvar, você precisa entrar novamente.</Text>
    </ScrollView>
  );
}
