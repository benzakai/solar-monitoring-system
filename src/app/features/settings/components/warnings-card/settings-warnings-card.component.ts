import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-settings-warnings-card',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './settings-warnings-card.component.html',
  styleUrl: './settings-warnings-card.component.scss',
})
export class SettingsWarningsCardComponent {}


