import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BannerAlerta } from '../components/BannerAlerta';
import { Carregando } from '../components/ui';
import { AlertaProvider } from '../context/AlertaContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { cores } from '../theme';

function Navegacao() {
  const { carregando, usuario } = useAuth();
  if (carregando) return <Carregando texto="Abrindo AlertaBairro..." />;
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: cores.primaria },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Protected guard={!usuario}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="cadastro" options={{ title: 'Criar conta' }} />
        </Stack.Protected>
        <Stack.Protected guard={!!usuario}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="bairro/[id]" options={{ title: 'Situação do bairro' }} />
          <Stack.Screen name="reporte/form" options={{ title: 'Reportar rua alagada' }} />
        </Stack.Protected>
        <Stack.Screen name="conexao" options={{ title: 'Conexão com a API' }} />
      </Stack>
      {usuario ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, elevation: 10 }}>
          <BannerAlerta />
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AlertaProvider>
          <Navegacao />
        </AlertaProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
