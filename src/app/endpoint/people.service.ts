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
  collectionData,
  deleteDoc,
} from '@angular/fire/firestore';
import { forkJoin, from, map, Observable, of, shareReplay } from 'rxjs';
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

  getAllClientsLive(): Observable<Person[]> {
    const q = query(this.collection, where('isClient', '==', true));
    return collectionData(q, { idField: '_id' }).pipe(
      shareReplay({ bufferSize: 1, refCount: true })
    ) as Observable<Person[]>;
  }

  /**
   * Returns only contacts (people who are NOT clients).
   * A contact is a person without isClient: true
   */
  getAllContacts(): Observable<Person[]> {
    return this.getAllPeople().pipe(
      map((people) => {
        console.log('[PeopleService] All people:', people);
        const contacts = people.filter(
          (person: any) => person.isClient !== true
        );
        console.log('[PeopleService] Filtered contacts:', contacts);
        return contacts;
      })
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

  addContact(props: {
    name: string;
    email: string;
    phone: string;
  }): Observable<any> {
    const docRef = doc(this.collection);
    const newContact = {
      name: props.name,
      email: props.email,
      phone: props.phone,
      isActive: true,
      _id: docRef.id,
    };
    return from(setDoc(docRef, newContact)).pipe(map(() => newContact));
  }

  deletePerson(id: string): Observable<void> {
    const ref = doc(this.collection, id);
    return from(deleteDoc(ref));
  }
}
