import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '../../core/lang/translate.pipe';
import { UsersService } from '../../endpoint/users.service';
import { User } from '../../domain/user';
import { UserRole } from '../../endpoint/users.service';
import { Observable } from 'rxjs';
import { UserDialogComponent } from './user-dialog/user-dialog.component';
import { DeleteUserDialogComponent } from './delete-user-dialog/delete-user-dialog.component';
import { ChangePasswordDialogComponent } from './change-password-dialog/change-password-dialog.component';
import { ToggleStatusDialogComponent } from './toggle-status-dialog/toggle-status-dialog.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    TranslatePipe,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: 'users.component.html',
  styleUrls: ['./users.component.scss'],
})
export class UsersComponent {
  private usersService = inject(UsersService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  displayedColumns = [
    'name',
    'email',
    'phone',
    'role',
    'lastLogin',
    'status',
    'actions',
  ].reverse();
  users$: Observable<User[]>;

  constructor() {
    this.users$ = this.usersService.getAllUsers();
  }

  getRoleName(role: UserRole): string {
    switch (role) {
      case UserRole.ADMIN:
        return 'admin';
      case UserRole.COORDINATOR:
        return 'coordinator';
      case UserRole.SIMPLE:
        return 'simple';
      default:
        return 'simple';
    }
  }

  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  toggleStatus(event: Event, user: User) {
    event.preventDefault(); // Prevent the toggle from changing before confirmation

    const dialogRef = this.dialog.open(ToggleStatusDialogComponent, {
      data: { user },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.usersService
            .updateUser(user.uid, {
              isActive: !user.isActive,
            })
            .subscribe();
        }
      });
  }

  addUser() {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      data: {},
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.usersService
            .createUser({
              displayName: result.displayName,
              email: result.email,
              role: result.role,
              isActive: true,
              lastLogin: new Date().toISOString(),
              phone: '',
            })
            .subscribe();
        }
      });
  }

  editUser(user: User) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      data: { user },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result) {
          this.usersService
            .updateUser(user.uid, {
              displayName: result.displayName,
              email: result.email,
              role: result.role,
            })
            .subscribe();
        }
      });
  }

  changePassword(user: User) {
    const dialogRef = this.dialog.open(ChangePasswordDialogComponent, {
      data: { user },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newPassword) => {
        if (newPassword) {
          this.usersService.changePassword(user, newPassword).subscribe();
        }
      });
  }
}
