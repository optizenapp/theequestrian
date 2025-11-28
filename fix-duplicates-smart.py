#!/usr/bin/env python3
"""
Smart duplicate removal script
Finds exact duplicate boundaries in TypeScript/JavaScript files
"""

import os
import re
from pathlib import Path
from typing import Optional

def find_duplicate_boundary(content: str, lines: list) -> Optional[int]:
    """
    Find the exact line where duplication starts.
    Returns the line number (1-indexed) or None if no duplicate found.
    """
    total_lines = len(lines)
    
    # Strategy 1: Look for duplicate export statements with same name
    export_pattern = r'^export\s+(?:async\s+)?(?:function|const|interface|type|class)\s+(\w+)'
    exports = {}
    
    for i, line in enumerate(lines, 1):
        match = re.match(export_pattern, line.strip())
        if match:
            export_name = match.group(1)
            if export_name in exports:
                # Found duplicate export - this is likely the start of duplication
                return exports[export_name]
            exports[export_name] = i
    
    # Strategy 2: Look for duplicate import blocks
    # Find all import block starts after the first one
    import_blocks = []
    in_imports = False
    block_start = None
    
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('import '):
            if not in_imports:
                block_start = i
                in_imports = True
        elif in_imports and stripped and not stripped.startswith('import'):
            in_imports = False
            if block_start:
                import_blocks.append(block_start)
                block_start = None
    
    # If we have more than one import block, second one is likely the duplicate start
    if len(import_blocks) >= 2:
        return import_blocks[1] - 3  # Go back a few lines to catch comment blocks
    
    # Strategy 3: Look for duplicate comment headers
    comment_header_pattern = r'^\s*/?\*\*?\s*$'
    comment_headers = []
    
    for i, line in enumerate(lines, 1):
        if re.match(comment_header_pattern, line):
            # Check if next few lines look like a header comment
            if i < len(lines) - 2:
                next_lines = lines[i:i+3]
                if any('*' in l for l in next_lines):
                    comment_headers.append(i)
    
    # If we have multiple similar comment headers in the second half, that's suspicious
    if len(comment_headers) >= 2:
        mid_point = total_lines // 2
        second_half_headers = [h for h in comment_headers if h > mid_point]
        if second_half_headers:
            return second_half_headers[0] - 2
    
    # Strategy 4: Look for exact line matches in second half that match beginning
    # Compare chunks of 5 lines
    chunk_size = 5
    first_quarter_chunks = {}
    
    for i in range(0, min(total_lines // 4, 100), 1):
        if i + chunk_size < len(lines):
            chunk = '\n'.join(lines[i:i+chunk_size])
            if chunk.strip():  # Ignore empty chunks
                first_quarter_chunks[chunk] = i
    
    # Now check second half for matching chunks
    for i in range(total_lines // 3, total_lines - chunk_size):
        chunk = '\n'.join(lines[i:i+chunk_size])
        if chunk in first_quarter_chunks:
            # Found a matching chunk in the second half
            return i + 1
    
    return None

def remove_duplicates(file_path: Path) -> bool:
    """
    Remove duplicates from a file. Returns True if file was modified.
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            lines = content.splitlines(keepends=True)
        
        duplicate_start = find_duplicate_boundary(content, lines)
        
        if duplicate_start and duplicate_start > 10:
            # Found duplicate - remove everything from that line onwards
            original_line_count = len(lines)
            cleaned_lines = lines[:duplicate_start - 1]
            
            # Ensure file ends with a newline
            if cleaned_lines and not cleaned_lines[-1].endswith('\n'):
                cleaned_lines[-1] += '\n'
            
            # Write back
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(cleaned_lines)
            
            removed = original_line_count - len(cleaned_lines)
            print(f"✅ {file_path}")
            print(f"   Removed {removed} duplicate lines (kept {len(cleaned_lines)} lines)")
            return True
        
        return False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def main():
    # Files with known duplicates
    files = [
        "app/products/[handle]/page.tsx",
        "app/font-test/page.tsx",
        "app/[category]/page.tsx",
        "app/[category]/[subcategory]/[product]/page.tsx",
        "app/[category]/[subcategory]/page.tsx",
        "app/api/admin/analyze-product-types/route.ts",
        "app/api/admin/set-primary-collections/route.ts",
        "app/api/admin/debug-subcategory/route.ts",
        "app/api/admin/list-collections/route.ts",
        "app/api/admin/list-subcategories/route.ts",
        "app/api/admin/get-collection/route.ts",
        "components/filters/CategoryFilter.tsx",
        "components/filters/FilterSidebar.tsx",
        "components/filters/FilterChips.tsx",
        "components/filters/ProductGridWithFilters.tsx",
        "components/filters/PriceFilter.tsx",
        "components/filters/FilterButton.tsx",
        "components/footer/Footer.tsx",
        "components/ProductCard.tsx",
        "components/Logo.tsx",
        "components/header/HeaderNavigation.tsx",
        "components/header/MegaMenuLoader.tsx",
        "components/header/MegaMenu.tsx",
        "components/header/MegaMenuWrapper.tsx",
        "components/header/Header.tsx",
        "components/header/MobileMenu.tsx",
        "components/TrustSignals.tsx",
        "lib/structured-data/collection.ts",
        "lib/shopify/products-by-type.ts",
        "lib/shopify/products.ts",
        "lib/shopify/client.ts",
        "lib/shopify/collection-mapping.ts",
        "lib/shopify/primary-collection.ts",
        "lib/navigation/menu-structure.ts",
        "lib/content/collections.ts",
    ]
    
    print("🔍 Smart duplicate removal")
    print(f"📁 Processing {len(files)} files...\n")
    
    fixed = 0
    skipped = 0
    
    for file_path_str in files:
        file_path = Path(file_path_str)
        if not file_path.exists():
            print(f"⚠️  Skipping {file_path} (not found)")
            skipped += 1
            continue
        
        if remove_duplicates(file_path):
            fixed += 1
        else:
            print(f"⏭️  {file_path} (no duplicates found)")
            skipped += 1
    
    print(f"\n✨ Done!")
    print(f"   Fixed: {fixed} files")
    print(f"   Skipped: {skipped} files")
    print(f"\n🧪 Run 'npm run build' to test")

if __name__ == "__main__":
    main()

