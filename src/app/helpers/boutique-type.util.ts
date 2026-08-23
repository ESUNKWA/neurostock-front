/**
 * Classification des types de `Boutique` — source unique de vérité pour distinguer
 * points de vente, entrepôts et départements dans toute l'application.
 *
 * La présence (ou non) d'un entrepôt pour une structure est toujours DÉRIVÉE de la
 * liste de ses boutiques (au moins une de type 'entrepot'), jamais stockée comme un
 * flag séparé : une structure peut ainsi ajouter/retirer un entrepôt à tout moment
 * sans bascule manuelle, et l'UI s'adapte automatiquement (cf. hasEntrepot()).
 */

export type BoutiqueType = 'boutique' | 'entrepot' | 'departement';

export function isEntrepot(b: any): boolean {
  return (b?.type ?? '').toString().toLowerCase().trim() === 'entrepot';
}

export function isDepartement(b: any): boolean {
  return (b?.type ?? '').toString().toLowerCase().trim() === 'departement';
}

/** Point de vente commercial : ni entrepôt, ni département. */
export function isPointDeVente(b: any): boolean {
  return !isEntrepot(b) && !isDepartement(b);
}

export function filterEntrepots(boutiques: any[] | null | undefined): any[] {
  return (boutiques ?? []).filter(isEntrepot);
}

export function filterPointsDeVente(boutiques: any[] | null | undefined): any[] {
  return (boutiques ?? []).filter(isPointDeVente);
}

/** La structure possède-t-elle au moins un entrepôt ? */
export function hasEntrepot(boutiques: any[] | null | undefined): boolean {
  return (boutiques ?? []).some(isEntrepot);
}
