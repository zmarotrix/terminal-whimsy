/* Terminal Whimsy: the wisp's toybox. Fizzlewick built it; players install it in the terminal (dpkg -i).
   A toy bar on every page with a purse and Fizzlewick's Wares. Toys land on the page as things the wisp
   reacts to and plays with on its own: they plug into the wisp's mind (wispmind.js) as choices it can make.
   It can be put away from the bar, the footer or the terminal (toybox off); coins and toys are kept.
   Only loaded once unlocked, and only while it's on. */
(() => {
"use strict";
const X = window.TWX, mind = X && X.mind;
if (!X || !mind || X.toybox) return;
const { D, $, $$, esc, ICON, store, award, wisp, fx, burst, REDUCE, notice } = X;
const TL = (D.WISP && D.WISP.toy) || {}, SHOP = D.TOYSHOP || {}, TOYS = D.TOYS || [], BY = Object.fromEntries(TOYS.map(t => [t.id, t]));
const { M, say, feel, face, fill, pick } = mind;
const rnd = n => Math.random() * n | 0;
const now = () => Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const orb = $(".orb", wisp.el);
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];

/* =================== looks =================== */
const css = document.createElement("style");
css.textContent = `
:root{--toybar:0px;--toylift:0px}
body.toyon{padding-bottom:var(--toybar)}
body.toyon .toasts{bottom:calc(20px + var(--toybar) + env(safe-area-inset-bottom,0px))}
body.toyon .wisp{bottom:calc(16px + var(--toylift) + env(safe-area-inset-bottom,0px))}
.toybar{position:fixed;z-index:96;left:50%;bottom:calc(8px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;align-items:center;gap:.5rem;padding:.38rem .45rem;border-radius:12px;max-width:calc(100vw - 16px);
  background:linear-gradient(180deg,rgba(26,30,44,.97),rgba(9,11,18,.98));border:1px solid #3a4157;box-shadow:0 12px 34px rgba(0,0,0,.6),0 0 0 1px #000,inset 0 1px 0 rgba(255,255,255,.06);font-family:var(--f-sans);animation:tbin .45s cubic-bezier(.2,1.3,.4,1)}
@keyframes tbin{from{transform:translate(-50%,120%);opacity:0}}
.tb-unit{display:flex;align-items:center;gap:.45rem;padding:0 .55rem 0 .1rem;border-right:1px solid #2a3044;cursor:default;flex:none}
.tb-unit .mini-wisp{width:36px;height:36px;animation:none;box-shadow:0 0 12px 2px rgba(124,242,154,.35)}
.tb-who{display:flex;flex-direction:column;gap:2px;min-width:74px}
.tb-who b{font:700 .78rem/1 var(--f-display);color:var(--term);letter-spacing:.04em}
.tb-rep{font:600 .64rem/1 var(--f-mono);letter-spacing:.06em}
.tb-needs{display:grid;gap:2px}
.tb-needs i{display:block;width:74px;height:5px;border-radius:3px;background:#05070c;box-shadow:0 0 0 1px #000;overflow:hidden}
.tb-needs s{display:block;height:100%;width:var(--v,50%);transition:width .6s}
.tb-needs .fed s{background:linear-gradient(90deg,#1f9e46,#4fe07a)}.tb-needs .fun s{background:linear-gradient(90deg,#b04cd6,#e889ff)}.tb-needs .rest s{background:linear-gradient(90deg,#1c5fc4,#5aa8ff)}
.tb-slots{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:3px 2px}
.tb-slots::-webkit-scrollbar{display:none}
.tb-slot{position:relative;flex:none;width:40px;height:40px;padding:0;border:0;border-radius:6px;background:#05070c;cursor:pointer;box-shadow:0 0 0 1px #000,0 0 0 2px #4b5064;transition:transform .08s,box-shadow .15s}
.tb-slot img{display:block;width:100%;height:100%;border-radius:5px}
.tb-slot:hover{box-shadow:0 0 0 1px #000,0 0 0 2px #c9b27a,0 0 10px rgba(242,197,107,.4)}
.tb-slot:active{transform:scale(.92)}
.tb-slot.on{box-shadow:0 0 0 1px #000,0 0 0 2px var(--gold),0 0 14px var(--gold)}
.tb-slot.beg{animation:tbbeg .5s ease-in-out 6 alternate}
@keyframes tbbeg{to{box-shadow:0 0 0 1px #000,0 0 0 2px var(--term),0 0 16px var(--term)}}
.tb-slot .kb{position:absolute;top:1px;right:3px;font:700 .6rem/1 var(--f-mono);color:#e8e8e8;text-shadow:0 1px 0 #000,0 0 3px #000}
.tb-slot .ct{position:absolute;bottom:1px;right:3px;font:800 .7rem/1 var(--f-sans);color:#fff;text-shadow:0 1px 0 #000,0 0 3px #000}
.tb-slot .cd{position:absolute;inset:0;border-radius:5px;display:flex;align-items:center;justify-content:center;font:800 .8rem/1 var(--f-sans);color:#ffd36b;text-shadow:0 1px 0 #000;background:conic-gradient(rgba(0,0,0,.68) var(--p,0%),rgba(0,0,0,0) 0)}
.tb-slot .cd:empty{display:none}
.tb-slot.locked{filter:grayscale(1) brightness(.5)}
.tb-purse{flex:none;padding:0 .3rem;font-size:.86rem}
.tb-btn{flex:none;width:34px;height:34px;padding:0;border:0;border-radius:7px;background:#05070c;cursor:pointer;color:var(--muted);font:700 1rem/1 var(--f-sans);box-shadow:0 0 0 1px #000,0 0 0 2px #3a3f52}
.tb-btn img{width:100%;height:100%;border-radius:6px}
.tb-btn:hover{color:var(--ink);box-shadow:0 0 0 1px #000,0 0 0 2px #c9b27a}
.tb-btn.sm{width:24px;height:24px;font-size:.8rem}
.toybar.min .tb-slots,.toybar.min .tb-shopbtn,.toybar.min .tb-needs{display:none}
@media (max-width:640px){.toybar{flex-wrap:wrap;row-gap:.3rem;width:calc(100vw - 16px)}.tb-purse{margin-right:auto}.tb-slots{order:9;flex:1 1 100%}.tb-who{display:none}.tb-unit{padding-right:.35rem}.tb-slot{width:36px;height:36px}.tb-btn{width:30px;height:30px}.tb-purse{font-size:.8rem}.toybar.min{width:auto}}
.tb-shop{position:fixed;z-index:96;left:50%;bottom:calc(var(--toybar) + 8px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(580px,calc(100vw - 16px));max-height:min(64vh,540px);display:flex;flex-direction:column;border-radius:12px;
  background:linear-gradient(180deg,rgba(28,24,18,.98),rgba(12,11,10,.98));border:1px solid #7a6233;box-shadow:0 16px 44px rgba(0,0,0,.7),0 0 0 1px #000,inset 0 1px 0 rgba(255,220,150,.08);animation:tbpop .2s ease-out}
@keyframes tbpop{from{opacity:0;transform:translate(-50%,10px)}}
.tb-shophead{display:flex;align-items:center;gap:.7rem;padding:.75rem .85rem .55rem;border-bottom:1px solid #3a2f1a}
.tb-shophead img{width:40px;height:40px;border-radius:7px;box-shadow:0 0 0 1px #000,0 0 0 2px #8a6a2c}
.tb-shophead b{display:block;font:700 1.05rem/1.1 var(--f-display);color:var(--gold)}
.tb-shophead small{color:var(--muted);font-size:.84rem}
.tb-shophead .tb-btn{margin-left:auto}
.tb-tabs{display:flex;gap:.35rem;padding:.55rem .85rem 0}
.tb-tabs button{padding:.3rem .8rem;border-radius:99px;border:1px solid #4a3d22;background:none;color:var(--muted);font:600 .85rem/1.2 var(--f-sans);cursor:pointer}
.tb-tabs button[aria-selected=true]{background:#3a2f1a;color:var(--gold2);border-color:#8a6a2c}
.tb-wares{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.4rem;padding:.65rem .85rem;overflow-y:auto}
.tb-ware{display:flex;align-items:center;gap:.6rem;padding:.35rem .5rem .35rem .35rem;border-radius:8px;border:1px solid #2e2618;background:rgba(0,0,0,.25);text-align:left;cursor:pointer;color:var(--ink);font:inherit}
.tb-ware:hover{border-color:#8a6a2c;background:rgba(242,197,107,.06)}
.tb-ware .ic{width:38px;height:38px;flex:none}
.tb-ware .nm{display:block;font:700 .92rem/1.15 var(--f-sans)}
.tb-ware .pr{display:block;font-size:.8rem;color:var(--muted);margin-top:2px}
.tb-ware.poor .pr .coins{color:var(--rose)}
.tb-ware.own .pr{color:var(--term)}
.tb-shopfoot{display:flex;align-items:center;justify-content:space-between;gap:.6rem;flex-wrap:wrap;padding:.55rem .85rem .75rem;border-top:1px solid #3a2f1a}
.tb-shopfoot .msg{flex:1 1 220px;color:var(--muted);font-size:.86rem;font-style:italic}
.tb-err{position:fixed;z-index:99;left:50%;top:22vh;transform:translateX(-50%);font:700 1.05rem/1.2 var(--f-sans);color:#ff2a2a;text-shadow:0 1px 0 #000,0 0 6px rgba(0,0,0,.8);pointer-events:none;animation:tbfade 1.6s ease-out forwards}
@keyframes tbfade{0%,60%{opacity:1}100%{opacity:0}}
.tb-float{position:fixed;z-index:99;left:0;top:0;pointer-events:none;font:800 .95rem/1 var(--f-sans);color:#ffd36b;text-shadow:0 1px 0 #000,0 0 6px rgba(0,0,0,.85);white-space:nowrap;animation:tbup 1.3s ease-out forwards}
.tb-float.say{color:#fff}
@keyframes tbup{from{opacity:1;translate:0 0}to{opacity:0;translate:0 -46px}}
.tb-coin{position:fixed;z-index:99;left:0;top:0;width:12px;height:12px;border-radius:50%;pointer-events:none;background:radial-gradient(circle at 35% 30%,#fff3b0,#e7b32c 55%,#9a6b09);box-shadow:0 0 8px rgba(255,210,90,.8)}
.tb-cast{position:fixed;z-index:99;left:50%;bottom:calc(var(--toybar) + 18px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);width:min(240px,70vw);height:18px;border-radius:3px;background:#0b0d12;box-shadow:0 0 0 1px #000,0 0 0 2px #707586;overflow:hidden;pointer-events:none}
.tb-cast i{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(180deg,#ffe07a,#c88a14)}
.tb-cast.chan i{background:linear-gradient(180deg,#7dfa8f,#1d9c3a)}
.tb-cast.fail i{background:#b01818;width:100%!important}
.tb-cast span{position:relative;display:block;text-align:center;font:700 .74rem/18px var(--f-sans);color:#fff;text-shadow:0 1px 0 #000}
.tb-aimcur{position:fixed;z-index:99;left:0;top:0;width:34px;height:34px;border-radius:6px;pointer-events:none;box-shadow:0 0 0 2px var(--gold),0 0 16px var(--gold);opacity:.92}
html.tb-aim,html.tb-aim *{cursor:crosshair!important}
.toyobj{position:fixed;z-index:94;left:0;top:0;width:40px;height:40px;touch-action:none;cursor:grab;will-change:transform;filter:drop-shadow(0 6px 6px rgba(0,0,0,.55))}
.toyobj img{display:block;width:100%;height:100%;border-radius:9px;box-shadow:0 0 0 1px rgba(0,0,0,.7)}
.toyobj.held{cursor:grabbing}
.toyobj.food img{border-radius:50%}
.toyobj.bomb{animation:tbtick .35s ease-in-out infinite alternate}
.toyobj.bomb::after{content:"";position:absolute;right:4px;top:-5px;width:8px;height:8px;border-radius:50%;background:#fff1a8;box-shadow:0 0 8px 4px #ff9a3c,0 0 2px 1px #fff}
.toyobj.bomb.late{animation-duration:.12s}
@keyframes tbtick{to{scale:1.08}}
.toyobj.train{width:52px;height:52px}
.toyobj.train.flip img{transform:scaleX(-1)}
.tb-boom{position:fixed;z-index:93;left:0;top:0;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;pointer-events:none;border:3px solid rgba(255,214,120,.9);box-shadow:0 0 30px rgba(255,140,40,.8),inset 0 0 20px rgba(255,200,80,.6);animation:tbboom .5s ease-out forwards}
@keyframes tbboom{to{transform:scale(18);opacity:0}}
.tb-line{position:fixed;inset:0;z-index:95;pointer-events:none;width:100vw;height:100vh}
main.tb-shake{animation:shakey .45s}
html.tb-shrunk main{transform:scale(.95);transform-origin:50% 0;transition:transform .3s}
/* the wisp, with toys */
.ic.q-legendary{box-shadow:0 0 0 1px #000,0 0 0 2px #ff8000,0 0 16px -2px #ff8000}
.wisp .tbx{position:absolute;pointer-events:none}
.wisp.squash .orb{animation:tbsquash .24s ease-out}
@keyframes tbsquash{0%{scale:1}35%{scale:1.28 .74}70%{scale:.9 1.12}100%{scale:1}}
.wisp.flung .orb{cursor:grabbing}
.wisp .tb-shield{inset:-11px;border-radius:50%;border:2px solid rgba(255,236,170,.9);background:radial-gradient(circle,rgba(255,240,190,0) 52%,rgba(255,226,140,.32));box-shadow:0 0 18px rgba(255,220,120,.65),inset 0 0 14px rgba(255,230,160,.5);animation:tbshield 1.6s ease-in-out infinite}
@keyframes tbshield{50%{scale:1.06;opacity:.8}}
.wisp .tb-ice{inset:-9px;border-radius:13px;background:linear-gradient(135deg,rgba(214,244,255,.78),rgba(120,190,255,.32) 50%,rgba(226,250,255,.72));border:1px solid rgba(226,250,255,.95);box-shadow:inset 0 0 12px rgba(255,255,255,.75),0 0 18px rgba(124,200,255,.65)}
.wisp .tb-ice::before,.wisp .tb-ice::after{content:"";position:absolute;inset:0;border-radius:13px;opacity:0;transition:opacity .2s;background:linear-gradient(118deg,transparent 46%,rgba(255,255,255,.95) 47%,transparent 49%),linear-gradient(62deg,transparent 30%,rgba(255,255,255,.9) 31%,transparent 33%)}
.wisp .tb-ice::after{background:linear-gradient(160deg,transparent 60%,rgba(255,255,255,.95) 61%,transparent 63%),linear-gradient(25deg,transparent 64%,rgba(255,255,255,.9) 65%,transparent 67%)}
.wisp .tb-ice.c1::before,.wisp .tb-ice.c2::before,.wisp .tb-ice.c3::before,.wisp .tb-ice.c4::before{opacity:1}
.wisp .tb-ice.c3::after,.wisp .tb-ice.c4::after{opacity:1}
.wisp.frozen .orb{animation:none;filter:saturate(.5) brightness(1.1) hue-rotate(25deg)}
.wisp.frozen .eye{animation:none}
.wisp.shiver .orb{animation:shook .1s linear 14}
.wisp.sheep .orb{background:radial-gradient(circle at 28% 30%,#fff 0 20%,transparent 21%),radial-gradient(circle at 72% 28%,#fff 0 20%,transparent 21%),radial-gradient(circle at 20% 66%,#fbfaf6 0 20%,transparent 21%),radial-gradient(circle at 80% 66%,#fbfaf6 0 20%,transparent 21%),radial-gradient(circle at 50% 82%,#f1eee7 0 22%,transparent 23%),radial-gradient(circle,#f4f1ea 0 50%,transparent 51%);box-shadow:0 4px 12px rgba(0,0,0,.35),0 0 18px rgba(255,255,255,.25)}
.wisp.sheep .orb::before,.wisp.sheep .orb::after{display:none}
.wisp.sheep .eye{position:relative;z-index:1;background:#f8f8f8}
.wisp .tb-sheep{left:50%;top:50%;width:52%;height:46%;transform:translate(-50%,-44%);border-radius:45% 45% 52% 52%;background:#3d3b42}
.wisp .tb-sheep i{position:absolute;top:8%;width:46%;height:28%;border-radius:50%;background:#3d3b42}
.wisp .tb-sheep i:first-child{left:-34%;rotate:-28deg}.wisp .tb-sheep i:last-child{right:-34%;rotate:28deg}
.wisp.tiny .orb{scale:.55}.wisp.huge .orb{scale:1.5}
.wisp .orb{transition:scale .35s cubic-bezier(.2,1.6,.4,1)}
.wisp.fiery .orb{background:radial-gradient(circle at 38% 32%,#fff6d8 0 8%,#ffd27a 20%,#ff8a3c 42%,rgba(255,60,30,.55) 70%,rgba(255,60,30,0) 72%);box-shadow:0 0 24px 8px rgba(255,120,40,.55),0 0 60px 14px rgba(255,60,30,.3)}
.wisp.fiery .orb::before{background:#ffcf5a;box-shadow:0 0 10px #ff8a3c}.wisp.fiery .orb::after{background:#ff6a3c;box-shadow:0 0 10px #ff3c1f}
.wisp .tb-flame{left:18%;right:18%;bottom:58%;height:62%}
.wisp .tb-flame::before,.wisp .tb-flame::after{content:"";position:absolute;bottom:0;left:22%;width:56%;height:100%;border-radius:50% 50% 45% 45%/70% 70% 30% 30%;background:radial-gradient(ellipse at 50% 90%,#fff2b0,#ffb03c 40%,rgba(255,80,20,.6) 65%,transparent 72%);filter:blur(.6px);animation:tbflame .45s ease-in-out infinite alternate;transform-origin:50% 100%}
.wisp .tb-flame::after{left:4%;width:40%;height:70%;animation-delay:.2s}
@keyframes tbflame{to{transform:scaleY(1.18) skewX(6deg);opacity:.85}}
.wisp .tb-hat{left:50%;transform:translateX(-50%);z-index:2}
.wisp .tb-hat svg{display:block;width:100%;height:auto;filter:drop-shadow(0 2px 2px rgba(0,0,0,.45))}
.wisp .tb-hat.crown{top:-13px;width:62%}.wisp .tb-hat.wizard{top:-33px;width:84%}.wisp .tb-hat.tabard{top:auto;bottom:-6px;width:40%;z-index:1}
.wisp.sheep .tb-hat.tabard{display:none}
.tb-page{display:flex;flex-direction:column;align-items:center;gap:1px;flex:none;cursor:default}
.tb-pg{width:18px;height:13px;padding:0;border:0;background:none;color:var(--muted);font-size:.58rem;line-height:1;cursor:pointer}
.tb-pg:hover{color:var(--gold)}
.tb-pn{font:700 .72rem/1 var(--f-mono);color:var(--gold2)}
.toybar.min .tb-page{display:none}
.tb-unit{cursor:pointer}
.tb-pfx{position:fixed;inset:0;width:100vw;height:100vh;z-index:95;pointer-events:none}
html.tb-tool,html.tb-tool *{cursor:crosshair!important}
.tb-toolcur{position:fixed;z-index:99;left:0;top:0;width:28px;height:28px;border-radius:6px;pointer-events:none;box-shadow:0 0 0 2px var(--term),0 0 12px var(--term);opacity:.92}
.toyobj.round img{border-radius:50%;box-shadow:0 0 14px rgba(255,220,120,.5)}
.toyobj.whelp{filter:drop-shadow(0 6px 8px rgba(0,0,0,.6)) drop-shadow(0 0 8px rgba(255,90,40,.5))}
.toyobj.whelp img{border-radius:50%;animation:tbflap .16s ease-in-out infinite alternate}
@keyframes tbflap{to{translate:0 -4px;scale:1.06 .94}}
.toyobj.whelp.flip img{transform:scaleX(-1)}
.toyobj.bell.ring img{animation:tbbell .1s ease-in-out 10 alternate}
@keyframes tbbell{from{rotate:-20deg}to{rotate:20deg}}
.toyobj.burning{filter:drop-shadow(0 0 10px #ff7a1a)}
.toyobj.burning img{filter:sepia(1) saturate(3) hue-rotate(-25deg) brightness(.75)}
.toyobj.cooked img{filter:sepia(.7) saturate(1.7) brightness(.8)}
.tb-ring{position:fixed;z-index:93;left:0;top:0;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;pointer-events:none;border:3px solid var(--rc,#ffe08a);box-shadow:0 0 24px var(--rc,#ffe08a),inset 0 0 16px var(--rc,#ffe08a);animation:tbring .6s ease-out forwards}
@keyframes tbring{to{transform:scale(var(--rs,14));opacity:0}}
.tb-dark{position:fixed;inset:0;z-index:95;pointer-events:none;background:rgba(3,4,10,.94);animation:tbdark .6s ease-out;
  -webkit-mask-image:radial-gradient(circle at var(--wx,50%) var(--wy,50%),transparent 0 60px,#000 170px),radial-gradient(circle at var(--cx,-999px) var(--cy,-999px),transparent 0 24px,#000 80px);-webkit-mask-composite:source-in;
  mask-image:radial-gradient(circle at var(--wx,50%) var(--wy,50%),transparent 0 60px,#000 170px),radial-gradient(circle at var(--cx,-999px) var(--cy,-999px),transparent 0 24px,#000 80px);mask-composite:intersect}
@keyframes tbdark{from{opacity:0}}
html.tb-stop main,html.tb-stop .toyobj img,html.tb-stop .tb-pfx{filter:grayscale(.9) brightness(.85) sepia(.2)}
html.tb-stop .wisp .orb,html.tb-stop .toyobj,html.tb-stop .toyobj img{animation-play-state:paused}
html.tb-stop body::after{content:"";position:fixed;inset:0;z-index:92;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 40%,rgba(124,200,255,.12));animation:tbdark .4s ease-out}
html.tb-lev body::after{content:"";position:fixed;inset:0;z-index:92;pointer-events:none;background:linear-gradient(0deg,rgba(255,236,170,.10),transparent 60%)}
.wisp.lantern .orb{box-shadow:0 0 36px 16px rgba(124,242,154,.7),0 0 100px 34px rgba(232,137,255,.35)}
.wisp.wet .orb{filter:saturate(.7) brightness(.85) hue-rotate(18deg)}
.wisp.wet .orb::after{background:#7cc8ff}
.wisp.sooty .orb{filter:brightness(.5) saturate(.35) sepia(.35)}
.wisp.zapped .orb{box-shadow:0 0 26px 10px rgba(124,200,255,.9),0 0 60px 18px rgba(160,220,255,.45);animation:shook .06s linear 20}
.wisp.flat .orb{scale:1.45 .4!important;translate:0 36%;transition:none}
.wisp.mindctl .orb{box-shadow:0 0 22px 8px rgba(176,92,255,.75),0 0 50px 14px rgba(232,137,255,.35)}
.wisp .tb-mc{inset:-9px;border-radius:50%;border:2px dashed rgba(196,130,255,.95);animation:spin 1.1s linear infinite}
.wisp.dance .orb{animation:tbdance .42s ease-in-out infinite alternate}
@keyframes tbdance{from{transform:rotate(-14deg)}to{transform:rotate(14deg) translateY(-8px)}}
.wisp.rocket .orb{box-shadow:0 0 18px 6px rgba(255,154,60,.7),0 0 40px 10px rgba(255,90,30,.35)}
.wisp.scared .orb{animation:shook .08s linear infinite}
.wisp.renewed .orb{box-shadow:0 0 24px 8px rgba(124,242,154,.75),0 0 60px 16px rgba(124,242,154,.3)}
`;

/* =================== state =================== */
const LIKES = ["chicken", "candy", "fish", "plush", "train", "shield", "toss", "ball", "horn", "touch", "renew"], DISLIKES = ["frost", "bomb", "poly", "shrink", "pole", "bow", "flail", "dragon", "pump", "bell", "chain", "arcane", "rainfire"];
const THING = Object.assign({ chicken: "Leeroy's chicken", candy: "candy hearts", fish: "fish from the faire", plush: "the murloc plushie", train: "the toy train", shield: "bubbles", toss: "being thrown", frost: "Frost Nova", bomb: "bombs", poly: "being a sheep", shrink: "the shrink ray", pole: "the fishing pole", ball: "playing fetch", horn: "music", touch: "being petted", renew: "Renew", bow: "arrows", flail: "the flail", dragon: "the Dragon Gun", pump: "getting soaked", bell: "the bell", chain: "lightning", arcane: "Arcane Explosion", rainfire: "Rain of Fire" }, SHOP.thing || {});
const S = Object.assign({ on: true, open: true, owned: {}, wear: {}, cd: {}, uses: {}, recent: {}, likes: null, learn: {}, paid: {}, stats: {} }, store.get("toy", {}));
const save = () => { const t = store.get("toy", {}); store.set("toy", { ...t, ...S, on: t.on !== false, unlocked: t.unlocked || S.unlocked }); };
const purse = () => store.get("purse", 0);
const fishCount = () => X.bag ? X.bag.list().filter(([n]) => X.bag.isFish(n)).reduce((s, [, c]) => s + c, 0) : 0;
const faireOpen = () => { const f = store.get("flags", {}); return !!(f.darkmoon || f.ticket); };
const owns = id => id === "fish" ? faireOpen() && fishCount() > 0 : !!S.owned[id];
const liked = k => S.likes && S.likes.like === k, hated = k => S.likes && S.likes.dislike === k;
function firstRun() {
  if (S.init) return;
  S.init = now(); S.on = true;
  for (const t of TOYS) if (t.start) S.owned[t.id] = 1;
  S.likes = { like: pick(LIKES), dislike: pick(DISLIKES) };
  // the wisp has been saving: five silver for every achievement earned so far
  const ids = Object.keys(X.got).filter(k => D.ACH[k]); ids.forEach(k => S.paid[k] = 1);
  const pay = ids.length * 500; store.set("purse", purse() + pay);
  save();
  setTimeout(() => {
    notice("Toybox installed", pay ? `The wisp has been saving up: ${X.coinsText(pay)}, five silver for each of your ${ids.length} achievements.` : "The wisp's toys are on the bar at the bottom of the page.", "trade_engineering");
    say(pick(TL.install), { gap: 0, hold: 3500 });
    setTimeout(() => say(pick(TL.install2), { gap: 0, hold: 4000 }), 4200);
  }, 900);
}

/* =================== money =================== */
const mult = () => (M.trust >= 60 ? 1.25 : M.trust < 20 ? .5 : 1) * (M.fun < 20 ? .75 : 1);
function fresh(id) {                     // the same toy over and over pays less; trying things pays best
  const t = now(), r = (S.recent[id] || []).filter(x => t - x < 180e3); r.push(t); S.recent[id] = r.slice(-12);
  return Math.max(.2, Math.pow(.78, r.length - 1));
}
const wc = () => { const r = orb.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, s: r.width }; };
function earn(c, x, y, raw) {
  c = Math.max(1, Math.round(c * (raw ? 1 : mult())));
  store.set("purse", purse() + c); drawPurse();
  if (x == null) ({ x, y } = wc());
  floater("+" + X.coinsText(c), x, y - 20);
  coinFly(x, y);
  if (purse() >= 70000) award("seven");
  return c;
}
function floater(text, x, y, cls = "") {
  const f = document.createElement("div"); f.className = "tb-float " + cls; f.textContent = text;
  document.body.append(f); const w = f.offsetWidth;
  f.style.left = clamp(x - w / 2, 4, innerWidth - w - 4) + "px"; f.style.top = clamp(y, 8, innerHeight - 30) + "px";
  setTimeout(() => f.remove(), 1300);
}
let coinsFlying = 0;
function coinFly(x, y) {
  const p = $(".tb-purse", bar || document) || null; if (!p || REDUCE || coinsFlying > 6 || !p.offsetParent) return;
  const r = p.getBoundingClientRect(), n = 1 + rnd(3);
  for (let k = 0; k < n; k++) {
    const c = document.createElement("div"); c.className = "tb-coin"; document.body.append(c); coinsFlying++;
    const dx = (Math.random() - .5) * 60, a = c.animate([{ transform: `translate(${x}px,${y}px)` }, { transform: `translate(${x + dx}px,${y - 40 - rnd(30)}px)`, offset: .35 }, { transform: `translate(${r.left + r.width / 2}px,${r.top + 6}px) scale(.6)` }], { duration: 750 + k * 90, easing: "cubic-bezier(.4,0,.6,1)" });
    a.onfinish = () => { c.remove(); coinsFlying--; };
  }
}
function err(msg) { $$(".tb-err").forEach(e => e.remove()); const e = document.createElement("div"); e.className = "tb-err"; e.textContent = msg; document.body.append(e); setTimeout(() => e.remove(), 1700); }

/* =================== the bar =================== */
let bar = null, shop = null, cdTimer = 0;
const TABS = [["care", "Care"], ["toys", "Toys"], ["gear", "Gadgets"], ["spell", "Spells"]];
function pages() {
  const out = [];
  for (const [tab, name] of TABS) {
    const ids = TOYS.filter(t => t.k !== "wear" && (t.tab || "care") === tab && owns(t.id)).map(t => t.id);
    for (let k = 0; k < ids.length; k += 12) out.push({ tab, name: ids.length > 12 ? `${name} ${k / 12 + 1}` : name, ids: ids.slice(k, k + 12) });
  }
  return out.length ? out : [{ tab: "care", name: "Care", ids: [] }];
}
const curPage = () => { const L = pages(); S.page = (((S.page || 0) % L.length) + L.length) % L.length; return L[S.page]; };
const slotIds = () => curPage().ids;
function turnPage(d) { const n = pages().length; S.page = ((S.page || 0) + d + n) % n; save(); endAim(); unequip(); drawSlots(); X.hideTip(); }
function buildBar() {
  bar = document.createElement("div"); bar.className = "toybar" + (S.open === false ? " min" : ""); bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", "The wisp's toys");
  bar.innerHTML = `<div class="tb-unit" data-tiph="toy:unit" tabindex="0" aria-label="The wisp: how it's doing"><span class="mini-wisp happy" aria-hidden="true"></span><div class="tb-who"><b>The Wisp</b><small class="tb-rep"></small><div class="tb-needs"><i class="fed"><s></s></i><i class="fun"><s></s></i><i class="rest"><s></s></i></div></div></div>
    <div class="tb-page"><button class="tb-pg up" type="button" aria-label="Previous page of toys">▲</button><b class="tb-pn">1</b><button class="tb-pg dn" type="button" aria-label="Next page of toys">▼</button></div>
    <div class="tb-slots"></div><div class="tb-purse" data-tip="Your purse"></div>
    <button class="tb-btn tb-shopbtn" type="button" aria-label="Fizzlewick's Wares" data-tip="Fizzlewick's Wares"><img src="${ICON("inv_misc_bag_10")}" alt=""></button>
    <button class="tb-btn sm tb-min" type="button"></button><button class="tb-btn sm tb-off" type="button" aria-label="Put the toys away" data-tip="Put the toys away (the footer turns them back on)">×</button>`;
  document.body.append(bar);
  bar.addEventListener("animationend", layout);
  bar.addEventListener("wheel", e => { if (!e.target.closest(".tb-slots, .tb-page") || Math.abs(e.deltaY) < 20 || e.shiftKey) return; e.preventDefault(); turnPage(e.deltaY > 0 ? 1 : -1); }, { passive: false });
  bar.addEventListener("click", e => {
    const pg = e.target.closest(".tb-pg"); if (pg) { turnPage(pg.classList.contains("up") ? -1 : 1); return; }
    if (e.target.closest(".tb-unit")) { mind.setRoam(!mind.roams); drawUnit(); return; }
    const s = e.target.closest(".tb-slot"); if (s) { use(s.dataset.id); return; }
    if (e.target.closest(".tb-shopbtn")) { toggleShop(); return; }
    if (e.target.closest(".tb-min")) { S.open = S.open === false; save(); bar.classList.toggle("min", S.open === false); drawMin(); if (S.open === false) closeShop(); onResize(); return; }
    if (e.target.closest(".tb-off")) { X.hideTip(); mind.setToybox(false); }
  });
  drawSlots(); drawPurse(); drawUnit(); drawMin();
}
function drawMin() { const b = $(".tb-min", bar); b.textContent = S.open === false ? "▴" : "▾"; b.setAttribute("aria-label", S.open === false ? "Show the toys" : "Tuck the toys away"); b.dataset.tip = b.getAttribute("aria-label"); }
function drawSlots() {
  if (!bar) return;
  const ids = slotIds(), TIPS = D.TIPS;
  $(".tb-slots", bar).innerHTML = ids.map((id, k) => {
    const t = BY[id]; TIPS["toy:" + id] = tipFor(t);
    const icon = id === "fish" ? fishIcon() : t.i;
    return `<button class="tb-slot" type="button" data-id="${id}" data-tiph="toy:${id}" aria-label="${esc(t.n)}${KEYS[k] ? ` (${KEYS[k]})` : ""}"><img src="${ICON(icon)}" alt="">${KEYS[k] ? `<span class="kb">${KEYS[k]}</span>` : ""}<span class="cd"></span>${id === "fish" ? `<span class="ct">${fishCount()}</span>` : ""}</button>`;
  }).join("");
  const L = pages(), pg = curPage(), pe = $(".tb-page", bar);
  $(".tb-pn", bar).textContent = S.page + 1; pe.hidden = L.length < 2; pe.dataset.tip = `${pg.name} (page ${S.page + 1} of ${L.length}). The arrows or the mouse wheel turn the page.`;
  drawCds(); layout();
}
function fishIcon() { const f = X.bag && X.bag.list().find(([n]) => X.bag.isFish(n)); return (f && X.bag.icon(f[0])) || "fish_smallfish"; }
function drawPurse() { const h = X.coins(purse()); if (bar) $(".tb-purse", bar).innerHTML = h; if (shop) $(".tb-purse2", shop).innerHTML = "Purse: " + h; }
const cdLeft = id => Math.max(0, (S.cd[id] || 0) - now());
function drawCds() {
  if (!bar) return; let any = false;
  for (const b of $$(".tb-slot", bar)) {
    const t = BY[b.dataset.id], left = cdLeft(t.id), el = $(".cd", b);
    if (left > 0) { any = true; el.style.setProperty("--p", (100 * left / (t.cd * 1000)) + "%"); el.textContent = Math.ceil(left / 1000); } else el.textContent = "";
  }
  clearTimeout(cdTimer); if (any) cdTimer = setTimeout(drawCds, 250);
}
let unitRaf = 0;
function drawUnit() {
  if (!bar || unitRaf) return;
  unitRaf = requestAnimationFrame(() => {
    unitRaf = 0; if (!bar) return;
    const st = mind.standing(), col = { Unfriendly: "#ee6622", Neutral: "#ffd100" }[st] || "#3fe06a";
    const rep = $(".tb-rep", bar); rep.textContent = st; rep.style.color = col;
    for (const k of ["fed", "fun", "rest"]) $(".tb-needs ." + k + " s", bar).style.setProperty("--v", Math.round(M[k]) + "%");
    const m = mind.mood(), face = $(".tb-unit .mini-wisp", bar); face.className = "mini-wisp " + (m === "asleep" || m === "sleepy" ? "sleepy" : m === "delighted" ? "happy" : m === "wary" ? "" : "wow");
    const L = S.learn || {}, like = L.like ? esc(THING[S.likes.like]) : "???", hate = L.dislike ? esc(THING[S.likes.dislike]) : "???";
    D.TIPS["toy:unit"] = `<div class="t" style="color:var(--term)">The Wisp</div><div class="s">Companion · <span style="color:${col}">${st}</span> (${Math.round(M.trust)}/100)</div>
      <div class="d" style="margin:.35rem 0">Fed ${Math.round(M.fed)} · Fun ${Math.round(M.fun)} · Rest ${Math.round(M.rest)} · ${esc(m)}</div>
      <div class="g">Loves: ${like}</div><div class="s" style="color:#ff8a7a">Can't stand: ${hate}</div><div class="d" style="margin-top:.35rem">${mind.roams ? "It flies about on its own. Click to keep it in its corner." : "It stays in its corner. Click to let it roam."}</div><div class="y" style="margin-top:.35rem">"4% arcane, 96% vibes."</div>`;
  });
}
function tipFor(t) {
  const kind = t.food ? "Food" : t.tab === "spell" ? "Spell" : t.tab === "gear" ? "Gadget" : t.k === "wear" ? "Wardrobe" : "Toy", q = t.q || "common";
  const extra = t.id === "fish" ? ` You have ${fishCount()}.` : "";
  return `<div class="t q-${q}-t">${esc(t.n)}</div><div class="s">${kind}${t.cd ? ` · ${t.cd} sec cooldown` : ""}</div>${t.use ? `<div class="g">Use: ${esc(t.use)}${extra}</div>` : ""}${t.y ? `<div class="y">"${esc(t.y)}"</div>` : ""}${t.k === "place" ? `<div class="d">Click it, then click the page. Or press its key to drop it at your pointer.</div>` : t.k === "aim" ? `<div class="d">Click it, then click where. Or press its key to cast it at your pointer.</div>` : t.k === "hold" ? `<div class="d">Click it to pick it up, then hold the mouse button over the page. Esc or right-click puts it down.</div>` : ""}`;
}
function layout() {
  const R = document.documentElement.style;
  if (!bar || !S.on) { R.setProperty("--toybar", "0px"); R.setProperty("--toylift", "0px"); FLOOR = { top: innerHeight, l: 0, r: 0 }; return; }
  // where the bar rests, from layout (not getBoundingClientRect, which is wrong while it slides in)
  const top = bar.offsetTop, left = bar.offsetLeft - bar.offsetWidth / 2, right = left + bar.offsetWidth;
  const h = Math.round(innerHeight - top + 8), s = mind.osz();
  R.setProperty("--toybar", h + "px");
  R.setProperty("--toylift", right > innerWidth - s - 28 ? h + "px" : "0px");
  FLOOR = { top: top - 4, l: left - 6, r: right + 6 };
}
let FLOOR = { top: innerHeight, l: 0, r: 0 };
const floorAt = (x, w) => (x + w > FLOOR.l && x < FLOOR.r) ? FLOOR.top : innerHeight - 6;

/* =================== Fizzlewick's Wares =================== */
let tab = "care", shopMsg = "";
function toggleShop() { shop ? closeShop() : openShop(); }
function closeShop() { if (shop) { shop.remove(); shop = null; X.hideTip(); } }
function openShop() {
  if (!bar) return;
  if (S.open === false) { S.open = true; save(); bar.classList.remove("min"); drawMin(); layout(); }
  closeShop();
  shop = document.createElement("div"); shop.className = "tb-shop"; shop.setAttribute("role", "dialog"); shop.setAttribute("aria-label", SHOP.title || "Fizzlewick's Wares");
  shop.innerHTML = `<div class="tb-shophead"><img src="${ICON("trade_engineering")}" alt=""><div><b>${esc(SHOP.title || "Fizzlewick's Wares")}</b><small>${esc(SHOP.sub || "")}</small></div><button class="tb-btn sm tb-x" type="button" aria-label="Close">×</button></div>
    <div class="tb-tabs" role="tablist">${[...TABS, ["wardrobe", "Wardrobe"]].map(([k, n]) => `<button role="tab" type="button" data-t="${k}">${n}</button>`).join("")}</div>
    <div class="tb-wares"></div><div class="tb-shopfoot"><span class="tb-purse2"></span><span class="msg"></span><button class="chip tb-off2" type="button">Put the toys away</button></div>`;
  document.body.append(shop);
  shop.addEventListener("click", e => {
    if (e.target.closest(".tb-x")) { closeShop(); return; }
    const tb = e.target.closest("[data-t]"); if (tb) { tab = tb.dataset.t; drawShop(); return; }
    const w = e.target.closest("[data-buy]"); if (w) { buy(w.dataset.buy); return; }
    if (e.target.closest(".tb-off2")) mind.setToybox(false);
  });
  shopMsg = pick(SHOP.hello) || ""; drawShop(); drawPurse();
  if (!S.stats.shopSeen) { S.stats.shopSeen = 1; save(); }
}
function drawShop() {
  if (!shop) return;
  $$(".tb-tabs [data-t]", shop).forEach(b => b.setAttribute("aria-selected", b.dataset.t === tab));
  const list = TOYS.filter(t => !t.start && t.id !== "fish" && (tab === "wardrobe" ? t.k === "wear" : t.k !== "wear" && (t.tab || "care") === tab));
  $(".tb-wares", shop).innerHTML = list.map(t => {
    D.TIPS["toy:" + t.id] = tipFor(t);
    const own = S.owned[t.id], worn = t.k === "wear" && S.wear[t.slot || "hat"] === t.id, poor = !own && purse() < t.p;
    const pr = own ? (t.k === "wear" ? (worn ? "Wearing it. Click to take it off." : "Yours. Click to wear it.") : "Yours. It's on the bar.") : X.coins(t.p);
    return `<button class="tb-ware${own ? " own" : ""}${poor ? " poor" : ""}" type="button" data-buy="${t.id}" data-tiph="toy:${t.id}"><span class="ic q-${t.q}"><img src="${ICON(t.i)}" alt=""></span><span><span class="nm q-${t.q}-t">${esc(t.n)}</span><span class="pr">${pr}</span></span></button>`;
  }).join("");
  $(".msg", shop).textContent = shopMsg;
}
function buy(id) {
  const t = BY[id]; if (!t) return;
  if (S.owned[id]) { if (t.k === "wear") wear(t); return; }
  if (purse() < t.p) { shopMsg = pick(SHOP.poor) || "Not enough money."; err("You don't have enough money."); drawShop(); return; }
  store.set("purse", purse() - t.p); S.owned[id] = 1; save();
  shopMsg = pick(SHOP.buy) || ""; drawPurse(); drawSlots(); drawShop();
  notice("You bought", `[${t.n}]`, t.i);
  if (t.k === "wear") { wear(t); if (TOYS.filter(x => x.k === "wear" && x.slot === "hat" && S.owned[x.id]).length >= 3) award("hattrick"); if (id === "sulfuras") award("legendary"); }
  else setTimeout(() => say(pick(TL.gift), { gap: 20e3, hold: 2500 }), 500);
}
function wear(t) {
  const slot = t.slot || "hat";
  S.wear[slot] = S.wear[slot] === t.id ? null : t.id; save(); dress(); drawShop();
  if (S.wear[slot]) setTimeout(() => say(pick(t.id === "sulfuras" ? TL.fiery : TL.hat), { gap: 0, hold: 3000 }), 300);
}
const HATS = {
  crown: `<svg viewBox="0 0 40 24"><defs><linearGradient id="tbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#f2c56b"/><stop offset="1" stop-color="#a8741a"/></linearGradient></defs><path d="M3 22 4.5 7l8 7.5L20 2l7.5 12.5 8-7.5L37 22Z" fill="url(#tbg)" stroke="#6b4508" stroke-width="1.2" stroke-linejoin="round"/><circle cx="20" cy="16" r="2.8" fill="#e889ff" stroke="#6b2f80"/><circle cx="10" cy="17.5" r="1.8" fill="#7cc8ff"/><circle cx="30" cy="17.5" r="1.8" fill="#7cf29a"/></svg>`,
  wizard: `<svg viewBox="0 0 44 40"><path d="M6 34 22 2c2-3 4-2 4 1l9 31Z" fill="#3b4fc4" stroke="#1d2463" stroke-width="1.3" stroke-linejoin="round"/><path d="M22 2c2-3 4-2 4 1l-1 3Z" fill="#5d70e8"/><ellipse cx="22" cy="34.5" rx="20" ry="4.6" fill="#2c3a9e" stroke="#1d2463" stroke-width="1.2"/><path d="m19 16 1 2 2 .3-1.5 1.4.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.4 2-.3Z" fill="#ffe08a"/><circle cx="26" cy="25" r="1.4" fill="#ffe08a"/><circle cx="16" cy="28" r="1" fill="#ffe08a"/></svg>`,
  tabard: `<svg viewBox="0 0 30 34"><path d="M2 2h26v20c0 6-6 10-13 11C8 32 2 28 2 22Z" fill="#10131d" stroke="#f2c56b" stroke-width="2"/><path d="m9 11 5 4.5-5 4.5" fill="none" stroke="#7cf29a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 22h6" stroke="#7cf29a" stroke-width="2.6" stroke-linecap="round"/></svg>`,
};
function dress() {
  $$(".tb-hat, .tb-flame", wisp.el).forEach(e => e.remove());
  wisp.el.classList.toggle("fiery", S.on && S.wear.legend === "sulfuras");
  if (!S.on) return;
  const h = S.wear.hat;
  if (h && HATS[h]) orb.insertAdjacentHTML("beforeend", `<span class="tbx tb-hat ${h}" aria-hidden="true">${HATS[h]}</span>`);
  if (S.wear.legend === "sulfuras") orb.insertAdjacentHTML("beforeend", `<span class="tbx tb-flame" aria-hidden="true"></span>`);
}

/* =================== things on the page, and throwing the wisp =================== */
const objs = []; let raf = 0, lastT = 0, fl = null;
const G = .0022;
let GRAV = 1, WIND = 0, stopped = false;      // Levitate flips gravity, Windfury blows, Time Stop stops everything
const ticks = new Set();                      // per-frame jobs: held tools, whelps, spells that last a while
// how each kind of thing moves: mass, bounce, size, extra gravity
const PROPS = { crate: { m: 3, e: .1, w: 44 }, anvil: { m: 9, e: .02, gm: 1.7, w: 46 }, ball: { m: .5, e: .8, round: 1, w: 34 }, bell: { m: 1.4, e: .3 }, train: { w: 52 }, whelp: { m: .8, fly: 1, w: 44 } };
function spawn(kind, x, y, o = {}) {
  const pr = PROPS[kind] || {}, w = pr.w || 40;
  const el = document.createElement("div"); el.className = "toyobj " + kind + (o.food ? " food" : "") + (pr.round ? " round" : ""); el.setAttribute("aria-hidden", "true");
  el.style.width = el.style.height = w + "px";
  el.innerHTML = `<img src="${ICON(o.icon)}" alt="" draggable="false">`;
  document.body.append(el);
  const ob = { kind, el, w, h: w, x: x - w / 2, y: y - w / 2, vx: 0, vy: 0, rot: 0, born: now(), rest: false, m: 1, e: .34, still: 0, ...pr, ...o };
  objs.push(ob);
  if (objs.length > 14) remove(objs.find(q => q.kind !== "bomb" && q.kind !== "whelp" && q !== ob));
  drawObj(ob); grabbable(ob); kick(); return ob;
}
function remove(o) { if (!o) return; const i = objs.indexOf(o); if (i >= 0) objs.splice(i, 1); o.dead = true; o.el.remove(); clearTimeout(o.timer); wakeAll(); }
const wakeAll = () => { for (const o of objs) o.rest = false; kick(); };
const drawObj = o => { o.el.style.transform = `translate3d(${o.x}px,${o.y}px,0) rotate(${o.rot}deg)`; };
const kick = () => { if (!raf) { lastT = 0; raf = requestAnimationFrame(loop); } };
function loop(t) {
  const dt = lastT ? Math.min(34, t - lastT) : 16; lastT = t;
  let busy = false;
  if (!stopped) busy = physics(dt);
  for (const f of [...ticks]) { let r; try { r = f(dt); } catch (e) { console.warn(e); r = false; } if (r === false) ticks.delete(f); }
  if (fl && !stopped) stepFling(dt);
  drawFx(dt);
  raf = (busy || fl || ticks.size || P.length || drift) ? requestAnimationFrame(loop) : 0;
}
function physics(dt) {
  let awake = false;
  for (const o of objs) {
    if (o.held || o.dead) continue;
    if (o.kind === "train") { awake = true; driveTrain(o, dt); continue; }
    if (o.fly && !o.stun) continue;                      // whelps steer themselves
    if (o.rest) continue;
    awake = true;
    o.vy += G * (o.gm || 1) * dt * GRAV; if (WIND) o.vx += WIND * dt / o.m;
    o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vx * dt * (o.round ? 1.2 : .25);
    o.ground = false; o.on = null;
    const fy = floorAt(o.x, o.w);
    if (GRAV > 0 && o.y + o.h > fy) { o.y = fy - o.h; land(o); }
    if (GRAV < 0 && o.y < 64) { o.y = 64; land(o); }   // Levitate: they pile up under the site's header
    if (GRAV < 0 && o.y + o.h > fy) { o.y = fy - o.h; o.vy = -Math.abs(o.vy) * .4; }
    if (GRAV > 0 && o.y < 2) { o.y = 2; o.vy = Math.abs(o.vy) * .4; }
    if (o.x < 2) { o.x = 2; o.vx = Math.abs(o.vx) * .5; }
    if (o.x + o.w > innerWidth - 2) { o.x = innerWidth - 2 - o.w; o.vx = -Math.abs(o.vx) * .5; }
  }
  collide();
  for (const o of objs) {
    if (o.rest || o.held || o.dead || o.kind === "train" || (o.fly && !o.stun)) continue;
    hitsWisp(o);
    if (o.ground && Math.abs(o.vx) < .03 && Math.abs(o.vy) < .06) { o.still += dt; if (o.still > 260) { o.rest = true; o.vx = o.vy = 0; if (!o.round) o.rot = 0; settled(o); } } else o.still = 0;
    drawObj(o);
  }
  return awake;
}
function land(o) {         // on the floor (or the ceiling, under Levitate)
  const v = Math.abs(o.vy);
  if (v > .16) { o.vy = -Math.sign(o.vy) * v * o.e; o.vx *= .85; if (v > .45) impact(o, v); }
  else { o.vy = 0; o.vx *= o.round ? .995 : .82; }
  o.ground = true;
}
// boxes against boxes: push apart along the shallow side, trade speed; whatever is on top stands on what's under it
function collide() {
  const L = objs.filter(o => !o.dead && o.kind !== "train" && !(o.fly && !o.stun));
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j];
    if (a.rest && b.rest) continue;
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox <= 0 || oy <= 0) continue;
    const rel = Math.hypot(a.vx - b.vx, a.vy - b.vy);
    if (a.rest && rel > .45) a.rest = false; if (b.rest && rel > .45) b.rest = false;
    const ia = a.rest || a.held ? 0 : 1 / a.m, ib = b.rest || b.held ? 0 : 1 / b.m, sum = ia + ib; if (!sum) continue;
    const e = Math.min(a.e, b.e);
    if (ox < oy) {
      const d = a.x + a.w / 2 < b.x + b.w / 2 ? -1 : 1;
      a.x += d * ox * ia / sum; b.x -= d * ox * ib / sum;
      if ((a.vx - b.vx) * d < 0) { const J = -(1 + e) * (a.vx - b.vx) / sum; a.vx += J * ia; b.vx -= J * ib; }
    } else {
      const d = a.y + a.h / 2 < b.y + b.h / 2 ? -1 : 1;    // -1: a is on top
      a.y += d * oy * ia / sum; b.y -= d * oy * ib / sum;
      if ((a.vy - b.vy) * d < 0) { const J = -(1 + e) * (a.vy - b.vy) / sum; a.vy += J * ia; b.vy -= J * ib; }
      const top = d < 0 ? a : b; if (GRAV > 0) { top.ground = true; top.on = d < 0 ? b : a; top.vx *= .9; }
    }
  }
}
// you can pick toys up and throw them too
function grabbable(o) {
  let d = null;
  o.el.addEventListener("pointerdown", e => {
    if (targeting) return;
    e.preventDefault(); o.el.setPointerCapture(e.pointerId);
    d = { sx: e.clientX, sy: e.clientY, ox: e.clientX - o.x, oy: e.clientY - o.y, moved: false, tr: [] };
  });
  o.el.addEventListener("pointermove", e => {
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return;
    d.moved = true; o.held = true; o.rest = false; o.el.classList.add("held");
    o.x = e.clientX - d.ox; o.y = e.clientY - d.oy; drawObj(o);
    d.tr.push([performance.now(), e.clientX, e.clientY]); if (d.tr.length > 6) d.tr.shift();
  });
  const up = () => {
    if (!d) return; const dd = d; d = null; o.held = false; o.el.classList.remove("held");
    if (!dd.moved) { poked(o); return; }
    const tr = dd.tr.filter(s => performance.now() - s[0] < 120), a = tr[0], b = tr[tr.length - 1];
    if (a && b && b[0] > a[0]) { o.vx = clamp((b[1] - a[1]) / (b[0] - a[0]), -3, 3); o.vy = clamp((b[2] - a[2]) / (b[0] - a[0]), -3, 3); }
    if (Math.hypot(o.vx, o.vy) > .5) o.thrown = true; if (o.fly) o.stun = now() + 1500;
    o.rest = false; kick();
  };
  o.el.addEventListener("pointerup", up); o.el.addEventListener("pointercancel", up);
}
function poked(o) {
  const c = { x: o.x + o.w / 2, y: o.y };
  if (o.kind === "plush") { floater("Mrgl!", c.x, c.y - 10, "say"); o.vy = -.7; o.rest = false; kick(); }
  else if (o.kind === "bomb") floater("Hsss...", c.x, c.y - 10, "say");
  else if (o.kind === "train") { o.vx *= -1; o.el.classList.toggle("flip", o.vx < 0); floater("Choo choo!", c.x, c.y - 10, "say"); }
  else if (o.kind === "bell") ringBell(o);
  else if (o.kind === "whelp") floater("Rawr!", c.x, c.y - 10, "say");
  else if (o.kind === "ball") { o.vy = -1.2; o.vx = (Math.random() - .5) * .6; o.rest = false; kick(); }
}
// the wisp, thrown: floaty, bouncy, a little gravity. Bounces pay; too many hard ones make it dizzy
wisp.onFling = (vx, vy, x, y) => {
  if (!S.on || wisp.el.classList.contains("frozen")) return false;
  const sp = Math.hypot(vx, vy); if (sp < .55) return false;
  startFling(clamp(vx, -4, 4), clamp(vy, -4, 4), x, y);
  const n = (S.stats.throws = (S.stats.throws || 0) + 1); save(); award("toss");
  fl.pay = fresh("toss");
  feel({ fun: liked("toss") ? 8 : 4, rest: -1 });
  if (liked("toss")) learned("like");
  if (n === 1) say(pick(TL.toss), { gap: 0, hold: 2000 });
  return true;
};
function startFling(vx, vy, x, y) {
  if (fl) { fl.vx += vx; fl.vy += vy; return; }
  const r = wisp.el.getBoundingClientRect();
  mind.hold(true);
  fl = { x: x ?? r.left, y: y ?? r.top, vx, vy, hits: 0, hard: 0, quiet: 0, pay: 1 };
  wisp.el.classList.add("flung"); kick();
}
function stepFling(dt) {
  const f = fl, s = wisp.el.getBoundingClientRect().width || 54, bub = wisp.el.classList.contains("shielded");
  f.vy += .0005 * dt * GRAV; if (WIND) f.vx += WIND * dt * 1.6;
  if (f.thrust) {
    if (now() > f.thrust.until) f.thrust = null;
    else { const a = f.thrust.a += (Math.random() - .5) * .35; f.vx += Math.cos(a) * .0045 * dt; f.vy += Math.sin(a) * .0045 * dt; const sp = Math.hypot(f.vx, f.vy); if (sp > 1.7) { f.vx *= 1.7 / sp; f.vy *= 1.7 / sp; } if (Math.random() < .5) emit({ k: "smoke", x: f.x + 27, y: f.y + 40, vx: -f.vx * .2, vy: .04, life: 700, r: 5 }); }
  }
  const k = Math.pow(bub ? .9993 : .9984, dt); f.vx *= k; f.vy *= k;
  f.x += f.vx * dt; f.y += f.vy * dt;
  const e = bub ? .96 : .74, fy = floorAt(f.x, s) - s - 2;
  let hit = 0, hx = 0, hy = 0;
  if (f.x < 4) { f.x = 4; hit = Math.abs(f.vx); f.vx = Math.abs(f.vx) * e; hx = 0; hy = s / 2; }
  if (f.x > innerWidth - s - 4) { f.x = innerWidth - s - 4; hit = Math.abs(f.vx); f.vx = -Math.abs(f.vx) * e; hx = s; hy = s / 2; }
  if (f.y < 4) { f.y = 4; hit = Math.max(hit, Math.abs(f.vy)); f.vy = Math.abs(f.vy) * e; hx = s / 2; hy = 0; }
  if (f.y > fy) { f.y = fy; hit = Math.max(hit, Math.abs(f.vy)); f.vy = -Math.abs(f.vy) * e; f.vx *= .9; hx = s / 2; hy = s; }
  wisp.moveTo(f.x, f.y);
  if (hit > .32) bounced(hit, f.x + hx, f.y + hy, bub);
  // bump into toys on the way
  const cx = f.x + s / 2, cy = f.y + s / 2;
  for (const o of objs) {
    if (o.held || o.kind === "train") continue;
    const ox = o.x + o.w / 2, oy = o.y + o.h / 2, d = Math.hypot(cx - ox, cy - oy);
    if (d < s / 2 + o.w / 2 - 4 && now() - (o.bumped || 0) > 250) { o.bumped = now(); o.vx = f.vx * .9 + (ox - cx) / d * .4; o.vy = f.vy * .9 - .35; o.rest = false; }
  }
  if (!f.thrust && !WIND && Math.hypot(f.vx, f.vy) < .07) { f.quiet += dt; if (f.quiet > 220) settle(); } else f.quiet = 0;
}
function bounced(hit, x, y, bub) {
  const f = fl; f.hits++; if (hit > .95) f.hard++;
  wisp.el.classList.remove("squash"); void wisp.el.offsetWidth; wisp.el.classList.add("squash");
  burst(x, y, Math.min(26, 6 + hit * 10), .5 + hit * .3);
  earn((5 + hit * 12) * (bub ? 2 : 1) * f.pay, x, y);
  if (f.hits === 7) { award("bounce7"); say(pick(TL.bounce7), { gap: 0, hold: 2500 }); }
}
function settle() {
  const f = fl; fl = null; wisp.el.classList.remove("flung");
  store.set("wispPos", { x: f.x / innerWidth, y: f.y / innerHeight }); wisp.restore();
  mind.hold(false);
  if (f.hard >= 4 && !wisp.el.classList.contains("dizzy")) {
    wisp.el.classList.add("dizzy"); setTimeout(() => wisp.el.classList.remove("dizzy"), 2600);
    feel({ rest: -4, trust: -1 }); say(pick(TL.dizzy), { gap: 0, hold: 2500 });
  } else if (f.hits >= 2 && Math.random() < .5) say(pick(TL.toss), { gap: 40e3, hold: 2000 });
}

/* =================== using toys =================== */
let targeting = null, aimEl = null, swallow = false;
function use(id, atPointer) {
  const t = BY[id]; if (!t || !owns(id) || !S.on) return;
  if (cdLeft(id) > 0) { err("That isn't ready yet."); return; }
  if (t.k === "hold") { equip(id); return; }
  if (t.k === "self" && (wisp.el.hidden || store.get("wispInPond", null))) { err(store.get("wispInPond", null) ? "The wisp is at the bottom of the faire pond." : "The wisp isn't here. Call it back first."); return; }
  if (t.k === "place" || t.k === "aim") {
    const [px, py] = mind.pointer();
    if (atPointer && px >= 0 && py < FLOOR.top - 10) { drop(id, px, py); return; }
    if (targeting === id) { endAim(); return; }
    aim(id); return;
  }
  if (EFFECT[id] && EFFECT[id]() !== false) done(id);
}
function done(id) {
  const t = BY[id]; if (t.cd) S.cd[id] = now() + t.cd * 1000;
  const first = !S.uses[id]; S.uses[id] = (S.uses[id] || 0) + 1; save(); drawCds();
  if (first && id !== "fish") setTimeout(() => { const c = wc(); notice("New toy", `First time with the ${t.n}. Fizzlewick pays 20 silver for test results.`, t.i); earn(2000, c.x, c.y - 30, true); }, 1400);
  // toys used on the wisp show how it feels straight away; toys dropped on the page do when it plays with them
  if ((t.k === "self" || t.k === "hold") && liked(id)) { feel({ fun: 8, trust: 2 }); face("happy", 2500); learned("like"); }
  if ((t.k === "self" || t.k === "hold" || t.k === "aim") && hated(id)) { feel({ trust: -3, fun: -3 }); learned("dislike"); }
}
// the wisp lets you know what it loves and what it can't stand; twice each and you've learned it
function learned(which) {
  const k = which + "N"; S.learn[k] = (S.learn[k] || 0) + 1;
  const thing = THING[S.likes[which]];
  if (S.learn[k] === 1 || (S.learn[k] === 2 && !S.learn[which])) setTimeout(() => say(fill(pick(which === "like" ? TL.love : TL.hate), { thing: thing.toLowerCase() }), { gap: 0, hold: 3000 }), 2600);
  if (S.learn[k] >= 2 && !S.learn[which]) {
    S.learn[which] = 1;
    setTimeout(() => notice("Getting to know it", which === "like" ? `The wisp loves ${thing}.` : `The wisp can't stand ${thing}.`, which === "like" ? "spell_holy_heal" : "spell_shadow_twilight"), 5200);
    if (S.learn.like && S.learn.dislike) award("knowwisp");
  }
  save(); drawUnit();
}
function aim(id) {
  endAim(); targeting = id;
  aimEl = document.createElement("img"); aimEl.className = "tb-aimcur"; aimEl.src = ICON(id === "fish" ? fishIcon() : BY[id].i); aimEl.alt = "";
  document.body.append(aimEl); document.documentElement.classList.add("tb-aim");
  const [px, py] = mind.pointer(); moveAim(px, py);
  const s = bar && $(`.tb-slot[data-id="${id}"]`, bar); if (s) s.classList.add("on");
}
function moveAim(x, y) { if (aimEl && x >= 0) aimEl.style.transform = `translate(${x - 17}px,${y - 17}px)`; }
function endAim() {
  targeting = null; if (aimEl) aimEl.remove(); aimEl = null; document.documentElement.classList.remove("tb-aim");
  if (bar) $$(".tb-slot.on", bar).forEach(s => s.classList.remove("on"));
}
const onAimMove = e => moveAim(e.clientX, e.clientY);
const onAimDown = e => {
  if (tool && !(e.target.closest && e.target.closest(".toybar, .tb-shop"))) { e.preventDefault(); e.stopPropagation(); swallow = true; tool.down = true; return; }
  if (!targeting) return;
  if (e.target.closest && e.target.closest(".toybar, .tb-shop")) return;
  e.preventDefault(); e.stopPropagation(); swallow = true;
  const id = targeting; endAim(); drop(id, e.clientX, Math.min(e.clientY, FLOOR.top - 24));
};
const onAimClick = e => { if (swallow) { swallow = false; e.preventDefault(); e.stopPropagation(); } };
const onMenu = e => { if (targeting || tool) { e.preventDefault(); endAim(); unequip(); } };
const onToolUp = () => { if (tool) tool.down = false; };
function drop(id, x, y) {
  const t = BY[id];
  if (AT[id]) { AT[id](x, y); done(id); return; }
  if (id === "whelp") { releaseWhelp(x, y); done(id); return; }
  if (id === "fish") {
    const f = X.bag && X.bag.list().find(([n]) => X.bag.isFish(n)); if (!f) { err("No fish in your faire bag."); return; }
    const it = X.bag.take(f[0]); spawn("fish", x, y, { icon: it.i, food: true, name: it.n }); drawSlots();
  } else if (id === "plush") {
    const old = objs.find(o => o.kind === "plush"); if (old) remove(old);
    spawn("plush", x, y, { icon: t.i });
  } else if (id === "train") {
    const old = objs.find(o => o.kind === "train"); if (old) remove(old);
    const o = spawn("train", x, y, { icon: t.i, vx: x < innerWidth / 2 ? .13 : -.13 }); o.y = floorAt(o.x, o.w) - o.h; o.el.classList.toggle("flip", o.vx < 0);
    o.timer = setTimeout(() => remove(o), 32000);
  } else if (id === "bomb") {
    const o = spawn("bomb", x, y, { icon: t.i });
    o.timer = setTimeout(() => { o.el.classList.add("late"); o.timer = setTimeout(() => explode(o), 900); }, 2100);
  } else spawn(id, x, y, { icon: t.i, food: !!t.food });
  done(id); mind.nudge(600);
}

/* ---- what each toy does ---- */
const has = c => wisp.el.classList.contains(c);
const timers = {};
function effect(cls, ms, html, end) {
  clearTimeout(timers[cls]); wisp.el.classList.add(cls);
  if (html && !$(".tbx." + html.cls, wisp.el)) orb.insertAdjacentHTML("beforeend", `<span class="tbx ${html.cls}" aria-hidden="true">${html.inner || ""}</span>`);
  timers[cls] = setTimeout(() => { clearEffect(cls, html); end && end(); }, ms);
}
function clearEffect(cls, html) { clearTimeout(timers[cls]); wisp.el.classList.remove(cls); if (html) $$(".tbx." + html.cls, wisp.el).forEach(e => e.remove()); }
let casting = null;
function cast(name, ms, channel, onDone) {
  if (casting) casting.fail("Interrupted");
  const el = document.createElement("div"); el.className = "tb-cast" + (channel ? " chan" : ""); el.innerHTML = `<i></i><span>${esc(name)}</span>`; document.body.append(el);
  const fill = el.firstChild, t0 = performance.now(); let raf2 = 0;
  const me = casting = {
    fail(msg) { cancelAnimationFrame(raf2); removeEventListener("tw:wisp", onGrab); el.classList.add("fail"); el.lastChild.textContent = msg; casting = null; setTimeout(() => el.remove(), 700); },
  };
  const onGrab = e => { if (e.detail && e.detail.type === "grab" && casting === me) me.fail("Interrupted"); };
  addEventListener("tw:wisp", onGrab);
  const step = t => {
    const k = Math.min(1, (t - t0) / ms); fill.style.width = (channel ? 100 - k * 100 : k * 100) + "%";
    if (k < 1) raf2 = requestAnimationFrame(step); else { removeEventListener("tw:wisp", onGrab); casting = null; el.remove(); onDone(); }
  };
  raf2 = requestAnimationFrame(step);
}
const boing = () => { wisp.el.classList.remove("boing"); void wisp.el.offsetWidth; wisp.el.classList.add("boing"); };
let frozen = null, sheep = false;
const EFFECT = {
  hearth() {
    cast("Hearthstone", 5000, false, () => {
      const c = wc(), bub = has("shielded"); burst(c.x, c.y, 30, .9); mind.stop(false);
      wisp.el.style.opacity = "0";
      setTimeout(() => {
        store.set("wispPos", null); wisp.home(); wisp.el.style.opacity = ""; boing();
        const h = wc(); burst(h.x, h.y, 30, .9);
        if (bub) { award("bubblehearth"); earn(1000, h.x, h.y - 20, true); say(pick(TL.bubblehearth), { gap: 0, hold: 3000 }); }
        else { earn(10 * fresh("hearth")); say(pick(TL.hearth), { gap: 20e3, hold: 2500 }); }
      }, 260);
    });
  },
  pole() {
    if (M.trust < 10) { say(pick(TL.no), { gap: 0, hold: 1800 }); return false; }
    let [px, py] = mind.pointer(); const s = mind.osz();
    if (px < 0 || py > FLOOR.top - 20) { px = innerWidth / 2; py = innerHeight * .45; }
    const slot = bar && $('.tb-slot[data-id="pole"]', bar), sr = slot ? slot.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight - 40, width: 0 };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "tb-line"); svg.innerHTML = `<path fill="none" stroke="rgba(230,230,230,.85)" stroke-width="1.4"/>`; document.body.append(svg);
    const path = svg.firstChild, ax = sr.left + sr.width / 2, ay = sr.top;
    mind.stop(false); mind.hold(true);
    const r = wisp.el.getBoundingClientRect(), x0 = r.left, y0 = r.top, tx = clamp(px - s / 2, 4, innerWidth - s - 4), ty = clamp(py - s / 2, 4, FLOOR.top - s - 4), t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / 1100), e = k < .2 ? 0 : (k - .2) / .8, ee = 1 - (1 - e) ** 3;
      const x = x0 + (tx - x0) * ee, y = y0 + (ty - y0) * ee + Math.sin(e * 9) * 6 * (1 - e);
      wisp.moveTo(x, y);
      const cx = x + s / 2, cy = y + s / 2;
      path.setAttribute("d", `M${ax},${ay} Q${(ax + cx) / 2},${Math.max(ay, cy) + 40 * (1 - ee)} ${cx},${cy}`);
      if (k < 1) requestAnimationFrame(step);
      else { svg.remove(); store.set("wispPos", { x: tx / innerWidth, y: ty / innerHeight }); wisp.restore(); mind.hold(false); boing(); feel({ fun: 4 }); earn(15 * fresh("pole")); say(pick(TL.pole), { gap: 30e3, hold: 2200 }); }
    };
    requestAnimationFrame(step);
  },
  shield() {
    effect("shielded", 15000, { cls: "tb-shield" });
    const c = wc(); burst(c.x, c.y, 16, .6); feel({ trust: 1 }); earn(10 * fresh("shield"));
    say(pick(TL.shield), { gap: 25e3, hold: 2500 });
  },
  bandage() {
    cast("Heavy Runecloth Bandage", 3000, true, () => {
      wisp.el.classList.remove("dizzy", "shook", "shiver"); const low = M.trust < 40;
      feel({ rest: 20, fun: 2, trust: low ? 5 : 2 }); face("happy", 2500); earn(15 * fresh("bandage"));
      say(pick(low ? TL.bandage_low : TL.bandage), { gap: 0, hold: 2600 });
    });
  },
  frost() {
    if (has("fiery")) { say(pick(TL.frost_fire), { gap: 0, hold: 2500 }); earn(5); return; }
    if (frozen) return false;
    mind.stop(false); mind.hold(true); clearEffect("sheep", { cls: "tb-sheep" });
    frozen = { chips: 0 };
    effect("frozen", 12000, { cls: "tb-ice" }, () => thaw(false));
    const c = wc(); burst(c.x, c.y, 14, .5);
    feel({ fun: -4, trust: hated("frost") ? -4 : -2, rest: -2 }); earn(12 * fresh("frost"));
    say(pick(TL.frost), { gap: 0, hold: 2200 });
  },
  poly() {
    if (frozen) thaw(true);
    mind.stop(false); sheep = true;
    effect("sheep", 12000, { cls: "tb-sheep", inner: "<i></i><i></i>" }, () => unsheep(false));
    const c = wc(); burst(c.x, c.y, 20, .7); award("sheep");
    feel({ fun: hated("poly") ? -2 : 6, trust: -1 }); earn(14 * fresh("poly"));
    say(pick(TL.poly), { gap: 0, hold: 1800 });
    // a sheep wanders about on its own: little hops along the bottom
    setTimeout(() => mind.begin("sheep", async c => {
      const s = mind.osz();
      while (sheep && c.alive()) {
        const r = wisp.el.getBoundingClientRect(), fy = floorAt(r.left, s) - s - 6;
        if (!await c.fly(clamp(r.left + (Math.random() - .5) * 160, 8, innerWidth - s - 8), fy, 650)) return;
        if (Math.random() < .3) floater("baa", r.left + s / 2, fy - 10, "say");
        if (!await c.wait(700 + rnd(900))) return;
      }
    }, { home: false }), 50);
  },
  shrink() {
    const r = Math.random(), c = wc();
    clearEffect("tiny"); clearEffect("huge"); burst(c.x, c.y, 14, .6);
    if (r < .1) { document.documentElement.classList.add("tb-shrunk"); setTimeout(() => document.documentElement.classList.remove("tb-shrunk"), 3000); say(pick(TL.backfire), { gap: 0, hold: 2500 }); }
    else if (r < .65) { effect("tiny", 20000); say(pick(TL.shrink), { gap: 0, hold: 2200 }); }
    else { effect("huge", 20000); say(pick(TL.grow), { gap: 0, hold: 2200 }); }
    feel({ fun: hated("shrink") ? -2 : 5 }); earn(15 * fresh("shrink"));
  },
};
function thaw(shattered) {
  if (!frozen) return;
  const chips = frozen.chips; frozen = null; clearEffect("frozen", { cls: "tb-ice" }); mind.hold(false);
  const c = wc();
  if (shattered) { burst(c.x, c.y, 34, 1); if (chips >= 5) { award("iced"); say(pick(TL.iced), { gap: 0, hold: 2500 }); earn(30); } }
  wisp.el.classList.add("shiver"); setTimeout(() => wisp.el.classList.remove("shiver"), 1500);
  if (!shattered || chips < 5) say(pick(TL.thaw), { gap: 0, hold: 2500 });
}
function unsheep(early) {
  if (!sheep) return; sheep = false;
  clearEffect("sheep", { cls: "tb-sheep" }); if (mind.act && mind.act.name === "sheep") mind.stop(false);
  const c = wc(); burst(c.x, c.y, 20, .7); boing();
  say(pick(TL.unpoly), { gap: 0, hold: 2500 });
  setTimeout(() => mind.begin("home", async () => {}), 1600);
}
// pokes while frozen chip the ice; a poke breaks the sheep spell, like damage does
wisp.onPoke = () => {
  if (!S.on) return false;
  if (M.trust < 10 && !frozen && !sheep && Math.random() < .6) { say(pick(TL.no), { gap: 0, hold: 1500 }); return true; }
  if (frozen) {
    frozen.chips++; const ice = $(".tb-ice", wisp.el), c = wc(); if (ice) ice.className = "tbx tb-ice c" + Math.min(4, frozen.chips);
    burst(c.x, c.y, 8, .5); earn(6, c.x, c.y - 10); floater("Chip!", c.x, c.y - 34, "say");
    if (frozen.chips >= 5) thaw(true);
    return true;
  }
  if (sheep) { unsheep(true); return true; }
  return false;
};
// Fizzlewick's bomb: everything nearby goes flying, the wisp included
function explode(o) {
  if (o.dead) return;
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2; remove(o);
  burst(cx, cy, 60, 1.6);
  const ring = document.createElement("div"); ring.className = "tb-boom"; ring.style.left = cx + "px"; ring.style.top = cy + "px"; document.body.append(ring); setTimeout(() => ring.remove(), 600);
  const m = $("main"); if (m && !REDUCE) { m.classList.remove("tb-shake"); void m.offsetWidth; m.classList.add("tb-shake"); }
  for (const q of objs) { if (q.kind === "train" || q.held) continue; const dx = q.x + q.w / 2 - cx, dy = q.y + q.h / 2 - cy, d = Math.hypot(dx, dy) || 1; if (d < 260) { const p = (1 - d / 260) * 2.2; q.vx += dx / d * p; q.vy += dy / d * p - .8; q.rest = false; } }
  kick();
  if (wisp.el.hidden) return;
  const c = wc(), dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy) || 1;
  if (d > 250) return;
  if (has("shielded")) { say(pick(TL.shield_bomb), { gap: 0, hold: 2500 }); earn(50); feel({ fun: 5 }); return; }
  if (frozen) thaw(true);
  if (sheep) unsheep(true);
  mind.stop(false);
  const p = (1 - d / 250) * 2.4 + .7;
  startFling(dx / d * p, dy / d * p - .6);
  const n = mind.remember("bombs");
  feel({ trust: hated("bomb") ? -9 : -5, fun: 6, rest: -4 }); earn((60 + rnd(40)) * fresh("bomb"), c.x, c.y);
  if (hated("bomb")) learned("dislike");
  setTimeout(() => say(pick(n === 1 ? TL.bomb_first : TL.bomb_hit), { gap: 0, hold: 2500 }), 500);
}
function driveTrain(o, dt) {
  o.x += o.vx * dt; o.y = floorAt(o.x, o.w) - o.h;
  if (o.x < 2 || o.x + o.w > innerWidth - 2) { o.vx *= -1; o.x = clamp(o.x, 2, innerWidth - o.w - 2); o.el.classList.toggle("flip", o.vx < 0); }
  if (!REDUCE && Math.random() < dt / 260) fx.trail(o.x + (o.vx > 0 ? o.w * .3 : o.w * .7), o.y + 4);
  drawObj(o);
}

/* =================== particles: water, fire, stars, snow, arrows, fireworks =================== */
let pcv = null, pcx = null, PR = 1, drift = null, driftMelt = 0;
const P = [], SPR = {};
function pctx() {
  if (pcx) return pcx;
  pcv = document.createElement("canvas"); pcv.className = "tb-pfx"; pcv.setAttribute("aria-hidden", "true"); document.body.append(pcv);
  PR = Math.min(2, devicePixelRatio || 1);
  const size = () => { pcv.width = innerWidth * PR; pcv.height = innerHeight * PR; }; size(); addEventListener("resize", size);
  return pcx = pcv.getContext("2d");
}
function emit(p) { pctx(); if (P.length < 900) P.push(Object.assign({ vx: 0, vy: 0, g: 0, life: 1000, r: 3 }, p, { max: p.life || 1000 })); kick(); }
// one soft glow per colour, drawn once and reused (cheaper than a gradient per particle)
function sprite(c, hot) {
  const k = c + (hot ? "h" : ""); if (SPR[k]) return SPR[k];
  const cv = document.createElement("canvas"); cv.width = cv.height = 64; const x = cv.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (hot) { g.addColorStop(0, "rgba(255,248,200,1)"); g.addColorStop(.35, "rgba(255,170,60,.9)"); g.addColorStop(.7, "rgba(220,60,20,.35)"); g.addColorStop(1, "rgba(160,20,0,0)"); }
  else { g.addColorStop(0, `rgba(${c},1)`); g.addColorStop(.35, `rgba(${c},.65)`); g.addColorStop(1, `rgba(${c},0)`); }
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return SPR[k] = cv;
}
function drawFx(dt) {
  if (!pcx) return;
  const c = pcx; c.setTransform(PR, 0, 0, PR, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
  const w = wisp.el.hidden ? null : wc();
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    if (!stopped) {
      p.vy += p.g * dt * (p.ng ? 1 : GRAV); if (p.drag) { const k = Math.pow(p.drag, dt / 16); p.vx *= k; p.vy *= k; }
      if (p.sway) p.vx = Math.sin((now() + p.sw) / 400) * p.sway + WIND * 60;
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.hit && w && !p.hw && Math.hypot(p.x - w.x, p.y - w.y) < w.s / 2 + p.r) { p.hw = 1; p.hit(p, w); if (!p.pierce) p.life = 0; }
      if (p.hitObj && !p.ho && p.life > 0) for (const o of objs) if (!o.dead && p.x > o.x - p.r && p.x < o.x + o.w + p.r && p.y > o.y - p.r && p.y < o.y + o.h + p.r) { p.ho = 1; p.hitObj(p, o); if (!p.pierce) p.life = 0; break; }
      if (p.floor && p.life > 0 && p.y > (p.fy ? p.fy(p) : floorAt(p.x, 1) - 2)) { p.floor(p); p.life = 0; p.hw = 1; }
    }
    if (p.life <= 0 || p.y > innerHeight + 60 || p.x < -80 || p.x > innerWidth + 80 || p.y < -600) { if (p.end && p.life <= 0 && !p.hw && !p.ho) p.end(p); P.splice(i, 1); continue; }
    drawP(c, p);
  }
  c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  if (drift) drawDrift(c, dt);
  if (tool && tool.id === "flail" && flail) drawFlail(c);
}
function drawP(c, p) {
  const f = Math.max(0, Math.min(1, p.life / p.max)), a = Math.min(1, f * 1.8);
  c.globalCompositeOperation = p.add ? "lighter" : "source-over"; c.globalAlpha = a;
  if (p.k === "drop") { c.strokeStyle = "rgba(160,210,255,.9)"; c.lineWidth = p.r; c.lineCap = "round"; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 14, p.y - p.vy * 14); c.stroke(); }
  else if (p.k === "fire" || p.k === "meteor") { const r = p.r * (p.k === "meteor" ? 2.2 : 1.8 - f * .8); c.drawImage(sprite("", 1), p.x - r, p.y - r, r * 2, r * 2); if (p.k === "meteor") { c.globalAlpha = a * .6; for (let k = 1; k < 6; k++) { const rr = r * (1 - k * .14); c.drawImage(sprite("", 1), p.x - p.vx * k * 18 - rr, p.y - p.vy * k * 18 - rr, rr * 2, rr * 2); } } }
  else if (p.k === "star") { c.fillStyle = `rgb(${p.c})`; c.drawImage(sprite(p.c), p.x - p.r * 2.4, p.y - p.r * 2.4, p.r * 4.8, p.r * 4.8); X.star(c, p.x, p.y, p.r, p.rot = (p.rot || 0) + .06); }
  else if (p.k === "snow") { c.fillStyle = "#fff"; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 7); c.fill(); }
  else if (p.k === "arrow") { c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.vy, p.vx)); c.strokeStyle = "#d8c18e"; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, 0); c.lineTo(0, 0); c.stroke(); c.fillStyle = "#d9dde6"; c.beginPath(); c.moveTo(5, 0); c.lineTo(-3, -3.6); c.lineTo(-3, 3.6); c.fill(); c.fillStyle = "#7cf29a"; c.fillRect(-21, -3, 5, 6); c.restore(); }
  else if (p.k === "note") { c.fillStyle = `rgb(${p.c})`; c.font = `700 ${p.r * 3}px "Alegreya Sans", sans-serif`; c.fillText(p.t, p.x, p.y); }
  else if (p.k === "zap") { c.globalAlpha = 1; c.lineJoin = "round"; for (const [lw, col] of [[7, "rgba(124,200,255,.35)"], [3, "rgba(190,230,255,.9)"], [1.2, "#fff"]]) { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); p.pts.forEach(([x, y], k) => k ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); } }
  else if (p.k === "streak") { c.strokeStyle = "rgba(225,240,255,.55)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 34, p.y); c.stroke(); }
  else if (p.k === "smoke") { c.globalAlpha = a * .5; c.drawImage(sprite("150,150,160"), p.x - p.r * 2, p.y - p.r * 2, p.r * 4, p.r * 4); p.r += .15; }
  else { const r = p.r * 2.6; c.drawImage(sprite(p.c || "232,137,255"), p.x - r, p.y - r, r * 2, r * 2); if (p.trail) { c.strokeStyle = `rgba(${p.c},.5)`; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 40, p.y - p.vy * 40); c.stroke(); } }
}
// snow piles up on top of the toy bar and along the bottom, then melts
const baseAt = i => floorAt(i * 8, 8);
function drawDrift(c, dt) {
  let tot = 0; const melt = driftMelt && now() > driftMelt, w = has("fiery") ? wc() : null;
  c.fillStyle = "rgba(244,250,255,.95)";
  for (let i = 0; i < drift.length; i++) {
    if (melt) drift[i] = Math.max(0, drift[i] - .004 * dt);
    if (w && Math.abs(i * 8 - w.x) < 50) drift[i] = Math.max(0, drift[i] - .02 * dt);
    const h = drift[i]; tot += h; if (h < .6) continue;
    const b = baseAt(i); c.fillRect(i * 8, b - h + 3, 8, h - 3); c.beginPath(); c.arc(i * 8 + 4, b - h + 4, 5.5, 0, 7); c.fill();
  }
  if (melt && tot < 1) drift = null;
}
function snowLand(p) {
  if (!drift) return; const i = Math.round(p.x / 8); if (drift[i] == null) return;
  drift[i] = Math.min(46, drift[i] + 1.1); if (drift[i - 1] != null) drift[i - 1] = Math.min(46, drift[i - 1] + .45); if (drift[i + 1] != null) drift[i + 1] = Math.min(46, drift[i + 1] + .45);
  if (drift.reduce((s, v) => s + v, 0) / drift.length > 12) award("snowed");
}
const snowY = p => drift ? baseAt(Math.round(p.x / 8)) - (drift[Math.round(p.x / 8)] || 0) : innerHeight;

/* =================== knocks, blasts and what they do to the wisp =================== */
let mc = null, soot = 0, wet = 0, kind2 = 0;
function hitWisp(ix, iy) {
  if (wisp.el.hidden || mc || has("flat")) return;
  if (frozen) { if (Math.hypot(ix, iy) < 1.6) return; thaw(true); }
  if (sheep) unsheep(true);
  if (has("shielded")) { ix *= .5; iy *= .5; }
  if (fl) { fl.vx = clamp(fl.vx + ix, -3.5, 3.5); fl.vy = clamp(fl.vy + iy, -3.5, 3.5); return; }
  mind.stop(false); startFling(clamp(ix, -3.5, 3.5), clamp(iy, -3.5, 3.5));
}
// something you threw, or something heavy, hits the wisp
function hitsWisp(o) {
  if (wisp.el.hidden || mc) return;
  const sp = Math.hypot(o.vx, o.vy); if (sp < .5 || now() - (o.hitW || 0) < 400) return;
  const w = wc(), cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  if (Math.hypot(cx - w.x, cy - w.y) > w.s / 2 + o.w / 2 - 6) return;
  o.hitW = now();
  if (o.kind === "anvil" && o.vy * GRAV > .4 && cy < w.y) { flatten(o); return; }
  const k = Math.min(2.5, o.m) * .6;
  hitWisp(o.vx * k, o.vy * k - .3); o.vx *= -.3; o.vy *= -.3;
  if (o.thrown) { feel({ trust: -1, fun: 1 }); say(pick(TL.hey), { gap: 20e3, hold: 1800 }); }
  earn(8 * fresh("hit"), w.x, w.y - 20);
}
function settled(o) {
  mind.nudge(250); o.thrown = false;
  if (o.kind === "crate") { let n = 1, q = o; const seen = new Set([o]); while (q.on && q.on.kind === "crate" && !seen.has(q.on)) { seen.add(q.on); q = q.on; n++; } if (n >= 3) award("crates"); }
}
function impact(o, v) {
  if (o.kind === "bell") ringBell(o);
  if (o.kind === "anvil" && v > .7 && !REDUCE) { const m = $("main"); if (m) { m.classList.remove("tb-shake"); void m.offsetWidth; m.classList.add("tb-shake"); } }
}
function flatten(o) {
  mind.stop(false); mind.hold(true);
  if (fl) { fl = null; wisp.el.classList.remove("flung"); mind.hold(false); }
  wisp.el.classList.add("flat"); const w = wc(); burst(w.x, w.y, 24, .7);
  o.vy = -.35; o.vx = (Math.random() - .5) * .5;
  feel({ trust: -4, rest: -5, fun: 2 }); earn(40 * fresh("anvil"), w.x, w.y - 20); award("flattened");
  say(pick(TL.flat), { gap: 0, hold: 2500 });
  setTimeout(() => { wisp.el.classList.remove("flat"); mind.hold(false); boing(); }, 2600);
}
function ring(x, y, color, scale = 1) { const r = document.createElement("div"); r.className = "tb-ring"; r.style.left = x + "px"; r.style.top = y + "px"; r.style.setProperty("--rc", color); r.style.setProperty("--rs", 14 * scale); document.body.append(r); setTimeout(() => r.remove(), 650); }
// a push outward from a point: toys fly, and so does the wisp unless told otherwise. Returns how hard the wisp got hit
function blast(cx, cy, R, power, o = {}) {
  if (o.ring !== false) ring(cx, cy, o.color || "#ffd27a", R / 120);
  burst(cx, cy, Math.round(16 + power * 16), .6 + power * .4);
  if (power > 1.4 && !REDUCE) { const m = $("main"); if (m) { m.classList.remove("tb-shake"); void m.offsetWidth; m.classList.add("tb-shake"); } }
  for (const q of objs) { if (q.kind === "train" || q.held) continue; const dx = q.x + q.w / 2 - cx, dy = q.y + q.h / 2 - cy, d = Math.hypot(dx, dy) || 1; if (d < R) { const p = (1 - d / R) * power / Math.sqrt(q.m); q.vx += dx / d * p; q.vy += dy / d * p - .5; q.rest = false; if (q.fly) q.stun = now() + 1200; if (q.kind === "bell") ringBell(q); } }
  kick();
  if (o.wisp === false || wisp.el.hidden) return 0;
  const c = wc(), dx = c.x - cx, dy = c.y - cy, d = Math.hypot(dx, dy) || 1;
  if (d > R) return 0;
  const p = (1 - d / R) * power + .4; hitWisp(dx / d * p, dy / d * p - .4); return p;
}
function bumpObjs(cx, cy, vx, vy, s) {
  for (const o of objs) {
    if (o.held || o.kind === "train") continue;
    const ox = o.x + o.w / 2, oy = o.y + o.h / 2, d = Math.hypot(cx - ox, cy - oy) || 1;
    if (d < s / 2 + o.w / 2 - 4 && now() - (o.bumped || 0) > 250) { o.bumped = now(); o.vx = vx * .9 + (ox - cx) / d * .4; o.vy = vy * .9 - .35; o.rest = false; if (o.fly) o.stun = now() + 1200; if (o.kind === "bell") ringBell(o); }
  }
  kick();
}
function singe(n) {
  if (has("fiery")) { feel({ fun: .2 }); say(pick(TL.fiery_warm), { gap: 30e3, hold: 2000 }); return false; }
  if (frozen) thaw(true);
  const before = soot; soot += n;
  if (Math.floor(soot / 8) > Math.floor(before / 8)) { feel({ trust: hated("dragon") ? -2 : -1, fun: -1 }); say(pick(TL.singe), { gap: 15e3, hold: 1800 }); }
  if (soot > 10) effect("sooty", 9000, null, () => { soot = 0; });
  return true;
}
function soak(n) {
  const before = wet; wet += n;
  if (before < 3 && wet >= 3) { feel({ fun: 3 }); say(pick(TL.splash), { gap: 30e3, hold: 1800 }); }
  if (wet > 40 && Math.floor(wet / 10) > Math.floor(before / 10)) { feel({ trust: hated("pump") ? -2 : -1 }); say(pick(TL.soaked), { gap: 15e3, hold: 2000 }); }
  if (before < 100 && wet >= 100) award("hosed");
  if (wet > 20) effect("wet", 10000, null, () => { wet = 0; });
  if (has("sooty")) { clearEffect("sooty"); soot = 0; }
}
function zap(x1, y1, x2, y2) { const pts = [[x1, y1]], n = 9; for (let k = 1; k < n; k++) { const t = k / n; pts.push([x1 + (x2 - x1) * t + (Math.random() - .5) * 28, y1 + (y2 - y1) * t + (Math.random() - .5) * 28]); } pts.push([x2, y2]); emit({ k: "zap", add: 1, pts, x: x2, y: y2, life: 280, r: 2 }); }

/* =================== the bell, the whelp =================== */
// the wisp is afraid of the bell. Everybody knows this
function ringBell(o) {
  if (now() - (o.rang || 0) < 1500) return; o.rang = now();
  o.el.classList.remove("ring"); void o.el.offsetWidth; o.el.classList.add("ring");
  const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 }; ring(c.x, c.y, "#ffe08a", 1.4); floater("DING!", c.x, c.y - 30, "say");
  award("bell"); if (wisp.el.hidden) return;
  feel({ trust: hated("bell") ? -4 : -2, fun: -3, rest: -2 }); if (hated("bell")) learned("dislike");
  say(pick(TL.bell), { gap: 0, hold: 2200 });
  if (busyWisp()) return;
  mind.stop(false);
  mind.begin("panic", async c2 => {
    wisp.el.classList.add("scared"); c2.me.cleanup = () => wisp.el.classList.remove("scared");
    if (mind.roams) { const s = wsz(); await c2.fly(c.x < innerWidth / 2 ? innerWidth - s - 12 : 12, 80, 500); }
    await c2.wait(3500); wisp.el.classList.remove("scared");
  });
}
function releaseWhelp(x, y) {
  const o = spawn("whelp", x, y, { icon: "inv_misc_head_dragon_black" }); o.until = now() + 15000; o.vy = -.2;
  ticks.add(whelpTick(o)); kick();
  const n = objs.filter(q => q.kind === "whelp" && !q.dead).length;
  say(n >= 3 ? D.WISP.whelps : pick(TL.whelp_flee), { gap: 0, hold: 2200 });
}
function whelpTick(o) {
  return dt => {
    if (o.dead || !S.on) return false;
    if (now() > o.until) { burst(o.x + o.w / 2, o.y + o.h / 2, 20, .6); remove(o); return false; }
    if (stopped || o.held || wisp.el.hidden) return true;
    if (o.stun) { if (now() > o.stun) o.stun = 0; else return true; }
    const w = wc(), dx = w.x - (o.x + o.w / 2), dy = w.y - (o.y + o.h / 2), d = Math.hypot(dx, dy) || 1;
    o.vx += (dx / d * .3 - o.vx) * .05; o.vy += (dy / d * .3 - o.vy) * .05 + Math.sin(now() / 140) * .006;
    o.x = clamp(o.x + o.vx * dt, 2, innerWidth - o.w - 2); o.y = clamp(o.y + o.vy * dt, 2, innerHeight - o.h - 2);
    o.el.classList.toggle("flip", o.vx < 0); drawObj(o);
    if (d < w.s / 2 + 20 && now() > (o.breath || 0)) { o.breath = now() + 2200; breathe(o, dx / d, dy / d); }
    if (!mind.act && !busyWisp() && mind.roams && now() > (o.fleeT || 0)) { o.fleeT = now() + 900; flee(o); }
    return true;
  };
}
function flee(o) {
  mind.begin("flee", async c => {
    const s = wsz(), w = wc(), dx = w.x - (o.x + o.w / 2), dy = w.y - (o.y + o.h / 2), d = Math.hypot(dx, dy) || 1;
    let tx = w.x + dx / d * 240 - s / 2; const ty = clamp(w.y + dy / d * 200 - s / 2, 70, FLOOR.top - s - 10);
    if (tx < 10 || tx > innerWidth - s - 10) tx = w.x < innerWidth / 2 ? innerWidth - s - 30 : 30;
    await c.fly(clamp(tx, 10, innerWidth - s - 10), ty, 650);
  }, { home: false });
}
function breathe(o, ux, uy) {
  const mx = o.x + o.w / 2 + ux * 18, my = o.y + o.h / 2 + uy * 18;
  for (let k = 0; k < 24; k++) emit({ k: "fire", add: 1, x: mx, y: my, vx: ux * (.35 + Math.random() * .25) + (Math.random() - .5) * .15, vy: uy * (.35 + Math.random() * .25) + (Math.random() - .5) * .15, life: 380 + rnd(200), r: 7 });
  setTimeout(() => { if (wisp.el.hidden) return; singe(14); hitWisp(ux * 1.1, uy * 1.1 - .3); feel({ trust: -1, fun: -3 }); award("whelped"); say(pick(TL.whelp), { gap: 15e3, hold: 2200 }); }, 120);
}

/* =================== tools you hold: bow, wand, pump, dragon gun, flail, a gentle hand =================== */
let tool = null, toolEl = null, flail = null, rubbed = 0;
const muzzle = () => [(FLOOR.l + FLOOR.r) / 2 || innerWidth / 2, Math.min(FLOOR.top, innerHeight) - 8];
function equip(id) {
  if (tool && tool.id === id) { unequip(); return; }
  unequip(); endAim();
  tool = { id, down: false, last: 0, rub: 0, lx: -1, ly: -1 };
  toolEl = document.createElement("img"); toolEl.className = "tb-toolcur"; toolEl.src = ICON(BY[id].i); toolEl.alt = ""; document.body.append(toolEl);
  document.documentElement.classList.add("tb-tool");
  const s = bar && $(`.tb-slot[data-id="${id}"]`, bar); if (s) s.classList.add("on");
  if (id === "flail") { pctx(); initFlail(); }
  ticks.add(toolTick); kick();
  if (!S.stats.toolHint) { S.stats.toolHint = 1; save(); notice(BY[id].n, id === "flail" ? "Swing your pointer to swing it. Esc or right-click puts it away." : "Hold the mouse button down over the page. Esc or right-click puts it away.", BY[id].i); }
}
function unequip() {
  if (!tool) return; tool = null; flail = null;
  if (toolEl) toolEl.remove(); toolEl = null; document.documentElement.classList.remove("tb-tool");
  if (bar) $$(".tb-slot.on", bar).forEach(s => s.classList.remove("on"));
}
function toolTick(dt) {
  if (!tool || !S.on) return false;
  const [px, py] = mind.pointer(); if (px < 0) return true;
  if (toolEl) toolEl.style.transform = `translate(${px + 14}px,${py + 12}px)`;
  if (stopped) return true;
  const id = tool.id, t = now();
  if (id === "flail") { stepFlail(dt); return true; }
  if (id === "touch") { rub(px, py); return true; }
  if (!tool.down || py > FLOOR.top - 4) return true;
  if (!tool.used) { tool.used = 1; done(id); }
  const [ox, oy] = muzzle(), dx = px - ox, dy = py - oy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  if (id === "bow" && t - tool.last > 340) { tool.last = t; emit({ k: "arrow", x: ox, y: oy, vx: ux * 1.5, vy: uy * 1.5 - .12, g: .0006, life: 2200, r: 7, hit: arrowHit, hitObj: arrowObj }); }
  if (id === "wand" && t - tool.last > 130) { tool.last = t; emit({ k: "bolt", add: 1, c: pick(["232,137,255", "124,200,255", "124,242,154"]), x: ox, y: oy, vx: ux * 1.1, vy: uy * 1.1, life: d / 1.1 + 300, r: 4, trail: 1, hit: wandHit, hitObj: (p, o) => { o.vx += p.vx * .15 / o.m; o.vy -= .25; o.rest = false; kick(); } }); }
  if (id === "pump") for (let k = 0; k < 3; k++) { const T = Math.max(220, d / .95), g = .0011; emit({ k: "drop", x: ox, y: oy, vx: dx / T + (Math.random() - .5) * .06, vy: dy / T - .5 * g * T + (Math.random() - .5) * .05, g, life: T + 500, r: 3, hit: dropHit, hitObj: dropObj, floor: () => {} }); }
  if (id === "dragon") for (let k = 0; k < 3; k++) { const s = .75 + Math.random() * .2, sp = (Math.random() - .5) * .24; emit({ k: "fire", add: 1, x: ox, y: oy - 4, vx: (ux + sp * uy) * s, vy: (uy - sp * ux) * s, g: -.0002, ng: 1, life: Math.min(1100, d / s + 120), r: 9, pierce: 1, hit: fireHit, hitObj: fireObj }); }
  return true;
}
function arrowHit(p) { hitWisp(p.vx * .55, p.vy * .55 - .2); const w = wc(); floater("Tink!", w.x, w.y - 34, "say"); feel({ trust: hated("bow") ? -4 : -2, fun: -1 }); earn(10 * fresh("bow"), w.x, w.y - 12); say(pick(TL.arrow), { gap: 20e3, hold: 1800 }); }
function arrowObj(p, o) { o.vx += p.vx * .6 / o.m; o.vy += p.vy * .6 / o.m - .2; o.rest = false; if (o.fly) o.stun = now() + 1500; if (o.kind === "bell") ringBell(o); kick(); }
function wandHit(p) { hitWisp(p.vx * .12, p.vy * .12); const w = wc(); burst(w.x, w.y, 6, .4); const g = rubbed < 12 ? .3 : 0; rubbed += g; feel({ trust: g, fun: 2 }); face("happy", 1500); earn(3 * fresh("wand"), w.x, w.y - 12); say(pick(TL.wand), { gap: 30e3, hold: 1800 }); }
function dropHit(p) { hitWisp(p.vx * .06, p.vy * .06); soak(.4); if (Math.random() < .1) earn(2); }
function dropObj(p, o) { o.vx += p.vx * .1 / o.m; o.vy += p.vy * .1 / o.m; o.rest = false; if (o.burning) { o.burning = 0; o.heat = 0; o.el.classList.remove("burning"); } kick(); }
function fireHit(p) { hitWisp(p.vx * .03, p.vy * .03); if (singe(1) && Math.random() < .08) earn(2); }
function fireObj(p, o) {
  o.heat = (o.heat || 0) + 1;
  if (o.kind === "crate" && o.heat > 40 && !o.burning) burn(o);
  if (o.kind === "chicken" && o.heat > 25 && !o.cooked) { o.cooked = 1; o.el.classList.add("cooked"); award("bbq"); floater("Roasted!", o.x + o.w / 2, o.y - 10, "say"); }
  if (drift) { const i = Math.round(p.x / 8); for (let k = i - 3; k <= i + 3; k++) if (drift[k]) drift[k] = Math.max(0, drift[k] - .6); }
}
function burn(o) {
  o.burning = 1; o.el.classList.add("burning"); const t0 = now();
  ticks.add(() => {
    if (o.dead || !o.burning) return false;
    if (Math.random() < .5) emit({ k: "fire", add: 1, x: o.x + Math.random() * o.w, y: o.y + o.h * .7, vy: -.12, g: -.0001, ng: 1, life: 500, r: 8 });
    if (now() - t0 > 1800) { burst(o.x + o.w / 2, o.y + o.h / 2, 18, .6); earn(15, o.x + o.w / 2, o.y); remove(o); return false; }
    return true;
  });
}
// the gentle hand: rub the wisp and it purrs. Builds trust, a little at a time
function rub(px, py) {
  if (!tool.down) { tool.lx = px; tool.ly = py; return; }
  const w = wc(), over = !wisp.el.hidden && Math.hypot(px - w.x, py - w.y) < w.s / 2 + 18;
  if (over && tool.lx >= 0) tool.rub += Math.hypot(px - tool.lx, py - tool.ly);
  tool.lx = px; tool.ly = py;
  if (tool.rub < 160) return;
  tool.rub = 0; if (!tool.used) { tool.used = 1; done("touch"); }
  if (M.trust < 10 && Math.random() < .4) { say(pick(TL.no), { gap: 8e3, hold: 1500 }); return; }
  const g = rubbed < 12 ? (M.trust < 10 ? .4 : .8) * (liked("touch") ? 1.5 : 1) : 0; rubbed += g;
  feel({ trust: g, fun: 2, rest: 1 }); wisp.el.classList.add("blush"); clearTimeout(tool.bt); tool.bt = setTimeout(() => wisp.el.classList.remove("blush"), 900);
  for (let k = 0; k < 3; k++) emit({ k: "note", t: "♥", c: "255,130,180", x: w.x + (Math.random() - .5) * 30, y: w.y - 22, vy: -.08, vx: (Math.random() - .5) * .05, life: 900, r: 4 });
  earn(4 * fresh("touch"), w.x, w.y - 30);
  if (liked("touch")) learned("like"); else say(pick(TL.purr), { gap: 40e3, hold: 1800 });
}
function initFlail() { const [px, py] = mind.pointer(), x = px < 0 ? innerWidth / 2 : px, y = py < 0 ? 200 : py; flail = { pts: Array.from({ length: 8 }, (_, i) => ({ x, y: y + i * 12, px: x, py: y + i * 12 })), hit: 0 }; }
function stepFlail(dt) {
  if (!flail) initFlail();
  const [mx, my] = mind.pointer(), p = flail.pts, L = 13, k = dt / 16;
  p[0].x = p[0].px = mx; p[0].y = p[0].py = my;
  for (let i = 1; i < p.length; i++) { const q = p[i], vx = (q.x - q.px) * .99, vy = (q.y - q.py) * .99; q.px = q.x; q.py = q.y; q.x += vx; q.y += vy + .45 * k * k * GRAV; }
  for (let it = 0; it < 5; it++) for (let i = 1; i < p.length; i++) { const a = p[i - 1], b = p[i], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - L) / d; if (i === 1) { b.x -= dx * f; b.y -= dy * f; } else { a.x += dx * f * .5; a.y += dy * f * .5; b.x -= dx * f * .5; b.y -= dy * f * .5; } }
  const h = p[p.length - 1], vx = (h.x - h.px) / dt, vy = (h.y - h.py) / dt, sp = Math.hypot(vx, vy);
  if (sp < .35 || now() - flail.hit < 260) return;
  const w = wisp.el.hidden ? null : wc();
  if (w && Math.hypot(h.x - w.x, h.y - w.y) < w.s / 2 + 13) {
    flail.hit = now(); if (!tool.used) { tool.used = 1; done("flail"); }
    hitWisp(vx * 1.2, vy * 1.2 - .25); burst(h.x, h.y, 14, .7);
    feel({ trust: hated("flail") ? -5 : -3, fun: -1, rest: -2 }); earn(18 * fresh("flail"), w.x, w.y - 20); award("flail"); say(pick(TL.flail), { gap: 12e3, hold: 1800 });
    return;
  }
  for (const o of objs) if (!o.dead && !o.held && h.x > o.x - 12 && h.x < o.x + o.w + 12 && h.y > o.y - 12 && h.y < o.y + o.h + 12) { flail.hit = now(); o.vx += vx * 1.3 / o.m; o.vy += vy * 1.3 / o.m - .2; o.rest = false; if (o.fly) o.stun = now() + 1500; if (o.kind === "bell") ringBell(o); kick(); break; }
}
function drawFlail(c) {
  const p = flail.pts; c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
  c.strokeStyle = "#8a8f9c"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(p[0].x, p[0].y); for (const q of p) c.lineTo(q.x, q.y); c.stroke();
  c.fillStyle = "#c3c7d1"; for (const q of p.slice(1, -1)) { c.beginPath(); c.arc(q.x, q.y, 2.6, 0, 7); c.fill(); }
  c.fillStyle = "#7a5230"; c.fillRect(p[0].x - 3, p[0].y - 16, 6, 20);
  const h = p[p.length - 1]; c.save(); c.translate(h.x, h.y); c.rotate(now() / 300); c.fillStyle = "#666b77";
  for (let s = 0; s < 8; s++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-3.5, -10); c.lineTo(0, -19); c.lineTo(3.5, -10); c.fill(); }
  c.drawImage(sprite("200,205,215"), -16, -16, 32, 32); c.fillStyle = "#4a4f5a"; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.arc(-4, -4, 4, 0, 7); c.fill();
  c.restore();
}

/* =================== more toys and spells =================== */
Object.assign(EFFECT, {
  renew() {
    effect("renewed", 6000); let n = 0, acc = 0;
    ticks.add(dt => {
      if (!S.on) return false; if (stopped) return true;
      if ((acc += dt) < 400) return true; acc = 0; n++;
      feel({ rest: 3, fun: 1 }); const w = wc();
      for (let k = 0; k < 5; k++) emit({ k: "dot", add: 1, c: "124,242,154", x: w.x + (Math.random() - .5) * 40, y: w.y + 12, vy: -.06 - Math.random() * .05, life: 900, r: 3 });
      if (n < 15) return true;
      feel({ trust: 2 }); clearEffect("sooty"); clearEffect("wet"); soot = wet = 0; wisp.el.classList.remove("dizzy"); return false;
    });
    kick(); earn(10 * fresh("renew")); say(pick(TL.renew), { gap: 20e3, hold: 2200 });
  },
  horn() {
    X.dance && X.dance(); effect("dance", 6000); const t0 = now();
    ticks.add(() => { if (now() - t0 > 6000 || !S.on) return false; if (!stopped && Math.random() < .12) { const w = wc(); emit({ k: "note", t: pick(["♪", "♫", "♬"]), c: pick(["242,197,107", "232,137,255", "124,242,154"]), x: w.x + (Math.random() - .5) * 50, y: w.y - 24, vx: (Math.random() - .5) * .06, vy: -.07, life: 1500, r: 6 }); } return true; });
    kick(); feel({ fun: 15, trust: 1 }); earn(15 * fresh("horn")); award("dance"); say(pick(TL.dance), { gap: 0, hold: 2400 });
  },
  mindcap() {
    if (frozen || mc || has("flat")) return false;
    mind.stop(false); if (fl) { fl = null; wisp.el.classList.remove("flung"); mind.hold(false); }
    mind.hold(true); effect("mindctl", 10000, { cls: "tb-mc" });
    const r = wisp.el.getBoundingClientRect(); mc = { x: r.left, y: r.top, until: now() + 10000 };
    feel({ trust: -2 }); award("mindcap"); say(pick(TL.mindcap), { gap: 0, hold: 2200 });
    ticks.add(dt => {
      if (!mc) return false;
      if (now() > mc.until || !S.on) { const m = mc; mc = null; store.set("wispPos", { x: m.x / innerWidth, y: m.y / innerHeight }); wisp.restore(); mind.hold(false); clearEffect("mindctl", { cls: "tb-mc" }); if (S.on) say(pick(TL.mindcap_end), { gap: 0, hold: 3000 }); return false; }
      if (stopped) return true;
      const [px, py] = mind.pointer(), s = wsz(); if (px < 0) return true;
      const vx = (px - s / 2 - mc.x) * .12, vy = (py - s / 2 - mc.y) * .12;
      mc.x = clamp(mc.x + vx, 4, innerWidth - s - 4); mc.y = clamp(mc.y + vy, 4, innerHeight - s - 4); wisp.moveTo(mc.x, mc.y);
      bumpObjs(mc.x + s / 2, mc.y + s / 2, vx / dt, vy / dt, s);
      return true;
    });
    kick();
  },
  rocket() {
    if (frozen || mc || has("flat")) return false;
    const a = Math.random() * Math.PI * 2;
    if (!fl) { mind.stop(false); startFling(Math.cos(a) * .4, Math.sin(a) * .4); }
    fl.thrust = { a, until: now() + 5000 }; fl.pay = fresh("rocket");
    effect("rocket", 5200); feel({ fun: 10, trust: -1, rest: -3 }); award("rocket"); say(pick(TL.rocket), { gap: 0, hold: 2200 });
  },
  chain() {
    const w = wc(), sx = clamp(w.x + (Math.random() - .5) * 200, 20, innerWidth - 20);
    zap(sx, 0, w.x, w.y); hitWisp((Math.random() - .5) * .4, -.7); effect("zapped", 1300);
    feel({ trust: hated("chain") ? -5 : -3, fun: 2 }); earn(20 * fresh("chain"), w.x, w.y - 20); say(pick(TL.zap), { gap: 0, hold: 2000 });
    let prev = w;
    objs.filter(o => !o.dead && o.kind !== "train").sort((a, b) => Math.hypot(a.x - w.x, a.y - w.y) - Math.hypot(b.x - w.x, b.y - w.y)).slice(0, 4)
      .forEach((o, k) => setTimeout(() => { if (o.dead) return; const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 }; zap(prev.x, prev.y, c.x, c.y); prev = c; o.vy -= 1.1; o.vx += (Math.random() - .5) * .6; o.rest = false; if (o.fly) o.stun = now() + 1500; if (o.kind === "bell") ringBell(o); kick(); }, 140 * (k + 1)));
  },
  holynova() {
    const w = wc(); ring(w.x, w.y, "#ffe9a8", 2.2); blast(w.x, w.y, 260, 1.6, { wisp: false, ring: false });
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; emit({ k: "dot", add: 1, c: "255,236,160", x: w.x, y: w.y, vx: Math.cos(a) * .5, vy: Math.sin(a) * .5, drag: .94, life: 700, r: 4 }); }
    clearEffect("sooty"); clearEffect("wet"); soot = wet = 0;
    feel({ rest: 15, fun: 5, trust: 2 }); face("happy", 2500); earn(12 * fresh("holynova")); say(pick(TL.holynova), { gap: 20e3, hold: 2200 });
  },
  windfury() {
    const side = mind.pointer()[0] > innerWidth / 2 ? -1 : 1, t0 = now(); WIND = side * .0012; wakeAll();
    ticks.add(() => {
      const e = now() - t0; if (e > 4500 || !S.on) { WIND = 0; return false; }
      WIND = side * .0012 * (e < 3500 ? 1 : (4500 - e) / 1000);
      if (!stopped && Math.random() < .5) emit({ k: "streak", x: side > 0 ? -20 : innerWidth + 20, y: 60 + Math.random() * (innerHeight - 140), vx: side * (1.2 + Math.random()), life: 1400, r: 1 });
      if (!stopped && fl == null && !wisp.el.hidden && !mc && !frozen && !has("flat") && Math.random() < .05) hitWisp(side * .25, -.05);
      return true;
    });
    if (!wisp.el.hidden && !mc && !frozen) hitWisp(side * .3, -.15);
    feel({ fun: 5 }); earn(10 * fresh("windfury")); say(pick(TL.wind), { gap: 0, hold: 2000 }); kick();
  },
  levitate() {
    if (GRAV < 0) return false;
    GRAV = -1; wakeAll(); document.documentElement.classList.add("tb-lev");
    if (!wisp.el.hidden && !mc && !frozen) hitWisp(0, -.25);
    award("levitate"); feel({ fun: 6 }); earn(12 * fresh("levitate")); say(pick(TL.levitate), { gap: 0, hold: 2200 });
    setTimeout(() => { GRAV = 1; wakeAll(); document.documentElement.classList.remove("tb-lev"); if (fl) fl.vy += .1; }, 6000);
  },
  timestop() {
    if (stopped) return false;
    stopped = true; mind.hold(true); document.documentElement.classList.add("tb-stop"); award("timestop"); say(pick(TL.timestop), { gap: 0, hold: 2500 });
    setTimeout(() => { stopped = false; mind.hold(false); document.documentElement.classList.remove("tb-stop"); lastT = 0; wakeAll(); }, 5000);
  },
  shadowform() {
    if ($(".tb-dark")) return false;
    const d = document.createElement("div"); d.className = "tb-dark"; d.setAttribute("aria-hidden", "true"); document.body.append(d);
    wisp.el.classList.add("lantern"); award("lightsout"); say(pick(TL.dark), { gap: 0, hold: 2500 });
    const t0 = now();
    ticks.add(() => {
      if (now() - t0 > 12000 || !S.on) { d.remove(); wisp.el.classList.remove("lantern"); return false; }
      const w = wc(), [px, py] = mind.pointer(); d.style.setProperty("--wx", w.x + "px"); d.style.setProperty("--wy", w.y + "px"); d.style.setProperty("--cx", px + "px"); d.style.setProperty("--cy", py + "px");
      return true;
    }); kick();
  },
  starfall() {
    const t0 = now();
    ticks.add(dt => {
      if (now() - t0 > 7000 || !S.on) return false;
      if (!stopped && Math.random() < dt / 70) emit({ k: "star", add: 1, x: Math.random() * innerWidth, y: -20, vx: (Math.random() - .5) * .1, vy: .45 + Math.random() * .35, g: .0002, life: 4000, r: 6 + Math.random() * 4, c: pick(["255,230,140", "232,137,255", "124,200,255"]), hit: starHit, hitObj: (p, o) => { o.vx += p.vx * .4 / o.m; o.vy += p.vy * .4 / o.m; o.rest = false; if (o.kind === "bell") ringBell(o); kick(); }, floor: p => burst(p.x, p.y, 4, .3) });
      return true;
    });
    face("wow", 3000); earn(10 * fresh("starfall")); say(pick(TL.starfall), { gap: 0, hold: 2200 }); kick();
  },
  blizzard() {
    if (!drift) drift = new Array(Math.ceil(innerWidth / 8) + 1).fill(0);
    driftMelt = 0; const t0 = now();
    ticks.add(dt => {
      if (now() - t0 > 8000 || !S.on) { driftMelt = now() + 20000; return false; }
      if (stopped) return true;
      for (let k = 0; k < 4; k++) emit({ k: "snow", x: Math.random() * innerWidth, y: -10, vy: .08 + Math.random() * .1, sway: .05, sw: rnd(9999), life: 12000, r: 1.5 + Math.random() * 2.5, floor: snowLand, fy: snowY });
      if (Math.random() < dt / 900 && !wisp.el.hidden && !has("fiery")) { wisp.el.classList.add("shiver"); setTimeout(() => wisp.el.classList.remove("shiver"), 900); feel({ fun: -1, rest: -1 }); }
      return true;
    });
    if (!has("fiery")) feel({ trust: -1 });
    earn(10 * fresh("blizzard")); say(pick(has("fiery") ? TL.frost_fire : TL.blizzard), { gap: 0, hold: 2200 }); kick();
  },
});
// spells cast at a spot on the page
const AT = {
  arcane(x, y) {
    for (let k = 0; k < 30; k++) { const a = Math.random() * Math.PI * 2, s = .2 + Math.random() * .4; emit({ k: "dot", add: 1, c: "192,132,255", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: .95, life: 600, r: 3 }); }
    const hitp = blast(x, y, 220, 1.9, { color: "#c084ff" });
    if (hitp) { feel({ trust: hated("arcane") ? -4 : -2, fun: 2 }); say(pick(TL.arcane), { gap: 10e3, hold: 1800 }); }
    earn(12 * fresh("arcane"), x, y);
  },
  rainfire(x) {
    let n = 0, acc = 0;
    ticks.add(dt => {
      if (!S.on) return false; if (stopped) return true;
      if ((acc += dt) < 380) return true; acc = 0; n++;
      const tx = x + (Math.random() - .5) * 300;
      emit({ k: "meteor", add: 1, x: tx + 160, y: -30, vx: -.28, vy: .9, life: 3000, r: 10, hit: meteorBoom, hitObj: p => meteorBoom(p), floor: meteorBoom });
      return n < 7;
    });
    kick(); say(pick(TL.meteor), { gap: 0, hold: 2000 });
  },
  fireworks(x) {
    for (let k = 0; k < 3; k++) setTimeout(() => { if (!S.on) return; emit({ k: "dot", add: 1, c: "255,220,150", x: clamp(x + (k - 1) * 90, 20, innerWidth - 20), y: FLOOR.top - 6, vx: (Math.random() - .5) * .08, vy: -(.75 + Math.random() * .25), g: .0004, ng: 1, life: 900 + rnd(400), r: 3, trail: 1, end: fireworkBurst }); }, k * 450);
    face("wow", 4500); mind.lookAt(x, innerHeight * .3); feel({ fun: 8, trust: 1 }); earn(12 * fresh("fireworks")); say(pick(TL.fireworks), { gap: 0, hold: 2200 });
  },
};
function fireworkBurst(p) {
  const col = pick(["232,137,255", "124,242,154", "124,200,255", "242,197,107", "255,138,122"]);
  for (let k = 0; k < 46; k++) { const a = Math.random() * Math.PI * 2, s = .12 + Math.random() * .3; emit({ k: "dot", add: 1, c: col, x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: .00018, ng: 1, drag: .985, life: 1100 + rnd(500), r: 2.4 }); }
}
function meteorBoom(p) {
  if (p.boomed) return; p.boomed = 1; p.life = 0;
  for (let k = 0; k < 12; k++) emit({ k: "fire", add: 1, x: p.x, y: p.y, vx: (Math.random() - .5) * .5, vy: -Math.random() * .4, g: .0005, life: 500, r: 8 });
  const hitp = blast(p.x, p.y, 140, 1.3, { color: "#ff8a3c" });
  if (hitp) { singe(6); feel({ trust: hated("rainfire") ? -4 : -2, fun: 1 }); earn(15, p.x, p.y); }
}
function starHit(p, w) { hitWisp(p.vx * .35, p.vy * .3); earn(5 * fresh("star"), w.x, w.y - 20); award("starstruck"); face("wow", 1500); }

/* =================== the wisp's own choices, with toys about =================== */
const wsz = () => mind.osz();
const above = (o, s = wsz()) => [clamp(o.x + o.w / 2 - s / 2, 4, innerWidth - s - 4), clamp(o.y - s * .75, 4, innerHeight - s - 4)];
const near = (list, c = wc()) => list.slice().sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y))[0];
const busyWisp = () => frozen || sheep || fl || casting || mc || has("flat");
const OPTS = [
  // eat: food on the page, when it's hungry enough. Wary of you? It waits until your pointer is away
  M => {
    if (busyWisp()) return null;
    const food = objs.filter(o => o.food && o.rest && !o.dead); if (!food.length) return null;
    const o = near(food), [px, py] = mind.pointer(), me = wc();
    if (!mind.roams && Math.hypot(o.x + o.w / 2 - me.x, o.y + o.h / 2 - me.y) > 170) return null;
    if (M.trust < 10 && (M.fed > 40 || (px >= 0 && Math.hypot(px - o.x, py - o.y) < 260))) return null;
    if (M.fed > 85) return mind.cool("full", 120e3) ? { name: "full", score: 30, home: false, run: async () => { mind.used("full"); say(pick(TL.full), { gap: 0, hold: 2500 }); } } : null;
    if (M.trust < 20 && px >= 0 && Math.hypot(px - o.x, py - o.y) < 180) return mind.cool("waryfood", 60e3) ? { name: "wary", score: 20, home: false, run: async () => { mind.used("waryfood"); say(pick(TL.wary_food), { gap: 0, hold: 2500 }); } } : null;
    const kind = o.kind === "fish" ? "fish" : o.kind;
    return { name: "eat", score: 80 + (100 - M.fed) + (liked(kind) ? 60 : 0), run: async c => {
      if (!await c.fly(...above(o))) return;
      if (o.dead) return;
      if (o.held || Math.abs(o.x - (wisp.el.getBoundingClientRect().left)) > 80) { if (!await c.fly(...above(o), 500)) return; if (o.dead) return; }
      wisp.el.classList.add("nom"); c.me.cleanup = () => wisp.el.classList.remove("nom");
      const ok = await c.wait(1000); wisp.el.classList.remove("nom"); if (!ok || o.dead) return;
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2; remove(o); burst(cx, cy, 12, .5);
      const n = mind.remember("ate_" + kind);
      feel({ fed: (kind === "fish" ? 40 : kind === "candy" ? 10 : 30) + (o.cooked ? 15 : 0), fun: kind === "candy" ? 6 : 3, trust: kind === "candy" ? 3 : 1 });
      if (o.cooked) say(pick(TL.roast), { gap: 0, hold: 2500 });
      earn((kind === "candy" ? 25 : 20) * fresh("eat"), cx, cy);
      if (kind === "chicken") award("atechicken"); if (kind === "fish") award("fishfeed");
      if (liked(kind)) { feel({ fun: 8, trust: 2 }); face("happy", 2500); learned("like"); }
      else say(pick((TL.eat || {})[kind] || TL.eat_any) || "", { gap: n === 1 ? 0 : 45e3, hold: 2500 });
      await c.wait(500);
    } };
  },
  // bombs: curious the first time or two; after that it either knocks them back at you or gets out of the way
  M => {
    if (busyWisp()) return null;
    const b = objs.find(o => o.kind === "bomb" && !o.dead); if (!b) return null;
    const n = mind.recall("bombs"), [px, py] = mind.pointer(), s = wsz();
    if (n < 2) return { name: "curious", score: 160, run: async c => { say(pick(TL.bomb_curious), { gap: 0, hold: 2000 }); if (!await c.fly(...above(b))) return; mind.lookAt(b.x + b.w / 2, b.y + b.h / 2); await c.wait(2500); } };
    if (M.trust >= 50 && px >= 0) return { name: "return", score: 220, run: async c => {
      if (!await c.fly(...above(b), 500) || b.dead) return;
      const dx = px - (b.x + b.w / 2), dy = py - (b.y + b.h / 2), d = Math.hypot(dx, dy) || 1;
      b.vx = dx / d * 1.2; b.vy = Math.min(-.9, dy / d * 1.2); b.rest = false; kick();
      wisp.el.classList.remove("squash"); void wisp.el.offsetWidth; wisp.el.classList.add("squash");
      award("returned"); say(pick(TL.returned), { gap: 0, hold: 2200 });
      await c.fly(b.x < innerWidth / 2 ? innerWidth - s - 30 : 30, 110);
      await c.wait(1800);
    } };
    return { name: "flee", score: 220, run: async c => { say(pick(TL.bomb_flee), { gap: 0, hold: 2000 }); await c.fly(b.x < innerWidth / 2 ? innerWidth - s - 20 : 20, 100); while (!b.dead && await c.wait(400)); await c.wait(600); } };
  },
  // the plushie: a cuddle when it's bored, a nap on it when it's tired, and sometimes it carries it off
  M => {
    if (busyWisp()) return null;
    const p = objs.find(o => o.kind === "plush" && o.rest && !o.dead); if (!p) return null;
    if (M.rest < 45 && mind.cool("plushnap", 60e3)) return { name: "plushnap", score: 70 + (45 - M.rest) * 2, home: false, run: async c => {
      mind.used("plushnap");
      if (!await c.fly(...above(p, wsz()).map((v, i) => i ? v + 14 : v))) return;
      wisp.el.classList.add("sleep"); c.me.cleanup = () => wisp.el.classList.remove("sleep");
      award("plushnap"); say(pick(TL.plush_nap), { gap: 0, hold: 2500 });
      while (await c.wait(1000)) { feel({ rest: 3 }); if (!wisp.el.classList.contains("sleep") || M.rest >= 95 || p.dead || !p.rest) break; }
    } };
    if (M.fun < 75 && mind.cool("cuddle", 40e3)) return { name: "cuddle", score: 25 + (75 - M.fun), run: async c => {
      mind.used("cuddle");
      if (!await c.fly(...above(p))) return;
      wisp.el.classList.add("blush"); c.me.cleanup = () => wisp.el.classList.remove("blush");
      const ok = await c.wait(2200); wisp.el.classList.remove("blush"); if (!ok) return;
      feel({ fun: 12, trust: 1, rest: 2 }); earn(12 * fresh("cuddle"));
      if (liked("plush")) { face("happy", 2500); learned("like"); } else say(pick(TL.plush_cuddle), { gap: 60e3, hold: 2500 });
      if (Math.random() < .4 && !p.dead) {         // carry it somewhere it likes better
        const s = wsz(), tx = clamp(p.x + (Math.random() < .5 ? -1 : 1) * (150 + rnd(200)), 10, innerWidth - 60);
        p.held = true; let r2 = 0; const sync = () => { const r = wisp.el.getBoundingClientRect(); p.x = r.left + s / 2 - p.w / 2; p.y = r.top + s * .6; drawObj(p); r2 = requestAnimationFrame(sync); };
        sync(); await c.fly(tx, floorAt(tx, p.w) - p.h - s * .6 - 20); cancelAnimationFrame(r2); p.held = false; p.rest = false; kick();
      }
    } };
    return null;
  },
  // the toy train: hop on for a ride
  M => {
    if (busyWisp() || M.fun > 88 || !mind.cool("ride", 20e3)) return null;
    const tr = objs.find(o => o.kind === "train" && !o.dead); if (!tr) return null;
    return { name: "ride", score: 90 + (liked("train") ? 60 : 0), run: async c => {
      mind.used("ride"); const s = wsz();
      if (!await c.fly(...above(tr, s), 700)) return;
      award("trainride"); say(pick(TL.train), { gap: 30e3, hold: 2200 });
      const t0 = now(), dur = 6000 + rnd(4000);
      while (c.alive() && !tr.dead && now() - t0 < dur) { wisp.moveTo(tr.x + tr.w / 2 - s / 2, tr.y - s * .7); await new Promise(r => requestAnimationFrame(r)); }
      if (c.alive()) { feel({ fun: liked("train") ? 22 : 14 }); earn(20 * fresh("ride")); if (liked("train")) learned("like"); }
    } };
  },
  // hungry, and the chicken's ready: it hovers by the slot and looks at it
  M => {
    if (busyWisp() || REDUCE || M.fed > 35 || !bar || S.open === false || cdLeft("chicken") > 0 || objs.some(o => o.food) || !mind.cool("beg", 180e3)) return null;
    const sl = $('.tb-slot[data-id="chicken"]', bar); if (!sl) return null;
    return { name: "beg", score: 30, run: async c => {
      mind.used("beg"); const r = sl.getBoundingClientRect(), s = wsz();
      if (!await c.fly(clamp(r.left + r.width / 2 - s / 2, 4, innerWidth - s - 4), r.top - s - 14)) return;
      mind.lookAt(r.left + r.width / 2, r.top + r.height / 2); sl.classList.add("beg");
      say(pick(TL.beg), { gap: 0, hold: 2500 }); await c.wait(3200); sl.classList.remove("beg");
    } };
  },
  // fetch: it brings the ball back to you
  M => {
    if (busyWisp() || M.fun > 92 || M.trust < 10 || !mind.cool("fetch", 10e3)) return null;
    const b = objs.find(o => o.kind === "ball" && o.rest && !o.dead && !o.held); if (!b) return null;
    return { name: "fetch", score: 70 + (liked("ball") ? 40 : 0), run: async c => {
      mind.used("fetch"); const s = wsz();
      if (!await c.fly(...above(b, s)) || b.dead || b.held) return;
      b.held = true; let r2 = 0; const sync = () => { const r = wisp.el.getBoundingClientRect(); b.x = r.left + s / 2 - b.w / 2; b.y = r.top + s * .65; drawObj(b); r2 = requestAnimationFrame(sync); }; sync();
      c.me.cleanup = () => { cancelAnimationFrame(r2); b.held = false; b.rest = false; kick(); };
      let [px, py] = mind.pointer(); if (px < 0) { px = innerWidth / 2; py = innerHeight / 2; }
      const ok = await c.fly(clamp(px - s / 2, 4, innerWidth - s - 4), clamp(py - s - 30, 60, FLOOR.top - s - 60));
      cancelAnimationFrame(r2); b.held = false; b.rest = false; b.vx = 0; b.vy = .1; kick(); c.me.cleanup = null;
      if (!ok) return;
      feel({ fun: 8, trust: 1 }); earn(10 * fresh("fetch")); award("fetch");
      if (liked("ball")) { face("happy", 2500); learned("like"); } else say(pick(TL.fetch), { gap: 30e3, hold: 2000 });
      await c.wait(1500);
    } };
  },
  // perch: sit on top of the crates for a bit
  M => {
    if (busyWisp() || M.trust < 10 || !mind.cool("perch", 45e3)) return null;
    const cr = objs.filter(o => o.kind === "crate" && o.rest && !o.dead); if (!cr.length) return null;
    const top = cr.sort((a, b) => a.y - b.y)[0];
    return { name: "perch", score: 14, run: async c => { mind.used("perch"); const s = wsz(); if (!await c.fly(top.x + top.w / 2 - s / 2, top.y - s + 4)) return; say(pick(TL.perch), { gap: 120e3, hold: 2000 }); await c.wait(7000); } };
  },
  // when it trusts you, it brings you coins it found
  M => {
    if (busyWisp() || M.trust < 70 || M.fun < 45 || !bar || !mind.cool("gift", 420e3)) return null;
    return { name: "gift", score: 6, run: async c => {
      mind.used("gift"); const p = $(".tb-purse", bar).getBoundingClientRect(), s = wsz();
      if (!await c.fly(clamp(p.left, 4, innerWidth - s - 4), p.top - s - 16)) return;
      earn(20 + rnd(41), p.left + 20, p.top - 10, true); say(pick(TL.coins), { gap: 0, hold: 2500 }); await c.wait(1200);
    } };
  },
];

/* =================== on and off =================== */
let added = [];
const onKey = e => {
  if (!S.on || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "Escape") { if (tool) unequip(); else if (targeting) endAim(); else if (shop) closeShop(); return; }
  if (e.target.closest && e.target.closest("input,textarea,select,[contenteditable]")) return;
  if ($(".console.on")) return;
  const i = KEYS.indexOf(e.key); if (i < 0 || !bar || S.open === false) return;
  const id = slotIds()[i]; if (id) { e.preventDefault(); use(id, true); }
};
const onAward = e => { const id = e.detail; if (!S.on || S.paid[id] || !D.ACH[id]) return; S.paid[id] = 1; save(); const r = $(".xp"); const b = r ? r.getBoundingClientRect() : { left: innerWidth - 80, bottom: 60 }; earn(500, b.left, b.bottom + 6, true); };
let lastFc = -1;
const onChange = () => { if (!S.on || !bar) return; drawUnit(); const fc = faireOpen() ? fishCount() : 0; if (fc !== lastFc) { lastFc = fc; drawSlots(); } };
const onResize = () => { layout(); for (const o of objs) { o.rest = false; } kick(); };
const onRoom = () => { if (bar) drawSlots(); };
function enable() {
  if (!document.head.contains(css)) document.head.append(css);
  S.on = true; firstRun();
  if (X.bag && X.bag.list().some(([n]) => n === "Murloc Plushie") && !S.owned.plush) { S.owned.plush = 1; save(); setTimeout(() => notice("Murloc Plushie", "The one you fished out of the faire pond is on your toy bar now.", "inv_misc_head_murloc_01"), 2500); }
  document.body.classList.add("toyon");
  if (!bar) buildBar();
  dress(); layout(); requestAnimationFrame(layout);
  // toys pull it about the page only while it's allowed to roam; eating handles that itself
  added = OPTS.map((f, k) => mind.addOption(k === 0 ? f : M => mind.roams ? f(M) : null));
  addEventListener("pointerup", onToolUp); addEventListener("blur", onToolUp);
  addEventListener("keydown", onKey); addEventListener("pointermove", onAimMove, { passive: true });
  document.addEventListener("pointerdown", onAimDown, true); document.addEventListener("click", onAimClick, true); document.addEventListener("contextmenu", onMenu);
  addEventListener("tw:award", onAward); addEventListener("resize", onResize); addEventListener("hashchange", onRoom);
}
function disable() {
  S.on = false; endAim(); unequip(); closeShop();
  ticks.clear(); P.length = 0; drift = null; GRAV = 1; WIND = 0; if (stopped) { stopped = false; mind.hold(false); }
  if (mc) { mc = null; mind.hold(false); }
  $$(".tb-dark").forEach(e => e.remove()); document.documentElement.classList.remove("tb-stop", "tb-lev", "tb-shrunk");
  if (pcx) pcx.clearRect(0, 0, pcv.width, pcv.height);
  if (fl) { fl = null; mind.hold(false); wisp.el.classList.remove("flung"); }
  if (frozen) thaw(false); if (sheep) unsheep(false);
  ["shielded", "tiny", "huge", "squash", "shiver", "wet", "sooty", "zapped", "flat", "mindctl", "dance", "lantern", "scared", "rocket", "renewed"].forEach(c => clearEffect(c)); soot = wet = 0;
  $$(".tbx", wisp.el).forEach(e => e.remove()); wisp.el.classList.remove("fiery");
  objs.slice().forEach(remove);
  if (bar) { bar.remove(); bar = null; }
  document.body.classList.remove("toyon"); layout();
  added.forEach(f => mind.removeOption(f)); added = [];
  removeEventListener("keydown", onKey); removeEventListener("pointermove", onAimMove); removeEventListener("pointerup", onToolUp); removeEventListener("blur", onToolUp);
  document.removeEventListener("pointerdown", onAimDown, true); document.removeEventListener("click", onAimClick, true); document.removeEventListener("contextmenu", onMenu);
  removeEventListener("tw:award", onAward); removeEventListener("resize", onResize); removeEventListener("hashchange", onRoom);
  wisp.restore();
  say(pick(TL.off), { gap: 0, hold: 2500 });
}
// once, not per enable: the mind's ticks redraw the wisp's frame (and notice new fish from the faire)
mind.on("change", onChange);
orb.addEventListener("animationend", e => { if (e.animationName === "tbsquash") wisp.el.classList.remove("squash"); });

X.toybox = {
  enable() { if (S.on && bar) return; enable(); setTimeout(() => say(pick(TL.on), { gap: 0, hold: 2500 }), 400); },
  disable, shop: openShop, use,
  get on() { return S.on; },
  get objs() { return objs; },            // for poking at in the console
  readyAll() { S.cd = {}; save(); drawCds(); },
  status() {
    const own = TOYS.filter(t => S.owned[t.id]).map(t => t.n);
    return { purse: purse(), toys: own, standing: mind.standing(), mood: mind.mood(), likes: S.learn.like ? THING[S.likes.like] : null, dislikes: S.learn.dislike ? THING[S.likes.dislike] : null };
  },
};
enable();
})();
