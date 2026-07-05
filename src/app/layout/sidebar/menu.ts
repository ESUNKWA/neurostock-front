export const Menu: any = [
    {   
        full: false,
        menu: [
            {
                libelle: 'Tableau de bord',
                lien: '/dashboard',
                icon: 'bi bi-grid'
            }
        ]
        
    },
    {
        titre: 'Parametrages',
        full: true,
        menu: [
            {
                libelle: 'Gestion produits',
                icon: 'bi bi-menu-button-wide',
                target: 'products-nav',
                sousMenu: [
                    {
                        libelle: 'Catégories',
                        lien: '/gestion-des-produits/categorie',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Produits',
                        lien: '/gestion-des-produits/produit',
                        icon: 'bi bi-circle'
                    }
                ]
            },
            {
                libelle: 'Clients',
                icon: 'bi bi-people',
                lien: '/clients/list'
            },
            {
                libelle: 'Fournisseurs',
                icon: 'bi bi-truck',
                lien: '/gestion-des-produits/fournisseur'
            },
            {
                libelle: 'Gestion boutiques',
                icon: 'bi bi-houses',
                target: 'boutique-nav',
                sousMenu: [
                    {
                        libelle: 'Structure',
                        lien: '/structure/list',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Boutiques',
                        lien: '/structure/boutiques',
                        icon: 'bi bi-circle'
                    }
                ]
            }
        ]
    },
   
    {
        titre: 'Gestion des stocks',
        full: true,
        menu: [
            {
                libelle: 'Approvisionnements',
                icon: 'bi bi-cart4',
                target: 'achats-nav',
                sousMenu: [
                    {
                        libelle: 'Nouveau',
                        lien: '/gestion-des-approvisionnements/approvisionnement',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Consulter',
                        lien: '/gestion-des-approvisionnements/historique-approvisionnements',
                        icon: 'bi bi-circle'
                    }
                ]
            },
            {
                libelle: 'Gestion ventes',
                icon: 'bi bi-currency-dollar',
                target: 'ventes-nav',
                sousMenu: [
                    {
                        libelle: 'Nouvelle vente',
                        lien: '/gestion-des-ventes/vente',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Voir les ventes',
                        lien: '/gestion-des-ventes/historique-ventes',
                        icon: 'bi bi-circle'
                    }
                ]
            },
            {
                libelle: 'Devis',
                icon: 'bi bi-file-earmark-text',
                target: 'devis-nav',
                sousMenu: [
                    {
                        libelle: 'Nouveau devis',
                        lien: '/gestion-des-devis/nouveau',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Voir les devis',
                        lien: '/gestion-des-devis/historique',
                        icon: 'bi bi-circle'
                    }
                ]
            },
            {
                libelle: 'Commandes clients',
                icon: 'bi bi-bag-check',
                target: 'commandes-clients-nav',
                sousMenu: [
                    {
                        libelle: 'Nouvelle commande',
                        lien: '/commandes-clients/nouvelle',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Voir les commandes',
                        lien: '/commandes-clients/liste',
                        icon: 'bi bi-circle'
                    }
                ]
            },
            {
                libelle: 'Retours produits',
                icon: 'bi bi-arrow-return-left',
                target: 'retours-nav',
                sousMenu: [
                    {
                        libelle: 'Historique',
                        lien: '/retours/historique',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Nouveau retour',
                        lien: '/retours/nouveau',
                        icon: 'bi bi-circle'
                    }
                ]
            },
            {
                libelle: 'Mouvements de stock',
                icon: 'bi bi-arrow-left-right',
                lien: '/stocks/mouvements'
            },
            {
                libelle: 'Gestion de caisse',
                icon: 'bi bi-cash-coin',
                lien: '/caisse'
            }
        ]
    },
    {
        titre: 'Rapports',
        full: true,
        menu: [
            {
                libelle: 'Recette',
                lien: '/recette',
                icon: 'bi bi-cash-stack'
            }
        ]
    },
    {
        titre: 'Analyse IA',
        full: true,
        menu: [
            {
                libelle: 'Résumé du jour',
                lien: '/analyse-ia/resume-journalier',
                icon: 'bi bi-stars',
                badge: 'IA'
            },
            {
                libelle: 'Prix suggérés',
                lien: '/analyse-ia/prix-suggere',
                icon: 'bi bi-tags-fill',
                badge: 'IA'
            },
            {
                libelle: 'Prévision rupture',
                lien: '/analyse-ia/rupture-stock',
                icon: 'bi bi-graph-up-arrow',
                badge: 'IA'
            },
            {
                libelle: 'Scan facture',
                lien: '/analyse-ia/scan-facture',
                icon: 'bi bi-camera-fill',
                badge: 'IA'
            }
        ]
    },
    {
        titre: 'Gestion des utilisateurs',
        full: true,
        menu: [
            {
                libelle: 'Utilisateurs',
                icon: 'bi bi-person-workspace',
                target: 'users-nav',
                sousMenu: [
                    {
                        libelle: 'Profil',
                        lien: '/utilisateurs/profils',
                        icon: 'bi bi-circle'
                    },
                    {
                        libelle: 'Utilisateurs',
                        lien: '/utilisateurs/list',
                        icon: 'bi bi-circle'
                    }
                ]
            }
        ]
    },
    {
        titre: 'Mon compte',
        full: true,
        menu: [
            {
                libelle: 'Mon abonnement',
                lien: '/mon-abonnement',
                icon: 'bi bi-calendar-check'
            }
        ]
    }
];