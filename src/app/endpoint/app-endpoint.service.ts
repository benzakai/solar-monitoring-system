import { inject, Injectable } from '@angular/core';
import { collection, doc, Firestore, getDoc } from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';
import { System } from '../domain/system';
import { App } from '../domain/app';

@Injectable({
  providedIn: 'root',
})
export class AppEndpointService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'app');

  public get<T extends keyof App>(id: T): Observable<App[T] | null> {
    const docRef = doc(this.collection, id);
    return from(getDoc(docRef)).pipe(
      map((snapshot) => {
        if (snapshot.exists()) {
          return { ...snapshot.data() } as App[T];
        } else {
          return null;
        }
      })
    );
  }
}
