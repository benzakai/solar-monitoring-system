import { inject, Injectable } from '@angular/core';
import { collection, Firestore, query, where } from '@angular/fire/firestore';
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

  getPeopleByIds(ids: string[]): Observable<Person[]> {
    if (ids.length === 0) {
      return of([]);
    }
    const chunks = chunkArray(ids);
    const queries = chunks.map((chunk) => {
      const q = query(this.collection, where('__name__', 'in', chunk));
      const p = from(getDocs(q)).pipe(
        map((snapshot) =>
          snapshot.docs.map((doc) => ({ ...doc.data() }) as Person)
        )
      );
      return p;
    });
    return forkJoin(queries).pipe(map((results) => results.flat()));
  }
}
