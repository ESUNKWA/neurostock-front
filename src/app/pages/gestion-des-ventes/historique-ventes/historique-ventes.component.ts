import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { VentesService } from '../../../services/gestion-des-ventes/ventes.service';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import Swal from 'sweetalert2';
import { NzSelectModule } from 'ng-zorro-antd/select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-historique-ventes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, NzSelectModule],
  templateUrl: './historique-ventes.component.html',
  styleUrl: './historique-ventes.component.scss',
  providers: [ToastrService]
})
export default class HistoriqueVentesComponent implements OnInit, OnDestroy {
  ventes: any[] = [];
  currentUser: any;
  idBoutique: number = 0;
  boutiques: any[] = [];
  isLoading: boolean = false;
  dateDebut: string = '';
  dateFin: string = '';
  loadingDetails = false;
  printingA4 = false;
  printingThermique = false;
  detailsVente: any[] = [];
  vente: any = {};
  facture: any = { vente: {}, details: [] };

  // ── Régularisation ────────────────────────────────────────────────────────
  showRegularModal = false;
  regularVente: any = null;
  regularSubmitting = false;
  regularForm = { mode_paiement: 'espece', montant_recu: 0 };
  regularDetailsPaiement: Record<string, number> = { espece: 0, orange_money: 0, wave: 0, mtn_money: 0, moov_money: 0, dajmo: 0, carte: 0 };

  readonly MODES_PAIEMENT = [
    { value: 'espece',       label: 'Espèces',      icon: 'bi-cash' },
    { value: 'orange_money', label: 'Orange Money', icon: 'bi-phone' },
    { value: 'wave',         label: 'Wave',         icon: 'bi-phone' },
    { value: 'mtn_money',    label: 'MTN Money',    icon: 'bi-phone' },
    { value: 'moov_money',   label: 'Moov Money',   icon: 'bi-phone' },
    { value: 'dajmo',        label: 'Dajmo',        icon: 'bi-phone' },
    { value: 'carte',        label: 'Carte',        icon: 'bi-credit-card' },
    { value: 'mixte',        label: 'Mixte',        icon: 'bi-layers' },
  ];
  
  constructor(
    private ventesService: VentesService,
    private authService: AuthService,
    private boutiqueService: BoutiqueService,
    private toastr: ToastrService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: any
  ) {}

  ngOnInit(): void {
    this.initDateRange();
    this.getCurrentUser();
    this.loadBoutiques();
    this.loadVentes();
    
    // Configurer les tooltips pour qu'ils se réinitialisent correctement
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip({
          trigger: 'hover'
        });
      }, 500);
    }
  }

   ngAfterViewInit() {
    // Initialisation de Select2
    ($('#mySelect') as any).select2({
      placeholder: 'Sélectionnez une boutique',
      allowClear: true,
      width: 'resolve',
    });

    // Gérer les changements — on stocke juste l'id, la recherche se fait via le bouton
    ($('#mySelect') as any).on('change', () => {
      this.idBoutique = parseInt(($('#mySelect') as any).val()) || 0;
    });
  }

  ngOnDestroy(): void {
    // Nettoyage pour éviter les fuites mémoire
    ($('#mySelect') as any).select2('destroy');
    this.destroyDataTable();
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  private initDateRange(): void {
    const today = new Date();
    const debut = new Date();
    debut.setDate(today.getDate() - 30);
    this.dateFin   = today.toISOString().split('T')[0];
    this.dateDebut = debut.toISOString().split('T')[0];
  }

  onDateChange(): void {
    this.loadVentes();
  }

  loadBoutiques(): void {
    if (this.currentUser.is_admin === true) {
      this.boutiqueService.find().subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.data) {
            this.boutiques = response.data;
          }
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des boutiques:', error);
        }
      });
    }else{
      if (this.currentUser.profil.code.toLowerCase() === 'responsable_structure') {
        this.boutiqueService.findByStructure(this.currentUser.structure_id).subscribe({
          next: (response: any) => {
            if (response.status === 'success' && response.data) {
              this.boutiques = response.data;
            }
          },
          error: (error: any) => {
            console.error('Erreur lors du chargement des boutiques:', error);
          }
        });
      } else {
        this.boutiques[0] = this.currentUser.boutique;
      }
    }
  }

  /* onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.idBoutique = parseInt(selectElement.value);
    this.loadVentes();
  } */

  /**
   * Recharge les données et rafraîchit le tableau
   */
  loadVentes(): void {
    this.isLoading = true;
    
    const code = this.currentUser.profil.code.toLowerCase();
    if (code === 'admin' || code === 'gerant' || code === 'responsable_structure') {
      if (!this.idBoutique) {
        this.ventes = [];
        this.isLoading = false;
        return;
      }
    } else {
      this.idBoutique = this.currentUser.boutique_id;
    }
    
    const body: any = {
      boutique: this.idBoutique,
      ...(this.dateDebut && { date_debut: this.dateDebut }),
      ...(this.dateFin   && { date_fin:   this.dateFin }),
    };

    this.ventesService.getAllVentes(body).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.ventes = response.data;
          this.venteDetails = {};
          this.ventes.forEach(v => this.loadVenteDetailMobile(v.id));
          this.destroyDataTable();

          // Donner le temps au DOM de se mettre à jour
          setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) {
              try {
                // Réinitialiser le tableau avec les nouvelles données
                this.initDataTable();
              } catch (error) {
                console.error('Erreur lors de la réinitialisation de DataTable:', error);
              }
              this.isLoading = false;
            }
          }, 50); // Temps d'attente réduit pour une mise à jour plus rapide
        } else {
          this.isLoading = false;
          this.toastr.error('Erreur lors du chargement des ventes');
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des ventes');
        console.error(error);
      }
    });
  }

  /**
   * Détruit l'instance DataTable existante
   */
  private destroyDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const table = $('.js-dataTable-buttons');
        if ($.fn.DataTable.isDataTable(table)) {
          table.DataTable().destroy();
          // Ne pas vider la table pour conserver les en-têtes
        }
      } catch (error) {
        console.error('Erreur lors de la destruction de DataTable:', error);
      }
    }
  }

  /**
   * Initialise une instance DataTable
   */
  private initDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        $('.js-dataTable-buttons').DataTable({
          data: this.ventes,
          columns: [
            { 
              data: 'reference',
              render: (data: any) => `<span class="fw-semibold">${data || ''}</span>` 
            },
            { 
              data: 'montant_total_apres_remise',
              render: (data: any) => `${data.toLocaleString()} FCFA` 
            },
            {
              data: 'statut',
              render: (data: any) => {
                let badgeClass = '';
                switch(data.toLowerCase()) {
                  case 'payer':
                    badgeClass = 'bg-success';
                    break;
                  case 'non_payer':
                    badgeClass = 'bg-danger';
                    break;
                  default:
                    badgeClass = 'bg-secondary';
                }
                return `<span class="badge ${badgeClass}">${data}</span>`;
              }
            },
            { 
              data: 'created_at',
              render: (data: any) => {
                if (!data) return '';
                const date = new Date(data);
                return `${date.getDate().toString().padStart(2, '0')}/` +
                      `${(date.getMonth() + 1).toString().padStart(2, '0')}/` +
                      `${date.getFullYear()} ` +
                      ` à ${date.getHours().toString().padStart(2, '0')}:` +
                      `${date.getMinutes().toString().padStart(2, '0')}:` +
                      `${date.getSeconds().toString().padStart(2, '0')}`;

              }
            },
            { 
              data: null,
              className: 'text-center',
              width: '15%',
              orderable: false,
              render: (data: any, type: any, row: any) => {
                const isNonPaye = row.statut?.toLowerCase() === 'non_payer';
                const regularBtn = isNonPaye
                  ? `<button type="button" class="btn btn-sm btn-success me-2" data-bs-toggle="tooltip"
                        title="Régulariser le paiement" data-action="regulariser" data-id="${row.id}">
                       <i class="bi bi-cash-coin"></i>
                     </button>`
                  : '';
                return `
                  <div class="btn-group flex-wrap">
                    ${regularBtn}
                    <button type="button" class="btn btn-sm btn-info me-2" data-bs-toggle="tooltip" title="Visualiser" data-action="view" data-id="${row.id}">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-warning me-2" data-bs-toggle="tooltip" title="Imprimer" data-action="print" data-id="${row.id}">
                      <i class="bi bi-printer"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary me-2" data-bs-toggle="tooltip" title="Modifier" data-action="edit" data-id="${row.id}">
                      <i class="bi bi-pencil-square"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" data-bs-toggle="tooltip" title="Supprimer" data-action="delete" data-id="${row.id}">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                `;
              }
            }
          ],
          language: {
            emptyTable: 'Aucune vente trouvée',
            search: 'Rechercher :',
            info: 'Affichage de _START_ à _END_ sur _TOTAL_ résultat(s)',
            infoEmpty: 'Aucun résultat',
            zeroRecords: 'Aucun résultat',
            lengthMenu: 'Afficher _MENU_ éléments',
            paginate: { first: '«', last: '»', next: '›', previous: '‹' },
          },
          dom: '<"row mb-2"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>><"row"<"col-sm-12"tr>><"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
          buttons: [
            {
              extend: 'excel',
              text: '<i class="bi bi-file-earmark-excel"></i> Excel',
              className: 'btn btn-success btn-sm me-1',
              exportOptions: {
                columns: [0, 1, 2, 3, 4, 5] // Exporter toutes les colonnes sauf Actions
              }
            },
            {
              extend: 'pdf',
              text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
              className: 'btn btn-danger btn-sm',
              exportOptions: {
                columns: [0, 1, 2, 3, 4, 5] // Exporter toutes les colonnes sauf Actions
              }
            }
          ],
          pageLength: 20,
          searching: true,
          info: true,
          responsive: true,
          ordering: true,
          pagingType: 'full_numbers',
          stateSave: false,
          retrieve: false,
          autoWidth: false,
          drawCallback: () => {
            $('[data-bs-toggle="tooltip"]').tooltip();
          },
          createdRow: (row: any, data: any, dataIndex: any) => {
            $(row).find('[data-action]').on('click', (e: any) => {
              const button = $(e.currentTarget);
              const action = button.data('action');
              const id = button.data('id');
              const vente = this.ventes.find((v: any) => v.id === id);
              
              if (!vente) return;
              
              switch (action) {
                case 'regulariser':
                  this.openRegularModal(vente);
                  break;
                case 'view':
                  this.viewDetails(vente);
                  break;
                case 'print':
                  this.printVente(vente);
                  break;
                case 'edit':
                  this.editVente(vente);
                  break;
                case 'delete':
                  this.deleteVente(vente);
                  break;
              }
            });
          }
        });
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de DataTable:', error);
      }
    }
  }

  getDetailsVente(id: any) {
    this.loadingDetails = true;
    this.ventesService.getDetailVente(id).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.detailsVente = response.data.detail_vente ?? [];
          this.vente.detail_vente = this.detailsVente;
          this.facture = this.vente;
        }
        this.loadingDetails = false;
      },
      error: () => { this.loadingDetails = false; }
    });
  }

  viewDetails(vente: any): void {
    this.vente = vente;
    this.detailsVente = [];
    this.getDetailsVente(vente.id);

    const modal = document.getElementById('modal-view-details');
    if (modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal) ?? new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  editVente(vente: any): void {
    this.isLoading = true;
    this.ventesService.getDetailVente(vente.id).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          // Stocker temporairement les données de la vente dans le localStorage
          // Cela permet de les récupérer après redirection
          localStorage.setItem('editVenteData', JSON.stringify({
            id: vente.id,
            vente: response.data
          }));
          
          // Rediriger vers la page de vente pour modification
          this.router.navigate(['/gestion-des-ventes/vente']);
        } else {
          this.toastr.error('Erreur lors de la récupération des données de la vente');
        }
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de la récupération des détails de la vente:', error);
        this.toastr.error('Erreur lors de la récupération des données de la vente');
        this.isLoading = false;
      }
    });
  }

  deleteVente(vente: any): void {
    Swal.fire({
      text: `Voulez-vous vraiment supprimer la vente "${vente.reference}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        this.ventesService.deleteVente(vente.id).subscribe({
          next: () => {
            this.toastr.success('Vente supprimée avec succès');
            this.loadVentes();
          },
          error: (err: any) => {
            console.error('Erreur lors de la suppression:', err);
            this.toastr.error('Erreur lors de la suppression de la vente');
            this.isLoading = false;
          }
        });
      }
    });
  }

  printVente(vente: any) {
    this.printingA4 = true;
    this.ventesService.imprimerRecu(vente.id).subscribe({
      next: (facture: any) => {
        this.printingA4 = false;
        if (facture?.path) window.open(facture.path, '_blank');
      },
      error: () => { this.printingA4 = false; }
    });
  }

  printVenteThermique(vente: any) {
    this.printingThermique = true;
    this.ventesService.imprimerThermique(vente.id).subscribe({
      next: (facture: any) => {
        this.printingThermique = false;
        if (facture?.path) window.open(facture.path, '_blank');
      },
      error: () => { this.printingThermique = false; }
    });
  }

  // ── Vue mobile : détails inline ──────────────────────────────────────────
  venteDetails: Record<number, any[]> = {};
  venteDetailLoading: Record<number, boolean> = {};

  get totalVentesMobile(): number {
    return this.ventes.reduce((s, v) => s + (v.montant_total_apres_remise ?? v.montant_total ?? 0), 0);
  }

  loadVenteDetailMobile(id: number): void {
    if (this.venteDetails[id]) return;
    this.venteDetailLoading[id] = true;
    this.ventesService.getDetailVente(id)
      .pipe(finalize(() => (this.venteDetailLoading[id] = false)))
      .subscribe({
        next: (r: any) => {
          const data = r?.data ?? r;
          this.venteDetails[id] = data?.detail_vente ?? data?.lignes ?? [];
        },
      });
  }

  modeLabel(mode: string): string {
    const map: Record<string, string> = {
      espece: 'Espèces', carte: 'Carte', orange_money: 'Orange Money',
      wave: 'Wave', mtn_money: 'MTN', moov_money: 'Moov', dajmo: 'Dajmo',
      credit: 'Crédit', mixte: 'Mixte',
    };
    return map[mode] ?? mode ?? '—';
  }

  // ── Régularisation ────────────────────────────────────────────────────────

  openRegularModal(vente: any): void {
    this.regularVente = vente;
    this.regularForm = {
      mode_paiement: 'espece',
      montant_recu: vente.montant_total_apres_remise ?? 0,
    };
    this.regularDetailsPaiement = { espece: 0, orange_money: 0, wave: 0, mtn_money: 0, moov_money: 0, dajmo: 0, carte: 0 };
    this.showRegularModal = true;
  }

  get regularMontantMixte(): number {
    return Object.values(this.regularDetailsPaiement).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
  }

  submitRegularisation(): void {
    if (!this.regularVente) return;
    const isMixte = this.regularForm.mode_paiement === 'mixte';
    const montant = isMixte ? this.regularMontantMixte : this.regularForm.montant_recu;
    const body = {
      mode_paiement: this.regularForm.mode_paiement,
      montant_recu: montant,
      details_paiement: isMixte ? { ...this.regularDetailsPaiement } : null,
    };
    this.regularSubmitting = true;
    this.ventesService.regulariser(this.regularVente.id, body)
      .pipe(finalize(() => (this.regularSubmitting = false)))
      .subscribe({
        next: () => {
          this.toastr.success('Vente régularisée avec succès');
          this.showRegularModal = false;
          this.loadVentes();
        },
        error: (e: any) => this.toastr.error(e?.error?.message || 'Erreur lors de la régularisation'),
      });
  }
}
