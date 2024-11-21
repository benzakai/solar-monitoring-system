import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { startWith } from 'rxjs';
import { state } from '@angular/animations';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HeaderComponent,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css',
})
export class LoginPageComponent {
  auth = inject(AngularFireAuth);

  loginForm: FormGroup;

  authState = this.auth.authState.pipe(startWith(undefined));
  error: string = '';

  constructor(
    private fb: FormBuilder,
    private afAuth: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  googleLogin() {
    this.error = '';
    this.auth
      .signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .catch(() => (this.error = 'Wrong credentials'))
      .then(() => this.router.navigate(['systems']));
  }

  emailPasswordLogin() {
    this.error = '';
    if (this.loginForm.valid) {
      const formData = this.loginForm.value;
      this.auth
        .signInWithEmailAndPassword(formData.username, formData.password)
        .then(() => this.router.navigate(['systems']))
        .catch(() => (this.error = 'Wrong credentials'));
    } else {
      this.error = 'Form is invalid';
    }

  }

  logout() {
    this.auth.signOut();
    window.location.reload();
  }

  protected readonly state = state;
}
