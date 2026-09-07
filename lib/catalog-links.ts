/** Stable source links and human-readable numbers for marketplace printings. */
export function tcgplayerProductUrl(productId: string | null | undefined): string | null {
  return productId && /^[1-9]\d*$/.test(productId) ? `https://www.tcgplayer.com/product/${productId}` : null;
}

export function displayCardNumber(cardNumber: string | null | undefined): string | null {
  if (!cardNumber || /^TCG-\d+$/.test(cardNumber)) return null;
  return cardNumber.replace(/_tcg\d+$/i, "");
}
