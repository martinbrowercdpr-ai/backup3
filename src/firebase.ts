import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Inicializa o app Firebase com as credenciais do projeto provisionado
const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
  },
  firebaseConfig.firestoreDatabaseId
);

// Testa conexão inicial com o Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline ou em espera de rede:', error.message);
      return false;
    }
    // Pode falhar com not-found o que ainda significa que a conexão está ativa
    return true;
  }
}
