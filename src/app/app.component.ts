import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallComponent } from './components/pwa-install/pwa-install.component';
import { ThemeService } from './services/theme/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaInstallComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'NeuroStock';

  constructor(private themeService: ThemeService) {
    this.themeService.init();
  }
}
