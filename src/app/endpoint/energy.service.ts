import { inject, Injectable, isDevMode } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { forkJoin, from, map, Observable } from 'rxjs';
import { getDocs } from 'firebase/firestore';
import { Energy, EnergySample } from '../domain/energy';
import { System } from '../domain/system';

@Injectable({
  providedIn: 'root',
})
export class EnergyService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'energy');

  getOldEnergyRecords(): Observable<any[]> {
    const currentTime = new Date().getTime();
    const oneHourAgo = currentTime - 2 * 60 * 60 * 1000;

    const q = query(this.collection, where('#modified', '<', oneHourAgo));

    return new Observable((observer) => {
      getDocs(q)
        .then((querySnapshot) => {
          const records = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          observer.next(records);
          observer.complete();
        })
        .catch((error) => {
          observer.error(error);
        });
    });
  }

  getAllSnapshot(): Observable<Energy[]> {
    const limitedQuery = isDevMode()
      ? query(this.collection, limit(200))
      : query(this.collection);

    return new Observable<Energy[]>((observer) => {
      (async () => {
        try {
          const snapshot = await getDocs(limitedQuery);
          const energyItems = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              ...data,
              multiAnnual: [] as EnergySample[],
              annual: [] as EnergySample[],
            } as Energy;
          });

          observer.next(energyItems);
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }

  getAllChanged(): Observable<Energy[]> {
    const limitedQuery = isDevMode()
      ? query(this.collection, limit(200))
      : query(this.collection);

    return new Observable<Energy[]>((observer) => {
      return onSnapshot(
        limitedQuery,
        (snapshot) => {
          const energyItems = snapshot
            .docChanges()
            .filter((d) => d.type === 'modified')
            .map((doc) => {
              const data = doc.doc.data();

              return {
                ...data,
                multiAnnual: [] as EnergySample[],
                annual: [] as EnergySample[],
              } as Energy;
            });
          observer.next(energyItems);
        },
        (error) => observer.error(error)
      );
    });
  }

  getEnergy(systemId: string): Observable<Energy | null> {
    const docRef = doc(this.collection, systemId);
    return from(getDoc(docRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as Energy;
        } else {
          return null;
        }
      })
    );
  }

  private readonly MAX_QUERY_SIZE = 10;

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    return array.reduce((resultArray: T[][], item, index) => {
      const chunkIndex = Math.floor(index / chunkSize);
      if (!resultArray[chunkIndex]) {
        resultArray[chunkIndex] = [];
      }
      resultArray[chunkIndex].push(item);
      return resultArray;
    }, []);
  }

  getEnergyByIds(systemIds: string[]): Observable<Energy[]> {
    if (systemIds.length === 0) {
      return from([[]]);
    }

    const chunks = this.chunkArray(systemIds, this.MAX_QUERY_SIZE);
    const queries = chunks.map((chunk) => {
      const q = query(this.collection, where('__name__', 'in', chunk));
      const p = from(getDocs(q)).pipe(
        map((snapshot) =>
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Energy)
        )
      );
      return p;
    });

    return forkJoin(queries).pipe(map((results) => results.flat()));
  }

  updateAnnualEnergy(systemId: string, annual: EnergySample[]) {
    const docRef = doc(this.collection, systemId);
    return from(setDoc(docRef, { annual }, { merge: true }));
  }
}
