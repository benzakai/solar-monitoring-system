import { inject, Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import { UserRole, UsersService } from '../../../endpoint/users.service';
import {
  Observable,
  of,
  shareReplay,
  switchMap,
  combineLatest,
  startWith,
  map,
  share,
  tap,
  BehaviorSubject,
  distinctUntilChanged,
} from 'rxjs';
import { CurrentUserService } from './current-user.service';
import { User } from '../../../domain/user';
import { PeopleService } from '../../../endpoint/people.service';

@Injectable({
  providedIn: 'root',
})
export class CoordinatorsService {
  private currentUser = inject(CurrentUserService);
  private usersService = inject(UsersService);
  private peopleService = inject(PeopleService);

  coordinators: Observable<User[]> = this.currentUser.user.pipe(
    switchMap((user) =>
      user.role === UserRole.ADMIN
        ? this.usersService.getCoordinators()
        : of(user.role === UserRole.COORDINATOR ? [user] : [])
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  coordinatorsSelectedSource = new BehaviorSubject([] as string[]);

  coordinatorsShowAllSource = new BehaviorSubject(true);
  coordinatorsShowAll = this.currentUser.role.pipe(
    switchMap((role) =>
      role === UserRole.ADMIN
        ? this.coordinatorsShowAllSource.asObservable()
        : of(false)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  coordinatorsSelected = this.coordinatorsSelectedSource.asObservable();

  allCustomers = this.peopleService
    .getAllPeople()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  allCustomersOfSelectedCoordinatorsMap = combineLatest([
    this.allCustomers,
    this.coordinatorsSelected,
  ]).pipe(
    map(([customers, coordinators]) => {
      const map: Record<string, boolean> = (coordinators || []).reduce(
        (acc, c) => Object.assign(acc, { [c]: true }),
        {}
      );
      const allCustomers = customers.filter(
        (c) => c?.coordinatorUid && map[c.coordinatorUid]
      );

      return new Map(allCustomers.map((c) => [c._id, c]));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  allCoorinatorsSelected = combineLatest([
    this.coordinators,
    this.coordinatorsSelected,
  ]).pipe(
    map(([users, selected]) => users.length === selected?.length),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.coordinators.subscribe((users) => {
      this.coordinatorsSelectedSource.next(users.map((u) => u.uid));
    });
  }
}
