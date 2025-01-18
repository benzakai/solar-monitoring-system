import { Component, inject, Renderer2 } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { LANGUAGE } from './core/lang';
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AngularFireAuthModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private lang = inject(LANGUAGE);
  private renderer = inject(Renderer2);

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
}
