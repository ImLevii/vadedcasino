import{c as Z,d as G,f as B,z as U,s as i,t as W,i as D,g as m,r as oe,G as X,h as K,B as de,j as N,k as ae,e as T,F as te,m as ne,b as le,n as ve,p as fe,T as ce,M as ie,L as xe,S as be,l as ue}from"./index-04af9867.js";import{S as $e}from"./surveysbanner-532d3a72.js";import{f as ge}from"./numbers-ef90d499.js";import{B as pe}from"./bets-efc9c19d.js";const he=W("<div s:my-prefix-3b8e95a9-0>"),me="my-prefix-3b8e95a9-0",_e='.dot[s\\:my-prefix-3b8e95a9-0]{width:10px;height:10px;background:gray;border-radius:50%;position:relative;display:flex;align-items:center;justify-content:center}.dot[s\\:my-prefix-3b8e95a9-0]:after{width:4px;height:4px;border-radius:50%;content:"";position:absolute}.dot[s\\:my-prefix-3b8e95a9-0].green{background:linear-gradient(rgba(69,208,66,0.25),rgba(166,253,232,0.25))}.dot[s\\:my-prefix-3b8e95a9-0].green:after{background:linear-gradient(rgba(69,208,66,1),rgba(166,253,232,1))}.dot[s\\:my-prefix-3b8e95a9-0].gold{background:linear-gradient(rgba(255,153,0,0.25),rgba(249,172,57,0.25))}.dot[s\\:my-prefix-3b8e95a9-0].gold:after{background:linear-gradient(rgba(255,153,0,1),rgba(249,172,57,1))}';function ee(c){const e=Z();return G(me,1,_e),(()=>{const l=he();return B(a=>{const x="dot "+(c.type||"green"),$=e();return x!==a._v$&&U(l,a._v$=x),a._v$2=i(l,$,a._v$2),a},{_v$:void 0,_v$2:void 0}),l})()}const ye=W('<div s:my-prefix-1bc85899-0><div class="live-earn-header" s:my-prefix-1bc85899-0><div class="type" s:my-prefix-1bc85899-0></div><div class="avatar" s:my-prefix-1bc85899-0></div></div><div class="details" s:my-prefix-1bc85899-0><div class="wall" s:my-prefix-1bc85899-0><img height="30" alt="" s:my-prefix-1bc85899-0></div></div><div class="cost" s:my-prefix-1bc85899-0><img src="/assets/icons/coin.svg" height="15" s:my-prefix-1bc85899-0>'),we="my-prefix-1bc85899-0",ke='.live-earn-container[s\\:my-prefix-1bc85899-0]{width:170px;min-width:170px;height:140px;position:relative;z-index:0;border-radius:10px;background:rgba(0,0,0,0.21)}.gold[s\\:my-prefix-1bc85899-0].live-earn-container{background:linear-gradient(rgba(177,120,24,1),rgba(156,99,15,1),rgba(126,80,12,1),rgba(102,65,10,1),rgba(177,120,24,1),rgba(255,220,24,1),rgba(255,220,24,1))}.gold[s\\:my-prefix-1bc85899-0].live-earn-container:before{z-index:-1;content:"";position:absolute;width:168px;height:138px;top:1px;left:1px;border-radius:10px;background:radial-gradient(144.25% 102.12%at 53.73% -2.06%,rgba(252,164,33,0.20) 0%,rgba(0,0,0,0.00) 100%),rgba(41,38,77,1)}.live-earn-header[s\\:my-prefix-1bc85899-0]{width:100%;height:-moz-fit-content;height:fit-content;display:flex;justify-content:center;position:relative}.type[s\\:my-prefix-1bc85899-0]{width:30px;height:30px;border-radius:10px 0px 8px 0px;background:rgba(142,130,255,0.08);display:flex;align-items:center;justify-content:center;position:absolute;left:0;top:0}.view[s\\:my-prefix-1bc85899-0]{width:30px;height:30px;border:unset;outline:unset;border-radius:0px 10px 0px 8px;background:rgba(142,130,255,0.08);display:flex;align-items:center;justify-content:center;cursor:pointer;position:relative}.gold[s\\:my-prefix-1bc85899-0] .view[s\\:my-prefix-1bc85899-0],.gold[s\\:my-prefix-1bc85899-0] .type[s\\:my-prefix-1bc85899-0]{background:linear-gradient(37deg,rgba(255,153,0,0.15) 30.03%,rgba(249,172,57,0.15) 42.84%)}.avatar[s\\:my-prefix-1bc85899-0]{margin-top:8px}.details[s\\:my-prefix-1bc85899-0]{display:flex;padding:10px 8px;gap:8px}.wall[s\\:my-prefix-1bc85899-0]{flex:1;height:55px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid #2D2C59;background:rgba(0,0,0,0.21)}.cost[s\\:my-prefix-1bc85899-0]{height:26px;gap:10px;margin:0 8px}';function Ce(c){const e=Z();return G(we,1,ke),(()=>{const l=ye(),a=l.firstChild,x=a.firstChild,$=x.nextSibling,p=a.nextSibling,A=p.firstChild,w=A.firstChild,y=p.nextSibling,S=y.firstChild;return D(x,m(ee,{get type(){return c?.top?"gold":"green"}})),D($,m(oe,{height:"25",get id(){return c?.user?.id},get xp(){return c?.user?.xp}})),D(y,()=>ge(c?.robux),null),B(o=>{const f="live-earn-container "+(c?.top?"gold":""),_=e(),d=e(),b=e(),R=e(),h=e(),E=e(),k=`${{}.VITE_SERVER_URL}/public/walls/${c?.provider}.png`,t=e(),j=e(),n=e();return f!==o._v$&&U(l,o._v$=f),o._v$2=i(l,_,o._v$2),o._v$3=i(a,d,o._v$3),o._v$4=i(x,b,o._v$4),o._v$5=i($,R,o._v$5),o._v$6=i(p,h,o._v$6),o._v$7=i(A,E,o._v$7),k!==o._v$8&&X(w,"src",o._v$8=k),o._v$9=i(w,t,o._v$9),o._v$10=i(y,j,o._v$10),o._v$11=i(S,n,o._v$11),o},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0,_v$7:void 0,_v$8:void 0,_v$9:void 0,_v$10:void 0,_v$11:void 0}),l})()}const Se=W('<div class="live-earns-container" s:my-prefix-b3c343e4-0><div class="earns-header" s:my-prefix-b3c343e4-0><div class="options" s:my-prefix-b3c343e4-0><button s:my-prefix-b3c343e4-0>LIVE EARNS</button><button s:my-prefix-b3c343e4-0>TOP EARNS</button></div><div class="bar" s:my-prefix-b3c343e4-0></div><svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none" s:my-prefix-b3c343e4-0><path d="M4.99998 6C4.82076 6 4.64157 5.92807 4.50493 5.78451L0.205142 1.26463C-0.0683806 0.977107 -0.0683806 0.510942 0.205142 0.223538C0.478554 -0.0638665 0.714286 0.00798196 1.19548 0.00798455H4.99998L8.57143 0.00798564C9.28572 0.00798564 9.52137 -0.0637267 9.79476 0.223677C10.0684 0.511081 10.0684 0.977246 9.79476 1.26477L5.49504 5.78465C5.35834 5.92823 5.17914 6 4.99998 6Z" fill="#9489DB" s:my-prefix-b3c343e4-0></path></svg></div><div s:my-prefix-b3c343e4-0>'),Ee="my-prefix-b3c343e4-0",Ae=".live-earns-container[s\\:my-prefix-b3c343e4-0]{width:100%;position:relative;margin-bottom:20px}.earns-header[s\\:my-prefix-b3c343e4-0]{display:flex;align-items:center;gap:20px}.options[s\\:my-prefix-b3c343e4-0]{display:flex;gap:8px}.option[s\\:my-prefix-b3c343e4-0]{width:100px;height:30px;font-weight:600;font-size:12px;display:flex;gap:5px;align-items:center;justify-content:center}.option[s\\:my-prefix-b3c343e4-0].active{box-shadow:unset;border:1px solid #575298;background:#2D2A52;color:white}.bar[s\\:my-prefix-b3c343e4-0]{flex:1;height:1px;background:#5A5499}.arrow[s\\:my-prefix-b3c343e4-0]{cursor:pointer}.arrow[s\\:my-prefix-b3c343e4-0].active{transform:rotate(180deg)}.earns-container[s\\:my-prefix-b3c343e4-0]{max-height:0;overflow:hidden;display:flex;transition:max-height .3s;gap:10px;overflow-x:scroll;margin-top:20px;scrollbar-color:transparent transparent}.earns-container[s\\:my-prefix-b3c343e4-0]::-webkit-scrollbar{display:none}.earns-container[s\\:my-prefix-b3c343e4-0].active{max-height:140px}";function je(c){const e=Z();let l=!1;const[a]=de(),[x,$]=N(!0),[p,A]=N("live"),[w,y]=N([]),[S,o]=N([]);return ae(()=>{a()&&a().connected&&!l&&(a().emit("surveys:subscribe"),a().on("surveys:rewards:all",f=>{o(f.slice(0,20))}),a().on("surveys:rewards:top",f=>{y(f.slice(0,20))}),a().on("surveys:rewards",f=>{let _=[...f,...S()].slice(0,20);if(o(_),f.top){let d=[...f,...w()].slice(0,20);y(d)}})),l=!!a()?.connected}),G(Ee,1,Ae),(()=>{const f=Se(),_=f.firstChild,d=_.firstChild,b=d.firstChild,R=b.firstChild,h=b.nextSibling,E=h.firstChild,k=d.nextSibling,t=k.nextSibling,j=t.firstChild,n=_.nextSibling;return b.$$click=()=>A("live"),D(b,m(ee,{type:"green"}),R),h.$$click=()=>A("top"),D(h,m(ee,{type:"gold"}),E),t.$$click=()=>$(!x()),D(n,m(te,{get each(){return T(()=>p()==="live")()?S():w()},children:(s,O)=>m(Ce,s)})),B(s=>{const O=e(),P=e(),M=e(),V="bevel-light option "+(p()==="live"?"active":""),I=e(),r="bevel-light option "+(p()==="top"?"active":""),g=e(),u=e(),v="arrow "+(x()?"":"active"),C=e(),L=e(),F="earns-container "+(x()?"active":""),z=e();return s._v$=i(f,O,s._v$),s._v$2=i(_,P,s._v$2),s._v$3=i(d,M,s._v$3),V!==s._v$4&&U(b,s._v$4=V),s._v$5=i(b,I,s._v$5),r!==s._v$6&&U(h,s._v$6=r),s._v$7=i(h,g,s._v$7),s._v$8=i(k,u,s._v$8),v!==s._v$9&&X(t,"class",s._v$9=v),s._v$10=i(t,C,s._v$10),s._v$11=i(j,L,s._v$11),F!==s._v$12&&U(n,s._v$12=F),s._v$13=i(n,z,s._v$13),s},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0,_v$7:void 0,_v$8:void 0,_v$9:void 0,_v$10:void 0,_v$11:void 0,_v$12:void 0,_v$13:void 0}),f})()}K(["click"]);const Me=W('<div class="modal" s:my-prefix-77625bfb-0><div class="container" s:my-prefix-77625bfb-0><p class="close bevel-light" s:my-prefix-77625bfb-0>X</p><svg xmlns="http://www.w3.org/2000/svg" width="59" height="59" viewBox="0 0 59 59" fill="none" s:my-prefix-77625bfb-0><mask id="mask0_5805_206734" maskUnits="userSpaceOnUse" x="0" y="0" width="59" height="59" s:my-prefix-77625bfb-0><path d="M0 0H59V59H0V0Z" fill="white" s:my-prefix-77625bfb-0></path></mask><g mask="url(#mask0_5805_206734)" s:my-prefix-77625bfb-0><path d="M57.2715 36.4135C57.2715 36.4135 44.7742 53.6986 29.5 53.6986C14.2259 53.6986 1.72852 36.4135 1.72852 36.4135C1.72852 36.4135 14.2259 19.1283 29.5 19.1283C44.7742 19.1283 57.2715 36.4135 57.2715 36.4135Z" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-77625bfb-0></path><path d="M29.5 5.30066V12.2147" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-77625bfb-0></path><path d="M15.6719 8.75743L18.4971 14.4078" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-77625bfb-0></path><path d="M43.3281 8.75743L40.5029 14.4078" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-77625bfb-0></path><path d="M5.30078 15.6714L9.20815 19.5787" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-77625bfb-0></path><path d="M53.6994 15.6714L49.792 19.5787" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-77625bfb-0></path><path d="M39.8711 36.4133C39.8711 42.1412 35.2278 46.7844 29.5 46.7844C23.7722 46.7844 19.1289 42.1412 19.1289 36.4133C19.1289 30.6855 23.7722 26.0422 29.5 26.0422C35.2278 26.0422 39.8711 30.6855 39.8711 36.4133Z" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-77625bfb-0></path><path d="M29.5 39.8704C27.5938 39.8704 26.043 38.3195 26.043 36.4133C26.043 34.5071 27.5938 32.9563 29.5 32.9563C31.4062 32.9563 32.957 34.5071 32.957 36.4133C32.957 38.3195 31.4062 39.8704 29.5 39.8704Z" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-77625bfb-0></path></g></svg><h1 s:my-prefix-77625bfb-0>BE AWARE</h1><p s:my-prefix-77625bfb-0>Please fill out surveys and download apps <span class="gold" s:my-prefix-77625bfb-0>AT YOUR OWN RISK</span>. BloxClash takes no responsibility for any damages or data loss caused by the offer systems.</p><button class="understood bevel-gold" s:my-prefix-77625bfb-0>UNDERSTOOD'),Le="my-prefix-77625bfb-0",Fe=".modal[s\\:my-prefix-77625bfb-0]{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(24,23,47,0.55);display:flex;align-items:center;justify-content:center;z-index:1000}.close[s\\:my-prefix-77625bfb-0]{width:30px;height:30px;right:16px;top:16px;background:#4E4A8D;box-shadow:0px -1px 0px #5F5AA7,0px 1px 0px #272548;border-radius:3px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#ADA3EF;cursor:pointer;position:absolute}.container[s\\:my-prefix-77625bfb-0]{max-width:500px;width:100%;padding:24px 16px;background:#2C2952;box-shadow:0px 2px 5px rgba(0,0,0,0.1);border-radius:15px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#9489DB;text-align:center;font-family:Geogrotesque Wide,sans-serif;font-size:14px;font-weight:500;transition:max-height .3s;position:relative;overflow:hidden}.understood[s\\:my-prefix-77625bfb-0]{width:160px;height:40px;margin-top:16px}h1[s\\:my-prefix-77625bfb-0]{margin:unset;color:var(--gold);font-family:Geogrotesque Wide,sans-serif;font-size:22px;font-weight:700}";function De(c){const e=Z();return G(Le,1,Fe),(()=>{const l=Me(),a=l.firstChild,x=a.firstChild,$=x.nextSibling,p=$.firstChild,A=p.firstChild,w=p.nextSibling,y=w.firstChild,S=y.nextSibling,o=S.nextSibling,f=o.nextSibling,_=f.nextSibling,d=_.nextSibling,b=d.nextSibling,R=b.nextSibling,h=$.nextSibling,E=h.nextSibling,k=E.firstChild,t=k.nextSibling,j=E.nextSibling;return l.$$click=()=>c?.close(),a.$$click=n=>n.stopPropagation(),x.$$click=()=>c?.close(),j.$$click=async()=>{c?.close()},B(n=>{const s=e(),O=e(),P=e(),M=e(),V=ne("mask-type:luminance",e()),I=e(),r=e(),g=e(),u=e(),v=e(),C=e(),L=e(),F=e(),z=e(),H=e(),q=e(),Y=e(),J=e(),Q=e();return n._v$=i(l,s,n._v$),n._v$2=i(a,O,n._v$2),n._v$3=i(x,P,n._v$3),n._v$4=i($,M,n._v$4),n._v$5=i(p,V,n._v$5),n._v$6=i(A,I,n._v$6),n._v$7=i(w,r,n._v$7),n._v$8=i(y,g,n._v$8),n._v$9=i(S,u,n._v$9),n._v$10=i(o,v,n._v$10),n._v$11=i(f,C,n._v$11),n._v$12=i(_,L,n._v$12),n._v$13=i(d,F,n._v$13),n._v$14=i(b,z,n._v$14),n._v$15=i(R,H,n._v$15),n._v$16=i(h,q,n._v$16),n._v$17=i(E,Y,n._v$17),n._v$18=i(t,J,n._v$18),n._v$19=i(j,Q,n._v$19),n},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0,_v$7:void 0,_v$8:void 0,_v$9:void 0,_v$10:void 0,_v$11:void 0,_v$12:void 0,_v$13:void 0,_v$14:void 0,_v$15:void 0,_v$16:void 0,_v$17:void 0,_v$18:void 0,_v$19:void 0}),l})()}K(["click"]);const Re=W('<div class="modal" s:my-prefix-f7db85e-0><div class="container" s:my-prefix-f7db85e-0><p class="close bevel-light" s:my-prefix-f7db85e-0>X</p><svg xmlns="http://www.w3.org/2000/svg" width="59" height="59" viewBox="0 0 59 59" fill="none" s:my-prefix-f7db85e-0><mask id="mask0_5805_206734" maskUnits="userSpaceOnUse" x="0" y="0" width="59" height="59" s:my-prefix-f7db85e-0><path d="M0 0H59V59H0V0Z" fill="white" s:my-prefix-f7db85e-0></path></mask><g mask="url(#mask0_5805_206734)" s:my-prefix-f7db85e-0><path d="M57.2715 36.4135C57.2715 36.4135 44.7742 53.6986 29.5 53.6986C14.2259 53.6986 1.72852 36.4135 1.72852 36.4135C1.72852 36.4135 14.2259 19.1283 29.5 19.1283C44.7742 19.1283 57.2715 36.4135 57.2715 36.4135Z" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-f7db85e-0></path><path d="M29.5 5.30066V12.2147" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-f7db85e-0></path><path d="M15.6719 8.75743L18.4971 14.4078" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-f7db85e-0></path><path d="M43.3281 8.75743L40.5029 14.4078" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-f7db85e-0></path><path d="M5.30078 15.6714L9.20815 19.5787" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-f7db85e-0></path><path d="M53.6994 15.6714L49.792 19.5787" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-f7db85e-0></path><path d="M39.8711 36.4133C39.8711 42.1412 35.2278 46.7844 29.5 46.7844C23.7722 46.7844 19.1289 42.1412 19.1289 36.4133C19.1289 30.6855 23.7722 26.0422 29.5 26.0422C35.2278 26.0422 39.8711 30.6855 39.8711 36.4133Z" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-f7db85e-0></path><path d="M29.5 39.8704C27.5938 39.8704 26.043 38.3195 26.043 36.4133C26.043 34.5071 27.5938 32.9563 29.5 32.9563C31.4062 32.9563 32.957 34.5071 32.957 36.4133C32.957 38.3195 31.4062 39.8704 29.5 39.8704Z" stroke="#FCA31E" stroke-width="3" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round" s:my-prefix-f7db85e-0></path></g></svg><h1 s:my-prefix-f7db85e-0>HAVING ISSUES?</h1><p s:my-prefix-f7db85e-0>Did you not receive your reward? We didn’t either! BloxClash is not paid until you receive your reward. This is why we CANNOT help you with offers. Contact the provider you did the offer on.</p><button class="understood bevel-gold" s:my-prefix-f7db85e-0>UNDERSTOOD'),Be="my-prefix-f7db85e-0",We=".modal[s\\:my-prefix-f7db85e-0]{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(24,23,47,0.55);display:flex;align-items:center;justify-content:center;z-index:1000}.close[s\\:my-prefix-f7db85e-0]{width:30px;height:30px;right:16px;top:16px;background:#4E4A8D;box-shadow:0px -1px 0px #5F5AA7,0px 1px 0px #272548;border-radius:3px;display:flex;align-items:center;justify-content:center;font-weight:700;color:#ADA3EF;cursor:pointer;position:absolute}.container[s\\:my-prefix-f7db85e-0]{max-width:500px;width:100%;padding:24px 16px;background:#2C2952;box-shadow:0px 2px 5px rgba(0,0,0,0.1);border-radius:15px;display:flex;flex-direction:column;align-items:center;gap:8px;color:#9489DB;text-align:center;font-family:Geogrotesque Wide,sans-serif;font-size:14px;font-weight:500;transition:max-height .3s;position:relative;overflow:hidden}.understood[s\\:my-prefix-f7db85e-0]{width:160px;height:40px;margin-top:16px}h1[s\\:my-prefix-f7db85e-0]{margin:unset;color:var(--gold);font-family:Geogrotesque Wide,sans-serif;font-size:22px;font-weight:700}";function Oe(c){const e=Z();return G(Be,1,We),(()=>{const l=Re(),a=l.firstChild,x=a.firstChild,$=x.nextSibling,p=$.firstChild,A=p.firstChild,w=p.nextSibling,y=w.firstChild,S=y.nextSibling,o=S.nextSibling,f=o.nextSibling,_=f.nextSibling,d=_.nextSibling,b=d.nextSibling,R=b.nextSibling,h=$.nextSibling,E=h.nextSibling,k=E.nextSibling;return l.$$click=()=>c?.close(),a.$$click=t=>t.stopPropagation(),x.$$click=()=>c?.close(),k.$$click=async()=>{c?.close()},B(t=>{const j=e(),n=e(),s=e(),O=e(),P=ne("mask-type:luminance",e()),M=e(),V=e(),I=e(),r=e(),g=e(),u=e(),v=e(),C=e(),L=e(),F=e(),z=e(),H=e(),q=e();return t._v$=i(l,j,t._v$),t._v$2=i(a,n,t._v$2),t._v$3=i(x,s,t._v$3),t._v$4=i($,O,t._v$4),t._v$5=i(p,P,t._v$5),t._v$6=i(A,M,t._v$6),t._v$7=i(w,V,t._v$7),t._v$8=i(y,I,t._v$8),t._v$9=i(S,r,t._v$9),t._v$10=i(o,g,t._v$10),t._v$11=i(f,u,t._v$11),t._v$12=i(_,v,t._v$12),t._v$13=i(d,C,t._v$13),t._v$14=i(b,L,t._v$14),t._v$15=i(R,F,t._v$15),t._v$16=i(h,z,t._v$16),t._v$17=i(E,H,t._v$17),t._v$18=i(k,q,t._v$18),t},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0,_v$7:void 0,_v$8:void 0,_v$9:void 0,_v$10:void 0,_v$11:void 0,_v$12:void 0,_v$13:void 0,_v$14:void 0,_v$15:void 0,_v$16:void 0,_v$17:void 0,_v$18:void 0}),l})()}K(["click"]);const Ve=W('<div class="surveys-base-container" s:my-prefix-77a25f0b-0><div class="banner" s:my-prefix-77a25f0b-0><img src="/assets/icons/providers.svg" height="19" width="19" alt="" s:my-prefix-77a25f0b-0><p class="title" s:my-prefix-77a25f0b-0><span class="white bold" s:my-prefix-77a25f0b-0>PROVIDERS</span></p><div class="line" s:my-prefix-77a25f0b-0></div><button class="bevel-purple arrow" s:my-prefix-77a25f0b-0><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" s:my-prefix-77a25f0b-0><path d="M12 6L2 6M2 6L7.6 0.999999M2 6L7.6 11" stroke="white" stroke-width="2" s:my-prefix-77a25f0b-0></path></svg></button><button class="bevel-purple arrow" s:my-prefix-77a25f0b-0><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none" s:my-prefix-77a25f0b-0><path d="M1.58933e-07 6L10 6M10 6L4.4 11M10 6L4.4 0.999999" stroke="white" stroke-width="2" s:my-prefix-77a25f0b-0></path></svg></button></div><div class="providers" s:my-prefix-77a25f0b-0></div><div class="wall-container" s:my-prefix-77a25f0b-0>'),ze=W('<div s:my-prefix-77a25f0b-0><img height="40" s:my-prefix-77a25f0b-0>'),Ie=W("<iframe s:my-prefix-77a25f0b-0>"),Te=W("<p s:my-prefix-77a25f0b-0>Please select an offerwall to get started."),Pe=W("<p s:my-prefix-77a25f0b-0>Login to complete surveys."),Ne="my-prefix-77a25f0b-0",Ue=".surveys-base-container[s\\:my-prefix-77a25f0b-0]{width:100%;max-width:1175px;height:-moz-fit-content;height:fit-content;box-sizing:border-box;padding:30px 0;margin:0 auto}.banner[s\\:my-prefix-77a25f0b-0]{outline:unset;border:unset;width:100%;height:45px;border-radius:5px;background:linear-gradient(90deg,rgb(104,100,164) -49.01%,rgba(90,84,149,0.655) -5.08%,rgba(66,53,121,0) 98.28%);padding:0 15px;display:flex;align-items:center;gap:12px}.line[s\\:my-prefix-77a25f0b-0]{flex:1;height:1px;border-radius:2525px;background:linear-gradient(90deg,#5A5499 0%,rgba(90,84,153,0.00) 100%)}.arrow[s\\:my-prefix-77a25f0b-0]{margin-left:auto;width:40px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer}.providers[s\\:my-prefix-77a25f0b-0]{display:flex;gap:10px;margin:20px 0 30px 0;width:100%;overflow:hidden}.provider[s\\:my-prefix-77a25f0b-0]{min-width:200px;height:80px;display:flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(134,111,234,0.15);background:linear-gradient(0deg,rgba(64,57,118,0.65) 0%,rgba(64,57,118,0.65) 100%),radial-gradient(60% 60%at 50% 50%,rgba(147,126,236,0.15) 0%,rgba(102,83,184,0.15) 100%);cursor:pointer;transition:border .3s}.provider[s\\:my-prefix-77a25f0b-0].active{border:1px solid #866FEA;background:#40397F;box-shadow:0px 2px 4px 0px rgba(0,0,0,0.10)}.wall-container[s\\:my-prefix-77a25f0b-0]{height:510px;border-radius:15px;background:#27224D;margin-bottom:50px;overflow:hidden;display:flex;justify-content:center;align-items:center;color:#ADA3EF;text-align:center}.wall-container[s\\:my-prefix-77a25f0b-0] iframe[s\\:my-prefix-77a25f0b-0]{width:100%;height:100%;outline:unset;border:unset}@media only screen and (max-width:1000px){.surveys-base-container[s\\:my-prefix-77a25f0b-0]{padding-bottom:90px}}";function Xe(c){const e=Z();let l;const[a,x]=le(),[$]=ve(S),[p,A]=N(!window.sessionStorage.getItem("surveys")),[w,y]=N(!1);async function S(){try{return fe("/surveys/walls","GET")}catch(d){return console.error(d),[]}}function o(d){if(a.wall===d)return x({wall:null});x({wall:d})}function f(){return($()||[]).find(d=>d?.id===a.wall)}function _(d){l.scrollBy({left:l.clientWidth*d,behavior:"smooth"})}return G(Ne,1,Ue),[T((()=>{const d=T(()=>!!(p()&&c?.user));return()=>d()&&m(De,{close:()=>{window.sessionStorage.setItem("surveys",!0),A(!1),y(!0)}})})()),T((()=>{const d=T(()=>!!w());return()=>d()&&m(Oe,{close:()=>y(!1)})})()),m(ce,{children:"BloxClash | Surveys"}),m(ie,{name:"title",content:"Surveys"}),m(ie,{name:"description",content:"Don’t Have Robux? Don’t Worry, We Got you. Make Free Robux With Our Survey Providers."}),(()=>{const d=Ve(),b=d.firstChild,R=b.firstChild,h=R.nextSibling,E=h.firstChild,k=h.nextSibling,t=k.nextSibling,j=t.firstChild,n=j.firstChild,s=t.nextSibling,O=s.firstChild,P=O.firstChild,M=b.nextSibling,V=M.nextSibling;D(d,m(je,{}),b),D(d,m($e,{below:!0}),b),t.$$click=()=>_(-1),s.$$click=()=>_(1);const I=l;return typeof I=="function"?ue(I,M):l=M,D(M,m(be,{get when(){return!$.loading},get fallback(){return m(xe,{small:!0,max:"50px"})},get children(){return m(te,{get each(){return $()},children:r=>(()=>{const g=ze(),u=g.firstChild;return g.$$click=()=>o(r.id),B(v=>{const C="provider "+(a.wall===r.id?"active":""),L=e(),F=`${{}.VITE_SERVER_URL}/public/walls/${r?.id}.png`,z=e();return C!==v._v$15&&U(g,v._v$15=C),v._v$16=i(g,L,v._v$16),F!==v._v$17&&X(u,"src",v._v$17=F),v._v$18=i(u,z,v._v$18),v},{_v$15:void 0,_v$16:void 0,_v$17:void 0,_v$18:void 0}),g})()})}})),D(V,(()=>{const r=T(()=>!!c?.user);return()=>r()?T((()=>{const g=T(()=>!!f());return()=>g()?(()=>{const u=Ie();return B(v=>{const C=f().embed.replace("{userId}",c?.user.id),L=e();return C!==v._v$19&&X(u,"src",v._v$19=C),v._v$20=i(u,L,v._v$20),v},{_v$19:void 0,_v$20:void 0}),u})():(()=>{const u=Te();return B(v=>i(u,e(),v)),u})()})()):(()=>{const g=Pe();return B(u=>i(g,e(),u)),g})()})()),D(d,m(pe,{get user(){return c?.user}}),null),B(r=>{const g=e(),u=e(),v=e(),C=e(),L=e(),F=e(),z=e(),H=e(),q=e(),Y=e(),J=e(),Q=e(),re=e(),se=e();return r._v$=i(d,g,r._v$),r._v$2=i(b,u,r._v$2),r._v$3=i(R,v,r._v$3),r._v$4=i(h,C,r._v$4),r._v$5=i(E,L,r._v$5),r._v$6=i(k,F,r._v$6),r._v$7=i(t,z,r._v$7),r._v$8=i(j,H,r._v$8),r._v$9=i(n,q,r._v$9),r._v$10=i(s,Y,r._v$10),r._v$11=i(O,J,r._v$11),r._v$12=i(P,Q,r._v$12),r._v$13=i(M,re,r._v$13),r._v$14=i(V,se,r._v$14),r},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0,_v$7:void 0,_v$8:void 0,_v$9:void 0,_v$10:void 0,_v$11:void 0,_v$12:void 0,_v$13:void 0,_v$14:void 0}),d})()]}K(["click"]);export{Xe as default};