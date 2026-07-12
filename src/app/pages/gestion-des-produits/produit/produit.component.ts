import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { CategorieService } from '../../../services/gestion-des-produits/categorie.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { first } from 'rxjs';
import Swal, { SweetAlertResult } from 'sweetalert2';
import { AuthService } from '../../../services/auth/auth.service';
import { ThousandSeparatorDirective } from '../../../helpers/thousand-separator.directive';
import { parseFileToRows, FilePreview, downloadXlsxTemplate } from '../../../helpers/file-import-preview';
import { PrevisionService } from '../../../services/analyse-ia/prevision.service';
import { NzSelectModule } from 'ng-zorro-antd/select';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-produit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule, ThousandSeparatorDirective, NzSelectModule],
  templateUrl: './produit.component.html',
  styleUrl: './produit.component.scss'
})
export default class ProduitComponent implements OnInit, OnDestroy {
  produits: any[] = [];
  categories: any[] = [];
  boutiques: any[] = [];
  selectedBoutique: string = '';
  isLoading: boolean = false;
  isEditMode: boolean = false;
  selectedProduit: any = null;
  mobileDetailItem: any = null;
  titleModal: string = 'AJOUTER UN PRODUIT';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';
  produitForm: FormGroup;
  isSubmitted: boolean = false;
  selectedFile: File | null = null;
  previewImageUrl: string | null = null;
  isImporting: boolean = false;
  isParsingFile: boolean = false;
  importPreview: FilePreview | null = null;
  pendingImportFile: File | null = null;
  importResult: { created: number; skipped: number; errors: string[] } | null = null;
  importBoutiqueId: number | string | null = null;
  importCategorieId: number | null = null;
  currentUser: any;

  cataloguePdfLoading = false;

  // Sélection multiple
  selectedIds = new Set<number>();
  isDeletingMany = false;

  // Filtre par catégorie
  selectedCategoryFilter: number | null = null;
  selectedBoutiqueFilter: string | null = null;
  allProduits: any[] = [];

  get allSelected(): boolean {
    return this.produits.length > 0 && this.produits.every(p => this.selectedIds.has(p.id));
  }

  toggleAll(checked: boolean): void {
    if (checked) this.produits.forEach(p => this.selectedIds.add(p.id));
    else this.selectedIds.clear();
    // Synchronise visuellement toutes les cases du DataTable
    $('.row-check').prop('checked', checked);
  }

  toggleOne(id: number, checked: boolean): void {
    checked ? this.selectedIds.add(id) : this.selectedIds.delete(id);
  }

  // Prix suggéré IA
  produitPrixSuggere: any | null = null;
  prixSuggereData: any | null = null;
  prixSuggereError: string | null = null;
  isLoadingPrixSuggere = false;
  isAppliquerPrix = false;

  get margeActuelle(): number {
    if (!this.produitPrixSuggere) return 0;
    const { prix_achat, prix_vente } = this.produitPrixSuggere;
    if (!prix_achat) return 0;
    return Math.round(((prix_vente - prix_achat) / prix_achat) * 1000) / 10;
  }

  constructor(
    private fb: FormBuilder,
    private produitService: ProduitService,
    private categorieService: CategorieService,
    private boutiqueService: BoutiqueService,
    private authService: AuthService,
    private toastr: ToastrService,
    private previsionService: PrevisionService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.produitForm = this.fb.group({
      nom: ['', Validators.required],
      prix_achat: ['', [Validators.required, Validators.min(0)]],
      prix_vente: ['', [Validators.required, Validators.min(0)]],
      stock_initial: [0, [Validators.required, Validators.min(0)]],
      seuil_alert: [2, [Validators.required]],
      categorie: ['', Validators.required],
      boutique: ['', Validators.required],
      unite_mesure: ['pièce', Validators.required],
      code_barre: [null],
      image: [null]
    });
  }

  ngOnInit(): void {
    this.getCurrentUser();
    this.loadBoutiques();
    this.loadProduits();
    this.loadCategories();

    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip({
          trigger: 'hover'
        });
      }, 500);
    }           
  }

  onPrixChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input) return;

  const value = input.value.replace(/\s/g, '');
  const numericValue = Number(value);

  if (!isNaN(numericValue)) {
    this.produitForm.patchValue({
      prix_achat: numericValue
    }, { emitEvent: false });
  }
}


  getCurrentUser() {
    this.authService.currentUser$.subscribe((user: any) => {
      this.currentUser = user;
      // console.log('currentUser', this.currentUser);
    });
  }

  ngOnDestroy(): void {
    this.destroyDataTable();
  }

  get f() { return this.produitForm.controls; }

  private destroyDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        const table = $('.js-dataTable-buttons');
        if ($.fn.DataTable.isDataTable(table)) {
          table.DataTable().destroy();
        }
      } catch (error) {
        console.error('Erreur lors de la destruction de DataTable:', error);
      }
    }
  }

  private initDataTable(): void {
    if (isPlatformBrowser(this.platformId)) {
      try {
        
        $('.js-dataTable-buttons').DataTable({
          data: this.produits,
          columns: [
            {
              data: null,
              orderable: false,
              width: '2%',
              className: 'text-center',
              render: (_: any, __: any, row: any) =>
                `<input type="checkbox" class="form-check-input row-check" data-id="${row.id}" ${this.selectedIds.has(row.id) ? 'checked' : ''}>`,
            },
            {
              data: 'imageUrl',
              render: (data: any) => data ? `<img src="${data}" alt="Image produit" class="img-thumbnail" style="max-width: 50px;">` : 'Aucune image' 
            },
            { 
              data: 'nom',
              render: (data: any) => `<span class="fw-semibold">${data.toUpperCase() || ''}</span>` 
            },
            { 
              data: 'prix_achat',
              render: (data: any) => `${data} FCFA` 
            },
            { 
              data: 'prix_vente',
              render: (data: any) => `${data} FCFA` 
            },
            { 
              data: 'stock_disponible',
              render: (data: number, type: any, row: any) => {
                if (data <= row.seuil_alert) {
                  return `<span class="fw-semibold text-danger">${data} - Alert stock</span>`;
                }
                return data;
              }
            },
            { 
              data: 'categorie',
              render: (data: any) => data?.nom || 'Non définie' 
            },
            { 
              data: 'created_at',
              render: (data: any) => {
                if (!data) return '';
                const date = new Date(data);
                return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
              }
            },
            {
              data: null,
              className: 'text-center',
              width: '18%',
              orderable: false,
              render: (data: any, type: any, row: any) => {
                const marge = row.prix_achat > 0 ? ((row.prix_vente - row.prix_achat) / row.prix_achat) * 100 : 0;
                const iaClass = marge < 15 ? 'btn-warning' : 'btn-outline-secondary';
                const iaTitle = marge < 15 ? `Marge faible (${Math.round(marge)}%) — Suggestion IA` : 'Suggestion IA prix';
                return `
                  <div class="btn-group">
                    <button type="button" class="btn btn-sm ${iaClass} me-1" data-bs-toggle="tooltip" title="${iaTitle}" data-action="ia" data-id="${row.id}">
                      <i class="bi bi-robot"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" data-bs-toggle="tooltip" title="Imprimer étiquette" data-action="label" data-id="${row.id}">
                      <i class="bi bi-tag"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-info me-1" data-bs-toggle="tooltip" title="Visualiser" data-action="view" data-id="${row.id}">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-success me-1" data-bs-toggle="tooltip" title="Modifier" data-action="edit" data-id="${row.id}">
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
            emptyTable: 'Aucun produit trouvé',
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
                columns: [0, 1, 2, 3, 4] // Exporter les colonnes Nom, Prix d'achat, Prix de vente, Stock, Catégorie
              }
            },
            {
              extend: 'pdf',
              text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
              className: 'btn btn-danger btn-sm',
              exportOptions: {
                columns: [0, 1, 2, 3, 4] // Exporter les colonnes Nom, Prix d'achat, Prix de vente, Stock, Catégorie
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
            // Checkbox sélection
            $(row).find('.row-check').on('change', (e: any) => {
              const id = +$(e.currentTarget).data('id');
              this.toggleOne(id, e.currentTarget.checked);
            });

            // Boutons actions
            $(row).find('[data-action]').on('click', (e: any) => {
              const button = $(e.currentTarget);
              const action = button.data('action');
              const id = button.data('id');
              const produit = this.produits.find((p: any) => p.id === id);

              if (!produit) return;

              switch (action) {
                case 'ia':
                  this.voirPrixSuggere(produit);
                  break;
                case 'label':
                  this.imprimerEtiquette(produit);
                  break;
                case 'view':
                  this.openViewProduit(produit);
                  break;
                case 'edit':
                  this.openEditProduit(produit);
                  break;
                case 'delete':
                  this.deleteProduit(produit);
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

  loadBoutiques(): void {

    console.log(this.currentUser);
    

    if (this.currentUser.is_admin === true) {
      this.boutiqueService.find().subscribe({
        next: (response: any) => {
          if (response.status === 'success' && response.data) {
            this.boutiques = response.data;
            const defaultId = this.currentUser.boutique_id || this.boutiques[0]?.id;
            if (defaultId) this.onBoutiqueChange(defaultId);
          }
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des boutiques:', error);
        }
      });
    } else {
      if (this.currentUser.profil.code.toLowerCase() === 'responsable_structure') {
        this.boutiqueService.findByStructure(this.currentUser.structure[0].id).subscribe({
          next: (response: any) => {
            if (response.status === 'success' && response.data) {
              this.boutiques = response.data;
              const defaultId = this.currentUser.boutique_id || this.boutiques[0]?.id;
              if (defaultId) this.onBoutiqueChange(defaultId);
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

  loadCategories(boutiqueId?: number | string): void {
    const id = boutiqueId || this.currentUser.boutique_id;
    if (!id) return;
    this.categorieService.getCategoriesByBoutik(id).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.categories = response.data;
        }
      },
      error: () => {
        this.toastr.error('Erreur lors du chargement des catégories');
      }
    });
  }

  onBoutiqueChange(value: any): void {
    this.selectedBoutique = value ?? '';
    this.selectedBoutiqueFilter = value ?? null;
    this.selectedCategoryFilter = null;
    this.loadCategories(value ?? undefined);
    this.loadProduits();
  }

  onCategoryFilterChange(value: number | null): void {
    this.selectedCategoryFilter = value ?? null;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.produits = this.selectedCategoryFilter != null
      ? this.allProduits.filter(p => p.categorie?.id === this.selectedCategoryFilter)
      : [...this.allProduits];

    this.selectedIds.clear();
    this.destroyDataTable();
    setTimeout(() => {
      if (isPlatformBrowser(this.platformId)) {
        try {
          this.initDataTable();
        } catch (error) {
          console.error('Erreur lors de la réinitialisation de DataTable:', error);
        }
        this.isLoading = false;
      }
    }, 50);
  }

  downloadCatalogueBarcodes(): void {
    const boutiqueId = Number(this.selectedBoutique) || this.currentUser?.boutique_id;
    if (!boutiqueId) {
      this.toastr.warning('Sélectionnez une boutique d\'abord');
      return;
    }
    this.cataloguePdfLoading = true;
    this.produitService.getCatalogueBarcodesPdf(boutiqueId).subscribe({
      next: (blob: any) => {
        this.cataloguePdfLoading = false;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogue-codes-barres-boutique-${boutiqueId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e: any) => {
        this.cataloguePdfLoading = false;
        this.toastr.error(e?.error?.message || 'Erreur lors de la génération du catalogue');
      },
    });
  }

  loadProduits(): void {
    this.isLoading = true;

    if (this.currentUser.profil.code.toLowerCase() === 'admin' || this.currentUser.profil.code.toLowerCase() === 'responsable_structure') {
      if (!this.selectedBoutique) {
        this.produits = [];
        this.isLoading = false;
        return;
      }
    } else {
      this.selectedBoutique = this.currentUser.boutique_id
    }
    
    const body: any = {
      boutique: this.selectedBoutique
    }

    this.produitService.getProduits(body).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.allProduits = response.data;
          this.applyFilters();
        } else {
          this.isLoading = false;
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.toastr.error('Erreur lors du chargement des produits');
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.produitForm.patchValue({
        image: file
      });
      
      // Créer une URL pour la prévisualisation
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.previewImageUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  openNewModal(): void {
    this.isEditMode = false;
    this.selectedProduit = null;
    this.titleModal = 'AJOUTER UN PRODUIT';
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.selectedFile = null;
    this.previewImageUrl = null;
    this.isSubmitted = false;

    Object.keys(this.produitForm.controls).forEach(key => {
      this.produitForm.get(key)?.enable();
    });

    const defaultBoutique = this.selectedBoutique || this.boutiques[0]?.id || '';
    this.produitForm.reset({
      nom: '',
      prix_achat: null,
      prix_vente: null,
      stock_initial: 0,
      seuil_alert: 2,
      categorie: '',
      boutique: defaultBoutique,
      unite_mesure: 'pièce',
      code_barre: null,
      image: null
    });
  }

  openViewProduit(produit: any): void {
    this.selectedProduit = produit;
    this.titleModal = `VISUALISER LE PRODUIT [${produit?.nom}]`;
    this.buttonText = 'Fermer';
    this.icon = 'ri ri-close-circle-line';
    this.produitForm.reset();
    this.isSubmitted = false;

    // Remplir le formulaire en lecture seule
    this.produitForm.patchValue({
      nom: produit.nom,
      prix_achat: produit.prix_achat,
      prix_vente: produit.prix_vente,
      stock_initial: produit.stock_initial,
      categorie: produit.categorie?.id,
      boutique: produit.boutique?.id,
      seuil_alert: produit.seuil_alert || 0,
      unite_mesure: produit.unite_mesure || 'pièce',
      code_barre: produit.code_barre || null
    });

    // Désactiver les champs du formulaire
    Object.keys(this.produitForm.controls).forEach(key => {
      this.produitForm.get(key)?.disable();
    });

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  openEditProduit(produit: any): void {
    this.isEditMode = true;
    this.selectedProduit = produit;
    this.titleModal = `MODIFIER LE PRODUIT [${produit?.nom}]`;
    this.buttonText = 'Modifier';
    this.icon = 'bi bi-pencil-square';
    this.isSubmitted = false;

    // Activer les champs du formulaire
    Object.keys(this.produitForm.controls).forEach(key => {
      this.produitForm.get(key)?.enable();
    });

    // Remplir le formulaire avec les données du produit
    this.produitForm.patchValue({
      nom: produit.nom,
      prix_achat: produit.prix_achat,
      prix_vente: produit.prix_vente,
      stock_initial: produit.stock_initial,
      categorie: produit.categorie?.id,
      boutique: produit.boutique?.id,
      image: produit.image,
      seuil_alert: produit.seuil_alert || 0,
      unite_mesure: produit.unite_mesure || 'pièce',
      code_barre: produit.code_barre || null
    });

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  saveOrUpdateProduit(): void {
    this.isSubmitted = true;

    if (this.produitForm.invalid) {
      this.toastr.warning('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const formData = new FormData();
    const produit = this.produitForm.value;

    // Ajouter les champs au FormData
    Object.keys(produit).forEach(key => {
      if (key === 'image' && this.selectedFile) {
        formData.append('image', this.selectedFile);
      } else if (produit[key] !== null && produit[key] !== undefined) {
        formData.append(key, produit[key]);
      }
    });

    // Si une boutique est sélectionnée, utilisez-la
    if (this.selectedBoutique && !formData.has('boutique')) {
      formData.append('boutique', this.selectedBoutique);
    }

    let request;
    if (this.isEditMode && this.selectedProduit) {
      request = this.produitService.updateProduit(this.selectedProduit.id, formData);
    } else {
      request = this.produitService.createProduit(formData);
    }

    this.isLoading = true;

    request.pipe(first()).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          const modal = document.getElementById('modal-fadein');
          if (this.isEditMode && modal) {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) {
              modalInstance.hide();
            } 
          }

          this.toastr.success(this.isEditMode ? 
            'Produit modifié avec succès' : 
            'Produit ajouté avec succès');

          this.loadProduits();
          this.produitForm.reset();
          this.previewImageUrl = null;
          this.selectedFile = null;
          this.isSubmitted = false;
          this.isEditMode = false;
          this.selectedProduit = null;
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
    this.importBoutiqueId = this.currentUser?.boutique_id || this.selectedBoutique || null;
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
    this.produitService.importProduits(this.pendingImportFile, +this.importBoutiqueId, this.importCategorieId ?? undefined).pipe(first()).subscribe({
      next: (response: any) => {
        this.isImporting = false;
        const data = response?.data ?? response;
        this.importResult = {
          created: data?.created ?? 0,
          skipped: data?.skipped ?? 0,
          errors: data?.errors ?? []
        };
        const { created, skipped, errors } = this.importResult;
        if (created === 0) {
          this.toastr.error(`Aucun produit importé. ${skipped} ignoré(s) — voir les erreurs ci-dessous.`);
        } else if (errors.length > 0) {
          this.toastr.warning(`Import partiel : ${created} créé(s), ${skipped} ignoré(s) avec erreurs.`);
        } else {
          this.toastr.success(`Import réussi : ${created} produit(s) créé(s).`);
        }
        this.loadProduits();
      },
      error: (err: any) => {
        this.isImporting = false;
        this.toastr.error(err?.error?.message || 'Erreur lors de l\'import des produits.');
      }
    });
  }

  downloadTemplate(): void {
    downloadXlsxTemplate(
      ['nom', 'prix_achat', 'prix_vente', 'stock_initial', 'seuil_alert', 'unite_mesure', 'code_barre'],
      [
        { nom: 'Téléphone XR', prix_achat: 80000, prix_vente: 100000, stock_initial: 10, seuil_alert: 2, unite_mesure: 'pièce', code_barre: 'ABC123' },
        { nom: 'Casque audio', prix_achat: 15000, prix_vente: 25000, stock_initial: 5, seuil_alert: 1, unite_mesure: 'pièce', code_barre: '' }
      ],
      'modele_produits.xlsx'
    );
  }

  cancelImport(): void {
    this.pendingImportFile = null;
    this.importPreview = null;
    this.importResult = null;
    this.importBoutiqueId = null;
    this.importCategorieId = null;
    const modal = document.getElementById('modal-import-preview');
    if (modal) {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
    }
  }

  voirPrixSuggere(produit: any): void {
    this.produitPrixSuggere = produit;
    this.prixSuggereData = null;
    this.prixSuggereError = null;
    this.isLoadingPrixSuggere = true;

    // Ouvre le modal avant l'appel API (affiche le spinner)
    const modalEl = document.getElementById('modal-prix-suggere');
    if (modalEl) {
      let inst = bootstrap.Modal.getInstance(modalEl);
      if (!inst) inst = new bootstrap.Modal(modalEl);
      inst.show();
    }

    const boutiqueId = produit.boutique?.id ?? this.currentUser?.boutique_id;
    if (!boutiqueId) {
      this.isLoadingPrixSuggere = false;
      this.prixSuggereError = 'Boutique introuvable pour ce produit.';
      return;
    }

    this.previsionService.getPrixSuggere(produit.id, boutiqueId).subscribe({
      next: (res: any) => {
        this.prixSuggereData = res?.data ?? res;
        this.isLoadingPrixSuggere = false;
      },
      error: (err: any) => {
        this.isLoadingPrixSuggere = false;
        this.prixSuggereError = err?.error?.message || 'Suggestion IA temporairement indisponible.';
      }
    });
  }

  appliquerPrixSuggere(): void {
    if (!this.produitPrixSuggere || !this.prixSuggereData) return;
    this.isAppliquerPrix = true;

    this.produitService.updateProduit(this.produitPrixSuggere.id, { prix_vente: this.prixSuggereData.prix_suggere })
      .pipe(first())
      .subscribe({
        next: () => {
          this.isAppliquerPrix = false;
          this.toastr.success(`Prix mis à jour : ${this.prixSuggereData.prix_suggere.toLocaleString('fr-FR')} FCFA`);
          const modal = document.getElementById('modal-prix-suggere');
          if (modal) {
            const inst = bootstrap.Modal.getInstance(modal);
            if (inst) inst.hide();
          }
          this.prixSuggereData = null;
          this.loadProduits();
        },
        error: () => {
          this.isAppliquerPrix = false;
          this.toastr.error('Erreur lors de l\'application du prix.');
        }
      });
  }

  ignorerPrixSuggere(): void {
    this.prixSuggereData = null;
    this.prixSuggereError = null;
    const modal = document.getElementById('modal-prix-suggere');
    if (modal) {
      const inst = bootstrap.Modal.getInstance(modal);
      if (inst) inst.hide();
    }
  }

  copierCodeBarre(code: string): void {
    navigator.clipboard.writeText(code).then(() => {
      this.toastr.info('Code-barres copié');
    });
  }

  imprimerEtiquette(produit: any): void {
    Swal.fire({
      title: 'Imprimer étiquette',
      html: `<strong>${produit.nom}</strong><br><small class="text-muted">Code-barres : ${produit.code_barre || '(auto)'}</small>`,
      input: 'number',
      inputLabel: 'Nombre de copies',
      inputValue: 1,
      inputAttributes: { min: '1', max: '200', step: '1' },
      inputValidator: (v) => (!v || Number(v) < 1 ? 'Entrez au moins 1 copie' : undefined),
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-printer me-1"></i> Imprimer',
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#0d6efd',
    }).then(({ isConfirmed, value }) => {
      if (isConfirmed && value) {
        window.open(this.produitService.getEtiquetteUrl(produit.id, Number(value)), '_blank');
      }
    });
  }

  deleteProduit(produit: any): void {
    Swal.fire({
      text: `Voulez-vous vraiment supprimer le produit "${produit.nom}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#5C636A',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result: SweetAlertResult) => {
      if (result.isConfirmed) {
        this.isLoading = true;
        
        this.produitService.deleteProduit(produit.id).pipe(first()).subscribe({
          next: (response: any) => {
            if (response.affected === 1) {
              this.toastr.success('Le produit a été supprimé avec succès.');
              this.loadProduits();
            } else {
              this.toastr.error('Le produit n\'a pas pu être supprimé.');
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

  deleteSelected(): void {
    const ids = [...this.selectedIds];
    if (!ids.length) return;

    Swal.fire({
      title: `Supprimer ${ids.length} produit${ids.length > 1 ? 's' : ''} ?`,
      text: 'Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#5C636A',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
    }).then((result: SweetAlertResult) => {
      if (!result.isConfirmed) return;
      this.isDeletingMany = true;
      this.produitService.deleteProduits(ids).pipe(first()).subscribe({
        next: () => {
          this.toastr.success(`${ids.length} produit${ids.length > 1 ? 's' : ''} supprimé${ids.length > 1 ? 's' : ''} avec succès.`);
          this.selectedIds.clear();
          this.loadProduits();
        },
        error: () => {
          this.toastr.error('Erreur lors de la suppression.');
        },
      }).add(() => { this.isDeletingMany = false; });
    });
  }
}
