import { inject, Injectable } from '@angular/core';
import { collection, doc, Firestore, getDoc } from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';
import { System } from '../domain/system';

@Injectable({
  providedIn: 'root',
})
export class SystemsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'systems');

  public getById(id: string): Observable<System | null> {
    const docRef = doc(this.collection, id);
    return from(getDoc(docRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as System;
        } else {
          return null;
        }
      })
    );
  }
}
