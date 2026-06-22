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
      this.usersService.getCoordinators().pipe(tap((a) => console.log(a)))
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  coordinatorsSelectedSource = new BehaviorSubject([] as string[]);

  coordinatorsShowAllSource = new BehaviorSubject(true);

  coordinatorsSelected = this.coordinatorsSelectedSource.asObservable();

  allCustomers = this.peopleService
    .getAllPeople()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  allClients = this.peopleService
    .getAllClients()
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));

  allCustomersOfSelectedCoordinatorsMap = combineLatest([
    this.allCustomers,
    this.coordinatorsSelected,
    this.coordinatorsShowAllSource,
  ]).pipe(
    map(([customers, coordinators, allCoords]) => {
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

  allClientsOfSelectedCoordinatorsMap = combineLatest([
    this.allClients,
    this.coordinatorsSelected,
    this.coordinatorsShowAllSource,
  ]).pipe(
    map(([clients, coordinators, allCoords]) => {
      const map: Record<string, boolean> = (coordinators || []).reduce(
        (acc, c) => Object.assign(acc, { [c]: true }),
        {}
      );

      const allClients = clients.filter(
        (c) => c?.coordinatorUid && map[c.coordinatorUid]
      );

      return new Map(allClients.map((c) => [c._id, c]));
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

  coordinatorsShowAll = this.currentUser.role.pipe(
    switchMap((role) =>
      role === UserRole.ADMIN ? this.allCoorinatorsSelected : of(false)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    combineLatest([this.currentUser.user, this.coordinators]).subscribe(
      ([currentUser, users]) => {
        if (currentUser.role === UserRole.ADMIN) {
          this.coordinatorsSelectedSource.next(users.map((u) => u.uid));
        } else {
          this.coordinatorsSelectedSource.next(
            users.filter((u) => u.uid === currentUser.uid).map((u) => u.uid)
          );
        }
      }
    );
  }
}
