import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { bairrosApi, reportesApi } from '../../api/servicos';
import { Aviso, Botao, Campo, Carregando, ErroTela, Seletor } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useRequisicao } from '../../hooks/useRequisicao';
import { cores, espaco } from '../../theme';
import { GRAVIDADE_REPORTE } from '../../utils/formato';

const COR_GRAVIDADE = { CALCADA: '#2E7D32', CANELA: '#B26A00', JOELHO: '#D84315', CINTURA: '#B71C1C' };

/** Cadastro (POST) e edição (PUT) de reporte de rua alagada. Com ?id=X, edita. */
export default function FormReporte() {
  const params = useLocalSearchParams();
  const editando = params.id ? Number(params.id) : null;
  const { usuario } = useAuth();
  const base = useRequisicao(
    async () => ({
      bairros: await bairrosApi.listar(),
      reporte: editando ? await reportesApi.detalhe(editando) : null,
    }),
    [editando],
  );
  const [form, setForm] = useState({ bairroId: Number(params.bairroId) || usuario.bairroId || null, rua: '', gravidade: null, descricao: '' });
  const [erros, setErros] = useState({});
  const [mensagem, setMensagem] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const mudar = (campo) => (v) => setForm((f) => ({ ...f, [campo]: v }));

  useEffect(() => {
    const r = base.dados?.reporte;
    if (r) setForm({ bairroId: r.bairroId, rua: r.rua, gravidade: r.gravidade, descricao: r.descricao || '' });
  }, [base.dados]);

  async function salvar() {
    const e = {};
    if (!form.bairroId) e.bairroId = 'Selecione o bairro.';
    if (form.rua.trim().length < 3) e.rua = 'Informe a rua ou um ponto de referência.';
    if (!form.gravidade) e.gravidade = 'Escolha a altura da água.';
    if (form.descricao.length > 500) e.descricao = 'Máximo de 500 caracteres.';
    setErros(e);
    setMensagem(null);
    if (Object.keys(e).length) return;
    setEnviando(true);
    try {
      const corpo = { ...form, rua: form.rua.trim(), descricao: form.descricao.trim() };
      if (editando) await reportesApi.atualizar(editando, corpo);
      else await reportesApi.criar(corpo);
      setMensagem({ tipo: 'sucesso', texto: editando ? 'Reporte atualizado.' : 'Reporte enviado! Seus vizinhos já podem ver e confirmar.' });
      setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/reportes')), 1200);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message });
      if (err.erros) setErros(err.erros);
    } finally {
      setEnviando(false);
    }
  }

  if (base.carregando) return <Carregando />;
  if (base.erro) return <ErroTela erro={base.erro} aoTentarDeNovo={() => base.recarregar()} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editando ? 'Editar reporte' : 'Reportar rua alagada' }} />
      <ScrollView contentContainerStyle={{ padding: espaco.l, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <Text style={{ color: cores.textoSuave, marginBottom: espaco.l, fontSize: 15 }}>
          Seu reporte ajuda vizinhos e a Defesa Civil. Com 2 confirmações de outros moradores, ele entra no cálculo do alerta do bairro.
        </Text>
        {mensagem ? <Aviso tipo={mensagem.tipo} texto={mensagem.texto} /> : null}
        <Seletor rotulo="Bairro" opcoes={base.dados.bairros.map((b) => ({ valor: b.id, rotulo: b.nome }))} valor={form.bairroId} onChange={mudar('bairroId')} erro={erros.bairroId} />
        <Campo rotulo="Rua ou ponto de referência" value={form.rua} onChangeText={mudar('rua')} erro={erros.rua} placeholder="Ex.: Rua Capachós, perto da escola" maxLength={120} />
        <Seletor
          rotulo="Altura da água"
          opcoes={Object.entries(GRAVIDADE_REPORTE).map(([valor, rotulo]) => ({ valor, rotulo, cor: COR_GRAVIDADE[valor] }))}
          valor={form.gravidade}
          onChange={mudar('gravidade')}
          erro={erros.gravidade}
        />
        <Campo
          rotulo="Detalhes (opcional)"
          value={form.descricao}
          onChangeText={mudar('descricao')}
          erro={erros.descricao}
          multiline
          maxLength={500}
          placeholder="Ex.: carro ilhado, bueiro entupido, água entrando nas casas"
          dica={`${form.descricao.length}/500`}
        />
        <Botao titulo={editando ? 'Salvar alterações' : 'Enviar reporte'} icone="send" onPress={salvar} carregando={enviando} />
        <Botao titulo="Cancelar" variante="secundario" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
