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

export interface Wash {
  id: string;
  last_wash_date: number;
  comment?: string;
  washes?: any[];
  nextWash?: number;
  supplier?: string;
  numOfWashes?: number;
}

@Injectable({
  providedIn: 'root',
})
export class WashesService {
  private firestore: Firestore = inject(Firestore);

  getWashes(): Observable<Wash[]> {
    const washesCollection = collection(this.firestore, 'washes');
    return collectionData(washesCollection, { idField: 'id' }) as Observable<
      Wash[]
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
}
