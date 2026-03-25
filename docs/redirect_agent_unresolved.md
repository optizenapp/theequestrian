# Redirect agent — unresolved destinations

Rows from [redirect_agent_action_summary.csv](redirect_agent_action_summary.csv) where **recommended_url** is empty. Per [agent_execution_prompt.md](agent_execution_prompt.md), do not guess replacements; resolve final 200 URL (e.g. curl -sIL) or fix in CMS.

| issue_type | priority | dest_path | inlink_rows | action |
|------------|----------|-----------|-------------|--------|
| 3xx | P1 | /horse/rugs/travel | 11 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P1 | /horse/stable/bags | 23 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P1 | /horse/stable/storage | 21 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P1 | /pet/small-animal/peters-treat-lucerne-bowl-dried-carrot-130gm | 4 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P1 | /rider/accessories/hats | 13 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P2 | /accessories/gifts/rm-williams-script-logo-4pc-coaster-set | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P2 | /clothing/accessories/hats/hat-cleaning-sponges-pack-of-2 | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P2 | /clothing/bottoms/shorts/nicholson-short-denim | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P2 | /clothing/mens/show-jackets | 7 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P2 | /clothing/mens/tops | 4 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P2 | /clothing/tops/knitwear/ariat-ballston-cardigan-l | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P2 | /clothing/womens/breeches/coolmax-black-breeches-in-sizes-6-to-28-no-silicone | 5 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P2 | /clothing/womens/jeans/indi-womens-high-rise-bootleg-jean | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P2 | /horse/veterinary/arcequine-leg-liners-3-pack | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P2 | /horse/veterinary/donation-product | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P2 | /pet/food | 6 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P2 | /rider/helmets/accessories/cromo-2-0-configurator-cross-country-visor-options | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | / | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | />https://www.theequestrian.com.au/blogs/news/best-horse-supplements | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /accessories/brands/horseware | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /accessories/collectibles/resin | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /accessories/gifts/2025-vip-gift | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /accessories/gifts/christmas-tree | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /accessories/gifts/hw-cabbage-bowl-small | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /accessories/homeware | 2 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /blogs/horse-nutrition/how-to-incorporate-brewers-yeast-into-a-horses-diet | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /blogs/news/laminitis-horse | 3 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /clothing/accessories/beanies | 5 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /clothing/accessories/belts/qjrw-elasticised-belts | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /clothing/accessories/hats/hw-3x3-fr-horn-sunburst | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /clothing/accessories/socks/knitted-socks | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /clothing/activewear | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /clothing/footwear/ariat | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /clothing/footwear/ariat-mens-heritage-roper-wide-square-toe | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /clothing/footwear/tucci | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /clothing/kids/tops/thomas-cook-buttercup-girls-tee | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /clothing/outerwear/jackets/cavalleria-toscana-mens-tech-knit-zip-riding-jacket | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /clothing/tops/base-layers | 3 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /clothing/tops/shirts/ojai-shirt-l | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /clothing/tops/shirts/rm-williams-undara-classic-oxford-shirt | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /clothing/tops/vests/pilbara-mens-vest | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /customer-reviews-section | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /customer-reviews/eurohunter-products | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /horse-bridle-buying-guide | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /horse-care-tips-and-tricks | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /horse/accessories | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/bits/pelham-bits | 2 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/bonnets/animo-widos-saddle-pad | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/bonnets/fly-masks/flyveils-by-design-100-uv-nose | 2 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/bonnets/fly-veils | 5 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/boots/bandages/waldhausen-florence-fleece-bandages-night-blue | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/boots/fetlock/kentucky-horsewear-moonboots-air-x-elastic | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/boots/polos-wraps/psos-polos-moss | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/boots/polos-wraps/psos-polos-neptuna | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/boots/tendon | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/boots/tendon-boots/pei-kevlar-airtechnology-tendon-boots | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/grooming/brushes/haas-wash-brush | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/grooming/coat-care/blue-ribbon-conditioner-1l | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/grooming/coat-care/ntr-mark-hold-250ml | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/grooming/dr-show-all-in-1-shampoo-1lt | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/grooming/equidae-soothing-calm-aloe-vera-spray-500ml | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /horse/grooming/plaiting/plaiting-thread-spool-brown | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/grooming/shampoo/equidae-soothing-calm-shampoo-500ml | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/halters/breakaway | 2 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/halters/leads/training-lead-snap-12ft-3-66mt-eurohunter-purple | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/halters/leads/training-lead-snap-23ft-7-01mt-eurohunter-black | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/halters/pei-techno-wool-lined-head-collar | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /horse/pads/jumping/animo-widos-jumping-saddle-pad | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/pads/jumping/kentucky-saddle-pad-glitter-stones-jumping | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/pads/jumping/premier-equine-close-contact-tech-grip-pro-anti-slip-saddle-pad-gp-jump-square | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/pads/sheepskin | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/rugs/hoods/horseware-rambo-slinky-hood | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/rugs/horseware-rambo-summer-series-turnout | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /horse/rugs/pei-titan-300g-turnout-rug-with-neck-cover | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/rugs/summer/kool-master-shade-mesh-combo-turquoise-navy | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/rugs/winter/minature-zilco-mighty-mini-combo | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/saddle-buying-guide | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /horse/saddles/accessories/saddle-fit-and-adjustment | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /horse/saddles/stock-western/montana-western-saddle-brown-14 | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/stable/farrier/spanner-set-for-studs | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/stable/fly-repellant | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/stable/hay-feeders | 3 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/stable/hay-nets/gutzbusta®-knotless-hay-nets-small | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/stable/hoof-care/hoof-oil | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/stable/hoof-care/tubbease-hoof-sock-6-sizes | 3 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/stable/leather-care/sterling-essentials-floral-citrus-leather-care-trio | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/stable/stable-accessories | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/supplements/joint | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/supplements/kelato | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/supplements/msm | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/supplements/psyllium-husk | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/tack/breastplates-martingales | 2 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/tack/browbands | 2 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/tack/freejump-stirrups | 2 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/tack/number-holders/equestrian-australia-stallion-hamag™-halter-disc-single-with-velcro-holder | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /horse/tack/stirrup-leathers/stirrup-leathers-pvc-horsesense-1-brown-56 | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /horse/veterinary/first-aid/kelato-cotton-wool-gauze-500gm-roll-30cm-x-3-5mt | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/veterinary/therapy-equipment | 2 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /horse/veterinary/wound-care | 3 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /news/Psyllium%20Husk | 2 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /pages/rapid-search-results | 5 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /pet/bird/toys/bird-toy-safety-guidelines | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /pet/dog/accessories/dog-cushion-covers | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /pet/dog/accessories/premium-dog-bone-tags | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /pet/dog/coats-and-rugs/airyvest-sizing-guide | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /pet/dog/coats-and-rugs/zeez-dog-coat-supreme-flamingo-pink-grey | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /pet/dog/toy-care-guide | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /pet/dog/veterinary/credelio-plus-for-small-dogs-2-8-5-5-kg-pink-3-chews | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /pet/food-storage-tips | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /pet/supplements/precision-microbes-pet | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /product-care-guides/training-leads | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /products/grey-mia-phone-pocket-breech-by-qj-riding-wear | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /products/lemieux-rubber-bell-boots | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /products/maxwell-bell-boots | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /products/qj-riding-wear-millie-winter-breech | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /products/sale-navy-lauren-breech-by-qj-riding-wear | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /rewards-program | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /rider/accessories/hatbands/classic-adjustable-horsehair-hatband | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /rider/accessories/hw-picnic-mat-tropicana-2m-x-2m | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /rider/accessories/water-bottles | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 3xx | P3 | /rider/helmets/brims | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /rider/helmets/cromo-2-0-configurator-front-panel-options-2 | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /rider/helmets/kep-smart-helmet-blue-5 | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 4xx | P3 | /rider/helmets/samshield-helmet-safety-features | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /rider/jewellery/pendants/horseshoe-keepsake-memorial-necklace-2 | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /rider/luggage/bags/smoothie-cup-stainless-cobalt-check-500ml | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
| 3xx | P3 | /rider/luggage/saddle-bags | 1 | Resolve final 200 destination for bad_url, then replace internal links directly to that final URL |
| 4xx | P3 | /saddle-maintenance-tips | 1 | Broken internal link with no redirect-map match. Resolve destination manually, then update source links |
