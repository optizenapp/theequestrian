#!/bin/bash

# Script to remove duplicate content from files
# Usage: ./fix-duplicates.sh

cd "$(dirname "$0")"

# List of files with duplicates (from the scan)
files=(
  "app/products/[handle]/page.tsx"
  "app/font-test/page.tsx"
  "app/[category]/page.tsx"
  "app/[category]/[subcategory]/[product]/page.tsx"
  "app/[category]/[subcategory]/page.tsx"
  "app/api/admin/analyze-product-types/route.ts"
  "app/api/admin/set-primary-collections/route.ts"
  "app/api/admin/debug-subcategory/route.ts"
  "app/api/admin/list-collections/route.ts"
  "app/api/admin/list-subcategories/route.ts"
  "app/api/admin/get-collection/route.ts"
  "components/filters/CategoryFilter.tsx"
  "components/filters/FilterSidebar.tsx"
  "components/filters/FilterChips.tsx"
  "components/filters/ProductGridWithFilters.tsx"
  "components/filters/PriceFilter.tsx"
  "components/filters/FilterButton.tsx"
  "components/footer/Footer.tsx"
  "components/ProductCard.tsx"
  "components/Logo.tsx"
  "components/header/HeaderNavigation.tsx"
  "components/header/MegaMenuLoader.tsx"
  "components/header/MegaMenu.tsx"
  "components/header/MegaMenuWrapper.tsx"
  "components/header/Header.tsx"
  "components/header/MobileMenu.tsx"
  "components/TrustSignals.tsx"
  "lib/shopify/products-by-type.ts"
  "lib/shopify/products.ts"
  "lib/shopify/client.ts"
  "lib/shopify/collection-mapping.ts"
  "lib/shopify/primary-collection.ts"
  "lib/navigation/menu-structure.ts"
  "lib/content/collections.ts"
)

echo "🔍 Fixing duplicates in ${#files[@]} files..."
echo ""

for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "⚠️  Skipping $file (not found)"
    continue
  fi
  
  # Get total lines
  total_lines=$(wc -l < "$file")
  
  # Find the approximate middle point (look for empty lines around halfway)
  half=$((total_lines / 2))
  
  # Search for duplicate section start (usually starts with blank lines and imports)
  # Look for patterns like: blank lines followed by "import" or "export" or interface redefinition
  split_line=$(awk '
    NR > '$half' - 20 && NR < '$half' + 20 {
      if (/^[[:space:]]*$/ && getline && /^(import|export|interface|\/\/)/) {
        print NR-1
        exit
      }
    }
  ' "$file")
  
  if [ -z "$split_line" ]; then
    # Fallback: just use halfway point
    split_line=$half
  fi
  
  # Create backup
  cp "$file" "$file.backup"
  
  # Keep only the first half
  head -n "$split_line" "$file.backup" > "$file"
  
  echo "✅ Fixed $file (kept first $split_line lines of $total_lines)"
done

echo ""
echo "✨ Done! Backups saved as .backup files"
echo "🧪 Run 'npm run build' to test"

