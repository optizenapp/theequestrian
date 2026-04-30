import { TIMING } from './slides';

const FADE = 0.35;

export function buildAnimationsScript(): string {
  const T = TIMING;
  const s1End = T.s1.start + T.s1.dur;
  const s2End = T.s2.start + T.s2.dur;
  const s3End = T.s3.start + T.s3.dur;
  const s4End = T.s4.start + T.s4.dur;
  const stEnd = T.stinger.start + T.stinger.dur;

  return `
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
const maybeTo=(selector,vars,at)=>{if(document.querySelector(selector)){tl.to(selector,vars,at);}};

gsap.set("#slide-0",{opacity:0});
gsap.set(["#slide-1","#slide-2","#slide-3","#slide-4"],{opacity:0});
gsap.set(".s0-mark",{scale:0.7,opacity:0});
gsap.set(".s1-eyebrow,.s1-title,.divider,.s1-sub",{opacity:0,y:24});
gsap.set(".s1 .site-corner",{opacity:0,y:-12});
gsap.set(".s1-right .brand-stack",{opacity:0,scale:0.96});
gsap.set(".category-grid-stack .pg-hero,.category-grid-stack .pg-cell",{opacity:0,y:14});
gsap.set(".s2 .eyebrow,.s2 .about,.s2 .s2-headline,.s2 .s2-sub,.s2 .s2-cta,.s2 .s2-link",{opacity:0,y:18});
gsap.set(".s2 #p1",{opacity:0,y:32,scale:0.98});
gsap.set(".s3 .eyebrow,.s3 .s3-title",{opacity:0,y:18});
gsap.set(".s3 #p2",{opacity:0,y:32,scale:0.97});
gsap.set(".s3 #p3",{opacity:0,y:32,scale:0.97});
gsap.set(".s4 .eyebrow,.s4 .s4-headline,.s4 .s4-cta,.s4 .s4-foot,.s4 .s4-strip",{opacity:0,y:18});
gsap.set(".s4-cta",{scale:0.94});

tl.to("#slide-0",{opacity:1,duration:0.18,ease:"power2.out"},${T.stinger.start})
  .to(".s0-mark",{opacity:1,scale:1,duration:0.45,ease:"back.out(1.6)"},${T.stinger.start})
  .to(".s0-mark",{scale:1.05,duration:0.18,ease:"power1.in"},${stEnd - 0.2})
  .to("#slide-0",{opacity:0,duration:0.2,ease:"power2.in"},${stEnd - 0.2});

tl.to("#slide-1",{opacity:1,duration:${FADE},ease:"power2.out"},${T.s1.start})
  .to(".s1-eyebrow",{opacity:1,y:0,duration:0.5,ease:"power2.out"},${T.s1.start + 0.05})
  .to(".s1-title",{opacity:1,y:0,duration:0.65,ease:"power3.out"},${T.s1.start + 0.18})
  .to(".divider",{opacity:1,y:0,duration:0.4,ease:"power2.out"},${T.s1.start + 0.42})
  .to(".s1-sub",{opacity:1,y:0,duration:0.5,ease:"power2.out"},${T.s1.start + 0.55})
  .to(".s1 .site-corner",{opacity:1,y:0,duration:0.45,ease:"power2.out"},${T.s1.start + 0.18})
  .to(".s1-right .brand-stack",{opacity:1,scale:1,duration:0.7,ease:"power3.out"},${T.s1.start + 0.28})
  .to(".category-grid-stack .pg-hero",{opacity:1,y:0,duration:0.45,ease:"power2.out"},${T.s1.start + 0.42})
  .to(".category-grid-stack .pg-cell",{opacity:1,y:0,duration:0.4,stagger:0.08,ease:"power2.out"},${T.s1.start + 0.5})
  .to(".s1-right .brand-stack",{scale:1.04,duration:${T.s1.dur - 0.4},ease:"sine.inOut"},${T.s1.start + 0.32})
  .to("#slide-1",{opacity:0,duration:${FADE},ease:"power2.in"},${s1End - FADE});

tl.to("#slide-2",{opacity:1,duration:${FADE},ease:"power2.out"},${T.s2.start})
  .to(".s2 .eyebrow",{opacity:1,y:0,duration:0.45,ease:"power2.out"},${T.s2.start + 0.1})
  .to(".s2 .s2-headline",{opacity:1,y:0,duration:0.6,ease:"power3.out"},${T.s2.start + 0.22})
  .to(".s2 .s2-sub",{opacity:1,y:0,duration:0.55,ease:"power2.out"},${T.s2.start + 0.4})
  .to(".s2 .s2-cta",{opacity:1,y:0,duration:0.55,ease:"back.out(1.4)"},${T.s2.start + 0.55})
  .to(".s2 .s2-link",{opacity:1,y:0,duration:0.45,ease:"power2.out"},${T.s2.start + 0.7})
  .to(".s2 #p1",{opacity:1,y:0,scale:1,duration:0.7,ease:"power3.out"},${T.s2.start + 0.3})
  .to("#slide-2",{opacity:0,duration:${FADE},ease:"power2.in"},${s2End - FADE});
maybeTo(".s2 .about",{opacity:1,y:0,duration:0.65,ease:"power2.out"},${T.s2.start + 0.25});

tl.to("#slide-3",{opacity:1,duration:${FADE},ease:"power2.out"},${T.s3.start})
  .to(".s3 .eyebrow",{opacity:1,y:0,duration:0.45,ease:"power2.out"},${T.s3.start + 0.1})
  .to(".s3 .s3-title",{opacity:1,y:0,duration:0.55,ease:"power2.out"},${T.s3.start + 0.2})
  .to(".s3 #p2",{opacity:1,y:0,scale:1,duration:0.65,ease:"power3.out"},${T.s3.start + 0.3})
  .to(".s3 #p3",{opacity:1,y:0,scale:1,duration:0.65,ease:"power3.out"},${T.s3.start + 0.42})
  .to("#slide-3",{opacity:0,duration:${FADE},ease:"power2.in"},${s3End - FADE});

tl.to("#slide-4",{opacity:1,duration:${FADE},ease:"power2.out"},${T.s4.start})
  .to(".s4 .eyebrow",{opacity:1,y:0,duration:0.4,ease:"power2.out"},${T.s4.start + 0.1})
  .to(".s4 .s4-headline",{opacity:1,y:0,duration:0.55,ease:"power3.out"},${T.s4.start + 0.2})
  .to(".s4 .s4-cta",{opacity:1,y:0,scale:1,duration:0.55,ease:"back.out(1.4)"},${T.s4.start + 0.4})
  .to(".s4 .s4-foot",{opacity:1,y:0,duration:0.4,ease:"power2.out"},${T.s4.start + 0.55})
  .to(".s4 .s4-strip",{opacity:1,y:0,duration:0.5,ease:"power2.out"},${T.s4.start + 0.65});

window.__timelines["main"]=tl;
`;
}
