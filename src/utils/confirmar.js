import { Alert, Platform } from 'react-native';

/** Pede confirmação antes de uma ação destrutiva (funciona no celular e no navegador). */
export function confirmar(titulo, mensagem, textoConfirmar = 'Confirmar') {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensagem}`));
  return new Promise((resolve) =>
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: textoConfirmar, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
