import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

@Component({
  selector: 'app-settings-emails-card',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslatePipe,
  ],
  templateUrl: './settings-emails-card.component.html',
  styleUrl: './settings-emails-card.component.scss',
})
export class SettingsEmailsCardComponent {
  templates = ['report', 'annual', 'custom'];
}


