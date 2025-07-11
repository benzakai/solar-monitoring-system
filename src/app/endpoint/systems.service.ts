import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  query,
  updateDoc,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { forkJoin, from, map, Observable } from 'rxjs';
import { System } from '../domain/system';
import { getDocs } from 'firebase/firestore';
import { chunkArray } from './chunk-array.function';

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

  getSystemsByIds(systemIds: string[]): Observable<System[]> {
    if (systemIds.length === 0) {
      return from([[]]);
    }

    const chunks = chunkArray(systemIds);
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

  updateComment(id: string, value: string | null) {
    const docRef = doc(this.collection, id);
    return from(updateDoc(docRef, { comments: value }));
  }

  updateSystem(id: string, data: Partial<System>): Observable<void> {
    const docRef = doc(this.collection, id);
    return from(updateDoc(docRef, data));
  }

  createSystem(systemData: Omit<System, 'id'>): Observable<string> {
    const docRef = doc(this.collection);
    const systemWithId = { ...systemData, id: docRef.id };
    return from(setDoc(docRef, systemWithId)).pipe(
      map(() => docRef.id)
    );
  }
}