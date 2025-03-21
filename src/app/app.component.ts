import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  AngularFireAuth,
  AngularFireAuthModule,
} from '@angular/fire/compat/auth';
import { LANGUAGE } from './core/lang';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MENU_TOOGLE } from './core/header/menu';
import { Subject } from 'rxjs';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from './core/lang/translate.pipe';
import { env } from './env/env';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    AngularFireAuthModule,
    MatSidenavModule,
    MatIconButton,
    MatIconModule,
    MatButton,
    TranslatePipe,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  providers: [
    {
      provide: MENU_TOOGLE,
      useValue: new Subject<null>(),
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements AfterViewInit {
  private lang = inject(LANGUAGE);
  private renderer = inject(Renderer2);
  @ViewChild('drawer', { static: true }) drawer?: MatDrawer;
  cdr = inject(ChangeDetectorRef);
  toggle = inject(MENU_TOOGLE);
  auth = inject(AngularFireAuth);
  router = inject(Router);

  feature = env.feature;

  constructor() {
    this.lang.subscribe((lang) => {
      const body = document.body;
      const classesToRemove = Array.from(body.classList).filter((cls) =>
        cls.startsWith('lang-')
      );
      classesToRemove.forEach((cls) => this.renderer.removeClass(body, cls));
      this.renderer.addClass(body, `lang-${lang}`);
    });
  }

  ngAfterViewInit() {
    this.toggle.subscribe(() => {
      this.drawer?.toggle();
      this.cdr.markForCheck();
    });
  }

  redirect(to: string) {
    this.toggle.next(null);
    this.router.navigate([to]);
  }

  logout() {
    this.toggle.next(null);
    this.auth.signOut().then(() => {
      this.router.navigate(['login']);
    });
  }
}
