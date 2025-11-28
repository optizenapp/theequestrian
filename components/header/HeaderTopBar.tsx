/**
 * Header Top Bar Component
 * 
 * Optional promotional banner at the top of header
 * Examples: Free shipping, sale announcements, etc.
 */

export function HeaderTopBar() {
  // Set to null to hide top bar, or customize the message
  const promoMessage = null; // "Free shipping on orders over $50"

  if (!promoMessage) return null;

  return (
    <div className="bg-black text-white text-center py-2 text-sm">
      <p>{promoMessage}</p>
    </div>
  );
}
