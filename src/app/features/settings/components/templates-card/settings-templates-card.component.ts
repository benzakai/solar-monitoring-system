import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';

@Component({
  selector: 'app-settings-templates-card',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    TranslatePipe,
  ],
  templateUrl: './settings-templates-card.component.html',
  styleUrl: './settings-templates-card.component.scss',
})
export class SettingsTemplatesCardComponent {
  tabs = ['monitor', 'annual', 'wash'];
}


