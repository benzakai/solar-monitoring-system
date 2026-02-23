import { Injectable } from '@angular/core';
import {
  collection,
  Firestore,
  getDocs,
  limit,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { BehaviorSubject, from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FiltersService {
  private readonly clientsFilterIdsSubject = new BehaviorSubject<string[]>([]);
  readonly clientsFilterIds$ = this.clientsFilterIdsSubject.asObservable();

  private readonly clientsSelectionSubject = new BehaviorSubject<any[]>([]);
  readonly clientsSelection$ = this.clientsSelectionSubject.asObservable();

  private readonly systemsSelectionSubject = new BehaviorSubject<any[]>([]);
  readonly systemsSelection$ = this.systemsSelectionSubject.asObservable();

  get clientsSelectionSnapshot(): any[] {
    return this.clientsSelectionSubject.getValue();
  }

  setClientsSelection(value: any[]): void {
    this.clientsSelectionSubject.next(value || []);
  }

  get systemsSelectionSnapshot(): any[] {
    return this.systemsSelectionSubject.getValue();
  }

  setSystemsSelection(value: any[]): void {
    this.systemsSelectionSubject.next(value || []);
  }

  constructor(private firestore: Firestore) {}

  setClientsFilterIds(ids: string[] | null | undefined): void {
    this.clientsFilterIdsSubject.next((ids || []).filter(Boolean));
  }

  getMinMaxKwp(): Observable<{ min: number; max: number }> {
    const dataCollection = collection(this.firestore, 'systems');
    const minQuery = query(dataCollection, orderBy('KWP', 'asc'), limit(1));
    const maxQuery = query(dataCollection, orderBy('KWP', 'desc'), limit(1));

    const minPromise = getDocs(minQuery).then(
      (minSnapshot) => minSnapshot.docs[0]?.data()['KWP']
    );
    const maxPromise = getDocs(maxQuery).then(
      (maxSnapshot) => maxSnapshot.docs[0]?.data()['KWP']
    );

    return from(
      Promise.all([minPromise, maxPromise]).then(([minValue, maxValue]) => ({
        min: minValue,
        max: maxValue,
      }))
    );
  }
}
