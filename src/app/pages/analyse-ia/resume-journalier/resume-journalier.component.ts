import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PrevisionService } from '../../../services/analyse-ia/prevision.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';

@Component({
  selector: 'app-resume-journalier',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './resume-journalier.component.html',
  styleUrl: './resume-journalier.component.scss',
})
export default class ResumeJournalierComponent implements OnInit {
  private previsionService = inject(PrevisionService);
  private authService = inject(AuthService);
  private boutiqueService = inject(BoutiqueService);

  currentUser: any;
  resume: any = null;
  isLoading = false;
  boutiques: any[] = [];
  idBoutique = 0;
  today = new Date();

  get isAdmin(): boolean {
    const code = this.currentUser?.profil?.code;
    return code === 'admin' || code === 'responsable_structure';
  }

  get boutiqueId(): number {
    return this.isAdmin ? this.idBoutique : (this.currentUser?.boutique_id ?? 0);
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(u => {
      this.currentUser = u;
      this.loadBoutiques();
      if (!this.isAdmin) this.loadResume();
    });
  }

  loadBoutiques(): void {
    if (!this.isAdmin) return;
    if (this.currentUser?.profil?.code === 'admin') {
      this.boutiqueService.find().subscribe({
        next: (r: any) => {
          if (r.status === 'success' && r.data) this.boutiques = r.data;
        }
      });
    } else {
      this.boutiques = this.currentUser.boutiques ?? [];
    }
  }

  onBoutiqueChange(): void {
    this.loadResume();
  }

  loadResume(): void {
    if (!this.boutiqueId) return;
    this.isLoading = true;
    this.resume = null;
    this.previsionService.getResumeJournalier(this.boutiqueId).subscribe({
      next: (res: any) => {
        this.resume = res?.data ?? res;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  evolutionClass(val: number | null): string {
    if (val === null || val === undefined) return 'text-muted';
    return val >= 0 ? 'text-success' : 'text-danger';
  }

  evolutionIcon(val: number | null): string {
    if (val === null || val === undefined) return 'bi-dash';
    return val >= 0 ? 'bi-arrow-up-circle-fill' : 'bi-arrow-down-circle-fill';
  }
}
