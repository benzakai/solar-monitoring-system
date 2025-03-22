import { inject, Injectable, isDevMode } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  query,
  setDoc,
  where,
  getDocs,
  deleteDoc,
  limit,
  onSnapshot,
} from '@angular/fire/firestore';
import { filter, from, map, Observable, switchMap } from 'rxjs';
import { Malfunction, MalfunctionActionType } from '../domain/malfunction';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { DateUtil } from '../core/date/DateUtil';

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

  getAllSnapshot(statuses: string[] = ['open']): Observable<Malfunction[]> {
    const limitedQuery = query(
      this.collection,
      where('status', 'in', statuses),
      where('#modified', '>=', DateUtil.DaysBack(90))
    );

    return new Observable<Malfunction[]>((observer) => {
      (async () => {
        try {
          const snapshot = await getDocs(limitedQuery);
          const items = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
            } as Malfunction;
          });

          observer.next(items);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }

  getAllChanged(statuses: string[] = ['open']): Observable<Malfunction[]> {
    const limitedQuery = query(
      this.collection,
      where('status', 'in', statuses),
      where('#modified', '>=', DateUtil.DaysBack(90))
    );

    return new Observable<Malfunction[]>((observer) => {
      return onSnapshot(
        limitedQuery,
        (snapshot) => {
          const items = snapshot
            .docChanges()
            .filter((d) => d.type === 'modified')
            .map((doc) => {
              const data = doc.doc.data();

              return {
                id: doc.doc.id,
                ...data,
              } as Malfunction;
            });
          observer.next(items);
        },
        (error) => observer.error(error)
      );
    });
  }
}
