import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { cores, espaco, niveis } from '../theme';

export function Botao({ titulo, onPress, variante = 'primario', carregando = false, desabilitado = false, icone, acessibilidade }) {
  const estilos = {
    primario: { bg: cores.primaria, fg: '#fff', borda: cores.primaria },
    secundario: { bg: '#fff', fg: cores.primaria, borda: cores.primaria },
    perigo: { bg: '#fff', fg: cores.erro, borda: cores.erro },
  }[variante];
  const inativo = desabilitado || carregando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={acessibilidade || titulo}
      accessibilityState={{ disabled: inativo, busy: carregando }}
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        s.botao,
        { backgroundColor: estilos.bg, borderColor: estilos.borda, opacity: inativo ? 0.6 : pressed ? 0.85 : 1 },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={estilos.fg} />
      ) : (
        <View style={s.linha}>
          {icone ? <Ionicons name={icone} size={18} color={estilos.fg} style={{ marginRight: 6 }} /> : null}
          <Text style={[s.botaoTexto, { color: estilos.fg }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Campo({ rotulo, erro, dica, ...props }) {
  return (
    <View style={{ marginBottom: espaco.m }}>
      <Text style={s.rotulo}>{rotulo}</Text>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor="#8A99AD"
        style={[s.input, erro && { borderColor: cores.erro }, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]}
        {...props}
      />
      {erro ? <Text style={s.erroCampo}>{erro}</Text> : dica ? <Text style={s.dica}>{dica}</Text> : null}
    </View>
  );
}

/** Lista de opções em "chips", usada para bairro, gravidade e cenário. */
export function Seletor({ rotulo, opcoes, valor, onChange, erro }) {
  return (
    <View style={{ marginBottom: espaco.m }}>
      {rotulo ? <Text style={s.rotulo}>{rotulo}</Text> : null}
      <View style={s.chips}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              onPress={() => onChange(o.valor)}
              style={[s.chip, ativo && { backgroundColor: o.cor || cores.primaria, borderColor: o.cor || cores.primaria }]}
            >
              <Text style={[s.chipTexto, ativo && { color: '#fff' }]}>{o.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>
      {erro ? <Text style={s.erroCampo}>{erro}</Text> : null}
    </View>
  );
}

export function Cartao({ children, style, onPress, acessibilidade }) {
  if (!onPress) return <View style={[s.cartao, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={acessibilidade}
      onPress={onPress}
      style={({ pressed }) => [s.cartao, style, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

export function NivelBadge({ nivel, grande = false }) {
  const n = niveis[nivel] || niveis.NORMAL;
  return (
    <View style={[s.badge, { backgroundColor: n.fundo, borderColor: n.cor }, grande && s.badgeGrande]} accessibilityLabel={`Nível ${n.rotulo}`}>
      <Ionicons name={n.icone} size={grande ? 20 : 14} color={n.cor} />
      <Text style={[s.badgeTexto, { color: n.cor }, grande && { fontSize: 16 }]}>{n.rotulo}</Text>
    </View>
  );
}

/** Barra horizontal que mostra um valor em relação a um limite (ex.: nível do rio x cota). */
export function Medidor({ valor, maximo, nivel }) {
  const pct = Math.max(0, Math.min(1, maximo ? valor / maximo : 0));
  const n = niveis[nivel] || niveis.NORMAL;
  return (
    <View style={s.medidorFundo} accessibilityLabel={`${Math.round(pct * 100)} por cento do limite`}>
      <View style={[s.medidorBarra, { width: `${pct * 100}%`, backgroundColor: n.cor }]} />
    </View>
  );
}

export function Carregando({ texto = 'Carregando...' }) {
  return (
    <View style={s.centro}>
      <ActivityIndicator size="large" color={cores.primaria} />
      <Text style={[s.dica, { marginTop: espaco.s }]}>{texto}</Text>
    </View>
  );
}

export function ErroTela({ erro, aoTentarDeNovo }) {
  const conexao = erro?.tipo === 'CONEXAO' || erro?.tipo === 'TEMPO';
  return (
    <View style={s.centro}>
      <Ionicons name={conexao ? 'cloud-offline' : 'alert-circle'} size={48} color={cores.erro} />
      <Text style={[s.titulo, { textAlign: 'center', marginTop: espaco.s }]}>
        {conexao ? 'Sem conexão com a API' : 'Algo deu errado'}
      </Text>
      <Text style={[s.dica, { textAlign: 'center', marginBottom: espaco.l }]}>{erro?.message}</Text>
      {aoTentarDeNovo ? <Botao titulo="Tentar de novo" icone="refresh" onPress={aoTentarDeNovo} /> : null}
    </View>
  );
}

export function Vazio({ icone = 'file-tray-outline', titulo, texto }) {
  return (
    <View style={[s.centro, { paddingVertical: espaco.xl * 2 }]}>
      <Ionicons name={icone} size={44} color={cores.textoSuave} />
      <Text style={[s.titulo, { marginTop: espaco.s }]}>{titulo}</Text>
      {texto ? <Text style={[s.dica, { textAlign: 'center' }]}>{texto}</Text> : null}
    </View>
  );
}

export function Aviso({ tipo = 'erro', texto }) {
  if (!texto) return null;
  const cor = tipo === 'erro' ? cores.erro : cores.sucesso;
  return (
    <View style={[s.aviso, { borderColor: cor, backgroundColor: tipo === 'erro' ? '#FFEBEE' : '#E8F5E9' }]} accessibilityLiveRegion="polite">
      <Ionicons name={tipo === 'erro' ? 'alert-circle' : 'checkmark-circle'} size={18} color={cor} />
      <Text style={[s.avisoTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'center' },
  botao: { minHeight: 48, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: espaco.l, marginTop: espaco.s },
  botaoTexto: { fontSize: 16, fontWeight: '700' },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: cores.borda, borderRadius: 10, paddingHorizontal: espaco.m, paddingVertical: 12, fontSize: 16, backgroundColor: '#fff', color: cores.texto },
  erroCampo: { color: cores.erro, fontSize: 13, marginTop: 4 },
  dica: { color: cores.textoSuave, fontSize: 13, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: cores.borda, backgroundColor: '#fff' },
  chipTexto: { fontSize: 14, color: cores.texto, fontWeight: '600' },
  cartao: { backgroundColor: cores.cartao, borderRadius: 14, padding: espaco.l, marginBottom: espaco.m, borderWidth: 1, borderColor: cores.borda },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGrande: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18 },
  badgeTexto: { fontSize: 13, fontWeight: '700' },
  medidorFundo: { height: 10, borderRadius: 5, backgroundColor: '#E6ECF2', overflow: 'hidden', marginTop: espaco.s },
  medidorBarra: { height: 10, borderRadius: 5 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espaco.xl },
  titulo: { fontSize: 18, fontWeight: '700', color: cores.texto },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: espaco.m, marginBottom: espaco.m },
  avisoTexto: { flex: 1, fontSize: 14, fontWeight: '600' },
});
