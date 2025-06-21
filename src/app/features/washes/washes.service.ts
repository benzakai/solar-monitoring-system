import { inject, Injectable } from '@angular/core';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface Wash {
  id: string;
  last_wash_date: number;
  comment?: string;
  washes?: any[];
  nextWash?: number;
  supplier?: string;
  numOfWashes?: number;
}

@Injectable({
  providedIn: 'root',
})
export class WashesService {
  private firestore: Firestore = inject(Firestore);

  getWashes(): Observable<Wash[]> {
    const washesCollection = collection(this.firestore, 'washes');
    return collectionData(washesCollection, { idField: 'id' }) as Observable<
      Wash[]
    >;
  }
} 