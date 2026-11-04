import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { cores } from '../../theme';

export default function LayoutAbas() {
  const { ehAdmin } = useAuth();
  const icone = (nome) => ({ color, size }) => <Ionicons name={nome} color={color} size={size} />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: cores.primaria,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
        tabBarStyle: Platform.OS === 'web' ? { height: 68, paddingTop: 6, paddingBottom: 10 } : undefined,
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Alertas', headerTitle: 'AlertaBairro', tabBarIcon: icone('notifications') }} />
      <Tabs.Screen name="reportes" options={{ title: 'Reportes', tabBarIcon: icone('water') }} />
      {/* Painel de sensores: só aparece para o perfil ADMIN (Defesa Civil) */}
      <Tabs.Screen name="sensores" options={{ title: 'Sensores IoT', tabBarIcon: icone('hardware-chip'), href: ehAdmin ? undefined : null }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icone('person-circle') }} />
    </Tabs>
  );
}
