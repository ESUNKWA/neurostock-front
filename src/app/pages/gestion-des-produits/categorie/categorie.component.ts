import { Component, Inject, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategorieService } from '../../../services/gestion-des-produits/categorie.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { isPlatformBrowser } from '@angular/common';
import { first } from 'rxjs';
import Swal, { SweetAlertResult } from 'sweetalert2';
import { AuthService } from '../../../services/auth/auth.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { parseFileToRows, FilePreview, downloadXlsxTemplate } from '../../../helpers/file-import-preview';
import { NzSelectModule } from 'ng-zorro-antd/select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-categorie',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, NzSelectModule],
  templateUrl: './categorie.component.html',
  styleUrl: './categorie.component.scss',
  providers: [ToastrService]
})
export default class CategorieComponent implements OnInit, OnDestroy {
  categories: any = [];
  boutiques: any[] = [];
  selectedBoutiqueId: string | null = null;
  importBoutiqueId: number | null = null;
  private dtTimer: any = null;
  isLoading: boolean = false;
  isEditMode: boolean = false;
  selectedCategorie: any = null;
  mobileDetailItem: any = null;
  titleModal: string = 'AJOUTER UNE CATEGORIE';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';
  categorieForm: FormGroup;
  isSubmitted: boolean = false;
  isImporting: boolean = false;
  isParsingFile: boolean = false;
  importPreview: FilePreview | null = null;
  pendingImportFile: File | null = null;
  importResult: { created: number; skipped: number; errors: string[] } | null = null;

  // Transfer state
  transferTargetIds: number[] = [];
  isTransferring = false;
  transferResult: { created: number; alreadyExists: number } | null = null;
  transferBoutiquesDisponibles: any[] = [];

  currentUser: any;
  authService = inject(AuthService);

  constructor(
    private fb: FormBuilder,
    private categorieService: CategorieService,
    private boutiqueService: BoutiqueService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.categorieForm = this.fb.group({
      nom: ['', [Validators.required]],
      description: ['', []]
    });
  }

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadBoutiques();

    // Configurer les tooltips pour qu'ils se réinitialisent correctement
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip({
          trigger: 'hover'
        });
      }, 500);
    }
  }

  getCurrentUser() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
    });
  }

  /** Boutiques de type entrepôt uniquement. */
  get entrepots(): any[] {
    const list = this.boutiques.filter(b => (b.type ?? '').toLowerCase().trim() === 'entrepot');
    return list.length ? list : this.boutiques;
  }

  private selectEntrepot(): void {
    const e = this.boutiques.find(b => (b.type ?? '').toLowerCase().trim() === 'entrepot');
    const target = e ?? this.boutiques[0];
    if (target) {
      this.selectedBoutiqueId = String(target.id);
      this.loadCategories();
    }
  }

  loadBoutiques(): void {
    this.authService.currentUser$.pipe(first()).subscribe((user: any) => {
      if (!user) return;
      if (user.is_admin) {
        this.boutiqueService.find().subscribe({
          next: (r: any) => {
            this.boutiques = r?.data ?? [];
            this.selectEntrepot();
          }
        });
      } else if (user.profil?.code === 'responsable_structure') {
        const structureId = user.structure_id ?? user.structure?.[0]?.id;
        this.boutiqueService.findByStructure(structureId).subscribe({
          next: (r: any) => {
            this.boutiques = r?.data ?? [];
            this.selectEntrepot();
          }
        });
      } else {
        this.boutiques = user.boutique ? [user.boutique] : [];
        this.selectEntrepot();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.categorieForm.controls; }

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
          data: this.categories,
          columns: [
            { 
              data: 'nom',
              render: (data: any) => `<span class="fw-semibold">${data || ''}</span>` 
            },
            { 
              data: 'description',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data || 'Non définie' 
            },
            { 
              data: 'created_at',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => {
                if (!data) return '';
                const date = new Date(data);
                return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
              }
            },
            { 
              data: null,
              className: 'text-center',
              width: '15%',
              orderable: false,
              render: (data: any, type: any, row: any) => {
                return `<div class="cat-actions">
                  <button class="cat-act-btn cat-act-blue" title="Visualiser" data-action="view" data-id="${row.id}"><i class="bi bi-eye"></i></button>
                  <button class="cat-act-btn cat-act-slate" title="Modifier" data-action="edit" data-id="${row.id}"><i class="bi bi-pencil"></i></button>
                  <button class="cat-act-btn cat-act-red" title="Supprimer" data-action="delete" data-id="${row.id}"><i class="bi bi-trash"></i></button>
                </div>`;
              }
            }
          ],
          language: {
            emptyTable: 'Aucune catégorie trouvée',
            search: '',
            searchPlaceholder: 'Rechercher une catégorie…',
            info: '_START_–_END_ sur _TOTAL_',
            infoEmpty: 'Aucun résultat',
            zeroRecords: 'Aucun résultat',
            lengthMenu: 'Afficher _MENU_ éléments',
            paginate: { first: '«', last: '»', next: '›', previous: '‹' },
          },
          dom: '<"cat-dt-top"<"cat-dt-exports"B>f>t<"cat-dt-bottom"ip>',
          buttons: [
            {
              extend: 'excel',
              text: '<i class="bi bi-file-earmark-excel"></i> Excel',
              className: 'cat-export-btn cat-export-excel',
              exportOptions: { columns: [0, 1, 2] }
            },
            {
              extend: 'pdf',
              text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
              className: 'cat-export-btn cat-export-pdf',
              exportOptions: { columns: [0, 1, 2] }
            }
          ],
          pageLength: 10,
          searching: true,
          info: true,
          responsive: true,
          ordering: true,
          pagingType: 'simple_numbers',
          stateSave: false,
          retrieve: false,
          autoWidth: false,
          drawCallback: () => {},
          createdRow: (row: any, data: any, dataIndex: any) => {
            $(row).find('[data-action]').on('click', (e: any) => {
              const button = $(e.currentTarget);
              const action = button.data('action');
              const id = button.data('id');
              const categorie = this.categories.find((c: any) => c.id === id);
              
              if (!categorie) return;
              
              switch (action) {
                case 'view':
                  this.openViewCategorie(categorie);
                  break;
                case 'edit':
                  this.openEditCategorie(categorie);
                  break;
                case 'delete':
                  this.deleteCategorie(categorie);
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

  onBoutiqueChange(value: any): void {
    this.selectedBoutiqueId = value || null;
    this.loadCategories();
  }

  /**
   * Recharge les données et rafraîchit le tableau
   */
  loadCategories(): void {
    this.isLoading = true;
    const boutiqueId = this.selectedBoutiqueId ?? this.currentUser?.boutique_id;
    this.categorieService.getCategoriesByBoutik(boutiqueId).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          // Mise à jour des données
          this.categories = response.data;
          
          this.destroyDataTable();
          clearTimeout(this.dtTimer);
          this.dtTimer = setTimeout(() => {
            if (isPlatformBrowser(this.platformId)) {
              try {
                this.initDataTable();
              } catch (error) {
                console.error('Erreur lors de la réinitialisation de DataTable:', error);
              }
              this.isLoading = false;
            }
          }, 50);
        } else {
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des catégories');
      }
    });
  }

  /**
   * Rafraîchit uniquement le tableau sans recharger les données
   */
  refreshDataTable(): void {
    this.destroyDataTable();
    this.initDataTable();
  }

  openNewModal(): void {
    this.isEditMode = false;
    this.selectedCategorie = null;
    const title = 'Ajouter une catégorie';
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.categorieForm.reset();
    this.isSubmitted = false;

    // Activer les champs du formulaire
    this.categorieForm.get('nom')?.enable();
    this.categorieForm.get('description')?.enable();
  }

  openViewCategorie(categorie: any): void {
    this.selectedCategorie = categorie;
    const title = `Visualiser la catégorie [${categorie?.nom}]`;
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Fermer';
    this.icon = 'ri ri-close-circle-line';
    this.categorieForm.reset();
    this.isSubmitted = false;

    // Remplir le formulaire en lecture seule
    this.categorieForm.patchValue({
      nom: categorie.nom,
      description: categorie.description || ''
    });

    // Désactiver les champs du formulaire
    this.categorieForm.get('nom')?.disable();
    this.categorieForm.get('description')?.disable();

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  openEditCategorie(categorie: any): void {
    this.isEditMode = !!categorie;
    this.selectedCategorie = categorie || null;
    this.buttonText = this.isEditMode ? 'Modifier' : 'Enregistrer';
    this.icon = this.isEditMode ? 'bi bi-pencil-square' : 'ri ri-save-3-line';
    const title = `Modifier la catégorie [${categorie?.nom}]`;
    const defaultTitle = 'Ajouter une catégorie';
    this.titleModal = this.isEditMode ? title.toUpperCase() : defaultTitle.toUpperCase();

    // Activer les champs du formulaire
    this.categorieForm.get('nom')?.enable();
    this.categorieForm.get('description')?.enable();

    if (this.isEditMode && categorie) {
      // Remplir le formulaire avec les données de la catégorie
      this.categorieForm.patchValue({
        nom: categorie.nom,
        description: categorie.description || ''
      });
    } else {
      // Réinitialiser le formulaire pour une nouvelle catégorie
      this.categorieForm.reset();
    }

    this.isSubmitted = false;

    // Ouvrir le modal
    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  saveOrUpdateCategorie(): void {
    this.isSubmitted = true;

    // arrêter ici si le formulaire est invalide
    if (this.categorieForm.invalid) {
      return;
    }

    let request;
    this.categorieForm.value.boutique = this.selectedBoutiqueId ?? this.currentUser.boutique_id;
    const categorie = this.categorieForm.value;
    if (this.isEditMode && this.selectedCategorie) {
      // Mode modification
      request = this.categorieService.updateCategorie(this.selectedCategorie.id, categorie);
    } else {
      // Mode création
      request = this.categorieService.createCategorie(categorie);
    }

    // Afficher l'indicateur de chargement sans masquer le tableau
    this.isLoading = true;

    request.pipe(first()).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          // Fermer le modal
          const modal = document.getElementById('modal-fadein');
          if (modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
              modalInstance.hide();
            } 
          }

          this.toastr.success(this.isEditMode ? 
            'Catégorie modifiée avec succès' : 
            'Catégorie ajoutée avec succès');

          // Recharger les données sans détruire complètement le tableau
          this.loadCategories();

          // Réinitialiser le formulaire et les états
          this.categorieForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.selectedCategorie = null;
        } else {
          this.isLoading = false;
          this.toastr.error('Une erreur est survenue lors de la sauvegarde');
        }
      },
      error: (error: any) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.toastr.error('Une erreur est survenue lors de la sauvegarde');
        this.isLoading = false;
      }
    });
  }

  async onImportFileSelected(event: any): Promise<void> {
    const file: File = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    this.importResult = null;
    this.pendingImportFile = file;
    this.importBoutiqueId = this.selectedBoutiqueId ? Number(this.selectedBoutiqueId) : (this.currentUser?.boutique_id ?? null);
    this.isParsingFile = true;

    try {
      this.importPreview = await parseFileToRows(file);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      this.toastr.error('Impossible de lire ce fichier. Vérifiez le format (.csv, .xlsx, .xls).');
      this.pendingImportFile = null;
      this.isParsingFile = false;
      return;
    }

    this.isParsingFile = false;

    const modal = document.getElementById('modal-import-preview');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  confirmImport(): void {
    if (!this.pendingImportFile) return;
    if (!this.importBoutiqueId) {
      this.toastr.error('Veuillez sélectionner une boutique avant d\'importer.');
      return;
    }

    this.isImporting = true;
    this.categorieService.importCategories(this.pendingImportFile, this.importBoutiqueId).pipe(first()).subscribe({
      next: (response: any) => {
        this.isImporting = false;
        this.importResult = {
          created: response?.created ?? 0,
          skipped: response?.skipped ?? 0,
          errors: response?.errors ?? []
        };
        this.toastr.success(`Import terminé : ${this.importResult.created} créé(s), ${this.importResult.skipped} ignoré(s).`);
        this.loadCategories();
      },
      error: (err: any) => {
        this.isImporting = false;
        this.toastr.error(err?.error?.message || 'Erreur lors de l\'import des catégories.');
      }
    });
  }

  downloadTemplate(): void {
    downloadXlsxTemplate(
      ['nom', 'description'],
      [
        { nom: 'Électronique', description: 'Appareils et accessoires électroniques' },
        { nom: 'Alimentation', description: '' }
      ],
      'modele_categories.xlsx'
    );
  }

  cancelImport(): void {
    this.pendingImportFile = null;
    this.importPreview = null;
    this.importResult = null;
    this.importBoutiqueId = null;
    const modal = document.getElementById('modal-import-preview');
    if (modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
  }

  openTransferModal(): void {
    const sourceId = +(this.selectedBoutiqueId ?? this.currentUser?.boutique_id ?? 0);
    this.transferBoutiquesDisponibles = this.boutiques.filter(b => b.id !== sourceId);
    this.transferTargetIds = [];
    this.transferResult = null;
    const modal = document.getElementById('modal-transfer');
    if (modal) new bootstrap.Modal(modal).show();
  }

  toggleTransferTarget(id: number): void {
    const idx = this.transferTargetIds.indexOf(id);
    if (idx >= 0) this.transferTargetIds.splice(idx, 1);
    else this.transferTargetIds.push(id);
  }

  selectAllTransferTargets(): void {
    this.transferTargetIds = this.transferBoutiquesDisponibles.map(b => b.id);
  }

  confirmTransfer(): void {
    const sourceId = +(this.selectedBoutiqueId ?? this.currentUser?.boutique_id ?? 0);
    if (!sourceId || !this.transferTargetIds.length) return;
    this.isTransferring = true;
    this.categorieService.copierCategories(sourceId, this.transferTargetIds).pipe(first()).subscribe({
      next: (r: any) => {
        this.isTransferring = false;
        this.transferResult = r.data;
        this.toastr.success(`${r.data?.created ?? 0} catégorie(s) copiée(s) avec succès`);
      },
      error: (err: any) => {
        this.isTransferring = false;
        this.toastr.error(err?.error?.message || 'Erreur lors du transfert');
      }
    });
  }

  deleteCategorie(categorie: any): void {
    Swal.fire({
      text: `Voulez-vous vraiment supprimer la catégorie "${categorie.nom}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#5C636A',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result: SweetAlertResult) => {
      if (result.isConfirmed) {
        // Afficher l'indicateur de chargement sans masquer le tableau
        this.isLoading = true;
        
        this.categorieService.deleteCategorie(categorie.id).pipe(first()).subscribe({
          next: (response: any) => {
            if (response.affected === 1) {
              this.toastr.success('La catégorie a été supprimée avec succès.');
              // Recharger les données sans détruire complètement le tableau
              this.loadCategories();
            } else {
              this.toastr.error('La catégorie n\'a pas pu être supprimée.');
              this.isLoading = false;
            }
          },
          error: (error: any) => {
            console.error('Erreur lors de la suppression:', error);
            this.toastr.error('Une erreur est survenue lors de la suppression.');
            this.isLoading = false;
          }
        });
      }
    });
  }
}
