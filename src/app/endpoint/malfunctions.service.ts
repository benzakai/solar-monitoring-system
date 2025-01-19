import { inject, Injectable } from '@angular/core';
import { collection, doc, Firestore, setDoc } from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MalfunctionsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'malfunctions');

  saveMalfunction(malfunction: any): Observable<any> {
    const docRef = doc(this.collection);
    return from(setDoc(docRef, {
      ...malfunction,
      id: docRef.id,
    }));
  }
}
