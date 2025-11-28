# Collection → Product Type Mapping Template

## Instructions

1. **Fill in the mapping** - Map each collection to product type subcollections
2. **Add exclusions** - List product types to exclude (won't create subcategories)
3. **Add merges** - Combine multiple product types into one subcategory
4. **Save as CSV** - Save this file as `mapping.csv` in the `exports` folder

---

## Mapping Format

### Column Headers:
- `collection_handle` - The collection handle (e.g., "footwear")
- `collection_title` - Collection title (for reference)
- `product_type` - Product type to map (e.g., "Riding Boots")
- `subcategory_handle` - Normalized subcategory handle (e.g., "riding-boots")
- `action` - Action: "include", "exclude", or "merge"
- `merge_to` - If merging, what subcategory to merge into
- `notes` - Any notes

---

## Example Mapping

```csv
collection_handle,collection_title,product_type,subcategory_handle,action,merge_to,notes
footwear,Horse Riding Boots & Footwear,Riding Boots,riding-boots,include,,
footwear,Horse Riding Boots & Footwear,Boots,boots,include,,
footwear,Horse Riding Boots & Footwear,Spurs,spurs,include,,
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge into spurs-straps
footwear,Horse Riding Boots & Footwear,Test Product Type,,exclude,,"Don't create subcategory"
```

---

## Actions Explained

### `include` (Default)
- Creates subcategory URL: `/{collection}/{subcategory_handle}`
- Products with this product type will appear in this subcategory

### `exclude`
- Product type is ignored
- Products won't appear in any subcategory (only in main collection)
- Use for generic or non-category product types

### `merge`
- Merges this product type into another subcategory
- Set `merge_to` to the target subcategory handle
- Example: "RIDER: Spurs & Straps" → merge into "spurs-straps"

---

## CSV Template

```csv
collection_handle,collection_title,product_type,subcategory_handle,action,merge_to,notes
```

---

## Tips

1. **Normalize handles** - Use lowercase, hyphens instead of spaces
   - "Riding Boots" → "riding-boots"
   - "Spurs & Straps" → "spurs-straps"

2. **Check for duplicates** - Same subcategory handle should only appear once per collection

3. **Test mappings** - Use the import script with `--dry-run` first

4. **Review exclusions** - Make sure you're not excluding important product types

5. **Document merges** - Add notes explaining why product types are merged

---

## After Creating Mapping

1. Save as `exports/mapping.csv`
2. Run import script: `npm run import:mapping`
3. Review changes with `--dry-run` first
4. Apply changes: `npm run import:mapping -- --apply`






## Instructions

1. **Fill in the mapping** - Map each collection to product type subcollections
2. **Add exclusions** - List product types to exclude (won't create subcategories)
3. **Add merges** - Combine multiple product types into one subcategory
4. **Save as CSV** - Save this file as `mapping.csv` in the `exports` folder

---

## Mapping Format

### Column Headers:
- `collection_handle` - The collection handle (e.g., "footwear")
- `collection_title` - Collection title (for reference)
- `product_type` - Product type to map (e.g., "Riding Boots")
- `subcategory_handle` - Normalized subcategory handle (e.g., "riding-boots")
- `action` - Action: "include", "exclude", or "merge"
- `merge_to` - If merging, what subcategory to merge into
- `notes` - Any notes

---

## Example Mapping

```csv
collection_handle,collection_title,product_type,subcategory_handle,action,merge_to,notes
footwear,Horse Riding Boots & Footwear,Riding Boots,riding-boots,include,,
footwear,Horse Riding Boots & Footwear,Boots,boots,include,,
footwear,Horse Riding Boots & Footwear,Spurs,spurs,include,,
footwear,Horse Riding Boots & Footwear,Spurs & Straps,spurs-straps,include,,
footwear,Horse Riding Boots & Footwear,RIDER: Spurs & Straps,spurs-straps,merge,spurs-straps,Merge into spurs-straps
footwear,Horse Riding Boots & Footwear,Test Product Type,,exclude,,"Don't create subcategory"
```

---

## Actions Explained

### `include` (Default)
- Creates subcategory URL: `/{collection}/{subcategory_handle}`
- Products with this product type will appear in this subcategory

### `exclude`
- Product type is ignored
- Products won't appear in any subcategory (only in main collection)
- Use for generic or non-category product types

### `merge`
- Merges this product type into another subcategory
- Set `merge_to` to the target subcategory handle
- Example: "RIDER: Spurs & Straps" → merge into "spurs-straps"

---

## CSV Template

```csv
collection_handle,collection_title,product_type,subcategory_handle,action,merge_to,notes
```

---

## Tips

1. **Normalize handles** - Use lowercase, hyphens instead of spaces
   - "Riding Boots" → "riding-boots"
   - "Spurs & Straps" → "spurs-straps"

2. **Check for duplicates** - Same subcategory handle should only appear once per collection

3. **Test mappings** - Use the import script with `--dry-run` first

4. **Review exclusions** - Make sure you're not excluding important product types

5. **Document merges** - Add notes explaining why product types are merged

---

## After Creating Mapping

1. Save as `exports/mapping.csv`
2. Run import script: `npm run import:mapping`
3. Review changes with `--dry-run` first
4. Apply changes: `npm run import:mapping -- --apply`




