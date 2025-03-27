import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { User } from '../../domain/user';
import { UsersService } from '../../endpoint/users.service';

@Injectable({
  providedIn: 'root',
})
export class UsersFacade {
  cashedPeople: { [id: string]: User } = {};
  usersService = inject(UsersService);

  getUsersByIds(ids: string[]): Observable<User[]> {
    const peopleFromCache = ids
      .map((id) => this.cashedPeople[id])
      .filter(Boolean);
    const peopleNotFromCache = ids.filter((id) => !this.cashedPeople[id]);

    return this.usersService
      .getUsersByUids([...new Set(peopleNotFromCache)])
      .pipe(
        map((people) => {
          people.forEach((person) => {
            this.cashedPeople[person.uid] = person;
          });
          return [...peopleFromCache, ...people];
        })
      );
  }
}
