import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

  toggleSidebar() {
    const sidebar = document.getElementById('toggleSidebar');
    if (sidebar) {
      sidebar.classList.toggle('toggle-sidebar');
    }
  }

}
