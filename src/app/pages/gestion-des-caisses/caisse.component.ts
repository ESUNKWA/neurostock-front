import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { CaisseService } from '../../services/gestion-des-caisses/caisse.service';
import { AuthService } from '../../services/auth/auth.service';
import { BoutiqueService } from '../../services/boutique/boutique.service';
import { UserService } from '../../services/user/user.service';
import { ToastrService } from 'ngx-toastr';
import { ThousandSeparatorDirective } from '../../helpers/thousand-separator.directive';
import { finalize } from 'rxjs';
import Swal from 'sweetalert2';

declare var bootstrap: any;

@Component({
  selector: 'app-caisse',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, ThousandSeparatorDirective, NzSelectModule],
  templateUrl: './caisse.component.html',
  styleUrl: './caisse.component.scss'
})
export default class CaisseComponent implements OnInit {
  currentUser: any;
  boutiques: any[] = [];
  idBoutique: number | null = null;

  sessions: any[] = [];
  filteredSessions: any[] = [];
  sessionCaissierFilter: number | null = null;
  activeSession: any = null;
  caisses: any[] = [];
  theorique: any = null;
  loadingSessions = false;
  loadingActive = false;
  loadingTheorique = false;
  users: any[] = [];
  sessionUsers: any[] = [];
  caisseActivee: boolean | null = null;
  activating = false;
  mobileDetailItem: any = null;

  readonly modesLabels: Record<string, string> = {
    espece:       'Espèces',
    carte:        'Carte',
    credit:       'Crédit',
    orange_money: 'Orange Money',
    wave:         'Wave',
    mtn_money:    'MTN Money',
    moov_money:   'Moov Money',
    dajmo:        'Dajmo',
  };

  ouvrirForm!: FormGroup;
  fermerForm!: FormGroup;
  mouvementForm!: FormGroup;

  submittingOuvrir = false;
  submittingFermer = false;
  submittingMouvement = false;

  get isSuperUser(): boolean {
    const code = this.currentUser?.profil?.code;
    return code === 'admin' || code === 'responsable_structure' || code === 'gerant' || this.currentUser?.is_admin === true;
  }

  private readonly ALL_MODES_PAIEMENT = [
    { value: 'espece',       label: 'Espèces' },
    { value: 'orange_money', label: 'Orange Money' },
    { value: 'wave',         label: 'Wave' },
    { value: 'mtn_money',    label: 'MTN Money' },
    { value: 'moov_money',   label: 'Moov Money' },
    { value: 'dajmo',        label: 'Dajmo' },
    { value: 'carte',        label: 'Carte bancaire' },
    { value: 'credit',       label: 'Crédit' },
  ];

  modesPaiementActifs: string[] | null = null;

  get modesPaiement() {
    if (!this.modesPaiementActifs) return this.ALL_MODES_PAIEMENT;
    return this.ALL_MODES_PAIEMENT.filter(m => this.modesPaiementActifs!.includes(m.value));
  }

  constructor(
    private fb: FormBuilder,
    private caisseService: CaisseService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private userService: UserService,
    private toastr: ToastrService,
    private router: Router
  ) {}

  rapportRoute(id: number): string[] {
    const base = this.router.url.startsWith('/pos') ? '/pos/caisse/rapport' : '/caisse/rapport';
    return [base, String(id)];
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      
      if (user) {
        this.initForms();
        this.loadBoutiques();
        const boutique = user.boutique_id;
        
        if (boutique) {
          this.idBoutique = boutique;
          this.checkCaisseActivee();
          this.loadActiveSession();
          this.loadSessions();
          this.loadUsers();
          this.loadCaisses();
          // Load modes from user boutique if available
          if (Array.isArray(user.boutique?.modes_paiement)) {
            this.modesPaiementActifs = user.boutique.modes_paiement;
          } else {
            this.boutiqueService.findOne(boutique).subscribe({
              next: (r: any) => {
                const b = r?.data ?? r;
                if (Array.isArray(b?.modes_paiement)) this.modesPaiementActifs = b.modes_paiement;
              },
            });
          }
        }
      }
    });
  }

  initForms(): void {
    const fondGroup = () => this.fb.group({
      espece:       [0, [Validators.required, Validators.min(0)]],
      orange_money: [0, Validators.min(0)],
      wave:         [0, Validators.min(0)],
      mtn_money:    [0, Validators.min(0)],
      moov_money:   [0, Validators.min(0)],
      dajmo:        [0, Validators.min(0)],
      carte:        [0, Validators.min(0)],
      credit:       [0, Validators.min(0)],
    });

    this.ouvrirForm = this.fb.group({
      caisse_id:      [null, Validators.required],
      caissier:       [this.currentUser?.id ?? null, Validators.required],
      fond_ouverture: fondGroup(),
      note: ['']
    });

    this.fermerForm = this.fb.group({
      fond_fermeture: fondGroup(),
      notes: ['']
    });

    this.mouvementForm = this.fb.group({
      type:          ['entree', Validators.required],
      montant:       [null, [Validators.required, Validators.min(1)]],
      motif:         ['', Validators.required],
      mode_paiement: ['espece'],
    });
  }

  // ── Boutiques ────────────────────────────────────────────────────────────────

  loadBoutiques(): void {
    
    if (this.currentUser.is_admin) {
      this.boutiqueService.find().subscribe({
        next: (r: any) => { if (r?.data) this.boutiques = r.data; }
      });
    } else if (this.currentUser.profil?.code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
        next: (r: any) => { if (r?.data) this.boutiques = r.data; }
      });
    } else {
      this.boutiques = this.currentUser.boutique ? [this.currentUser.boutique] : [];
    }
  }

  onBoutiqueChange(): void {
    if (!this.idBoutique) return;
    this.sessionCaissierFilter = null;
    this.sessionUsers = [];
    this.filteredSessions = [];
    this.checkCaisseActivee();
    this.loadActiveSession();
    this.loadSessions();
    this.loadUsers();
    this.loadCaisses();
    const b = this.boutiques.find((x: any) => x.id === this.idBoutique);
    this.modesPaiementActifs = Array.isArray(b?.modes_paiement) ? b.modes_paiement : null;
  }

  loadCaisses(): void {
    if (!this.idBoutique) return;
    this.caisseService.getCaisses(this.idBoutique).subscribe({
      next: (r: any) => { this.caisses = r?.data ?? r ?? []; this.refreshCaisseIdValidator(); },
      error: () => { this.caisses = []; this.refreshCaisseIdValidator(); },
    });
  }

  /** La caisse physique n'est obligatoire que si la boutique en a au moins une de configurée. */
  private refreshCaisseIdValidator(): void {
    const ctrl = this.ouvrirForm?.get('caisse_id');
    if (!ctrl) return;
    ctrl.setValidators(this.caisses.length > 0 ? [Validators.required] : []);
    ctrl.updateValueAndValidity();
  }

  // ── Activation caisse ────────────────────────────────────────────────────────

  checkCaisseActivee(): void {
    if (!this.idBoutique) return;
    this.caisseActivee = null;
    this.boutiqueService.findOne(this.idBoutique).subscribe({
      next: (r: any) => { this.caisseActivee = !!(r?.data || r)?.gestion_caisse_activee; },
      error: () => { this.caisseActivee = false; }
    });
  }

  activerCaisse(): void {
    if (!this.idBoutique || this.activating) return;
    this.activating = true;
    this.boutiqueService.update({ gestion_caisse_activee: true }, this.idBoutique.toString())
      .pipe(finalize(() => (this.activating = false)))
      .subscribe({
        next: () => {
          this.caisseActivee = true;
          this.toastr.success('Gestion de caisse activée');
          this.loadActiveSession();
          this.loadSessions();
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de l\'activation')
      });
  }

  desactiverCaisse(): void {
    if (!this.idBoutique || this.activating) return;
    Swal.fire({
      title: 'Désactiver la caisse ?',
      text: 'Les ventes ne seront plus rattachées à une session de caisse.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Désactiver',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#dc3545',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.activating = true;
      this.boutiqueService.update({ gestion_caisse_activee: false }, this.idBoutique!.toString())
        .pipe(finalize(() => (this.activating = false)))
        .subscribe({
          next: () => {
            this.caisseActivee = false;
            this.activeSession = null;
            this.sessions = [];
            this.toastr.success('Gestion de caisse désactivée');
          },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la désactivation')
        });
    });
  }

  // ── Chargement données ───────────────────────────────────────────────────────

  loadUsers(): void {
    if (!this.idBoutique) return;
    this.userService.find('', this.idBoutique.toString()).subscribe({
      next: (r: any) => {
        this.users = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
      },
      error: () => { this.users = []; }
    });
  }

  loadActiveSession(): void {
    if (!this.idBoutique) return;
    this.loadingActive = true;
    this.theorique = null;
    this.caisseService.getActiveSession(this.idBoutique, this.currentUser?.telephone)
      .pipe(finalize(() => (this.loadingActive = false)))
      .subscribe({
        next: (r: any) => {
          this.activeSession = r?.data || null;
          if (this.activeSession?.id) this.loadTheorique();
        },
        error: () => { this.activeSession = null; }
      });
  }

  loadTheorique(): void {
    if (!this.activeSession?.id) return;
    this.loadingTheorique = true;
    this.caisseService.getTheorique(this.activeSession.id)
      .pipe(finalize(() => (this.loadingTheorique = false)))
      .subscribe({
        next: (r: any) => { this.theorique = r?.data || r; },
        error: () => { this.theorique = null; }
      });
  }

  loadSessions(): void {
    if (!this.idBoutique) return;
    this.loadingSessions = true;
    const caissierFilter = this.isSuperUser ? undefined : (this.currentUser?.telephone ?? undefined);
    this.caisseService.getSessions(this.idBoutique, caissierFilter, 1, 500)
      .pipe(finalize(() => (this.loadingSessions = false)))
      .subscribe({
        next: (r: any) => {
          this.sessions = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
          this.buildSessionUsers();
          this.applySessionFilter();
        },
        error: () => { this.sessions = []; this.filteredSessions = []; this.sessionUsers = []; }
      });
  }

  buildSessionUsers(): void {
    const seen = new Set<number>();
    this.sessionUsers = [];
    for (const s of this.sessions) {
      if (s.caissier && !seen.has(s.caissier.id)) {
        seen.add(s.caissier.id);
        this.sessionUsers.push(s.caissier);
      }
    }
  }

  applySessionFilter(): void {
    if (!this.sessionCaissierFilter) {
      this.filteredSessions = this.sessions;
    } else {
      this.filteredSessions = this.sessions.filter(s => s.caissier?.id === this.sessionCaissierFilter);
    }
  }

  onSessionFilterChange(): void {
    this.applySessionFilter();
  }

  // ── Modals ───────────────────────────────────────────────────────────────────

  openModalOuvrir(): void {
    const caissierCtrl = this.ouvrirForm.get('caissier');
    caissierCtrl?.enable();
    this.ouvrirForm.reset({
      caisse_id: null,
      caissier: null,
      fond_ouverture: { espece: 0, orange_money: 0, wave: 0, mtn_money: 0, moov_money: 0, dajmo: 0, carte: 0, credit: 0 },
      note: ''
    });
    this.refreshCaisseIdValidator();

    const openModal = () => {
      // setTimeout(0) laisse nz-select enregistrer ses options avant setValue
      setTimeout(() => caissierCtrl?.setValue(this.currentUser?.id ?? null), 0);
      const m = document.getElementById('modal-ouvrir');
      if (m) (bootstrap.Modal.getInstance(m) ?? new bootstrap.Modal(m)).show();
    };

    if (this.idBoutique && this.users.length === 0) {
      this.userService.find('', this.idBoutique.toString()).subscribe({
        next: (r: any) => {
          this.users = Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []);
          openModal();
        },
        error: () => openModal()
      });
    } else {
      openModal();
    }
  }

  openModalFermer(): void {
    this.fermerForm.reset({
      fond_fermeture: { espece: 0, orange_money: 0, wave: 0, mtn_money: 0, moov_money: 0, dajmo: 0, carte: 0, credit: 0 },
      notes: ''
    });
    const m = document.getElementById('modal-fermer');
    if (m) new bootstrap.Modal(m).show();
  }

  openModalMouvement(): void {
    this.mouvementForm.reset({ type: 'entree', montant: null, motif: '', mode_paiement: 'espece' });
    const m = document.getElementById('modal-mouvement');
    if (m) new bootstrap.Modal(m).show();
  }

  // ── Soumissions ──────────────────────────────────────────────────────────────

  submitOuvrir(): void {
    if (this.ouvrirForm.invalid || !this.idBoutique) return;
    this.submittingOuvrir = true;
    const { caissier, ...rest } = this.ouvrirForm.getRawValue();
    const body = { boutique: this.idBoutique, caissier: caissier ?? null, ...rest };
    this.caisseService.ouvrirSession(body)
      .pipe(finalize(() => (this.submittingOuvrir = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Caisse ouverte avec succès');
          bootstrap.Modal.getInstance(document.getElementById('modal-ouvrir'))?.hide();
          this.loadActiveSession();
          this.loadSessions();
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de l\'ouverture')
      });
  }

  submitFermer(): void {
    if (this.fermerForm.invalid || !this.activeSession?.id) return;

    const fondFermeture: Record<string, number> = this.fermerForm.value.fond_fermeture ?? {};
    const theorique: Record<string, number>     = this.theorique?.montant_theorique    ?? {};
    const modes = ['espece', 'orange_money', 'wave', 'mtn_money', 'moov_money', 'dajmo', 'carte', 'credit'] as const;
    const fmt   = (n: number) => n.toLocaleString('fr-FR');

    // Lignes de récap par mode (seulement ceux qui ont une valeur)
    const lignes = modes
      .map(m => {
        const th    = Number(theorique[m]     ?? 0);
        const co    = Number(fondFermeture[m] ?? 0);
        const ecart = co - th;
        return { mode: m, label: this.modesLabels[m], th, co, ecart };
      })
      .filter(l => l.th !== 0 || l.co !== 0);

    const totalTh    = lignes.reduce((s, l) => s + l.th,    0);
    const totalCo    = lignes.reduce((s, l) => s + l.co,    0);
    const totalEcart = lignes.reduce((s, l) => s + l.ecart, 0);

    const couleur = (v: number) =>
      v > 0 ? 'color:#198754;font-weight:600' : v < 0 ? 'color:#dc3545;font-weight:600' : '';

    const sign = (v: number) => (v >= 0 ? '+' : '') + fmt(v);

    const lignesHtml = lignes.map(l => `
      <tr>
        <td style="text-align:left;padding:4px 8px;">${l.label}</td>
        <td style="text-align:right;padding:4px 8px;">${fmt(l.th)}</td>
        <td style="text-align:right;padding:4px 8px;">${fmt(l.co)}</td>
        <td style="text-align:right;padding:4px 8px;${couleur(l.ecart)}">${sign(l.ecart)}</td>
      </tr>`).join('');

    const tableHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
        <thead>
          <tr style="background:#f8f9fa;">
            <th style="text-align:left;padding:6px 8px;border-bottom:2px solid #dee2e6;">Mode</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #dee2e6;">Théorique</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #dee2e6;">Compté</th>
            <th style="text-align:right;padding:6px 8px;border-bottom:2px solid #dee2e6;">Écart</th>
          </tr>
        </thead>
        <tbody>${lignesHtml}</tbody>
        <tfoot>
          <tr style="border-top:2px solid #dee2e6;font-weight:700;">
            <td style="text-align:left;padding:6px 8px;">Total</td>
            <td style="text-align:right;padding:6px 8px;">${fmt(totalTh)} FCFA</td>
            <td style="text-align:right;padding:6px 8px;">${fmt(totalCo)} FCFA</td>
            <td style="text-align:right;padding:6px 8px;${couleur(totalEcart)}">${sign(totalEcart)} FCFA</td>
          </tr>
        </tfoot>
      </table>
      ${this.fermerForm.value.notes ? `<p style="margin-top:8px;font-size:.8rem;color:#6c757d;">Note : ${this.fermerForm.value.notes}</p>` : ''}`;

    Swal.fire({
      title: 'Confirmer la fermeture',
      html: tableHtml,
      icon: totalEcart === 0 ? 'success' : totalEcart > 0 ? 'info' : 'warning',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-lock-fill me-1"></i> Fermer la caisse',
      cancelButtonText:  'Annuler',
      confirmButtonColor: '#dc3545',
      width: '600px',
    }).then(result => {
      if (!result.isConfirmed) return;

      this.submittingFermer = true;
      this.caisseService.fermerSession(this.activeSession.id, this.fermerForm.value, this.currentUser?.telephone)
        .pipe(finalize(() => (this.submittingFermer = false)))
        .subscribe({
          next: (r: any) => {
            bootstrap.Modal.getInstance(document.getElementById('modal-fermer'))?.hide();
            this.loadActiveSession();
            this.loadSessions();
            this.theorique = null;

            const ecartObj   = r?.data?.ecart ?? {};
            const ecartFinal = typeof ecartObj === 'object'
              ? Object.values(ecartObj).reduce((s: number, v: any) => s + Number(v), 0)
              : Number(ecartObj);

            Swal.fire({
              icon: ecartFinal === 0 ? 'success' : (ecartFinal > 0 ? 'info' : 'warning'),
              title: 'Caisse fermée',
              html: `Écart final : <strong style="${couleur(ecartFinal)}">${sign(ecartFinal)} FCFA</strong>`,
              confirmButtonText: 'OK',
            });
          },
          error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la fermeture')
        });
    });
  }

  submitMouvement(): void {
    if (this.mouvementForm.invalid || !this.activeSession?.id) return;
    this.submittingMouvement = true;
    const body = { ...this.mouvementForm.value, caissier: this.currentUser?.telephone };
    this.caisseService.ajouterMouvement(this.activeSession.id, body)
      .pipe(finalize(() => (this.submittingMouvement = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Mouvement enregistré');
          bootstrap.Modal.getInstance(document.getElementById('modal-mouvement'))?.hide();
          this.loadActiveSession();
          this.loadTheorique();
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
      });
  }

  /** Retourne les modes actifs d'un objet fond (valeur > 0) */
  modeEntries(obj: any): { mode: string; label: string; val: number }[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj)
      .map(([mode, val]) => ({ mode, label: this.modesLabels[mode] ?? mode, val: Number(val) || 0 }))
      .filter(e => e.val !== 0);
  }

  /** Somme toutes les valeurs d'un fond (objet par mode ou nombre simple) */
  sumFond(fond: any): number {
    if (fond == null) return 0;
    if (typeof fond === 'number') return fond;
    return Object.values(fond).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
  }

  labelStatut(s: string): string {
    const map: Record<string, string> = { ouverte: 'Ouverte', fermee: 'Fermée', fermée: 'Fermée' };
    return map[s] ?? s;
  }
}
