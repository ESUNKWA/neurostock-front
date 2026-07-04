import { Component, ElementRef, Inject, inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { first, Subscription } from 'rxjs';
import { BoutiqueService } from '../../../services/boutique/boutique.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { StructureService } from '../../../services/structure/structure.service';
declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-boutique',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './boutique.component.html',
  styleUrl: './boutique.component.scss'
})
export class BoutiqueComponent {

  souscription: Subscription = new Subscription();
  boutiqueForm: FormGroup;

  //Injection des services
  boutiqueService: any = inject(BoutiqueService);
  fb: any = inject(FormBuilder);
  structure: any = inject(StructureService);
  toastr = inject(ToastrService)

  boutiques: any [] = [];
  boutiqueData: any = {};

  isLoading: boolean = false;
  isEditMode: boolean = false;
  titleModal: string = 'AJOUTER UNE NOUVELLE BOUTIQUE';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';
  
  isSubmitted: boolean = false;

  previewImageUrl: string | null = null;
  selectedProduit: any = null;
  selectedFile: File | null = null;

  @ViewChild('dataTable', { static: false }) table!: ElementRef;
  boutiqueId: any = '';
  
  constructor(@Inject(PLATFORM_ID) private platformId: any){
    this.boutiqueForm = this.fb.group({
      nom: ['', [Validators.required]],
      telephone: ['', [Validators.minLength(10), Validators.maxLength(10)]],
      rccm: ['', []],
      email: ['', []],
      structure: [null],
      situation_geo: ['', []],
      logo: [null],
    })
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.boutiqueForm.controls; }
  
  ngOnInit(): void {

    this.structure.find().subscribe({
      next: (structure: any) => {
        this.boutiqueId = structure.data[0].id;
        
        // Mise à jour du champ dans le formulaire
        this.boutiqueForm.patchValue({ structure: this.boutiqueId });
    
        // Maintenant que la valeur est bien mise à jour, tu peux appeler boutiqueFind()
        this.boutiqueFind();
      },
      error: (err: any) => {
        console.error('Erreur lors de la récupération des structures :', err);
      }
    });
    
    
    // Configurer les tooltips pour qu'ils se réinitialisent correctement
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            $('[data-bs-toggle="tooltip"]').tooltip({
              trigger: 'hover'
            });
          }, 500);
        }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.boutiqueForm.patchValue({
        logo: file
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
    this.boutiqueForm.reset();
    this.boutiqueForm.patchValue({ structure: this.boutiqueId }); // restaurer la structure après reset
    this.boutiqueForm.enable();
    this.isEditMode = false;
    this.boutiqueData = null;
    const title = 'Ajouter une nouvelle boutique';
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.isSubmitted = false;
  }

  openView(boutique: any): void {
    this.boutiqueForm.disable();
    this.boutiqueData = boutique;
    const title = `Visualiser la boutique [ ${boutique?.nom} ]`;
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Fermer';
    this.icon = 'ri ri-close-circle-line';
    
    this.isSubmitted = false;
    
    this.boutiqueForm.patchValue(boutique);
    this.boutiqueForm.disable();

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  openEdit(boutique: any): void {
    this.boutiqueData = boutique;
    this.boutiqueForm.patchValue(boutique);
    this.boutiqueForm.enable();
    this.isEditMode = !!boutique;
    this.buttonText = this.isEditMode ? 'Modifier' : 'Enregistrer';
    this.icon = this.isEditMode ? 'bi bi-pencil-square' : 'ri ri-save-3-line';
    const title = `Modifier la boutique [${boutique?.nom}]`;
    this.titleModal = title;
    
    this.isSubmitted = false;

    // Ouvrir le modal
    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  public boutiqueFind() {
    
    this.isLoading = true;

    this.souscription.add(
      this.boutiqueService.find(this.boutiqueForm.value.structure).subscribe({
        next: (response: any) => {
          this.boutiques = response.data;
          // D'abord, détruisons l'instance DataTable sans vider la table
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
        },
        error: (err: any) => {
          console.error('Erreur lors de la récupération des boutiques :', err);
        },
        complete: () => {
          console.log('Récupération des boutiques terminée.');
        }
      })
    );
  }
  

  saveOrUpdate(): void {

    this.isSubmitted = true;
   
    // arrêter ici si le formulaire est invalide
    if (this.boutiqueForm.invalid) {
      return;
    }
    const formData = new FormData();
    const structure = this.boutiqueForm.value;

    // Ajouter les champs au FormData
    Object.keys(structure).forEach(key => {
      if (key === 'logo' && this.selectedFile) {
        formData.append('logo', this.selectedFile);
      } else {
        formData.append(key, structure[key]);
      }
    });

    let request;
    //const user = this.boutiqueForm.value;
    if (this.isEditMode && this.boutiqueData) {
      // Mode modification
      
      request = this.boutiqueService.update(formData, this.boutiqueData.id);
    } else {
      // Mode création
      request = this.boutiqueService.create(formData);
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
            'user modifiée avec succès' : 
            'user ajoutée avec succès');

          // Recharger les données sans détruire complètement le tableau
          this.boutiqueFind();

          // Réinitialiser le formulaire et les états
          this.boutiqueForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.boutiqueData = null;
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
          data: this.boutiques, // Fournir les données directement
          columns: [
            { 
              data: 'imageUrl',
              render: (data: any) => data ? `<img src="${data}" alt="Image produit" class="img-thumbnail" style="max-width: 50px;">` : 'Aucune image' 
            },
            { 
              data: 'nom',
              render: (data: any) => `<span class="fw-semibold">${data.toUpperCase() || ''}</span>` 
            },
            { 
              data: 'telephone',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data || 'Non définie' 
            },
            { 
              data: 'email',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data || 'Non définie' 
            },
            { 
              data: 'rccm',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data || 'Non définie' 
            },
            { 
              data: 'situation_geo',
              className: 'd-none d-sm-table-cell',
              render: (data: any) => data || 'Non définie' 
            },
            // { 
            //   data: 'created_at',
            //   className: 'd-none d-sm-table-cell',
            //   render: (data: any) => {
            //     if (!data) return '';
            //     const date = new Date(data);
            //     return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
            //   }
            // },
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
            emptyTable: 'Aucune boutique trouvée',
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
              columns: [0, 1, 2] // Exporter uniquement les colonnes Nom, Description et Date
            }
          },
          {
            extend: 'pdf',
            text: '<i class="bi bi-file-earmark-pdf"></i> PDF',
            className: 'btn btn-danger btn-sm',
            exportOptions: {
              columns: [0, 1, 2] // Exporter uniquement les colonnes Nom, Description et Date
            }
          }
        ],
        pageLength: 10,
        searching: true,
        info: true,
        responsive: true,
        ordering: true,
        pagingType: 'full_numbers',
        stateSave: false,
        retrieve: false,
        autoWidth: false, // Désactiver l'ajustement automatique de la largeur pour plus de stabilité
          drawCallback: () => {
            // Réinitialiser les tooltips
            $('[data-bs-toggle="tooltip"]').tooltip();
          },
          createdRow: (row: any, data: any, dataIndex: any) => {
            // Ajouter les gestionnaires d'événements pour les actions
            $(row).find('[data-action]').on('click', (e: any) => {
              const button = $(e.currentTarget);
              const action = button.data('action');
              const id = button.data('id');
              const boutique = this.boutiques.find((c: any) => c.id === id);
              
              
              if (!boutique) return;
              
              switch (action) {
                case 'view':
                  this.openView(boutique);
                  break;
                case 'edit':
                  this.openEdit(boutique);
                  break;
                case 'delete':
                  //this.deleteCategorie(categorie);
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
 
  ngAfterViewInit() {
    $('#modal-fadein').on('shown.bs.modal', () => {
      $('.js-example-basic-single').select2({
        dropdownParent: $('#modal-fadein') // IMPORTANT : Attache le dropdown à la modale
      }).val(null).trigger('change'); // Met la valeur par défaut;
    });
  }

  ngOnDestroy(): void {
    this.souscription.unsubscribe();
  }
}
