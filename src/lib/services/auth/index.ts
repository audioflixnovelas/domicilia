import { initializeApp, deleteApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  getAuth,
  signOut as secondarySignOut,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth, firebaseConfig } from '@/lib/firebase/config';
import { FirestoreService, DOC_TYPES, whereEqual } from '@/lib/services/firestore';
import { User, UserRole } from '@/types';

export class AuthService {
  static async login(email: string, password: string): Promise<User> {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Busca pelo campo uid (Firebase Auth UID), nao pelo ID do documento
    const users = await FirestoreService.query<User>(DOC_TYPES.USER, [
      whereEqual('uid', firebaseUser.uid),
    ]);

    if (users.length === 0) {
      throw new Error('Usuario nao encontrado no sistema');
    }

    const user = users[0];

    if (!user.active) {
      throw new Error('Conta desabilitada. Contate o administrador.');
    }

    return user;
  }

  static async loginWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;

    // Busca usuario existente pelo uid ou email
    let users = await FirestoreService.query<User>(DOC_TYPES.USER, [
      whereEqual('uid', firebaseUser.uid),
    ]);

    if (users.length === 0 && firebaseUser.email) {
      users = await FirestoreService.query<User>(DOC_TYPES.USER, [
        whereEqual('email', firebaseUser.email),
      ]);
    }

    if (users.length === 0) {
      // Se for novo login com Google por padrao vincula perfil de professor se nao cadastrado
      const newUserId = firebaseUser.uid;
      await FirestoreService.createAtId<User>(newUserId, DOC_TYPES.USER, {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || 'Professor',
        role: 'professor',
        active: true,
      });

      const newUser = await FirestoreService.getById<User>(newUserId);
      if (!newUser) throw new Error('Erro ao criar usuario com Google');
      return newUser;
    }

    const user = users[0];

    if (!user.active) {
      throw new Error('Conta desabilitada. Contate o administrador.');
    }

    // Se o uid do Firebase Auth nao tava salvo, atualiza
    if (!user.uid || user.uid !== firebaseUser.uid) {
      await FirestoreService.update(user.id, { uid: firebaseUser.uid });
    }

    return user;
  }

  static async register(
    email: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<string> {
    // Cria um app secundario isolado para nao deslogar o usuario atual no app principal
    const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuth_' + Date.now() + Math.random());
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const firebaseUser = userCredential.user;

      // Cria documento com ID = Firebase Auth UID
      await FirestoreService.createAtId<User>(firebaseUser.uid, DOC_TYPES.USER, {
        uid: firebaseUser.uid,
        email,
        name,
        role,
        active: true,
      });

      const uid = firebaseUser.uid;

      // Limpa e deleta o app secundario
      await secondarySignOut(secondaryAuth);
      await deleteApp(secondaryApp);

      return uid;
    } catch (error) {
      await deleteApp(secondaryApp).catch(() => {});
      throw error;
    }
  }

  static async logout(): Promise<void> {
    await signOut(auth);
  }

  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  static onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  static async getUserData(uid: string): Promise<User | null> {
    // Busca pelo campo uid
    const users = await FirestoreService.query<User>(DOC_TYPES.USER, [
      whereEqual('uid', uid),
    ]);
    return users.length > 0 ? users[0] : null;
  }
}
