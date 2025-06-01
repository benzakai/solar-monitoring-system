import { inject, Injectable } from '@angular/core';
import {
  collection,
  Firestore,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from '@angular/fire/firestore';
import { User } from '../domain/user';
import { forkJoin, from, map, Observable, of, shareReplay } from 'rxjs';
import { chunkArray } from './chunk-array.function';
import { getDocs } from 'firebase/firestore';
import {
  Auth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from '@angular/fire/auth';

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
  private auth = inject(Auth);
  private collection = collection(this.firestore, 'users');

  getAllUsers(): Observable<User[]> {
    return new Observable<User[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        this.collection,
        (snapshot) => {
          const users = snapshot.docs.map(
            (doc) => ({ ...doc.data(), uid: doc.id }) as User
          );
          subscriber.next(users);
        },
        (error) => {
          subscriber.error(error);
        }
      );

      // Return cleanup function
      return () => unsubscribe();
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  getCoordinators(): Observable<User[]> {
    const coordinatorQuery = query(
      this.collection,
      where('role', '==', UserRole.COORDINATOR)
    );

    return new Observable<User[]>((subscriber) => {
      const unsubscribe = onSnapshot(
        coordinatorQuery,
        (snapshot) => {
          const users = snapshot.docs.map(
            (doc) => ({ ...doc.data(), uid: doc.id }) as User
          );
          subscriber.next(users);
        },
        (error) => {
          subscriber.error(error);
        }
      );

      // Return cleanup function
      return () => unsubscribe();
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
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
          snapshot.docs.map((doc) => ({ ...doc.data(), uid: doc.id }) as User)
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

  createUser(user: Omit<User, 'uid'>): Observable<void> {
    const userRef = doc(this.collection);
    return from(setDoc(userRef, { ...user, isActive: true }));
  }

  updateUser(uid: string, user: Partial<User>): Observable<void> {
    const userRef = doc(this.collection, uid);
    return from(setDoc(userRef, user, { merge: true }));
  }

  deleteUser(uid: string): Observable<void> {
    const userRef = doc(this.collection, uid);
    return from(deleteDoc(userRef));
  }

  changePassword(user: User, newPassword: string): Observable<any> {
    if (!user) {
      return of(undefined);
    }
    return from(of('--here--'));
  }
}
