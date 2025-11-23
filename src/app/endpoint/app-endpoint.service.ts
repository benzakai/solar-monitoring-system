import { inject, Injectable } from '@angular/core';
import { collection, doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';
import { App } from '../domain/app';
import { MalfunctionTypesTree } from '../domain/malfunction-type-tree';

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

  public set<T extends keyof App>(id: T, data: App[T]): Observable<void> {
    const docRef = doc(this.collection, id);
    return from(setDoc(docRef, data as any, { merge: true })).pipe(
      map(() => void 0)
    );
  }

  public getMalfunctionsTypes(): Observable<MalfunctionTypesTree | null> {
    return this.get('malfunctionTypes');
  }

  public setMalfunctionTypes(tree: MalfunctionTypesTree): Observable<void> {
    return this.set('malfunctionTypes', tree);
  }
}
