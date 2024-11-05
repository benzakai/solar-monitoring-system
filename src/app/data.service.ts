import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {addDoc, collection, collectionData, Firestore} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  constructor(private firestore: Firestore) {}

  getData(): Observable<any[]> {
    const dataCollection = collection(this.firestore, 'systems');
    return collectionData(dataCollection, { idField: 'id' });
  }

  // add() {
  //   const data = {
  //     clearedAlerts: Math.ceil(Math.random() * 10),
  //     communication: false,
  //     kWp: Math.ceil(Math.random() * 1000),
  //     lastMonth: Math.ceil(Math.random() * 10),
  //     monthly: Math.ceil(Math.random() * 10),
  //     notes: Math.ceil(Math.random() * 10) > 5,
  //     openAlerts: Math.ceil(Math.random() * 10),
  //     portal: `Protal ${Math.ceil(Math.random() * 100)}`,
  //     startOfMonth:  Math.ceil(Math.random() * 10),
  //     startOfYear: Math.ceil(Math.random() * 10),
  //     systemName:  `System ${Math.ceil(Math.random() * 100)}`,
  //     tested: Math.ceil(Math.random() * 10) > 5,
  //     threeDays: Math.ceil(Math.random() * 10),
  //     today: Math.ceil(Math.random() * 10),
  //     weekly: Math.ceil(Math.random() * 10),
  //     yesterday: Math.ceil(Math.random() * 10)
  //   };
  //
  //   addDoc(collection(this.firestore, "systems"), data);
  // }
}
