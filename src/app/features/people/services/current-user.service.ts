import { inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  distinctUntilChanged,
  filter,
  map,
  of,
  shareReplay,
  startWith,
  switchMap,
} from 'rxjs';
import { UsersService } from '../../../endpoint/users.service';

@Injectable({
  providedIn: 'root',
})
export class CurrentUserService {
  private auth = inject(AngularFireAuth);
  private authState = this.auth.authState.pipe(startWith(undefined));

  private usersService = inject(UsersService);

  user = this.authState.pipe(
    filter(Boolean),
    switchMap((auth) =>
      this.usersService.getUserByUid(auth.uid).pipe(filter(Boolean))
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  role = this.authState.pipe(
    switchMap((auth) =>
      auth
        ? this.usersService
            .getUserByUid(auth.uid)
            .pipe(map((user) => user?.role))
        : of(undefined)
    ),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {}
}
