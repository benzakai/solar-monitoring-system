import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  runTransaction,
  Timestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { SystemWash } from '../../domain/system-wash';

export interface Wash {
  id: string;
  last_wash_date: number;
  comment?: string;
  washes?: WashData[];
  nextWash?: number;
  supplier?: string;
  numOfWashes?: number;
}

export interface WashData {
  date: any;
  supplier: string;
  price: number;
  comment?: string;
  nextWash?: any;
}

@Injectable({
  providedIn: 'root',
})
export class WashesService {
  private firestore: Firestore = inject(Firestore);

  getWashes(): Observable<SystemWash[]> {
    const washesCollection = collection(this.firestore, 'washes');
    return collectionData(washesCollection, { idField: 'id' }) as Observable<
      SystemWash[]
    >;
  }

  addWash(systemId: string, wash: { date: any; supplier: any; price: any }) {
    const washRef = doc(this.firestore, 'washes', systemId);

    return from(
      runTransaction(this.firestore, async (transaction) => {
        const washDoc = await transaction.get(washRef);
        if (!washDoc.exists()) {
          return;
        }

        const washes = (washDoc.data() as any).washes || [];
        const newWash = {
          ...wash,
          date: Timestamp.fromDate(new Date(wash.date)),
        };

        transaction.update(washRef, {
          washes: [...washes, newWash],
        });
      })
    );
  }

  updateWash(systemId: string, wash: WashData) {
    const washRef = doc(this.firestore, 'washes', systemId);
    return from(
      runTransaction(this.firestore, async (transaction) => {
        const washDoc = await transaction.get(washRef);
        if (!washDoc.exists()) {
          return;
        }

        const washes: WashData[] = (washDoc.data() as any).washes || [];
        if (washes.length === 0) {
          return;
        }

        const newWash = {
          ...wash,
        };

        const newWashes = washes.slice(0, washes.length - 1);

        transaction.update(washRef, {
          washes: [...newWashes, newWash],
        });
      })
    );
  }

  updateWashComment(systemId: string, comment: string) {
    const washRef = doc(this.firestore, 'washes', systemId);
    return from(
      runTransaction(this.firestore, async (transaction) => {
        const washDoc = await transaction.get(washRef);
        if (!washDoc.exists()) {
          return;
        }

        const washes: WashData[] = (washDoc.data() as any).washes || [];
        if (washes.length === 0) {
          return;
        }

        const lastWash = washes[washes.length - 1];
        const updatedWash = { ...lastWash, comment };

        const newWashes = washes.slice(0, washes.length - 1);

        transaction.update(washRef, {
          washes: [...newWashes, updatedWash],
        });
      })
    );
  }

  updateWashDone(systemId: string, washDone: boolean) {
    const washRef = doc(this.firestore, 'washes', systemId);
    return from(
      runTransaction(this.firestore, async (transaction) => {
        const washDoc = await transaction.get(washRef);
        if (!washDoc.exists()) {
          return;
        }

        const washes: WashData[] = (washDoc.data() as any).washes || [];
        if (washes.length === 0) {
          return;
        }

        const lastWash = washes[washes.length - 1];
        const updatedWash = { ...lastWash, washDone };

        const newWashes = washes.slice(0, washes.length - 1);

        transaction.update(washRef, {
          washes: [...newWashes, updatedWash],
        });
      })
    );
  }
}
