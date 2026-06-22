import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  query,
  updateDoc,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, forkJoin, from, map, Observable, of, switchMap } from 'rxjs';
import { System } from '../domain/system';
import { getDocs } from 'firebase/firestore';
import { chunkArray } from './chunk-array.function';

@Injectable({
  providedIn: 'root',
})
export class SystemsService {
  private firestore = inject(Firestore);
  private collection = collection(this.firestore, 'systems');
  private http = inject(HttpClient);

  private normalizeApiIdValue(value: unknown): string | number | null {
    if (typeof value === 'string') {
      return value.trim();
    }
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    return null;
  }

  private normalizeApiId(
    apiId: Array<string | number | null | undefined>
  ): Array<string | number | null> {
    return apiId.map((value) => this.normalizeApiIdValue(value));
  }

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

  getSystems(): Observable<System[]> {
    const q = query(this.collection);
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as System)
      )
    );
  }

  getSystemsByClientId(clientId: string): Observable<System[]> {
    const q = query(this.collection, where('client.id', '==', clientId));
    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as System)
      )
    );
  }

  getSystemsByIds(systemIds: string[]): Observable<System[]> {
    if (systemIds.length === 0) {
      return from([[]]);
    }

    const chunks = chunkArray(systemIds);
    const queries = chunks.map((chunk) => {
      const q = query(this.collection, where('__name__', 'in', chunk));
      const p = from(getDocs(q)).pipe(
        map((snapshot) =>
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as System)
        )
      );
      return p;
    });

    return forkJoin(queries).pipe(map((results) => results.flat()));
  }

  updateComment(id: string, value: string | null) {
    const docRef = doc(this.collection, id);
    return from(updateDoc(docRef, { comments: value }));
  }

  updateSystem(id: string, data: Partial<System>): Observable<void> {
    const docRef = doc(this.collection, id);
    return from(updateDoc(docRef, data));
  }

  createSystem(systemData: Omit<System, 'id'>): Observable<string> {
    const docRef = doc(this.collection);
    const systemWithId = { ...systemData, id: docRef.id };
    return from(setDoc(docRef, systemWithId)).pipe(
      map(() => docRef.id)
    );
  }

  /**
   * Check if a system with the same type and apiId exists (excluding current system id).
   * Returns the existing system id if found, otherwise undefined.
   */
  checkExistApi(type: string, apiId: Array<string | number | null>, currentSystemId?: string): Observable<string | undefined> {
    const normalizedApiId = this.normalizeApiId(apiId);
    const q = query(this.collection, where('type', '==', type as any), where('apiId', '==', normalizedApiId as any));
    return from(getDocs(q)).pipe(
      map((snapshot) => {
        const ids = snapshot.docs
          .filter((doc) => doc.id !== currentSystemId)
          .map((doc) => doc.id);
        return ids.length > 0 ? ids[0] : undefined;
      })
    );
  }

  /**
   * Update system's type/apiId and trigger server-side import via updateNow endpoint.
   * Returns true on success, false on failure (and reverts type/apiId on failure).
   */
  updateApiId(type: string, apiId: Array<string | number | null>, systemId: string): Observable<boolean> {
    const docRef = doc(this.collection, systemId);
    const normalizedApiId = this.normalizeApiId(apiId);
    if (!type || !systemId) {
      return of(false);
    }
    const url = `https://golan-api.onrender.com/api/updateNow/${type}/${systemId}`;
    return from(updateDoc(docRef, { type: type as any, apiId: normalizedApiId as any })).pipe(
      switchMap(() => this.http.get<any>(url)),
      map(() => true),
      catchError((e: unknown) => {
        return from(updateDoc(docRef, { type: '' as any, apiId: [] as any })).pipe(
          map(() => false),
          catchError(() => of(false))
        );
      })
    );
  }
}