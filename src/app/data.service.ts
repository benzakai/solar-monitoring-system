import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { collection, collectionData, Firestore } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  constructor(private firestore: Firestore) {}

  getData(): Observable<any[]> {
    const dataCollection = collection(this.firestore, 'systems');
    return collectionData(dataCollection, { idField: 'id' });
  }
}
