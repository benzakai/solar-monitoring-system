import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  query,
  setDoc,
  where,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { forkJoin, from, map, Observable, of } from 'rxjs';
import { chunkArray } from './chunk-array.function';
import { getDocs } from 'firebase/firestore';
import { Person } from '../domain/person';

@Injectable({
  providedIn: 'root',
})
export class PeopleService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'people');

  getById(id: string): Observable<Person | null> {
    const ref = doc(this.collection, id);
    return from(getDoc(ref)).pipe(
      map((snapshot) => {
        if (!snapshot.exists()) return null;
        const data = snapshot.data() as any;
        // ensure both id and _id are available for consumers
        return {
          _id: snapshot.id,
          id: snapshot.id,
          ...data,
        } as unknown as Person;
      })
    );
  }

  updatePerson(
    id: string,
    data: Partial<Person> & Record<string, any>
  ): Observable<void> {
    const ref = doc(this.collection, id);
    return from(updateDoc(ref, data));
  }

  getPeopleByIds(ids: string[]): Observable<Person[]> {
    if (ids.length === 0) {
      return of([]);
    }
    const chunks = chunkArray(ids);
    const queries = chunks.map((chunk) => {
      const q = query(this.collection, where('__name__', 'in', chunk));
      const p = from(getDocs(q)).pipe(
        map((snapshot) =>
          snapshot.docs.map((doc) => ({ ...doc.data(), _id: doc.id }) as Person)
        )
      );
      return p;
    });
    return forkJoin(queries).pipe(map((results) => results.flat()));
  }

  getAllPeople(): Observable<Person[]> {
    const q = query(this.collection);
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ ...doc.data(), _id: doc.id }) as Person)
      )
    );
  }

  getAllClients(): Observable<Person[]> {
    const q = query(this.collection, where('isClient', '==', true));
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ ...doc.data(), _id: doc.id }) as Person)
      )
    );
  }

  addClient(props: {
    clientName: string;
    email: string;
    phone: string;
  }): Observable<any> {
    const docRef = doc(this.collection);
    const newClient = {
      name: props.clientName,
      clientName: props.clientName,
      email: props.email,
      phone: props.phone,
      isClient: true,
      isActive: true,
      clientType: 'private',
      _id: docRef.id,
    };
    return from(setDoc(docRef, newClient)).pipe(map(() => newClient));
  }
}
