import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  query,
  setDoc,
  where,
  getDocs,
  deleteDoc,
} from '@angular/fire/firestore';
import { filter, from, map, Observable, switchMap } from 'rxjs';
import {
  Malfunction,
  MalfunctionAction,
  MalfunctionActionType,
} from '../domain/malfunction';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Injectable({
  providedIn: 'root',
})
export class MalfunctionsService {
  private firestore = inject(Firestore);
  private auth = inject(AngularFireAuth);

  private collection = collection(this.firestore, 'malfunctions');

  createMalfunction(
    malfunction: Omit<Malfunction, 'id' | 'log' | '#modified'>
  ): Observable<void> {
    return this.generateLogEntry(malfunction).pipe(
      switchMap((logEntry) => {
        const docRef = doc(this.collection);
        return from(
          setDoc(docRef, {
            id: docRef.id,
            ...malfunction,
            ...logEntry,
          })
        );
      })
    );
  }

  getForSystem(
    systemId: string,
    status?: 'open' | 'closed'
  ): Observable<Malfunction[]> {
    const q = status
      ? query(
          this.collection,
          where('systemId', '==', systemId),
          where('status', '==', status)
        )
      : query(this.collection, where('systemId', '==', systemId));
    return from(getDocs(q)).pipe(
      map((querySnapshot) => {
        return querySnapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id }) as Malfunction
        );
      })
    );
  }

  public generateLogEntry(
    malfunction: Partial<Malfunction>,
    action?: MalfunctionActionType
  ): Observable<Pick<Malfunction, '#modified' | 'log'>> {
    const now = new Date();
    return from(this.auth.currentUser).pipe(
      filter((user) => !!user),
      map((user) => ({
        log: [
          {
            action: action || MalfunctionActionType.OPEN,
            by: user?.uid,
            text: '',
            time: now.getTime(),
          },
          ...(malfunction?.log || []),
        ],
        '#modified': now.getTime(),
      }))
    );
  }

  deleteMalfunction(id: string): Observable<void> {
    const docRef = doc(this.collection, id);
    return from(deleteDoc(docRef));
  }
}
