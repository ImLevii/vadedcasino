import{c as _e,k as Re,d as ye,l as xe,i as m,f as B,m as oi,z as We,s as i,G as Ue,t as q,g as y,Q as Oe,r as li,h as qe,j as S,a as Ge,p as ci,W as Pe,B as gi,T as xi,M as Je,e as Me,C as Ne,F as he,v as vi}from"./index-04af9867.js";import{C as ui}from"./coinflipitem-aa38146f.js";import{C as bi}from"./chance-5cc709ce.js";import{u as mi,s as pi}from"./socket-80f4f890.js";import"./_commonjsHelpers-39b5b250.js";const hi=q('<div s:my-prefix-afa957b3-0><p class="percent" s:my-prefix-afa957b3-0>%</p><img alt="" height="48" width="48" s:my-prefix-afa957b3-0><div class="bar" s:my-prefix-afa957b3-0>'),$i="my-prefix-afa957b3-0",_i=".jackpot-user[s\\:my-prefix-afa957b3-0]{min-width:80px;height:80px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;position:relative;border-radius:7px;background:radial-gradient(93.13% 93.13%at 50.00% 93.13%,rgba(252,163,30,0.15) 0%,rgba(0,0,0,0.00) 100%),rgba(0,0,0,0.15);overflow:hidden;border:1px solid transparent;transition:all .3s}.lum[s\\:my-prefix-afa957b3-0]{mix-blend-mode:luminosity;opacity:0.5}.won[s\\:my-prefix-afa957b3-0]{background:radial-gradient(93.13% 93.13%at 50.00% 6.87%,rgba(252,163,30,0.20) 0%,rgba(0,0,0,0.00) 100%),linear-gradient(0deg,rgba(255,190,24,0.25) 0%,rgba(255,190,24,0.25) 100%),linear-gradient(230deg,#1A0E33 0%,#423C7A 100%);box-shadow:0px 2px 15px 0px rgba(0,0,0,0.25);border:1px solid rgba(252,163,30,1);filter:drop-shadow(0px 0px 25px rgba(252,163,30,0.54))}.big[s\\:my-prefix-afa957b3-0]{height:90px;width:90px}.won[s\\:my-prefix-afa957b3-0] .bar[s\\:my-prefix-afa957b3-0]{background:#FCA31E!important}.won[s\\:my-prefix-afa957b3-0] .percent[s\\:my-prefix-afa957b3-0]{background:linear-gradient(0deg,rgba(0,0,0,0.20) 0%,rgba(0,0,0,0.20) 100%),linear-gradient(0deg,rgba(0,0,0,0.20) 0%,rgba(0,0,0,0.20) 100%),linear-gradient(0deg,rgba(255,190,24,0.25) 0%,rgba(255,190,24,0.25) 100%),linear-gradient(230deg,#1A0E33 0%,#423C7A 100%);color:white}.index[s\\:my-prefix-afa957b3-0]{position:absolute;color:white;font-weight:700;font-size:16px}.percent[s\\:my-prefix-afa957b3-0]{width:60px;height:20px;line-height:20px;text-align:center;color:#ADA3EF;font-family:Geogrotesque Wide,sans-serif;font-size:11px;font-weight:700;background:rgba(90,84,153,0.35);border-radius:3px;margin:auto 0}.bar[s\\:my-prefix-afa957b3-0]{width:100%;height:2px;transition:background .3s}";function $e(g){const e=_e();let p;Re(()=>{g?.state==="rolling"&&g?.index>40&&g?.index<60&&window.requestAnimationFrame(d)});let f;function d(c){if(f||(f=c),c-f>5e3)return f=null,g?.index===50?p.classList.toggle("won"):p.classList.toggle("lum"),window.requestAnimationFrame(k);window.requestAnimationFrame(d)}function k(c){if(f||(f=c),c-f>2e3){f=null,g?.index===50?p.classList.toggle("won"):p.classList.toggle("lum");return}window.requestAnimationFrame(k)}return ye($i,1,_i),(()=>{const c=hi(),w=c.firstChild,C=w.firstChild,E=w.nextSibling,I=E.nextSibling,_=p;return typeof _=="function"?xe(_,c):p=c,m(w,()=>((g?.percent||0)*100).toFixed(2),C),B(s=>{const o="jackpot-user "+(g?.won?"won big ":""),T=e(),L=e(),O=g?.id?`${{}.VITE_SERVER_URL}/user/${g?.id}/img`:"/assets/icons/anon.png",A=e(),z=oi({background:g?.color},e());return o!==s._v$&&We(c,s._v$=o),s._v$2=i(c,T,s._v$2),s._v$3=i(w,L,s._v$3),O!==s._v$4&&Ue(E,"src",s._v$4=O),s._v$5=i(E,A,s._v$5),s._v$6=i(I,z,s._v$6),s},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0}),c})()}const yi=q('<div s:my-prefix-e4526a0c-0><div class="item" s:my-prefix-e4526a0c-0><p s:my-prefix-e4526a0c-0>ROBUX COIN STACK</p></div><p class="cost" s:my-prefix-e4526a0c-0><img src="/assets/icons/coin.svg" height="16" width="16" alt="" s:my-prefix-e4526a0c-0><span s:my-prefix-e4526a0c-0>.<span class="cents" s:my-prefix-e4526a0c-0></span></span></p><div class="user" s:my-prefix-e4526a0c-0><p s:my-prefix-e4526a0c-0>'),wi="my-prefix-e4526a0c-0",Ci=".jp-bet[s\\:my-prefix-e4526a0c-0]{height:85px;min-height:85px;flex:1;position:relative;display:flex;align-items:center;border-radius:10px;z-index:0;padding:0 20px}.jp-bet[s\\:my-prefix-e4526a0c-0]>*[s\\:my-prefix-e4526a0c-0]{flex:1 1 0}.cost[s\\:my-prefix-e4526a0c-0]{flex:unset!important;min-width:125px;height:30px}.user[s\\:my-prefix-e4526a0c-0]{display:flex;align-items:center;gap:12px;justify-content:flex-end;color:#ADA3EF;font-size:14px;font-weight:700}.item[s\\:my-prefix-e4526a0c-0]{display:flex;align-items:center;gap:12px;color:var(--gold);font-size:13px;font-weight:600}.gray[s\\:my-prefix-e4526a0c-0]{background:linear-gradient(to right,rgba(169,181,210,0.05),rgba(169,181,210,0.05) 100%),rgba(0,0,0,0.20);border:1px dashed #A9C9D2}.blue[s\\:my-prefix-e4526a0c-0]{background:linear-gradient(to right,rgba(65,118,255,0.05),rgba(65,118,255,0.05) 100%),rgba(0,0,0,0.20);border:1px dashed #4176FF}.pink[s\\:my-prefix-e4526a0c-0]{background:linear-gradient(to right,rgba(220,95,222,0.05),rgba(220,95,222,0.05) 100%),rgba(0,0,0,0.20);border:1px dashed #DB5FDD}.red[s\\:my-prefix-e4526a0c-0]{background:linear-gradient(to right,rgba(255,81,65,0.05),rgba(255,81,65,0.05) 100%),rgba(0,0,0,0.20);border:1px dashed #FF5141}.gold[s\\:my-prefix-e4526a0c-0]{background:linear-gradient(to right,rgba(255,153,1,0.05),rgba(255,153,1,0.05) 100%),rgba(0,0,0,0.20);border:1px dashed #FCA31E}.cents[s\\:my-prefix-e4526a0c-0]{color:#A7A7A7}";function ki(g){const e=_e();function p(f){return f<1e3?"gray":f<1e4?"blue":f<5e4?"pink":f<25e4?"red":"gold"}return ye(wi,1,Ci),(()=>{const f=yi(),d=f.firstChild,k=d.firstChild,c=d.nextSibling,w=c.firstChild,C=w.nextSibling,E=C.firstChild,I=E.nextSibling,_=c.nextSibling,s=_.firstChild;return m(d,y(ui,{get price(){return g?.amount}}),k),m(C,()=>g?.amount?.toLocaleString(void 0,{maximumFractionDigits:0,minimumFractionDigits:0}),E),m(I,()=>Oe(g?.amount)),m(_,y(li,{get id(){return g?.user?.id},get xp(){return g?.user?.xp},height:"45"}),s),m(s,()=>g?.user?.username||"Anonymous"),B(o=>{const T="jp-bet "+p(g?.amount||0),L=e(),O=e(),A=e(),z=e(),j=e(),M=e(),X=e(),Y=e(),Q=e();return T!==o._v$&&We(f,o._v$=T),o._v$2=i(f,L,o._v$2),o._v$3=i(d,O,o._v$3),o._v$4=i(k,A,o._v$4),o._v$5=i(c,z,o._v$5),o._v$6=i(w,j,o._v$6),o._v$7=i(C,M,o._v$7),o._v$8=i(I,X,o._v$8),o._v$9=i(_,Y,o._v$9),o._v$10=i(s,Q,o._v$10),o},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0,_v$7:void 0,_v$8:void 0,_v$9:void 0,_v$10:void 0}),f})()}const Ai=q('<div class="modal fadein" s:my-prefix-6a11fc59-0><div class="jackpot-create" s:my-prefix-6a11fc59-0><div class="header" s:my-prefix-6a11fc59-0><button class="exit bevel-light" s:my-prefix-6a11fc59-0><svg xmlns="http://www.w3.org/2000/svg" width="10" height="8" viewBox="0 0 10 8" fill="none" s:my-prefix-6a11fc59-0><path d="M3.9497 0.447999L5.21006 1.936L6.45216 0.447999C6.68353 0.149333 6.95752 0 7.27413 0H9.6122C9.79486 0 9.90445 0.0533333 9.94099 0.16C9.9897 0.256 9.95925 0.362666 9.84966 0.48L6.79921 3.968L9.88619 7.52C9.99578 7.63733 10.0262 7.74933 9.97752 7.856C9.94099 7.952 9.83139 8 9.64873 8H6.96361C6.68353 8 6.40954 7.85067 6.14163 7.552L4.863 6.048L3.58438 7.552C3.31647 7.85067 3.04857 8 2.78067 8H0.351272C0.180788 8 0.071191 7.952 0.0224814 7.856C-0.0262283 7.74933 0.00421525 7.63733 0.113812 7.52L3.27385 3.936L0.296473 0.48C0.186876 0.362666 0.150344 0.256 0.186876 0.16C0.235586 0.0533333 0.351272 0 0.533933 0H3.10946C3.42607 0 3.70615 0.149333 3.9497 0.447999Z" fill="#ADA3EF" s:my-prefix-6a11fc59-0></path></svg></button><p class="title" s:my-prefix-6a11fc59-0><img src="/assets/icons/coin2.svg" height="20" alt="" s:my-prefix-6a11fc59-0>JOIN JACKPOT</p><div class="min" s:my-prefix-6a11fc59-0><p s:my-prefix-6a11fc59-0>MINIMUM</p><img src="/assets/icons/coin.svg" height="14" width="14" alt="" s:my-prefix-6a11fc59-0><p class="white price" s:my-prefix-6a11fc59-0>50<span class="gray" s:my-prefix-6a11fc59-0>.00</span></p></div></div><div class="items" s:my-prefix-6a11fc59-0><div class="robux-container" s:my-prefix-6a11fc59-0><div class="coin-container" s:my-prefix-6a11fc59-0><img class="spiral" src="/assets/icons/goldspiral.png" height="90" width="90" s:my-prefix-6a11fc59-0><img src="/assets/icons/coin.svg" height="64" width="71" s:my-prefix-6a11fc59-0></div><div class="robux-slider-container" s:my-prefix-6a11fc59-0><input type="range" class="range" min="0" s:my-prefix-6a11fc59-0></div><div class="cost selected-robux" s:my-prefix-6a11fc59-0><img src="/assets/icons/coin.svg" height="16" alt="" s:my-prefix-6a11fc59-0><input class="robux-input" type="number" s:my-prefix-6a11fc59-0></div></div></div><div class="footer" s:my-prefix-6a11fc59-0><div class="info" s:my-prefix-6a11fc59-0><p s:my-prefix-6a11fc59-0>TOTAL AMOUNT</p></div><div class="cost" s:my-prefix-6a11fc59-0><img src="/assets/icons/coin.svg" height="16" alt="" s:my-prefix-6a11fc59-0><p s:my-prefix-6a11fc59-0><span class="gray" s:my-prefix-6a11fc59-0>.</span></p></div><div class="bar" s:my-prefix-6a11fc59-0></div><button class="bevel-gold done" s:my-prefix-6a11fc59-0>JOIN'),Fi="my-prefix-6a11fc59-0",Si='.modal[s\\:my-prefix-6a11fc59-0]{position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(24,23,47,0.55);cubic-bezier(0, 1, 0, 1);display:flex;align-items:center;justify-content:center;z-index:1000}.jackpot-create[s\\:my-prefix-6a11fc59-0]{max-width:1010px;width:100%;height:-moz-fit-content;height:fit-content;min-height:340px;max-height:650px;background:#2C2952;display:flex;flex-direction:column;border-radius:16px;overflow:hidden}.header[s\\:my-prefix-6a11fc59-0],.footer[s\\:my-prefix-6a11fc59-0]{width:100%;min-height:70px;display:flex;align-items:center;gap:15px;padding:0 20px;background:#322F5F}.header[s\\:my-prefix-6a11fc59-0]{background:linear-gradient(109deg,rgba(252,163,30,0.11) 0%,rgba(156,101,19,0.07) 19.78%,rgba(0,0,0,0.00) 100%),#322F5F}.footer[s\\:my-prefix-6a11fc59-0]{min-height:60px}.info[s\\:my-prefix-6a11fc59-0]{height:30px;padding:0 10px;margin-left:auto;border-radius:2px;background:rgba(90,84,153,0.35);line-height:30px;color:#ADA3EF;font-size:11px;font-weight:600}.selected[s\\:my-prefix-6a11fc59-0]{margin-right:auto}.cost[s\\:my-prefix-6a11fc59-0]{height:30px;padding:0 12px}.selected-robux[s\\:my-prefix-6a11fc59-0]{width:100%;height:25px}.robux-input[s\\:my-prefix-6a11fc59-0]{background:unset;border:unset;outline:unset;width:30px;font-family:"Geogrotesque Wide",sans-serif;color:#FFF;font-size:12px;font-weight:700}.done[s\\:my-prefix-6a11fc59-0]{height:30px;width:95px}.bar[s\\:my-prefix-6a11fc59-0]{height:13px;width:1px;background:#534F96;margin:0 10px}.exit[s\\:my-prefix-6a11fc59-0]{width:25px;height:25px;background:rgba(85,76,125,1);display:flex;align-items:center;justify-content:center}.title[s\\:my-prefix-6a11fc59-0]{color:#FFF;font-size:20px;font-weight:700;display:flex;align-items:center;gap:6px}.items[s\\:my-prefix-6a11fc59-0]{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));grid-gap:15px;flex:1;overflow-y:scroll;padding:20px;scrollbar-color:transparent transparent}.items[s\\:my-prefix-6a11fc59-0]::-webkit-scrollbar{display:none}.min[s\\:my-prefix-6a11fc59-0]{margin-left:auto;display:flex;gap:8px;align-items:center;font-weight:700;font-size:10px;color:#ADA3EF;border-radius:3px;background:rgba(90,84,153,0.35);padding:10px 12px}.price[s\\:my-prefix-6a11fc59-0]{font-size:12px;margin-top:-2px}.color[s\\:my-prefix-6a11fc59-0]{display:flex;background:unset;outline:unset;border:unset;align-items:center;cursor:pointer;padding:unset}.coin[s\\:my-prefix-6a11fc59-0]{z-index:1}.coinname[s\\:my-prefix-6a11fc59-0]{border-radius:28px;padding:0 0 0 25px;line-height:30px;font-size:14px;font-weight:700;color:rgba(255,255,255,0.35);background:rgba(90,84,153,0.35);position:relative;z-index:0;width:85px;height:30px;margin-left:-30px;transition:all .3s}.coinname[s\\:my-prefix-6a11fc59-0]:before{border-radius:28px;position:absolute;top:1px;left:1px;content:"";height:calc(100% - 2px);width:calc(100% - 2px);z-index:-1}.blue[s\\:my-prefix-6a11fc59-0].active .coinname[s\\:my-prefix-6a11fc59-0]{background:linear-gradient(to left,rgba(30,77,209,1),rgba(0,0,0,0));color:#1E4DD1}.blue[s\\:my-prefix-6a11fc59-0].active .coinname[s\\:my-prefix-6a11fc59-0]:before{background:linear-gradient(rgba(30,77,209,0.15),rgba(30,77,209,0.15)),#322F5F}.red[s\\:my-prefix-6a11fc59-0].active .coinname[s\\:my-prefix-6a11fc59-0]{background:linear-gradient(to left,rgba(236,75,69,1),rgba(0,0,0,0));color:#EC4B45}.red[s\\:my-prefix-6a11fc59-0].active .coinname[s\\:my-prefix-6a11fc59-0]:before{background:linear-gradient(rgba(236,75,69,0.15),rgba(236,75,69,0.15)),#322F5F}.coin[s\\:my-prefix-6a11fc59-0]{background:unset}.robux-slider-container[s\\:my-prefix-6a11fc59-0]{margin-top:auto;border-radius:3px;background:linear-gradient(0deg,rgba(255,190,24,0.25) 0%,rgba(255,190,24,0.25) 100%),linear-gradient(230deg,#1A0E33 0%,#423C7A 100%);width:100%;height:25px;padding:0 6px;display:flex;align-items:center}.robux-container[s\\:my-prefix-6a11fc59-0]{height:170px;border-radius:7px;border:1px solid rgba(82,76,147,0.35);background:linear-gradient(230deg,rgba(26,14,51,0.26) 0%,rgba(66,60,122,0.26) 100%);display:flex;flex-direction:column;align-items:center;gap:6px;padding:15px}.coin-container[s\\:my-prefix-6a11fc59-0]{display:flex;align-items:center;justify-content:center}.spiral[s\\:my-prefix-6a11fc59-0]{position:absolute}.range[s\\:my-prefix-6a11fc59-0]{-webkit-appearance:none;-moz-appearance:none;appearance:none;outline:unset;border-radius:25px;background:rgba(252,163,30,0.26);max-width:190px;height:5px;width:100%}.range[s\\:my-prefix-6a11fc59-0]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:11px;height:11px;background:white;cursor:pointer;border-radius:50%}.range[s\\:my-prefix-6a11fc59-0]::-moz-range-thumb{-webkit-appearance:none;-moz-appearance:none;appearance:none;width:15px;height:15px;background:white;cursor:pointer;border-radius:50%}';function Ei(g){const e=_e();let p,f;const d=1,k=1e5;S("fire");const[c,w]=S(d,{equals:!1}),[C]=Ge();function E(){let _=C()?Math.min(k,C()?.balance):d,s=(p.value-d)/(_-d)*100;p.style.background="linear-gradient(to right, #FCA31E 0%, #FCA31E "+s+"%, rgba(252, 163, 30, 0.26) "+s+"%, rgba(252, 163, 30, 0.26) 100%)",I()}function I(){let _=(f.value+"").length,s=Math.max(12,Math.min(70,_*10));f.style.width=s+"px"}return ye(Fi,1,Si),(()=>{const _=Ai(),s=_.firstChild,o=s.firstChild,T=o.firstChild,L=T.firstChild,O=L.firstChild,A=T.nextSibling,z=A.firstChild,j=A.nextSibling,M=j.firstChild,X=M.nextSibling,Y=X.nextSibling,Q=Y.firstChild,J=Q.nextSibling,Z=o.nextSibling,ve=Z.firstChild,ee=ve.firstChild,ie=ee.firstChild,we=ie.nextSibling,ae=ee.nextSibling,N=ae.firstChild,ue=ae.nextSibling,G=ue.firstChild,R=G.nextSibling,se=Z.nextSibling,te=se.firstChild,r=te.firstChild,a=te.nextSibling,l=a.firstChild,u=l.nextSibling,v=u.firstChild;v.firstChild;const h=a.nextSibling,x=h.nextSibling;_.$$click=()=>g.close(),s.$$click=t=>t.stopPropagation(),T.$$click=()=>g.close(),N.$$input=t=>{let D=Math.max(0,Math.min(t.target.valueAsNumber,k));w(D),E()};const $=p;typeof $=="function"?xe($,N):p=N,R.$$input=t=>{I();let D=Math.max(0,Math.min(t.target.valueAsNumber,k));w(D),E()};const F=f;return typeof F=="function"?xe(F,R):f=R,m(u,()=>Math.floor(c())?.toLocaleString(void 0,{minimumFractionDigits:0,maximumFractionDigits:0}),v),m(v,()=>Oe(c()),null),x.$$click=async()=>{(await ci("/jackpot/join","POST",JSON.stringify({amount:c()}),!0)).success&&g?.close()},B(t=>{const D=e(),P=e(),b=e(),H=e(),V=e(),de=e(),K=e(),W=e(),fe=e(),oe=e(),ne=e(),U=e(),Ce=e(),ke=e(),le=e(),re=e(),be=e(),ce=e(),me=e(),ge=Math.min(C()?.balance||d,k),n=e(),pe=e(),Ae=e(),Fe=e(),Se=e(),Ee=e(),De=e(),Te=e(),ze=e(),je=e(),Be=e(),Ie=e(),Le=e();return t._v$=i(_,D,t._v$),t._v$2=i(s,P,t._v$2),t._v$3=i(o,b,t._v$3),t._v$4=i(T,H,t._v$4),t._v$5=i(L,V,t._v$5),t._v$6=i(O,de,t._v$6),t._v$7=i(A,K,t._v$7),t._v$8=i(z,W,t._v$8),t._v$9=i(j,fe,t._v$9),t._v$10=i(M,oe,t._v$10),t._v$11=i(X,ne,t._v$11),t._v$12=i(Y,U,t._v$12),t._v$13=i(J,Ce,t._v$13),t._v$14=i(Z,ke,t._v$14),t._v$15=i(ve,le,t._v$15),t._v$16=i(ee,re,t._v$16),t._v$17=i(ie,be,t._v$17),t._v$18=i(we,ce,t._v$18),t._v$19=i(ae,me,t._v$19),ge!==t._v$20&&Ue(N,"max",t._v$20=ge),t._v$21=i(N,n,t._v$21),t._v$22=i(ue,pe,t._v$22),t._v$23=i(G,Ae,t._v$23),t._v$24=i(R,Fe,t._v$24),t._v$25=i(se,Se,t._v$25),t._v$26=i(te,Ee,t._v$26),t._v$27=i(r,De,t._v$27),t._v$28=i(a,Te,t._v$28),t._v$29=i(l,ze,t._v$29),t._v$30=i(u,je,t._v$30),t._v$31=i(v,Be,t._v$31),t._v$32=i(h,Ie,t._v$32),t._v$33=i(x,Le,t._v$33),t},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0,_v$7:void 0,_v$8:void 0,_v$9:void 0,_v$10:void 0,_v$11:void 0,_v$12:void 0,_v$13:void 0,_v$14:void 0,_v$15:void 0,_v$16:void 0,_v$17:void 0,_v$18:void 0,_v$19:void 0,_v$20:void 0,_v$21:void 0,_v$22:void 0,_v$23:void 0,_v$24:void 0,_v$25:void 0,_v$26:void 0,_v$27:void 0,_v$28:void 0,_v$29:void 0,_v$30:void 0,_v$31:void 0,_v$32:void 0,_v$33:void 0}),B(()=>N.value=c()),B(()=>R.value=c()),_})()}qe(["click","input"]);const Di=(g,e)=>{if(!Array.isArray(g))return[];e*=100;const p=[];for(let f=0;f<70;f++){let d=Pe(0,e-1),k=-1;for(let c of g)if(k+=c.amount*100,d<=k){p.push(c);break}}return p},Ti=q('<img src="/assets/icons/timer.svg" height="18" width="15" s:my-prefix-7bdbf3c6-0>'),zi=q('<div class="winner fadein" s:my-prefix-7bdbf3c6-0><div s:my-prefix-7bdbf3c6-0><p class="details" s:my-prefix-7bdbf3c6-0><span class="white bold" s:my-prefix-7bdbf3c6-0></span>WON<img src="/assets/icons/coin.svg" height="17" width="17" s:my-prefix-7bdbf3c6-0><span class="bold white" s:my-prefix-7bdbf3c6-0><span class="gray" s:my-prefix-7bdbf3c6-0>.</span></span>WITH A<span class="white" s:my-prefix-7bdbf3c6-0>%</span>CHANCE</p><p class="ticket" s:my-prefix-7bdbf3c6-0>Winning ticket: '),ji=q('<img class="arrow" src="/assets/icons/selector.png" height="16" alt="" s:my-prefix-7bdbf3c6-0>'),Bi=q('<div class="spinner" s:my-prefix-7bdbf3c6-0>'),Ii=q('<div class="jackpot-container fadein" s:my-prefix-7bdbf3c6-0><div class="jackpot-header" s:my-prefix-7bdbf3c6-0><div class="header-section" s:my-prefix-7bdbf3c6-0><p class="title" s:my-prefix-7bdbf3c6-0><img src="/assets/icons/coin2.svg" height="18" alt="" s:my-prefix-7bdbf3c6-0>JACKPOT -</p></div><div class="header-section right" s:my-prefix-7bdbf3c6-0><button class="bevel-gold join" s:my-prefix-7bdbf3c6-0>JOIN POT</button></div></div><div class="bar" s:my-prefix-7bdbf3c6-0></div><div class="stats" s:my-prefix-7bdbf3c6-0><div class="stat" s:my-prefix-7bdbf3c6-0><p s:my-prefix-7bdbf3c6-0>%</p><p s:my-prefix-7bdbf3c6-0>YOUR CHANCE</p></div><div class="stat" s:my-prefix-7bdbf3c6-0><p s:my-prefix-7bdbf3c6-0></p><p s:my-prefix-7bdbf3c6-0>TOTAL PLAYERS</p></div><div class="stat" s:my-prefix-7bdbf3c6-0><p class="white align" s:my-prefix-7bdbf3c6-0><img class="stat-coin" src="/assets/icons/coin.svg" height="21" width="21" alt="" s:my-prefix-7bdbf3c6-0></p><p class="gold" s:my-prefix-7bdbf3c6-0>TOTAL AMOUNT</p></div><div class="stat gold" s:my-prefix-7bdbf3c6-0><p class="white align" s:my-prefix-7bdbf3c6-0><img class="stat-coin" src="/assets/icons/coin.svg" height="21" width="21" alt="" s:my-prefix-7bdbf3c6-0></p><p class="gold" s:my-prefix-7bdbf3c6-0>DEPOSITED VALUE</p></div></div><div class="timer-container" s:my-prefix-7bdbf3c6-0><div class="timer" s:my-prefix-7bdbf3c6-0></div><p s:my-prefix-7bdbf3c6-0></p></div><div class="users" s:my-prefix-7bdbf3c6-0></div><div class="bets" s:my-prefix-7bdbf3c6-0>'),Li="my-prefix-7bdbf3c6-0",Mi='.jackpot-container[s\\:my-prefix-7bdbf3c6-0]{width:100%;max-width:1175px;height:-moz-fit-content;height:fit-content;box-sizing:border-box;padding:30px 0;margin:0 auto}.jackpot-header[s\\:my-prefix-7bdbf3c6-0]{display:flex;justify-content:space-between}.header-section[s\\:my-prefix-7bdbf3c6-0]{display:flex;align-items:center;flex-grow:1;gap:15px}.right[s\\:my-prefix-7bdbf3c6-0]{justify-content:flex-end}.title[s\\:my-prefix-7bdbf3c6-0]{color:#FFF;font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px}.join[s\\:my-prefix-7bdbf3c6-0]{width:130px;height:35px}.bar[s\\:my-prefix-7bdbf3c6-0]{margin:25px 0;border-radius:555px;background:#5A5499;height:1px;flex:1}.stats[s\\:my-prefix-7bdbf3c6-0]{display:flex;flex-wrap:wrap;gap:10px;width:100%}.stat[s\\:my-prefix-7bdbf3c6-0]{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;flex:1 1 0;height:90px;border-radius:5px;background:rgba(90,84,153,0.27);color:#FFF;font-family:Geogrotesque Wide,sans-serif;font-size:20px;font-weight:600;padding:10px;white-space:nowrap}.stat[s\\:my-prefix-7bdbf3c6-0].gold{border-radius:5px;background:conic-gradient(from 180deg at 50% 50%,#FFDC18 -0.3deg,#B17818 72.1deg,rgba(156,99,15,0.611382) 139.9deg,rgba(126,80,12,0.492874) 180.52deg,rgba(102,65,10,0.61) 215.31deg,#B17818 288.37deg,#FFDC18 359.62deg,#FFDC18 359.7deg,#B17818 432.1deg);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);position:relative;z-index:0}.stat[s\\:my-prefix-7bdbf3c6-0].gold:before{position:absolute;top:1px;left:1px;content:"";height:calc(100% - 2px);width:calc(100% - 2px);border-radius:5px;background:linear-gradient(0deg,rgba(255,190,24,0.25) 0%,rgba(255,190,24,0.25) 100%),linear-gradient(230deg,#1A0E33 0%,#423C7A 100%);z-index:-1}.stat[s\\:my-prefix-7bdbf3c6-0] p[s\\:my-prefix-7bdbf3c6-0]:last-child{color:#ADA3EF;font-size:13px;font-weight:600}.align[s\\:my-prefix-7bdbf3c6-0]{display:flex;align-items:center}.stat-coin[s\\:my-prefix-7bdbf3c6-0]{margin-right:8px}.timer-container[s\\:my-prefix-7bdbf3c6-0]{width:100%;height:35px;border-radius:5px;border:1px dashed #534E8F;background:linear-gradient(0deg,rgba(0,0,0,0.20) 0%,rgba(0,0,0,0.20) 100%),linear-gradient(230deg,rgba(26,14,51,0.35) 0%,rgba(66,60,122,0.35) 100%);margin:25px 0;position:relative;padding:10px}.timer-container[s\\:my-prefix-7bdbf3c6-0] p[s\\:my-prefix-7bdbf3c6-0]{display:flex;align-items:center;gap:8px}.timer[s\\:my-prefix-7bdbf3c6-0]{width:100%;height:100%;background:linear-gradient(to right,#403C72 0%,#5E58AC 100%)}.timer[s\\:my-prefix-7bdbf3c6-0]:before{position:absolute;z-index:-1;height:calc(100% - 20px);width:calc(100% - 20px);content:"";top:10px;left:10px;background:#1A0E33}.timer-container[s\\:my-prefix-7bdbf3c6-0] p[s\\:my-prefix-7bdbf3c6-0]{position:absolute;top:-2px;text-align:center;left:50%;transform:translateX(-50%);color:#FFF;font-family:Geogrotesque Wide,sans-serif;font-size:16px;font-weight:700;line-height:35px}.users[s\\:my-prefix-7bdbf3c6-0]{width:100%;height:100px;display:flex;justify-content:center;align-items:center;position:relative;border-radius:5px;background:linear-gradient(to right,rgba(0,0,0,0.41) 0%,rgba(0,0,0,0.15) 25%,rgba(0,0,0,0.15) 75%,rgba(0,0,0,0.41) 100%);padding:10px;display:flex;gap:8px;overflow:hidden}.winner[s\\:my-prefix-7bdbf3c6-0]{display:flex;gap:20px;align-items:center}.details[s\\:my-prefix-7bdbf3c6-0]{display:flex;gap:5px;color:#ADA3EF;font-size:13px;font-weight:600}.ticket[s\\:my-prefix-7bdbf3c6-0]{margin-top:10px;color:#ADA3EF;font-size:11px;font-weight:600}.spinner[s\\:my-prefix-7bdbf3c6-0]{display:flex;gap:8px;position:absolute;left:50%}.arrow[s\\:my-prefix-7bdbf3c6-0]{position:absolute;top:-8px}.bets[s\\:my-prefix-7bdbf3c6-0]{width:100%;margin-top:25px;display:flex;flex-direction:column;gap:6px}@media only screen and (max-width:1000px){.jackpot-container[s\\:my-prefix-7bdbf3c6-0]{padding-bottom:90px}}';function Ui(g){const e=_e();let p,f;const[d]=gi(),[k]=Ge(),[c,w]=S(null),[C,E]=S([]),[I,_]=S([]),[s,o]=S(0),[T,L]=S(!1),[O,A]=S(-1),[z,j]=S("waiting"),[M,X]=S({}),[Y,Q]=S([]),[J,Z]=S(null),[ve,ee]=S(0);let ie=!1,we=["#FCA31E","#C2FC1E","#FC6E1E","#1EFC92","#EC1507","#1EB9FC","#0073FA","#9E52FF","#69EFAF","#D96DFF","#6B54F9","#A072BC","#EC519B","#F8BA5F","#C6DA8D","#D75E1A","#1CBD70","#54DA25","#1399D2","#5272E2"];const ae={winners:()=>"",rolling:()=>"",counting:()=>[(()=>{const r=Ti();return B(a=>i(r,e(),a)),r})(),Me(()=>Math.floor(O()/1e3)+" s")],waiting:()=>"WAITING FOR PLAYERS..."},N={winners:()=>(()=>{const r=zi(),a=r.firstChild,l=a.firstChild,u=l.firstChild,v=u.nextSibling,h=v.nextSibling,x=h.nextSibling,$=x.firstChild;$.firstChild;const F=x.nextSibling,t=F.nextSibling,D=t.firstChild,P=l.nextSibling;return P.firstChild,m(r,y($e,{get color(){return J()?.color},get id(){return J()?.user?.id},get percent(){return J()?.amount/s()},won:!0}),a),m(u,()=>J()?.user?.username||"Anonymous"),m(l,y(vi,{get xp(){return J()?.user?.xp}}),v),m(x,()=>s()?.toLocaleString(void 0,{maximumFractionDigits:0}),$),m($,()=>Oe(s()),null),m(t,()=>(J()?.amount/s()*100).toFixed(2),D),m(P,ve,null),B(b=>{const H=e(),V=e(),de=e(),K=e(),W=e(),fe=e(),oe=e(),ne=e(),U=e();return b._v$=i(r,H,b._v$),b._v$2=i(a,V,b._v$2),b._v$3=i(l,de,b._v$3),b._v$4=i(u,K,b._v$4),b._v$5=i(h,W,b._v$5),b._v$6=i(x,fe,b._v$6),b._v$7=i($,oe,b._v$7),b._v$8=i(t,ne,b._v$8),b._v$9=i(P,U,b._v$9),b},{_v$:void 0,_v$2:void 0,_v$3:void 0,_v$4:void 0,_v$5:void 0,_v$6:void 0,_v$7:void 0,_v$8:void 0,_v$9:void 0}),r})(),rolling:()=>[(()=>{const r=ji();return B(a=>i(r,e(),a)),r})(),(()=>{const r=Bi(),a=f;return typeof a=="function"?xe(a,r):f=r,m(r,y(he,{get each(){return Y()},children:(l,u)=>y($e,{get color(){return l?.color},get id(){return l?.user?.id},get percent(){return l?.amount/s()},get state(){return z()},get index(){return u()}})})),B(l=>i(r,e(),l)),r})()],counting:()=>y(he,{get each(){return C()},children:(r,a)=>y($e,{get color(){return r?.color},get id(){return r?.user?.id},get percent(){return r?.amount/s()}})}),waiting:()=>y(he,{get each(){return C()},children:(r,a)=>y($e,{get color(){return r?.color},get id(){return r?.user?.id},get percent(){return r?.amount/s()}})})};Re(()=>{d()&&d().connected&&!ie&&(mi(d()),pi(d(),"jackpot"),d().off("jackpot:set"),d().off("jackpot:bets"),d().off("jackpot:on"),d().off("jackpot:new"),d().off("jackpot:countStart"),d().off("jackpot:roll"),d().on("jackpot:set",r=>{if(te(r?.bets),w(r),X(r?.config),_(r.bets),r.round.countStartedAt){let a=new Date(r.round.countStartedAt).getTime(),u=new Date(r.serverTime).getTime()-a;if(u<3e4){let v=3e4-u,h=Date.now()+v,x=h<1e3?h:1e3;p.animate([{width:"100%",offset:0},{width:"0%",offset:1}],{duration:v,fill:"forwards"}),A(v),j("counting");let $=setInterval(()=>{if(A(Math.max(0,h-Date.now())),Date.now()>h)return clearInterval($)},x)}}}),d().on("jackpot:new",r=>{A(-1),o(0),E([]),w(r),Q([]),_([]),j("waiting"),Z(null),ee(0),p.getAnimations().forEach(a=>a.cancel())}),d().on("jackpot:bets",r=>{let a={...c()};Array.isArray(a.bets)||(a.bets=[]),a.bets.push(...r),te(a.bets),w(a),_(l=>[...l,...r])}),d().on("jackpot:countStart",()=>{p.animate([{width:"100%",offset:0},{width:"0%",offset:1}],{duration:M()?.betTime,fill:"forwards"});let r=Date.now()+M()?.betTime;j("counting"),A(3e4);let a=setInterval(()=>{if(A(Math.max(0,r-Date.now())),Date.now()>r)return clearInterval(a)},1e3)}),d().on("jackpot:roll",(r,a,l,u,v)=>{if(z()==="rolling")return;ee(v);let h=I().find(F=>F.id===u),x=Di(C(),s());x[50]=h;let $=C().find(F=>h.user.id===F.user.id);x[50].color=$.color,x[50].amount=$.amount,Z(x[50]),w({...c(),serverSeed:a}),Q(x),j("rolling"),A(-1),ue(c())}),ie=!0),ie=!!d()?.connected});function ue(r){let a=new bi(r.serverSeed);const l=80,u=l/2,v=8,h=9*(l+v)+u,x=50*(l+v)+u,$=Pe(-38,38,a);f.getAnimations().forEach(F=>F.cancel()),f.animate([{left:`calc(50% + -${h}px)`,offset:0,easing:"cubic-bezier(.05,.85,.3,1)"},{left:`calc(50% + ${-x-$}px)`,offset:.9,easing:"cubic-bezier(.05,.85,.3,1)"},{left:`calc(50% + ${-x-$}px)`,offset:.95,easing:"cubic-bezier(.05,.85,.3,1)"},{left:`calc(50% + -${x}px)`,offset:1,easing:"cubic-bezier(.05,.85,.3,1)"}],{duration:M()?.rollTime||5e3,fill:"forwards"}),window.requestAnimationFrame(R)}let G;function R(r){if(G||(G=r),r-G>M()?.rollTime+2e3)return G=null,j("winners");window.requestAnimationFrame(R)}function se(){if(k())return C()?.find(r=>r.user.id===k().id)}function te(r){let a=0,l=[],u=0;r.forEach(v=>{const h=v.user.id,x=l.findIndex($=>$.user.id===h);x!==-1?l[x].amount+=v.amount:(l.push({user:v.user,amount:v.amount,color:we[u]}),u++),a+=v.amount}),o(a),E(l)}return ye(Li,1,Mi),[y(xi,{children:"BloxClash | Jackpot"}),y(Je,{name:"title",content:"Jackpot"}),y(Je,{name:"description",content:"Win Robux & Limiteds On BloxClash In Big Jackpots In Roblox Gaming!"}),Me((()=>{const r=Me(()=>!!T());return()=>r()&&y(Ei,{close:()=>L(!1)})})()),(()=>{const r=Ii(),a=r.firstChild,l=a.firstChild,u=l.firstChild,v=u.firstChild,h=l.nextSibling,x=h.firstChild,$=a.nextSibling,F=$.nextSibling,t=F.firstChild,D=t.firstChild,P=D.firstChild,b=D.nextSibling,H=t.nextSibling,V=H.firstChild,de=V.nextSibling,K=H.nextSibling,W=K.firstChild,fe=W.firstChild,oe=W.nextSibling,ne=K.nextSibling,U=ne.firstChild,Ce=U.firstChild,ke=U.nextSibling,le=F.nextSibling,re=le.firstChild,be=re.nextSibling,ce=le.nextSibling,me=ce.nextSibling;x.$$click=()=>L(!0),m(D,()=>((se()?.amount||0)/(s()||1)*100).toFixed(2),P),m(V,()=>C()?.length),m(W,y(Ne,{get end(){return s()},gray:!0}),null),m(U,y(Ne,{get end(){return se()?.amount||0},gray:!0}),null);const ge=p;return typeof ge=="function"?xe(ge,re):p=re,m(be,()=>ae[z()]),m(ce,()=>N[z()]),m(me,y(he,{get each(){return C()},children:(n,pe)=>y(ki,n)})),B(n=>{const pe=e(),Ae=e(),Fe=e(),Se=e(),Ee=e(),De=e(),Te=e(),ze=e(),je=e(),Be=e(),Ie=e(),Le=e(),He=e(),Ve=e(),Ke=e(),Xe=e(),Ye=e(),Qe=e(),Ze=e(),ei=e(),ii=e(),ti=e(),ni=e(),ri=e(),ai=e(),si=e(),di=e(),fi=e();return n._v$10=i(r,pe,n._v$10),n._v$11=i(a,Ae,n._v$11),n._v$12=i(l,Fe,n._v$12),n._v$13=i(u,Se,n._v$13),n._v$14=i(v,Ee,n._v$14),n._v$15=i(h,De,n._v$15),n._v$16=i(x,Te,n._v$16),n._v$17=i($,ze,n._v$17),n._v$18=i(F,je,n._v$18),n._v$19=i(t,Be,n._v$19),n._v$20=i(D,Ie,n._v$20),n._v$21=i(b,Le,n._v$21),n._v$22=i(H,He,n._v$22),n._v$23=i(V,Ve,n._v$23),n._v$24=i(de,Ke,n._v$24),n._v$25=i(K,Xe,n._v$25),n._v$26=i(W,Ye,n._v$26),n._v$27=i(fe,Qe,n._v$27),n._v$28=i(oe,Ze,n._v$28),n._v$29=i(ne,ei,n._v$29),n._v$30=i(U,ii,n._v$30),n._v$31=i(Ce,ti,n._v$31),n._v$32=i(ke,ni,n._v$32),n._v$33=i(le,ri,n._v$33),n._v$34=i(re,ai,n._v$34),n._v$35=i(be,si,n._v$35),n._v$36=i(ce,di,n._v$36),n._v$37=i(me,fi,n._v$37),n},{_v$10:void 0,_v$11:void 0,_v$12:void 0,_v$13:void 0,_v$14:void 0,_v$15:void 0,_v$16:void 0,_v$17:void 0,_v$18:void 0,_v$19:void 0,_v$20:void 0,_v$21:void 0,_v$22:void 0,_v$23:void 0,_v$24:void 0,_v$25:void 0,_v$26:void 0,_v$27:void 0,_v$28:void 0,_v$29:void 0,_v$30:void 0,_v$31:void 0,_v$32:void 0,_v$33:void 0,_v$34:void 0,_v$35:void 0,_v$36:void 0,_v$37:void 0}),r})()]}qe(["click"]);export{Ui as default};