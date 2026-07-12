import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { finalize, Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { CommandeTableService } from '../../../services/restaurant/commande-table.service';
import { TableRestaurantService } from '../../../services/restaurant/table-restaurant.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { AuthService } from '../../../services/auth/auth.service';
import { RestaurantSocketService, SocketStatus } from '../../../services/restaurant/restaurant-socket.service';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-commandes-restaurant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NzSelectModule],
  templateUrl: './commandes.component.html',
  providers: [ToastrService],
})
export default class CommandesRestaurantComponent implements OnInit, OnDestroy {
  commandes: any[] = [];
  boutiques: any[] = [];
  currentUser: any;
  selectedBoutiqueId: number | null = null;
  selectedStatut: string | null = null;
  selectedDate: string = new Date().toISOString().split('T')[0];
  isLoading = false;
  detailCommande: any = null;
  detailCommandesSoeurs: any[] = [];
  vue: 'liste' | 'kanban' = 'kanban';
  socketStatus: SocketStatus = 'disconnected';
  private refreshInterval: any = null;
  private readonly subs = new Subscription();

  readonly STATUTS = [
    { value: 'en_attente', label: 'En attente', css: 'secondary' },
    { value: 'en_cours',   label: 'En cours',   css: 'warning'   },
    { value: 'prete',      label: 'Prête',      css: 'info'      },
    { value: 'servie',     label: 'Servie',     css: 'primary'   },
    { value: 'payee',      label: 'Payée',      css: 'success'   },
    { value: 'annulee',    label: 'Annulée',    css: 'danger'    },
  ];

  readonly FLUX: Record<string, string[]> = {
    en_attente: ['en_cours', 'annulee'],
    en_cours:   ['prete', 'annulee'],
    prete:      ['servie', 'annulee'],
    servie:     [],
    payee:      [],
    annulee:    [],
  };

  appelsServeur: any[] = [];

  constructor(
    private commandeService: CommandeTableService,
    private tableService: TableRestaurantService,
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
    private toastr: ToastrService,
    private socket: RestaurantSocketService,
    @Inject(PLATFORM_ID) private platformId: any,
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      this.loadBoutiques();
      const code = user?.profil?.code?.toLowerCase();
      if (code !== 'admin' && code !== 'responsable_structure') {
        this.selectedBoutiqueId = user?.boutique?.id ?? null;
        this.loadCommandes();
        if (this.selectedBoutiqueId != null) this._connectSocket(this.selectedBoutiqueId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    this.subs.unsubscribe();
    this.socket.disconnect();
  }

  loadBoutiques(): void {
    const code = this.currentUser?.profil?.code?.toLowerCase();
    const autoSelect = (list: any[]) => {
      this.boutiques = list;
      if (!this.selectedBoutiqueId && list.length) {
        this.selectedBoutiqueId = list[0].id;
        this.loadCommandes();
        this._connectSocket(list[0].id);
      }
    };
    if (code === 'admin') {
      this.boutiqueService.find().subscribe({ next: (r: any) => autoSelect(r?.data ?? []) });
    } else if (code === 'responsable_structure') {
      this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
        next: (r: any) => autoSelect(r?.data ?? [])
      });
    } else {
      this.boutiques = this.currentUser?.boutique ? [this.currentUser.boutique] : [];
    }
  }

  onBoutiqueChange(): void {
    this.loadCommandes();
    if (this.selectedBoutiqueId != null) this._connectSocket(this.selectedBoutiqueId);
  }
  onStatutChange(): void { this.loadCommandes(); }

  private _connectSocket(boutiqueId: number): void {
    this.socket.connect(boutiqueId);

    // Statut de connexion → indicateur visuel
    this.subs.add(
      this.socket.status$.subscribe(s => this.socketStatus = s)
    );

    // Nouvelle commande → ajout en temps réel
    this.subs.add(
      this.socket.nouvelleCommande$.subscribe(commande => {
        const existe = this.commandes.some(c => c.id === commande.id);
        if (!existe) {
          this.commandes = [commande, ...this.commandes];
          if (this.vue === 'liste') {
            // Le DataTable ne supporte pas l'insertion directe ; on recharge
            this.loadCommandes();
          }
          this.toastr.info(
            `Table ${commande.table?.numero ?? '—'} · ${Number(commande.montant_total ?? 0).toLocaleString('fr-FR')} FCFA`,
            '🆕 Nouvelle commande',
            { timeOut: 6000, positionClass: 'toast-top-right' }
          );
          this._playSound('new_order');
        }
      })
    );

    // Appel serveur → bandeau d'alerte
    this.subs.add(
      this.socket.appelServeur$.subscribe(payload => {
        const table = payload.table;
        const existe = this.appelsServeur.some(t => t.id === table?.id);
        if (!existe && table) {
          this.appelsServeur = [...this.appelsServeur, table];
          this.toastr.warning(
            `Table ${table.numero ?? '—'} demande l'attention d'un serveur`,
            '🔔 Appel serveur',
            { timeOut: 0, closeButton: true, positionClass: 'toast-top-right' }
          );
          this._playSound('bell');
        }
      })
    );

    // Changement de statut → mise à jour en place
    this.subs.add(
      this.socket.statutChange$.subscribe(({ id, statut }) => {
        const idx = this.commandes.findIndex(c => c.id === id);
        if (idx !== -1) {
          this.commandes[idx] = { ...this.commandes[idx], statut };
          // Forcer la détection de changement sur le tableau
          this.commandes = [...this.commandes];
          if (this.vue === 'liste') this.loadCommandes();
        }
      })
    );
  }

  /** Son de notification discret via Web Audio API */
  private _playSound(type: 'new_order' | 'bell'): void {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      if (type === 'bell') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
      }
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch { /* AudioContext non disponible */ }
  }

  basculerVue(v: 'liste' | 'kanban'): void {
    const changing = this.vue !== v;
    this.vue = v;
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (v === 'kanban') {
      if (changing) this.destroyDataTable();
      this.refreshInterval = setInterval(() => this.loadCommandes(), 30000);
      if (changing) this.loadCommandes();
    } else {
      if (changing) this.loadCommandes();
    }
  }

  loadCommandes(): void {
    if (!this.selectedBoutiqueId) { this.commandes = []; return; }
    this.isLoading = true;
    if (this.vue === 'liste') this.destroyDataTable();
    this.commandeService.getAll(this.selectedBoutiqueId, this.selectedStatut ?? undefined, this.selectedDate)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (r: any) => {
          this.commandes = r?.data ?? [];
          this.loadAppelsServeur();
          if (this.vue === 'liste') {
            setTimeout(() => { if (isPlatformBrowser(this.platformId)) this.initDataTable(); }, 50);
          }
        },
        error: () => { this.commandes = []; }
      });
  }

  get isToday(): boolean {
    return this.selectedDate === new Date().toISOString().split('T')[0];
  }

  get labelJour(): string {
    if (this.isToday) return "Aujourd'hui";
    const d = new Date(this.selectedDate + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  get caJourLabel(): string {
    return this.isToday ? "CA du jour" : "CA";
  }

  jourPrecedent(): void {
    const d = new Date(this.selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    this.selectedDate = d.toISOString().split('T')[0];
    this.loadCommandes();
  }

  jourSuivant(): void {
    if (this.isToday) return;
    const d = new Date(this.selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    this.selectedDate = d.toISOString().split('T')[0];
    this.loadCommandes();
  }

  allerAujourdhui(): void {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.loadCommandes();
  }

  private destroyDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const t = $('.dt-commandes-table');
      if ($.fn?.DataTable?.isDataTable(t)) t.DataTable().destroy();
    } catch {}
  }

  private initDataTable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const self = this;
    try {
      const table = $('.dt-commandes-table').DataTable({
        data: this.commandes,
        columns: [
          {
            data: 'reference',
            render: (d: any) => `<span class="badge bg-light text-dark border font-monospace">${d}</span>`
          },
          {
            data: 'table',
            render: (d: any) => d ? `<span class="fw-semibold">Table ${d.numero}${d.nom ? ' — ' + d.nom : ''}</span>` : '<span class="text-muted">—</span>'
          },
          {
            data: 'lignes',
            render: (d: any[]) => `<span class="badge bg-secondary">${d?.length ?? 0} article(s)</span>`
          },
          {
            data: 'montant_total',
            render: (d: any) => `<span class="fw-semibold">${Number(d ?? 0).toLocaleString('fr-FR')} FCFA</span>`
          },
          {
            data: 'statut',
            render: (d: any) => {
              const s = self.STATUTS.find(x => x.value === d);
              return `<span class="badge bg-${s?.css ?? 'secondary'}">${s?.label ?? d}</span>`;
            }
          },
          {
            data: 'created_at',
            render: (d: any) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
          },
          {
            data: null,
            orderable: false,
            render: (_d: any, _t: any, row: any) => {
              const statut = row.statut;
              const id = row.id;
              const peutChanger = (self.FLUX[statut] ?? []).length > 0;
              return `
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary btn-detail" data-id="${id}" title="Détail"><i class="bi bi-eye"></i></button>
                  ${statut !== 'payee' && statut !== 'annulee' ? `
                    <a href="/restaurant/commande?commande=${id}" class="btn btn-outline-primary" title="Modifier / Ajouter">
                      <i class="bi bi-pencil"></i>
                    </a>` : ''}
                  ${peutChanger ? `<button class="btn btn-outline-info btn-statut" data-id="${id}" data-statut="${statut}" title="Changer statut"><i class="bi bi-arrow-repeat"></i></button>` : ''}
                  ${statut !== 'payee' && statut !== 'annulee' ? `<button class="btn btn-success btn-encaisser" data-id="${id}" title="Encaisser"><i class="bi bi-cash-coin"></i></button>` : ''}
                </div>`;
            }
          },
        ],
        language: {
          emptyTable:  'Aucune commande',
          search:      'Rechercher :',
          info:        '_START_ à _END_ sur _TOTAL_',
          zeroRecords: 'Aucun résultat',
          lengthMenu:  'Afficher _MENU_',
          paginate:    { first: '«', last: '»', next: '›', previous: '‹' },
        },
        dom: '<"row mb-2"<"col-sm-6"B><"col-sm-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-5"i><"col-sm-7"p>>',
        buttons: [
          { extend: 'excel', text: '<i class="bi bi-file-earmark-excel"></i> Excel', className: 'btn btn-success btn-sm me-1' },
        ],
        order: [[5, 'desc']],
        pageLength: 25,
        responsive: true,
      });

      table.on('click', '.btn-detail', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        self.ouvrirDetail(id);
      });

      table.on('click', '.btn-statut', function(this: HTMLElement) {
        const id     = parseInt($(this).data('id'));
        const statut = $(this).data('statut');
        self.changerStatut(id, statut);
      });

      table.on('click', '.btn-encaisser', function(this: HTMLElement) {
        const id = parseInt($(this).data('id'));
        self.encaisser(id);
      });

    } catch (e) { console.error(e); }
  }

  ouvrirDetail(id: number): void {
    this.detailCommandesSoeurs = [];
    this.commandeService.getById(id).subscribe({
      next: (r: any) => {
        this.detailCommande = r?.data ?? r;
        if (this.detailCommande?.table?.id) {
          this.commandeService.getByTable(this.detailCommande.table.id).subscribe({
            next: (res: any) => {
              this.detailCommandesSoeurs = (res?.data ?? []).filter((c: any) => c.id !== id);
            },
            error: () => { this.detailCommandesSoeurs = []; }
          });
        }
        const m = document.getElementById('modal-detail-commande');
        if (m) new bootstrap.Modal(m).show();
      },
      error: () => this.toastr.error('Impossible de charger le détail')
    });
  }

  get detailTotalCombine(): number {
    return (this.detailCommande?.montant_total ?? 0)
      + this.detailCommandesSoeurs.reduce((s, c) => s + (c.montant_total ?? 0), 0);
  }

  async changerStatut(id: number, currentStatut: string): Promise<void> {
    const prochains = (this.FLUX[currentStatut] ?? [])
      .map(v => this.STATUTS.find(s => s.value === v)!)
      .filter(Boolean);
    if (!prochains.length) return;

    const options: Record<string, string> = {};
    prochains.forEach(s => { options[s.value] = s.label; });

    const { value: statut, isConfirmed } = await Swal.fire({
      title: 'Changer le statut',
      input: 'select',
      inputOptions: options,
      inputPlaceholder: '— Sélectionner —',
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
    });
    if (!isConfirmed || !statut) return;

    this.commandeService.changerStatut(id, statut).subscribe({
      next: () => { this.toastr.success('Statut mis à jour'); this.loadCommandes(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }

  async encaisser(id: number): Promise<void> {
    const commande = this.commandes.find(c => c.id === id) ?? this.detailCommande;
    if (commande?.table?.id) {
      await this.encaisserGroupeTable(commande.table.id);
      return;
    }
    // Commande sans table : dialog simple
    const { value: swalResult, isConfirmed } = await Swal.fire({
      title: 'Encaisser la commande',
      html: `<div class="fs-3 fw-bold text-success mb-2">${Number(commande?.montant_total ?? 0).toLocaleString('fr-FR')} FCFA</div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-cash-coin me-1"></i> Encaisser',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#198754',
    });
    if (!isConfirmed) return;
    this.commandeService.encaisser(id, false).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Encaissé !', timer: 1800, showConfirmButton: false });
        this.loadCommandes();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
    });
  }

  async encaisserGroupeTable(tableId: number): Promise<void> {
    const commandes: any[] = await new Promise(resolve => {
      this.commandeService.getByTable(tableId).subscribe({
        next: (r: any) => resolve(r?.data ?? []),
        error: () => resolve([]),
      });
    });

    if (!commandes.length) {
      this.toastr.info('Aucune commande non payée pour cette table');
      return;
    }

    const tableNum = commandes[0].table?.numero;

    const buildHtml = (): string => {
      const rows = commandes.map(c => {
        const statLabel = this.STATUTS.find(s => s.value === c.statut)?.label ?? c.statut;
        const items = (c.lignes ?? []).slice(0, 3).map((l: any) => `${l.recette?.nom} ×${l.quantite}`).join(' · ')
          + (c.lignes?.length > 3 ? ' · …' : '');
        return `
          <div class="form-check text-start mb-2 pb-2 border-bottom">
            <input class="form-check-input cmd-check" type="checkbox" id="cmd-${c.id}" value="${c.id}"
                   data-amount="${c.montant_total ?? 0}" checked>
            <label class="form-check-label d-block" for="cmd-${c.id}">
              <div class="d-flex justify-content-between align-items-center">
                <span class="badge me-1" style="background:${this.couleurStatut(c.statut)};color:#fff;font-size:.7rem;">${statLabel}</span>
                <strong style="font-size:.9rem;">${Number(c.montant_total ?? 0).toLocaleString('fr-FR')} FCFA</strong>
              </div>
              <div class="text-muted" style="font-size:.78rem;margin-top:2px;">${items}</div>
            </label>
          </div>`;
      }).join('');

      const total = commandes.reduce((s, c) => s + (c.montant_total ?? 0), 0);
      return `
        <div class="text-start">
          ${rows}
          <div class="d-flex justify-content-between fw-bold pt-1" style="font-size:.95rem;">
            <span>Total sélectionné</span>
            <span id="swal-grp-total" class="text-success">${Number(total).toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div class="form-check text-start mt-3">
            <input class="form-check-input" type="checkbox" id="swal-grp-liberer" checked>
            <label class="form-check-label" for="swal-grp-liberer">
              Libérer la <strong>Table ${tableNum}</strong> après paiement
            </label>
          </div>
        </div>`;
    };

    const updateTotal = () => {
      let t = 0;
      (document.querySelectorAll('.cmd-check') as NodeListOf<HTMLInputElement>)
        .forEach(cb => { if (cb.checked) t += parseFloat(cb.dataset['amount'] ?? '0'); });
      const el = document.getElementById('swal-grp-total');
      if (el) el.textContent = `${Number(t).toLocaleString('fr-FR')} FCFA`;
    };

    const { value: result, isConfirmed } = await Swal.fire({
      title: `Table ${tableNum} — Paiement`,
      html: buildHtml(),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-cash-coin me-1"></i> Encaisser',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#198754',
      didOpen: () => {
        document.querySelectorAll('.cmd-check').forEach(cb =>
          cb.addEventListener('change', updateTotal)
        );
      },
      preConfirm: () => {
        const ids = Array.from(document.querySelectorAll('.cmd-check:checked') as NodeListOf<HTMLInputElement>)
          .map(cb => +cb.value);
        if (!ids.length) { Swal.showValidationMessage('Sélectionnez au moins une commande'); return false; }
        const liberer = (document.getElementById('swal-grp-liberer') as HTMLInputElement)?.checked ?? false;
        return { ids, liberer };
      },
    });

    if (!isConfirmed || !result) return;

    this.commandeService.encaisserBatch(result.ids, result.liberer).subscribe({
      next: () => {
        const msg = result.liberer ? `Table ${tableNum} libérée.` : `${result.ids.length} commande(s) payée(s).`;
        Swal.fire({ icon: 'success', title: 'Encaissé !', text: msg, timer: 2000, showConfirmButton: false });
        this.loadCommandes();
      },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur'),
    });
  }

  statutInfo(v: string) { return this.STATUTS.find(s => s.value === v) ?? { label: v, css: 'secondary' }; }

  get totalEnCours(): number  { return this.commandes.filter(c => c.statut === 'en_cours').length; }
  get totalEnAttente(): number { return this.commandes.filter(c => c.statut === 'en_attente').length; }
  get totalPayees(): number   { return this.commandes.filter(c => c.statut === 'payee').length; }
  get caJour(): number        { return this.commandes.filter(c => c.statut === 'payee').reduce((s, c) => s + (c.montant_total ?? 0), 0); }

  loadAppelsServeur(): void {
    if (!this.selectedBoutiqueId) return;
    this.tableService.getAll(this.selectedBoutiqueId).subscribe({
      next: (r: any) => {
        this.appelsServeur = (r?.data ?? []).filter((t: any) => t.appel_serveur);
      }
    });
  }

  acquitterAppel(tableId: number): void {
    this.tableService.acquitterAppel(tableId).subscribe({
      next: () => { this.appelsServeur = this.appelsServeur.filter(t => t.id !== tableId); },
      error: () => {}
    });
  }

  swimlaneOpen: Record<string, boolean> = {
    en_attente: true,
    en_cours:   true,
    prete:      true,
    servie:     false,
    payee:      false,
  };

  toggleSwimlane(statut: string): void {
    this.swimlaneOpen[statut] = !this.swimlaneOpen[statut];
  }

  readonly COLONNES_KANBAN = [
    { statut: 'en_attente', label: 'Nouvelles',                  icon: 'bi-clock-history',  css: 'secondary' },
    { statut: 'en_cours',   label: 'En cuisine',                 icon: 'bi-fire',           css: 'warning'   },
    { statut: 'prete',      label: 'Prête à servir',             icon: 'bi-bell',           css: 'info'      },
    { statut: 'servie',     label: 'Servie – En attente paiement', icon: 'bi-person-check', css: 'primary'   },
    { statut: 'payee',      label: 'Payée',                      icon: 'bi-check-circle',   css: 'success'   },
  ];

  commandesParStatut(statut: string): any[] {
    return this.commandes.filter(c => c.statut === statut);
  }

  tempsEcoule(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1)  return '< 1 min';
    if (diff < 60) return `${diff} min`;
    return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? String(diff % 60).padStart(2, '0') : ''}`;
  }

  urgence(dateStr: string): boolean {
    // Rouge si > 20 min en cuisine ou > 10 min prête non servie
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000) > 20;
  }

  async avancerStatut(commande: any): Promise<void> {
    const prochains = this.FLUX[commande.statut] ?? [];
    if (!prochains.length) return;
    // Si un seul statut suivant, avancer directement sans confirmation
    const prochain = prochains.find(s => s !== 'annulee') ?? prochains[0];
    if (prochain === 'payee' || prochain === 'recu_total') {
      await this.encaisser(commande.id);
      return;
    }
    this.commandeService.changerStatut(commande.id, prochain).subscribe({
      next: () => { this.loadCommandes(); },
      error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur')
    });
  }

  labelProchainStatut(statut: string): string {
    const prochain = (this.FLUX[statut] ?? []).find(s => s !== 'annulee');
    return this.STATUTS.find(s => s.value === prochain)?.label ?? '';
  }

  get isAdmin(): boolean {
    const c = this.currentUser?.profil?.code?.toLowerCase();
    return c === 'admin' || c === 'responsable_structure';
  }

  get isMobileView(): boolean {
    const c = this.currentUser?.profil?.code?.toLowerCase();
    return c === 'serveur' || c === 'cuisiner';
  }

  readonly STATUTS_MOBILE = [
    { value: null,         label: 'Tout',     couleur: '#6c757d' },
    { value: 'en_attente', label: 'Nouvelles', couleur: '#6c757d' },
    { value: 'en_cours',   label: 'Cuisine',   couleur: '#e85d04' },
    { value: 'prete',      label: 'Prêtes',    couleur: '#0ea5e9' },
    { value: 'servie',     label: 'Déjà servies', couleur: '#7c3aed' },
    { value: 'payee',      label: 'Payées',    couleur: '#22c55e' },
  ];

  couleurStatut(statut: string): string {
    const map: Record<string, string> = {
      en_attente: '#6c757d',
      en_cours:   '#e85d04',
      prete:      '#0ea5e9',
      servie:     '#7c3aed',
      payee:      '#22c55e',
      annulee:    '#dc3545',
    };
    return map[statut] ?? '#6c757d';
  }

  labelBoutonAction(statut: string): string {
    const labels: Record<string, string> = {
      en_attente: 'Prendre en charge',
      en_cours:   'Marquer Prête',
      prete:      'Servir',
      servie:     'Encaisser',
    };
    return labels[statut] ?? '';
  }

  iconeBoutonAction(statut: string): string {
    const icons: Record<string, string> = {
      en_attente: 'bi-fire',
      en_cours:   'bi-bell',
      prete:      'bi-person-check',
      servie:     'bi-cash-coin',
    };
    return icons[statut] ?? 'bi-arrow-right';
  }

  countParStatut(statut: string | null): number {
    if (!statut) return this.commandes.filter(c => c.statut !== 'annulee' && c.statut !== 'payee').length;
    return this.commandes.filter(c => c.statut === statut).length;
  }

  get commandesFiltreesM(): any[] {
    const ordre: Record<string, number> = { en_attente: 0, en_cours: 1, prete: 2, servie: 3, payee: 4, annulee: 5 };
    const filtered = this.selectedStatut
      ? this.commandes.filter(c => c.statut === this.selectedStatut)
      : this.commandes.filter(c => c.statut !== 'annulee' && c.statut !== 'payee');
    return [...filtered].sort((a, b) => {
      const diff = (ordre[a.statut] ?? 9) - (ordre[b.statut] ?? 9);
      if (diff !== 0) return diff;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  get commandesGroupeesParTable(): { key: string; tableId: number | null; label: string; commandes: any[]; total: number }[] {
    const grouped = new Map<string, { key: string; tableId: number | null; label: string; commandes: any[] }>();
    for (const cmd of this.commandesFiltreesM) {
      const key = cmd.table ? `t_${cmd.table.id}` : `nt_${cmd.id}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          tableId: cmd.table?.id ?? null,
          label: cmd.table
            ? `Table ${cmd.table.numero}${cmd.table.nom ? ' · ' + cmd.table.nom : ''}`
            : 'Sans table',
          commandes: [],
        });
      }
      grouped.get(key)!.commandes.push(cmd);
    }
    return [...grouped.values()].map(g => ({
      ...g,
      total: g.commandes.reduce((s, c) => s + (c.montant_total ?? 0), 0),
    }));
  }

  async actionPrimaire(cmd: any): Promise<void> {
    if (cmd.statut === 'servie') {
      await this.encaisser(cmd.id);
    } else {
      await this.avancerStatut(cmd);
    }
  }

  readonly CATS_BOISSONS = ['Boissons', 'Alcools', 'Cocktails'];

  typeCommande(cmd: any): 'bar' | 'cuisine' | 'mixte' {
    const lignes = cmd.lignes ?? [];
    if (!lignes.length) return 'cuisine';
    const isB = (l: any) => this.CATS_BOISSONS.includes(l.recette?.categorie ?? '');
    if (lignes.every(isB)) return 'bar';
    if (lignes.every((l: any) => !isB(l))) return 'cuisine';
    return 'mixte';
  }
}
