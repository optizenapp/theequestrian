import type { PageSEOContent } from '../run-page-seo-update';
import type { SubcollectionFrameworkNotes } from '../lib/subcollection-framework';

/**
 * /horse/boots — subcollection framework test (August 2026)
 * Central entity: horse boot. Parent /horse stays broader. Children keep type-level cores.
 */
const content: PageSEOContent = {
  url_path: '/horse/boots',

  meta_title: 'Horse Boots | Tendon, Bell & Travel',
  meta_description:
    'Horse boots for strike, brushing and overreach protection. Compare tendon, bell, travel and ice styles for work, transport and recovery.',
  h1_title: 'Horse Boots',
  breadcrumb_label: 'Boots',

  short_description: `<p>Browse <strong>horse boots</strong> that protect the lower leg where work causes the most trouble: the cannon and tendon from strikes, the fetlock from brushing, and the heel bulbs from overreach.</p>
<!--read-more-trigger-->
<p>The main decision is which injury you are guarding against, because a closed schooling boot, an open-front jumping boot and a travel boot cover different structures and stay on for different lengths of time.</p>
<p>This collection currently includes tendon, fetlock, bell, travel, ice and bandage options used for schooling, jumping, float journeys and recovery. Match the boot to the job before you shop on colour or brand.</p>`,

  long_description: `<h2>What Is a Horse Boot?</h2>
<p>A horse boot is a removable guard strapped to a defined part of the lower leg so that structure takes a strike, brush or overreach instead of bare skin or tendon.</p>
<p>That is different from a rug or saddle pad. A boot only earns its place if it covers the zone at risk for that session. The usual zones are:</p>
<ul>
<li>Cannon and tendon, where a brushing or jumping strike lands.</li>
<li>Fetlock, where the opposite limb can clip during work.</li>
<li>Heel bulbs and coronary band, where a hind foot can overreach.</li>
</ul>

<h2>Horse Boots vs Bandages and Polo Wraps</h2>
<p>Boots use a shaped shell or padded body that stays put with straps, while <a href="/horse/boots/bandages">horse bandages</a> and <a href="/horse/boots/polos-wraps">polo wraps</a> rely on wrap tension and take more skill to apply evenly.</p>
<p>A boot is usually quicker to put on and slower to over-tighten. A wrap can add support around a larger area, but uneven tension, trapped grit or a wet bandage holds heat against the tendon. Choose a boot when you need repeatable coverage; choose a wrap when you can apply it well and will check it during the session.</p>

<h2>Are Open-Front Boots Different from Closed Boots?</h2>
<p>Open-front <a href="/horse/boots/tendon-boots">tendon boots</a> leave the front of the cannon exposed so a jumping horse can feel a rail, while closed or <a href="/horse/boots/exercise">exercise boots</a> wrap more of the leg for schooling and daily work.</p>
<p><a href="/horse/boots/jumping">Jumping boots</a> often follow that open-front logic on the forelegs, with a harder strike pad over the tendon. Closed boots trade that rail feel for more brushing cover, which suits flatwork and horses that interfere. Do not treat the two as the same boot with a different name.</p>

<h2>Which Horse Boot Types Cover Which Jobs?</h2>
<p>Match the boot to the structure at risk: tendon and jumping boots for front-cannon strikes, <a href="/horse/boots/fetlock">fetlock boots</a> for hind brushing, <a href="/horse/boots/bell-boots">bell boots</a> and <a href="/horse/boots/overreach">overreach boots</a> for heel-bulb injuries, and <a href="/horse/boots/travel">travel boots</a> or <a href="/horse/boots/float">float boots</a> for longer coverage on the truck.</p>
<p>Eventing and cross-country days may call for a tougher, more enclosing <a href="/horse/boots/eventing">eventing boot</a> than an arena schooling pair. A jump or event day setup may also include a pad from our <a href="/horse/pads">saddle pads</a> range, but the pad does not replace leg protection.</p>

<h2>How Construction Changes Heat, Grip and Security</h2>
<p>Shell stiffness, lining and closure type change how a boot handles impact, sweat and movement. Neoprene and closed linings often hold more heat than a ventilated shell with a secure velcro or elastic closure.</p>
<p>Harder strike plates help when the risk is a rail or stud. Softer brushing bodies help when the risk is repeated rubbing. Fastenings should sit in the same place after a circle; a boot that rotates will rub the tendon even if the size name looks right.</p>

<h2>When Should You Boot, and When Should You Leave Legs Bare?</h2>
<p>Boot for the session that creates the risk: jumping, heavy schooling, travel, or cold therapy after work with <a href="/horse/boots/ice-boots">ice boots</a>. Leave legs bare or switch type when boots can trap grit, rub, or snag in the paddock.</p>
<p>Stable or <a href="/horse/boots/therapy">therapy boots</a> are for rest, not for replacing an exercise boot on a gallop. Magnetic and infrared styles are sold for stable use; they are not a substitute for veterinary treatment. Wet sand packed inside a boot will abrade skin faster than working bare-legged for a light session.</p>

<h2>How to Care for Horse Boots</h2>
<p>Rinse sweat and sand after work, let linings dry fully, and follow the maker's wash instructions. Heat and a washing machine can distort foam and closures if the label does not allow it.</p>
<p>Check straps, binding and lining for hard spots before the next ride. A cracked shell or a stretched elastic strap is a fit problem, not a reason to pull the boot tighter.</p>

<h2>How Should Horse Boots Fit?</h2>
<p>A correctly fitted boot sits still without rotating or leaving strap marks, with enough room at the tendons and fetlock for the horse to flex. Sizing names vary by maker, so use each product's own tape points rather than assuming a shared chart.</p>
<p>Pony, cob and full labels are common, but they are not interchangeable across brands. If a boot creeps down, gaps at the strike pad, or pinches at the pastern, change size or style instead of adding extra wrap over the top.</p>`,

  faq_items: [
    {
      question: 'What do horse boots protect?',
      answer:
        'Horse boots protect a chosen part of the lower leg from a specific injury. Tendon and jumping boots cover cannon strikes, fetlock boots cover hind brushing, and bell or overreach boots cover heel-bulb injuries. Travel and float boots cover more of the limb for longer journeys. Pick the zone first, then the boot type.',
    },
    {
      question: 'Are horse boots better than bandages?',
      answer:
        'Not automatically. Boots give repeatable strap-on coverage and are harder to over-tighten. Bandages and polo wraps can cover a larger area, but they need even tension and checking during work. Uneven wraps and wet bandages hold heat on the tendon. Use boots for speed and consistency; use wraps when you can apply them well.',
    },
    {
      question: 'Should jumping horses wear open-front tendon boots?',
      answer:
        'Many jumping horses wear open-front tendon boots on the forelegs so the cannon can still feel a rail, with a strike pad over the tendon. Closed exercise boots cover more of the leg and suit schooling. Hind legs often use fetlock boots instead. Follow your discipline rules and the horse\'s way of going.',
    },
    {
      question: 'Can horses wear boots in the paddock?',
      answer:
        'Usually no, unless the boot is made for turnout and fitted so it cannot snag. Exercise and tendon boots can fill with dirt, rub, or catch on fences. Bell boots are sometimes used to limit overreach at grass, but they still need checking. For rest, use a stable or therapy boot only as directed, not an arena boot left on overnight.',
    },
    {
      question: 'How should horse boots fit?',
      answer:
        'The boot should stay in place without rotating, pinching the tendon, or leaving deep strap marks after work. The horse must still flex the fetlock freely. Size names such as pony, cob and full differ by maker, so measure to that product\'s chart. If the boot creeps or gaps, change size or style rather than over-tightening.',
    },
  ],
};

export const frameworkNotes: SubcollectionFrameworkNotes = {
  centralEntity: 'horse boot',
  primaryAngle:
    'This page is primarily about how boot type maps to injury mechanism (strike, brushing, overreach) and work context (schooling, jumping, travel, recovery).',
  informationGain: [
    'Boots cover a defined lower-leg zone; they are not a generic leg-protection layer like a rug or pad.',
    'Open-front tendon/jumping boots leave the cannon able to feel a rail; closed exercise boots wrap more for schooling.',
    'Boots use a shell and straps; bandages and polos depend on wrap tension and hold more heat if wet or uneven.',
    'Neoprene and closed linings trap more heat and sweat than a ventilated shell with a stable closure.',
    'Travel and float boots stay on longer and cover more limb than an exercise boot used for a ridden session.',
    'Ice boots are for cold therapy after work; therapy and magnetic boots are stable-rest products, not gallop boots.',
    'Paddock use is a snag and grit risk for most exercise and tendon boots.',
    'Fit is rotation and pressure, not a shared pony/cob/full chart across brands.',
  ],
  closestSibling: '/horse/boots/tendon-boots and /horse/boots/bandages',
  overlapSplit: `Horse boots (this page): injury-zone map, open-front vs closed, when not to boot.
Tendon boots: strike pads, open-front jumping construction, tendon-specific fit.
Bandages: wrap tension, polo vs stable bandage, heat and application skill.`,
  verifyBeforePublishing: [
    'related_categories still points at /horse/bandages; canonical bandage PLP is /horse/boots/bandages. Runner does not rewrite related_categories.',
    'Do not hardcode live product counts; the storefront count changes.',
    'No shared size run (XS–XXL or one cob/full chart) is claimed; makers differ.',
    'Brand facet URLs /horse/boots/kentucky, /horse/boots/woof-wear, /horse/boots/zandona are not type pages and are not linked.',
    'No medical claims for magnetic, infrared or ice products beyond labelled use.',
    'Child URLs linked below were published in inspect on 2026-08-19.',
  ],
  anchors: [
    { text: 'horse bandages', href: '/horse/boots/bandages' },
    { text: 'polo wraps', href: '/horse/boots/polos-wraps' },
    { text: 'tendon boots', href: '/horse/boots/tendon-boots' },
    { text: 'exercise boots', href: '/horse/boots/exercise' },
    { text: 'Jumping boots', href: '/horse/boots/jumping' },
    { text: 'fetlock boots', href: '/horse/boots/fetlock' },
    { text: 'bell boots', href: '/horse/boots/bell-boots' },
    { text: 'overreach boots', href: '/horse/boots/overreach' },
    { text: 'travel boots', href: '/horse/boots/travel' },
    { text: 'float boots', href: '/horse/boots/float' },
    { text: 'eventing boot', href: '/horse/boots/eventing' },
    { text: 'saddle pads', href: '/horse/pads' },
    { text: 'ice boots', href: '/horse/boots/ice-boots' },
    { text: 'therapy boots', href: '/horse/boots/therapy' },
  ],
  inboundTally: {
    '/horse/boots/accessories': 0,
    '/horse/boots/bandages': 1,
    '/horse/boots/bell-boots': 1,
    '/horse/boots/eventing': 1,
    '/horse/boots/exercise': 1,
    '/horse/boots/fetlock': 1,
    '/horse/boots/float': 1,
    '/horse/boots/fly-boots': 0,
    '/horse/boots/ice-boots': 1,
    '/horse/boots/jumping': 1,
    '/horse/boots/kentucky': 0,
    '/horse/boots/magnetic': 0,
    '/horse/boots/overreach': 1,
    '/horse/boots/polos-wraps': 1,
    '/horse/boots/stable': 0,
    '/horse/boots/tendon-boots': 1,
    '/horse/boots/therapy': 1,
    '/horse/boots/travel': 1,
    '/horse/boots/woof-wear': 0,
    '/horse/boots/zandona': 0,
    '/horse/pads': 1,
  },
};

export default content;
