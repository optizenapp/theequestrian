# GMC Custom Label Validation Report

Generated: 2026-08-21T06:22:57.561Z
Total GMC items processed: 21198
Margin known: 21143 (99.7%) | unknown: 55 (0.3%)

## Margin source audit
- Primary: Shopify Admin `ProductVariant.inventoryItem.unitCost` (variant-level)
- Override: product tag `margin:<number>` / `margin:<number>%` (product-level) when present
- Ignored: qualitative `margin:high|medium|low` (not exact %)
- Formula: margin% = (selling_price − unit_cost) / selling_price × 100
- Selling price: GMC advertised price (sale_price when present)
- Profitability uses exact margin%, never the custom_label_1 band midpoint
- Unknown margin → custom_label_1=unknown, custom_label_2=do_not_advertise
- do_not_advertise items remain in the feed

### Source distribution
  unit_cost: 21143 (99.7%)
  tag: 0 (0.0%)
  unknown: 55 (0.3%)

## custom_label_0 (price tier)
  under_50: 5439 (25.7%)
  50_to_100: 4643 (21.9%)
  100_to_150: 2572 (12.1%)
  150_to_300: 4347 (20.5%)
  300_plus: 4197 (19.8%)

## custom_label_1 (margin range)
  margin_under_10: 4858 (22.9%)
  margin_10_19: 11028 (52.0%)
  margin_20_29: 1646 (7.8%)
  margin_30_39: 909 (4.3%)
  margin_40_plus: 2702 (12.7%)
  unknown: 55 (0.3%)

## custom_label_2 (profitability)
  tier_1: 9148 (43.2%)
  tier_2: 5344 (25.2%)
  tier_3: 3034 (14.3%)
  do_not_advertise: 3672 (17.3%)

## custom_label_3 (stock pressure)
  high_stock: 4295 (20.3%)
  low_stock: 16903 (79.7%)

## custom_label_4 (performance)
  bestseller: 0 (0.0%)
  slow_mover: 0 (0.0%)
  unknown: 21198 (100.0%)

## Samples — tier_1
- Product: Veredus Carbon Gel Absolute Fetlock Boots
  Variant: Black / Medium
  GMC item ID: 55377896702244
  Price: A$384.95
  Margin: 10.00% (unit_cost)
  Contribution: A$38.50
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Absolute Fetlock Boots
  Variant: Black / Large
  GMC item ID: 55377896735012
  Price: A$384.95
  Margin: 10.00% (unit_cost)
  Contribution: A$38.50
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Absolute Fetlock Boots
  Variant: Brown / Medium
  GMC item ID: 55377896767780
  Price: A$384.95
  Margin: 10.00% (unit_cost)
  Contribution: A$38.50
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Absolute Fetlock Boots
  Variant: Brown / Large
  GMC item ID: 55377896800548
  Price: A$384.95
  Margin: 10.00% (unit_cost)
  Contribution: A$38.50
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Vento STS Fetlock Boots
  Variant: Black / Medium
  GMC item ID: 55377896571172
  Price: A$359.95
  Margin: 10.00% (unit_cost)
  Contribution: A$35.99
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Vento STS Fetlock Boots
  Variant: Black / Large
  GMC item ID: 55377896603940
  Price: A$359.95
  Margin: 10.00% (unit_cost)
  Contribution: A$35.99
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Vento STS Fetlock Boots
  Variant: Brown / Medium
  GMC item ID: 55377896636708
  Price: A$359.95
  Margin: 10.00% (unit_cost)
  Contribution: A$35.99
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Vento STS Fetlock Boots
  Variant: Brown / Large
  GMC item ID: 55377896669476
  Price: A$359.95
  Margin: 10.00% (unit_cost)
  Contribution: A$35.99
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Vento STS Tendon
  Variant: Brown / Medium
  GMC item ID: 55377896833316
  Price: A$439.95
  Margin: 10.00% (unit_cost)
  Contribution: A$44.00
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Vento STS Tendon
  Variant: Black / Medium
  GMC item ID: 55377896866084
  Price: A$439.95
  Margin: 10.00% (unit_cost)
  Contribution: A$44.00
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Vento STS Tendon
  Variant: Black / Large
  GMC item ID: 55377896898852
  Price: A$439.95
  Margin: 10.00% (unit_cost)
  Contribution: A$44.00
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

- Product: Veredus Carbon Gel Vento STS Tendon
  Variant: Brown / Large
  GMC item ID: 55377896931620
  Price: A$439.95
  Margin: 10.00% (unit_cost)
  Contribution: A$44.00
  Labels: 0=300_plus | 1=margin_10_19 | 2=tier_1 | 3=low_stock | 4=unknown

## Samples — tier_2
- Product: Roeckl Lisboa Glove
  Variant: Black / 6
  GMC item ID: 55370555785508
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Navy / 6
  GMC item ID: 55370555818276
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Anthracite / 6
  GMC item ID: 55370555851044
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Black / 6.5
  GMC item ID: 55370555883812
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Navy / 6.5
  GMC item ID: 55370555916580
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Anthracite / 6.5
  GMC item ID: 55370555949348
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Black / 7
  GMC item ID: 55370555982116
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Navy / 7
  GMC item ID: 55370556014884
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Anthracite / 7
  GMC item ID: 55370556047652
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Black / 7.5
  GMC item ID: 55370556080420
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Navy / 7.5
  GMC item ID: 55370556113188
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

- Product: Roeckl Lisboa Glove
  Variant: Anthracite / 7.5
  GMC item ID: 55370556145956
  Price: A$129.95
  Margin: 10.00% (unit_cost)
  Contribution: A$12.99
  Labels: 0=100_to_150 | 1=margin_10_19 | 2=tier_2 | 3=low_stock | 4=unknown

## Samples — tier_3
- Product: Roeckl Lier Glove
  Variant: Black / 6
  GMC item ID: 55370546151716
  Price: A$69.95
  Margin: 9.99% (unit_cost)
  Contribution: A$6.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Lier Glove
  Variant: Black / 6.5
  GMC item ID: 55370546184484
  Price: A$69.95
  Margin: 9.99% (unit_cost)
  Contribution: A$6.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Lier Glove
  Variant: Black / 7
  GMC item ID: 55370546217252
  Price: A$69.95
  Margin: 9.99% (unit_cost)
  Contribution: A$6.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Lier Glove
  Variant: Black / 7.5
  GMC item ID: 55370546250020
  Price: A$69.95
  Margin: 9.99% (unit_cost)
  Contribution: A$6.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Lier Glove
  Variant: Black / 8
  GMC item ID: 55370546282788
  Price: A$69.95
  Margin: 9.99% (unit_cost)
  Contribution: A$6.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Lier Glove
  Variant: Black / 8.5
  GMC item ID: 55370546315556
  Price: A$69.95
  Margin: 9.99% (unit_cost)
  Contribution: A$6.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Samorin Glove
  Variant: Navy / 6
  GMC item ID: 55370546413860
  Price: A$79.95
  Margin: 9.99% (unit_cost)
  Contribution: A$7.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Samorin Glove
  Variant: Navy / 6.5
  GMC item ID: 55370546446628
  Price: A$79.95
  Margin: 9.99% (unit_cost)
  Contribution: A$7.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Samorin Glove
  Variant: Navy / 7
  GMC item ID: 55370546479396
  Price: A$79.95
  Margin: 9.99% (unit_cost)
  Contribution: A$7.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Samorin Glove
  Variant: Navy / 7.5
  GMC item ID: 55370546512164
  Price: A$79.95
  Margin: 9.99% (unit_cost)
  Contribution: A$7.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=high_stock | 4=unknown

- Product: Roeckl Samorin Glove
  Variant: Navy / 8
  GMC item ID: 55370546544932
  Price: A$79.95
  Margin: 9.99% (unit_cost)
  Contribution: A$7.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

- Product: Roeckl Samorin Glove
  Variant: Navy / 8.5
  GMC item ID: 55370546577700
  Price: A$79.95
  Margin: 9.99% (unit_cost)
  Contribution: A$7.99
  Labels: 0=50_to_100 | 1=margin_under_10 | 2=tier_3 | 3=low_stock | 4=unknown

## Samples — do_not_advertise
- Product: JP Equestrian Fashion - "Pippa" Shirt for Stylish Riders
  Variant: XSmall
  GMC item ID: 44328638644516
  Price: A$43.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=under_50 | 1=unknown | 2=do_not_advertise | 3=high_stock | 4=unknown

- Product: JP Equestrian Fashion - "Pippa" Shirt for Stylish Riders
  Variant: Small
  GMC item ID: 44328638677284
  Price: A$43.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=under_50 | 1=unknown | 2=do_not_advertise | 3=high_stock | 4=unknown

- Product: JP Equestrian Fashion - "Pippa" Shirt for Stylish Riders
  Variant: Medium
  GMC item ID: 44328638710052
  Price: A$43.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=under_50 | 1=unknown | 2=do_not_advertise | 3=high_stock | 4=unknown

- Product: JP Equestrian Fashion - "Pippa" Shirt for Stylish Riders
  Variant: Large
  GMC item ID: 44328638742820
  Price: A$43.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=under_50 | 1=unknown | 2=do_not_advertise | 3=high_stock | 4=unknown

- Product: Shop JP Equestrian Fashion Riding Gloves
  Variant: 6.5
  GMC item ID: 44328680653092
  Price: A$68.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=50_to_100 | 1=unknown | 2=do_not_advertise | 3=low_stock | 4=unknown

- Product: Shop JP Equestrian Fashion Riding Gloves
  Variant: 7
  GMC item ID: 44328680685860
  Price: A$68.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=50_to_100 | 1=unknown | 2=do_not_advertise | 3=low_stock | 4=unknown

- Product: Shop JP Equestrian Fashion Riding Gloves
  Variant: 7.5
  GMC item ID: 44328680718628
  Price: A$68.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=50_to_100 | 1=unknown | 2=do_not_advertise | 3=low_stock | 4=unknown

- Product: Shop JP Equestrian Fashion Riding Gloves
  Variant: 8
  GMC item ID: 44328680751396
  Price: A$68.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=50_to_100 | 1=unknown | 2=do_not_advertise | 3=low_stock | 4=unknown

- Product: Women's Breeches - "Lily Rose" by JP Equestrian Fashion
  Variant: XSmall / Navy
  GMC item ID: 44328690778404
  Price: A$88.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=50_to_100 | 1=unknown | 2=do_not_advertise | 3=high_stock | 4=unknown

- Product: Women's Breeches - "Lily Rose" by JP Equestrian Fashion
  Variant: XSmall / White with grey piping
  GMC item ID: 44328690811172
  Price: A$88.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=50_to_100 | 1=unknown | 2=do_not_advertise | 3=high_stock | 4=unknown

- Product: Women's Breeches - "Lily Rose" by JP Equestrian Fashion
  Variant: Small / Navy
  GMC item ID: 44328690843940
  Price: A$88.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=50_to_100 | 1=unknown | 2=do_not_advertise | 3=high_stock | 4=unknown

- Product: Women's Breeches - "Lily Rose" by JP Equestrian Fashion
  Variant: Small / White with grey piping
  GMC item ID: 44328690876708
  Price: A$88.00
  Margin: unknown (unknown)
  Contribution: n/a
  Labels: 0=50_to_100 | 1=unknown | 2=do_not_advertise | 3=high_stock | 4=unknown
