/** Whether the current URL is the admin pet registration portal. */
export function isAdminPetsPortal(url: string): boolean {
  return url.includes('/admin/pets');
}

/** Base path for pet list/detail sub-routes (admin vs resident mobile). */
export function petsBasePath(url: string): string {
  return isAdminPetsPortal(url) ? '/admin/pets' : '/mobile/pets';
}
