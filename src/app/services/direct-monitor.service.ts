import { inject, Injectable, isDevMode } from '@angular/core';
import {
  collection,
  collectionData,
  Firestore,
  limit,
  onSnapshot,
  query,
} from '@angular/fire/firestore';
import { map, Observable, startWith } from 'rxjs';
import { MonitorItem } from '../domain/monitor-item';

@Injectable({
  providedIn: 'root',
})
export class DirectMonitorService {
  private firestore = inject(Firestore);

  private collection = collection(this.firestore, 'directMoniterLife');

  getAllSnapshot(): Observable<MonitorItem[]> {
    const limitedQuery = isDevMode()
      ? query(this.collection, limit(200))
      : query(this.collection);

    return new Observable<MonitorItem[]>((observer) => {
      return onSnapshot(
        limitedQuery,
        (snapshot) => {
          const monitorItems = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
            } as MonitorItem;
          });
          observer.next(monitorItems);
        },
        (error) => observer.error(error)
      );
    });
  }

  getAll(): Observable<MonitorItem[]> {
    const limitedQuery = isDevMode()
      ? query(this.collection, limit(200))
      : query(this.collection);
    return collectionData(limitedQuery, { idField: 'id' }).pipe(
      map((data) => data || []),
      startWith([])
    );
  }
}
