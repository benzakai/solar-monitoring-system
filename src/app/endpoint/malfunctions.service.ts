import { inject, Injectable } from '@angular/core';
import { addDoc, collection, Firestore } from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MalfunctionsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'malfunctions');

  saveMalfunction(malfunction: any): Observable<any> {
    return from(addDoc(this.collection, malfunction));
  }
}
