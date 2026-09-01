import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getTimestamp } from '@/lib/utils';

// Unica colecao: domicilia
// Cada documento tem um campo 'type' que identifica o tipo
const COLLECTION = 'domicilia';

// Tipos de documentos
export const DOC_TYPES = {
  USER: 'user',
  TURMA: 'turma',
  ALUNO: 'aluno',
  ATIVIDADE: 'atividade',
  ENVIO: 'envio',
  HISTORICO: 'historico',
  LEMBRETE: 'lembrete',
  CONFIGURACAO: 'configuracao',
  CONTEUDO_IA: 'conteudo_ia',
  AUDIT_LOG: 'auditLog',
  CRON_LOG: 'cron_log',
} as const;

export type DocType = typeof DOC_TYPES[keyof typeof DOC_TYPES];

export { COLLECTION };

export class FirestoreService {
  static async create<T extends DocumentData>(
    type: DocType,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'type'>
  ): Promise<string> {
    const timestamp = getTimestamp();
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      type,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    return docRef.id;
  }

  static async createAtId<T extends DocumentData>(
    id: string,
    type: DocType,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'type'>
  ): Promise<void> {
    const timestamp = getTimestamp();
    const docRef = doc(db, COLLECTION, id);
    await setDoc(docRef, {
      ...data,
      type,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  static async getById<T>(id: string): Promise<T | null> {
    const docRef = doc(db, COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  }

  static async getAllByType<T>(type: DocType): Promise<T[]> {
    const q = query(collection(db, COLLECTION), where('type', '==', type));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  static async query<T>(
    type: DocType,
    constraints: QueryConstraint[] = []
  ): Promise<T[]> {
    const q = query(
      collection(db, COLLECTION),
      where('type', '==', type),
      ...constraints
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as T[];
  }

  static async update<T extends DocumentData>(
    id: string,
    data: Partial<T>
  ): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: getTimestamp(),
    });
  }

  static async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  }

  static async batchUpdate(
    updates: { id: string; data: DocumentData }[]
  ): Promise<void> {
    const batch = writeBatch(db);
    updates.forEach(({ id, data }) => {
      const docRef = doc(db, COLLECTION, id);
      batch.update(docRef, { ...data, updatedAt: getTimestamp() });
    });
    await batch.commit();
  }

  static subscribe<T>(
    type: DocType,
    callback: (data: T[]) => void,
    constraints: QueryConstraint[] = []
  ): () => void {
    const q = query(
      collection(db, COLLECTION),
      where('type', '==', type),
      ...constraints
    );

    return onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as T[];
      callback(data);
    });
  }
}

export function whereEqual(field: string, value: unknown) {
  return where(field, '==', value);
}

export function orderByField(field: string, direction: 'asc' | 'desc' = 'asc') {
  return orderBy(field, direction);
}
