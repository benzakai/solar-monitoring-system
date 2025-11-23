import { Component } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../../../core/lang/translate.pipe';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-settings-display-card',
  standalone: true,
  imports: [
    CommonModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    FormsModule,
  ],
  templateUrl: './settings-display-card.component.html',
  styleUrl: './settings-display-card.component.scss',
})
export class SettingsDisplayCardComponent {
  readonly minFont = 14;
  readonly maxFont = 18;
  fontSize = 16;
}


