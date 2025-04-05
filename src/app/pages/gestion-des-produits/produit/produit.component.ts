import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { ProduitService } from '../../../services/gestion-des-produits/produit.service';
import { CategorieService } from '../../../services/gestion-des-produits/categorie.service';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { first } from 'rxjs';
import Swal, { SweetAlertResult } from 'sweetalert2';

declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-produit',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './produit.component.html',
  styleUrl: './produit.component.scss'
})
export default class ProduitComponent implements OnInit, OnDestroy {
  produits: any[] = [];
  categories: any[] = [];
  boutiques: any[] = [];
  selectedBoutique: any = null;
  isLoading: boolean = false;
  isEditMode: boolean = false;
  selectedProduit: any = null;
  titleModal: string = 'AJOUTER UN PRODUIT';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';
  produitForm: FormGroup;
  isSubmitted: boolean = false;
  selectedFile: File | null = null;
  previewImageUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private produitService: ProduitService,
    private categorieService: CategorieService,
    private boutiqueService: BoutiqueService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: any
  ) {
    this.produitForm = this.fb.group({
      nom: ['', Validators.required],
      prix_achat: ['', [Validators.required, Validators.min(0)]],
      prix_vente: ['', [Validators.required, Validators.min(0)]],
      stock_initial: ['', [Validators.required, Validators.min(0)]],
      categorie: ['', Validators.required],
      boutique: ['', Validators.required],
      image: [null]
    });
  }

  ngOnInit(): void {
    this.loadBoutiques();
    this.loadCategories();
    this.loadProduits();

    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        $('[data-bs-toggle="tooltip"]').tooltip({
          trigger: 'hover'
        });
      }, 500);
    }
  }

  defaultStructure() {
    
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
              data: 'stock_initial',
              render: (data: any) => data 
            },
            { 
              data: 'categorie',
              render: (data: any) => data?.nom || 'Non définie' 
            },
            { 
              data: 'image',
              render: (data: any) => data ? `<img src="${data}" alt="Image produit" class="img-thumbnail" style="max-width: 50px;">` : 'Aucune image' 
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
              width: '15%',
              orderable: false,
              render: (data: any, type: any, row: any) => {
                return `
                  <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-info me-2" data-bs-toggle="tooltip" title="visualiser" data-action="view" data-id="${row.id}">
                      <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="btn btn-sm btn-success me-2" data-bs-toggle="tooltip" title="Modifier" data-action="edit" data-id="${row.id}">
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
            emptyTable: "Aucune donnée",
            info: "Affichage de _START_ à _END_ sur _TOTAL_ entrées",
            infoEmpty: "Affichage de 0 à 0 sur 0 entrée",
            infoFiltered: "(filtré de _MAX_ entrées au total)",
            infoThousands: ",",
            loadingRecords: "Chargement...",
            processing: "Traitement...",
            search: "Rechercher :",
            zeroRecords: "Aucun enregistrement trouvé",
            paginate: {
              first: '<i class="bi bi-chevron-double-left"></i>',
              last: '<i class="bi bi-chevron-double-right"></i>',
              next: '<i class="bi bi-chevron-right"></i>',
              previous: '<i class="bi bi-chevron-left"></i>'
            }
          },
          dom: '<"row"<"col-sm-12 col-md-6"B><"col-sm-12 col-md-6"f>>' +
               '<"row"<"col-sm-12"tr>>' +
               '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
          buttons: [
            {
              extend: 'excel',
              text: '<i class="bi bi-file-earmark-excel"></i> Excel',
              className: 'btn btn-success btn-sm me-2',
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
          pageLength: 5,
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
              const produit = this.produits.find((p: any) => p.id === id);
              
              if (!produit) return;
              
              switch (action) {
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
    this.boutiqueService.find('1').subscribe({
      next: (response: any) => {
        console.log('response', response);
        
        if (response.status === 'success' && response.data) {
          this.boutiques = response.data;
        }
      },
      error: (error: any) => {
        this.toastr.error('Erreur lors du chargement des boutiques');
      }
    });
  }

  loadCategories(): void {
    this.categorieService.getAllCategories().subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.categories = response.data;
        }
      },
      error: (error: any) => {
        this.toastr.error('Erreur lors du chargement des catégories');
      }
    });
  }

  onBoutiqueChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedBoutique = selectElement.value;
    this.loadProduits();
  }

  loadProduits(): void {
    this.isLoading = true;
    if (!this.selectedBoutique) {
      this.produits = [];
      this.isLoading = false;
      return;
    }

    this.produitService.getProduits(this.selectedBoutique).subscribe({
      next: (response: any) => {
        if (response.status === 'success' && response.data) {
          this.produits = response.data;
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
    this.produitForm.reset();
    this.selectedFile = null;
    this.previewImageUrl = null;
    this.isSubmitted = false;

    // Activer les champs du formulaire
    Object.keys(this.produitForm.controls).forEach(key => {
      this.produitForm.get(key)?.enable();
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
      categorie: produit.categorie?.id
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
      categorie: produit.categorie?.id
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
      return;
    }

    const formData = new FormData();
    const produit = this.produitForm.value;

    // Ajouter les champs au FormData
    Object.keys(produit).forEach(key => {
      if (key === 'image' && this.selectedFile) {
        formData.append('image', this.selectedFile);
      } else {
        formData.append(key, produit[key]);
      }
    });

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
          if (modal) {
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
}
