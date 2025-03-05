import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  query,
  where,
} from '@angular/fire/firestore';
import { forkJoin, from, map, Observable } from 'rxjs';
import { System } from '../domain/system';
import { Energy } from '../domain/energy';
import { getDocs } from 'firebase/firestore';

@Injectable({
  providedIn: 'root',
})
export class SystemsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'systems');

  public getById(id: string): Observable<System | null> {
    const docRef = doc(this.collection, id);
    return from(getDoc(docRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as System;
        } else {
          return null;
        }
      })
    );
  }

  private chunkArray<T>(array: T[]): T[][] {
    return array.reduce((resultArray: T[][], item, index) => {
      const chunkIndex = Math.floor(index / 10);
      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = [];
      }
      resultArray[chunkIndex].push(item);
      return resultArray;
    }, []);
  }

  getSystemsByIds(systemIds: string[]): Observable<System[]> {
    if (systemIds.length === 0) {
      return from([[]]);
    }

    const chunks = this.chunkArray(systemIds);
    const queries = chunks.map((chunk) => {
      const q = query(this.collection, where('__name__', 'in', chunk));
      const p = from(getDocs(q)).pipe(
        map((snapshot) =>
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as System)
        )
      );
      return p;
    });

    return forkJoin(queries).pipe(map((results) => results.flat()));
  }
}
