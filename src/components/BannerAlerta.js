import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlertas } from '../context/AlertaContext';
import { niveis } from '../theme';

/** Aviso fixo no topo quando chega um alerta novo para o bairro do cidadão. */
export function BannerAlerta() {
  const { novo, dispensar } = useAlertas();
  const insets = useSafeAreaInsets();
  if (!novo) return null;
  const n = niveis[novo.nivel];
  return (
    <View style={[st.caixa, { backgroundColor: n.cor, paddingTop: insets.top + 10 }]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Ionicons name={n.icone} size={28} color="#fff" />
      <Pressable
        style={{ flex: 1 }}
        onPress={() => {
          dispensar();
          router.push(`/bairro/${novo.bairroId}`);
        }}
      >
        <Text style={st.titulo}>
          {n.rotulo.toUpperCase()} · {novo.bairroNome}
        </Text>
        <Text style={st.texto} numberOfLines={3}>
          {novo.mensagem}
        </Text>
        <Text style={st.link}>Toque para ver detalhes</Text>
      </Pressable>
      <Pressable onPress={dispensar} accessibilityLabel="Fechar aviso" hitSlop={12}>
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  caixa: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  titulo: { color: '#fff', fontWeight: '800', fontSize: 15 },
  texto: { color: '#fff', fontSize: 14, marginTop: 2 },
  link: { color: '#fff', fontSize: 12, marginTop: 4, textDecorationLine: 'underline' },
});
