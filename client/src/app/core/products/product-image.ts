const categoryImages: Record<number, string> = {
  1: 'electronics.png',
  2: 'other-electronics.png',
  3: 'mobile-phones.png',
  4: 'wearables.png',
  5: 'power-charging.png',
  6: 'computer-accessories.png',
  7: 'audio.png',
  8: 'laptops.png',
  9: 'tablets.png',
  10: 'tv-home-theater.png',
  11: 'cameras.png',
};

export function productImage(subCategoryId: number | null | undefined): string {
  return `/category-placeholders/${categoryImages[subCategoryId ?? 1] ?? categoryImages[1]}`;
}
