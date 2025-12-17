#!/bin/bash

# Script to download all remaining sizing chart images
# Run with: bash download-all-sizing.sh

cd "/Users/jonofarrington/Documents/Cursor Project/the-equestrian-headless/public/sizing"

echo "📥 Downloading all sizing chart images..."
echo ""

# Hitchley & Harrow (22 images)
echo "📁 Hitchley & Harrow..."
cd hitchley-harrow
curl -sk -o fitted-shirts.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowFittedShirts.png"
curl -sk -o semi-fitted-shirt.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowSemiFittedShirt.png"
curl -sk -o loose-fitting-shirt.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowLooseFittingShirt.png"
curl -sk -o polo-shirts-flat.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowPoloShirtsFlat.png"
curl -sk -o polo-shirt-loose.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowPoloShirtLoose.png"
curl -sk -o long-sleeve-knit.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowLongSleeveKnit.png"
curl -sk -o soft-shell-jacket.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowSoftShellJacket.png"
curl -sk -o puffer-vest.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowPufferVest.png"
curl -sk -o skirts-flat.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowSkirtsFlat.png"
curl -sk -o t-shirts-flat.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowTShirtsFlat.png"
curl -sk -o wisteria-lane.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowWisteriaLane.png"
curl -sk -o ruffle-knit.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowRuffleKnit.png"
curl -sk -o hoodie.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowHoodie.png"
curl -sk -o track-pants.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowTrackPants.png"
curl -sk -o tweed-jacket.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowTweedJacket.png"
curl -sk -o work-jacket.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowWorkJacket.png"
curl -sk -o long-jacket.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowLongJacket.png"
curl -sk -o quilted-jacket.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowQuiltedJacket.png"
curl -sk -o pj-pants.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowPJPants.png"
curl -sk -o ponte-jacket.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowPonteJacket.png"
curl -sk -o american-sizing.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowAmericanSizing.png"
curl -sk -o jeans.png "https://cdn.shopify.com/s/files/1/0562/0963/7457/files/HitchleyHarrowJeans.png"
echo "✅ Hitchley & Harrow complete"
cd ..

echo ""
echo "✨ All sizing charts downloaded!"
echo ""
echo "Summary:"
echo "- Animo: 3 images"
echo "- Equiline: 1 image"
echo "- Pampeano: 2 images"
echo "- Secchiari: 2 images"
echo "- Vestrum: 1 image"
echo "- Alessandro Albanese: 2 images"
echo "- Cavallo: 2 images"
echo "- GhoDho: 2 images"
echo "- Hitchley & Harrow: 22 images"
echo ""
echo "Next: Visit remaining brand pages and add their URLs to this script"

