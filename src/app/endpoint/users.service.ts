import { inject, Injectable } from '@angular/core';
import { collection, Firestore, query, where } from '@angular/fire/firestore';
import { User } from '../domain/user';
import { forkJoin, from, map, Observable, of, shareReplay } from 'rxjs';
import { chunkArray } from './chunk-array.function';
import { getDocs } from 'firebase/firestore';

export enum UserRole {
  ADMIN = '1admin',
  COORDINATOR = '3coordinator',
  SIMPLE = '5simple',
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'users');

  getCoordinators() {
    return from(
      getDocs(query(this.collection, where('role', '==', UserRole.COORDINATOR)))
    ).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ ...doc.data() }) as User)
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  getUsersByUids(userUids: string[]): Observable<User[]> {
    if (userUids.length === 0) {
      return of([]);
    }
    const chunks = chunkArray(userUids);
    const queries = chunks.map((chunk) => {
      const q = query(this.collection, where('__name__', 'in', chunk));
      const p = from(getDocs(q)).pipe(
        map((snapshot) =>
          snapshot.docs.map((doc) => ({ ...doc.data() }) as User)
        )
      );
      return p;
    });
    return forkJoin(queries).pipe(map((results) => results.flat()));
  }

  getUserByUid(uid: string): Observable<User | null> {
    return this.getUsersByUids([uid]).pipe(
      map((users) => (users?.length ? users[0] : null))
    );
  }
}
