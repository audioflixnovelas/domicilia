import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function GET() {
  try {
    const configQuery = query(collection(db, 'domicilia'), where('type', '==', 'configuracao'));
    const configSnap = await getDocs(configQuery);

    if (configSnap.empty) {
      return NextResponse.json({ error: 'Configuracao nao encontrada' }, { status: 404 });
    }

    const config = { id: configSnap.docs[0].id, ...configSnap.docs[0].data() };
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Erro ao buscar configuracao:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
