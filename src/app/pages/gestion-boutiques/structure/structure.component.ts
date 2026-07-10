import { Component, ElementRef, Inject, inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { first, Subscription } from 'rxjs';
import { StructureService } from '../../../services/structure/structure.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
declare var $: any;
declare var bootstrap: any;

@Component({
  selector: 'app-structure',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './structure.component.html',
  styleUrl: './structure.component.scss'
})
export class StructureComponent {

  souscription: Subscription = new Subscription();
  structureForm: FormGroup;

  //Injection des services
  structureService: any = inject(StructureService);
  fb: any = inject(FormBuilder);
  toastr = inject(ToastrService)

  users: any [] = [];
  structureData: any = {};
  structures: any[] = [];
  selectedstructure: any = '';
  mobileDetailItem: any = null;

  isLoading: boolean = false;
  isEditMode: boolean = false;
  titleModal: string = 'AJOUTER UN NOUVEAU UTILISATEUR';
  buttonText: string = 'Enregistrer';
  icon: string = 'ri ri-save-3-line';

  
  isSubmitted: boolean = false;

  previewImageUrl: string | null = null;
  selectedProduit: any = null;
  selectedFile: File | null = null;

  @ViewChild('dataTable', { static: false }) table!: ElementRef;
  boutiques: any;
  
  constructor(@Inject(PLATFORM_ID) private platformId: any){
    this.structureForm = this.fb.group({
      nom: ['', [Validators.required]],
      rccm: ['', ],
      email: ['', [Validators.required]],
      situation_geo: ['', []],
      logo: [null],
      responsable: this.fb.group({
        nom: ['', [Validators.required]],
        prenoms: ['', [Validators.required]],
        email: ['', [Validators.required]],
        mot_de_passe: this.fb.control('12345', { nonNullable: true }),
        telephone: ['', [Validators.minLength(10), Validators.maxLength(10)]],
      })
    })
  }

  // getter pour un accès facile aux champs du formulaire
  get f() { return this.structureForm.controls; }
  
  ngOnInit(): void {
    
    this.structureFind();
    
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
      this.structureForm.patchValue({
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
    this.structureForm.reset();
    this.structureForm.enable();
    this.isEditMode = false;
    this.structureData = null;
    const title = 'Ajouter un nouveau user';
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Enregistrer';
    this.icon = 'ri ri-save-3-line';
    this.isSubmitted = false;
    
  }

  openView(structure: any): void {
    this.boutiques =  structure?.boutique;
    this.structureForm.disable();
    this.structureData = structure;
    const title = `Visualiser la structure [ ${structure?.nom} ]`;
    this.titleModal = title.toUpperCase();
    this.buttonText = 'Fermer';
    this.icon = 'ri ri-close-circle-line';
    
    this.isSubmitted = false;
    
    this.structureForm.patchValue(structure);
    this.structureForm.disable();

    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  openEdit(structure: any): void {
    this.structureData = structure;
    this.structureForm.patchValue(structure);
    this.structureForm.enable();
    this.isEditMode = !!structure;
    this.buttonText = this.isEditMode ? 'Modifier' : 'Enregistrer';
    this.icon = this.isEditMode ? 'bi bi-pencil-square' : 'ri ri-save-3-line';
    const title = `Modifier la structure [${structure?.nom}]`;
    this.titleModal = title;
    
    this.isSubmitted = false;

    // Ouvrir le modal
    const modal = document.getElementById('modal-fadein');
    if (modal) {
      const modalInstance = new bootstrap.Modal(modal);
      modalInstance.show();
    }
  }

  public structureFind() {
    
    this.isLoading = true;

    this.souscription.add(
      this.structureService.find().subscribe({
        next: (response: any) => {
          this.users = response.data;
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
          console.error('Erreur lors de la récupération des users :', err);
        },
        complete: () => {
          console.log('Récupération des users terminée.');
        }
      })
    );
  }


  get d() {
  return this.structureForm.controls;
}

get r() {
  return (this.structureForm.get('responsable') as FormGroup).controls;
}

  

  saveOrUpdate(): void {

    this.isSubmitted = true;
   
    // arrêter ici si le formulaire est invalide
    if (this.structureForm.invalid) {
      return;
    }
    
    const formData = new FormData();
    const structure = this.structureForm.value;
    
    // Ajouter les champs au FormData
    Object.keys(structure).forEach(key => {
      if (key === 'logo' && this.selectedFile) {
        formData.append('logo', this.selectedFile);
      } else {
        formData.append(key, structure[key]);
      }
    });

    let request;
    //const user = this.structureForm.value;
    if (this.isEditMode && this.structureData) {
      // Mode modification
      request = this.structureService.update(formData, this.structureData.id);
    } else {
      // Mode création
      request = this.structureService.create(formData);
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
          this.structureFind();

          // Réinitialiser le formulaire et les états
          this.structureForm.reset();
          this.isSubmitted = false;
          this.isEditMode = false;
          this.structureData = null;
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
          data: this.users, // Fournir les données directement
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
            emptyTable: 'Aucune structure trouvée',
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
              const user = this.users.find((c: any) => c.id === id);
              
              
              if (!user) return;
              
              switch (action) {
                case 'view':
                  this.openView(user);
                  break;
                case 'edit':
                  this.openEdit(user);
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
