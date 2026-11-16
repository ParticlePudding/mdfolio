/* mdfolio 1.1.0 — 同梱ライブラリ（markdown-it, DOMPurify, highlight.js）。編集しないでください。 */
(function(e,t){typeof exports==`object`&&typeof module<`u`?module.exports=t():typeof define==`function`&&define.amd?define([],t):(e=typeof globalThis<`u`?globalThis:e||self,e.markdownit=t())})(this,function(){var e=Object.defineProperty,t=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r},n={};function r(e){let t=n[e];if(t)return t;t=n[e]=[];for(let e=0;e<128;e++){let n=String.fromCharCode(e);t.push(n)}for(let n=0;n<e.length;n++){let r=e.charCodeAt(n);t[r]=`%`+(`0`+r.toString(16).toUpperCase()).slice(-2)}return t}function i(e,t){typeof t!=`string`&&(t=i.defaultChars);let n=r(t);return e.replace(/(%[a-f0-9]{2})+/gi,function(e){let t=``;for(let r=0,i=e.length;r<i;r+=3){let a=parseInt(e.slice(r+1,r+3),16);if(a<128)t+=n[a];else{if((a&224)==192&&r+3<i){let n=parseInt(e.slice(r+4,r+6),16);if((n&192)==128){let e=a<<6&1984|n&63;t+=e<128?`��`:String.fromCharCode(e),r+=3;continue}}if((a&240)==224&&r+6<i){let n=parseInt(e.slice(r+4,r+6),16),i=parseInt(e.slice(r+7,r+9),16);if((n&192)==128&&(i&192)==128){let e=a<<12&61440|n<<6&4032|i&63;t+=e<2048||e>=55296&&e<=57343?`���`:String.fromCharCode(e),r+=6;continue}}if((a&248)==240&&r+9<i){let n=parseInt(e.slice(r+4,r+6),16),i=parseInt(e.slice(r+7,r+9),16),o=parseInt(e.slice(r+10,r+12),16);if((n&192)==128&&(i&192)==128&&(o&192)==128){let e=a<<18&1835008|n<<12&258048|i<<6&4032|o&63;e<65536||e>1114111?t+=`����`:(e-=65536,t+=String.fromCharCode(55296+(e>>10),56320+(e&1023))),r+=9;continue}}t+=`�`}}return t})}i.defaultChars=`;/?:@&=+$,#`,i.componentChars=``;var a={};function o(e){let t=a[e];if(t)return t;t=a[e]=[];for(let e=0;e<128;e++){let n=String.fromCharCode(e);/^[0-9a-z]$/i.test(n)?t.push(n):t.push(`%`+(`0`+e.toString(16).toUpperCase()).slice(-2))}for(let n=0;n<e.length;n++)t[e.charCodeAt(n)]=e[n];return t}function s(e,t,n){typeof t!=`string`&&(n=t,t=s.defaultChars),n===void 0&&(n=!0);let r=o(t),i=``;for(let t=0,a=e.length;t<a;t++){let o=e.charCodeAt(t);if(n&&o===37&&t+2<a&&/^[0-9a-f]{2}$/i.test(e.slice(t+1,t+3)))i+=e.slice(t,t+3),t+=2;else if(o<128)i+=r[o];else if(o>=55296&&o<=57343){if(o>=55296&&o<=56319&&t+1<a){let n=e.charCodeAt(t+1);if(n>=56320&&n<=57343){i+=encodeURIComponent(e[t]+e[t+1]),t++;continue}}i+=`%EF%BF%BD`}else i+=encodeURIComponent(e[t])}return i}s.defaultChars=`;/?:@&=+$,-_.!~*'()#`,s.componentChars=`-_.!~*'()`;function c(e){let t=``;return t+=e.protocol||``,t+=e.slashes?`//`:``,t+=e.auth?e.auth+`@`:``,e.hostname&&e.hostname.indexOf(`:`)!==-1?t+=`[`+e.hostname+`]`:t+=e.hostname||``,t+=e.port?`:`+e.port:``,t+=e.pathname||``,t+=e.search||``,t+=e.hash||``,t}function l(){this.protocol=null,this.slashes=null,this.auth=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.pathname=null}var u=/^([a-z0-9.+-]+:)/i,d=/:[0-9]*$/,f=/^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,p=[`%`,`/`,`?`,`;`,`#`,`'`,`{`,`}`,`|`,`\\`,`^`,"`",`<`,`>`,`"`,"`",` `,`\r`,`
`,`	`],m=[`/`,`?`,`#`],h=255,g=/^[+a-z0-9A-Z_-]{0,63}$/,_=/^([+a-z0-9A-Z_-]{0,63})(.*)$/,v={javascript:!0,"javascript:":!0},y={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function b(e,t){if(e&&e instanceof l)return e;let n=new l;return n.parse(e,t),n}l.prototype.parse=function(e,t){let n,r,i,a=e;if(a=a.trim(),!t&&e.split(`#`).length===1){let e=f.exec(a);if(e)return this.pathname=e[1],e[2]&&(this.search=e[2]),this}let o=u.exec(a);if(o&&(o=o[0],n=o.toLowerCase(),this.protocol=o,a=a.substr(o.length)),(t||o||a.match(/^\/\/[^@\/]+@[^@\/]+/))&&(i=a.substr(0,2)===`//`,i&&!(o&&v[o])&&(a=a.substr(2),this.slashes=!0)),!v[o]&&(i||o&&!y[o])){let e=-1;for(let t=0;t<m.length;t++)r=a.indexOf(m[t]),r!==-1&&(e===-1||r<e)&&(e=r);let t,n;n=e===-1?a.lastIndexOf(`@`):a.lastIndexOf(`@`,e),n!==-1&&(t=a.slice(0,n),a=a.slice(n+1),this.auth=t),e=-1;for(let t=0;t<p.length;t++)r=a.indexOf(p[t]),r!==-1&&(e===-1||r<e)&&(e=r);e===-1&&(e=a.length),a[e-1]===`:`&&e--;let i=a.slice(0,e);a=a.slice(e),this.parseHost(i),this.hostname=this.hostname||``;let o=this.hostname[0]===`[`&&this.hostname[this.hostname.length-1]===`]`;if(!o){let e=this.hostname.split(/\./);for(let t=0,n=e.length;t<n;t++){let n=e[t];if(n&&!n.match(g)){let r=``;for(let e=0,t=n.length;e<t;e++)n.charCodeAt(e)>127?r+=`x`:r+=n[e];if(!r.match(g)){let r=e.slice(0,t),i=e.slice(t+1),o=n.match(_);o&&(r.push(o[1]),i.unshift(o[2])),i.length&&(a=i.join(`.`)+a),this.hostname=r.join(`.`);break}}}}this.hostname.length>h&&(this.hostname=``),o&&(this.hostname=this.hostname.substr(1,this.hostname.length-2))}let s=a.indexOf(`#`);s!==-1&&(this.hash=a.substr(s),a=a.slice(0,s));let c=a.indexOf(`?`);return c!==-1&&(this.search=a.substr(c),a=a.slice(0,c)),a&&(this.pathname=a),y[n]&&this.hostname&&!this.pathname&&(this.pathname=``),this},l.prototype.parseHost=function(e){let t=d.exec(e);t&&(t=t[0],t!==`:`&&(this.port=t.substr(1)),e=e.substr(0,e.length-t.length)),e&&(this.hostname=e)};var x=t({decode:()=>i,encode:()=>s,format:()=>c,parse:()=>b}),S=t({Any:()=>C,Cc:()=>ee,Cf:()=>te,P:()=>ne,S:()=>re,Z:()=>ie}),C=/[\0-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,ee=/[\0-\x1F\x7F-\x9F]/,te=/[\xAD\u0600-\u0605\u061C\u06DD\u070F\u0890\u0891\u08E2\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF\uFFF9-\uFFFB]|\uD804[\uDCBD\uDCCD]|\uD80D[\uDC30-\uDC3F]|\uD82F[\uDCA0-\uDCA3]|\uD834[\uDD73-\uDD7A]|\uDB40[\uDC01\uDC20-\uDC7F]/,ne=/[!-#%-\*,-\/:;\?@\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061D-\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B4E\u1B4F\u1B5A-\u1B60\u1B7D-\u1B7F\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u2027\u2030-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u2E52-\u2E5D\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDD6E\uDEAD\uDED0\uDF55-\uDF59\uDF86-\uDF89]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9\uDFD4\uDFD5\uDFD7\uDFD8]|\uD805[\uDC4B-\uDC4F\uDC5A\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDEB9\uDF3C-\uDF3E]|\uD806[\uDC3B\uDD44-\uDD46\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2\uDF00-\uDF09\uDFE1]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDF43-\uDF4F\uDFFF]|\uD809[\uDC70-\uDC74]|\uD80B[\uDFF1\uDFF2]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDD6D-\uDD6F\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD839\uDDFF|\uD83A[\uDD5E\uDD5F]/,re=/[\$\+<->\^`\|~\xA2-\xA6\xA8\xA9\xAC\xAE-\xB1\xB4\xB8\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0384\u0385\u03F6\u0482\u058D-\u058F\u0606-\u0608\u060B\u060E\u060F\u06DE\u06E9\u06FD\u06FE\u07F6\u07FE\u07FF\u0888\u09F2\u09F3\u09FA\u09FB\u0AF1\u0B70\u0BF3-\u0BFA\u0C7F\u0D4F\u0D79\u0E3F\u0F01-\u0F03\u0F13\u0F15-\u0F17\u0F1A-\u0F1F\u0F34\u0F36\u0F38\u0FBE-\u0FC5\u0FC7-\u0FCC\u0FCE\u0FCF\u0FD5-\u0FD8\u109E\u109F\u1390-\u1399\u166D\u17DB\u1940\u19DE-\u19FF\u1B61-\u1B6A\u1B74-\u1B7C\u1FBD\u1FBF-\u1FC1\u1FCD-\u1FCF\u1FDD-\u1FDF\u1FED-\u1FEF\u1FFD\u1FFE\u2044\u2052\u207A-\u207C\u208A-\u208C\u20A0-\u20C1\u2100\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F\u218A\u218B\u2190-\u2307\u230C-\u2328\u232B-\u2429\u2440-\u244A\u249C-\u24E9\u2500-\u2767\u2794-\u27C4\u27C7-\u27E5\u27F0-\u2982\u2999-\u29D7\u29DC-\u29FB\u29FE-\u2B73\u2B76-\u2BFF\u2CE5-\u2CEA\u2E50\u2E51\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFF\u3004\u3012\u3013\u3020\u3036\u3037\u303E\u303F\u309B\u309C\u3190\u3191\u3196-\u319F\u31C0-\u31E5\u31EF\u3200-\u321E\u322A-\u3247\u3250\u3260-\u327F\u328A-\u32B0\u32C0-\u33FF\u4DC0-\u4DFF\uA490-\uA4C6\uA700-\uA716\uA720\uA721\uA789\uA78A\uA828-\uA82B\uA836-\uA839\uAA77-\uAA79\uAB5B\uAB6A\uAB6B\uFB29\uFBB2-\uFBD2\uFD40-\uFD4F\uFD90\uFD91\uFDC8-\uFDCF\uFDFC-\uFDFF\uFE62\uFE64-\uFE66\uFE69\uFF04\uFF0B\uFF1C-\uFF1E\uFF3E\uFF40\uFF5C\uFF5E\uFFE0-\uFFE6\uFFE8-\uFFEE\uFFFC\uFFFD]|\uD800[\uDD37-\uDD3F\uDD79-\uDD89\uDD8C-\uDD8E\uDD90-\uDD9C\uDDA0\uDDD0-\uDDFC]|\uD802[\uDC77\uDC78\uDEC8]|\uD803[\uDD8E\uDD8F\uDED1-\uDED8]|\uD805\uDF3F|\uD807[\uDFD5-\uDFF1]|\uD81A[\uDF3C-\uDF3F\uDF45]|\uD82F\uDC9C|\uD833[\uDC00-\uDCEF\uDCFA-\uDCFC\uDD00-\uDEB3\uDEBA-\uDED0\uDEE0-\uDEF0\uDF50-\uDFC3]|\uD834[\uDC00-\uDCF5\uDD00-\uDD26\uDD29-\uDD64\uDD6A-\uDD6C\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDDEA\uDE00-\uDE41\uDE45\uDF00-\uDF56]|\uD835[\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85\uDE86]|\uD838[\uDD4F\uDEFF]|\uD83B[\uDCAC\uDCB0\uDD2E\uDEF0\uDEF1]|\uD83C[\uDC00-\uDC2B\uDC30-\uDC93\uDCA0-\uDCAE\uDCB1-\uDCBF\uDCC1-\uDCCF\uDCD1-\uDCF5\uDD0D-\uDDAD\uDDE6-\uDE02\uDE10-\uDE3B\uDE40-\uDE48\uDE50\uDE51\uDE60-\uDE65\uDF00-\uDFFF]|\uD83D[\uDC00-\uDED8\uDEDC-\uDEEC\uDEF0-\uDEFC\uDF00-\uDFD9\uDFE0-\uDFEB\uDFF0]|\uD83E[\uDC00-\uDC0B\uDC10-\uDC47\uDC50-\uDC59\uDC60-\uDC87\uDC90-\uDCAD\uDCB0-\uDCBB\uDCC0\uDCC1\uDCD0-\uDCD8\uDD00-\uDE57\uDE60-\uDE6D\uDE70-\uDE7C\uDE80-\uDE8A\uDE8E-\uDEC6\uDEC8\uDECD-\uDEDC\uDEDF-\uDEEA\uDEEF-\uDEF8\uDF00-\uDF92\uDF94-\uDFEF\uDFFA]/,ie=/[ \xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/,ae=[8364,0,8218,402,8222,8230,8224,8225,710,8240,352,8249,338,0,381,0,0,8216,8217,8220,8221,8226,8211,8212,732,8482,353,8250,339,0,382,376];function oe(e){return e===0||e>=55296&&e<=57343||e>1114111}function se(e){return oe(e)?65533:e>=128&&e<=159&&ae[e-128]||e}function ce(e){return e-1>>>0<127||e-160>>>0<55136?String.fromCharCode(e):String.fromCodePoint(se(e))}var w=(()=>{let e=new Uint8Array(127),t=0;for(let n=33;n<=126;n++)n!==34&&n!==36&&n!==92&&(e[n]=t++);return e})();function le(e,t,n,r,i,a){let o=e.length,s=a*90,c=0,l=()=>{let t=w[e.charCodeAt(c++)];return t<a?t:t*91-s+w[e.charCodeAt(c++)]},u=n-r,d=n+i,f=new Int32Array(d);f.fill(-1,r,a),f.fill(-1,a+u,d);let p=new Int32Array(d),m=new Int32Array(d);function h(t,n){let r=0,i=n,a=n+t;for(;i<a;){let t=w[e.charCodeAt(c++)];if(t<89)r+=t,f[i++]=r;else if(t===89){let t=w[e.charCodeAt(c++)]+2;for(;t--;)f[i++]=++r}else{let t=w[e.charCodeAt(c++)];r+=89+(t<90?t*91+w[e.charCodeAt(c++)]:w[e.charCodeAt(c++)]*8281+w[e.charCodeAt(c++)]*91+w[e.charCodeAt(c++)]),f[i++]=r}}}h(r,0),h(u,a);let g=new Int32Array(i*2),_=0,v=0;function y(e,t){for(let n=0;n<e;n++){let e=t+n,r=l(),i=l();g[v*2]=r,g[v*2+1]=i,v+=1,p[e]=_;let a=(f[r]<0?m[r]:1)+(f[i]<0?m[i]:1);m[e]=a,_+=a}}y(i-a+r,a+u),y(a-r,r);let b=new Uint16Array(_),x=0;for(let e=0;e<v;e++)for(let t=0;t<2;t++){let n=g[e*2+t],r=f[n];if(r<0){let e=p[n],t=e+m[n];for(;e<t;)b[x++]=b[e++]}else b[x++]=r}let S=new Uint16Array(t),C=0;for(;c<o;){let t=w[e.charCodeAt(c++)];t>=a&&(t=t*91-s+w[e.charCodeAt(c++)]);let n=f[t];if(n<0){let e=p[t],n=e+m[t];for(;e<n;)S[C++]=b[e++]}else S[C++]=n}return S}var ue=le("!}.&u%}'&}*'~!6*)%&,~!J~!J~%L~y<~!R,~~%Lu~~#GD~~#|)1#%}^%}2%+#.##%##%}&%##%'#%##&%#%#'%#&#%#&#'#%%#&#%##%#)%''%&%#%#'%#%%#%%}%%%#%#&(23#%%#&-%0%('1#(##%#'##+%'*.:1}#%#6-+(%'%%#%%%}#L'2351&('%}&/N'(0(/*-%(%%}#'+&T%7.2}#&%&#%#36/5##%&%%#&#%%#))2%%##%&&'0~!#*+&'%1~!%).'3q?&%'1~!.##%6(~!+%%%(Gw'rT~!E#<nA%#jZ~!H%(~!42##~!*31&~!G%U~#)5~#`3~!J~!Z~%]~%Y~%C~!q~!u~#kz~%#~!6'~!D~!U~!?~#T~!c%~!G#'~%7|~!G~!J~!G&~#pb~(Df}#%}*&}#%##%##%##&#-}&'#'&%#.++}%mI,#,@&(}*%}*'%&##&#%##%}&0}#.},U},%}+%}&%}#%##&}B%(}(%}+%)})%##%#&}&%##%&}<%}>%#%&}*%}(%}9%}/%})%}*%}*%}?&}&%}3%}&*#%})%#%#)}#&#-#+*%E%%'%'#%}#*V##&##I}#&&##%&%#&&Qf%%))w/0+&%#(#.%-''''++++7}>%4'',##1,#%#&%##&#'##&#*#9)%&%}#*}%,#+P(%A&%#'&##wSD',9E00#y#@}(+}&%&>~!#~!X}#*}(&&}(&}(,%}%&#+&}#&}I%#%}%)#(},'%#*}4%%#%}(''}#/##(##),%-##%%)#&}(.}&%#&}%%}*&#%},&&}&%}#%*'#%})%}D&}&%}-&}6&#&}-,%}#%})-(~+`~,=?~I9'9%~!,#%})%})%}@%}?%}(~!?~#<~#pP~#BG~#=1#%K+~#?#~%;)~#A~#mF1~#A'~'X%'~#lR~#N~'N~#r~#m#-~#i'?%#'%~#B%##%,%#~#_%#0%~#]732~,w~2+#:&#%&'0%&>%}#>##F+)#%&&#(+_}4&}-%}(&}@&}O7Fdf0@+/v4}&WU##&/0#&'('B#%}.%}'+#%}#%%&#&%#%##+#&#)#6#'#.},%}c%},%#%##%&#&%#&~#>'*-.%##%##%}#%%}%'~#)D1}#%*&~#_%%'(~#S2%'.}#~#=##*'*-%}&'%'##&&~'E%.#&~#M4}%%##&'%#~#O1##%&#'+~#<B%##%%'%+~#;#@%}#&%#&&%#(~#H1}'%'##&&~#?A}&'~#D#%32}'&&&&~#[}'(#%}'~#;C})&}%%#%~#=&%,3}%'(#%%~#^'#&&)#%'~#Y%-~#d-%'~#^%%&#&&&}#~#b~2t*&'~&(~&@~0%~e~3}%*''0})&}+~!9##-}#%-hD*)1fC#%/&/fB#40~!+#)*4~!+~!K'&:~!/*7~!.#~!H~!L':~%x&~!H#~!*~%1~!I#~!+A~#p'~!F~~#-#~,,(~.Z~!V~%;'B'mq-W~!N~%I%#&&#&}#%},%%}'%}+X#%}#&}(%}'%}<%}#%}%%'}'%}:~![)9@~%>~#UA%-%##&~!C%~!-.9:~!1~!-^2/:a~!y,D*J#-5)/4~%23,~#G~!L1~!0X3`~!2+~!!0-~&E~!W~!o,>Y&]~%cZx_&~#O*9#A#'#+I'%#)~!0B*-5A+-((F&*M#)(-7-5+'-3a5Vi~!Y~!?+[)%3),ERHm~!+:D,VG.+)?fB%%*(%)'(#&80%1'8`K8?`+'Z#&O&'H5#*9)A%%5&3))0%39+.*7#()&&*=4@**L)<'_&*+..;(#*+)./&0#3)%')-8(4ixD(&.}%,('aI:,)%,k2231T)I'#/-W7,/'Q#.'Y24+h')37</31&83##&0#),H(?'&?/1##%#&&#%''-%&&&#(&''&#.-'%#%%(,')*'&#&#'##%(%(#%('#&##%%%%('%#%#%%#%#&%##h>w+v<ayvyvcg.uuhKr}g/v|g>u9i[~>g5uI~=RvdwEg;v/g;uk!!TTSx]@RT!U!#!@VBRUU!'UTe-d0c`e&gSdicedFcrdTaqb.kYcAohdYd@a3e+d}dMdtd.aJ#bqcK`dle/e.e'dwdPdodddjbEb}ogd^ofdpduc6j?l%d{drdqc)d7bacOdQ%T#Y)X.sR[yH>6Vyv3[xwLu>vo'!*.[yBacahoj>6Rew3[xqdZa#!a&#^(X-[yG>6Vyu3[xvg3sEr|g.u/Ri9db0T#^(Xa)!-[y;>6Vylg4wKs{JwNZt3@3r=c4Z([xlg;wKt!cpq's@v7A'*a(a+!-a#[y<3Dt?3Dt'>6Vym3[xmg9rxsNJwLZt4~?r?db1T#`-!(Xa,!0[yS>6Vz%NuQs.g4wKtnJwNZtS@3r>c4Z([y%g;wKtrdga8!a(!#&T*Y-Xa#!a0<or[yc3Dtq>6Vz43[y3JwNZtf@3s!Ju}!%Dti:pm3c_%X#tjB5pkd6q!r]u?voC'*-a.a2!0a&a+[yI3DtI3Ds~3DtH>6Vyw3[xx;:s#~<5pKJwNZtE@3r~d`a)!a2T#a.(!+U.X1[yT3Dt`3Dtv>6Vz&3[y&g9rxwzcxstPu.<rAJwLZtT~?r@dZa%!a.&^*Za(/Reu[ya>6Vz23[y1g3sEr}wkg{NuQRg{ci(U#5@b`~,cg#U(2WnH5wugcRh7dX#T(Y,a'Ta!!a,[yZ<]mj>6Vz,3[y+Pv#5ReZKu+=,%!H}7ABwkaS?Rh:BcW(X#<]mrj:ubv/ARekdg%!(!a.*Ta(Y.X1!#sP>Rl*Dt6[y>>6Vyo3Wf*jOvuumvuRgRJuq*!:9<B@bX~3jVv&v@s@5Re[d/rQt{uAvo&a&a*)a2!,0Wf!3Dt0=Bs'>6Re}3[xy~<5s%JwJZt1~Gs)c;&!#2sJkNuXvzq7rxu,Re8dka4!a8(aEZ+a@Y.X1Xa)[yd=Bs(3DtP>6Vz53[y4cX#X&Re:avRe9~<5s&JwJZtQ~Gs*i^rzvdRg+Jv{%!2sbB@bX}kdga,!Za?&^*T1/!a'Dt+[y6>6Vyf3Wf%g/u;s4hGu6?Rh-JvZ,!c%#&RoX54Rivj7uyvf8RgTKvZB%*!2sGh<vu5Rgq<=C::9bb~#dZ#T&Ta6Y.X*Dt>[y93Wf)coZ(T,6VyifluvRgC@95@B@bX~/hFu34cC#T,k/unq8w8Q5RkUklwQuzunq8w8Q5Rk8d/rJu?v8w9)-&!a0a;a&aIWejg3sEr/h1s<DtDJvyZqY5aws3Jvy!&Wei~Hr1:au5@Bag>23E~5c:Z&bX};kKv?w&unuVu5Rjc;>bs)#~@:Rh.=ay<a]C;b`}Vd6s/t{uAvoaxa()!a,a7%-a#a2Dt,[yF2Wo[>6Vyt3[xuNuPRi&NuPwpi#RoWh?vf8Ri%Jv]!%Ri:KvxD!.'2WeAjZu`q9rxu,Re7woeAg-unLq(qA_/*2Wg_g3u5q^9:4E}/jTrxrzv=Wkkd~0UX#^^Xa-a1a5T&a=U1a'*aEa]!a*aPaA-adok[y54Rn>;:p3~Dp5g9rpsFNvZqjg3uJp4~<5p0Pw;5qlJwNZt*@3p1Pw:5p/Ou!5p2JvG'!6Vye=<qnJvh_[xhg3v,Rh3kOwOw-sDuev/Re^dha[a%!%!a+#Ta7)-5TaCaO!aka!a)sf[yb2>Rl!9ARiq5E}Qg=ucRkBE|oJrJ_@Wk~@Wk{JrJ_@Wk|@WkyJrJ_@Wk}@WkzJvO_[y2g-vMRmiKuYC!)&>Ri;>Ri<@3RkNc](X#@9Rk=g5vuRmhKvDB!+'=]meg3u4Rmgd)#Y'Vz3CARmfd`a+!%T'!+#Ta1Ta6TaM-sTDt9[yA9sYd'%Y#s[[xpj:ueunaXRgEjRq,v-vuqdd2'`#6Rev<32@5>:2<E}5xIo9a*X#Y(;5RePJvD_g>vyRgNj8w)v8<wggs:RgXiZt|vjx,hSq3ah!-(~@:Ro/Ou!5RhWj^v(pyw8unRhUdx-UY#^Ua.a3a70!)%UX1TaDa)'omRiRRhE[y:3Dsz=Br,>6Vyj3[xkg6ruwjcqsrPw;5r*Ku]D'Zt-@3r(~?r.i[vwv]dU1a--U#`a4(g/vsRhPOu!5RhLj:rmu9Wo!~@:wdh@g/vsRiTjXuvvNr}:RhBj^v(pyw8unRn]dz1UYa'a+^Y(!aETZalaRY.Ta?a4[yDJw1!#qLsW>6Vyrfzq-pLflpwRe|Js>%!Dt@3Dt&Jvy_[xs~HrnjMuwpsw'RecKu+D#'!t<~Grl~?rjg5u-x,gwp{ah!-(~@:Rg~Ou!5Rh'jXuvvNr}:Rh#cW#X/c;&!#2sLi[v7u7RgpJv)(!iLrxu,Re6j7v@s@5Se[e7d`aW!Za(a`T.a#!a3!&aDa-!9)Dt_=6s+3[x~~DR|h~DS6avhGun5RkZj3w)v-]mkKunB!&*]kb97R|i<ARk<c:Z(6Vy}Juh'!wziMRoS:F|vkLuauJv5vtvQRh1d='T+Y#VyO~DR|jcF#T'7R|g97R|kJv3'!ay<Rj,Jvh&!:ReXcsa6*a+#a#_aIRf9aLRf?c,Z&Rf5Rf7c.Z&Rf;Rf>cQ#%T'p-Rf8Rf=ct#%'(*!,p,Rf4p+Rf6Rf:Rf<d~'Ua%U*^UYa(!a,-!#a4YaTalaEX0a8a<Weo3Dt/3Dsx=Br93Wen~Dr;~<5p<JwNZt2@3p=Pw:5p;Ou!5r3c7&!#:p>3Ds}KvGB)_6Vyk2sM=<r7x'eovA(!hFu1ARf}cV#X&@r5j6rvwQa^Rf3c=Za'wkghJv__g;unRggA53B9=b^}%j6uduo5Jq;!(hIv%2Re`Ou4ARe_e%a#^^^Xa&!a*a2!&a6YaP!*ad!#a:aE/5Rn?[y@>6Vyp;:pE~DrY~<5pBJwNZt8@3pCh=rt3rWPw:5pAJup_[xoNuPpF9c!#'45pD5ARn)d8#X'X*3@rU72s]h>v<<sSjJpqvewOJq/(!hNw'5ReBk0s2u3w/w'5ReE5@Jq.!a+JQ!&WeU23d(#Y&RjG5]jBk!u7w&u0udARjEe#+^^^Ub#!a2/a`Z(agT1!a-a;|@TaG!aS[yV=Re~fow'RguNuPRe?bz#'>RoUWeL>:Cbb|?JwPZtVg6ruRmzJvD'!6Vz(g/vmRh~Jvy_[y(g9voRgyx*cy(#2>Ri2B9b]~9kIw9u7rluJu3Rg]dI#a%UY'@=p%CAx.gQZ&RhwwygtRm{x5g_Z'+ABqR9Woa=Bp&dV#^*Xa'!&@o{g4v]Rk;Jv{!%Rk[wkkiA5RkiwwfUB=x,fUuqC&*!>RfTg8v0RfV~ARfSd;rJsAuAv9wR'ae+/aO!a@aza/a#[yQ@Wg!2Wemg3sEr0JvB_g>uvReWg2v+Re=KupB_+[y!2AbY~-~Hr2AJwD!(h<~El>h<~El?Kun@+_:9b`}Kg-v/Ri3g;vtwyk_9]k_d=&T#*U.6qh@Ab`|K9:H|CJv[!&3Dtex'fDwC%!Rf[9WlMd[(^X,!a%Z06Vz!@WgBg=v~Rgvg,QRe@awd,#Y+jTv|Q~EfWj]uNr|~FRfXdy#Y&^Ua%!aO.!(a)Ua;=!a@aKap!a-,a!Ta]a[rSa]p?[y82sK=Bq~;:p:~<5p8Pw:5p7d'#Y'Wf(;RnRi[u4w&RgJJvG'!6Vyh=<r#ijuuv/sIKuYD'ZtG@3p9~Gr&d2#`(g<vtRgFj`u5w&rqpxRf2CJuY!+:wfnTOu!5Rg}jNs1ucv&RfwJvA!&3@q|BDcC#T,k/unq8w8Q5RkTklwQuzunq8w8Q5Rk9dga#!a'!a=#a0!:+Tb*b@aO.a4!aba8aFJv^}?!VyR~Dr<g;u%Rn.~<5p[x'e`wNZtR@3p]Pw:5pZhNvjBp.woe_g5u-r4JwF!%DtO3:ooc7&!#:p^3DtpLuGw(!+%)Dtk6Vz#2sd=<r8d'#Y([y#<x3gJt`w@!)%}MRiowzikRij=]ilxAf3,U(#B2Rf#g0v-Rm[ck{`U#]giKv3>)!&6Ri154s,KuGB_%@r68r:dJ|t`#X(9<E|u2@H|rx3gJu?w'!+'1Nu7Reg4=H~+9<wxgY95Rm]xLggZ-`(X}U2:Ri4h<uOawRmsJv__5@bb{jbV~3dka#a'a]!,#a+U=a>b6a3b%!/aKa/)!arwve^VyJ;:pR~DpTg3uJpS~<5pOPw;5qmPw:5pNOu!5pQJvG'!6Vyx=<qoJvA!{~Jup!%@qk7Rn/KvyD!}''[xz;>wkh'?Rh,x8gyt`w5D!&),(SgyccRgztJ@3pPB5p#d'(Y#<]mmifubw&RgoJvE&!82s^JvF&!8Rf,ADb]~;x=h'rNu]vK!,%'*0RnORh)4Rh*AqQg-vaRnNg;wHwkh'ba~4cE#Ta*x3gctyw@'!+%RnFRnD<4Rn@hFvK5RnCxWg[#`&a0Ua()`1Rm75Rg[c]%X#qi8Rg^NvdRj>BwzgZauwji7Rm6A4wgg]d1#&(*,.0a#Rm;Rm<Rm=Rm>Rm?Rm@RmARmBe%#^^^Xaea?aC/b+(,!a+a#!a/!>a&Ta<aKbD!2wphBRnk[yPw}hE|.=Br-3Dtm>6Vy~g6urRf.x,hPrNav!%'RnqRo%Ro#Nu;q[Pw;5r+JwNZtM@3r)d'#Y'Weh;xChL#`&RnmRnoKu}>%(!Rne~Bs-;2wjcussJv+'!aYSO}6@B<5?ba~8LrNvj!.%*ROwungw~ng~:9;Ri^>wtnig;wHRnixDh@|(UZ.x1h@|)!#:2<H|*xHn]#-UX'3Ro)z=iT}6ARns=Bwsn_wpnaRncw]aR(#UXa&Ua*a/=]iPd'#Y&Ro'WnXf{QRm2hNvj]nZd`'T~&1`{|`#9b]{}c:'!#Wl{>@=be}]?cl{{U#:5Abb}Jds#^YaF!a*b4a#a3aPa>&Tb!bH!*a_!Eau?/a&RjY<]gj>6Vz*;:pe~DrZg,QRj1JwNZtX@wihspcJvZ&!VyX9WmOJu|!|N2WmHJvh&!]ht~Bpbcn&T(!#RmQ<s7Nu;padH#X'`+WmJ@>RmKCARhnKup=!)&Wf+:RhqNuPpf9c!#'45pd5AwghpARn(Ls@w!%,)!RmP@Wfe<E|IJva!&WmNg8vsRmLd`*.`#Y'Xa!axRn*]hrA8Rhug5s@rXg8u!RmMd8#X'X*3@rV72smdI*#UY&RmICARho~GsgxVgd)Ta'U-Y&Xa!T#RnEWnA@Wffg1uDRi0hFvK5RnBxGnG&#`%owp)@wsf+bX}Ze-*1!a*^^^Ua|!#a.aq&Ya2!a>.a6!a:aO`aJDtL[y`@Wg#>6Vz12@wzoYRoZNuPRi!NuPRhzg=ucRi,@=b`{Yg=ucRi-ACJvB!&Sh[ebSh]ebi`wUuFRm4Jw2_[y0JvB!.<Ju(!&SoG}6Shd}6<Ju(!&SoH}6She}6Kur@._g5vHRieJvx!{L2G{Kx6gd'T#?Rh82Wi5cZ#X(g1w)Rm5dW-Y(Ta#!a)!#aYa=wnfE=su2>>bU{0j9udv:<svj8uQv-7RgHdE%#^'sq9sp=>Bb_{TJv`!&g/r|snj6v(us5d,#Y(56H}[978H}]Jw5!&g1rushJvB!+j;v{u5?zDhd}6}bj;v{u5?zDhe}6}ce*#`(^^^a[aea!=!a6a*aoXb1a.!aAbL!b>,b'aL!aV@Wf|2Wlg3[y/JwNZt^@3piPw:5pgJunZou3@rsJva&!Vy_g<v~Rm#JvG'!6Vz0=<r{Ju{%!:pj@WfsiXuJu3Rm:JvZ&!WfA~Bph@c4Z&Dtwax5rubx(#:awRk1@d,#Y&RfjRfid1#,Y(@Wfp2Wlrg5s@ryKu[@!,'=]ig9wlk?Rk>g5u-rqJvy'!@9RkQcH(T#=>Ri~@<wkj(Wj(KuZB*!&<7rw@9RkRcH(T#=>Ri}@<wkj)Wj)dg(Ta2Xa9X#`-!a*CARhg@@=I}d9x;c~#X%so=<sj>2@@=aybb}XjWv0Q~EfEj3vLv;<d,#Y(56H}`978H}_dgaPaFa'a/!#a3Y0a_a;a|!1(a7-[yE3[xt;:pJNvZrrg3uJrvJwNZt=@3pIh=rt3rxPw:5pGOu!5rpJvG'!6Vys=<rz@c4Z&Dt(ax5rtJvZ!&~BpH@wsfNg-vaRlNci*U#=<wei<F}a5@Jq.!a*JQ!%@qZ23d(#Y&RjH5]jCk!u7w&u0udARjFd/prq=tyvpaEa(a:.!a1aZ(@@=I}:9wpd%=<sX55w_h}@@=I{t=ay<aU@@=I}T=ay<2@@=I})?C9:9au@9Cb]}DP~=x-fAZ(2Wl1=ay<aU@@=I}>5@d##Y+jTv|vV~EfFj]uNpn~FRfGdgaK!Z2&!a8a-Tb({E!acTbM*!a(DtY[yYd'%Y#sl[y*hHvh>Re5x2c{Z}.j4uCvcawRiMd+#X+_x&d!},<5RkX;2Hzw@x,gavfB-!{CcF&T#Roe;RodwWbBg5urRgaKvHC*_6Vz+<4opieuew&Rmq@d]&Y)X,T#X0Rh}<BqP=4qS9:ReMg/ujReNJw0!/<Jui%!bd{kawwnemRelAxUa?a3#*.&UX(Ya+a/RhvRnQ<o}9Wmtd-#Y&RgSRmw9;Rmxay=Rmyg-vaRmuxEhSrNu,v-voC!%(aR.a(a7+1Ro1>Ro5CE{A9b]{@;5x#eO{:g;urRi+KrNA!%(Ro3>Ro79;Ri_Ku@>{;&!x%gX|{KunA_+g5QRj/g3u5Rj#g>uERj%wio/xRhS&!,!#^1U}wba{8>>@=be}qC@:D5ba{7Ku+A&!}x?ba}t>>@=be}se(aA^^^Uat!b0#{pa+awUazbGa#aLb9bgaWac'a5TbS=Br!d1#`%scp_Jvl!#rT>Re0JvX&!VyN=H{Fcm#U&:pY=ReaJv2&!]h0=]nUJvG'!6Vy|=<r%JrM_=]h2@Wlud'#)U'Wf'b]{i=]h/Jvh!&~BpWg=v]RnMx+ny#'Nu;pVwjnu=]nwxJnx,T#`&Reqwjnt=]nvieu9vrRjLLuYwP(#+!th@wih5pX~Gr'g5v/Rh4KunA'!-CARnP@wwiN:Rm_9x'cvw>!|l=<saKvAA!0&3@q}>w^e1bp#&Re2Re3BDx7gH#T|f5H|eKuZ>!%(:qNAH{]Jv6!+3B2B9=b^{X<5<B92:E{ZLvhwA(a;a%!igQuyRmad+#Y}m@3Rh5d8#X'X*:AqUAHzmaxwbh<aXRnVcF}RT#Nw&cj#U(BWnug/vsRntdka)(a3+.Zb7aYYan1!bVa@Xa}[y^@b[{G=H{+hFu73Rj&Pv#5ReQcK%T#sig1v{Rj'Ku+D#'!t]~Grm~?rkKuMB!01d5#`'Vy.ta3Dtu~Hroc8#'{^45s85AwZbP&!#Rn!wghxWn#KvEA!)&2RlA2RlBx:h|#(T,=]j09Wobz>x]z/@awRoTd+#Y(az]hFhCrm4d,#Y+jTv|Q~EfMj]uNr|~FRfOdCa!Xa9_X#@<plJvf!%b`{(9;Rgwc;.!#2x7cw#T|UDb]|T5Ju={(!=@E{&Jv)&!Ab`{'awJvf!~*>>@=be{#KuY>!+&4Ezyi[ugv&RjIdea+T)#UXa&T-T&a!Rh9auRmW=]kLg5vuRn+g3u4Rn-Ow6ARn,hHus5xNk?#UX(U~)/g8v0RkD~AwkkF?Ri.OuNBwkkA?Ri/d|a2`a*^UYa.!aBTZaTa'Xa;!(!2!-a#b2[yC>6Vyq3[xr2Wi?g1rusVh%s?DtF~<5rbJs;%!DtBfswKtCj[uvuSsEu3RgVx3o:u+wN'*Zt;@3rd~Grh~?rfg8w)Lq)qE&-a%!>bI|`jWv0vV~EfCjTv|vV~Ef@j]uNpn~FRfBcK#T']gWNu7x,k7q4ai(0!hHv8<RhmkMu9vrsBuev/RhlCJvB!,g<v{wchh~@:Rhji[vrv{wchi~@:RhkdS&a5UY#Ta!RgPwwiI5BwciI~@:Rh`x'iJvj'!5]iJPu8Bwch]~@:Rhach)U#h3rp]gLh@t|Ax,hTq3ah!-(~@:Ro0Ou!5RhXj^v(pyw8unRhVd|)`,^UYas!a?/a2Z'a^Ta{Tb7Ta(a#!a,Wf&9sZ3DtAadamov=Bqt3[xig8vsRm~>waiL2b`{QJv*_Ouv2qgj<v]v2BqfdR'X*X#Y-@3qr~Gqv~?p6hHv-]glPup5Lq+q?_%*b_{qF{n9b^{rOu4ARhpKvCD!+&~Bqp:5Dbb}nwoiKl&unuTuBv]v+ueunaXRf0=Jvh!0nKufu8v1w&w7q%w&uHrz:Rgnj5w,uxDJq/(!hNw'5ReCk0s2u3w/w'5ReFd>Za&!*UaA=<wkgsRnSJv^!%Refifw3vyRgOKu_B'!,<]gkiiu:w&Rh<=C@a^<B57@2F{[<B5@aW:=3away9A5aW=<B=C@a^<B57@2F{Ie-#`(^^^bCara.b8aza6!/bZ,!adTbnTbOb+aFaS!aAT9@Wf~2Wli3Dtl2@d,#Y&RfnRfmJwJZtN~GqyJva&!VyMg<v~Rm%iXuJu3Rm9Jv[_=]ih9wlkDRkCd1#`(@Wg>2Wls3cH#T(@<Rj*=>Ri|b~'#23s9h<~El.d'#Y&Dtxi^rzvdRl#d*#U%(o|B2s`hJwSaxRmDKv4B&!1:Rmdd5#`'Vx}to~Hq{x'f1v3(!BA5ba|bJv_&!Wfug1v]ReIdO+U/Y#&G}-8wze=Rh{g1v]ReHg/uQRf/by#)ibQwERl/cH#T(@<Rj+=>Ri{cNu+vlax-!(#a0qa9<Rii2;;bU{H;x<i=&X#Rk`<4wwi=C9H~8xAI(Y#<azRi@45wXI<B9;5bb~7dL(X#Xa(+!aL6Vy{g5QqOau:5au2@ay547EzbxOcU(UX-T#Ta#:Cbb|A?wjh/b_|SOw6ARgtihr}u7Rhy<d1#T)X1@@=I|~=ay<2@@=aybb}Sj3vLv;<d,#Y(56H}A978H}@dGpvs@uAu`vcw9*!aFa+ai%(b!aXa8.a?a[ozWey=sU2@G}Nch&U#Rf_WexKu+D#'!t:~Gr`~?r^j]uNr|~FRg*j^psurwJt|RmcKv)@&!)7Rkv~Br[@wxfO:Rl3co#U'6Rezj_q#vIuavjRltwzeyh@vr5JqD0!>aY?C9:9au@9Cb]}9cl#U*5;5<H||jbuus1ucv&Rfvg1v~d/pppzqFr^a--a~!aMat1(hFv;Wiz@@=Izoj5uuv-7Rix~Cw`fk2WlVcZ#X,k)u3vWs@u2]ktg;wEx'fBq(_2Wg/jTv|vV~EfoJv]!15x'hzqG!(P~EfU~CRl_j6v(us5x4i-#T(2WmZ?C2F|d>Kq<aj1!*jTqIsBv=Wl`~Cw`fi2WlWj`v0u*~>RlR=c>Z,k#u3vWs@u2]kr<c1Z+jTqIsBv=Wla~Cw`fm2WlXdmb3!a{(arZa`bkTa%TbQTa-a9+c'!aM!/[yL=Bqug.w'RifhFvyDRj.g>vgwyk^9]k^Jv3_@WfbAARkhJw2_[x|JvB_wkoIRoKwkoJRoLd'(Y#<]gm=<9<H|yd'%_X#skDtb3awwqkgNulRkgdB#^',9:p'hJwSaxRmEBwVb8@4=H|qLu+w50&!)@3qs~?pU>Awwn;;Rn=c:Z'ARn<=<qwKvC@!/&~BqqJv6!&]eVb^z^xRge'/a%+^`#Sge}6<4Rn3=]n0Pw2>Rn8Jw0!&>Rn:>Rn6cY#a7+!a&=<wkaNw~h3z_c5Z{=wjh#=]nLKv^D!&)Vyz=bW|swYb<WetcG#T(2wxa@qVx@gD#Y&b^|V5JwG&!5bb|pg/w&RgD@x=kHs=uAvn!a%%/'+RmSRh694Ro`g-vaRmRhHv-]mlxCcS#`&ba~.5cD#Ta)P~=d,#Y(56H{>978H{Dd_#{2^Y%_+qbbb{6g3sERhsbU{?dfa.,`a(Xa<!aiX#(55RiG54RiHcI#T'WiU3RiVNvdwtfcRlKNvdd,#Y&RlHRlExQgf.1*^T'X#Sgf}6Wn4=]hfPrk>Rn7Jw0!&>Rn5>Rn9Lunw?&a2!,5<oq@@wqfdRlJj5Q~=d,#Y(~ARfcOuN]fdDKw;ay(}i!547E}j?cI#T(@5bV}iCbV}hdv(^^Tb?a40,b##Tbo!a*bR!a<b|a/!aKai!aU[yK=]o^g:v>ReGJwPZtK<7Rh+h<~El,Pv#5ReR@awwxjCg,ulRjDJv6&!]j!z?aQeeg>w=Sh<eeJw;!&axEzOg,Qosc!#*:wkeJ]eJ>x'h-u(!%Ro.w~h.zPdNZ(X,Ya![x{;9ReY;wkgxRiF:x?ap#Y&RmUg<s2Rkod]+UY0TZ'!a&A9sw<=bczLNvuw{gqzNhJwSaxRmCKuLay!#&s_Rf-55b^{uJvZa!!c%#(55Ri654wmiu5RiuawLu,vp!+}^%b_}Y9;wkgxba}o>A9:=b^}zKuh=a''!3awRk3c*'!#aHRk6c+Z&Rk5Rk4Jv)&!awRjSawd9*`#0?C2@EzMj8u<uJ5RmbjQrquJu3x,k>uq@_+=ayb^|W~ARkEOuN]k@7dhzV^X/X&a-#zRzSb`zXcJzTT#2WkVKvDBzW!%FzY9;5bbzWjQrquJu3Jw3%!b`zU=ayb^zQd:#X(T-a!6Vyywxh}=b]{Jg=u1RiAdGp~qHtzv!w(wA+a+a;<!aJaYai'anasb(=azRmV:Cbb{MLq2vb!%')RjuRjrRjtRjqx3jnqCw3!%')Rk(Rk+Rk&Rk)Lq2vb!%')Rj{RjxRjzRjwLq2vb!%')RjsRjpRjfRjex3jcqCw3!%')Rk'Rk*RjkRjl9<CbbzfOu4ARhxLq2vb!%')RjyRjvRjhRjgx=joq*uKvb!%')+-Rk.Rk%Rj~Rk-Rk#Rj}x=jdq*uKvb!%')+-Rk,Rk!Rj|RjmRjjRjidAq&qKs@uAv8Aa.'*-a@a&0!aM@a5[y73Dsy3Ds|3Dt):wxgI2sHJwJZt.~Gqxwsf0ikrzt}Rl0Jvy_[xj~HqzKv_A|D!&WfP8axRoVcf,U#k(v]v+ueunaXRf1Ju}'!g8u#Ri=jQw!sCunLprq>!,')~<5qeGzq9F{W=c##%s5au:5aU3CBE|;d4#X(D!a&6Vygx(b;#(=]ed?C2F{N<capoq2r[a&!aPa9,'Pw;5s:@@=I|,55w_h|@@=IzcP~=x'fCqB_2Wl2>aU@@=I|1OuNBc1Z+jTqIsBv=Wlc~Cw`fl2WlZ~AcTa%!Z+jTqIsBv=Wlb~Cw`fh2WlYk+uNqJsBv=WlSg,u3dca3#UXaMYa)TaB-=cM|7T#<bI}l5@B932:aV2G{BOuNBJq:|M!5Ezt=<B=C@a^<B57@2F{v>cB{/T#=ay<bI{3Jv6!a.6BKq0ah&+!5E}HP~Ef{978BaU@@=Iza<7d#.Y#978BaU@@=IzH~AJq0!(@@=IzG978BaU@@=IzFe,aU*Y&^^^bvJb,b:bFad!a,c2Ta>aL.bo6!a#CbTa'T#Re{2Wlh2@G{yg6t~Ro_NvdRfticuRQRllJv3&!x&c|zs@Jw3!%RflwpfkRlpKuL;%(!Re<@G|C2GzdhIvuBwgjAg-u0RjAKQB%!(GzZ@G|5NuuRl7d='T+Y#Vy[g<v~Rm!==G|>JvA!)@wma=]m1ifuaw&RmnLs@vT'!|/+[y,g:v>ReTJw1!#qX=x!eC{bLu+wT&)ZtZauq_~Graci&U#F|89:r_Lupvq!.)&2RlG8RfaC=x!eF{_h?rpWlmd&'!#X|&]k::xJey#`'T|+<E|&2@H|%dE#(^,g;u.RiEg6vjRiC9xCkA{O|zY#g=ucRmXKs0@!&*@G|m@awRknJuh!,3d(}gY}eJvj!%Rm):Jw3!%Rm+Rm-Ls0w(&!a(a#@b[|6cZ#X'7RkxWgAOu4ARn'dH'U#Y*Vz-Wm'CARm}d]*#a%^a*T'aK!a<9bV{PC=p*Jw4!&SgxcbB5r]idw(wBRmF7xFkt#&`(Rm/Rm8E|!JuY_9:Rl5=wrgr2:bbxd@xXfB(a*#T+!.X0X1Ta/a'T&RlDRfL>RlyARl9b[z[>RfZ:RlL:RfRwlg/ARl;9;RlxKv,A/!%7s69<74=BA5ba{-8Bde#`a<XaKYa1,a'P~=wxfB2bZ}}?C972@@=I}r8@55B9;5bb}G978B2@@=aybb}3j3vLv;<Jw3&!>Rfk=ayb^}4~Ad1#`*@@=aybb{w2@>==<bbz]dx+UY#^UaF!a9!bB'Ya1.!ajXa#%olRhD[y=3Dt#Ov5BrHKuMB%!(Rf^Wep~HrJwkiQjKr|~FRg)Ku+D#'!t5~GrF~?rDdV)UY,Z/_7RkuG{<~BrBg,rlsO:235B@bX}|d?a1!#`(6Vyn5@d##Y+jTv|vV~EfIj]uNpn~FRfH7Lq2vb1!a9-978BaU@@=Iz9978BbU}#~AJq0!(@@=Iz8978BaU@@=Iz7~AJQ|}!978BbU}!JvkaK!AdUa21-U#`a+(g/vsRn~Ou!5RPj:rmu9WhOjXuvvNr}:RhAj^v(pyw8unRn[kPr}p|u7vwv]RiSBd;pppzq@qHQa?(b.!a.a`@.|xa(hFv;Wiyj5uuv-7Riw~Cw`fg2WlU978BbU|wOuNBJqG!(P~EfD~CRlQcZ#X,k)u3vWs@u2]ksg;wEx'f@q1_2Wg.j]uNpn~FRfqJv]!15x'h{qG!(@@=IzK~CRl^j6v(us5x4i,#T(2WmY?C2F{1>Kq<aj1!*jTqIsBv=Wld~Cw`fj2Wl[j`v0u*~>RlT=c>Z,k#u3vWs@u2]kq<c1Z+jTqIsBv=Wle~Cw`fn2Wl]dn1#c(a(b^a2!b/bAT(bj!aDa7bu,a_a{c0!2T0g:v>ReD2@G{42@G{5~DpM~<5rc=Bx6i>{RT#RnI@zCx]y]z:2Jv[!zr5Awyk]9]k]dD(Y+X#6Vz.g=wKtgwhaCwgmTWj2Lu,w%_+/[y-B;b^xeg3u3Rj-2@bX{*KrJ<!+'@Wg(g?QRlC@Jv`!%b[zIwsfII}8JQ_@w|kW|=Jv(%!AqcOuNBJvEzh!bYzjLs@wP#(0!oy@>RkdJwMZtc3Dtd@BcG#T'9bWxg2@2Fznd*#Y+;2x'c}w<zizixNgwa#Z'U+!/!a'!a+w~g~z6wcn{Rn}wcnzRn|5Rh%=]nJg5vuRmvNvdRlvcprJu}w*az*a#!%.a.'Bot9qT]kj@Wg'ay2Gzv@Jv`!%b[zEwsfHI}1;ck#Ux`<Cbbx_Lu+w!a&0*!wko*wwo,So,}6Juqxf!E}PigQuyRm`d3(`#8>Rn%:A5B;bZ~%KvhCa!a2!x>k7#Uxb@b{#xaRk7Jw0!)>wwhlShl}6>wwhmShm}6CJvB!.x'hhvj{!!5Bwkhhbaz}x'hivjz~!5Bwkhibaz|xEhTrNu,v-vpD!a%&/)a3a.,%Ro2t[CE{)@3re9b]{%wjo09:rgc:Z&Ro6=<riifuaw&RmoKrNA!%(Ro4>Ro89;Ri`dSaL'UYzxZb)7Rka3xRhT&!,!#^1U}vbaz{>>@=be}yC@:D5bazzKu+A&!}{?ba}y>>@=be}wxBh[t`u~vJvr!%a!a()a,a0a4RoC=]o;Ju(!%RoGRhdwjh`=]oAg>w#Ro?g5vuRo=NvdRl|Ku]C.!&;RoEJvB!%RoORoMBx'h[v+_?w~h`}~5?w~hd~!xKh]oiptu-utv.vp!#%&a30a@a'a+(a/aOp(o~p!RoDJu(!%RoHRhewjha=]oBNvdRl}g>w#Ro@g5vuRo>c[#X']o<CauRoRAd-#Y':RkpauRoQKu]C.!&;RoFJvB!%RoNRoPBx'h]v+_?w~ha}t5?w~he}ue!/UbhYacXaW^Tc&a;b:a-c/#b&aja1(!cL+!bKbt!bmcRc9aIc?8[yW3Dtt94Rg`Jv}!&SiRMzBhEebShEMNuPRe>x7gL#TzuwjirRipc<Z&>on;>z=h-MSh.Mwqczx'a7vj&!>Re4@=ResJt__NuPRi*NuPRi)j]uNr|~FRfzKrJ>_+@Wfy@Wf]2WocKrJ<!+'@Wg%g/QRl@@Jv`!&awRl<wsfFIzgLu(w*!.*&ShBMwvhIRhI9;RhNx1hK'!#Sn]Mx1hK~0!#:2<H~7cNu+w7D*'1ZtW>Rn1~?rOc:Z&Rn2=<rQ<7wjh&=BSnLMc]#X(6Vz)w[b=a!U#9wzgMc3#&(RgMRitRis<x,gKt`ax!&+SioM=BSilMc3#&(RgKRinRimKurB,!&SiQMzBhDebShDM6BJQ!(P~Efx978B2@@=I}WLrJw!!,a*&@G}O@9wkibRid@@x'fKwC!&SlDMSfLMjUv~Q~EfKKv3@a+!(hFv-]mpx/hYZ(C5RiWz<o/MwkhY?So/M@x,gbvfB*&!SgEM:SoeeehFu3:Rgbda(,^TZa)X/7Sg[eb:2RgI~BrMC@wgkc:wwkcRerx3h(uUvK!&*,SnOM4Sh*MArRg;wHRh(x=h;rJvPwI!a4',a'0@Wg&=BSh/Mg>w=Rh=g3w*wwgGRgGcW(X#;Sg}M2Gzk@Jv`!&awRl=wsfGIz`dKZ*T'Y-:RhR7RhQg5u-p`j6v(us5d,#Y+~Awkia?RicOuNBwkibba}Ld6p~tyu_vbAa'a+!a/'a3aEa8a!>Sh,ebJv{!&Sh@ebSaReb9;SgwebNuPRi(NvdRl)NuPRi'hHu^<Rm^Jvv_@Wl(g;u1Si/ebKu'B&!*Sh?eb@Wl'z@aPeb95Si.ebcpputyvjB)!,&a+0a%ShAMWeK@G}C@WfJ9;RhMwvhH9w{ia}ix,hJvRA1(!zAn[MRhHx1hJ~*!#hFv(BSn[MBJQ!(@@=I~'978B2@@=I}2db.Ua<'X}+T#a0XaG2G}E;wkg|wuh!Rh!x,hZu,@)!&So0MVy)C5RiXACJvB!&5RiY5RiZg8w)cG}*T#2@bU}=KsA>(!a.3wkhZba~(x,h^u(A!&(SoCMRhb5Bz=h[eb?w~hb~6x,h_u(A!&(SoDMRhc5Bz=h]eb?w~hc~6e)aA1T#T,^^^c-bMb&blcPaP(a/!0!bA=b5c@a(!bfbrc#2afwmhARnjwchORnp2Wlf3DtsNvdRl-2@wpa<]m0bx(#:awRk2@Jw3!%RfhwpfgRlnKQB%!(G{V@G|'NuuRl6d='T+Y#VyUg<v~Rl~==G|<Jv+'!aYShC}6@B<5?ba~8@Jw3'!g2QRljhLrpWlOd+#Y'g.w'rIg>w*wgj@g-u0Rj@Lu+wT&)ZtUauq]~GrGci&U#F|39:rELrNvj!.%*RhCwunfw~nf~:9;Ri]>wtnhg;wHRnhx3hDs@v~!/+'@Wfr@9RkSNu&Rlo=@<5GzoKs0@_+@Wl+@awRkmJuh!-3d(}pY#qWJvj!%Rm(:Jw3!%Rm,Rm*de&!1U-U#`)Re;@G|.@9Ri82@wjfvRlq=@<5GzpLvOvr!).&2RlF8Rf`C=x!eE{.Jw3_g2QRlkhLrpWlPde(!#U{s,UXa*Ta'[y'g:v>ReS;x0PZ&RnlRnn~HrKJw1}f!=x!eB|2w]aP(#Xa&a*Ta.Ua2a7=]iOd'#Y&Ro&WnWg;u.RiDg6vjRiBNvdRlzhNvj]nYJuW_2Wm3x)kFze{9d])!a.!,Y01!#&aC!a3RndC=ox~BrC@2b^{pg,rlse7x'ksuq!%Rm.E{xidw(wBRmGx9o+)X#wwo-So-}69:Rl4@xSf@a#XZ'X)X,Ta(/ARl8b[xc>RfY:RlI:RfQwlg.ARl:9;Rlwdn'#^XafaQa1X1TaHTa)@b[{zcZ#X'7RkwWg@Ou4ARn&x)kG#{,g7u/RkGdH'U#Y*Vz'Wm&CARm|bx#(A]gUbUzJj9Q~=d,#Y(56H}l978H{U7d,0#U*2>ABb_xZ978BbU{e~AJQ{g!978BbU{hxMh?ad{oUYZ.x1h?{l!#:2<H{mx3n[t{vl!,&a%3Ro(z=iS}6ARnr=Bwsn^wvn`Rnbd`*T}B0!#^X'BG{c9b]{a>>@=be}F?JvS!&BG{d7BG}(Bde#`a1X,Ya@!a'P~=wxf@2bZ}I56B2@@=aybb}08@55B9;5bb}<j3vLv;<Jw3&!>Rfg=ayb^}&OuNBKuLA!)a!P~=x#fD{f2@>==<bbzl?C972@@=Ix^d6rSu,v7w*C(0a)a6#B+a%!sQ[y?3Dt%3[xn~<5rLOu!5p@Ku+D#'!t7~GrP~?rNKvlaya7'!h+v-5qMg=t|cd,U#5AAaa5Abb{S@52B5@a[@52B5Gx[iXueu;d<#`a(!/549C;ag>23ExY5@Dah89b^~689Jv)!~2b[~1Lv'w(%*!a#bX|aPrmawRe]keu7uhv-q6rxu,q`xTo]/a5aU!bNaDXbi!b-!ao!b<bwA!#5@B932:aV2G|:d-)Y#hJrL>RhG<7@C5<H|_=Cau:5aj5@B932:bJ|ng>vIbs)#?C2F|9jPv0w.vISh-MKvUaz(.!9ABbb|[5;5<H|Eg>unwfh;9:4E|YjQsBt|vjx'hYq3!(?C2F|J:2<BaY?C2F|GOu!5x,g|p{ah!-(?C2F|c9:4E|OjXuvvNr}:Rh&i[w*t|cd+U#jJvsu)vsSn~Mkfrmu9p}u7vwv]So!McW#Xa!ax5@A5aY:5;5<H|>kJv~vYrquJu3x4ib#T)2@SmZM?C2F|Bj:rmu9@xPhI(a*a#U#`a3-5Abb|L~@:RhK9:4E|0@52B5G|#C::aY?C2F|-:2<BaY?C2F|.5Jvk!a)javYrquJu3x4ia#T)2@SmYM?C2F|HAxPhH(!a#U#`a*-5Abb|4~@:RhJ9:4E|R@52B5G|F:2<BaY?C2F|Sc^#Xa2j=Qq5CJvB!-g<v{z;hhM?C2F|Zi[vrv{z;hiM?C2F|XKsA>!a)-g<v{z;h[eb?C2F|]i[vrv{z;h]eb?C2F|^iZu.vix,hZq3ah!.(?C2F|QOu!5ShXM:2<BaY?C2F|P",13494,2713,49,25,61),T;(function(e){e[e.VALUE_LENGTH=49152]=`VALUE_LENGTH`,e[e.FLAG13=8192]=`FLAG13`,e[e.BRANCH_LENGTH=8064]=`BRANCH_LENGTH`,e[e.JUMP_TABLE=127]=`JUMP_TABLE`,e[e.VALUE_MASK=8191]=`VALUE_MASK`})(T||(T={}));function E(e){"@babel/helpers - typeof";return E=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},E(e)}function de(e,t){if(E(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t||`default`);if(E(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function fe(e){var t=de(e,`string`);return E(t)==`symbol`?t:t+``}function D(e,t,n){return(t=fe(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var O;(function(e){e[e.AMP=38]=`AMP`,e[e.NUM=35]=`NUM`,e[e.SEMI=59]=`SEMI`,e[e.EQUALS=61]=`EQUALS`,e[e.ZERO=48]=`ZERO`,e[e.NINE=57]=`NINE`,e[e.LOWER_A=97]=`LOWER_A`,e[e.LOWER_X=120]=`LOWER_X`})(O||(O={}));var k=32,pe=21,me=2097151,he=2047,ge=0;function _e(e){let t=e>>>pe;return t===he?ge:t}function ve(e){return e-O.ZERO>>>0<=9}function ye(e){return(e|k)-O.LOWER_A>>>0<=5}function be(e){return(e|k)-O.LOWER_A>>>0<=25}function xe(e){return e===O.EQUALS||be(e)||ve(e)}var Se;(function(e){e[e.EntityStart=0]=`EntityStart`,e[e.NumericStart=1]=`NumericStart`,e[e.NumericDecimal=2]=`NumericDecimal`,e[e.NumericHex=3]=`NumericHex`,e[e.NamedEntity=4]=`NamedEntity`})(Se||(Se={}));var Ce;(function(e){e[e.Legacy=0]=`Legacy`,e[e.Strict=1]=`Strict`,e[e.Attribute=2]=`Attribute`})(Ce||(Ce={}));function we(e,t,n,r){let i=(t&T.BRANCH_LENGTH)>>7,a=t&T.JUMP_TABLE;if(a){if(i===0)return r===a?n:-1;let t=r-a;if(t>>>0>=i)return-1;let o=e[n+t];return o===0?-1:n+i+o-1&65535}if(i===0)return-1;let o=i+1>>1,s=n+o+i;for(let t=0;t<i;t++){let i=e[n+(t>>1)]>>((t&1)<<3)&255;if(i===r)return s+e[n+o+t]&65535;if(i>r)return-1}return-1}function Te(e,t,n){return n===1?String.fromCharCode(e[t]&T.VALUE_MASK):n===2?String.fromCharCode(e[t+1]):String.fromCharCode(e[t+1],e[t+2])}function Ee(e,t,n){let r=t+1,i=0,a=r;if(r<n&&(e.charCodeAt(r)|k)===O.LOWER_X)for(r+=1,a=r;r<n;){let t=e.charCodeAt(r);if(ve(t))i=i*16+(t-O.ZERO);else if(ye(t))i=i*16+((t|k)-O.LOWER_A+10);else break;r+=1}else for(;r<n;){let t=e.charCodeAt(r)-O.ZERO;if(t>>>0>9)break;i=i*10+t,r+=1}if(r===a)return 0;r<n&&e.charCodeAt(r)===O.SEMI&&(r+=1),i>1114111&&(i=1114112);let o=r-t;return o>=he&&(ge=o,o=he),o<<pe|i}function De(e,t,n){let r=ue,i=e.indexOf(`&`);if(i<0)return e;let a=e.length,o=0,s=``,c=r[0],l=c&T.JUMP_TABLE,u=(c&T.BRANCH_LENGTH)>>7;do{let c=i+1,d=e.charCodeAt(c),f,p;if(d===O.NUM){let n=Ee(e,c,a);f=_e(n),t&&f>0&&e.charCodeAt(c+f-1)!==O.SEMI&&(f=0),p=f===0?``:ce(n&me)}else if(be(d)){f=0,p=``;let n=d-l,i;if(n>>>0<u){let e=r[1+n];i=e===0?-1:u+e&65535}else i=-1;let o=0,s=0,m=i<0?0:r[i],h=c+1;trie:for(;h<a;){for(;(m&(T.VALUE_LENGTH|T.FLAG13))===0&&(m&T.JUMP_TABLE)!==0;){let t=m&T.JUMP_TABLE,n=(m&T.BRANCH_LENGTH)>>7;if(n===0){if(e.charCodeAt(h)!==t)break trie;i+=1}else{let a=e.charCodeAt(h)-t;if(a>>>0>=n)break trie;let o=r[i+1+a];if(o===0)break trie;i=i+n+o&65535}if(m=r[i],h+=1,h>=a)break trie}if((m&(T.VALUE_LENGTH|T.FLAG13))===T.FLAG13){let t=(m&T.BRANCH_LENGTH)>>7;if(e.charCodeAt(h)!==(m&T.JUMP_TABLE))break;h+=1;let n=t-1,a=i+1,o=0;for(;o+1<n;o+=2){let t=r[a];if(e.charCodeAt(h)!==(t&255)||(h+=1,e.charCodeAt(h)!==(t>>8&255)))break trie;h+=1,a+=1}if(o<n){if(e.charCodeAt(h)!==(r[a]&255))break;h+=1}i+=1+(t>>1),m=r[i];continue}let n=m>>>14,l=e.charCodeAt(h);if(n!==0){if(l===O.SEMI){f=h-c+1,p=n===1?String.fromCharCode(m&T.VALUE_MASK):Te(r,i,n);break}if(!t&&(m&T.FLAG13)===0&&(f=h-c,o=i,s=n),n===1)break}let u=we(r,m,i+(n||1),l);if(u<0)break;i=u,m=r[i],h+=1}if(p===``){let e=m>>>14;e!==0&&!t&&(m&T.FLAG13)===0&&(f=h-c,o=i,s=e),f>0&&(p=Te(r,o,s))}}else f=0,p=``;f===0||n&&d!==O.NUM&&e.charCodeAt(c+f-1)!==O.SEMI&&c+f<a&&xe(e.charCodeAt(c+f))?i=c:(o<i&&(s+=e.slice(o,i)),s+=p,i=o=c+f),e.charCodeAt(i)!==O.AMP&&(i=e.indexOf(`&`,i))}while(i>=0);return s+e.slice(o)}function Oe(e){return De(e,!0,!1)}var ke=t({arrayReplaceAt:()=>je,asciiTrim:()=>R,callable:()=>Ae,escapeHtml:()=>M,escapeRE:()=>Ue,fromCodePoint:()=>A,isMdAsciiPunct:()=>I,isPunctChar:()=>We,isPunctCharCode:()=>F,isSpace:()=>N,isValidEntityCode:()=>Me,isWhiteSpace:()=>P,lib:()=>Ke,normalizeReference:()=>L,unescapeAll:()=>j,unescapeMd:()=>Le});function Ae(e){let t=function(...n){return Reflect.construct(e,n,new.target&&new.target!==t?new.target:e)};return Object.defineProperty(t,"name",{value:e.name}),Object.setPrototypeOf(t,e),t.prototype=e.prototype,t}function je(e,t,n){return[].concat(e.slice(0,t),n,e.slice(t+1))}function Me(e){return!(e>=55296&&e<=57343||e>=64976&&e<=65007||(e&65535)==65535||(e&65535)==65534||e>=0&&e<=8||e===11||e>=14&&e<=31||e>=127&&e<=159||e>1114111)}function A(e){if(e>65535){e-=65536;let t=55296+(e>>10),n=56320+(e&1023);return String.fromCharCode(t,n)}return String.fromCharCode(e)}var Ne=/\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g,Pe=RegExp(`${Ne.source}|&([a-z#][a-z0-9]{1,31});`,`gi`),Fe=/^#((?:x[a-f0-9]{1,8}|[0-9]{1,8}))$/i;function Ie(e,t){if(t.charCodeAt(0)===35&&Fe.test(t)){let n=t[1].toLowerCase()===`x`?parseInt(t.slice(2),16):parseInt(t.slice(1),10);return Me(n)?A(n):e}let n=Oe(e);return n===e?e:n}function Le(e){return e.indexOf(`\\`)<0?e:e.replace(Ne,`$1`)}function j(e){return e.indexOf(`\\`)<0&&e.indexOf(`&`)<0?e:e.replace(Pe,function(e,t,n){return t||Ie(e,n)})}var Re=/[&<>"]/,ze=/[&<>"]/g,Be={"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`};function Ve(e){return Be[e]}function M(e){return Re.test(e)?e.replace(ze,Ve):e}var He=/[.?*+^$[\]\\(){}|-]/g;function Ue(e){return e.replace(He,`\\$&`)}function N(e){switch(e){case 9:case 32:return!0}return!1}function P(e){if(e>=8192&&e<=8202)return!0;switch(e){case 9:case 10:case 11:case 12:case 13:case 32:case 160:case 5760:case 8239:case 8287:case 12288:return!0}return!1}function We(e){return ne.test(e)||re.test(e)}function F(e){return We(A(e))}function I(e){switch(e){case 33:case 34:case 35:case 36:case 37:case 38:case 39:case 40:case 41:case 42:case 43:case 44:case 45:case 46:case 47:case 58:case 59:case 60:case 61:case 62:case 63:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 124:case 125:case 126:return!0;default:return!1}}function L(e){return e=e.trim().replace(/\s+/g,` `),e.toLowerCase().toUpperCase()}function Ge(e){return e===32||e===9||e===10||e===13}function R(e){let t=0;for(;t<e.length&&Ge(e.charCodeAt(t));t++);let n=e.length-1;for(;n>=t&&Ge(e.charCodeAt(n));n--);return e.slice(t,n+1)}var Ke={mdurl:x,ucmicro:S};function qe(e,t,n){let r,i,a,o,s=e.posMax,c=e.pos;for(e.pos=t+1,r=1;e.pos<s;){if(a=e.src.charCodeAt(e.pos),a===93&&(r--,r===0)){i=!0;break}if(o=e.pos,e.md.inline.skipToken(e),a===91){if(o===e.pos-1)r++;else if(n)return e.pos=c,-1}}let l=-1;return i&&(l=e.pos),e.pos=c,l}function Je(e,t,n){let r,i=t,a={ok:!1,pos:0,str:``};if(e.charCodeAt(i)===60){for(i++;i<n;){if(r=e.charCodeAt(i),r===10||r===60)return a;if(r===62)return a.pos=i+1,a.str=j(e.slice(t+1,i)),a.ok=!0,a;r===92&&i+1<n?i+=2:i++}return a}let o=0;for(;i<n&&(r=e.charCodeAt(i),!(r===32||r<32||r===127));)if(r===92&&i+1<n){if(e.charCodeAt(i+1)===32){i++;continue}i+=2}else{if(r===40&&(o++,o>32))return a;if(r===41){if(o===0)break;o--}i++}return t===i||o!==0||(a.str=j(e.slice(t,i)),a.pos=i,a.ok=!0),a}function Ye(e,t,n,r){let i,a=t,o={ok:!1,can_continue:!1,pos:0,str:``,marker:0};if(r)o.str=r.str,o.marker=r.marker;else{if(a>=n)return o;let r=e.charCodeAt(a);if(r!==34&&r!==39&&r!==40)return o;t++,a++,r===40&&(r=41),o.marker=r}for(;a<n;){if(i=e.charCodeAt(a),i===o.marker)return o.pos=a+1,o.str+=j(e.slice(t,a)),o.ok=!0,o;if(i===40&&o.marker===41)return o;i===92&&a+1<n&&a++,a++}return o.can_continue=!0,o.str+=j(e.slice(t,a)),o}var Xe=t({parseLinkDestination:()=>Je,parseLinkLabel:()=>qe,parseLinkTitle:()=>Ye}),z=class{constructor(e,t,n){D(this,`map`,null),D(this,`level`,0),D(this,`children`,null),D(this,`content`,``),D(this,`markup`,``),D(this,`info`,``),D(this,`block`,!1),D(this,`hidden`,!1),this.type=e,this.tag=t,this.attrs=null,this.nesting=n,this.meta=null}attrIndex(e){if(!this.attrs)return-1;let t=this.attrs;for(let n=0,r=t.length;n<r;n++)if(t[n][0]===e)return n;return-1}attrPush(e){this.attrs?this.attrs.push(e):this.attrs=[e]}attrSet(e,t){let n=this.attrIndex(e),r=[e,t];n<0?this.attrPush(r):this.attrs[n]=r}attrGet(e){let t=this.attrIndex(e),n=null;return t>=0&&(n=this.attrs[t][1]),n}attrJoin(e,t){let n=this.attrIndex(e);n<0?this.attrPush([e,t]):this.attrs[n][1]=`${this.attrs[n][1]} ${t}`}},B=class{constructor(){D(this,`__rules__`,[]),D(this,`__cache__`,null)}__find__(e){for(let t=0;t<this.__rules__.length;t++)if(this.__rules__[t].name===e)return t;return-1}__compile__(){let e=new Set;this.__rules__.forEach(t=>{t.enabled&&t.alt.forEach(t=>{t&&e.add(t)})}),this.__cache__=Object.create(null),this.__cache__[``]=[],this.__rules__.forEach(e=>{e.enabled&&this.__cache__[``].push(e.fn)}),e.forEach(e=>{this.__cache__[e]=[],this.__rules__.forEach(t=>{t.enabled&&t.alt.indexOf(e)>=0&&this.__cache__[e].push(t.fn)})})}at(e,t,n={}){let r=this.__find__(e);if(r===-1)throw Error(`Parser rule not found: ${e}`);this.__rules__[r].fn=t,this.__rules__[r].alt=n.alt||[],this.__cache__=null}before(e,t,n,r={}){let i=this.__find__(e);if(i===-1)throw Error(`Parser rule not found: ${e}`);this.__rules__.splice(i,0,{name:t,enabled:!0,fn:n,alt:r.alt||[]}),this.__cache__=null}after(e,t,n,r={}){let i=this.__find__(e);if(i===-1)throw Error(`Parser rule not found: ${e}`);this.__rules__.splice(i+1,0,{name:t,enabled:!0,fn:n,alt:r.alt||[]}),this.__cache__=null}push(e,t,n={}){this.__rules__.push({name:e,enabled:!0,fn:t,alt:n.alt||[]}),this.__cache__=null}enable(e,t=!1){Array.isArray(e)||(e=[e]);let n=[];return e.forEach(e=>{let r=this.__find__(e);if(r<0){if(t)return;throw Error(`Rules manager: invalid rule name ${e}`)}this.__rules__[r].enabled=!0,n.push(e)}),this.__cache__=null,n}enableOnly(e,t=!1){Array.isArray(e)||(e=[e]),this.__rules__.forEach(e=>{e.enabled=!1}),this.enable(e,t)}disable(e,t=!1){Array.isArray(e)||(e=[e]);let n=[];return e.forEach(e=>{let r=this.__find__(e);if(r<0){if(t)return;throw Error(`Rules manager: invalid rule name ${e}`)}this.__rules__[r].enabled=!1,n.push(e)}),this.__cache__=null,n}getRules(e){return this.__cache__||this.__compile__(),this.__cache__[e]||[]}},V={};V.code_inline=function(e,t,n,r,i){let a=e[t];return`<code${i.renderAttrs(a)}>${M(a.content)}</code>`},V.code_block=function(e,t,n,r,i){let a=e[t];return`<pre${i.renderAttrs(a)}><code>${M(e[t].content)}</code></pre>\n`},V.fence=function(e,t,n,r,i){let a=e[t],o=a.info?j(a.info).trim():``,s=``,c=``;if(o){let e=o.split(/(\s+)/g);s=e[0],c=e.slice(2).join(``)}let l;if(l=n.highlight&&n.highlight(a.content,s,c)||M(a.content),l.indexOf(`<pre`)===0)return l+`
`;if(o){let e=a.attrIndex(`class`),t=a.attrs?a.attrs.slice():[];e<0?t.push([`class`,`${n.langPrefix}${s}`]):(t[e]=[t[e][0],t[e][1]],t[e][1]+=` ${n.langPrefix}${s}`);let r={attrs:t};return`<pre><code${i.renderAttrs(r)}>${l}</code></pre>\n`}return`<pre><code${i.renderAttrs(a)}>${l}</code></pre>\n`},V.image=function(e,t,n,r,i){let a=e[t];return a.attrs[a.attrIndex(`alt`)][1]=i.renderInlineAsText(a.children,n,r),i.renderToken(e,t,n)},V.hardbreak=function(e,t,n){return n.xhtmlOut?`<br />
`:`<br>
`},V.softbreak=function(e,t,n){return n.breaks?n.xhtmlOut?`<br />
`:`<br>
`:`
`},V.text=function(e,t){return M(e[t].content)},V.html_block=function(e,t){return e[t].content},V.html_inline=function(e,t){return e[t].content};var Ze=class{constructor(){D(this,`rules`,Object.assign({},V))}renderAttrs(e){let t,n,r;if(!e.attrs)return``;for(r=``,t=0,n=e.attrs.length;t<n;t++)r+=` ${M(e.attrs[t][0])}="${M(String(e.attrs[t][1]))}"`;return r}renderToken(e,t,n){let r=e[t],i=``;if(r.hidden)return``;let a=t-1;for(;a>=0&&e[a].hidden&&e[a].nesting===0;)a--;r.block&&r.nesting!==-1&&a>=0&&e[a].hidden&&e[a].nesting===-1&&(i+=`
`),i+=(r.nesting===-1?`</`:`<`)+r.tag,i+=this.renderAttrs(r),r.nesting===0&&n.xhtmlOut&&(i+=` /`);let o=!1;if(r.block&&(o=!0,r.nesting===1)){let n=t+1;for(;n<e.length&&e[n].hidden&&e[n].nesting===0;)n++;if(n<e.length){let t=e[n];(t.type===`inline`||t.hidden||t.nesting===-1&&t.tag===r.tag)&&(o=!1)}}return i+=o?`>
`:`>`,i}renderInline(e,t,n){let r=``,i=this.rules;for(let a=0,o=e.length;a<o;a++){let o=e[a].type;i[o]===void 0?r+=this.renderToken(e,a,t):r+=i[o](e,a,t,n,this)}return r}renderInlineAsText(e,t,n){let r=``;for(let i=0,a=e.length;i<a;i++)switch(e[i].type){case`text`:case`code_inline`:r+=e[i].content;break;case`image`:r+=this.renderInlineAsText(e[i].children,t,n);break;case`html_inline`:case`html_block`:r+=e[i].content;break;case`softbreak`:case`hardbreak`:r+=`
`}return r}render(e,t,n){let r=``,i=this.rules;for(let a=0,o=e.length;a<o;a++){let o=e[a].type;o===`inline`?r+=this.renderInline(e[a].children,t,n):i[o]===void 0?r+=this.renderToken(e,a,t):r+=i[o](e,a,t,n,this)}return r}},Qe=class{constructor(e,t,n){D(this,`tokens`,[]),D(this,`inlineMode`,!1),D(this,`Token`,z),this.src=e,this.env=n,this.md=t}},$e=/\r\n?/g,et=/\0/g;function tt(e){let t;t=e.src.replace($e,`
`),t=t.replace(et,`�`),e.src=t}function nt(e){let t;e.inlineMode?(t=new e.Token(`inline`,``,0),t.content=e.src,t.map=[0,1],t.children=[],e.tokens.push(t)):e.md.block.parse(e.src,e.md,e.env,e.tokens)}function rt(e){let t=e.tokens,n=0;for(let e=0;e<t.length;e++)t[e].type!==`reference_definition`&&(e!==n&&(t[n]=t[e]),n++);t.length!==n&&(t.length=n)}function it(e){let t=e.tokens;for(let n=0,r=t.length;n<r;n++){let r=t[n];r.type===`inline`&&e.md.inline.parse(r.content,e.md,e.env,r.children)}}function at(e){return/^<a[>\s]/i.test(e)}function ot(e){return/^<\/a\s*>/i.test(e)}function st(e){let t=e.tokens;if(e.md.options.linkify)for(let n=0,r=t.length;n<r;n++){if(t[n].type!==`inline`||!e.md.linkify.test(t[n].content))continue;let r=t[n].children,i=[],a=0;for(let t=r.length-1;t>=0;t--){let n=r[t];if(n.type===`link_close`)for(t--;r[t].level!==n.level&&r[t].type!==`link_open`;)t--;else if(n.type===`html_inline`&&(at(n.content)&&a>0&&a--,ot(n.content)&&a++),!(a>0)&&n.type===`text`&&e.md.linkify.test(n.content)){let a=n.content,o=e.md.linkify.match(a),s=[],c=n.level,l=0;o.length>0&&o[0].index===0&&t>0&&r[t-1].type===`text_special`&&(o=o.slice(1));for(let t=0;t<o.length;t++){let n=o[t].url,r=e.md.normalizeLink(n);if(!e.md.validateLink(r))continue;let i=o[t].text;i=o[t].schema?o[t].schema===`mailto:`&&!/^mailto:/i.test(i)?e.md.normalizeLinkText(`mailto:${i}`).replace(/^mailto:/,``):e.md.normalizeLinkText(i):e.md.normalizeLinkText(`http://${i}`).replace(/^http:\/\//,``);let u=o[t].index;if(u>l){let t=new e.Token(`text`,``,0);t.content=a.slice(l,u),t.level=c,s.push(t)}let d=new e.Token(`link_open`,`a`,1);d.attrs=[[`href`,r]],d.level=c++,d.markup=`linkify`,d.info=`auto`,s.push(d);let f=new e.Token(`text`,``,0);f.content=i,f.level=c,s.push(f);let p=new e.Token(`link_close`,`a`,-1);p.level=--c,p.markup=`linkify`,p.info=`auto`,s.push(p),l=o[t].lastIndex}if(l<a.length){let t=new e.Token(`text`,``,0);t.content=a.slice(l),t.level=c,s.push(t)}i.push({index:t,nodes:s})}}if(i.length>0){let e=r.length;for(let t of i)e+=t.nodes.length-1;let a=Array(e),o=0,s=0;i.reverse();for(let e=0;e<r.length;e++){let t=i[o];if((t==null?void 0:t.index)===e){for(let e of t.nodes)a[s++]=e;o++}else a[s++]=r[e]}t[n].children=a}}}var ct=/\+-|\.\.|\?\?\?\?|!!!!|,,|--/,lt=/\((c|tm|r)\)/i,ut=/\((c|tm|r)\)/gi,dt={c:`©`,r:`®`,tm:`™`};function ft(e,t){return dt[t.toLowerCase()]}function pt(e){let t=0;for(let n=e.length-1;n>=0;n--){let r=e[n];r.type===`text`&&!t&&(r.content=r.content.replace(ut,ft)),r.type===`link_open`&&r.info===`auto`&&t--,r.type===`link_close`&&r.info===`auto`&&t++}}function mt(e){let t=0;for(let n=e.length-1;n>=0;n--){let r=e[n];r.type===`text`&&!t&&ct.test(r.content)&&(r.content=r.content.replace(/\+-/g,`±`).replace(/\.{2,}/g,`…`).replace(/([?!])…/g,`$1..`).replace(/([?!]){4,}/g,`$1$1$1`).replace(/,{2,}/g,`,`).replace(/(^|[^-])---(?=[^-]|$)/gm,`$1—`).replace(/(^|\s)--(?=\s|$)/gm,`$1–`).replace(/(^|[^-\s])--(?=[^-\s]|$)/gm,`$1–`)),r.type===`link_open`&&r.info===`auto`&&t--,r.type===`link_close`&&r.info===`auto`&&t++}}function ht(e){let t;if(e.md.options.typographer)for(t=e.tokens.length-1;t>=0;t--)e.tokens[t].type===`inline`&&(lt.test(e.tokens[t].content)&&pt(e.tokens[t].children),ct.test(e.tokens[t].content)&&mt(e.tokens[t].children))}var gt=/['"]/,_t=/['"]/g,vt=`’`,yt=1e3;function bt(e,t,n){for(;e.length>n;){let n=e.pop();n.isSingleQuote?t.single=n.prevSameQuoteIdx:t.double=n.prevSameQuoteIdx}}function H(e,t,n,r){e[t]||(e[t]=[]),e[t].push({pos:n,ch:r})}function xt(e,t){let n=``,r=0;t.sort((e,t)=>e.pos-t.pos);for(let i=0;i<t.length;i++){let a=t[i];n+=e.slice(r,a.pos)+a.ch,r=a.pos+1}return n+e.slice(r)}function St(e,t){let n,r=[],i={single:-1,double:-1},a={};for(let o=0;o<e.length;o++){let s=e[o],c=e[o].level;for(n=r.length-1;n>=0&&!(r[n].level<=c);n--);if(bt(r,i,n+1),s.type!==`text`)continue;let l=s.content,u=0,d=l.length;OUTER:for(;u<d;){_t.lastIndex=u;let s=_t.exec(l);if(!s)break;let f=!0,p=!0;u=s.index+1;let m=s[0]===`'`,h=32;if(s.index-1>=0)h=l.charCodeAt(s.index-1);else for(n=o-1;n>=0&&e[n].type!==`softbreak`&&e[n].type!==`hardbreak`;n--)if(e[n].content){h=e[n].content.charCodeAt(e[n].content.length-1);break}let g=32;if(u<d)g=l.charCodeAt(u);else for(n=o+1;n<e.length&&e[n].type!==`softbreak`&&e[n].type!==`hardbreak`;n++)if(e[n].content){g=e[n].content.charCodeAt(0);break}let _=I(h)||F(h),v=I(g)||F(g),y=P(h),b=P(g);if(b?f=!1:v&&(y||_||(f=!1)),y?p=!1:_&&(b||v||(p=!1)),g===34&&s[0]===`"`&&h>=48&&h<=57&&(p=f=!1),f&&p&&(f=_,p=v),!f&&!p)m&&H(a,o,s.index,vt);else{if(p&&(n=m?i.single:i.double,n>=0&&r[n].level===c)){let e=r[n],c,l;m?(c=t.md.options.quotes[2],l=t.md.options.quotes[3]):(c=t.md.options.quotes[0],l=t.md.options.quotes[1]),H(a,o,s.index,l),H(a,e.tokenIdx,e.contentPos,c),bt(r,i,n);continue OUTER}if(f){if(r.length>=yt)return;r.push({tokenIdx:o,contentPos:s.index,isSingleQuote:m,level:c,prevSameQuoteIdx:m?i.single:i.double}),m?i.single=r.length-1:i.double=r.length-1}else p&&m&&H(a,o,s.index,vt)}}}Object.keys(a).forEach(function(t){let n=Number(t);e[n].content=xt(e[n].content,a[t])})}function Ct(e){if(e.md.options.typographer)for(let t=e.tokens.length-1;t>=0;t--)e.tokens[t].type===`inline`&&gt.test(e.tokens[t].content)&&St(e.tokens[t].children,e)}function wt(e){let t,n,r=e.length;for(t=0;t<r;t++)e[t].type===`text_special`&&(e[t].type=`text`);for(t=n=0;t<r;t++)e[t].type===`text`&&t+1<r&&e[t+1].type===`text`?e[t+1].content=e[t].content+e[t+1].content:(t!==n&&(e[n]=e[t]),n++);t!==n&&(e.length=n)}function Tt(e){let t,n,r=e.tokens,i=r.length;for(let e=0;e<i;e++){if(r[e].type!==`inline`)continue;let i=r[e].children,a=i.length;for(t=0;t<a;t++)i[t].type===`text_special`&&(i[t].type=`text`),i[t].children&&wt(i[t].children);for(t=n=0;t<a;t++)i[t].type===`text`&&t+1<a&&i[t+1].type===`text`?i[t+1].content=i[t].content+i[t+1].content:(t!==n&&(i[n]=i[t]),n++);t!==n&&(i.length=n)}}var Et=[[`normalize`,tt],[`block`,nt],[`strip_references`,rt],[`inline`,it],[`linkify`,st],[`replacements`,ht],[`smartquotes`,Ct],[`text_join`,Tt]],Dt=class{constructor(){D(this,`ruler`,new B),D(this,`State`,Qe);for(let e=0;e<Et.length;e++)this.ruler.push(Et[e][0],Et[e][1])}process(e){let t=this.ruler.getRules(``);for(let n=0,r=t.length;n<r;n++)t[n](e)}},Ot=class{constructor(e,t,n,r){D(this,`bMarks`,[]),D(this,`eMarks`,[]),D(this,`tShift`,[]),D(this,`sCount`,[]),D(this,`bsCount`,[]),D(this,`blkIndent`,0),D(this,`line`,0),D(this,`lineMax`,0),D(this,`tight`,!1),D(this,`listIndent`,-1),D(this,`parentType`,`root`),D(this,`level`,0),D(this,`Token`,z),this.src=e,this.md=t,this.env=n,this.tokens=r;let i=this.src;for(let e=0,t=0,n=0,r=0,a=i.length,o=!1;t<a;t++){let s=i.charCodeAt(t);if(!o){if(N(s)){n++,s===9?r+=4-r%4:r++;continue}o=!0}(s===10||t===a-1)&&(s!==10&&t++,this.bMarks.push(e),this.eMarks.push(t),this.tShift.push(n),this.sCount.push(r),this.bsCount.push(0),o=!1,n=0,r=0,e=t+1)}this.bMarks.push(i.length),this.eMarks.push(i.length),this.tShift.push(0),this.sCount.push(0),this.bsCount.push(0),this.lineMax=this.bMarks.length-1}push(e,t,n){let r=new z(e,t,n);return r.block=!0,n<0&&this.level--,r.level=this.level,n>0&&this.level++,this.tokens.push(r),r}isEmpty(e){return this.bMarks[e]+this.tShift[e]>=this.eMarks[e]}skipEmptyLines(e){for(let t=this.lineMax;e<t&&!(this.bMarks[e]+this.tShift[e]<this.eMarks[e]);e++);return e}skipSpaces(e){for(let t=this.src.length;e<t&&N(this.src.charCodeAt(e));e++);return e}skipSpacesBack(e,t){if(e<=t)return e;for(;e>t;)if(!N(this.src.charCodeAt(--e)))return e+1;return e}skipChars(e,t){for(let n=this.src.length;e<n&&this.src.charCodeAt(e)===t;e++);return e}skipCharsBack(e,t,n){if(e<=n)return e;for(;e>n;)if(t!==this.src.charCodeAt(--e))return e+1;return e}getLines(e,t,n,r){if(e>=t)return``;let i=Array(t-e);for(let a=0,o=e;o<t;o++,a++){let e=0,s=this.bMarks[o],c=s,l;for(l=o+1<t||r?this.eMarks[o]+1:this.eMarks[o];c<l&&e<n;){let t=this.src.charCodeAt(c);if(N(t))t===9?e+=4-(e+this.bsCount[o])%4:e++;else if(c-s<this.tShift[o])e++;else break;c++}e>n?i[a]=Array(e-n+1).join(` `)+this.src.slice(c,l):i[a]=this.src.slice(c,l)}return i.join(``)}},kt=65536;function At(e,t){let n=e.bMarks[t]+e.tShift[t],r=e.eMarks[t];return e.src.slice(n,r)}function jt(e){let t=[],n=e.length,r=0,i=e.charCodeAt(r),a=!1,o=0,s=``;for(;r<n;)i===124&&(a?(s+=e.substring(o,r-1),o=r):(t.push(s+e.substring(o,r)),s=``,o=r+1)),a=i===92,r++,i=e.charCodeAt(r);return t.push(s+e.substring(o)),t}function Mt(e,t,n,r){if(t+2>n)return!1;let i=t+1;if(e.sCount[i]<e.blkIndent||e.sCount[i]-e.blkIndent>=4)return!1;let a=e.bMarks[i]+e.tShift[i];if(a>=e.eMarks[i])return!1;let o=e.src.charCodeAt(a++);if(o!==124&&o!==45&&o!==58||a>=e.eMarks[i])return!1;let s=e.src.charCodeAt(a++);if(s!==124&&s!==45&&s!==58&&!N(s)||o===45&&N(s))return!1;for(;a<e.eMarks[i];){let t=e.src.charCodeAt(a);if(t!==124&&t!==45&&t!==58&&!N(t))return!1;a++}let c=At(e,t+1),l=c.split(`|`),u=[];for(let e=0;e<l.length;e++){let t=l[e].trim();if(!t){if(e===0||e===l.length-1)continue;return!1}if(!/^:?-+:?$/.test(t))return!1;t.charCodeAt(t.length-1)===58?u.push(t.charCodeAt(0)===58?`center`:`right`):t.charCodeAt(0)===58?u.push(`left`):u.push(``)}if(c=At(e,t).trim(),c.indexOf(`|`)===-1||e.sCount[t]-e.blkIndent>=4)return!1;l=jt(c),l.length&&l[0]===``&&l.shift(),l.length&&l[l.length-1]===``&&l.pop();let d=l.length;if(d===0||d!==u.length)return!1;if(r)return!0;let f=e.parentType;e.parentType=`table`;let p=e.md.block.ruler.getRules(`blockquote`),m=e.push(`table_open`,`table`,1),h=[t,0];m.map=h;let g=e.push(`thead_open`,`thead`,1);g.map=[t,t+1];let _=e.push(`tr_open`,`tr`,1);_.map=[t,t+1];for(let t=0;t<l.length;t++){let n=e.push(`th_open`,`th`,1);u[t]&&(n.attrs=[[`style`,`text-align:${u[t]}`]]);let r=e.push(`inline`,``,0);r.content=l[t].trim(),r.children=[],e.push(`th_close`,`th`,-1)}e.push(`tr_close`,`tr`,-1),e.push(`thead_close`,`thead`,-1);let v,y=0;for(i=t+2;i<n&&!(e.sCount[i]<e.blkIndent);i++){let r=!1;for(let t=0,a=p.length;t<a;t++)if(p[t](e,i,n,!0)){r=!0;break}if(r||(c=At(e,i).trim(),!c)||e.sCount[i]-e.blkIndent>=4||(l=jt(c),l.length&&l[0]===``&&l.shift(),l.length&&l[l.length-1]===``&&l.pop(),y+=d-l.length,y>kt))break;if(i===t+2){let n=e.push(`tbody_open`,`tbody`,1);n.map=v=[t+2,0]}let a=e.push(`tr_open`,`tr`,1);a.map=[i,i+1];for(let t=0;t<d;t++){let n=e.push(`td_open`,`td`,1);u[t]&&(n.attrs=[[`style`,`text-align:${u[t]}`]]);let r=e.push(`inline`,``,0);r.content=l[t]?l[t].trim():``,r.children=[],e.push(`td_close`,`td`,-1)}e.push(`tr_close`,`tr`,-1)}return v&&(e.push(`tbody_close`,`tbody`,-1),v[1]=i),e.push(`table_close`,`table`,-1),h[1]=i,e.parentType=f,e.line=i,!0}function Nt(e,t,n){if(e.sCount[t]-e.blkIndent<4)return!1;let r=t+1,i=r;for(;r<n;)if(e.isEmpty(r))r++;else if(e.sCount[r]-e.blkIndent>=4)r++,i=r;else break;e.line=i;let a=e.push(`code_block`,`code`,0);return a.content=e.getLines(t,i,4+e.blkIndent,!1)+`
`,a.map=[t,e.line],!0}function Pt(e,t,n,r){let i=e.bMarks[t]+e.tShift[t],a=e.eMarks[t];if(e.sCount[t]-e.blkIndent>=4||i+3>a)return!1;let o=e.src.charCodeAt(i);if(o!==126&&o!==96)return!1;let s=i;i=e.skipChars(i,o);let c=i-s;if(c<3)return!1;let l=e.src.slice(s,i),u=e.src.slice(i,a);if(o===96&&u.indexOf(String.fromCharCode(o))>=0)return!1;if(r)return!0;let d=t,f=!1;for(;d++,!(d>=n||(i=s=e.bMarks[d]+e.tShift[d],a=e.eMarks[d],i<a&&e.sCount[d]<e.blkIndent));)if(e.src.charCodeAt(i)===o&&!(e.sCount[d]-e.blkIndent>=4)&&(i=e.skipChars(i,o),!(i-s<c)&&(i=e.skipSpaces(i),!(i<a)))){f=!0;break}c=e.sCount[t],e.line=d+ +!!f;let p=e.push(`fence`,`code`,0);return p.info=u,p.content=e.getLines(t+1,d,c,!0),p.markup=l,p.map=[t,e.line],!0}function Ft(e,t,n,r){let i=e.bMarks[t]+e.tShift[t],a=e.eMarks[t],o=e.lineMax;if(e.sCount[t]-e.blkIndent>=4||e.src.charCodeAt(i)!==62)return!1;if(r)return!0;let s=[],c=[],l=[],u=[],d=e.md.block.ruler.getRules(`blockquote`),f=e.parentType;e.parentType=`blockquote`;let p=!1,m;for(m=t;m<n;m++){let t=e.sCount[m]<e.blkIndent;if(i=e.bMarks[m]+e.tShift[m],a=e.eMarks[m],i>=a)break;if(e.src.charCodeAt(i++)===62&&!t){let t=e.sCount[m]+1,n,r;e.src.charCodeAt(i)===32?(i++,t++,r=!1,n=!0):e.src.charCodeAt(i)===9?(n=!0,(e.bsCount[m]+t)%4==3?(i++,t++,r=!1):r=!0):n=!1;let o=t;for(s.push(e.bMarks[m]),e.bMarks[m]=i;i<a;){let t=e.src.charCodeAt(i);if(N(t))t===9?o+=4-(o+e.bsCount[m]+ +!!r)%4:o++;else break;i++}p=i>=a,c.push(e.bsCount[m]),e.bsCount[m]=e.sCount[m]+1+ +!!n,l.push(e.sCount[m]),e.sCount[m]=o-t,u.push(e.tShift[m]),e.tShift[m]=i-e.bMarks[m];continue}if(p)break;let r=!1;for(let t=0,i=d.length;t<i;t++)if(d[t](e,m,n,!0)){r=!0;break}if(r){e.lineMax=m,e.blkIndent!==0&&(s.push(e.bMarks[m]),c.push(e.bsCount[m]),u.push(e.tShift[m]),l.push(e.sCount[m]),e.sCount[m]-=e.blkIndent);break}s.push(e.bMarks[m]),c.push(e.bsCount[m]),u.push(e.tShift[m]),l.push(e.sCount[m]),e.sCount[m]=-1}let h=e.blkIndent;e.blkIndent=0;let g=e.push(`blockquote_open`,`blockquote`,1);g.markup=`>`;let _=[t,0];g.map=_,e.md.block.tokenize(e,t,m);let v=e.push(`blockquote_close`,`blockquote`,-1);v.markup=`>`,e.lineMax=o,e.parentType=f,_[1]=e.line;for(let n=0;n<u.length;n++)e.bMarks[n+t]=s[n],e.tShift[n+t]=u[n],e.sCount[n+t]=l[n],e.bsCount[n+t]=c[n];return e.blkIndent=h,!0}function It(e,t,n,r){let i=e.eMarks[t];if(e.sCount[t]-e.blkIndent>=4)return!1;let a=e.bMarks[t]+e.tShift[t],o=e.src.charCodeAt(a++);if(o!==42&&o!==45&&o!==95)return!1;let s=1;for(;a<i;){let t=e.src.charCodeAt(a++);if(t!==o&&!N(t))return!1;t===o&&s++}if(s<3)return!1;if(r)return!0;e.line=t+1;let c=e.push(`hr`,`hr`,0);return c.map=[t,e.line],c.markup=Array(s+1).join(String.fromCharCode(o)),!0}function Lt(e,t){let n=e.eMarks[t],r=e.bMarks[t]+e.tShift[t],i=e.src.charCodeAt(r++);return i!==42&&i!==45&&i!==43||r<n&&!N(e.src.charCodeAt(r))?-1:r}function Rt(e,t){let n=e.bMarks[t]+e.tShift[t],r=e.eMarks[t],i=n;if(i+1>=r)return-1;let a=e.src.charCodeAt(i++);if(a<48||a>57)return-1;for(;;){if(i>=r)return-1;if(a=e.src.charCodeAt(i++),a>=48&&a<=57){if(i-n>=10)return-1}else{if(a===41||a===46)break;return-1}}return i<r&&(a=e.src.charCodeAt(i),!N(a))?-1:i}function zt(e,t){let n=e.level+2;for(let r=t+2,i=e.tokens.length-2;r<i;r++)e.tokens[r].level===n&&e.tokens[r].type===`paragraph_open`&&(e.tokens[r+2].hidden=!0,e.tokens[r].hidden=!0,r+=2)}function Bt(e,t,n,r){let i,a,o,s,c=t,l=!0;if(e.sCount[c]-e.blkIndent>=4||e.listIndent>=0&&e.sCount[c]-e.listIndent>=4&&e.sCount[c]<e.blkIndent)return!1;let u=!1;r&&e.parentType===`paragraph`&&e.sCount[c]>=e.blkIndent&&(u=!0);let d,f,p;if((p=Rt(e,c))>=0){if(d=!0,o=e.bMarks[c]+e.tShift[c],f=Number(e.src.slice(o,p-1)),u&&f!==1)return!1}else if((p=Lt(e,c))>=0)d=!1;else return!1;if(u&&e.skipSpaces(p)>=e.eMarks[c])return!1;if(r)return!0;let m=e.src.charCodeAt(p-1),h=e.tokens.length;d?(s=e.push(`ordered_list_open`,`ol`,1),f!==1&&(s.attrs=[[`start`,f]])):s=e.push(`bullet_list_open`,`ul`,1);let g=[c,0];s.map=g,s.markup=String.fromCharCode(m);let _=!1,v=e.md.block.ruler.getRules(`list`),y=e.parentType;for(e.parentType=`list`;c<n;){a=p,i=e.eMarks[c];let t=e.sCount[c]+p-(e.bMarks[c]+e.tShift[c]),r=t;for(;a<i;){let t=e.src.charCodeAt(a);if(t===9)r+=4-(r+e.bsCount[c])%4;else if(t===32)r++;else break;a++}let u=a,f;f=u>=i?1:r-t,f>4&&(f=1);let h=t+f;s=e.push(`list_item_open`,`li`,1),s.markup=String.fromCharCode(m);let g=[c,0];s.map=g,d&&(s.info=e.src.slice(o,p-1));let y=e.tight,b=e.tShift[c],x=e.sCount[c],S=e.listIndent;if(e.listIndent=e.blkIndent,e.blkIndent=h,e.tight=!0,e.tShift[c]=u-e.bMarks[c],e.sCount[c]=r,u>=i&&e.isEmpty(c+1)?e.line=Math.min(e.line+2,n):e.md.block.tokenize(e,c,n),(!e.tight||_)&&(l=!1),_=e.line-c>1&&e.isEmpty(e.line-1),e.blkIndent=e.listIndent,e.listIndent=S,e.tShift[c]=b,e.sCount[c]=x,e.tight=y,s=e.push(`list_item_close`,`li`,-1),s.markup=String.fromCharCode(m),c=e.line,g[1]=c,c>=n||e.sCount[c]<e.blkIndent||e.sCount[c]-e.blkIndent>=4)break;let C=!1;for(let t=0,r=v.length;t<r;t++)if(v[t](e,c,n,!0)){C=!0;break}if(C)break;if(d){if(p=Rt(e,c),p<0)break;o=e.bMarks[c]+e.tShift[c]}else if(p=Lt(e,c),p<0)break;if(m!==e.src.charCodeAt(p-1))break}return s=d?e.push(`ordered_list_close`,`ol`,-1):e.push(`bullet_list_close`,`ul`,-1),s.markup=String.fromCharCode(m),g[1]=c,e.line=c,e.parentType=y,l&&zt(e,h),!0}var Vt=999;function Ht(e){let t=e.length;for(let n=0;n<e.length-1;n++){let r=e.charCodeAt(n);if(r<55296||r>56319)continue;let i=e.charCodeAt(n+1);i>=56320&&i<=57343&&(t--,n++)}return t}function U(e,t){return Math.min(e.eMarks[t]+1,e.src.length)}function W(e,t){let n=e.lineMax;if(t>=n||e.isEmpty(t))return-1;let r=!1;if(e.sCount[t]-e.blkIndent>3&&(r=!0),e.sCount[t]<0&&(r=!0),!r){let r=e.md.block.ruler.getRules(`reference`),i=e.parentType;e.parentType=`reference`;let a=!1;for(let i=0,o=r.length;i<o;i++)if(r[i](e,t,n,!0)){a=!0;break}if(e.parentType=i,a)return-1}return e.bMarks[t]+e.tShift[t]}function Ut(e,t,n,r){let i=e.src,a=e.bMarks[t]+e.tShift[t],o=t+1;if(e.sCount[t]-e.blkIndent>=4||i.charCodeAt(a)!==91)return!1;let s=U(e,t),c=``,l=-1,u=++a;for(;a<s;){if(c.length+a-u>Vt*2)return!1;let t=i.charCodeAt(a);if(t===91)return!1;if(t===93){l=a;break}if(t===92&&(t=i.charCodeAt(++a)),t===10&&a<s){let t=W(e,o);if(t<0)return!1;c+=i.slice(u,s),a=u=t,s=U(e,o++)}else a++}if(l<0||i.charCodeAt(l+1)!==58||(c+=i.slice(u,l),c.length>Vt&&Ht(c)>Vt))return!1;for(a=l+2;a<s;){let t=i.charCodeAt(a);if(t===10){let t=W(e,o);if(t<0)break;a=t,s=U(e,o++)}else if(N(t))a++;else break}let d=e.md.helpers.parseLinkDestination(i,a,s);if(!d.ok)return!1;let f=e.md.normalizeLink(d.str);if(!e.md.validateLink(f))return!1;a=d.pos;let p=a,m=s,h=o;for(;a<s;){let t=i.charCodeAt(a);if(t===10){let t=W(e,o);if(t<0)break;a=t,s=U(e,o++)}else if(N(t))a++;else break}let g=a,_=e.md.helpers.parseLinkTitle(i,a,s);for(;_.can_continue;){let t=W(e,o);if(t<0)break;a=t,s=U(e,o++),_=e.md.helpers.parseLinkTitle(i,a,s,_)}let v;for(g!==p&&_.ok?(v=_.str,a=_.pos):(v=``,a=p,s=m,o=h);a<s&&N(i.charCodeAt(a));)a++;if(a<s&&i.charCodeAt(a)!==10&&v)for(v=``,a=p,s=m,o=h;a<s&&N(i.charCodeAt(a));)a++;if(a<s&&i.charCodeAt(a)!==10)return!1;let y=L(c);if(!y)return!1;if(r)return!0;e.env.references===void 0&&(e.env.references={}),e.env.references[y]===void 0&&(e.env.references[y]={title:v,href:f});let b=e.push(`reference_definition`,``,0);b.map=[t,o],b.hidden=!0;let x=Object.create(null);return x.label=y,b.meta=x,e.line=o,!0}var Wt=`address.article.aside.base.basefont.blockquote.body.caption.center.col.colgroup.dd.details.dialog.dir.div.dl.dt.fieldset.figcaption.figure.footer.form.frame.frameset.h1.h2.h3.h4.h5.h6.head.header.hr.html.iframe.legend.li.link.main.menu.menuitem.nav.noframes.ol.optgroup.option.p.param.search.section.summary.table.tbody.td.tfoot.th.thead.title.tr.track.ul`.split(`.`),Gt=`<[A-Za-z][A-Za-z0-9\\-]*(?:\\s+[a-zA-Z_:][a-zA-Z0-9:._-]*(?:\\s*=\\s*(?:[^"'=<>\`\\x00-\\x20]+|'[^']*'|"[^"]*"))?)*\\s*\\/?>`,Kt=`<\\/[A-Za-z][A-Za-z0-9\\-]*\\s*>`;RegExp(`^(?:${Gt}|${Kt}|\x3c!---?>|\x3c!--(?:[^-]|-[^-]|--[^>])*-->|<[?][\\s\\S]*?[?]>|<![A-Za-z][^>]*>|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>)`);var qt=RegExp(`^(?:${Gt}|${Kt})`),G=[[/^<(script|pre|style|textarea)(?=(\s|>|$))/i,/<\/(script|pre|style|textarea)>/i,!0],[/^\x3c!--/,/-->/,!0],[/^<\?/,/\?>/,!0],[/^<![A-Za-z]/,/>/,!0],[/^<!\[CDATA\[/,/\]\]>/,!0],[RegExp(`^</?(${Wt.join(`|`)})(?=(\\s|/?>|$))`,`i`),/^$/,!0],[RegExp(`${qt.source}\\s*$`),/^$/,!1]];function Jt(e,t,n,r){let i=e.bMarks[t]+e.tShift[t],a=e.eMarks[t];if(e.sCount[t]-e.blkIndent>=4||!e.md.options.html||e.src.charCodeAt(i)!==60)return!1;let o=e.src.slice(i,a),s=0;for(;s<G.length&&!G[s][0].test(o);s++);if(s===G.length)return!1;if(r)return G[s][2];let c=t+1,l=G[s][1].test(``);if(!G[s][1].test(o)){for(;c<n&&!(e.sCount[c]<e.blkIndent&&(l||!e.isEmpty(c)));c++)if(i=e.bMarks[c]+e.tShift[c],a=e.eMarks[c],o=e.src.slice(i,a),G[s][1].test(o)){o.length!==0&&c++;break}}e.line=c;let u=e.push(`html_block`,``,0);return u.map=[t,c],u.content=e.getLines(t,c,e.blkIndent,!0),!0}function Yt(e,t,n,r){let i=e.bMarks[t]+e.tShift[t],a=e.eMarks[t];if(e.sCount[t]-e.blkIndent>=4)return!1;let o=e.src.charCodeAt(i);if(o!==35||i>=a)return!1;let s=1;for(o=e.src.charCodeAt(++i);o===35&&i<a&&s<=6;)s++,o=e.src.charCodeAt(++i);if(s>6||i<a&&!N(o))return!1;if(r)return!0;a=e.skipSpacesBack(a,i);let c=e.skipCharsBack(a,35,i);c>i&&N(e.src.charCodeAt(c-1))&&(a=c),e.line=t+1;let l=e.push(`heading_open`,`h${s}`,1);l.markup=`########`.slice(0,s),l.map=[t,e.line];let u=e.push(`inline`,``,0);u.content=R(e.src.slice(i,a)),u.map=[t,e.line],u.children=[];let d=e.push(`heading_close`,`h${s}`,-1);return d.markup=`########`.slice(0,s),!0}function Xt(e,t,n){let r=e.md.block.ruler.getRules(`paragraph`);if(e.sCount[t]-e.blkIndent>=4)return!1;let i=e.parentType;e.parentType=`paragraph`;let a=0,o,s=t+1;for(;s<n&&!e.isEmpty(s);s++){if(e.sCount[s]-e.blkIndent>3)continue;if(e.sCount[s]>=e.blkIndent){let t=e.bMarks[s]+e.tShift[s],n=e.eMarks[s];if(t<n&&(o=e.src.charCodeAt(t),(o===45||o===61)&&(t=e.skipChars(t,o),t=e.skipSpaces(t),t>=n))){a=o===61?1:2;break}}if(e.sCount[s]<0)continue;let t=!1;for(let i=0,a=r.length;i<a;i++)if(r[i](e,s,n,!0)){t=!0;break}if(t)break}if(!a)return e.parentType=i,!1;let c=R(e.getLines(t,s,e.blkIndent,!1));e.line=s+1;let l=e.push(`heading_open`,`h${a}`,1);l.markup=String.fromCharCode(o),l.map=[t,e.line];let u=e.push(`inline`,``,0);u.content=c,u.map=[t,e.line-1],u.children=[];let d=e.push(`heading_close`,`h${a}`,-1);return d.markup=String.fromCharCode(o),e.parentType=i,!0}function Zt(e,t,n){let r=e.md.block.ruler.getRules(`paragraph`),i=e.parentType,a=t+1;for(e.parentType=`paragraph`;a<n&&!e.isEmpty(a);a++){if(e.sCount[a]-e.blkIndent>3||e.sCount[a]<0)continue;let t=!1;for(let i=0,o=r.length;i<o;i++)if(r[i](e,a,n,!0)){t=!0;break}if(t)break}let o=R(e.getLines(t,a,e.blkIndent,!1));e.line=a;let s=e.push(`paragraph_open`,`p`,1);s.map=[t,e.line];let c=e.push(`inline`,``,0);return c.content=o,c.map=[t,e.line],c.children=[],e.push(`paragraph_close`,`p`,-1),e.parentType=i,!0}var K=[[`table`,Mt,[`paragraph`,`reference`]],[`code`,Nt],[`fence`,Pt,[`paragraph`,`reference`,`blockquote`,`list`]],[`blockquote`,Ft,[`paragraph`,`reference`,`blockquote`,`list`]],[`hr`,It,[`paragraph`,`reference`,`blockquote`,`list`]],[`list`,Bt,[`paragraph`,`reference`,`blockquote`]],[`reference`,Ut],[`html_block`,Jt,[`paragraph`,`reference`,`blockquote`]],[`heading`,Yt,[`paragraph`,`reference`,`blockquote`]],[`lheading`,Xt],[`paragraph`,Zt]],Qt=class{constructor(){D(this,`ruler`,new B),D(this,`State`,Ot);for(let e=0;e<K.length;e++)this.ruler.push(K[e][0],K[e][1],{alt:(K[e][2]||[]).slice()})}tokenize(e,t,n){let r=this.ruler.getRules(``),i=r.length,a=e.md.options.maxNesting,o=t,s=!1;for(;o<n&&(e.line=o=e.skipEmptyLines(o),!(o>=n||e.sCount[o]<e.blkIndent));){if(e.level>=a){e.line=n;break}let t=e.line,c=!1;for(let a=0;a<i;a++)if(c=r[a](e,o,n,!1),c){if(t>=e.line)throw Error(`block rule didn't increment state.line`);break}if(!c)throw Error(`none of the block rules matched`);e.tight=!s,e.isEmpty(e.line-1)&&(s=!0),o=e.line,o<n&&e.isEmpty(o)&&(s=!0,o++,e.line=o)}}parse(e,t,n,r){if(!e)return;let i=new this.State(e,t,n,r);this.tokenize(i,i.line,i.lineMax)}},$t=class{constructor(e,t,n,r){D(this,`pos`,0),D(this,`level`,0),D(this,`pending`,``),D(this,`pendingLevel`,0),D(this,`cache`,{}),D(this,`backticks`,{}),D(this,`backticksScanned`,!1),D(this,`skipHtmlSpecial`,!1),D(this,`linkLevel`,0),D(this,`delimiters`,[]),D(this,`_prev_delimiters`,[]),D(this,`Token`,z),this.src=e,this.env=n,this.md=t,this.tokens=r,this.tokens_meta=Array(r.length),this.posMax=this.src.length}pushPending(){let e=new z(`text`,``,0);return e.content=this.pending,e.level=this.pendingLevel,this.tokens.push(e),this.pending=``,e}push(e,t,n){this.pending&&this.pushPending();let r=new z(e,t,n),i;return n<0&&(this.level--,this.delimiters=this._prev_delimiters.pop()),r.level=this.level,n>0&&(this.level++,this._prev_delimiters.push(this.delimiters),this.delimiters=[],i={delimiters:this.delimiters}),this.pendingLevel=this.level,this.tokens.push(r),this.tokens_meta.push(i),r}scanDelims(e,t){let n=this.posMax,r=this.src.charCodeAt(e),i;if(e===0)i=32;else if(e===1)i=this.src.charCodeAt(0),(i&63488)==55296&&(i=65533);else if(i=this.src.charCodeAt(e-1),(i&64512)==56320){let t=this.src.charCodeAt(e-2);i=(t&64512)==55296?65536+(t-55296<<10)+(i-56320):65533}else(i&64512)==55296&&(i=65533);let a=e;for(;a<n&&this.src.charCodeAt(a)===r;)a++;let o=a-e,s=a<n?this.src.charCodeAt(a):32;if((s&64512)==55296){let e=this.src.charCodeAt(a+1);s=(e&64512)==56320?65536+(s-55296<<10)+(e-56320):65533}else(s&64512)==56320&&(s=65533);let c=I(i)||F(i),l=I(s)||F(s),u=P(i),d=P(s),f=!d&&(!l||u||c),p=!u&&(!c||d||l);return{can_open:f&&(t||!p||c),can_close:p&&(t||!f||l),length:o}}};function en(e){switch(e){case 10:case 33:case 35:case 36:case 37:case 38:case 42:case 43:case 45:case 58:case 60:case 61:case 62:case 64:case 91:case 92:case 93:case 94:case 95:case 96:case 123:case 125:case 126:return!0;default:return!1}}function tn(e,t){let n=e.pos;for(;n<e.posMax&&!en(e.src.charCodeAt(n));)n++;return n!==e.pos&&(t||(e.pending+=e.src.slice(e.pos,n)),e.pos=n,!0)}function nn(e){return e>=65&&e<=90||e>=97&&e<=122}function rn(e){return e>=65&&e<=90||e>=97&&e<=122||e>=48&&e<=57||e===43||e===45||e===46}function an(e,t){if(!e.md.options.linkify||e.linkLevel>0)return!1;let n=e.pos,r=e.posMax;if(n+3>r||e.src.charCodeAt(n)!==58||e.src.charCodeAt(n+1)!==47||e.src.charCodeAt(n+2)!==47)return!1;let i=n-Math.min(10,e.pending.length,n),a=n;for(;a>i&&rn(e.src.charCodeAt(a-1));)a--;if(a===n||!nn(e.src.charCodeAt(a)))return!1;let o=n-a,s=e.md.linkify.matchAtStart(e.src.slice(a));if(!s)return!1;let c=s.url;if(c.length<=o)return!1;let l=c.length;for(;l>0&&c.charCodeAt(l-1)===42;)l--;l!==c.length&&(c=c.slice(0,l));let u=e.md.normalizeLink(c);if(!e.md.validateLink(u))return!1;if(!t){e.pending=e.pending.slice(0,-o);let t=e.push(`link_open`,`a`,1);t.attrs=[[`href`,u]],t.markup=`linkify`,t.info=`auto`;let n=e.push(`text`,``,0);n.content=e.md.normalizeLinkText(c);let r=e.push(`link_close`,`a`,-1);r.markup=`linkify`,r.info=`auto`}return e.pos+=c.length-o,!0}function on(e,t){let n=e.pos;if(e.src.charCodeAt(n)!==10)return!1;let r=e.pending.length-1,i=e.posMax;if(!t){if(r>=0&&e.pending.charCodeAt(r)===32){if(r>=1&&e.pending.charCodeAt(r-1)===32){let t=r-1;for(;t>=1&&e.pending.charCodeAt(t-1)===32;)t--;e.pending=e.pending.slice(0,t),e.push(`hardbreak`,`br`,0)}else e.pending=e.pending.slice(0,-1),e.push(`softbreak`,`br`,0)}else e.push(`softbreak`,`br`,0)}for(n++;n<i&&N(e.src.charCodeAt(n));)n++;return e.pos=n,!0}var sn=[];for(let e=0;e<256;e++)sn.push(0);`\\!"#$%&'()*+,./:;<=>?@[]^_\`{|}~-`.split(``).forEach(function(e){sn[e.charCodeAt(0)]=1});function cn(e,t){let n=e.pos,r=e.posMax;if(e.src.charCodeAt(n)!==92||(n++,n>=r))return!1;let i=e.src.charCodeAt(n);if(i===10){for(t||e.push(`hardbreak`,`br`,0),n++;n<r&&(i=e.src.charCodeAt(n),N(i));)n++;return e.pos=n,!0}if(i===32){if(!t){let t=e.push(`text_special`,``,0);t.content=`\\`,t.markup=`\\`,t.info=`escape`}return e.pos=n,!0}let a=e.src[n];if(i>=55296&&i<=56319&&n+1<r){let t=e.src.charCodeAt(n+1);t>=56320&&t<=57343&&(a+=e.src[n+1],n++)}let o=`\\`+a;if(!t){let t=e.push(`text_special`,``,0);t.content=i<256&&sn[i]!==0?a:o,t.markup=o,t.info=`escape`}return e.pos=n+1,!0}function ln(e){let t={},n=0;for(;(n=e.indexOf("`",n))!==-1;){let r=n;for(;e.charCodeAt(++n)===96;);t[n-r]=r}return t}function un(e,t){var n;let r=e.pos;if(e.src.charCodeAt(r)!==96)return!1;let i=e.posMax,a=r+1;for(;a<i&&e.src.charCodeAt(a)===96;)a++;let o=e.src.slice(r,a),s=o.length;if(e.backticksScanned||(e.backticks=ln(e.src),e.backticksScanned=!0),((n=e.backticks[s])==null?-1:n)>=a){let n=a,r;for(;(r=e.src.indexOf("`",n))!==-1&&r<i;){for(n=r+1;e.src.charCodeAt(n)===96;)n++;if(n>i)break;if(n-r===s){if(!t){let t=e.push(`code_inline`,`code`,0);t.markup=o;let n=e.src.slice(a,r).replace(/\n/g,` `);n.startsWith(` `)&&n.endsWith(` `)&&/[^ ]/.test(n)&&(n=n.slice(1,-1)),t.content=n}return e.pos=n,!0}}}return t||(e.pending+=o),e.pos=a,!0}function dn(e,t){let n=e.pos,r=e.src.charCodeAt(n);if(t||r!==126)return!1;let i=e.scanDelims(e.pos,!0),a=i.length,o=String.fromCharCode(r);if(a<2)return!1;let s;a%2&&(s=e.push(`text`,``,0),s.content=o,a--);for(let t=0;t<a;t+=2)s=e.push(`text`,``,0),s.content=o+o,e.delimiters.push({marker:r,length:0,token:e.tokens.length-1,end:-1,open:i.can_open,close:i.can_close});return e.pos+=i.length,!0}function fn(e,t){let n,r=[],i=t.length;for(let a=0;a<i;a++){let i=t[a];if(i.marker!==126||i.end===-1)continue;let o=t[i.end];n=e.tokens[i.token],n.type=`s_open`,n.tag=`s`,n.nesting=1,n.markup=`~~`,n.content=``,n=e.tokens[o.token],n.type=`s_close`,n.tag=`s`,n.nesting=-1,n.markup=`~~`,n.content=``,e.tokens[o.token-1].type===`text`&&e.tokens[o.token-1].content===`~`&&r.push(o.token-1)}for(;r.length;){let t=r.pop(),i=t+1;for(;i<e.tokens.length&&e.tokens[i].type===`s_close`;)i++;i--,t!==i&&(n=e.tokens[i],e.tokens[i]=e.tokens[t],e.tokens[t]=n)}}function pn(e){let t=e.tokens_meta,n=e.tokens_meta.length;fn(e,e.delimiters);for(let i=0;i<n;i++){var r;let n=(r=t[i])==null?void 0:r.delimiters;n&&fn(e,n)}}var mn={tokenize:dn,postProcess:pn};function hn(e,t){let n=e.pos,r=e.src.charCodeAt(n);if(t||r!==95&&r!==42)return!1;let i=e.scanDelims(e.pos,r===42);for(let t=0;t<i.length;t++){let t=e.push(`text`,``,0);t.content=String.fromCharCode(r),e.delimiters.push({marker:r,length:i.length,token:e.tokens.length-1,end:-1,open:i.can_open,close:i.can_close})}return e.pos+=i.length,!0}function gn(e,t){let n=t.length;for(let r=n-1;r>=0;r--){let n=t[r];if(n.marker!==95&&n.marker!==42||n.end===-1)continue;let i=t[n.end],a=r>0&&t[r-1].end===n.end+1&&t[r-1].marker===n.marker&&t[r-1].token===n.token-1&&t[n.end+1].token===i.token+1,o=String.fromCharCode(n.marker),s=e.tokens[n.token];s.type=a?`strong_open`:`em_open`,s.tag=a?`strong`:`em`,s.nesting=1,s.markup=a?o+o:o,s.content=``;let c=e.tokens[i.token];c.type=a?`strong_close`:`em_close`,c.tag=a?`strong`:`em`,c.nesting=-1,c.markup=a?o+o:o,c.content=``,a&&(e.tokens[t[r-1].token].content=``,e.tokens[t[n.end+1].token].content=``,r--)}}function _n(e){let t=e.tokens_meta,n=e.tokens_meta.length;gn(e,e.delimiters);for(let i=0;i<n;i++){var r;let n=(r=t[i])==null?void 0:r.delimiters;n&&gn(e,n)}}var vn={tokenize:hn,postProcess:_n};function yn(e,t){let n,r,i,a,o=``,s=``,c=e.pos,l=!0;if(e.src.charCodeAt(e.pos)!==91)return!1;let u=e.pos,d=e.posMax,f=e.pos+1,p=e.md.helpers.parseLinkLabel(e,e.pos,!0);if(p<0)return!1;let m=p+1;if(m<d&&e.src.charCodeAt(m)===40){for(l=!1,m++;m<d&&(n=e.src.charCodeAt(m),N(n)||n===10);m++);if(m>=d)return!1;if(c=m,i=e.md.helpers.parseLinkDestination(e.src,m,e.posMax),i.ok){for(o=e.md.normalizeLink(i.str),e.md.validateLink(o)?m=i.pos:o=``,c=m;m<d&&(n=e.src.charCodeAt(m),N(n)||n===10);m++);if(i=e.md.helpers.parseLinkTitle(e.src,m,e.posMax),m<d&&c!==m&&i.ok)for(s=i.str,m=i.pos;m<d&&(n=e.src.charCodeAt(m),N(n)||n===10);m++);}(m>=d||e.src.charCodeAt(m)!==41)&&(l=!0),m++}if(l){if(e.env.references===void 0)return!1;if(m<d&&e.src.charCodeAt(m)===91?(c=m+1,m=e.md.helpers.parseLinkLabel(e,m),m>=0?r=e.src.slice(c,m++):m=p+1):m=p+1,r||(r=e.src.slice(f,p)),r=L(r),a=e.env.references[r],!a)return e.pos=u,!1;o=a.href,s=a.title}if(!t){e.pos=f,e.posMax=p;let t=e.push(`link_open`,`a`,1),n=[[`href`,o]];if(t.attrs=n,s&&n.push([`title`,s]),r){let e=Object.create(null);e.label=r,t.meta=e}e.linkLevel++,e.md.inline.tokenize(e),e.linkLevel--,e.push(`link_close`,`a`,-1)}return e.pos=m,e.posMax=d,!0}function bn(e,t){let n,r,i,a,o,s,c,l,u=``,d=e.pos,f=e.posMax;if(e.src.charCodeAt(e.pos)!==33||e.src.charCodeAt(e.pos+1)!==91)return!1;let p=e.pos+2,m=e.md.helpers.parseLinkLabel(e,e.pos+1,!1);if(m<0)return!1;if(a=m+1,a<f&&e.src.charCodeAt(a)===40){for(a++;a<f&&(n=e.src.charCodeAt(a),N(n)||n===10);a++);if(a>=f)return!1;for(l=a,s=e.md.helpers.parseLinkDestination(e.src,a,e.posMax),s.ok&&(u=e.md.normalizeLink(s.str),e.md.validateLink(u)?a=s.pos:u=``),l=a;a<f&&(n=e.src.charCodeAt(a),N(n)||n===10);a++);if(s=e.md.helpers.parseLinkTitle(e.src,a,e.posMax),a<f&&l!==a&&s.ok)for(c=s.str,a=s.pos;a<f&&(n=e.src.charCodeAt(a),N(n)||n===10);a++);else c=``;if(a>=f||e.src.charCodeAt(a)!==41)return e.pos=d,!1;a++}else{if(e.env.references===void 0)return!1;if(a<f&&e.src.charCodeAt(a)===91?(l=a+1,a=e.md.helpers.parseLinkLabel(e,a),a>=0?i=e.src.slice(l,a++):a=m+1):a=m+1,i||(i=e.src.slice(p,m)),i=L(i),o=e.env.references[i],!o)return e.pos=d,!1;u=o.href,c=o.title}if(!t){r=e.src.slice(p,m);let t=[];e.md.inline.parse(r,e.md,e.env,t);let n=e.push(`image`,`img`,0),a=[[`src`,u],[`alt`,``]];if(n.attrs=a,n.children=t,n.content=r,c&&a.push([`title`,c]),i){let e=Object.create(null);e.label=i,n.meta=e}}return e.pos=a,e.posMax=f,!0}var xn=/^([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)$/,Sn=/^([a-zA-Z][a-zA-Z0-9+.-]{1,31}):([^<>\x00-\x20]*)$/;function Cn(e,t){let n=e.pos;if(e.src.charCodeAt(n)!==60)return!1;let r=e.pos,i=e.posMax;for(;;){if(++n>=i)return!1;let t=e.src.charCodeAt(n);if(t===60)return!1;if(t===62)break}let a=e.src.slice(r+1,n);if(Sn.test(a)){let n=e.md.normalizeLink(a);if(!e.md.validateLink(n))return!1;if(!t){let t=e.push(`link_open`,`a`,1);t.attrs=[[`href`,n]],t.markup=`autolink`,t.info=`auto`;let r=e.push(`text`,``,0);r.content=e.md.normalizeLinkText(a);let i=e.push(`link_close`,`a`,-1);i.markup=`autolink`,i.info=`auto`}return e.pos+=a.length+2,!0}if(xn.test(a)){let n=e.md.normalizeLink(`mailto:${a}`);if(!e.md.validateLink(n))return!1;if(!t){let t=e.push(`link_open`,`a`,1);t.attrs=[[`href`,n]],t.markup=`autolink`,t.info=`auto`;let r=e.push(`text`,``,0);r.content=e.md.normalizeLinkText(a);let i=e.push(`link_close`,`a`,-1);i.markup=`autolink`,i.info=`auto`}return e.pos+=a.length+2,!0}return!1}function wn(e){return/^<a[>\s]/i.test(e)}function Tn(e){return/^<\/a\s*>/i.test(e)}function En(e){let t=e|32;return t>=97&&t<=122}function Dn(e,t){let n=e.src,r,i;if(n.startsWith(`\x3c!--`,t)){if(n.startsWith(`>`,t+4))return t+5;if(n.startsWith(`->`,t+4))return t+6;r=t+4,i=`-->`}else if(n.startsWith(`<![CDATA[`,t))r=t+9,i=`]]>`;else if(n.charCodeAt(t+1)===63)r=t+2,i=`?>`;else if(En(n.charCodeAt(t+2)))r=t+3,i=`>`;else return-1;if(e.skipHtmlSpecial)return-1;let a=n.indexOf(i,r);return a<0?(e.skipHtmlSpecial=!0,-1):a+i.length}function On(e,t){if(!e.md.options.html)return!1;let n=e.posMax,r=e.pos;if(e.src.charCodeAt(r)!==60||r+2>=n)return!1;let i,a=e.src.charCodeAt(r+1);if(a===33||a===63)i=Dn(e,r);else if(a===47||En(a)){let t=e.src.slice(r).match(qt);i=t?r+t[0].length:-1}else return!1;if(i<0)return!1;if(!t){let t=e.push(`html_inline`,``,0);t.content=e.src.slice(r,i),wn(t.content)&&e.linkLevel++,Tn(t.content)&&e.linkLevel--}return e.pos=i,!0}var kn=/^&#((?:x[a-f0-9]{1,6}|[0-9]{1,7}));/i,An=/^&([a-z][a-z0-9]{1,31});/i;function jn(e,t){let n=e.pos,r=e.posMax;if(e.src.charCodeAt(n)!==38||n+1>=r)return!1;if(e.src.charCodeAt(n+1)===35){let r=e.src.slice(n).match(kn);if(r){if(!t){let t=r[1][0].toLowerCase()===`x`?parseInt(r[1].slice(1),16):parseInt(r[1],10),n=e.push(`text_special`,``,0);n.content=Me(t)?A(t):A(65533),n.markup=r[0],n.info=`entity`}return e.pos+=r[0].length,!0}}else{let r=e.src.slice(n).match(An);if(r){let n=Oe(r[0]);if(n!==r[0]){if(!t){let t=e.push(`text_special`,``,0);t.content=n,t.markup=r[0],t.info=`entity`}return e.pos+=r[0].length,!0}}}return!1}function Mn(e){let t={},n=e.length;if(!n)return;let r=0,i=-2,a=[];for(let o=0;o<n;o++){let n=e[o];if(a.push(0),(e[r].marker!==n.marker||i!==n.token-1)&&(r=o),i=n.token,n.length=n.length||0,!n.close)continue;t.hasOwnProperty(n.marker)||(t[n.marker]=[-1,-1,-1,-1,-1,-1]);let s=t[n.marker][(n.open?3:0)+n.length%3],c=r-a[r]-1,l=c;for(;c>s;c-=a[c]+1){let t=e[c];if(t.marker===n.marker&&t.open&&t.end<0){let r=!1;if((t.close||n.open)&&(t.length+n.length)%3==0&&(t.length%3!=0||n.length%3!=0)&&(r=!0),!r){let r=c>0&&!e[c-1].open?a[c-1]+1:0;a[o]=o-c+r,a[c]=r,n.open=!1,t.end=o,t.close=!1,l=-1,i=-2;break}}}l!==-1&&(t[n.marker][(n.open?3:0)+(n.length||0)%3]=l)}}function Nn(e){let t=e.tokens_meta,n=e.tokens_meta.length;Mn(e.delimiters);for(let e=0;e<n;e++){var r;let n=(r=t[e])==null?void 0:r.delimiters;n&&Mn(n)}}function Pn(e){let t,n,r=0,i=e.tokens,a=e.tokens.length;for(t=n=0;t<a;t++)i[t].nesting<0&&r--,i[t].level=r,i[t].nesting>0&&r++,i[t].type===`text`&&t+1<a&&i[t+1].type===`text`?i[t+1].content=i[t].content+i[t+1].content:(t!==n&&(i[n]=i[t]),n++);t!==n&&(i.length=n)}var Fn=[[`text`,tn],[`linkify`,an],[`newline`,on],[`escape`,cn],[`backticks`,un],[`strikethrough`,mn.tokenize],[`emphasis`,vn.tokenize],[`link`,yn],[`image`,bn],[`autolink`,Cn],[`html_inline`,On],[`entity`,jn]],In=[[`balance_pairs`,Nn],[`strikethrough`,mn.postProcess],[`emphasis`,vn.postProcess],[`fragments_join`,Pn]],Ln=class{constructor(){D(this,`ruler`,new B),D(this,`ruler2`,new B),D(this,`State`,$t);for(let e=0;e<Fn.length;e++)this.ruler.push(Fn[e][0],Fn[e][1]);for(let e=0;e<In.length;e++)this.ruler2.push(In[e][0],In[e][1])}skipToken(e){let t=e.pos,n=this.ruler.getRules(``),r=n.length,i=e.md.options.maxNesting,a=e.cache;if(a[t]!==void 0){e.pos=a[t];return}let o=!1;if(e.level<i){for(let i=0;i<r;i++)if(e.level++,o=n[i](e,!0),e.level--,o){if(t>=e.pos)throw Error(`inline rule didn't increment state.pos`);break}}else e.pos=e.posMax;o||e.pos++,a[t]=e.pos}tokenize(e){let t=this.ruler.getRules(``),n=t.length,r=e.posMax,i=e.md.options.maxNesting;for(;e.pos<r;){let a=e.pos,o=!1;if(e.level<i){for(let r=0;r<n;r++)if(o=t[r](e,!1),o){if(a>=e.pos)throw Error(`inline rule didn't increment state.pos`);break}}if(o){if(e.pos>=r)break}else e.pending+=e.src[e.pos++]}e.pending&&e.pushPending()}parse(e,t,n,r){let i=new this.State(e,t,n,r);this.tokenize(i);let a=this.ruler2.getRules(``),o=a.length;for(let e=0;e<o;e++)a[e](i)}};function Rn(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function q(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?Rn(Object(n),!0).forEach(function(t){D(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Rn(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function zn(e,t){if(e==null)return{};var n={};for(var r in e)if({}.hasOwnProperty.call(e,r)){if(t.includes(r))continue;n[r]=e[r]}return n}function Bn(e,t){if(e==null)return{};var n,r,i=zn(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.includes(n)||{}.propertyIsEnumerable.call(e,n)&&(i[n]=e[n])}return i}var Vn=[`rebuilder`],Hn=class{constructor(e={}){D(this,`src_Any`,C.source),D(this,`src_Cc`,ee.source),D(this,`src_Z`,ie.source),D(this,`src_P`,ne.source),D(this,`src_ZPCc`,[this.src_Z,this.src_P,this.src_Cc].join(`|`)),D(this,`src_ZCc`,[this.src_Z,this.src_Cc].join(`|`)),D(this,`cache`,{}),D(this,`opts`,{maxLength:1e4,urlAuth:!1,schema_names:[]}),this.opts=q(q({},this.opts),e)}set(e={}){return this.opts=q(q({},this.opts),e),this.cache={},this}escapeRE(e){return e.replace(/[.?*+^$[\]\\(){}|-]/g,`\\$&`)}nestedPairRE(e,t,n=4){let r=this.escapeRE(e),i=this.escapeRE(t),a=`(?:(?!${this.src_ZCc}|${r}|${i}).)`,o=`${r}${a}{0,1000}${i}`;for(let e=2;e<=n;e++)o=`${r}(?:${a}|${o}){0,1000}${i}`;return o}get_text_separators(){var e,t;return(t=(e=this.cache).text_separators)==null?e.text_separators=/[><\uff5c]/:t}get_pseudo_letter(){var e,t;return(t=(e=this.cache).src_pseudo_letter)==null?e.src_pseudo_letter=RegExp(`(?:(?!${this.get_text_separators().source}|${this.src_ZPCc})${this.src_Any})`):t}get_ipv4_addr(){var e,t;return(t=(e=this.cache).src_ip4)==null?e.src_ip4=RegExp(`(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])[.]){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])`):t}get_ipv6_addr(){var e,t;let n=`[0-9A-Fa-f]{1,4}`,r=`(?:(?:${n}:${n})|${this.get_ipv4_addr().source})`;return(t=(e=this.cache).src_ip6_addr)==null?e.src_ip6_addr=RegExp(`(?:(?:${n}:){6}${r}|::(?:${n}:){5}${r}|(?:${n})?::(?:${n}:){4}${r}|(?:(?:${n}:){0,1}${n})?::(?:${n}:){3}${r}|(?:(?:${n}:){0,2}${n})?::(?:${n}:){2}${r}|(?:(?:${n}:){0,3}${n})?::${n}:${r}|(?:(?:${n}:){0,4}${n})?::${r}|(?:(?:${n}:){0,5}${n})?::${n}|(?:(?:${n}:){0,6}${n})?::)`):t}get_ipv6_url_host(){var e,t;return(t=(e=this.cache).src_ip6_host)==null?e.src_ip6_host=RegExp(`\\[${this.get_ipv6_addr().source}\\]`):t}get_ipv6_mail_host(){var e,t;return(t=(e=this.cache).src_ipv6_mail_host)==null?e.src_ipv6_mail_host=RegExp(`\\[IPv6:${this.get_ipv6_addr().source}\\]`):t}get_auth(){var e,t;return(t=(e=this.cache).src_auth)==null?e.src_auth=RegExp(`(?:(?:(?!${this.src_ZCc}|[@/\\[\\]()]).){1,50}@)?`):t}get_port(){var e,t;return(t=(e=this.cache).src_port)==null?e.src_port=RegExp(`(?::(?:6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5])))|[1-5]?\\d{1,4}))?`):t}get_host_terminator(){var e,t;return(t=(e=this.cache).src_host_terminator)==null?e.src_host_terminator=RegExp(`(?=$|${this.get_text_separators().source}|${this.src_ZPCc})(?!${this.opts[`---`]?`-(?!--)|`:`-|`}_|:\\d|\\.-|\\.(?!$|${this.src_ZPCc}))`):t}get_path_terminator(){var e,t;return(t=(e=this.cache).src_path_terminator)==null?e.src_path_terminator=RegExp(`${this.src_ZPCc}|${this.get_text_separators().source}`):t}get_path(){var e,t;return(t=(e=this.cache).src_path)==null?e.src_path=RegExp(`(?:[/?#](?:${this.nestedPairRE(`[`,`]`)}|${this.nestedPairRE(`(`,`)`)}|${this.nestedPairRE(`{`,`}`)}|\\"(?:(?!${this.src_ZCc}|["]).){1,100}\\"|\\'(?:(?!${this.src_ZCc}|[']).){1,100}\\'|\\'(?=${this.get_pseudo_letter().source}|[-])|\\.{2,20}[:]?[a-zA-Z0-9%/&]|\\.(?!${this.src_ZCc}|[.]|$)|`+(this.opts[`---`]?`\\-(?!--(?:[^-]|$))(?:-{0,19})|`:`\\-{1,20}|`)+`,(?!${this.src_ZCc}|$)|;(?!${this.src_ZCc}|$)|\\!{1,20}(?!${this.src_ZCc}|[!]|$)|\\?(?!${this.src_ZCc}|[?]|$)|`+this.get_path_extra().source+`[\\\\/:%@#&=_~*]|(?!${this.get_path_terminator().source}).){1,${this.opts.maxLength}}|\\/)?`):t}get_mail_name(){var e,t;return(t=(e=this.cache).src_mail_name)==null?e.src_mail_name=RegExp("[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9](?:[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9]|[.](?=[-!#$%&'*+/=?^_`{|}~a-zA-Z0-9])){0,63}"):t}get_xn(){var e,t;return(t=(e=this.cache).src_xn)==null?e.src_xn=RegExp(`xn--[a-z0-9\\-]{1,59}`):t}get_tld(){if(this.cache.tld)return this.cache.tld;let e=[...new Set(this.opts.tlds||[])].sort().reverse().join(`|`);return this.cache.tld=RegExp(`${e||`$#none#$`}|${this.get_xn().source}`),this.cache.tld}get_domain_root(){var e,t;return(t=(e=this.cache).src_domain_root)==null?e.src_domain_root=RegExp(`(?:`+this.get_xn().source+`|${this.get_pseudo_letter().source}{1,63})`):t}get_domain(){var e,t;return(t=(e=this.cache).src_domain)==null?e.src_domain=RegExp(`(?:`+this.get_xn().source+`|(?:${this.get_pseudo_letter().source})|(?:${this.get_pseudo_letter().source}(?:-|${this.get_pseudo_letter().source}){0,61}${this.get_pseudo_letter().source}))`):t}get_url_host_port(){var e,t;return(t=(e=this.cache).url_host_port)==null?e.url_host_port=RegExp(`(?:`+this.get_ipv6_url_host().source+`|(?:(?:(?:${this.get_domain().source})\\.){0,10}${this.get_domain().source}))`+this.get_port().source+this.get_host_terminator().source):t}get_fuzzy_url_host_port(){var e,t;return(t=(e=this.cache).fuzzy_url_host_port)==null?e.fuzzy_url_host_port=RegExp(`(?:`+(this.opts.fuzzyIP?this.get_ipv4_addr().source+`|`:``)+`(?:(?:(?:${this.get_domain().source})\\.){1,10}(?:${this.get_tld().source})))`+this.get_host_terminator().source):t}get_mail_host(){var e,t;return(t=(e=this.cache).src_mail_host)==null?e.src_mail_host=RegExp(`(?:`+this.get_ipv6_mail_host().source+`|(?:(?:(?:${this.get_domain().source})\\.){0,4}${this.get_domain().source}))`+this.get_host_terminator().source):t}get_fuzzy_mail_host(){var e,t;return(t=(e=this.cache).src_fuzzy_mail_host)==null?e.src_fuzzy_mail_host=RegExp(`(?:`+this.get_ipv6_mail_host().source+`|(?:(?:(?:${this.get_domain().source})[.]){1,4}${this.get_domain_root().source}))`+this.get_host_terminator().source):t}get_path_extra(){var e,t;return(t=(e=this.cache).src_path_extra)==null?e.src_path_extra=RegExp(``):t}get_fuzzy_mail_host_search(){var e,t;return(t=(e=this.cache).mail_fuzzy_host_search)==null?e.mail_fuzzy_host_search=RegExp(`@${this.get_fuzzy_mail_host().source}`,`ig`):t}get_fuzzy_link_search(){var e,t;return(t=(e=this.cache).link_fuzzy_search)==null?e.link_fuzzy_search=RegExp(`(^|(?![.:/\\-_@])(?:[$+<=>^\`|\uff5c]|${this.src_ZPCc}))(?:(?![$+<=>^\`|\uff5c])${this.get_fuzzy_url_host_port().source}${this.get_path().source})`,`ig`):t}get_http_validator(){var e,t;return(t=(e=this.cache).http_validator)==null?e.http_validator=RegExp(`\\/\\/`+(this.opts.urlAuth?this.get_auth().source:``)+this.get_url_host_port().source+this.get_path().source,`iy`):t}get_relative_proto_validator(){var e,t;return(t=(e=this.cache).relative_proto_validator)==null?e.relative_proto_validator=RegExp((this.opts.urlAuth?this.get_auth().source:``)+`(?:localhost|${this.get_ipv6_url_host().source}|(?:(?:${this.get_domain().source})[.]){1,10}${this.get_domain_root().source})`+this.get_port().source+this.get_host_terminator().source+this.get_path().source,`iy`):t}get_mail_name_validator(){var e,t;return(t=(e=this.cache).mail_name_validator)==null?e.mail_name_validator=RegExp(`(?:^|${this.get_text_separators().source}|"|\\(|${this.src_ZCc})(${this.get_mail_name().source})$`):t}get_mailto_validator(){var e,t;return(t=(e=this.cache).mailto_validator)==null?e.mailto_validator=RegExp(`${this.get_mail_name().source}@${this.get_mail_host().source}`,`iy`):t}get_schema_names(){var e,t;return(t=(e=this.cache).schema_names)==null?e.schema_names=new RegExp((this.opts.schema_names||[]).map(e=>this.escapeRE(e)).join(`|`)):t}get_schema_search(){var e,t;return(t=(e=this.cache).schema_search)==null?e.schema_search=RegExp(`(^|(?!_)(?:[><\uff5c]|${this.src_ZPCc}))(${this.get_schema_names().source})`,`ig`):t}get_schema_at_start(){var e,t;return(t=(e=this.cache).schema_at_start)==null?e.schema_at_start=RegExp(`^${this.get_schema_search().source}`,`i`):t}},Un={validate:(e,t,n)=>{let r=n.re.get_http_validator();r.lastIndex=t;let i=r.exec(e);return i?i[0].length:0},normalize:(e,t)=>t.normalize(e)},Wn={"http:":Un,"https:":Un,"ftp:":Un,"//":{validate:function(e,t,n){let r=n.re.get_relative_proto_validator();r.lastIndex=t;let i=r.exec(e);return i?t>=3&&e[t-3]===`:`||t>=3&&e[t-3]===`/`?0:i[0].length:0},normalize:(e,t)=>t.normalize(e)},"mailto:":{validate:function(e,t,n){let r=n.re.get_mailto_validator();r.lastIndex=t;let i=r.exec(e);return i?i[0].length:0},normalize:(e,t)=>t.normalize(e)}},Gn=`a:cdefgilmnoqrstuwxz|b:abdefghijmnorstvwyz|c:acdfghiklmnoruvwxyz|d:ejkmoz|e:cegrstu|f:ijkmor|g:abdefghilmnpqrstuwy|h:kmnrtu|i:delmnoqrst|j:emop|k:eghimnprwyz|l:abcikrstuvy|m:acdeghklmnopqrstuvwxyz|n:acefgilopruz|o:m|p:aefghklmnrstwy|q:a|r:eosuw|s:abcdeghijklmnortuvxyz|t:cdfghjklmnortvwz|u:agksyz|v:aceginu|w:fs|y:et|z:amw`,Kn=`biz|com|edu|gov|net|org|pro|web|xxx|aero|asia|coop|info|museum|name|shop|рф`;function qn(){let e=Kn.split(`|`);return Gn.split(`|`).forEach(t=>{let n=t.indexOf(`:`),r=t.slice(0,n);for(let i of t.slice(n+1))e.push(r+i)}),e}var Jn={fuzzyLink:!1,fuzzyEmail:!0,fuzzyIP:!1,"---":!1,tlds:qn(),urlAuth:!1,maxLength:1e4},Yn=class{constructor(e,t,n,r){D(this,`schema`,void 0),D(this,`index`,void 0),D(this,`lastIndex`,void 0),D(this,`raw`,void 0),D(this,`text`,void 0),D(this,`url`,void 0);let i=e.slice(n,r);this.schema=t.toLowerCase(),this.index=n,this.lastIndex=r,this.raw=i,this.text=i,this.url=i}},Xn=class{constructor(e={}){D(this,`__opts__`,void 0),D(this,`__schemas__`,void 0),D(this,`re`,void 0);let{rebuilder:t}=e,n=Bn(e,Vn);this.__opts__=q(q({},Jn),n),this.__schemas__=q({},Wn),this.re=t||new Hn,this.re.set(q(q({},this.__opts__),{},{schema_names:Object.keys(this.__schemas__)}))}add(e,t=null){if(!t)delete this.__schemas__[e];else{let n=q({normalize:(e,t)=>t.normalize(e)},t);this.__schemas__[e]=n}return this.re.set(q(q({},this.__opts__),{},{schema_names:Object.keys(this.__schemas__)})),this}set(e={}){return this.__opts__=q(q({},this.__opts__),e),this.re.set(q(q({},this.__opts__),{},{schema_names:Object.keys(this.__schemas__)})),this}test(e){if(!e.length)return!1;let t,n;for(n=this.re.get_schema_search(),n.lastIndex=0;(t=n.exec(e))!==null;)if(this.testSchemaAt(e,t[2],n.lastIndex))return!0;if(this.__opts__.fuzzyLink&&this.__schemas__[`http:`]&&(n=this.re.get_fuzzy_link_search(),n.lastIndex=0,n.exec(e)!==null))return!0;if(this.__opts__.fuzzyEmail&&this.__schemas__[`mailto:`]&&e.indexOf(`@`)>=0){let n=this.re.get_fuzzy_mail_host_search(),r=this.re.get_mail_name_validator();for(n.lastIndex=0;(t=n.exec(e))!==null;){let n=e.slice(Math.max(0,t.index-65),t.index);if(r.test(n))return!0}}return!1}testSchemaAt(e,t,n){return this.__schemas__[t.toLowerCase()]?this.__schemas__[t.toLowerCase()].validate(e.slice(0,n+this.__opts__.maxLength),n,this):0}match(e){let t=[],n=this.re.get_schema_search(),r,i,a,o,s,c,l=!1,u=!1,d=!1,f=0;if(!e.length)return null;for(n.lastIndex=0,this.__opts__.fuzzyLink&&this.__schemas__[`http:`]&&(r=this.re.get_fuzzy_link_search(),r.lastIndex=0),this.__opts__.fuzzyEmail&&this.__schemas__[`mailto:`]&&(i=this.re.get_fuzzy_mail_host_search(),i.lastIndex=0,a=this.re.get_mail_name_validator());;){let p=Math.max(f-1,0);if(i&&a&&!d&&(!s||s.index<f))for(i.lastIndex<p&&(i.lastIndex=p);;){let t=i.exec(e);if(!t){d=!0,s=void 0;break}let n=a.exec(e.slice(Math.max(0,t.index-65),t.index));if(n){if(s={schema:`mailto:`,index:t.index-n[1].length,lastIndex:t.index+t[0].length},s.index>=f)break;i.lastIndex<p&&(i.lastIndex=p)}}if(r&&!u&&(!o||o.index<f))for(r.lastIndex<p&&(r.lastIndex=p);;){let t=r.exec(e);if(!t){u=!0,o=void 0;break}if(o={schema:``,index:t.index+t[1].length,lastIndex:t.index+t[0].length},o.index>=f)break;r.lastIndex<p&&(r.lastIndex=p)}let m=s;(!m||o&&(o.index<m.index||o.index===m.index&&o.lastIndex>m.lastIndex))&&(m=o);let h;if(!l)for(;;){if(!c){n.lastIndex<p&&(n.lastIndex=p);let t=n.exec(e);if(!t){l=!0;break}c={schema:t[2],index:t.index+t[1].length,lastIndex:t.index+t[0].length}}if(c.index<f){c=void 0;continue}if(m&&c.index>m.index)break;let t=c;c=void 0;let r=this.testSchemaAt(e,t.schema,t.lastIndex);if(r){h={schema:t.schema,index:t.index,lastIndex:t.lastIndex+r};break}}let g=h;if((!g||s&&(s.index<g.index||s.index===g.index&&s.lastIndex>g.lastIndex))&&(g=s),(!g||o&&(o.index<g.index||o.index===g.index&&o.lastIndex>g.lastIndex))&&(g=o),!g)break;g===s?s=void 0:g===o&&(o=void 0);let _=new Yn(e,g.schema,g.index,g.lastIndex);_.schema?this.__schemas__[_.schema].normalize(_,this):this.normalize(_),t.push(_),f=g.lastIndex}return t.length?t:null}matchAtStart(e){if(!e.length)return null;let t=this.re.get_schema_at_start().exec(e);if(!t)return null;let n=this.testSchemaAt(e,t[2],t[0].length);if(!n)return null;let r=new Yn(e,t[2],t.index+t[1].length,t.index+t[0].length+n);return this.__schemas__[r.schema].normalize(r,this),r}tlds(e,t=!1){return e=Array.isArray(e)?e:[e],t?this.__opts__.tlds=this.__opts__.tlds.concat(e):this.__opts__.tlds=e,this.re.set(q(q({},this.__opts__),{},{schema_names:Object.keys(this.__schemas__)})),this}normalize(e){e.schema||(e.url=`http://${e.url}`),e.schema===`mailto:`&&!/^mailto:/i.test(e.url)&&(e.url=`mailto:${e.url}`)}},J=2147483647,Y=36,Zn=1,X=26,Qn=38,$n=700,er=72,tr=128,nr=`-`,rr=/^xn--/,ir=/[^\0-\x7F]/,ar=/[\x2E\u3002\uFF0E\uFF61]/g,or={overflow:`Overflow: input needs wider integers to process`,"not-basic":`Illegal input >= 0x80 (not a basic code point)`,"invalid-input":`Invalid input`},sr=35,Z=Math.floor,cr=String.fromCharCode;function Q(e){throw RangeError(or[e])}function lr(e,t){let n=[],r=e.length;for(;r--;)n[r]=t(e[r]);return n}function ur(e,t){let n=e.split(`@`),r=``;n.length>1&&(r=n[0]+`@`,e=n[1]),e=e.replace(ar,`.`);let i=lr(e.split(`.`),t).join(`.`);return r+i}function dr(e){let t=[],n=0,r=e.length;for(;n<r;){let i=e.charCodeAt(n++);if(i>=55296&&i<=56319&&n<r){let r=e.charCodeAt(n++);(r&64512)==56320?t.push(((i&1023)<<10)+(r&1023)+65536):(t.push(i),n--)}else t.push(i)}return t}var fr=e=>String.fromCodePoint(...e),pr=function(e){return e>=48&&e<58?26+(e-48):e>=65&&e<91?e-65:e>=97&&e<123?e-97:Y},mr=function(e,t){return e+22+75*(e<26)-((t!=0)<<5)},hr=function(e,t,n){let r=0;for(e=n?Z(e/$n):e>>1,e+=Z(e/t);e>455;r+=Y)e=Z(e/sr);return Z(r+36*e/(e+Qn))},gr=function(e){let t=[],n=e.length,r=0,i=tr,a=er,o=e.lastIndexOf(nr);o<0&&(o=0);for(let n=0;n<o;++n)e.charCodeAt(n)>=128&&Q(`not-basic`),t.push(e.charCodeAt(n));for(let s=o>0?o+1:0;s<n;){let o=r;for(let t=1,i=Y;;i+=Y){s>=n&&Q(`invalid-input`);let o=pr(e.charCodeAt(s++));o>=Y&&Q(`invalid-input`),o>Z((J-r)/t)&&Q(`overflow`),r+=o*t;let c=i<=a?Zn:i>=a+X?X:i-a;if(o<c)break;let l=Y-c;t>Z(J/l)&&Q(`overflow`),t*=l}let c=t.length+1;a=hr(r-o,c,o==0),Z(r/c)>J-i&&Q(`overflow`),i+=Z(r/c),r%=c,t.splice(r++,0,i)}return String.fromCodePoint(...t)},_r=function(e){let t=[];e=dr(e);let n=e.length,r=tr,i=0,a=er;for(let n of e)n<128&&t.push(cr(n));let o=t.length,s=o;for(o&&t.push(nr);s<n;){let n=J;for(let t of e)t>=r&&t<n&&(n=t);let c=s+1;n-r>Z((J-i)/c)&&Q(`overflow`),i+=(n-r)*c,r=n;for(let n of e)if(n<r&&++i>J&&Q(`overflow`),n===r){let e=i;for(let n=Y;;n+=Y){let r=n<=a?Zn:n>=a+X?X:n-a;if(e<r)break;let i=e-r,o=Y-r;t.push(cr(mr(r+i%o,0))),e=Z(i/o)}t.push(cr(mr(e,0))),a=hr(i,c,s===o),i=0,++s}++i,++r}return t.join(``)},vr={version:`2.3.1`,ucs2:{decode:dr,encode:fr},decode:gr,encode:_r,toASCII:function(e){return ur(e,function(e){return ir.test(e)?`xn--`+_r(e):e})},toUnicode:function(e){return ur(e,function(e){return rr.test(e)?gr(e.slice(4).toLowerCase()):e})}},yr={default:{options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:`language-`,linkify:!1,typographer:!1,quotes:`“”‘’`,highlight:null,maxNesting:100},components:{core:{},block:{},inline:{}}},zero:{options:{html:!1,xhtmlOut:!1,breaks:!1,langPrefix:`language-`,linkify:!1,typographer:!1,quotes:`“”‘’`,highlight:null,maxNesting:20},components:{core:{rules:[`normalize`,`block`,`strip_references`,`inline`,`text_join`]},block:{rules:[`paragraph`]},inline:{rules:[`text`],rules2:[`balance_pairs`,`fragments_join`]}}},commonmark:{options:{html:!0,xhtmlOut:!0,breaks:!1,langPrefix:`language-`,linkify:!1,typographer:!1,quotes:`“”‘’`,highlight:null,maxNesting:20},components:{core:{rules:[`normalize`,`block`,`strip_references`,`inline`,`text_join`]},block:{rules:[`blockquote`,`code`,`fence`,`heading`,`hr`,`html_block`,`lheading`,`list`,`reference`,`paragraph`]},inline:{rules:[`autolink`,`backticks`,`emphasis`,`entity`,`escape`,`html_inline`,`image`,`link`,`newline`,`text`],rules2:[`balance_pairs`,`emphasis`,`fragments_join`]}}}},br=/^(vbscript|javascript|file|data):/,xr=/^data:image\/(gif|png|jpeg|webp);/,Sr=[`http:`,`https:`,`mailto:`],$=class{validateLink(e){let t=e.trim().toLowerCase();return!br.test(t)||xr.test(t)}normalizeLink(e){let t=b(e,!0);if(t.hostname&&(!t.protocol||Sr.indexOf(t.protocol)>=0))try{t.hostname=vr.toASCII(t.hostname)}catch(e){}return t.auth&&(t.auth=s(t.auth)),t.hostname&&(t.hostname=s(t.hostname)),t.pathname&&(t.pathname=s(t.pathname)),t.search&&(t.search=s(t.search)),t.hash&&(t.hash=s(t.hash)),c(t)}normalizeLinkText(e){let t=b(e,!0);if(t.hostname&&(!t.protocol||Sr.indexOf(t.protocol)>=0))try{t.hostname=vr.toUnicode(t.hostname)}catch(e){}return i(c(t),i.defaultChars+`%`)}constructor(...e){D(this,`inline`,new Ln),D(this,`block`,new Qt),D(this,`core`,new Dt),D(this,`renderer`,new Ze),D(this,`linkify`,new Xn),D(this,`utils`,ke),D(this,`helpers`,Object.assign({},Xe));let[t,n]=e;typeof t==`string`?(this.configure(t),n&&this.set(n)):(this.configure(`default`),this.set(t||{}))}set(e){return Object.assign(this.options,e),this}configure(e){let t;if(typeof e==`string`){let n=e;if(t=yr[n],!t)throw Error(`Wrong 'markdown-it' preset "${n}", check name`)}else t=e;if(!t)throw Error("Wrong `markdown-it` preset, can't be empty");t.options&&(this.options=q({},t.options));let n=t.components;if(n){var r;[`core`,`block`,`inline`].forEach(e=>{var t;let r=(t=n[e])==null?void 0:t.rules;r&&this[e].ruler.enableOnly(r)});let e=(r=n.inline)==null?void 0:r.rules2;e&&this.inline.ruler2.enableOnly(e)}return this}enable(e,t=!1){let n=[];Array.isArray(e)||(e=[e]),[`core`,`block`,`inline`].forEach(t=>{n=n.concat(this[t].ruler.enable(e,!0))}),n=n.concat(this.inline.ruler2.enable(e,!0));let r=e.filter(e=>n.indexOf(e)<0);if(r.length&&!t)throw Error(`MarkdownIt. Failed to enable unknown rule(s): ${r}`);return this}disable(e,t=!1){let n=[];Array.isArray(e)||(e=[e]),[`core`,`block`,`inline`].forEach(t=>{n=n.concat(this[t].ruler.disable(e,!0))}),n=n.concat(this.inline.ruler2.disable(e,!0));let r=e.filter(e=>n.indexOf(e)<0);if(r.length&&!t)throw Error(`MarkdownIt. Failed to disable unknown rule(s): ${r}`);return this}use(e,...t){return e.apply(e,[this,...t]),this}parse(e,t){if(typeof e!=`string`)throw Error(`Input data should be a String`);let n=new this.core.State(e,this,t);return this.core.process(n),n.tokens}render(e,t={}){return this.renderer.render(this.parse(e,t),this.options,t)}parseInline(e,t){let n=new this.core.State(e,this,t);return n.inlineMode=!0,this.core.process(n),n.tokens}renderInline(e,t={}){return this.renderer.render(this.parseInline(e,t),this.options,t)}};return D($,`Token`,z),D($,`Ruler`,B),D($,`Renderer`,Ze),D($,`ParserCore`,Dt),D($,`StateCore`,Qe),D($,`ParserBlock`,Qt),D($,`StateBlock`,Ot),D($,`ParserInline`,Ln),D($,`StateInline`,$t),Ae($)});
;
/*! markdown-it-footnote 4.0.0 https://github.com/markdown-it/markdown-it-footnote @license MIT */
!function(e,o){"object"==typeof exports&&"undefined"!=typeof module?module.exports=o():"function"==typeof define&&define.amd?define(o):(e="undefined"!=typeof globalThis?globalThis:e||self).markdownitFootnote=o()}(this,(function(){"use strict";function e(e,o,t,n){const r=Number(e[o].meta.id+1).toString();let s="";return"string"==typeof n.docId&&(s=`-${n.docId}-`),s+r}function o(e,o){let t=Number(e[o].meta.id+1).toString();return e[o].meta.subId>0&&(t+=`:${e[o].meta.subId}`),`[${t}]`}function t(e,o,t,n,r){const s=r.rules.footnote_anchor_name(e,o,t,n,r),f=r.rules.footnote_caption(e,o,t,n,r);let l=s;return e[o].meta.subId>0&&(l+=`:${e[o].meta.subId}`),`<sup class="footnote-ref"><a href="#fn${s}" id="fnref${l}">${f}</a></sup>`}function n(e,o,t){return(t.xhtmlOut?'<hr class="footnotes-sep" />\n':'<hr class="footnotes-sep">\n')+'<section class="footnotes">\n<ol class="footnotes-list">\n'}function r(){return"</ol>\n</section>\n"}function s(e,o,t,n,r){let s=r.rules.footnote_anchor_name(e,o,t,n,r);return e[o].meta.subId>0&&(s+=`:${e[o].meta.subId}`),`<li id="fn${s}" class="footnote-item">`}function f(){return"</li>\n"}function l(e,o,t,n,r){let s=r.rules.footnote_anchor_name(e,o,t,n,r);return e[o].meta.subId>0&&(s+=`:${e[o].meta.subId}`),` <a href="#fnref${s}" class="footnote-backref">\u21a9\ufe0e</a>`}return function(c){const i=c.helpers.parseLinkLabel,u=c.utils.isSpace;c.renderer.rules.footnote_ref=t,c.renderer.rules.footnote_block_open=n,c.renderer.rules.footnote_block_close=r,c.renderer.rules.footnote_open=s,c.renderer.rules.footnote_close=f,c.renderer.rules.footnote_anchor=l,c.renderer.rules.footnote_caption=o,c.renderer.rules.footnote_anchor_name=e,c.block.ruler.before("reference","footnote_def",(function(e,o,t,n){const r=e.bMarks[o]+e.tShift[o],s=e.eMarks[o];if(r+4>s)return!1;if(91!==e.src.charCodeAt(r))return!1;if(94!==e.src.charCodeAt(r+1))return!1;let f;for(f=r+2;f<s;f++){if(32===e.src.charCodeAt(f))return!1;if(93===e.src.charCodeAt(f))break}if(f===r+2)return!1;if(f+1>=s||58!==e.src.charCodeAt(++f))return!1;if(n)return!0;f++,e.env.footnotes||(e.env.footnotes={}),e.env.footnotes.refs||(e.env.footnotes.refs={});const l=e.src.slice(r+2,f-2);e.env.footnotes.refs[`:${l}`]=-1;const c=new e.Token("footnote_reference_open","",1);c.meta={label:l},c.level=e.level++,e.tokens.push(c);const i=e.bMarks[o],a=e.tShift[o],p=e.sCount[o],d=e.parentType,h=f,k=e.sCount[o]+f-(e.bMarks[o]+e.tShift[o]);let b=k;for(;f<s;){const o=e.src.charCodeAt(f);if(!u(o))break;9===o?b+=4-b%4:b++,f++}e.tShift[o]=f-h,e.sCount[o]=b-k,e.bMarks[o]=h,e.blkIndent+=4,e.parentType="footnote",e.sCount[o]<e.blkIndent&&(e.sCount[o]+=e.blkIndent),e.md.block.tokenize(e,o,t,!0),e.parentType=d,e.blkIndent-=4,e.tShift[o]=a,e.sCount[o]=p,e.bMarks[o]=i;const _=new e.Token("footnote_reference_close","",-1);return _.level=--e.level,e.tokens.push(_),!0}),{alt:["paragraph","reference"]}),c.inline.ruler.after("image","footnote_inline",(function(e,o){const t=e.posMax,n=e.pos;if(n+2>=t)return!1;if(94!==e.src.charCodeAt(n))return!1;if(91!==e.src.charCodeAt(n+1))return!1;const r=n+2,s=i(e,n+1);if(s<0)return!1;if(!o){e.env.footnotes||(e.env.footnotes={}),e.env.footnotes.list||(e.env.footnotes.list=[]);const o=e.env.footnotes.list.length,t=[];e.md.inline.parse(e.src.slice(r,s),e.md,e.env,t);e.push("footnote_ref","",0).meta={id:o},e.env.footnotes.list[o]={content:e.src.slice(r,s),tokens:t}}return e.pos=s+1,e.posMax=t,!0})),c.inline.ruler.after("footnote_inline","footnote_ref",(function(e,o){const t=e.posMax,n=e.pos;if(n+3>t)return!1;if(!e.env.footnotes||!e.env.footnotes.refs)return!1;if(91!==e.src.charCodeAt(n))return!1;if(94!==e.src.charCodeAt(n+1))return!1;let r;for(r=n+2;r<t;r++){if(32===e.src.charCodeAt(r))return!1;if(10===e.src.charCodeAt(r))return!1;if(93===e.src.charCodeAt(r))break}if(r===n+2)return!1;if(r>=t)return!1;r++;const s=e.src.slice(n+2,r-1);if(void 0===e.env.footnotes.refs[`:${s}`])return!1;if(!o){let o;e.env.footnotes.list||(e.env.footnotes.list=[]),e.env.footnotes.refs[`:${s}`]<0?(o=e.env.footnotes.list.length,e.env.footnotes.list[o]={label:s,count:0},e.env.footnotes.refs[`:${s}`]=o):o=e.env.footnotes.refs[`:${s}`];const t=e.env.footnotes.list[o].count;e.env.footnotes.list[o].count++;e.push("footnote_ref","",0).meta={id:o,subId:t,label:s}}return e.pos=r,e.posMax=t,!0})),c.core.ruler.after("inline","footnote_tail",(function(e){let o,t,n,r=!1;const s={};if(!e.env.footnotes)return;if(e.tokens=e.tokens.filter((function(e){return"footnote_reference_open"===e.type?(r=!0,t=[],n=e.meta.label,!1):"footnote_reference_close"===e.type?(r=!1,s[":"+n]=t,!1):(r&&t.push(e),!r)})),!e.env.footnotes.list)return;const f=e.env.footnotes.list;e.tokens.push(new e.Token("footnote_block_open","",1));for(let t=0,n=f.length;t<n;t++){const n=new e.Token("footnote_open","",1);if(n.meta={id:t,label:f[t].label},e.tokens.push(n),f[t].tokens){o=[];const n=new e.Token("paragraph_open","p",1);n.block=!0,o.push(n);const r=new e.Token("inline","",0);r.children=f[t].tokens,r.content=f[t].content,o.push(r);const s=new e.Token("paragraph_close","p",-1);s.block=!0,o.push(s)}else f[t].label&&(o=s[`:${f[t].label}`]);let r;o&&(e.tokens=e.tokens.concat(o)),r="paragraph_close"===e.tokens[e.tokens.length-1].type?e.tokens.pop():null;const l=f[t].count>0?f[t].count:1;for(let o=0;o<l;o++){const n=new e.Token("footnote_anchor","",0);n.meta={id:t,subId:o,label:f[t].label},e.tokens.push(n)}r&&e.tokens.push(r),e.tokens.push(new e.Token("footnote_close","",-1))}e.tokens.push(new e.Token("footnote_block_close","",-1))}))}}));
;
/*! @license DOMPurify 3.4.17 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.4.17/LICENSE */
(function(e,t){typeof exports==`object`&&typeof module<`u`?module.exports=t():typeof define==`function`&&define.amd?define([],t):(e=typeof globalThis<`u`?globalThis:e||self,e.DOMPurify=t())})(this,function(){"use strict";function e(e,t){this.v=e,this.k=t}function t(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,r=Array(t);n<t;n++)r[n]=e[n];return r}function n(e){if(Array.isArray(e))return e}function r(e,t){var n=e==null?null:typeof Symbol<`u`&&e[Symbol.iterator]||e[`@@iterator`];if(n!=null){var r,i,a,o,s=[],c=!0,l=!1;try{if(a=(n=n.call(e)).next,t===0){if(Object(n)!==n)return;c=!1}else for(;!(c=(r=a.call(n)).done)&&(s.push(r.value),s.length!==t);c=!0);}catch(e){l=!0,i=e}finally{try{if(!c&&n.return!=null&&(o=n.return(),Object(o)!==o))return}finally{if(l)throw i}}return s}}function i(){throw TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}
/*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */
function a(e,t){return n(e)||r(e,t)||o(e,t)||i()}function o(e,n){if(e){if(typeof e==`string`)return t(e,n);var r={}.toString.call(e).slice(8,-1);return r===`Object`&&e.constructor&&(r=e.constructor.name),r===`Map`||r===`Set`?Array.from(e):r===`Arguments`||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r)?t(e,n):void 0}}function s(t){var n,r;function i(n,r){try{var o=t[n](r),s=o.value,c=s instanceof e;Promise.resolve(c?s.v:s).then(function(e){if(c){var r=n===`return`&&s.k?n:`next`;if(!s.k||e.done)return i(r,e);e=t[r](e).value}a(!!o.done,e)},function(e){i(`throw`,e)})}catch(e){a(2,e)}}function a(e,t){e===2?n.reject(t):n.resolve({value:t,done:e}),(n=n.next)?i(n.key,n.arg):r=null}this._invoke=function(e,t){return new Promise(function(a,o){var s={key:e,arg:t,resolve:a,reject:o,next:null};r?r=r.next=s:(n=r=s,i(e,t))})},typeof t.return!=`function`&&(this.return=void 0)}s.prototype[typeof Symbol==`function`&&Symbol.asyncIterator||`@@asyncIterator`]=function(){return this},s.prototype.next=function(e){return this._invoke(`next`,e)},s.prototype.throw=function(e){return this._invoke(`throw`,e)},s.prototype.return=function(e){return this._invoke(`return`,e)};let c=Object.entries,l=Object.setPrototypeOf,u=Object.isFrozen,d=Object.getPrototypeOf,f=Object.getOwnPropertyDescriptor,p=Object.freeze,m=Object.seal,h=Object.create,ee=typeof Reflect<`u`&&Reflect,g=ee.apply,te=ee.construct;p||(p=function(e){return e}),m||(m=function(e){return e}),g||(g=function(e,t){var n=[...arguments].slice(2);return e.apply(t,n)}),te||(te=function(e){return new e(...[...arguments].slice(1))});let _=E(Array.prototype.forEach);Array.prototype.indexOf;let ne=E(Array.prototype.lastIndexOf),re=E(Array.prototype.pop),ie=E(Array.prototype.push),ae=E(Array.prototype.slice),oe=E(Array.prototype.splice),v=Array.isArray,se=D(Set),ce=E(Set.prototype.add),le=E(Set.prototype.has),y=E(String.prototype.toLowerCase),ue=E(String.prototype.toString),de=E(String.prototype.match),fe=E(String.prototype.replace),pe=E(String.prototype.indexOf),me=E(String.prototype.trim),he=E(Number.prototype.toString),b=E(Boolean.prototype.toString),x=typeof BigInt>`u`?null:E(BigInt.prototype.toString),ge=typeof Symbol>`u`?null:E(Symbol.prototype.toString),S=E(Object.prototype.hasOwnProperty),C=E(Object.prototype.toString),w=E(RegExp.prototype.test),T=D(TypeError);function E(e){return function(t){t instanceof RegExp&&(t.lastIndex=0);var n=[...arguments].slice(1);return g(e,t,n)}}function D(e){return function(){return te(e,[...arguments])}}function O(e,t){let n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:y;if(l&&l(e,null),!v(t))return e;let r=t.length;for(;r--;){let i=t[r];if(typeof i==`string`){let e=n(i);e!==i&&(u(t)||(t[r]=e),i=e)}e[i]=!0}return e}function _e(e){for(let t=0;t<e.length;t++)S(e,t)||(e[t]=null);return e}function k(e){let t=h(null);for(let r of c(e)){var n=a(r,2);let i=n[0],o=n[1];S(e,i)&&(t[i]=v(o)?_e(o):o&&typeof o==`object`&&o.constructor===Object?k(o):o)}return t}function ve(e){switch(typeof e){case`string`:return e;case`number`:return he(e);case`boolean`:return b(e);case`bigint`:return x?x(e):`0`;case`symbol`:return ge?ge(e):`Symbol()`;case`undefined`:return C(e);case`function`:case`object`:{if(e===null)return C(e);let t=e,n=A(t,`toString`);if(typeof n==`function`){let e=n(t);return typeof e==`string`?e:C(e)}return C(e)}default:return C(e)}}function A(e,t){for(;e!==null;){let n=f(e,t);if(n){if(n.get)return E(n.get);if(typeof n.value==`function`)return E(n.value)}e=d(e)}function n(){return null}return n}function ye(e,t){for(;e!==null;){let n=f(e,t);if(n)return n.get?E(n.get):null;e=d(e)}return null}function be(e){try{return w(e,``),!0}catch(e){return!1}}let xe=p(/* @__PURE__ */ `a.abbr.acronym.address.area.article.aside.audio.b.bdi.bdo.big.blink.blockquote.body.br.button.canvas.caption.center.cite.code.col.colgroup.content.data.datalist.dd.decorator.del.details.dfn.dialog.dir.div.dl.dt.element.em.fieldset.figcaption.figure.font.footer.form.h1.h2.h3.h4.h5.h6.head.header.hgroup.hr.html.i.img.input.ins.kbd.label.legend.li.main.map.mark.marquee.menu.menuitem.meter.nav.nobr.ol.optgroup.option.output.p.picture.pre.progress.q.rp.rt.ruby.s.samp.search.section.select.shadow.slot.small.source.spacer.span.strike.strong.style.sub.summary.sup.table.tbody.td.template.textarea.tfoot.th.thead.time.tr.track.tt.u.ul.var.video.wbr`.split(`.`)),Se=p(/* @__PURE__ */ `svg.a.altglyph.altglyphdef.altglyphitem.animatecolor.animatemotion.animatetransform.circle.clippath.defs.desc.ellipse.enterkeyhint.exportparts.filter.font.g.glyph.glyphref.hkern.image.inputmode.line.lineargradient.marker.mask.metadata.mpath.part.path.pattern.polygon.polyline.radialgradient.rect.stop.style.switch.symbol.text.textpath.title.tref.tspan.view.vkern`.split(`.`)),Ce=p([`feBlend`,`feColorMatrix`,`feComponentTransfer`,`feComposite`,`feConvolveMatrix`,`feDiffuseLighting`,`feDisplacementMap`,`feDistantLight`,`feDropShadow`,`feFlood`,`feFuncA`,`feFuncB`,`feFuncG`,`feFuncR`,`feGaussianBlur`,`feImage`,`feMerge`,`feMergeNode`,`feMorphology`,`feOffset`,`fePointLight`,`feSpecularLighting`,`feSpotLight`,`feTile`,`feTurbulence`]),we=p([`animate`,`color-profile`,`cursor`,`discard`,`font-face`,`font-face-format`,`font-face-name`,`font-face-src`,`font-face-uri`,`foreignobject`,`hatch`,`hatchpath`,`mesh`,`meshgradient`,`meshpatch`,`meshrow`,`missing-glyph`,`script`,`set`,`solidcolor`,`unknown`,`use`]),Te=p(/* @__PURE__ */ `math.menclose.merror.mfenced.mfrac.mglyph.mi.mlabeledtr.mmultiscripts.mn.mo.mover.mpadded.mphantom.mroot.mrow.ms.mspace.msqrt.mstyle.msub.msup.msubsup.mtable.mtd.mtext.mtr.munder.munderover.mprescripts`.split(`.`)),Ee=p([`maction`,`maligngroup`,`malignmark`,`mlongdiv`,`mscarries`,`mscarry`,`msgroup`,`mstack`,`msline`,`msrow`,`semantics`,`annotation`,`annotation-xml`,`mprescripts`,`none`]),De=p([`#text`]),Oe=p(/* @__PURE__ */ `accept.action.align.alt.autocapitalize.autocomplete.autopictureinpicture.autoplay.background.bgcolor.border.capture.cellpadding.cellspacing.checked.cite.class.clear.color.cols.colspan.command.commandfor.controls.controlslist.coords.crossorigin.datetime.decoding.default.dir.disabled.disablepictureinpicture.disableremoteplayback.download.draggable.enctype.enterkeyhint.exportparts.face.for.headers.height.hidden.high.href.hreflang.id.inert.inputmode.integrity.ismap.kind.label.lang.list.loading.loop.low.max.maxlength.media.method.min.minlength.multiple.muted.name.nonce.noshade.novalidate.nowrap.open.optimum.part.pattern.placeholder.playsinline.popover.popovertarget.popovertargetaction.poster.preload.pubdate.radiogroup.readonly.rel.required.rev.reversed.role.rows.rowspan.spellcheck.scope.selected.shape.size.sizes.slot.span.srclang.start.src.srcset.step.style.summary.tabindex.title.translate.type.usemap.valign.value.width.wrap.xmlns`.split(`.`)),ke=p(/* @__PURE__ */ `accent-height.accumulate.additive.alignment-baseline.amplitude.ascent.attributename.attributetype.azimuth.basefrequency.baseline-shift.begin.bias.by.class.clip.clippathunits.clip-path.clip-rule.color.color-interpolation.color-interpolation-filters.color-profile.color-rendering.cx.cy.d.dx.dy.diffuseconstant.direction.display.divisor.dominant-baseline.dur.edgemode.elevation.end.exponent.fill.fill-opacity.fill-rule.filter.filterunits.flood-color.flood-opacity.font-family.font-size.font-size-adjust.font-stretch.font-style.font-variant.font-weight.fx.fy.g1.g2.glyph-name.glyphref.gradientunits.gradienttransform.height.href.id.image-rendering.in.in2.intercept.k.k1.k2.k3.k4.kerning.keypoints.keysplines.keytimes.lang.lengthadjust.letter-spacing.kernelmatrix.kernelunitlength.lighting-color.local.marker-end.marker-mid.marker-start.markerheight.markerunits.markerwidth.maskcontentunits.maskunits.max.mask.mask-type.media.method.mode.min.name.numoctaves.offset.operator.opacity.order.orient.orientation.origin.overflow.paint-order.path.pathlength.patterncontentunits.patterntransform.patternunits.pointer-events.points.preservealpha.preserveaspectratio.primitiveunits.r.rx.ry.radius.refx.refy.repeatcount.repeatdur.restart.result.rotate.scale.seed.shape-rendering.slope.specularconstant.specularexponent.spreadmethod.startoffset.stddeviation.stitchtiles.stop-color.stop-opacity.stroke-dasharray.stroke-dashoffset.stroke-linecap.stroke-linejoin.stroke-miterlimit.stroke-opacity.stroke.stroke-width.style.surfacescale.systemlanguage.tabindex.tablevalues.targetx.targety.transform.transform-origin.text-anchor.text-decoration.text-orientation.text-rendering.textlength.type.u1.u2.unicode.values.vector-effect.viewbox.visibility.version.vert-adv-y.vert-origin-x.vert-origin-y.width.word-spacing.wrap.writing-mode.xchannelselector.ychannelselector.x.x1.x2.xmlns.y.y1.y2.z.zoomandpan`.split(`.`)),Ae=p(/* @__PURE__ */ `accent.accentunder.align.bevelled.close.columnalign.columnlines.columnspacing.columnspan.denomalign.depth.dir.display.displaystyle.encoding.fence.frame.height.href.id.largeop.length.linethickness.lquote.lspace.mathbackground.mathcolor.mathsize.mathvariant.maxsize.minsize.movablelimits.notation.numalign.open.rowalign.rowlines.rowspacing.rowspan.rspace.rquote.scriptlevel.scriptminsize.scriptsizemultiplier.selection.separator.separators.stretchy.subscriptshift.supscriptshift.symmetric.voffset.width.xmlns`.split(`.`)),je=p([`xlink:href`,`xml:id`,`xlink:title`,`xml:space`,`xmlns:xlink`]),Me=m(/{{[\w\W]*|^[\w\W]*}}/g),Ne=m(/<%[\w\W]*|^[\w\W]*%>/g),Pe=m(/\${[\w\W]*/g),Fe=m(/^data-[\-\w.\u00B7-\uFFFF]+$/),Ie=m(/^aria-[\-\w]+$/),Le=m(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i),Re=m(/^(?:\w+script|data):/i),ze=m(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g),Be=m(/^html$/i),Ve=m(/^[a-z][.\w]*(-[.\w]+)+$/i),He=m(/<[/\w!]/g),Ue=m(/<[/\w]/g),We=m(/<\/no(script|embed|frames)/i),Ge=m(/\/>/i),j={element:1,attribute:2,text:3,cdataSection:4,entityReference:5,entityNode:6,processingInstruction:7,comment:8,document:9,documentType:10,documentFragment:11,notation:12},Ke=p(O({},[`style`,`script`,`xmp`,`iframe`,`noembed`,`noframes`,`plaintext`,`noscript`])),qe=function(){return typeof window>`u`?null:window},Je=function(e,t){if(typeof e!=`object`||typeof e.createPolicy!=`function`)return null;let n=null,r=`data-tt-policy-suffix`;t&&t.hasAttribute(r)&&(n=t.getAttribute(r));let i=`dompurify`+(n?`#`+n:``);try{return e.createPolicy(i,{createHTML(e){return e},createScriptURL(e){return e}})}catch(e){return console.warn(`TrustedTypes policy `+i+` could not be created.`),null}},Ye=function(){return{afterSanitizeAttributes:[],afterSanitizeElements:[],afterSanitizeShadowDOM:[],beforeSanitizeAttributes:[],beforeSanitizeElements:[],beforeSanitizeShadowDOM:[],uponSanitizeAttribute:[],uponSanitizeElement:[],uponSanitizeShadowNode:[]}},M=function(e,t,n,r){return S(e,t)&&v(e[t])?O(r.base?k(r.base):{},e[t],r.transform):n},Xe=function(e,t,n){let r=S(e,t)?e[t]:void 0;return r&&typeof r==`object`?k(r):n()};function Ze(){let e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:qe(),t=e=>Ze(e);if(t.version=`3.4.17`,t.removed=[],!e||!e.document||e.document.nodeType!==j.document||!e.Element)return t.isSupported=!1,t;let n=e.document,r=n,i=r.currentScript;e.DocumentFragment;let a=e.HTMLTemplateElement,o=e.Node,s=e.Element,l=e.NodeFilter;e.NamedNodeMap===void 0&&(e.NamedNodeMap||e.MozNamedAttrMap),e.HTMLFormElement;let u=e.DOMParser,d=e.trustedTypes,f=s.prototype,ee=A(f,`cloneNode`),g=A(f,`remove`),te=A(f,`removeAttributeNode`),he=A(f,`nextSibling`),b=A(f,`childNodes`),x=A(f,`parentNode`),ge=A(f,`shadowRoot`),C=A(f,`attributes`),E=o&&o.prototype?A(o.prototype,`nodeType`):null,D=o&&o.prototype?A(o.prototype,`nodeName`):null,_e=o&&o.prototype?A(o.prototype,`ownerDocument`):null,N=function(e){return E?E(e):e.nodeType},Qe=function(e){return D?D(e):e.nodeName},$e=ye(f,`namespaceURI`),et=function(e){return $e?$e(e):e.namespaceURI};if(typeof a==`function`){let e=n.createElement(`template`);e.content&&e.content.ownerDocument&&(n=e.content.ownerDocument)}let P,F=``,tt,nt=!1,rt=0,it=function(){if(rt>0)throw T(`A configured TRUSTED_TYPES_POLICY callback (createHTML or createScriptURL) must not call DOMPurify.sanitize, as that causes infinite recursion. Do not pass a policy whose callbacks wrap DOMPurify as TRUSTED_TYPES_POLICY; see the "DOMPurify and Trusted Types" section of the README.`)},at=function(e){it(),rt++;try{return P.createHTML(e)}finally{rt--}},ot=function(e){it(),rt++;try{return P.createScriptURL(e)}finally{rt--}},st=function(){return nt||(tt=Je(d,i),nt=!0),tt},ct=n,lt=ct.implementation,ut=ct.createNodeIterator,dt=ct.createDocumentFragment,ft=ct.getElementsByTagName,pt=r.importNode,I=Ye();t.isSupported=typeof c==`function`&&typeof x==`function`&&lt&&lt.createHTMLDocument!==void 0;let mt=Me,ht=Ne,gt=Pe,_t=Fe,vt=Ie,yt=Re,bt=ze,xt=Ve,St=Le,L=null,Ct=O({},[...xe,...Se,...Ce,...Te,...De]),R=null,wt=O({},[...Oe,...ke,...Ae,...je]),z=Object.seal(h(null,{tagNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeNameCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},allowCustomizedBuiltInElements:{writable:!0,configurable:!1,enumerable:!0,value:!1}})),Tt=null,Et=null,B=Object.seal(h(null,{tagCheck:{writable:!0,configurable:!1,enumerable:!0,value:null},attributeCheck:{writable:!0,configurable:!1,enumerable:!0,value:null}})),Dt=!0,Ot=!0,kt=!1,At=!0,V=!1,H=!0,U=!1,jt=!1,Mt=null,Nt=null,Pt=!1,W=!1,Ft=!1,It=!1,Lt=!0,Rt=!1,zt=`user-content-`,Bt=!0,Vt=!1,G=null,K={},q=null,Ht=O({},/* @__PURE__ */ `annotation-xml.audio.colgroup.desc.foreignobject.head.iframe.math.mi.mn.mo.ms.mtext.noembed.noframes.noscript.plaintext.script.selectedcontent.style.svg.template.thead.title.video.xmp`.split(`.`)),Ut=null,Wt=O({},[`audio`,`video`,`img`,`source`,`image`,`track`]),Gt=null,Kt=O({},[`alt`,`class`,`for`,`id`,`label`,`name`,`pattern`,`placeholder`,`role`,`summary`,`title`,`value`,`style`,`xmlns`]),qt=`http://www.w3.org/1998/Math/MathML`,Jt=`http://www.w3.org/2000/svg`,J=`http://www.w3.org/1999/xhtml`,Yt=J,Xt=!1,Zt=null,Qt=O({},[qt,Jt,J],ue),$t=p([`mi`,`mo`,`mn`,`ms`,`mtext`]),en=O({},$t),tn=p([`annotation-xml`]),nn=O({},tn),rn=O({},[`title`,`style`,`font`,`a`,`script`]),an=null,on=[`application/xhtml+xml`,`text/html`],Y=null,sn=null,cn=n.createElement(`form`),ln=function(e){return e instanceof RegExp||e instanceof Function},un=function(){let e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};if(sn&&sn===e)return;(!e||typeof e!=`object`)&&(e={}),e=k(e),an=on.indexOf(e.PARSER_MEDIA_TYPE)===-1?`text/html`:e.PARSER_MEDIA_TYPE,Y=an===`application/xhtml+xml`?ue:y,L=M(e,`ALLOWED_TAGS`,Ct,{transform:Y}),R=M(e,`ALLOWED_ATTR`,wt,{transform:Y}),Zt=M(e,`ALLOWED_NAMESPACES`,Qt,{transform:ue}),Gt=M(e,`ADD_URI_SAFE_ATTR`,Kt,{transform:Y,base:Kt}),Ut=M(e,`ADD_DATA_URI_TAGS`,Wt,{transform:Y,base:Wt}),q=M(e,`FORBID_CONTENTS`,Ht,{transform:Y}),Tt=M(e,`FORBID_TAGS`,k({}),{transform:Y}),Et=M(e,`FORBID_ATTR`,k({}),{transform:Y}),K=S(e,`USE_PROFILES`)?e.USE_PROFILES&&typeof e.USE_PROFILES==`object`?k(e.USE_PROFILES):e.USE_PROFILES:!1,Dt=e.ALLOW_ARIA_ATTR!==!1,Ot=e.ALLOW_DATA_ATTR!==!1,kt=e.ALLOW_UNKNOWN_PROTOCOLS||!1,At=e.ALLOW_SELF_CLOSE_IN_ATTR!==!1,V=e.SAFE_FOR_TEMPLATES||!1,H=e.SAFE_FOR_XML!==!1,U=e.WHOLE_DOCUMENT||!1,W=e.RETURN_DOM||!1,Ft=e.RETURN_DOM_FRAGMENT||!1,It=e.RETURN_TRUSTED_TYPE||!1,Pt=e.FORCE_BODY||!1,Lt=e.SANITIZE_DOM!==!1,Rt=e.SANITIZE_NAMED_PROPS||!1,Bt=e.KEEP_CONTENT!==!1,Vt=e.IN_PLACE||!1,St=be(e.ALLOWED_URI_REGEXP)?e.ALLOWED_URI_REGEXP:Le,Yt=typeof e.NAMESPACE==`string`?e.NAMESPACE:J,en=Xe(e,`MATHML_TEXT_INTEGRATION_POINTS`,()=>O({},$t)),nn=Xe(e,`HTML_INTEGRATION_POINTS`,()=>O({},tn));let t=Xe(e,`CUSTOM_ELEMENT_HANDLING`,()=>h(null));if(z=h(null),S(t,`tagNameCheck`)&&ln(t.tagNameCheck)&&(z.tagNameCheck=t.tagNameCheck),S(t,`attributeNameCheck`)&&ln(t.attributeNameCheck)&&(z.attributeNameCheck=t.attributeNameCheck),S(t,`allowCustomizedBuiltInElements`)&&typeof t.allowCustomizedBuiltInElements==`boolean`&&(z.allowCustomizedBuiltInElements=t.allowCustomizedBuiltInElements),m(z),V&&(Ot=!1),Ft&&(W=!0),K&&(L=O({},De),R=h(null),K.html===!0&&(O(L,xe),O(R,Oe)),K.svg===!0&&(O(L,Se),O(R,ke),O(R,je)),K.svgFilters===!0&&(O(L,Ce),O(R,ke),O(R,je)),K.mathMl===!0&&(O(L,Te),O(R,Ae),O(R,je))),B.tagCheck=null,B.attributeCheck=null,S(e,`ADD_TAGS`)&&(typeof e.ADD_TAGS==`function`?B.tagCheck=e.ADD_TAGS:v(e.ADD_TAGS)&&(L===Ct&&(L=k(L)),O(L,e.ADD_TAGS,Y))),S(e,`ADD_ATTR`)&&(typeof e.ADD_ATTR==`function`?B.attributeCheck=e.ADD_ATTR:v(e.ADD_ATTR)&&(R===wt&&(R=k(R)),O(R,e.ADD_ATTR,Y))),S(e,`ADD_FORBID_CONTENTS`)&&v(e.ADD_FORBID_CONTENTS)&&(q===Ht&&(q=k(q)),O(q,e.ADD_FORBID_CONTENTS,Y)),Bt&&(L[`#text`]=!0),U&&O(L,[`html`,`head`,`body`]),L.table&&(O(L,[`tbody`]),delete Tt.tbody),e.TRUSTED_TYPES_POLICY){if(typeof e.TRUSTED_TYPES_POLICY.createHTML!=`function`)throw T(`TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.`);if(typeof e.TRUSTED_TYPES_POLICY.createScriptURL!=`function`)throw T(`TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.`);let t=P;P=e.TRUSTED_TYPES_POLICY;try{F=at(``)}catch(e){throw P=t,e}}else e.TRUSTED_TYPES_POLICY===null?(P=void 0,F=``):(P===void 0&&(P=st()),P&&typeof F==`string`&&(F=at(``)));p&&p(e),sn=e},dn=O({},[...Se,...Ce,...we]),fn=O({},[...Te,...Ee]),pn=function(e,t,n){return t.namespaceURI===J?e===`svg`:t.namespaceURI===qt?e===`svg`&&(n===`annotation-xml`||en[n]):!!dn[e]},mn=function(e,t,n){return t.namespaceURI===J?e===`math`:t.namespaceURI===Jt?e===`math`&&nn[n]:!!fn[e]},hn=function(e,t,n){return t.namespaceURI===Jt&&!nn[n]||t.namespaceURI===qt&&!en[n]?!1:!fn[e]&&(rn[e]||!dn[e])},gn=function(e){let t=et(e),n=y(Qe(e)),r=x(e),i,a;return r&&N(r)===j.element?(i={namespaceURI:et(r)},a=y(Qe(r))):(i={namespaceURI:Yt},a=`template`),Zt[t]?t===Jt?pn(n,i,a):t===qt?mn(n,i,a):t===J?hn(n,i,a):!!(an===`application/xhtml+xml`&&Zt[t]):!1},X=function(e){ie(t.removed,{element:e});try{x(e).removeChild(e)}catch(t){if(g(e),!x(e))throw T(`a node selected for removal could not be detached from its tree and cannot be safely returned; refusing to sanitize in place`)}},_n=function(e,t,n){try{te(e,t)}catch(t){try{e.removeAttribute(n)}catch(e){}}},vn=function(e){Sn(e);let t=b(e);t&&_(ae(t),e=>{try{g(e)}catch(e){}});let n=N(e)===j.element?C(e):null;if(n)for(let t=n.length-1;t>=0;--t){let r=n[t],i=r&&r.name;typeof i==`string`&&_n(e,r,i)}},yn=function(e,n,r){if(!r)try{r=n.getAttributeNode(e)}catch(e){r=null}ie(t.removed,{attribute:r||null,from:n});try{r?te(n,r):n.removeAttribute(e)}catch(t){try{n.removeAttribute(e)}catch(e){}}if(e===`is`){if(W||Ft)try{X(n)}catch(e){}else try{n.setAttribute(e,``)}catch(e){}}},bn=function(e){let t=C(e);if(t)for(let n=t.length-1;n>=0;--n){let r=t[n],i=r&&r.name;typeof i!=`string`||R[Y(i)]||_n(e,r,i)}},xn=function(e,t){let n=arguments.length>2&&arguments[2]!==void 0&&arguments[2],r=[e];for(;r.length>0;){let e=r.pop();if(t(e)===!1)continue;if(n&&N(e)===j.element){let t=ge(e);Z(t)&&r.push(t)}let i=b(e);if(i)for(let e=i.length-1;e>=0;--e)r.push(i[e])}},Sn=function(e){xn(e,e=>{N(e)===j.element&&bn(e)})},Cn=function(e){let t=[];return xn(e,e=>{t.push(e)},!0),t},wn=function(e,t){let n=se();_(Cn(e),e=>{N(e)===j.element&&ce(n,e)}),_(t,e=>{N(e)===j.element&&!le(n,e)&&bn(e)})},Tn=function(e,n){let r=!1;return _(t.removed,t=>{t.element&&(r=r||t.element===e,Sn(t.element))}),wn(e,n),r},En=function(e,t){let n=G,r=null,i=()=>(r||(r=se(),_(t,e=>{ce(r,e)})),r);for(let t=0;;t++){let r=Cn(e),a=[e],o=!1;if(_(r,e=>{N(e)===j.documentFragment?ie(a,e):!o&&!le(n,e)&&(o=le(i(),e))}),!o)return;if(t>=8)throw T(`the tree kept changing during in-place sanitization; refusing to return it`);_(a,(t,n)=>{Dn(t,n>0,e,i())})}},Dn=function(e,t,n,r){let i=Mn(e),a;for(;a=i.nextNode();)le(r,a)&&!le(G,a)&&(t&&Q(I.uponSanitizeShadowNode,a,null),Hn(a,n),Yn(a,n),Z(a.content)&&Xn(a.content))},On=function(e){G&&ce(G,e)},kn=function(e,t){return H?e===`patchsrc`||e===`for`&&t!==`label`&&t!==`output`:!1},An=function(e){H&&xn(e,e=>{let t=N(e);if(t===j.processingInstruction||t===j.comment&&w(Ue,e.data)){try{g(e)}catch(e){}return!1}if(t===j.element){let t=e,n=Y(Qe(e));try{t.hasAttribute&&t.hasAttribute(`patchsrc`)&&t.removeAttribute(`patchsrc`),t.hasAttribute&&t.hasAttribute(`for`)&&kn(`for`,n)&&t.removeAttribute(`for`)}catch(e){}}return!0})},jn=function(e){let t=null,r=null;if(Pt)e=`<remove></remove>`+e;else{let t=de(e,/^[\r\n\t ]+/);r=t&&t[0]}an===`application/xhtml+xml`&&Yt===J&&(e=`<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>`+e+`</body></html>`);let i=P?at(e):e;if(Yt===J)try{t=new u().parseFromString(i,an)}catch(e){}if(!t||!t.documentElement){t=lt.createDocument(Yt,`template`,null);try{t.documentElement.innerHTML=Xt?F:i}catch(e){}}let a=t.body||t.documentElement;return e&&r&&a.insertBefore(n.createTextNode(r),a.childNodes[0]||null),Yt===J?ft.call(t,U?`html`:`body`)[0]:U?t.documentElement:a},Mn=function(e){let t=_e?_e(e):e.ownerDocument;return ut.call(t||e,e,l.SHOW_ELEMENT|l.SHOW_COMMENT|l.SHOW_TEXT|l.SHOW_PROCESSING_INSTRUCTION|l.SHOW_CDATA_SECTION,null)},Nn=function(e){return e=fe(e,mt,` `),e=fe(e,ht,` `),e=fe(e,gt,` `),e},Pn=function(e){var t;Fn(e);let n=(t=e.querySelectorAll)==null?void 0:t.call(e,`template`);n&&_(n,e=>{Z(e.content)&&Pn(e.content)})},Fn=function(e){e.normalize();let t=_e?_e(e):e.ownerDocument,n=ut.call(t||e,e,l.SHOW_TEXT|l.SHOW_COMMENT|l.SHOW_CDATA_SECTION|l.SHOW_PROCESSING_INSTRUCTION,null),r=n.nextNode();for(;r;)r.data=Nn(r.data),r=n.nextNode()},In=function(e){let t=D?D(e):null;return typeof t!=`string`||Y(t)!==`form`?!1:typeof e.nodeName!=`string`||typeof e.textContent!=`string`||typeof e.removeChild!=`function`||e.attributes!==C(e)||typeof e.removeAttribute!=`function`||typeof e.removeAttributeNode!=`function`||typeof e.getAttributeNode!=`function`||typeof e.setAttribute!=`function`||typeof e.namespaceURI!=`string`||typeof e.insertBefore!=`function`||typeof e.hasChildNodes!=`function`||e.nodeType!==E(e)||e.childNodes!==b(e)},Z=function(e){if(!E||typeof e!=`object`||!e)return!1;try{return E(e)===j.documentFragment}catch(e){return!1}},Ln=function(e){if(!E||typeof e!=`object`||!e)return!1;try{return typeof E(e)==`number`}catch(e){return!1}};function Q(e,n,r){e.length!==0&&_(e,e=>{e.call(t,n,r,sn)})}let Rn=function(e,t){return!!(H&&e.hasChildNodes()&&!Ln(e.firstElementChild)&&w(He,e.textContent)&&w(He,e.innerHTML)||H&&Ke[t]&&N(e)===j.element&&et(e)===J&&(Ln(e.firstElementChild)||typeof e.textContent==`string`&&w(He,e.textContent))||e.nodeType===j.processingInstruction||H&&e.nodeType===j.comment&&w(Ue,e.data))},zn=function(e,t){return e instanceof RegExp?w(e,t):e instanceof Function&&!!e(t,...[...arguments].slice(2))},Bn=function(e,t,n){if(!Tt[t]&&Gn(t)&&zn(z.tagNameCheck,t))return!1;if(Bt&&!q[t]&&!q[y(t)]){let t=x(e),r=b(e);if(r&&t){let i=r.length;for(let a=i-1;a>=0;--a){let i=e===n?ee(r[a],!0):r[a];t.insertBefore(i,he(e))}}}return X(e),!0},Vn=function(e,t,n,r){return e.length===0?t:t===n||t===r?k(t):t},$=function(e,t){return e===t||x(e)!==null?!1:(Vt&&Sn(e),!0)},Hn=function(e,n){if(On(e),Q(I.beforeSanitizeElements,e,null),$(e,n))return!0;if(In(e))return X(e),!0;let r=Y(Qe(e));if(L=Vn(I.uponSanitizeElement,L,Ct,Mt),Q(I.uponSanitizeElement,e,{tagName:r,allowedTags:L}),$(e,n))return!0;if(Rn(e,r))return X(e),!0;if(Tt[r]||!(B.tagCheck instanceof Function&&B.tagCheck(r))&&!L[r]){let t=Bn(e,r,n);return t===!1&&(Q(I.afterSanitizeElements,e,null),$(e,n))?!0:t}if(N(e)===j.element&&!gn(e)||(r===`noscript`||r===`noembed`||r===`noframes`)&&w(We,e.innerHTML))return X(e),!0;if(V&&e.nodeType===j.text){let n=Nn(e.textContent);e.textContent!==n&&(ie(t.removed,{element:e.cloneNode()}),e.textContent=n)}return Q(I.afterSanitizeElements,e,null),$(e,n)},Un=function(e,t,r){if(Et[t]||kn(t,e)||Lt&&(t===`id`||t===`name`)&&(r in n||r in cn))return!1;let i=R[t]||B.attributeCheck instanceof Function&&B.attributeCheck(t,e);return Ot&&w(_t,t)||Dt&&w(vt,t)?!0:i?Gt[t]||w(St,fe(r,bt,``))||(t===`src`||t===`xlink:href`||t===`href`)&&e!==`script`&&pe(r,`data:`)===0&&Ut[e]||kt&&!w(yt,fe(r,bt,``))?!0:!r:Gn(e)&&zn(z.tagNameCheck,e)&&zn(z.attributeNameCheck,t,e)||t===`is`&&z.allowCustomizedBuiltInElements&&zn(z.tagNameCheck,r)},Wn=O({},[`annotation-xml`,`color-profile`,`font-face`,`font-face-format`,`font-face-name`,`font-face-src`,`font-face-uri`,`missing-glyph`]),Gn=function(e){return!Wn[y(e)]&&w(xt,e)},Kn=function(e,t,n,r){if(P&&typeof d==`object`&&typeof d.getAttributeType==`function`&&!n)switch(d.getAttributeType(e,t)){case`TrustedHTML`:return at(r);case`TrustedScriptURL`:return ot(r)}return r},qn=function(e,t,n,r){try{return n?e.setAttributeNS(n,t,r):e.setAttribute(t,r),!In(e)||(X(e),!1)}catch(n){return yn(t,e),!1}},Jn=function(e,t){return H&&w(/((--!?|])>)|<\/(style|script|title|xmp|textarea|noscript|iframe|noembed|noframes)/i,t)?!0:y(e)===`attributename`&&de(t,`href`)!==null},Yn=function(e,n){if(Q(I.beforeSanitizeAttributes,e,null),$(e,n))return;let r=e.attributes;if(!r||In(e))return;R=Vn(I.uponSanitizeAttribute,R,wt,Nt);let i={attrName:``,attrValue:``,keepAttr:!0,allowedAttributes:R,forceKeepAttr:void 0},a=r.length,o=Y(e.nodeName);for(;a--;){let n=r[a],s=n.name,c=n.namespaceURI,l=n.value,u=Y(s),d=l,f=s===`value`?d:me(d),p=!1;i.attrName=u,i.attrValue=f,i.keepAttr=!0,i.forceKeepAttr=void 0,Q(I.uponSanitizeAttribute,e,i),f=i.attrValue,Rt&&(u===`id`||u===`name`)&&pe(f,zt)!==0&&(yn(s,e,n),f=zt+f,p=!0),Jn(s,f)?yn(s,e,n):i.forceKeepAttr||(i.keepAttr?!At&&w(Ge,f)?yn(s,e,n):(V&&(f=Nn(f)),Un(o,u,f)?(f=Kn(o,u,c,f),f!==d&&qn(e,s,c,f)&&p&&re(t.removed)):yn(s,e,n)):yn(s,e,n))}Q(I.afterSanitizeAttributes,e,null),$(e,n)},Xn=function(e){let t=null,n=Mn(e);for(Q(I.beforeSanitizeShadowDOM,e,null);t=n.nextNode();)if(Q(I.uponSanitizeShadowNode,t,null),Hn(t,e),Yn(t,e),Z(t.content)&&Xn(t.content),N(t)===j.element){let e=ge(t);Z(e)&&(Zn(e),Xn(e))}V&&Fn(e),Q(I.afterSanitizeShadowDOM,e,null)},Zn=function(e){let t=[{node:e,shadow:null}];for(;t.length>0;){let e=t.pop();if(e.shadow){Xn(e.shadow);continue}let n=e.node,r=N(n)===j.element,i=b(n);if(i)for(let e=i.length-1;e>=0;--e)t.push({node:i[e],shadow:null});if(r){let e=D?D(n):null;if(typeof e==`string`&&Y(e)===`template`){let e=n.content;Z(e)&&t.push({node:e,shadow:null})}}if(r){let e=ge(n);Z(e)&&t.push({node:null,shadow:e},{node:e,shadow:null})}}};return t.sanitize=function(e){let n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},i=null,a=null,o=null,s=null;if(Xt=!e,Xt&&(e=`\x3c!-->`),typeof e!=`string`&&!Ln(e)&&(e=ve(e),typeof e!=`string`))throw T(`dirty is not a string, aborting`);if(!t.isSupported)return e;jt?(L=Mt,R=Nt):un(n),(I.uponSanitizeElement.length>0||I.uponSanitizeAttribute.length>0)&&(L=k(L)),I.uponSanitizeAttribute.length>0&&(R=k(R)),t.removed=[];let c=Vt&&typeof e!=`string`&&Ln(e),l=[],u=G;if(c){An(e);let t=Qe(e);if(typeof t==`string`){let n=Y(t);if(!L[n]||Tt[n])throw vn(e),T(`root node is forbidden and cannot be sanitized in-place`)}if(In(e))throw vn(e),T(`root node is clobbered and cannot be sanitized in-place`);l=Cn(e),G=se()}else if(Ln(e))i=jn(`\x3c!---->`),a=i.ownerDocument.importNode(e,!0),a.nodeType===j.element&&a.nodeName===`BODY`||a.nodeName===`HTML`?i=a:i.appendChild(a),Zn(i);else{if(!W&&!V&&!U&&e.indexOf(`<`)===-1)return P&&It?at(e):e;if(i=jn(e),!i)return W?null:It?F:``}i&&Pt&&X(i.firstChild);let d=c?e:i;try{c&&Zn(e);let t=Mn(d);for(;o=t.nextNode();)Hn(o,d),Yn(o,d),Z(o.content)&&Xn(o.content);c&&En(e,l)}catch(t){throw c&&(vn(e),Tn(e,l)),t}finally{G=u}if(c){if(Tn(e,l))throw T(`a node selected for removal could not be safely returned; refusing to sanitize in place`);return V&&Pn(e),e}if(W){if(V&&Pn(i),Ft)for(s=dt.call(i.ownerDocument);i.firstChild;)s.appendChild(i.firstChild);else s=i;return(R.shadowroot||R.shadowrootmode)&&(s=pt.call(r,s,!0)),s}let f=U?i.outerHTML:i.innerHTML;return U&&L[`!doctype`]&&i.ownerDocument&&i.ownerDocument.doctype&&i.ownerDocument.doctype.name&&w(Be,i.ownerDocument.doctype.name)&&(f=`<!DOCTYPE `+i.ownerDocument.doctype.name+`>
`+f),V&&(f=Nn(f)),P&&It?at(f):f},t.setConfig=function(){let e=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};un(e),jt=!0,Mt=L,Nt=R},t.clearConfig=function(){sn=null,jt=!1,Mt=null,Nt=null,P=tt,F=``},t.isValidAttribute=function(e,t,n){sn||un({});let r=Y(e),i=Y(t);return typeof n==`string`&&(Jn(t,n)||!At&&w(Ge,n))?!1:Un(r,i,n)},t.addHook=function(e,t){typeof t==`function`&&S(I,e)&&ie(I[e],t)},t.removeHook=function(e,t){if(S(I,e)){if(t!==void 0){let n=ne(I[e],t);return n===-1?void 0:oe(I[e],n,1)[0]}return re(I[e])}},t.removeHooks=function(e){S(I,e)&&(I[e]=[])},t.removeAllHooks=function(){I=Ye()},t}return Ze()});
;
/*!
  Highlight.js v11.12.0 (git: f7f7d3803b)
  (c) 2006-2026 Josh Goebel <hello@joshgoebel.com> and other contributors
  License: BSD-3-Clause
 */
var hljs=function(){"use strict";function e(n){
return n instanceof Map?n.clear=n.delete=n.set=()=>{
throw Error("map is read-only")}:n instanceof Set&&(n.add=n.clear=n.delete=()=>{
throw Error("set is read-only")
}),Object.freeze(n),Object.getOwnPropertyNames(n).forEach(t=>{
const a=n[t],i=typeof a;"object"!==i&&"function"!==i||Object.isFrozen(a)||e(a)
}),n}class n{constructor(e){
void 0===e.data&&(e.data={}),this.data=e.data,this.isMatchIgnored=!1}
ignoreMatch(){this.isMatchIgnored=!0}}function t(e){
return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;")
}function a(e,...n){const t=Object.create(null);for(const n in e)t[n]=e[n]
;return n.forEach(e=>{for(const n in e)t[n]=e[n]}),t}const i=e=>!!e.scope
;class r{constructor(e,n){
this.buffer="",this.classPrefix=n.classPrefix,e.walk(this)}addText(e){
this.buffer+=t(e)}openNode(e){if(!i(e))return;const n=((e,{prefix:n})=>{
if(e.startsWith("language:"))return e.replace("language:","language-")
;if(e.includes(".")){const t=e.split(".")
;return[`${n}${t.shift()}`,...t.map((e,n)=>`${e}${"_".repeat(n+1)}`)].join(" ")}
return`${n}${e}`})(e.scope,{prefix:this.classPrefix});this.span(n)}closeNode(e){
i(e)&&(this.buffer+="</span>")}value(){return this.buffer}span(e){
this.buffer+=`<span class="${e}">`}}const s=(e={})=>{const n={children:[]}
;return Object.assign(n,e),n};class o{constructor(){
this.rootNode=s(),this.stack=[this.rootNode]}get top(){
return this.stack[this.stack.length-1]}get root(){return this.rootNode}add(e){
this.top.children.push(e)}openNode(e){const n=s({scope:e})
;this.add(n),this.stack.push(n)}closeNode(){
if(this.stack.length>1)return this.stack.pop()}closeAllNodes(){
for(;this.closeNode(););}toJSON(){return JSON.stringify(this.rootNode,null,4)}
walk(e){return this.constructor._walk(e,this.rootNode)}static _walk(e,n){
return"string"==typeof n?e.addText(n):n.children&&(e.openNode(n),
n.children.forEach(n=>this._walk(e,n)),e.closeNode(n)),e}static _collapse(e){
"string"!=typeof e&&e.children&&(e.children.every(e=>"string"==typeof e)?e.children=[e.children.join("")]:e.children.forEach(e=>{
o._collapse(e)}))}}class c extends o{constructor(e){super(),this.options=e}
addText(e){""!==e&&this.add(e)}startScope(e){this.openNode(e)}endScope(){
this.closeNode()}__addSublanguage(e,n){const t=e.root
;n&&(t.scope="language:"+n),this.add(t)}toHTML(){
return new r(this,this.options).value()}finalize(){
return this.closeAllNodes(),!0}}function l(e){
return e?"string"==typeof e?e:e.source:null}function d(e){return b("(?=",e,")")}
function g(e){return b("(?:",e,")*")}function u(e){return b("(?:",e,")?")}
function b(...e){return e.map(e=>l(e)).join("")}function m(...e){const n=(e=>{
const n=e[e.length-1]
;return"object"==typeof n&&n.constructor===Object?(e.splice(e.length-1,1),n):{}
})(e);return"("+(n.capture?"":"?:")+e.map(e=>l(e)).join("|")+")"}function p(e){
return RegExp(e.toString()+"|").exec("").length-1}
const _=RegExp(m(/\[(?:[^\\\]]|\\.)*\]/,/\(\?<(?![=!])[^>]+>/,/\(\?'[^']+'/,/\(\??/,/\\([1-9][0-9]*)/,/\\./))
;function h(e,{joinWith:n}){let t=0;return e.map(e=>{t+=1;const n=t
;let a=l(e),i="";for(;a.length>0;){const e=_.exec(a);if(!e){i+=a;break}
i+=a.substring(0,e.index),
a=a.substring(e.index+e[0].length),"\\"===e[0][0]&&e[1]?i+="\\"+(Number(e[1])+n):(i+=e[0],
("("===e[0]||/^\(\?[<']/.test(e[0]))&&t++)}return i}).map(e=>`(${e})`).join(n)}
const f="[a-zA-Z]\\w*",E="[a-zA-Z_]\\w*",y="\\b\\d+(\\.\\d+)?",w="(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",v="\\b(0b[01]+)",N={
begin:"\\\\[\\s\\S]",relevance:0},k={scope:"string",begin:"'",end:"'",
illegal:"\\n",contains:[N]},x={scope:"string",begin:'"',end:'"',illegal:"\\n",
contains:[N]},O=(e,n,t={})=>{const i=a({scope:"comment",begin:e,end:n,
contains:[]},t);i.contains.push({scope:"doctag",
begin:"[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
end:/(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,excludeBegin:!0,relevance:0})
;const r=m("I","a","is","so","us","to","at","if","in","it","on",/[A-Za-z]+['](d|ve|re|ll|t|s|n)/,/[A-Za-z]+[-][a-z]+/,/[A-Za-z][a-z]{2,}/)
;return i.contains.push({begin:b(/[ ]+/,"(",r,/[.]?[:]?([.][ ]|[ ])/,"){3}")}),i
},M=O("//","$"),A=O("/\\*","\\*/"),S=O("#","$");var C=Object.freeze({
__proto__:null,APOS_STRING_MODE:k,BACKSLASH_ESCAPE:N,BINARY_NUMBER_MODE:{
scope:"number",begin:v,relevance:0},BINARY_NUMBER_RE:v,COMMENT:O,
C_BLOCK_COMMENT_MODE:A,C_LINE_COMMENT_MODE:M,C_NUMBER_MODE:{scope:"number",
begin:w,relevance:0},C_NUMBER_RE:w,END_SAME_AS_BEGIN:e=>Object.assign(e,{
"on:begin":(e,n)=>{n.data._beginMatch=e[1]},"on:end":(e,n)=>{
n.data._beginMatch!==e[1]&&n.ignoreMatch()}}),HASH_COMMENT_MODE:S,IDENT_RE:f,
MATCH_NOTHING_RE:/\b\B/,METHOD_GUARD:{begin:"\\.\\s*"+E,relevance:0},
NUMBER_MODE:{scope:"number",begin:y,relevance:0},NUMBER_RE:y,
PHRASAL_WORDS_MODE:{
begin:/\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/
},QUOTE_STRING_MODE:x,REGEXP_MODE:{scope:"regexp",begin:/\/(?=[^/\n]*\/)/,
end:/\/[gimuy]*/,contains:[N,{begin:/\[/,end:/\]/,relevance:0,contains:[N]}]},
RE_STARTERS_RE:"!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",
SHEBANG:(e={})=>{const n=/^#![ ]*\//
;return e.binary&&(e.begin=b(n,/.*\b/,e.binary,/\b.*/)),a({scope:"meta",begin:n,
end:/$/,relevance:0,"on:begin":(e,n)=>{0!==e.index&&n.ignoreMatch()}},e)},
TITLE_MODE:{scope:"title",begin:f,relevance:0},UNDERSCORE_IDENT_RE:E,
UNDERSCORE_TITLE_MODE:{scope:"title",begin:E,relevance:0}});function T(e,n){
"."===e.input[e.index-1]&&n.ignoreMatch()}function R(e,n){
void 0!==e.className&&(e.scope=e.className,delete e.className)}function D(e,n){
n&&e.beginKeywords&&(e.begin="\\b("+e.beginKeywords.split(" ").join("|")+")(?!\\.)(?=\\b|\\s)",
e.__beforeBegin=T,e.keywords=e.keywords||e.beginKeywords,delete e.beginKeywords,
void 0===e.relevance&&(e.relevance=0))}function I(e,n){
Array.isArray(e.illegal)&&(e.illegal=m(...e.illegal))}function L(e,n){
if(e.match){
if(e.begin||e.end)throw Error("begin & end are not supported with match")
;e.begin=e.match,delete e.match}}function B(e,n){
void 0===e.relevance&&(e.relevance=1)}const F=(e,n)=>{if(!e.beforeMatch)return
;if(e.starts)throw Error("beforeMatch cannot be used with starts")
;const t=Object.assign({},e);Object.keys(e).forEach(n=>{delete e[n]
}),e.keywords=t.keywords,e.begin=b(t.beforeMatch,d(t.begin)),e.starts={
relevance:0,contains:[Object.assign(t,{endsParent:!0})]
},e.relevance=0,delete t.beforeMatch
},$=["of","and","for","in","not","or","if","then","parent","list","value"]
;function z(e,n,t="keyword"){const a=Object.create(null)
;return"string"==typeof e?i(t,e.split(" ")):Array.isArray(e)?i(t,e):Object.keys(e).forEach(t=>{
Object.assign(a,z(e[t],n,t))}),a;function i(e,t){
n&&(t=t.map(e=>e.toLowerCase())),t.forEach(n=>{const t=n.split("|")
;a[t[0]]=[e,j(t[0],t[1])]})}}function j(e,n){
return n?Number(n):(e=>$.includes(e.toLowerCase()))(e)?0:1}const U={},P=e=>{
console.error(e)},K=(e,...n)=>{console.log("WARN: "+e,...n)},H=(e,n)=>{
U[`${e}/${n}`]||(console.log(`Deprecated as of ${e}. ${n}`),U[`${e}/${n}`]=!0)
},q=Error();function G(e,n,{key:t}){let a=0;const i=e[t],r={},s={}
;for(let e=1;e<=n.length;e++)s[e+a]=i[e],r[e+a]=!0,a+=p(n[e-1])
;e[t]=s,e[t]._emit=r,e[t]._multi=!0}function Z(e){(e=>{
e.scope&&"object"==typeof e.scope&&null!==e.scope&&(e.beginScope=e.scope,
delete e.scope)})(e),"string"==typeof e.beginScope&&(e.beginScope={
_wrap:e.beginScope}),"string"==typeof e.endScope&&(e.endScope={_wrap:e.endScope
}),(e=>{if(Array.isArray(e.begin)){
if(e.skip||e.excludeBegin||e.returnBegin)throw P("skip, excludeBegin, returnBegin not compatible with beginScope: {}"),
q
;if("object"!=typeof e.beginScope||null===e.beginScope)throw P("beginScope must be object"),
q;G(e,e.begin,{key:"beginScope"}),e.begin=h(e.begin,{joinWith:""})}})(e),(e=>{
if(Array.isArray(e.end)){
if(e.skip||e.excludeEnd||e.returnEnd)throw P("skip, excludeEnd, returnEnd not compatible with endScope: {}"),
q
;if("object"!=typeof e.endScope||null===e.endScope)throw P("endScope must be object"),
q;G(e,e.end,{key:"endScope"}),e.end=h(e.end,{joinWith:""})}})(e)}function W(e){
function n(n,t){
return RegExp(l(n),"m"+(e.case_insensitive?"i":"")+(e.unicodeRegex?"u":"")+(t?"g":""))
}class t{constructor(){
this.matchIndexes={},this.regexes=[],this.matchAt=1,this.position=0}
addRule(e,n){
n.position=this.position++,this.matchIndexes[this.matchAt]=n,this.regexes.push([n,e]),
this.matchAt+=p(e)+1}compile(){0===this.regexes.length&&(this.exec=()=>null)
;const e=this.regexes.map(e=>e[1]);this.matcherRe=n(h(e,{joinWith:"|"
}),!0),this.lastIndex=0}exec(e){this.matcherRe.lastIndex=this.lastIndex
;const n=this.matcherRe.exec(e);if(!n)return null
;const t=n.findIndex((e,n)=>n>0&&void 0!==e),a=this.matchIndexes[t]
;return n.splice(0,t),Object.assign(n,a)}}class i{constructor(){
this.rules=[],this.multiRegexes=[],
this.count=0,this.lastIndex=0,this.regexIndex=0}getMatcher(e){
if(this.multiRegexes[e])return this.multiRegexes[e];const n=new t
;return this.rules.slice(e).forEach(([e,t])=>n.addRule(e,t)),
n.compile(),this.multiRegexes[e]=n,n}resumingScanAtSamePosition(){
return 0!==this.regexIndex}considerAll(){this.regexIndex=0}addRule(e,n){
this.rules.push([e,n]),"begin"===n.type&&this.count++}exec(e){
const n=this.getMatcher(this.regexIndex);n.lastIndex=this.lastIndex
;let t=n.exec(e)
;if(this.resumingScanAtSamePosition())if(t&&t.index===this.lastIndex);else{
const n=this.getMatcher(0);n.lastIndex=this.lastIndex+1,t=n.exec(e)}
return t&&(this.regexIndex+=t.position+1,
this.regexIndex===this.count&&this.considerAll()),t}}
if(e.compilerExtensions||(e.compilerExtensions=[]),
e.contains&&e.contains.includes("self"))throw Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.")
;return e.classNameAliases=a(e.classNameAliases||{}),function t(r,s){const o=r
;if(r.isCompiled)return o
;[R,L,Z,F].forEach(e=>e(r,s)),e.compilerExtensions.forEach(e=>e(r,s)),
r.__beforeBegin=null,[D,I,B].forEach(e=>e(r,s)),r.isCompiled=!0;let c=null
;return"object"==typeof r.keywords&&r.keywords.$pattern&&(r.keywords=Object.assign({},r.keywords),
c=r.keywords.$pattern,
delete r.keywords.$pattern),c=c||/\w+/,r.keywords&&(r.keywords=z(r.keywords,e.case_insensitive)),
o.keywordPatternRe=n(c,!0),
s&&(r.begin||(r.begin=/\B|\b/),o.beginRe=n(o.begin),r.end||r.endsWithParent||(r.end=/\B|\b/),
r.end&&(o.endRe=n(o.end)),
o.terminatorEnd=l(o.end)||"",r.endsWithParent&&s.terminatorEnd&&(o.terminatorEnd+=(r.end?"|":"")+s.terminatorEnd)),
r.illegal&&(o.illegalRe=n(r.illegal)),
r.contains||(r.contains=[]),r.contains=[].concat(...r.contains.map(e=>(e=>(e.variants&&!e.cachedVariants&&(e.cachedVariants=e.variants.map(n=>a(e,{
variants:null},n))),e.cachedVariants?e.cachedVariants:Q(e)?a(e,{
starts:e.starts?a(e.starts):null
}):Object.isFrozen(e)?a(e):e))("self"===e?r:e))),r.contains.forEach(e=>{t(e,o)
}),r.starts&&t(r.starts,s),o.matcher=(e=>{const n=new i
;return e.contains.forEach(e=>n.addRule(e.begin,{rule:e,type:"begin"
})),e.terminatorEnd&&n.addRule(e.terminatorEnd,{type:"end"
}),e.illegal&&n.addRule(e.illegal,{type:"illegal"}),n})(o),o}(e)}function Q(e){
return!!e&&(e.endsWithParent||Q(e.starts))}class X extends Error{
constructor(e,n){super(e),this.name="HTMLInjectionError",this.html=n}}
const V=t,J=a,Y=Symbol("nomatch"),ee=t=>{
const a=Object.create(null),i=Object.create(null),r=[];let s=!0
;const o="Could not find the language '{}', did you forget to load/include a language module?",l={
disableAutodetect:!0,name:"Plain text",contains:[]};let p={
ignoreUnescapedHTML:!1,throwUnescapedHTML:!1,noHighlightRe:/^(no-?highlight)$/i,
languageDetectRe:/\blang(?:uage)?-([\w-]+)\b/i,classPrefix:"hljs-",
cssSelector:"pre code",languages:null,__emitter:c};function _(e){
return p.noHighlightRe.test(e)}function h(e,n,t){let a="",i=""
;"object"==typeof n?(a=e,
t=n.ignoreIllegals,i=n.language):(H("10.7.0","highlight(lang, code, ...args) has been deprecated."),
H("10.7.0","Please use highlight(code, options) instead.\nhttps://github.com/highlightjs/highlight.js/issues/2277"),
i=e,a=n),void 0===t&&(t=!0);const r={code:a,language:i};O("before:highlight",r)
;const s=r.result?r.result:f(r.language,r.code,t)
;return s.code=r.code,O("after:highlight",s),s}function f(e,t,i,r){
const c=Object.create(null);function l(e,n){return e.keywords[n]}function d(){
if(!M.keywords)return void S.addText(C);let e=0;M.keywordPatternRe.lastIndex=0
;let n=M.keywordPatternRe.exec(C),t="";for(;n;){t+=C.substring(e,n.index)
;const a=k.case_insensitive?n[0].toLowerCase():n[0],i=l(M,a);if(i){const[e,r]=i
;if(S.addText(t),
t="",c[a]=(c[a]||0)+1,c[a]<=7&&(T+=r),e.startsWith("_"))t+=n[0];else{
const t=k.classNameAliases[e]||e;u(n[0],t)}}else t+=n[0]
;e=M.keywordPatternRe.lastIndex,n=M.keywordPatternRe.exec(C)}
t+=C.substring(e),S.addText(t)}function g(){null!=M.subLanguage?(()=>{
if(""===C)return;let e=null;if("string"==typeof M.subLanguage){
if(!a[M.subLanguage])return void S.addText(C)
;e=f(M.subLanguage,C,!0,A[M.subLanguage]),A[M.subLanguage]=e._top
}else e=E(C,M.subLanguage.length?M.subLanguage:null)
;M.relevance>0&&(T+=e.relevance),S.__addSublanguage(e._emitter,e.language)
})():d(),C=""}function u(e,n){
""!==e&&(S.startScope(n),S.addText(e),S.endScope())}function b(e,n){let t=1
;const a=n.length-1;for(;t<=a;){if(!e._emit[t]){t++;continue}
const a=k.classNameAliases[e[t]]||e[t],i=n[t];a?u(i,a):(C=i,d(),C=""),t++}}
function m(e,n){
return e.scope&&"string"==typeof e.scope&&S.openNode(k.classNameAliases[e.scope]||e.scope),
e.beginScope&&(e.beginScope._wrap?(u(C,k.classNameAliases[e.beginScope._wrap]||e.beginScope._wrap),
C=""):e.beginScope._multi&&(b(e.beginScope,n),C="")),M=Object.create(e,{parent:{
value:M}}),M}function _(e,t,a){let i=((e,n)=>{const t=e&&e.exec(n)
;return t&&0===t.index})(e.endRe,a);if(i){if(e["on:end"]){const a=new n(e)
;e["on:end"](t,a),a.isMatchIgnored&&(i=!1)}if(i){
for(;e.endsParent&&e.parent;)e=e.parent;return e}}
if(e.endsWithParent)return _(e.parent,t,a)}function h(e){
return 0===M.matcher.regexIndex?(C+=e[0],1):(I=!0,0)}function y(e){
const n=e[0],a=t.substring(e.index),i=_(M,e,a);if(!i)return Y;const r=M
;M.endScope&&M.endScope._wrap?(g(),
u(n,M.endScope._wrap)):M.endScope&&M.endScope._multi?(g(),
b(M.endScope,e)):r.skip?C+=n:(r.returnEnd||r.excludeEnd||(C+=n),
g(),r.excludeEnd&&(C=n));do{
M.scope&&S.closeNode(),M.skip||M.subLanguage||(T+=M.relevance),M=M.parent
}while(M!==i.parent);return i.starts&&m(i.starts,e),r.returnEnd?0:n.length}
let w={};function v(a,r){const o=r&&r[0];if(C+=a,null==o)return g(),0
;if("begin"===w.type&&"end"===r.type&&w.index===r.index&&""===o){
if(C+=t.slice(r.index,r.index+1),!s){const n=Error(`0 width match regex (${e})`)
;throw n.languageName=e,n.badRule=w.rule,n}return 1}
if(w=r,"begin"===r.type)return(e=>{
const t=e[0],a=e.rule,i=new n(a),r=[a.__beforeBegin,a["on:begin"]]
;for(const n of r)if(n&&(n(e,i),i.isMatchIgnored))return h(t)
;return a.skip?C+=t:(a.excludeBegin&&(C+=t),
g(),a.returnBegin||a.excludeBegin||(C=t)),m(a,e),a.returnBegin?0:t.length})(r)
;if("illegal"===r.type&&!i){
const e=Error('Illegal lexeme "'+o+'" for mode "'+(M.scope||"<unnamed>")+'"')
;throw e.mode=M,e}if("end"===r.type){const e=y(r);if(e!==Y)return e}
if("illegal"===r.type&&""===o)return r.index===t.length||(C+="\n"),1
;if(D>1e5&&D>3*r.index)throw Error("potential infinite loop, way more iterations than matches")
;return C+=o,o.length}const k=N(e)
;if(!k)throw P(o.replace("{}",e)),Error('Unknown language: "'+e+'"')
;const x=W(k);let O="",M=r||x;const A={},S=new p.__emitter(p);(()=>{const e=[]
;for(let n=M;n!==k;n=n.parent)n.scope&&e.unshift(n.scope)
;e.forEach(e=>S.openNode(e))})();let C="",T=0,R=0,D=0,I=!1;try{
if(k.__emitTokens)k.__emitTokens(t,S);else{for(M.matcher.considerAll();;){
D++,I?I=!1:M.matcher.considerAll(),M.matcher.lastIndex=R
;const e=M.matcher.exec(t);if(!e)break;const n=v(t.substring(R,e.index),e)
;R=e.index+n}v(t.substring(R))}return S.finalize(),O=S.toHTML(),{language:e,
value:O,relevance:T,illegal:!1,_emitter:S,_top:M}}catch(n){
if(n.message&&n.message.includes("Illegal"))return{language:e,value:V(t),
illegal:!0,relevance:0,_illegalBy:{message:n.message,index:R,
context:t.slice(R-100,R+100),mode:n.mode,resultSoFar:O},_emitter:S};if(s)return{
language:e,value:V(t),illegal:!1,relevance:0,errorRaised:n,_emitter:S,_top:M}
;throw n}}function E(e,n){n=n||p.languages||Object.keys(a);const t=(e=>{
const n={value:V(e),illegal:!1,relevance:0,_top:l,_emitter:new p.__emitter(p)}
;return n._emitter.addText(e),n})(e),i=n.filter(N).filter(x).map(n=>f(n,e,!1))
;i.unshift(t);const r=i.sort((e,n)=>{
if(e.relevance!==n.relevance)return n.relevance-e.relevance
;if(e.language&&n.language){if(N(e.language).supersetOf===n.language)return 1
;if(N(n.language).supersetOf===e.language)return-1}return 0}),[s,o]=r,c=s
;return c.secondBest=o,c}function y(e){let n=null;const t=(e=>{
let n=e.className+" ";n+=e.parentNode?e.parentNode.className:""
;const t=p.languageDetectRe.exec(n);if(t){const n=N(t[1])
;return n||(K(o.replace("{}",t[1])),
K("Falling back to no-highlight mode for this block.",e)),n?t[1]:"no-highlight"}
return n.split(/\s+/).find(e=>_(e)||N(e))})(e);if(_(t))return
;if(O("before:highlightElement",{el:e,language:t
}),e.dataset.highlighted)return void console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.",e)
;if(e.children.length>0&&(p.ignoreUnescapedHTML||(console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk."),
console.warn("https://github.com/highlightjs/highlight.js/wiki/security"),
console.warn("The element with unescaped HTML:"),
console.warn(e)),p.throwUnescapedHTML))throw new X("One of your code blocks includes unescaped HTML.",e.innerHTML)
;n=e;const a=n.textContent,r=t?h(a,{language:t,ignoreIllegals:!0}):E(a)
;e.innerHTML=r.value,e.dataset.highlighted="yes",((e,n,t)=>{const a=n&&i[n]||t
;e.classList.add("hljs"),e.classList.add("language-"+a)
})(e,t,r.language),e.result={language:r.language,re:r.relevance,
relevance:r.relevance},r.secondBest&&(e.secondBest={
language:r.secondBest.language,relevance:r.secondBest.relevance
}),O("after:highlightElement",{el:e,result:r,text:a})}let w=!1;function v(){
if("loading"===document.readyState)return w||window.addEventListener("DOMContentLoaded",()=>{
v()},!1),void(w=!0);document.querySelectorAll(p.cssSelector).forEach(y)}
function N(e){return e=(e||"").toLowerCase(),a[e]||a[i[e]]}
function k(e,{languageName:n}){"string"==typeof e&&(e=[e]),e.forEach(e=>{
i[e.toLowerCase()]=n})}function x(e){const n=N(e);return n&&!n.disableAutodetect
}function O(e,n){const t=e;r.forEach(e=>{e[t]&&e[t](n)})}Object.assign(t,{
highlight:h,highlightAuto:E,highlightAll:v,highlightElement:y,
highlightBlock:e=>(H("10.7.0","highlightBlock will be removed entirely in v12.0"),
H("10.7.0","Please use highlightElement now."),y(e)),configure:e=>{p=J(p,e)},
initHighlighting:()=>{
v(),H("10.6.0","initHighlighting() deprecated.  Use highlightAll() now.")},
initHighlightingOnLoad:()=>{
v(),H("10.6.0","initHighlightingOnLoad() deprecated.  Use highlightAll() now.")
},registerLanguage:(e,n)=>{let i=null;try{i=n(t)}catch(n){
if(P("Language definition for '{}' could not be registered.".replace("{}",e)),
!s)throw n;P(n),i=l}
i.name||(i.name=e),a[e]=i,i.rawDefinition=n.bind(null,t),i.aliases&&k(i.aliases,{
languageName:e})},unregisterLanguage:e=>{delete a[e]
;for(const n of Object.keys(i))i[n]===e&&delete i[n]},
listLanguages:()=>Object.keys(a),getLanguage:N,registerAliases:k,
autoDetection:x,inherit:J,addPlugin:e=>{(e=>{
e["before:highlightBlock"]&&!e["before:highlightElement"]&&(e["before:highlightElement"]=n=>{
e["before:highlightBlock"](Object.assign({block:n.el},n))
}),e["after:highlightBlock"]&&!e["after:highlightElement"]&&(e["after:highlightElement"]=n=>{
e["after:highlightBlock"](Object.assign({block:n.el},n))})})(e),r.push(e)},
removePlugin:e=>{const n=r.indexOf(e);-1!==n&&r.splice(n,1)}}),t.debugMode=()=>{
s=!1},t.safeMode=()=>{s=!0},t.versionString="11.12.0",t.regex={concat:b,
lookahead:d,either:m,optional:u,anyNumberOfTimes:g}
;for(const n in C)"object"==typeof C[n]&&e(C[n]);return Object.assign(t,C),t
},ne=ee({});ne.newInstance=()=>ee({});const te="[A-Za-z$_][0-9A-Za-z$_]*",ae={
scope:"number",
match:"([-+]?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)|NaN|[-+]?Infinity",
relevance:0
},ie=["as","in","of","if","for","while","finally","var","new","function","do","return","void","else","break","catch","instanceof","with","throw","case","default","try","switch","continue","typeof","delete","let","yield","const","class","debugger","async","await","static","import","from","export","extends","using"],re=["true","false","null","undefined","NaN","Infinity"],se=["Object","Function","Boolean","Symbol","Math","Date","Number","BigInt","String","RegExp","Array","Float32Array","Float64Array","Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Int32Array","Uint16Array","Uint32Array","BigInt64Array","BigUint64Array","Set","Map","WeakSet","WeakMap","ArrayBuffer","SharedArrayBuffer","Atomics","DataView","JSON","Promise","Generator","GeneratorFunction","AsyncFunction","Reflect","Proxy","Intl","WebAssembly"],oe=["Error","EvalError","InternalError","RangeError","ReferenceError","SyntaxError","TypeError","URIError"],ce=["setInterval","setTimeout","clearInterval","clearTimeout","require","exports","eval","isFinite","isNaN","parseFloat","parseInt","decodeURI","decodeURIComponent","encodeURI","encodeURIComponent","escape","unescape"],le=["arguments","this","super","console","window","document","localStorage","sessionStorage","module","self","global"],de=[].concat(ce,se,oe)
;function ge(e){const n=e.regex,t=te,a={begin:/<[A-Za-z0-9\\._:-]+/,
end:/\/[A-Za-z0-9\\._:-]+>|\/>/,isTrulyOpeningTag:(e,n)=>{
const t=e[0].length+e.index,a=e.input[t]
;if("<"===a||","===a)return void n.ignoreMatch();let i
;">"===a&&(((e,{after:n})=>{const t="</"+e[0].slice(1)
;return-1!==e.input.indexOf(t,n)})(e,{after:t})||n.ignoreMatch())
;const r=e.input.substring(t)
;((i=r.match(/^\s*=/))||(i=r.match(/^\s+extends\s+/))&&0===i.index)&&n.ignoreMatch()
}},i={$pattern:te,keyword:ie,literal:re,built_in:de,"variable.language":le
},r="[0-9](_?[0-9])*",s=`\\.(${r})`,o="0|[1-9](_?[0-9])*|0[0-7]*[89][0-9]*",c={
className:"number",variants:[{
begin:`(\\b(${o})((${s})|\\.)?|(${s}))[eE][+-]?(${r})\\b`},{
begin:`\\b(${o})\\b((${s})\\b|\\.)?|(${s})\\b`},{
begin:"\\b(0|[1-9](_?[0-9])*)n\\b"},{
begin:"\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*n?\\b"},{
begin:"\\b0[bB][0-1](_?[0-1])*n?\\b"},{begin:"\\b0[oO][0-7](_?[0-7])*n?\\b"},{
begin:"\\b0[0-7]+n?\\b"}],relevance:0},l={className:"subst",begin:"\\$\\{",
end:"\\}",keywords:i,contains:[]},d={begin:".?html`",end:"",starts:{end:"`",
returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,l],subLanguage:"xml"}},g={
begin:".?css`",end:"",starts:{end:"`",returnEnd:!1,
contains:[e.BACKSLASH_ESCAPE,l],subLanguage:"css"}},u={begin:".?gql`",end:"",
starts:{end:"`",returnEnd:!1,contains:[e.BACKSLASH_ESCAPE,l],
subLanguage:"graphql"}},b={className:"string",begin:"`",end:"`",
contains:[e.BACKSLASH_ESCAPE,l]},m={className:"comment",
variants:[e.COMMENT(/\/\*\*(?!\/)/,"\\*/",{relevance:0,contains:[{
begin:"(?=@[A-Za-z]+)",relevance:0,contains:[{className:"doctag",
begin:"@[A-Za-z]+"},{className:"type",begin:"\\{",end:"\\}",excludeEnd:!0,
excludeBegin:!0,relevance:0},{className:"variable",begin:t+"(?=\\s*(-)|$)",
endsParent:!0,relevance:0},{begin:/(?=[^\n])\s/,relevance:0}]}]
}),e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE]
},p=[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,d,g,u,b,{match:/\$\d+/},c]
;l.contains=p.concat({begin:/\{/,end:/\}/,keywords:i,contains:["self"].concat(p)
});const _=[].concat(m,l.contains),h=_.concat([{begin:/(\s*)\(/,end:/\)/,
keywords:i,contains:["self"].concat(_)}]),f={className:"params",begin:/(\s*)\(/,
end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:i,contains:h},E={variants:[{
match:[/class/,/\s+/,t,/\s+/,/extends/,/\s+/,n.concat(t,"(",n.concat(/\./,t),")*")],
scope:{1:"keyword",3:"title.class",5:"keyword",7:"title.class.inherited"}},{
match:[/class/,/\s+/,t],scope:{1:"keyword",3:"title.class"}}]},y={relevance:0,
match:n.either(/\bJSON/,/\b[A-Z][a-z]+([A-Z][a-z]*|\d)*/,/\b[A-Z]{2,}([A-Z][a-z]+|\d)+([A-Z][a-z]*)*/,/\b[A-Z]{2,}[a-z]+([A-Z][a-z]+|\d)*([A-Z][a-z]*)*/),
className:"title.class",keywords:{_:[...se,...oe]}},w={variants:[{
match:[/function/,/\s+/,t,/(?=\s*\()/]},{match:[/function/,/\s*(?=\()/]}],
className:{1:"keyword",3:"title.function"},label:"func.def",contains:[f],
illegal:/%/},v={
match:n.concat(/\b/,(N=[...ce,"super","import","await"].map(e=>e+"\\s*\\("),
n.concat("(?!",N.join("|"),")")),t,n.lookahead(/\s*\(/)),
className:"title.function",relevance:0};var N;const k={
begin:n.concat(/\./,n.lookahead(n.concat(t,/(?![0-9A-Za-z$_(])/))),end:t,
excludeBegin:!0,keywords:"prototype",className:"property",relevance:0},x={
match:[/get|set/,/\s+/,t,/(?=\()/],className:{1:"keyword",3:"title.function"},
contains:[{begin:/\(\)/},f]
},O="(\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)|"+e.UNDERSCORE_IDENT_RE+")\\s*=>",M={
match:[/const|var|let/,/\s+/,t,/\s*/,/=\s*/,/(async\s*)?/,n.lookahead(O)],
keywords:"async",className:{1:"keyword",3:"title.function"},contains:[f]}
;return{name:"JavaScript",aliases:["js","jsx","mjs","cjs"],keywords:i,exports:{
PARAMS_CONTAINS:h,CLASS_REFERENCE:y},illegal:/#(?![$_A-Za-z])/,
contains:[e.SHEBANG({label:"shebang",binary:"node",relevance:5}),{
label:"use_strict",className:"meta",relevance:10,
begin:/^\s*['"]use (strict|asm)['"]/
},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,d,g,u,b,m,{match:/\$\d+/},c,y,{
scope:"attr",match:t+n.lookahead(":"),relevance:0},M,{
begin:"("+e.RE_STARTERS_RE+"|\\b(case|return|throw)\\b)\\s*",
keywords:"return throw case",relevance:0,contains:[m,e.REGEXP_MODE,{
className:"function",begin:O,returnBegin:!0,end:"\\s*=>",contains:[{
className:"params",variants:[{begin:e.UNDERSCORE_IDENT_RE,relevance:0},{
className:null,begin:/\(\s*\)/,skip:!0},{begin:/(\s*)\(/,end:/\)/,
excludeBegin:!0,excludeEnd:!0,keywords:i,contains:h}]}]},{begin:/,/,relevance:0
},{match:/\s+/,relevance:0},{variants:[{begin:"<>",end:"</>"},{
match:/<[A-Za-z0-9\\._:-]+\s*\/>/},{begin:a.begin,
"on:begin":a.isTrulyOpeningTag,end:a.end}],subLanguage:"xml",contains:[{
begin:a.begin,end:a.end,skip:!0,contains:["self"]}]}]},w,{
beginKeywords:"while if switch catch for"},{
begin:"\\b(?!function)"+e.UNDERSCORE_IDENT_RE+"\\([^()]*(\\([^()]*(\\([^()]*\\)[^()]*)*\\)[^()]*)*\\)\\s*\\{",
returnBegin:!0,label:"func.def",contains:[f,e.inherit(e.TITLE_MODE,{begin:t,
className:"title.function"})]},{match:/\.\.\./,relevance:0},k,{match:"\\$"+t,
relevance:0},{match:[/\bconstructor(?=\s*\()/],className:{1:"title.function"},
contains:[f]},v,{relevance:0,match:/\b[A-Z][A-Z_0-9]+\b/,
className:"variable.constant"},E,x,{match:/\$[(.]/}]}}
const ue=e=>b(/\b/,e,/\w$/.test(e)?/\b/:/\B/),be=["Protocol","Type"].map(ue),me=["init","self"].map(ue),pe=["Any","Self"],_e=["actor","any","associatedtype","async","await",/as\?/,/as!/,"as","borrowing","break","case","catch","class","consume","consuming","continue","convenience","copy","default","defer","deinit","didSet","distributed","do","dynamic","each","else","enum","extension","fallthrough",/fileprivate\(set\)/,"fileprivate","final","for","func","get","guard","if","import","indirect","infix",/init\?/,/init!/,"inout",/internal\(set\)/,"internal","in","is","isolated","nonisolated","lazy","let","macro","mutating","nonmutating",/open\(set\)/,"open","operator","optional","override","package","postfix","precedencegroup","prefix",/private\(set\)/,"private","protocol",/public\(set\)/,"public","repeat","required","rethrows","return","set","some","static","struct","subscript","super","switch","throws","throw",/try\?/,/try!/,"try","typealias",/unowned\(safe\)/,/unowned\(unsafe\)/,"unowned","var","weak","where","while","willSet"],he=["false","nil","true"],fe=["assignment","associativity","higherThan","left","lowerThan","none","right"],Ee=["#colorLiteral","#column","#dsohandle","#else","#elseif","#endif","#error","#file","#fileID","#fileLiteral","#filePath","#function","#if","#imageLiteral","#keyPath","#line","#selector","#sourceLocation","#warning"],ye=["abs","all","any","assert","assertionFailure","debugPrint","dump","fatalError","getVaList","isKnownUniquelyReferenced","max","min","numericCast","pointwiseMax","pointwiseMin","precondition","preconditionFailure","print","readLine","repeatElement","sequence","stride","swap","swift_unboxFromSwiftValueWithType","transcode","type","unsafeBitCast","unsafeDowncast","withExtendedLifetime","withUnsafeMutablePointer","withUnsafePointer","withVaList","withoutActuallyEscaping","zip"],we=m(/[/=\-+!*%<>&|^~?]/,/[\u00A1-\u00A7]/,/[\u00A9\u00AB]/,/[\u00AC\u00AE]/,/[\u00B0\u00B1]/,/[\u00B6\u00BB\u00BF\u00D7\u00F7]/,/[\u2016-\u2017]/,/[\u2020-\u2027]/,/[\u2030-\u203E]/,/[\u2041-\u2053]/,/[\u2055-\u205E]/,/[\u2190-\u23FF]/,/[\u2500-\u2775]/,/[\u2794-\u2BFF]/,/[\u2E00-\u2E7F]/,/[\u3001-\u3003]/,/[\u3008-\u3020]/,/[\u3030]/),ve=m(we,/[\u0300-\u036F]/,/[\u1DC0-\u1DFF]/,/[\u20D0-\u20FF]/,/[\uFE00-\uFE0F]/,/[\uFE20-\uFE2F]/),Ne=b(we,ve,"*"),ke=m(/[a-zA-Z_]/,/[\u00A8\u00AA\u00AD\u00AF\u00B2-\u00B5\u00B7-\u00BA]/,/[\u00BC-\u00BE\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF]/,/[\u0100-\u02FF\u0370-\u167F\u1681-\u180D\u180F-\u1DBF]/,/[\u1E00-\u1FFF]/,/[\u200B-\u200D\u202A-\u202E\u203F-\u2040\u2054\u2060-\u206F]/,/[\u2070-\u20CF\u2100-\u218F\u2460-\u24FF\u2776-\u2793]/,/[\u2C00-\u2DFF\u2E80-\u2FFF]/,/[\u3004-\u3007\u3021-\u302F\u3031-\u303F\u3040-\uD7FF]/,/[\uF900-\uFD3D\uFD40-\uFDCF\uFDF0-\uFE1F\uFE30-\uFE44]/,/[\uFE47-\uFEFE\uFF00-\uFFFD]/),xe=m(ke,/\d/,/[\u0300-\u036F\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/),Oe=b(ke,xe,"*"),Me=b(/[A-Z]/,xe,"*"),Ae=["attached","autoclosure",b(/convention\(/,m("swift","block","c"),/\)/),"discardableResult","dynamicCallable","dynamicMemberLookup","escaping","freestanding","frozen","GKInspectable","IBAction","IBDesignable","IBInspectable","IBOutlet","IBSegueAction","inlinable","main","nonobjc","NSApplicationMain","NSCopying","NSManaged",b(/objc\(/,Oe,/\)/),"objc","objcMembers","propertyWrapper","requires_stored_property_inits","resultBuilder","Sendable","testable","UIApplicationMain","unchecked","unknown","usableFromInline","warn_unqualified_access"],Se=["iOS","iOSApplicationExtension","macOS","macOSApplicationExtension","macCatalyst","macCatalystApplicationExtension","watchOS","watchOSApplicationExtension","tvOS","tvOSApplicationExtension","swift"],Ce=e=>({
IMPORTANT:{scope:"meta",begin:"!important"},
BLOCK_COMMENT:e.C_BLOCK_COMMENT_MODE,HEXCOLOR:{scope:"number",
begin:/#(([0-9a-fA-F]{3,4})|(([0-9a-fA-F]{2}){3,4}))\b/},UNICODE_RANGE:{
scope:"number",
begin:/\b[Uu]\+[0-9A-Fa-f][0-9A-Fa-f?]{0,5}(-[0-9A-Fa-f][0-9A-Fa-f]{0,5})?/},
FUNCTION_DISPATCH:{className:"built_in",begin:/[\w-]+(?=\()/},
ATTRIBUTE_SELECTOR_MODE:{scope:"selector-attr",begin:/\[/,end:/\]/,illegal:"$",
contains:[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]},CSS_NUMBER_MODE:{
scope:"number",
begin:e.NUMBER_RE+"(%|em|ex|ch|rem|vw|vh|vmin|vmax|cm|mm|in|pt|pc|px|deg|grad|rad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx)?",
relevance:0},CSS_VARIABLE:{className:"attr",begin:/--[A-Za-z_][A-Za-z0-9_-]*/}
}),Te=["a","abbr","address","article","aside","audio","b","blockquote","body","button","canvas","caption","cite","code","dd","del","details","dfn","div","dl","dt","em","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","html","i","iframe","img","input","ins","kbd","label","legend","li","main","mark","menu","nav","object","ol","optgroup","option","p","picture","q","quote","samp","section","select","source","span","strong","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","tr","ul","var","video","defs","g","marker","mask","pattern","svg","switch","symbol","feBlend","feColorMatrix","feComponentTransfer","feComposite","feConvolveMatrix","feDiffuseLighting","feDisplacementMap","feFlood","feGaussianBlur","feImage","feMerge","feMorphology","feOffset","feSpecularLighting","feTile","feTurbulence","linearGradient","radialGradient","stop","circle","ellipse","image","line","path","polygon","polyline","rect","text","use","textPath","tspan","foreignObject","clipPath"],Re=["any-hover","any-pointer","aspect-ratio","color","color-gamut","color-index","device-aspect-ratio","device-height","device-width","display-mode","forced-colors","grid","height","hover","inverted-colors","monochrome","orientation","overflow-block","overflow-inline","pointer","prefers-color-scheme","prefers-contrast","prefers-reduced-motion","prefers-reduced-transparency","resolution","scan","scripting","update","width","min-width","max-width","min-height","max-height"].sort().reverse(),De=["active","any-link","blank","checked","current","default","defined","dir","disabled","drop","empty","enabled","first","first-child","first-of-type","fullscreen","future","focus","focus-visible","focus-within","has","host","host-context","hover","indeterminate","in-range","invalid","is","lang","last-child","last-of-type","left","link","local-link","not","nth-child","nth-col","nth-last-child","nth-last-col","nth-last-of-type","nth-of-type","only-child","only-of-type","optional","out-of-range","past","placeholder-shown","read-only","read-write","required","right","root","scope","target","target-within","user-invalid","valid","visited","where"].sort().reverse(),Ie=["after","backdrop","before","cue","cue-region","first-letter","first-line","grammar-error","marker","part","placeholder","selection","slotted","spelling-error"].sort().reverse(),Le=["accent-color","align-content","align-items","align-self","alignment-baseline","all","anchor-name","animation","animation-composition","animation-delay","animation-direction","animation-duration","animation-fill-mode","animation-iteration-count","animation-name","animation-play-state","animation-range","animation-range-end","animation-range-start","animation-timeline","animation-timing-function","appearance","aspect-ratio","backdrop-filter","backface-visibility","background","background-attachment","background-blend-mode","background-clip","background-color","background-image","background-origin","background-position","background-position-x","background-position-y","background-repeat","background-size","baseline-shift","block-size","border","border-block","border-block-color","border-block-end","border-block-end-color","border-block-end-style","border-block-end-width","border-block-start","border-block-start-color","border-block-start-style","border-block-start-width","border-block-style","border-block-width","border-bottom","border-bottom-color","border-bottom-left-radius","border-bottom-right-radius","border-bottom-style","border-bottom-width","border-collapse","border-color","border-end-end-radius","border-end-start-radius","border-image","border-image-outset","border-image-repeat","border-image-slice","border-image-source","border-image-width","border-inline","border-inline-color","border-inline-end","border-inline-end-color","border-inline-end-style","border-inline-end-width","border-inline-start","border-inline-start-color","border-inline-start-style","border-inline-start-width","border-inline-style","border-inline-width","border-left","border-left-color","border-left-style","border-left-width","border-radius","border-right","border-right-color","border-right-style","border-right-width","border-spacing","border-start-end-radius","border-start-start-radius","border-style","border-top","border-top-color","border-top-left-radius","border-top-right-radius","border-top-style","border-top-width","border-width","bottom","box-align","box-decoration-break","box-direction","box-flex","box-flex-group","box-lines","box-ordinal-group","box-orient","box-pack","box-shadow","box-sizing","break-after","break-before","break-inside","caption-side","caret-color","clear","clip","clip-path","clip-rule","color","color-interpolation","color-interpolation-filters","color-profile","color-rendering","color-scheme","column-count","column-fill","column-gap","column-rule","column-rule-color","column-rule-style","column-rule-width","column-span","column-width","columns","contain","contain-intrinsic-block-size","contain-intrinsic-height","contain-intrinsic-inline-size","contain-intrinsic-size","contain-intrinsic-width","container","container-name","container-type","content","content-visibility","corner-bottom-left-shape","corner-bottom-right-shape","corner-shape","corner-top-left-shape","corner-top-right-shape","counter-increment","counter-reset","counter-set","cue","cue-after","cue-before","cursor","cx","cy","direction","display","dominant-baseline","empty-cells","enable-background","field-sizing","fill","fill-opacity","fill-rule","filter","flex","flex-basis","flex-direction","flex-flow","flex-grow","flex-shrink","flex-wrap","float","flood-color","flood-opacity","flow","font","font-display","font-family","font-feature-settings","font-kerning","font-language-override","font-optical-sizing","font-palette","font-size","font-size-adjust","font-smooth","font-smoothing","font-stretch","font-style","font-synthesis","font-synthesis-position","font-synthesis-small-caps","font-synthesis-style","font-synthesis-weight","font-variant","font-variant-alternates","font-variant-caps","font-variant-east-asian","font-variant-emoji","font-variant-ligatures","font-variant-numeric","font-variant-position","font-variation-settings","font-weight","forced-color-adjust","gap","glyph-orientation-horizontal","glyph-orientation-vertical","grid","grid-area","grid-auto-columns","grid-auto-flow","grid-auto-rows","grid-column","grid-column-end","grid-column-start","grid-gap","grid-row","grid-row-end","grid-row-start","grid-template","grid-template-areas","grid-template-columns","grid-template-rows","hanging-punctuation","height","hyphenate-character","hyphenate-limit-chars","hyphens","icon","image-orientation","image-rendering","image-resolution","ime-mode","initial-letter","initial-letter-align","inline-size","inset","inset-area","inset-block","inset-block-end","inset-block-start","inset-inline","inset-inline-end","inset-inline-start","isolation","justify-content","justify-items","justify-self","kerning","left","letter-spacing","lighting-color","line-break","line-height","line-height-step","list-style","list-style-image","list-style-position","list-style-type","margin","margin-block","margin-block-end","margin-block-start","margin-bottom","margin-inline","margin-inline-end","margin-inline-start","margin-left","margin-right","margin-top","margin-trim","marker","marker-end","marker-mid","marker-start","marks","mask","mask-border","mask-border-mode","mask-border-outset","mask-border-repeat","mask-border-slice","mask-border-source","mask-border-width","mask-clip","mask-composite","mask-image","mask-mode","mask-origin","mask-position","mask-repeat","mask-size","mask-type","masonry-auto-flow","math-depth","math-shift","math-style","max-block-size","max-height","max-inline-size","max-width","min-block-size","min-height","min-inline-size","min-width","mix-blend-mode","nav-down","nav-index","nav-left","nav-right","nav-up","none","normal","object-fit","object-position","offset","offset-anchor","offset-distance","offset-path","offset-position","offset-rotate","opacity","order","orphans","outline","outline-color","outline-offset","outline-style","outline-width","overflow","overflow-anchor","overflow-block","overflow-clip-margin","overflow-inline","overflow-wrap","overflow-x","overflow-y","overlay","overscroll-behavior","overscroll-behavior-block","overscroll-behavior-inline","overscroll-behavior-x","overscroll-behavior-y","padding","padding-block","padding-block-end","padding-block-start","padding-bottom","padding-inline","padding-inline-end","padding-inline-start","padding-left","padding-right","padding-top","page","page-break-after","page-break-before","page-break-inside","paint-order","pause","pause-after","pause-before","perspective","perspective-origin","place-content","place-items","place-self","pointer-events","position","position-anchor","position-visibility","print-color-adjust","quotes","r","resize","rest","rest-after","rest-before","right","rotate","row-gap","ruby-align","ruby-position","scale","scroll-behavior","scroll-margin","scroll-margin-block","scroll-margin-block-end","scroll-margin-block-start","scroll-margin-bottom","scroll-margin-inline","scroll-margin-inline-end","scroll-margin-inline-start","scroll-margin-left","scroll-margin-right","scroll-margin-top","scroll-padding","scroll-padding-block","scroll-padding-block-end","scroll-padding-block-start","scroll-padding-bottom","scroll-padding-inline","scroll-padding-inline-end","scroll-padding-inline-start","scroll-padding-left","scroll-padding-right","scroll-padding-top","scroll-snap-align","scroll-snap-stop","scroll-snap-type","scroll-timeline","scroll-timeline-axis","scroll-timeline-name","scrollbar-color","scrollbar-gutter","scrollbar-width","shape-image-threshold","shape-margin","shape-outside","shape-rendering","speak","speak-as","src","stop-color","stop-opacity","stroke","stroke-dasharray","stroke-dashoffset","stroke-linecap","stroke-linejoin","stroke-miterlimit","stroke-opacity","stroke-width","tab-size","table-layout","text-align","text-align-all","text-align-last","text-anchor","text-combine-upright","text-decoration","text-decoration-color","text-decoration-line","text-decoration-skip","text-decoration-skip-ink","text-decoration-style","text-decoration-thickness","text-emphasis","text-emphasis-color","text-emphasis-position","text-emphasis-style","text-indent","text-justify","text-orientation","text-overflow","text-rendering","text-shadow","text-size-adjust","text-transform","text-underline-offset","text-underline-position","text-wrap","text-wrap-mode","text-wrap-style","timeline-scope","top","touch-action","transform","transform-box","transform-origin","transform-style","transition","transition-behavior","transition-delay","transition-duration","transition-property","transition-timing-function","translate","unicode-bidi","unicode-range","user-modify","user-select","vector-effect","vertical-align","view-timeline","view-timeline-axis","view-timeline-inset","view-timeline-name","view-transition-name","visibility","voice-balance","voice-duration","voice-family","voice-pitch","voice-range","voice-rate","voice-stress","voice-volume","white-space","white-space-collapse","widows","width","will-change","word-break","word-spacing","word-wrap","writing-mode","x","y","z-index","zoom"].sort().reverse(),Be=De.concat(Ie).sort().reverse()
;var Fe="[0-9](_*[0-9])*",$e=`\\.(${Fe})`,ze="[0-9a-fA-F](_*[0-9a-fA-F])*",je={
className:"number",variants:[{
begin:`(\\b(${Fe})((${$e})|\\.)?|(${$e}))[eE][+-]?(${Fe})[fFdD]?\\b`},{
begin:`\\b(${Fe})((${$e})[fFdD]?\\b|\\.([fFdD]\\b)?)`},{
begin:`(${$e})[fFdD]?\\b`},{begin:`\\b(${Fe})[fFdD]\\b`},{
begin:`\\b0[xX]((${ze})\\.?|(${ze})?\\.(${ze}))[pP][+-]?(${Fe})[fFdD]?\\b`},{
begin:"\\b(0|[1-9](_*[0-9])*)[lL]?\\b"},{begin:`\\b0[xX](${ze})[lL]?\\b`},{
begin:"\\b0(_*[0-7])*[lL]?\\b"},{begin:"\\b0[bB][01](_*[01])*[lL]?\\b"}],
relevance:0};function Ue(e,n,t){return-1===t?"":e.replace(n,a=>Ue(e,n,t-1))}
var Pe=Object.freeze({__proto__:null,grmr_bash:e=>{const n=e.regex,t={},a={
begin:/\$\{/,end:/\}/,contains:["self",{begin:/:-/,contains:[t]}]}
;Object.assign(t,{className:"variable",variants:[{
begin:n.concat(/\$[\w\d#@][\w\d_]*/,"(?![\\w\\d])(?![$])")},a]});const i={
className:"subst",begin:/\$\(/,end:/\)/,contains:[e.BACKSLASH_ESCAPE]
},r=e.inherit(e.COMMENT(),{match:[/(^|\s)/,/#.*$/],scope:{2:"comment"}}),s={
begin:/<<-?\s*(?=\w+)/,starts:{contains:[e.END_SAME_AS_BEGIN({begin:/(\w+)/,
end:/(\w+)/,className:"string"})]}},o={className:"string",begin:/"/,end:/"/,
contains:[e.BACKSLASH_ESCAPE,t,i]};i.contains.push(o);const c={begin:/\$?\(\(/,
end:/\)\)/,contains:[{begin:/\d+#[0-9a-f]+/,className:"number"},e.NUMBER_MODE,t]
},l=e.SHEBANG({binary:"(fish|bash|zsh|sh|csh|ksh|tcsh|dash|scsh)",relevance:10
}),d={className:"function",begin:/\w[\w\d_]*\s*\(\s*\)\s*\{/,returnBegin:!0,
contains:[e.inherit(e.TITLE_MODE,{begin:/\w[\w\d_]*/})],relevance:0};return{
name:"Bash",aliases:["sh","zsh"],keywords:{$pattern:/\b[a-z][a-z0-9._-]+\b/,
keyword:["if","then","else","elif","fi","time","for","while","until","in","do","done","case","esac","coproc","function","select"],
literal:["true","false"],
built_in:["break","cd","continue","eval","exec","exit","export","getopts","hash","pwd","readonly","return","shift","test","times","trap","umask","unset","alias","bind","builtin","caller","command","declare","echo","enable","help","let","local","logout","mapfile","printf","read","readarray","source","sudo","type","typeset","ulimit","unalias","set","shopt","autoload","bg","bindkey","bye","cap","chdir","clone","comparguments","compcall","compctl","compdescribe","compfiles","compgroups","compquote","comptags","comptry","compvalues","dirs","disable","disown","echotc","echoti","emulate","fc","fg","float","functions","getcap","getln","history","integer","jobs","kill","limit","log","noglob","popd","print","pushd","pushln","rehash","sched","setcap","setopt","stat","suspend","ttyctl","unfunction","unhash","unlimit","unsetopt","vared","wait","whence","where","which","zcompile","zformat","zftp","zle","zmodload","zparseopts","zprof","zpty","zregexparse","zsocket","zstyle","ztcp","chcon","chgrp","chown","chmod","cp","dd","df","dir","dircolors","ln","ls","mkdir","mkfifo","mknod","mktemp","mv","realpath","rm","rmdir","shred","sync","touch","truncate","vdir","b2sum","base32","base64","cat","cksum","comm","csplit","cut","expand","fmt","fold","head","join","md5sum","nl","numfmt","od","paste","ptx","pr","sha1sum","sha224sum","sha256sum","sha384sum","sha512sum","shuf","sort","split","sum","tac","tail","tr","tsort","unexpand","uniq","wc","arch","basename","chroot","date","dirname","du","echo","env","expr","factor","groups","hostid","id","link","logname","nice","nohup","nproc","pathchk","pinky","printenv","printf","pwd","readlink","runcon","seq","sleep","stat","stdbuf","stty","tee","test","timeout","tty","uname","unlink","uptime","users","who","whoami","yes"]
},contains:[l,e.SHEBANG(),d,c,r,s,{match:/(\/[a-z._-]+)+/},o,{match:/\\"/},{
className:"string",begin:/'/,end:/'/},{match:/\\'/},t]}},grmr_c:e=>{
const n=e.regex,t=e.COMMENT("//","$",{contains:[{begin:/\\\n/}]
}),a="decltype\\(auto\\)",i="[a-zA-Z_]\\w*::",r="("+a+"|"+n.optional(i)+"[a-zA-Z_]\\w*"+n.optional("<[^<>]+>")+")",s={
className:"type",variants:[{begin:"\\b[a-z\\d_]*_t\\b"},{
match:n.concat(/\batomic_/,n.either("bool","char","schar","uchar","short","ushort","int","uint","long","ulong","llong","ullong","char16_t","char32_t","wchar_t","int_least8_t","uint_least8_t","int_least16_t","uint_least16_t","int_least32_t","uint_least32_t","int_least64_t","uint_least64_t","int_fast8_t","uint_fast8_t","int_fast16_t","uint_fast16_t","int_fast32_t","uint_fast32_t","int_fast64_t","uint_fast64_t","intptr_t","uintptr_t","size_t","ptrdiff_t","intmax_t","uintmax_t"),/\b/)
}]},o={className:"string",variants:[{begin:'(u8?|U|L)?"',end:'"',illegal:"\\n",
contains:[e.BACKSLASH_ESCAPE]},{
begin:"(u8?|U|L)?'(\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)|.)",
end:"'",illegal:"."},e.END_SAME_AS_BEGIN({
begin:/(?:u8?|U|L)?R"([^()\\\s"]{0,16})\(/,end:/\)([^()\\\s"]{0,16})"/})]},c={
className:"number",variants:[{match:/\b(0b[01']+)/},{
match:/(-?)\b([\d']+(\.[\d']*)?|\.[\d']+)((ll|LL|l|L)(u|U)?|(u|U)(ll|LL|l|L)?|f|F|b|B)/
},{
match:/(-?)\b(0[xX][a-fA-F0-9]+(?:'[a-fA-F0-9]+)*(?:\.[a-fA-F0-9]*(?:'[a-fA-F0-9]*)*)?(?:[pP][-+]?[0-9]+)?(l|L)?(u|U)?)/
},{match:/(-?)\b\d+(?:'\d+)*(?:\.\d*(?:'\d*)*)?(?:[eE][-+]?\d+)?/}],relevance:0
},l={scope:"meta",begin:/#\s*include\b/,end:/$/,keywords:{keyword:"include"},
contains:[{begin:/\\\n/},o,{scope:"string",begin:/<.*?>/
},t,e.C_BLOCK_COMMENT_MODE]},d={className:"meta",begin:/#\s*[a-z]+\b/,end:/$/,
keywords:{
keyword:"if else elif endif define undef warning error line pragma _Pragma ifdef ifndef elifdef elifndef include"
},contains:[{begin:/\\\n/,relevance:0},e.inherit(o,{className:"string"
}),t,e.C_BLOCK_COMMENT_MODE]},g=[l,d],u={className:"title",
begin:n.optional(i)+e.IDENT_RE,relevance:0
},b=n.optional(i)+e.IDENT_RE+"\\s*\\(",m={
keyword:["asm","auto","break","case","continue","default","do","else","enum","extern","for","fortran","goto","if","inline","register","restrict","return","sizeof","typeof","typeof_unqual","struct","switch","typedef","union","volatile","while","_Alignas","_Alignof","_Atomic","_Generic","_Noreturn","_Static_assert","_Thread_local","alignas","alignof","noreturn","static_assert","thread_local","_Pragma"],
type:["float","double","signed","unsigned","int","short","long","char","void","_Bool","_BitInt","_Complex","_Imaginary","_Decimal32","_Decimal64","_Decimal96","_Decimal128","_Decimal64x","_Decimal128x","_Float16","_Float32","_Float64","_Float128","_Float32x","_Float64x","_Float128x","const","static","constexpr","complex","bool","imaginary"],
literal:"true false NULL",
built_in:"std string wstring cin cout cerr clog stdin stdout stderr stringstream istringstream ostringstream auto_ptr deque list queue stack vector map set pair bitset multiset multimap unordered_set unordered_map unordered_multiset unordered_multimap priority_queue make_pair array shared_ptr abort terminate abs acos asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp fscanf future isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper isxdigit tolower toupper labs ldexp log10 log malloc realloc memchr memcmp memcpy memset modf pow printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan vfprintf vprintf vsprintf endl initializer_list unique_ptr"
},p=[...g,s,t,e.C_BLOCK_COMMENT_MODE,c,o],_={variants:[{begin:/=/,end:/;/},{
begin:/\(/,end:/\)/},{beginKeywords:"new throw return else",end:/;/}],
keywords:m,contains:p.concat([{begin:/\(/,end:/\)/,keywords:m,
contains:p.concat(["self"]),relevance:0}]),relevance:0},h={
begin:"("+r+"[\\*&\\s]+){1,12}"+b,returnBegin:!0,end:/[{;=]/,excludeEnd:!0,
keywords:m,illegal:/[^\w\s\*&:<>.]/,contains:[{begin:a,keywords:m,relevance:0},{
begin:b,returnBegin:!0,contains:[e.inherit(u,{className:"title.function"})],
relevance:0},{relevance:0,match:/,/},{className:"params",begin:/\(/,end:/\)/,
keywords:m,relevance:0,contains:[t,e.C_BLOCK_COMMENT_MODE,o,c,s,{begin:/\(/,
end:/\)/,keywords:m,relevance:0,contains:["self",t,e.C_BLOCK_COMMENT_MODE,o,c,s]
}]},s,t,e.C_BLOCK_COMMENT_MODE,...g]};return{name:"C",aliases:["h"],keywords:m,
disableAutodetect:!0,illegal:"</",contains:[].concat(_,h,p,[...g,{
begin:e.IDENT_RE+"::",keywords:m},{className:"class",
beginKeywords:"enum class struct union",end:/[{;:<>=]/,contains:[{
beginKeywords:"final class struct"},e.TITLE_MODE]}]),exports:{preprocessor:d,
strings:o,keywords:m}}},grmr_cpp:e=>{const n=e.regex,t=e.COMMENT("//","$",{
contains:[{begin:/\\\n/}]
}),a="decltype\\(auto\\)",i="[a-zA-Z_]\\w*::",r="(?!struct)("+a+"|"+n.optional(i)+"[a-zA-Z_]\\w*"+n.optional("<[^<>]+>")+")",s={
className:"type",begin:"\\b[a-z\\d_]*_t\\b"},o={className:"string",variants:[{
begin:'(u8?|U|L)?"',end:'"',illegal:"\\n",contains:[e.BACKSLASH_ESCAPE]},{
begin:"(u8?|U|L)?'(\\\\(x[0-9A-Fa-f]{2}|u[0-9A-Fa-f]{4,8}|[0-7]{3}|\\S)|.)",
end:"'",illegal:"."},e.END_SAME_AS_BEGIN({
begin:/(?:u8?|U|L)?R"([^()\\\s"]{0,16})\(/,end:/\)([^()\\\s"]{0,16})"/})]},c={
className:"number",variants:[{
begin:"[+-]?(?:(?:\\b[0-9](?:'?[0-9])*\\.(?:[0-9](?:'?[0-9])*)?|\\.[0-9](?:'?[0-9])*)(?:[Ee][+-]?[0-9](?:'?[0-9])*)?|\\b[0-9](?:'?[0-9])*[Ee][+-]?[0-9](?:'?[0-9])*|\\b0[Xx](?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*(?:\\.(?:[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)?)?|\\.[0-9A-Fa-f](?:'?[0-9A-Fa-f])*)[Pp][+-]?[0-9](?:'?[0-9])*)(?:[Ff](?:16|32|64|128)?|(BF|bf)16|[Ll]|)"
},{
begin:"[+-]?\\b(?:0[Bb][01](?:'?[01])*|0[Xx][0-9A-Fa-f](?:'?[0-9A-Fa-f])*|0(?:'?[0-7])*|[1-9](?:'?[0-9])*)(?:[Uu](?:LL?|ll?)|[Uu][Zz]?|(?:LL?|ll?)[Uu]?|[Zz][Uu]|)"
}],relevance:0},l=[{scope:"meta",begin:/#\s*include\b/,end:/$/,keywords:{
keyword:"include"},contains:[{begin:/\\\n/},o,{scope:"string",begin:/<.*?>/
},t,e.C_BLOCK_COMMENT_MODE]},{className:"meta",begin:/#\s*[a-z]+\b/,end:/$/,
keywords:{
keyword:"if else elif endif define undef warning error line pragma _Pragma ifdef ifndef include"
},contains:[{begin:/\\\n/,relevance:0},e.inherit(o,{className:"string"
}),t,e.C_BLOCK_COMMENT_MODE]}],d={className:"title",
begin:n.optional(i)+e.IDENT_RE,relevance:0
},g=n.optional(i)+e.IDENT_RE+"\\s*\\(",u=["alignas","alignof","and","and_eq","asm","atomic_cancel","atomic_commit","atomic_noexcept","auto","bitand","bitor","break","case","catch","class","co_await","co_return","co_yield","compl","concept","const_cast|10","consteval","constexpr","constinit","continue","decltype","default","delete","do","dynamic_cast|10","else","enum","explicit","export","extern","false","final","for","friend","goto","if","import","inline","module","mutable","namespace","new","noexcept","not","not_eq","nullptr","operator","or","or_eq","override","private","protected","public","reflexpr","register","reinterpret_cast|10","requires","return","sizeof","static_assert","static_cast|10","struct","switch","synchronized","template","this","thread_local","throw","transaction_safe","transaction_safe_dynamic","true","try","typedef","typeid","typename","union","using","virtual","volatile","while","xor","xor_eq"],b={
type:["bool","char","char16_t","char32_t","char8_t","double","float","int","long","short","void","wchar_t","unsigned","signed","const","static"],
keyword:u,literal:["NULL","false","nullopt","nullptr","true"],
built_in:["_Pragma"],
_type_hints:["any","auto_ptr","barrier","binary_semaphore","bitset","complex","condition_variable","condition_variable_any","counting_semaphore","deque","false_type","flat_map","flat_set","future","imaginary","initializer_list","istringstream","jthread","latch","lock_guard","multimap","multiset","mutex","optional","ostringstream","packaged_task","pair","promise","priority_queue","queue","recursive_mutex","recursive_timed_mutex","scoped_lock","set","shared_future","shared_lock","shared_mutex","shared_timed_mutex","shared_ptr","stack","string_view","stringstream","timed_mutex","thread","true_type","tuple","unique_lock","unique_ptr","unordered_map","unordered_multimap","unordered_multiset","unordered_set","variant","vector","weak_ptr","wstring","wstring_view"]
},m={className:"function.dispatch",relevance:0,keywords:{
_hint:["abort","abs","acos","apply","as_const","asin","atan","atan2","calloc","ceil","cerr","cin","clog","cos","cosh","cout","declval","endl","exchange","exit","exp","fabs","floor","fmod","forward","fprintf","fputs","free","frexp","fscanf","future","invoke","isalnum","isalpha","iscntrl","isdigit","isgraph","islower","isprint","ispunct","isspace","isupper","isxdigit","labs","launder","ldexp","log","log10","make_pair","make_shared","make_shared_for_overwrite","make_tuple","make_unique","malloc","memchr","memcmp","memcpy","memset","modf","move","pow","printf","putchar","puts","realloc","scanf","sin","sinh","snprintf","sprintf","sqrt","sscanf","std","stderr","stdin","stdout","strcat","strchr","strcmp","strcpy","strcspn","strlen","strncat","strncmp","strncpy","strpbrk","strrchr","strspn","strstr","swap","tan","tanh","terminate","to_underlying","tolower","toupper","vfprintf","visit","vprintf","vsprintf"]
},
begin:n.concat(/\b/,`(?!${u.join("|")})`,e.IDENT_RE,n.lookahead(/(<[^<>]+>|)\s*\(/))
},p=[m,...l,s,t,e.C_BLOCK_COMMENT_MODE,c,o],_={variants:[{begin:/=/,end:/;/},{
begin:/\(/,end:/\)/},{beginKeywords:"new throw return else",end:/;/}],
keywords:b,contains:p.concat([{begin:/\(/,end:/\)/,keywords:b,
contains:p.concat(["self"]),relevance:0}]),relevance:0},h={className:"function",
begin:"("+r+"[\\*&\\s]+){1,12}"+g,returnBegin:!0,end:/[{;=]/,excludeEnd:!0,
keywords:b,illegal:/[^\w\s\*&:<>.]/,contains:[{begin:a,keywords:b,relevance:0},{
begin:g,returnBegin:!0,contains:[d],relevance:0},{begin:/::/,relevance:0},{
begin:/:/,endsWithParent:!0,contains:[o,c]},{relevance:0,match:/,/},{
className:"params",begin:/\(/,end:/\)/,keywords:b,relevance:0,
contains:[t,e.C_BLOCK_COMMENT_MODE,o,c,s,{begin:/\(/,end:/\)/,keywords:b,
relevance:0,contains:["self",t,e.C_BLOCK_COMMENT_MODE,o,c,s]}]
},s,t,e.C_BLOCK_COMMENT_MODE,...l]};return{name:"C++",
aliases:["cc","c++","h++","hpp","hh","hxx","cxx"],keywords:b,illegal:"</",
classNameAliases:{"function.dispatch":"built_in"},
contains:[].concat(_,h,m,p,[...l,{
begin:"\\b(deque|list|queue|priority_queue|pair|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array|tuple|optional|variant|function|flat_map|flat_set)\\s*<(?!<)",
end:">",keywords:b,contains:["self",s]},{begin:e.IDENT_RE+"::",keywords:b},{
match:[/\b(?:enum(?:\s+(?:class|struct))?|class|struct|union)/,/\s+/,/\w+/],
className:{1:"keyword",3:"title.class"}}])}},grmr_csharp:e=>{const n={
keyword:["abstract","as","base","break","case","catch","class","const","continue","do","else","event","explicit","extern","finally","fixed","for","foreach","goto","if","implicit","in","interface","internal","is","lock","namespace","new","operator","out","override","params","private","protected","public","readonly","record","ref","return","scoped","sealed","sizeof","stackalloc","static","struct","switch","this","throw","try","typeof","unchecked","unsafe","using","virtual","void","volatile","while"].concat(["add","alias","and","ascending","args","async","await","by","descending","dynamic","equals","file","from","get","global","group","init","into","join","let","nameof","not","notnull","on","or","orderby","partial","record","remove","required","scoped","select","set","unmanaged","value|0","var","when","where","with","yield"]),
built_in:["bool","byte","char","decimal","delegate","double","dynamic","enum","float","int","long","nint","nuint","object","sbyte","short","string","ulong","uint","ushort"],
literal:["default","false","null","true"]},t=e.inherit(e.TITLE_MODE,{
begin:"[a-zA-Z](\\.?\\w)*"}),a="\\d(_*\\d)*",i="([uU][lL]?|[lL][uU]?)?",r={
className:"number",variants:[{begin:"\\b0[bB]_*[01](_*[01])*"+i},{
begin:"(-?)\\b0[xX]_*[a-fA-F0-9](_*[a-fA-F0-9])*"+i},{
begin:"(-?)(\\b"+a+"(\\.("+a+")?)?|\\."+a+")([eE][-+]?"+a+")?([fFdDmM]|[uU][lL]?|[lL][uU]?)?"
}],relevance:0},s={className:"string",begin:'@"',end:'"',contains:[{begin:'""'}]
},o=e.inherit(s,{illegal:/\n/}),c={className:"subst",begin:/\{/,end:/\}/,
keywords:n},l=e.inherit(c,{illegal:/\n/}),d={className:"string",begin:/\$"/,
end:'"',illegal:/\n/,contains:[{begin:/\{\{/},{begin:/\}\}/
},e.BACKSLASH_ESCAPE,l]},g={className:"string",begin:/\$@"/,end:'"',contains:[{
begin:/\{\{/},{begin:/\}\}/},{begin:'""'},c]},u=e.inherit(g,{illegal:/\n/,
contains:[{begin:/\{\{/},{begin:/\}\}/},{begin:'""'},l]})
;c.contains=[g,d,s,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,r,e.C_BLOCK_COMMENT_MODE],
l.contains=[u,d,o,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,r,e.inherit(e.C_BLOCK_COMMENT_MODE,{
illegal:/\n/})];const b={variants:[{className:"string",
begin:/"""("*)(?!")(.|\n)*?"""\1/,relevance:1
},g,d,s,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]},m={begin:"<",end:">",
contains:[{beginKeywords:"in out"},t]
},p=e.IDENT_RE+"(<"+e.IDENT_RE+"(\\s*,\\s*"+e.IDENT_RE+")*>)?(\\[\\])?",_={
begin:"@"+e.IDENT_RE,relevance:0};return{name:"C#",aliases:["cs","c#"],
keywords:n,illegal:/::/,contains:[e.COMMENT("///","$",{returnBegin:!0,
contains:[{className:"doctag",variants:[{begin:"///",relevance:0},{
begin:"\x3c!--|--\x3e"},{begin:"</?",end:">"}]}]
}),e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,{className:"meta",begin:"#",
end:"$",keywords:{
keyword:"if else elif endif define undef warning error line region endregion pragma checksum"
}},b,r,{beginKeywords:"class interface",relevance:0,end:/[{;=]/,
illegal:/[^\s:,]/,contains:[{beginKeywords:"where class"
},t,m,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},{beginKeywords:"namespace",
relevance:0,end:/[{;=]/,illegal:/[^\s:]/,
contains:[t,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},{
beginKeywords:"record",relevance:0,end:/[{;=]/,illegal:/[^\s:]/,
contains:[t,m,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},{className:"meta",
begin:"^\\s*\\[(?=[\\w])",excludeBegin:!0,end:"\\]",excludeEnd:!0,contains:[{
className:"string",begin:/"/,end:/"/}]},{
beginKeywords:"new return throw await else",relevance:0},{className:"function",
begin:"("+p+"\\s+)+"+e.IDENT_RE+"\\s*(<[^=]+>\\s*)?\\(",returnBegin:!0,
end:/\s*[{;=]/,excludeEnd:!0,keywords:n,contains:[{
beginKeywords:"public private protected static internal protected abstract async extern override unsafe virtual new sealed partial",
relevance:0},{begin:e.IDENT_RE+"\\s*(<[^=]+>\\s*)?\\(",returnBegin:!0,
contains:[e.TITLE_MODE,m],relevance:0},{match:/\(\)/},{className:"params",
begin:/\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:n,relevance:0,
contains:[b,r,e.C_BLOCK_COMMENT_MODE]
},e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},_]}},grmr_css:e=>{
const n=e.regex,t=Ce(e),a=[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE];return{
name:"CSS",case_insensitive:!0,illegal:/[=|'\$]/,keywords:{
keyframePosition:"from to"},classNameAliases:{keyframePosition:"selector-tag"},
contains:[t.BLOCK_COMMENT,{begin:/-(webkit|moz|ms|o)-(?=[a-z])/
},t.CSS_NUMBER_MODE,{className:"selector-id",begin:/#[A-Za-z0-9_-]+/,relevance:0
},{className:"selector-class",begin:"\\.[a-zA-Z-][a-zA-Z0-9_-]*",relevance:0
},t.ATTRIBUTE_SELECTOR_MODE,{className:"selector-pseudo",variants:[{
begin:":("+De.join("|")+")"},{begin:":(:)?("+Ie.join("|")+")"}]
},t.CSS_VARIABLE,{className:"attribute",begin:"\\b("+Le.join("|")+")\\b"},{
begin:/:/,end:/[;}{]/,
contains:[t.BLOCK_COMMENT,t.HEXCOLOR,t.IMPORTANT,t.CSS_NUMBER_MODE,t.UNICODE_RANGE,...a,{
begin:/(url|data-uri)\(/,end:/\)/,relevance:0,keywords:{built_in:"url data-uri"
},contains:[...a,{className:"string",begin:/[^)]/,endsWithParent:!0,
excludeEnd:!0}]},t.FUNCTION_DISPATCH]},{begin:n.lookahead(/@/),end:"[{;]",
relevance:0,illegal:/:/,contains:[{className:"keyword",begin:/@-?\w[\w]*(-\w+)*/
},{begin:/\s/,endsWithParent:!0,excludeEnd:!0,relevance:0,keywords:{
$pattern:/[a-z-]+/,keyword:"and or not only",attribute:Re.join(" ")},contains:[{
begin:/[a-z-]+(?=:)/,className:"attribute"},...a,t.CSS_NUMBER_MODE]}]},{
className:"selector-tag",begin:"\\b("+Te.join("|")+")\\b"}]}},grmr_diff:e=>{
const n=e.regex;return{name:"Diff",aliases:["patch"],contains:[{
className:"meta",relevance:10,
match:n.either(/^@@ +-\d+,\d+ +\+\d+,\d+ +@@/,/^@@ +-\d+ +\+\d+,\d+ +@@/,/^@@ +-\d+,\d+ +\+\d+ +@@/,/^@@ +-\d+ +\+\d+ +@@/,/^\*\*\* +\d+,\d+ +\*\*\*\*$/,/^--- +\d+,\d+ +----$/)
},{className:"comment",variants:[{
begin:n.either(/Index: /,/^index/,/={3,}/,/^-{3}/,/^\*{3} /,/^\+{3}/,/^diff --git/),
end:/$/},{match:/^\*{15}$/}]},{className:"addition",begin:/^\+/,end:/$/},{
className:"deletion",begin:/^-/,end:/$/},{className:"addition",begin:/^!/,
end:/$/}]}},grmr_go:e=>{const n={
keyword:["break","case","chan","const","continue","default","defer","else","fallthrough","for","func","go","goto","if","import","interface","map","package","range","return","select","struct","switch","type","var"],
type:["bool","byte","complex64","complex128","error","float32","float64","int8","int16","int32","int64","string","uint8","uint16","uint32","uint64","int","uint","uintptr","rune"],
literal:["true","false","iota","nil"],
built_in:["append","cap","close","complex","copy","imag","len","make","new","panic","print","println","real","recover","delete"]
};return{name:"Go",aliases:["golang"],keywords:n,illegal:"</",
contains:[e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,{className:"string",
variants:[e.QUOTE_STRING_MODE,e.APOS_STRING_MODE,{begin:"`",end:"`"}]},{
className:"number",variants:[{
match:/-?\b0[xX]\.[a-fA-F0-9](_?[a-fA-F0-9])*[pP][+-]?\d(_?\d)*i?/,relevance:0
},{
match:/-?\b0[xX](_?[a-fA-F0-9])+((\.([a-fA-F0-9](_?[a-fA-F0-9])*)?)?[pP][+-]?\d(_?\d)*)?i?/,
relevance:0},{match:/-?\b0[oO](_?[0-7])*i?/,relevance:0},{
match:/-?\b0[bB](_?[01])*i?/,relevance:0},{
match:/-?\.\d(_?\d)*([eE][+-]?\d(_?\d)*)?i?/,relevance:0},{
match:/-?\b\d(_?\d)*(\.(\d(_?\d)*)?)?([eE][+-]?\d(_?\d)*)?i?/,relevance:0}]},{
begin:/:=/},{className:"function",beginKeywords:"func",end:"\\s*(\\{|$)",
excludeEnd:!0,contains:[e.TITLE_MODE,{className:"params",begin:/\(/,end:/\)/,
endsParent:!0,keywords:n,illegal:/["']/}]}]}},grmr_graphql:e=>{const n=e.regex
;return{name:"GraphQL",aliases:["gql"],case_insensitive:!0,disableAutodetect:!1,
keywords:{
keyword:["query","mutation","subscription","type","input","schema","directive","interface","union","scalar","fragment","enum","on"],
literal:["true","false","null"]},
contains:[e.HASH_COMMENT_MODE,e.QUOTE_STRING_MODE,e.NUMBER_MODE,{
scope:"punctuation",match:/[.]{3}/,relevance:0},{scope:"punctuation",
begin:/[\!\(\)\:\=\[\]\{\|\}]{1}/,relevance:0},{scope:"variable",begin:/\$/,
end:/\W/,excludeEnd:!0,relevance:0},{scope:"meta",match:/@\w+/,excludeEnd:!0},{
scope:"symbol",begin:n.concat(/[_A-Za-z][_0-9A-Za-z]*/,n.lookahead(/\s*:/)),
relevance:0}],illegal:[/[;<']/,/BEGIN/]}},grmr_ini:e=>{const n=e.regex,t={
className:"number",relevance:0,variants:[{begin:/([+-]+)?[\d]+_[\d_]+/},{
begin:e.NUMBER_RE}]},a=e.COMMENT();a.variants=[{begin:/;/,end:/$/},{begin:/#/,
end:/$/}];const i={className:"variable",variants:[{begin:/\$[\w\d"][\w\d_]*/},{
begin:/\$\{(.*?)\}/}]},r={className:"literal",
begin:/\bon|off|true|false|yes|no\b/},s={className:"string",
contains:[e.BACKSLASH_ESCAPE],variants:[{begin:"'''",end:"'''",relevance:10},{
begin:'"""',end:'"""',relevance:10},{begin:'"',end:'"'},{begin:"'",end:"'"}]
},o={begin:/\[/,end:/\]/,contains:[a,r,i,s,t,"self"],relevance:0
},c=n.either(/[A-Za-z0-9_-]+/,/"(\\"|[^"])*"/,/'[^']*'/);return{
name:"TOML, also INI",aliases:["toml"],case_insensitive:!0,illegal:/\S/,
contains:[a,{className:"section",begin:/\[+/,end:/\]+/},{
begin:n.concat(c,"(\\s*\\.\\s*",c,")*",n.lookahead(/\s*=\s*[^#\s]/)),
className:"attr",starts:{end:/$/,contains:[a,o,r,i,s,t]}}]}},grmr_java:e=>{
const n=e.regex,t="[\xc0-\u02b8a-zA-Z_$][\xc0-\u02b8a-zA-Z_$0-9]*",a="(?:(?:\\s*\\[\\s*])+)?",i=t+"<@@@>"+a,r="(?:\\?(?:\\s+(?:extends|super)\\s+"+i+")?|"+i+")",s=Ue("(?:\\s*<\\s*"+r+"(?:\\s*,\\s*"+r+")*\\s*>)?",/<@@@>/g,2),o={
keyword:["synchronized","abstract","private","var","static","if","const ","for","while","strictfp","finally","protected","import","native","final","void","enum","else","break","transient","catch","instanceof","volatile","case","assert","package","default","public","try","switch","continue","throws","protected","public","private","module","requires","exports","do","sealed","yield","permits","goto","when"],
literal:["false","true","null"],
type:["char","boolean","long","float","int","byte","short","double"],
built_in:["super","this"]},c={className:"meta",begin:"@"+t,contains:[{
begin:/\(/,end:/\)/,contains:["self"]}]},l={className:"params",begin:/\(/,
end:/\)/,keywords:o,relevance:0,contains:[e.C_BLOCK_COMMENT_MODE],endsParent:!0}
;return{name:"Java",aliases:["jsp"],keywords:o,illegal:/<\/|#/,
contains:[e.COMMENT("/\\*\\*","\\*/",{relevance:0,contains:[{begin:/\w+@/,
relevance:0},{className:"doctag",begin:"@[A-Za-z]+"}]}),{
begin:/import java\.[a-z]+\./,keywords:"import",relevance:2
},e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,{begin:/"""/,end:/"""/,
className:"string",contains:[e.BACKSLASH_ESCAPE]
},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,{
match:[/\b(?:class|interface|enum|extends|implements|new)/,/\s+/,t],className:{
1:"keyword",3:"title.class"}},{match:/non-sealed/,scope:"keyword"},{
beginKeywords:"new throw return else yield assert",relevance:0},{
begin:[t,n.concat(s,a,/\s+/),t,a,/\s*/,/=(?!=)/],className:{1:"type",
3:"variable",6:"operator"}},{begin:[/record/,/\s+/,t],className:{1:"keyword",
3:"title.class"},contains:[l,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},{
begin:[t,n.concat(s,a,/\s+/),t,/\s*(?=\()/],className:{1:"type",
3:"title.function"},keywords:o,contains:[{className:"params",begin:/\(/,
end:/\)/,keywords:o,relevance:0,
contains:[c,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,je,e.C_BLOCK_COMMENT_MODE]
},e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},je,c]}},grmr_javascript:ge,
grmr_json:e=>{const n=["true","false","null"],t={scope:"literal",
beginKeywords:n.join(" ")};return{name:"JSON",aliases:["jsonc","json5"],
keywords:{literal:n},contains:[{className:"attr",
begin:/(("(\\.|[^\\"\r\n])*")|('(\\.|[^\\'\r\n])*'))(?=\s*:)/,relevance:1.01},{
match:/[{}[\],:]/,className:"punctuation",relevance:0
},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,t,ae,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE],
illegal:"\\S"}},grmr_kotlin:e=>{const n={
keyword:"abstract as val var vararg get set class object open private protected public noinline crossinline dynamic final enum if else do while for when throw try catch finally import package is in fun override companion reified inline lateinit init interface annotation data sealed internal infix operator out by constructor super tailrec where const inner suspend typealias external expect actual",
built_in:"Byte Short Char Int Long Boolean Float Double Void Unit Nothing",
literal:"true false null"},t={className:"symbol",begin:e.UNDERSCORE_IDENT_RE+"@"
},a={className:"subst",begin:/\$\{/,end:/\}/,contains:[e.C_NUMBER_MODE]},i={
className:"variable",begin:"\\$"+e.UNDERSCORE_IDENT_RE},r={className:"string",
variants:[{begin:'"""',end:'"""(?=[^"])',contains:[i,a]},{begin:"'",end:"'",
illegal:/\n/,contains:[e.BACKSLASH_ESCAPE]},{begin:'"',end:'"',illegal:/\n/,
contains:[e.BACKSLASH_ESCAPE,i,a]}]};a.contains.push(r);const s={
className:"meta",
begin:"@(?:file|property|field|get|set|receiver|param|setparam|delegate)\\s*:(?:\\s*"+e.UNDERSCORE_IDENT_RE+")?"
},o={className:"meta",begin:"@"+e.UNDERSCORE_IDENT_RE,contains:[{begin:/\(/,
end:/\)/,contains:[e.inherit(r,{className:"string"}),"self"]}]
},c=je,l=e.COMMENT("/\\*","\\*/",{contains:[e.C_BLOCK_COMMENT_MODE]}),d={
variants:[{className:"type",begin:e.UNDERSCORE_IDENT_RE},{begin:/\(/,end:/\)/,
contains:[]}]},g=d;return g.variants[1].contains=[d],d.variants[1].contains=[g],
{name:"Kotlin",aliases:["kt","kts","ktm","ktx"],keywords:n,
contains:[e.COMMENT("/\\*\\*","\\*/",{relevance:0,contains:[{className:"doctag",
begin:"@[A-Za-z]+"}]}),e.C_LINE_COMMENT_MODE,l,{className:"keyword",
begin:/\b(break|continue|return|this)\b/,starts:{contains:[{className:"symbol",
begin:/@\w+/}]}},t,s,o,{className:"function",beginKeywords:"fun",end:"[(]|$",
returnBegin:!0,excludeEnd:!0,keywords:n,relevance:5,contains:[{
begin:e.UNDERSCORE_IDENT_RE+"\\s*\\(",returnBegin:!0,relevance:0,
contains:[e.UNDERSCORE_TITLE_MODE]},{className:"type",begin:/</,end:/>/,
keywords:"reified",relevance:0},{className:"params",begin:/\(/,end:/\)/,
endsParent:!0,keywords:n,relevance:0,contains:[{begin:/:/,end:/[=,\/]/,
endsWithParent:!0,contains:[d,e.C_LINE_COMMENT_MODE,l],relevance:0
},e.C_LINE_COMMENT_MODE,l,s,o,r,e.C_NUMBER_MODE]},l]},{
begin:[/class|interface|trait/,/\s+/,e.UNDERSCORE_IDENT_RE],beginScope:{
3:"title.class"},keywords:"class interface trait",end:/[:\{(]|$/,excludeEnd:!0,
illegal:"extends implements",contains:[{
beginKeywords:"public protected internal private constructor"
},e.UNDERSCORE_TITLE_MODE,{className:"type",begin:/</,end:/>/,excludeBegin:!0,
excludeEnd:!0,relevance:0},{className:"type",begin:/[,:]\s*/,end:/[<\(,){\s]|$/,
excludeBegin:!0,returnEnd:!0},s,o]},r,{className:"meta",begin:"^#!/usr/bin/env",
end:"$",illegal:"\n"},c]}},grmr_less:e=>{
const n=Ce(e),t=Be,a="[\\w-]+",i="("+a+"|@\\{"+a+"\\})",r=[],s=[],o=e=>({
className:"string",begin:"~?"+e+".*?"+e}),c=(e,n,t)=>({className:e,begin:n,
relevance:t}),l={$pattern:/[a-z-]+/,keyword:"and or not only",
attribute:Re.join(" ")},d={begin:"\\(",end:"\\)",contains:s,keywords:l,
relevance:0}
;s.push(e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,o("'"),o('"'),n.CSS_NUMBER_MODE,{
begin:"(url|data-uri)\\(",starts:{className:"string",end:"[\\)\\n]",
excludeEnd:!0}
},n.UNICODE_RANGE,n.HEXCOLOR,d,c("variable","@@?"+a,10),c("variable","@\\{"+a+"\\}"),c("built_in","~?`[^`]*?`"),{
className:"attribute",begin:a+"\\s*:",end:":",returnBegin:!0,excludeEnd:!0
},n.IMPORTANT,{beginKeywords:"and not"},n.FUNCTION_DISPATCH);const g=s.concat({
begin:/\{/,end:/\}/,contains:r}),u={beginKeywords:"when",endsWithParent:!0,
contains:[{beginKeywords:"and not"}].concat(s)},b={begin:i+"\\s*:",
returnBegin:!0,end:/[;}]/,relevance:0,contains:[{begin:/-(webkit|moz|ms|o)-/
},n.CSS_VARIABLE,{className:"attribute",begin:"\\b("+Le.join("|")+")\\b",
end:/(?=:)/,starts:{endsWithParent:!0,illegal:"[<=$]",relevance:0,contains:s}}]
},m={className:"keyword",
begin:"@(import|media|charset|font-face|(-[a-z]+-)?keyframes|supports|document|namespace|page|viewport|host)\\b",
starts:{end:"[;{}]",keywords:l,returnEnd:!0,contains:s,relevance:0}},p={
className:"variable",variants:[{begin:"@"+a+"\\s*:",relevance:15},{begin:"@"+a
}],starts:{end:"[;}]",returnEnd:!0,contains:g}},_={variants:[{
begin:"[\\.#:&\\[>]",end:"[;{}]"},{begin:i,end:/\{/}],returnBegin:!0,
returnEnd:!0,illegal:"[<='$\"]",relevance:0,
contains:[e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,u,c("keyword","all\\b"),c("variable","@\\{"+a+"\\}"),{
begin:"\\b("+Te.join("|")+")\\b",className:"selector-tag"
},n.CSS_NUMBER_MODE,c("selector-tag",i,0),c("selector-id","#"+i),c("selector-class","\\."+i,0),c("selector-tag","&",0),n.ATTRIBUTE_SELECTOR_MODE,{
className:"selector-pseudo",begin:":("+De.join("|")+")"},{
className:"selector-pseudo",begin:":(:)?("+Ie.join("|")+")"},{begin:/\(/,
end:/\)/,relevance:0,contains:g},{begin:"!important"},n.FUNCTION_DISPATCH]},h={
begin:a+":(:)?"+`(${t.join("|")})`,returnBegin:!0,contains:[_]}
;return r.push(e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,m,p,h,b,_,u,n.FUNCTION_DISPATCH),
{name:"Less",case_insensitive:!0,illegal:"[=>'/<($\"]",contains:r}},
grmr_lua:e=>{const n="\\[=*\\[",t="\\]=*\\]",a={begin:n,end:t,contains:["self"]
},i=[e.COMMENT("--(?!"+n+")","$"),e.COMMENT("--"+n,t,{contains:[a],relevance:10
})];return{name:"Lua",aliases:["pluto"],keywords:{
$pattern:e.UNDERSCORE_IDENT_RE,literal:"true false nil",
keyword:"and break do else elseif end for goto if in local global not or repeat return then until while",
built_in:"_G _ENV _VERSION __index __newindex __mode __call __metatable __tostring __len __gc __add __sub __mul __div __mod __pow __concat __unm __eq __lt __le assert collectgarbage dofile error getfenv getmetatable ipairs load loadfile loadstring module next pairs pcall print rawequal rawget rawset require select setfenv setmetatable tonumber tostring type unpack xpcall arg self coroutine resume yield status wrap create running debug getupvalue debug sethook getmetatable gethook setmetatable setlocal traceback setfenv getinfo setupvalue getlocal getregistry getfenv io lines write close flush open output type read stderr stdin input stdout popen tmpfile math log max acos huge ldexp pi cos tanh pow deg tan cosh sinh random randomseed frexp ceil floor rad abs sqrt modf asin min mod fmod log10 atan2 exp sin atan os exit setlocale date getenv difftime remove time clock tmpname rename execute package preload loadlib loaded loaders cpath config path seeall string sub upper len gfind rep find match char dump gmatch reverse byte format gsub lower table setn insert getn foreachi maxn foreach concat sort remove"
},contains:i.concat([{className:"function",beginKeywords:"function",end:"\\)",
contains:[e.inherit(e.TITLE_MODE,{
begin:"([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*"}),{className:"params",
begin:"\\(",endsWithParent:!0,contains:i}].concat(i)
},e.C_NUMBER_MODE,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,{className:"string",
begin:n,end:t,contains:[a],relevance:5}])}},grmr_makefile:e=>{const n={
className:"variable",variants:[{begin:"\\$\\("+e.UNDERSCORE_IDENT_RE+"\\)",
contains:[e.BACKSLASH_ESCAPE]},{begin:/\$[@%<?\^\+\*]/}]},t={className:"string",
begin:/"/,end:/"/,contains:[e.BACKSLASH_ESCAPE,n]},a={className:"variable",
begin:/\$\([\w-]+\s/,end:/\)/,keywords:{
built_in:"subst patsubst strip findstring filter filter-out sort word wordlist firstword lastword dir notdir suffix basename addsuffix addprefix join wildcard realpath abspath error warning shell origin flavor foreach if or and call eval file value"
},contains:[n,t]},i={begin:"^"+e.UNDERSCORE_IDENT_RE+"\\s*(?=[:+?]?=)"},r={
className:"section",begin:/^[^\s]+:/,end:/$/,contains:[n]};return{
name:"Makefile",aliases:["mk","mak","make"],keywords:{$pattern:/[\w-]+/,
keyword:"define endef undefine ifdef ifndef ifeq ifneq else endif include -include sinclude override export unexport private vpath"
},contains:[e.HASH_COMMENT_MODE,n,t,a,i,{className:"meta",begin:/^\.PHONY:/,
end:/$/,keywords:{$pattern:/[\.\w]+/,keyword:".PHONY"}},r]}},grmr_markdown:e=>{
const n={begin:/<\/?[A-Za-z_]/,end:">",subLanguage:"xml",relevance:0},t={
variants:[{begin:/\[.+?\]\[.*?\]/,relevance:0},{
begin:/\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)/,
relevance:2},{
begin:e.regex.concat(/\[.+?\]\(/,/[A-Za-z][A-Za-z0-9+.-]*/,/:\/\/.*?\)/),
relevance:2},{begin:/\[.+?\]\([./?&#].*?\)/,relevance:1},{
begin:/\[.*?\]\(.*?\)/,relevance:0}],returnBegin:!0,contains:[{match:/\[(?=\])/
},{className:"string",relevance:0,begin:"\\[",end:"\\]",excludeBegin:!0,
returnEnd:!0},{className:"link",relevance:0,begin:"\\]\\(",end:"\\)",
excludeBegin:!0,excludeEnd:!0},{className:"symbol",relevance:0,begin:"\\]\\[",
end:"\\]",excludeBegin:!0,excludeEnd:!0}]},a={className:"strong",contains:[],
variants:[{begin:/_{2}(?!\s)/,end:/_{2}/},{begin:/\*{2}(?!\s)/,end:/\*{2}/}]
},i={className:"emphasis",contains:[],variants:[{begin:/\*(?![*\s])/,end:/\*/},{
begin:/_(?![_\s])/,end:/_/,relevance:0}]},r=e.inherit(a,{contains:[]
}),s=e.inherit(i,{contains:[]});a.contains.push(s),i.contains.push(r)
;let o=[n,t];return[a,i,r,s].forEach(e=>{e.contains=e.contains.concat(o)
}),o=o.concat(a,i),{name:"Markdown",aliases:["md","mkdown","mkd"],contains:[{
className:"section",variants:[{begin:"^#{1,6}",end:"$",contains:o},{
begin:"(?=^.+?\\n[=-]{2,}$)",contains:[{begin:"^[=-]*$"},{begin:"^",end:"\\n",
contains:o}]}]},n,{className:"bullet",begin:"^[ \t]*([*+-]|(\\d+\\.))(?=\\s+)",
end:"\\s+",excludeEnd:!0},{match:/^ {0,3}([-*_])[ \t]*(?:\1[ \t]*){2,}$/},a,i,{
className:"quote",begin:"^>\\s+",contains:o,end:"$"},{className:"code",
variants:[{begin:"(`{3,})[^`](.|\\n)*?\\1`*[ ]*"},{
begin:"(~{3,})[^~](.|\\n)*?\\1~*[ ]*"},{begin:"```",end:"```+[ ]*$"},{
begin:"~~~",end:"~~~+[ ]*$"},{begin:"`.+?`"},{begin:"(?=^( {4}|\\t))",
contains:[{begin:"^( {4}|\\t)",end:"(\\n)$"}],relevance:0}]},t,{
begin:/^\[[^\n]+\]:/,returnBegin:!0,contains:[{className:"symbol",begin:/\[/,
end:/\]/,excludeBegin:!0,excludeEnd:!0},{className:"link",begin:/:\s*/,end:/$/,
excludeBegin:!0}]},{scope:"literal",
match:/&([a-zA-Z0-9]+|#[0-9]{1,7}|#[Xx][0-9a-fA-F]{1,6});/}]}},
grmr_objectivec:e=>{const n=/[a-zA-Z@][a-zA-Z0-9_]*/,t={$pattern:n,
keyword:["@interface","@class","@protocol","@implementation"]};return{
name:"Objective-C",aliases:["mm","objc","obj-c","obj-c++","objective-c++"],
keywords:{"variable.language":["this","super"],$pattern:n,
keyword:["while","export","sizeof","typedef","const","struct","for","union","volatile","static","mutable","if","do","return","goto","enum","else","break","extern","asm","case","default","register","explicit","typename","switch","continue","inline","readonly","assign","readwrite","self","@synchronized","id","typeof","nonatomic","IBOutlet","IBAction","strong","weak","copy","in","out","inout","bycopy","byref","oneway","__strong","__weak","__block","__autoreleasing","@private","@protected","@public","@try","@property","@end","@throw","@catch","@finally","@autoreleasepool","@synthesize","@dynamic","@selector","@optional","@required","@encode","@package","@import","@defs","@compatibility_alias","__bridge","__bridge_transfer","__bridge_retained","__bridge_retain","__covariant","__contravariant","__kindof","_Nonnull","_Nullable","_Null_unspecified","__FUNCTION__","__PRETTY_FUNCTION__","__attribute__","getter","setter","retain","unsafe_unretained","nonnull","nullable","null_unspecified","null_resettable","class","instancetype","NS_DESIGNATED_INITIALIZER","NS_UNAVAILABLE","NS_REQUIRES_SUPER","NS_RETURNS_INNER_POINTER","NS_INLINE","NS_AVAILABLE","NS_DEPRECATED","NS_ENUM","NS_OPTIONS","NS_SWIFT_UNAVAILABLE","NS_ASSUME_NONNULL_BEGIN","NS_ASSUME_NONNULL_END","NS_REFINED_FOR_SWIFT","NS_SWIFT_NAME","NS_SWIFT_NOTHROW","NS_DURING","NS_HANDLER","NS_ENDHANDLER","NS_VALUERETURN","NS_VOIDRETURN"],
literal:["false","true","FALSE","TRUE","nil","YES","NO","NULL"],
built_in:["dispatch_once_t","dispatch_queue_t","dispatch_sync","dispatch_async","dispatch_once"],
type:["int","float","char","unsigned","signed","short","long","double","wchar_t","unichar","void","bool","BOOL","id|0","_Bool"]
},illegal:"</",contains:[{className:"built_in",
begin:"\\b(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)\\w+"
},e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,e.C_NUMBER_MODE,e.QUOTE_STRING_MODE,e.APOS_STRING_MODE,{
className:"string",variants:[{begin:'@"',end:'"',illegal:"\\n",
contains:[e.BACKSLASH_ESCAPE]}]},{className:"meta",begin:/#\s*[a-z]+\b/,end:/$/,
keywords:{
keyword:"if else elif endif define undef warning error line pragma ifdef ifndef include"
},contains:[{begin:/\\\n/,relevance:0},e.inherit(e.QUOTE_STRING_MODE,{
className:"string"}),{className:"string",begin:/<.*?>/,end:/$/,illegal:"\\n"
},e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},{className:"class",
begin:"("+t.keyword.join("|")+")\\b",end:/(\{|$)/,excludeEnd:!0,keywords:t,
contains:[e.UNDERSCORE_TITLE_MODE]},{begin:"\\."+e.UNDERSCORE_IDENT_RE,
relevance:0}]}},grmr_perl:e=>{const n=e.regex,t=/[dualxmsipngr]{0,12}/,a={
$pattern:/[\w.]+/,
keyword:"abs accept alarm and atan2 bind binmode bless break caller chdir chmod chomp chop chown chr chroot class close closedir connect continue cos crypt dbmclose dbmopen defined delete die do dump each else elsif endgrent endhostent endnetent endprotoent endpwent endservent eof eval exec exists exit exp fcntl field fileno flock for foreach fork format formline getc getgrent getgrgid getgrnam gethostbyaddr gethostbyname gethostent getlogin getnetbyaddr getnetbyname getnetent getpeername getpgrp getpriority getprotobyname getprotobynumber getprotoent getpwent getpwnam getpwuid getservbyname getservbyport getservent getsockname getsockopt given glob gmtime goto grep gt hex if index int ioctl join keys kill last lc lcfirst length link listen local localtime log lstat lt ma map method mkdir msgctl msgget msgrcv msgsnd my ne next no not oct open opendir or ord our pack package pipe pop pos print printf prototype push q|0 qq quotemeta qw qx rand read readdir readline readlink readpipe recv redo ref rename require reset return reverse rewinddir rindex rmdir say scalar seek seekdir select semctl semget semop send setgrent sethostent setnetent setpgrp setpriority setprotoent setpwent setservent setsockopt shift shmctl shmget shmread shmwrite shutdown sin sleep socket socketpair sort splice split sprintf sqrt srand stat state study sub substr symlink syscall sysopen sysread sysseek system syswrite tell telldir tie tied time times tr truncate uc ucfirst umask undef unless unlink unpack unshift untie until use utime values vec wait waitpid wantarray warn when while write x|0 xor y|0"
},i={className:"subst",begin:"[$@]\\{",end:"\\}",keywords:a},r={begin:/->\{/,
end:/\}/},s={scope:"attr",match:/\s+:\s*\w+(\s*\(.*?\))?/},o={scope:"variable",
variants:[{begin:/\$\d/},{
begin:n.concat(/[$%@](?!")(\^\w\b|#\w+(::\w+)*|\{\w+\}|\w+(::\w*)*)/,"(?![A-Za-z])(?![@$%])")
},{begin:/[$%@](?!")[^\s\w{=]|\$=/,relevance:0}],contains:[s]},c={
className:"number",variants:[{match:/0?\.[0-9][0-9_]+\b/},{
match:/\bv?(0|[1-9][0-9_]*(\.[0-9_]+)?|[1-9][0-9_]*)\b/},{
match:/\b0[0-7][0-7_]*\b/},{match:/\b0x[0-9a-fA-F][0-9a-fA-F_]*\b/},{
match:/\b0b[0-1][0-1_]*\b/}],relevance:0
},l=[e.BACKSLASH_ESCAPE,i,o],d=[/!/,/\//,/\|/,/\?/,/'/,/"/,/#/],g=(e,a,i="\\1")=>{
const r="\\1"===i?i:n.concat(i,a)
;return n.concat(n.concat("(?:",e,")"),a,/(?:\\.|[^\\\/])*?/,r,/(?:\\.|[^\\\/])*?/,i,t)
},u=(e,a,i)=>n.concat(n.concat("(?:",e,")"),a,/(?:\\.|[^\\\/])*?/,i,t),b=[o,e.HASH_COMMENT_MODE,e.COMMENT(/^=\w/,/=cut/,{
endsWithParent:!0}),r,{className:"string",contains:l,variants:[{
begin:"q[qwxr]?\\s*\\(",end:"\\)",relevance:5},{begin:"q[qwxr]?\\s*\\[",
end:"\\]",relevance:5},{begin:"q[qwxr]?\\s*\\{",end:"\\}",relevance:5},{
begin:"q[qwxr]?\\s*\\|",end:"\\|",relevance:5},{begin:"q[qwxr]?\\s*<",end:">",
relevance:5},{begin:"qw\\s+q",end:"q",relevance:5},{begin:"'",end:"'",
contains:[e.BACKSLASH_ESCAPE]},{begin:'"',end:'"'},{begin:"`",end:"`",
contains:[e.BACKSLASH_ESCAPE]},{begin:/\{\w+\}/,relevance:0},{
begin:"-?\\w+\\s*=>",relevance:0}]},c,{
begin:"(\\/\\/|"+e.RE_STARTERS_RE+"|\\b(split|return|print|reverse|grep)\\b)\\s*",
keywords:"split return print reverse grep",relevance:0,
contains:[e.HASH_COMMENT_MODE,{className:"regexp",variants:[{
begin:g("s|tr|y",n.either(...d,{capture:!0}))},{begin:g("s|tr|y","\\(","\\)")},{
begin:g("s|tr|y","\\[","\\]")},{begin:g("s|tr|y","\\{","\\}")}],relevance:2},{
className:"regexp",variants:[{begin:/(m|qr)\/\//,relevance:0},{
begin:u("(?:m|qr)?",/\//,/\//)},{begin:u("m|qr",n.either(...d,{capture:!0
}),/\1/)},{begin:u("m|qr",/\(/,/\)/)},{begin:u("m|qr",/\[/,/\]/)},{
begin:u("m|qr",/\{/,/\}/)}]}]},{className:"function",beginKeywords:"sub method",
end:"(\\s*\\(.*?\\))?[;{]",excludeEnd:!0,relevance:5,contains:[e.TITLE_MODE,s]
},{className:"class",beginKeywords:"class",end:"[;{]",excludeEnd:!0,relevance:5,
contains:[e.TITLE_MODE,s,c]},{begin:"-\\w\\b",relevance:0},{begin:"^__DATA__$",
end:"^__END__$",subLanguage:"mojolicious",contains:[{begin:"^@@.*",end:"$",
className:"comment"}]}];return i.contains=b,r.contains=b,{name:"Perl",
aliases:["pl","pm"],keywords:a,contains:b}},grmr_php:e=>{
const n=e.regex,t=/(?![A-Za-z0-9])(?![$])/,a=n.concat(/[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/,t),i=n.concat(/(\\?[A-Z][a-z0-9_\x7f-\xff]+|\\?[A-Z]+(?=[A-Z][a-z0-9_\x7f-\xff])){1,}/,t),r=n.concat(/[A-Z]+/,t),s={
scope:"variable",match:"\\$+"+a},o={scope:"subst",variants:[{begin:/\$\w+/},{
begin:/\{\$/,end:/\}/}]},c=e.inherit(e.APOS_STRING_MODE,{illegal:null
}),l="[ \t\n]",d={scope:"string",variants:[e.inherit(e.QUOTE_STRING_MODE,{
illegal:null,contains:e.QUOTE_STRING_MODE.contains.concat(o)}),c,{
begin:/<<<[ \t]*(?:(\w+)|"(\w+)")\n/,end:/[ \t]*(\w+)\b/,
contains:e.QUOTE_STRING_MODE.contains.concat(o),"on:begin":(e,n)=>{
n.data._beginMatch=e[1]||e[2]},"on:end":(e,n)=>{
n.data._beginMatch!==e[1]&&n.ignoreMatch()}},e.END_SAME_AS_BEGIN({
begin:/<<<[ \t]*'(\w+)'\n/,end:/[ \t]*(\w+)\b/})]},g={scope:"number",variants:[{
begin:"\\b0[bB][01]+(?:_[01]+)*\\b"},{begin:"\\b0[oO][0-7]+(?:_[0-7]+)*\\b"},{
begin:"\\b0[xX][\\da-fA-F]+(?:_[\\da-fA-F]+)*\\b"},{
begin:"(?:\\b\\d+(?:_\\d+)*(\\.(?:\\d+(?:_\\d+)*))?|\\B\\.\\d+)(?:[eE][+-]?\\d+)?"
}],relevance:0
},u=["false","null","true"],b=["__CLASS__","__DIR__","__FILE__","__FUNCTION__","__COMPILER_HALT_OFFSET__","__LINE__","__METHOD__","__NAMESPACE__","__TRAIT__","die","echo","exit","include","include_once","print","require","require_once","array","abstract","and","as","binary","bool","boolean","break","callable","case","catch","class","clone","const","continue","declare","default","do","double","else","elseif","empty","enddeclare","endfor","endforeach","endif","endswitch","endwhile","enum","eval","extends","final","finally","float","for","foreach","from","global","goto","if","implements","instanceof","insteadof","int","integer","interface","isset","iterable","list","match|0","mixed","new","never","object","or","private","protected","public","readonly","real","return","string","switch","throw","trait","try","unset","use","var","void","while","xor","yield"],m=["Error|0","AppendIterator","ArgumentCountError","ArithmeticError","ArrayIterator","ArrayObject","AssertionError","BadFunctionCallException","BadMethodCallException","CachingIterator","CallbackFilterIterator","CompileError","Countable","DirectoryIterator","DivisionByZeroError","DomainException","EmptyIterator","ErrorException","Exception","FilesystemIterator","FilterIterator","GlobIterator","InfiniteIterator","InvalidArgumentException","IteratorIterator","LengthException","LimitIterator","LogicException","MultipleIterator","NoRewindIterator","OutOfBoundsException","OutOfRangeException","OuterIterator","OverflowException","ParentIterator","ParseError","RangeException","RecursiveArrayIterator","RecursiveCachingIterator","RecursiveCallbackFilterIterator","RecursiveDirectoryIterator","RecursiveFilterIterator","RecursiveIterator","RecursiveIteratorIterator","RecursiveRegexIterator","RecursiveTreeIterator","RegexIterator","RuntimeException","SeekableIterator","SplDoublyLinkedList","SplFileInfo","SplFileObject","SplFixedArray","SplHeap","SplMaxHeap","SplMinHeap","SplObjectStorage","SplObserver","SplPriorityQueue","SplQueue","SplStack","SplSubject","SplTempFileObject","TypeError","UnderflowException","UnexpectedValueException","UnhandledMatchError","ArrayAccess","BackedEnum","Closure","Fiber","Generator","Iterator","IteratorAggregate","Serializable","Stringable","Throwable","Traversable","UnitEnum","WeakReference","WeakMap","Directory","__PHP_Incomplete_Class","parent","php_user_filter","self","static","stdClass"],p={
keyword:b,literal:(e=>{const n=[];return e.forEach(e=>{
n.push(e),e.toLowerCase()===e?n.push(e.toUpperCase()):n.push(e.toLowerCase())}),
n})(u),built_in:m},_=e=>e.map(e=>e.replace(/\|\d+$/,"")),h={variants:[{
match:[/new/,n.concat(l,"+"),n.concat("(?!",_(m).join("\\b|"),"\\b)"),i],scope:{
1:"keyword",4:"title.class"}}]},f=n.concat(a,"\\b(?!\\()"),E={variants:[{
match:[n.concat(/::/,n.lookahead(/(?!class\b)/)),f],scope:{2:"variable.constant"
}},{match:[/::/,/class/],scope:{2:"variable.language"}},{
match:[i,n.concat(/::/,n.lookahead(/(?!class\b)/)),f],scope:{1:"title.class",
3:"variable.constant"}},{match:[i,n.concat("::",n.lookahead(/(?!class\b)/))],
scope:{1:"title.class"}},{match:[i,/::/,/class/],scope:{1:"title.class",
3:"variable.language"}}]},y={scope:"attr",
match:n.concat(a,n.lookahead(":"),n.lookahead(/(?!::)/))},w={relevance:0,
begin:/\(/,end:/\)/,keywords:p,
contains:[y,s,E,e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE,e.HASH_COMMENT_MODE,d,g,h]
},v={relevance:0,
match:[/\b/,n.concat("(?!fn\\b|function\\b|",_(b).join("\\b|"),"|",_(m).join("\\b|"),"\\b)"),a,n.concat(l,"*"),n.lookahead(/(?=\()/)],
scope:{3:"title.function.invoke"},contains:[w]};w.contains.push(v)
;const N=[y,E,e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE,e.HASH_COMMENT_MODE,d,g,h],k={
begin:n.concat(/#\[\s*\\?/,n.either(i,r)),beginScope:"meta",end:/]/,
endScope:"meta",keywords:{literal:u,keyword:["new","array"]},contains:[{
begin:/\[/,end:/]/,keywords:{literal:u,keyword:["new","array"]},
contains:["self",...N]},...N,{scope:"meta",variants:[{match:i},{match:r}]}]}
;return{case_insensitive:!1,keywords:p,
contains:[k,e.HASH_COMMENT_MODE,e.COMMENT("//","$"),e.COMMENT("/\\*","\\*/",{
contains:[{scope:"doctag",match:"@[A-Za-z]+"}]}),{match:/__halt_compiler\(\);/,
keywords:"__halt_compiler",starts:{scope:"comment",end:e.MATCH_NOTHING_RE,
contains:[{match:/\?>/,scope:"meta",endsParent:!0}]}},{scope:"meta",variants:[{
begin:/<\?php/,relevance:10},{begin:/<\?=/},{begin:/<\?/,relevance:.1},{
begin:/\?>/}]},{scope:"variable.language",match:/\$this\b/},s,v,E,{
match:[/const/,/\s/,a],scope:{1:"keyword",3:"variable.constant"}},h,{
scope:"function",relevance:0,beginKeywords:"fn function",end:/[;{]/,
excludeEnd:!0,illegal:"[$%\\[]",contains:[{beginKeywords:"use"
},e.UNDERSCORE_TITLE_MODE,{begin:"=>",endsParent:!0},{scope:"params",
begin:"\\(",end:"\\)",excludeBegin:!0,excludeEnd:!0,keywords:p,
contains:["self",k,s,E,e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE,e.HASH_COMMENT_MODE,d,g]
}]},{scope:"class",variants:[{beginKeywords:"enum",illegal:/[($"]/},{
beginKeywords:"class interface trait",illegal:/[:($"]/}],relevance:0,end:/\{/,
excludeEnd:!0,contains:[{beginKeywords:"extends implements"
},e.UNDERSCORE_TITLE_MODE]},{beginKeywords:"namespace",relevance:0,end:";",
illegal:/[.']/,contains:[e.inherit(e.UNDERSCORE_TITLE_MODE,{scope:"title.class"
})]},{beginKeywords:"use",relevance:0,end:";",contains:[{
match:/\b(as|const|function)\b/,scope:"keyword"},e.UNDERSCORE_TITLE_MODE]},d,g]}
},grmr_php_template:e=>({name:"PHP template",subLanguage:"xml",contains:[{
begin:/<\?(php|=)?/,end:/\?>/,subLanguage:"php",contains:[{begin:"/\\*",
end:"\\*/",skip:!0},{begin:'b"',end:'"',skip:!0},{begin:"b'",end:"'",skip:!0
},e.inherit(e.APOS_STRING_MODE,{illegal:null,className:null,contains:null,
skip:!0}),e.inherit(e.QUOTE_STRING_MODE,{illegal:null,className:null,
contains:null,skip:!0})]}]}),grmr_plaintext:e=>({name:"Plain text",
aliases:["text","txt"],disableAutodetect:!0}),grmr_python:e=>{
const n=e.regex,t=/[\p{XID_Start}_]\p{XID_Continue}*/u,a=["and","as","assert","async","await","break","case","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","lazy","match","nonlocal|10","not","or","pass","raise","return","try","while","with","yield"],i={
$pattern:/[A-Za-z]\w+|__\w+__/,keyword:a,
built_in:["__import__","abs","aiter","all","anext","any","ascii","bin","bool","breakpoint","bytearray","bytes","callable","chr","classmethod","compile","complex","delattr","dict","dir","divmod","enumerate","eval","exec","filter","float","format","frozendict","frozenset","getattr","globals","hasattr","hash","help","hex","id","input","int","isinstance","issubclass","iter","len","list","locals","map","max","memoryview","min","next","object","oct","open","ord","pow","print","property","range","repr","reversed","round","sentinel","set","setattr","slice","sorted","staticmethod","str","sum","super","tuple","type","vars","zip"],
literal:["__debug__","Ellipsis","False","None","NotImplemented","True"],
type:["Any","Callable","Coroutine","Dict","List","Literal","Generic","Optional","Sequence","Set","Tuple","Type","Union"]
},r={className:"meta",begin:/^(>>>|\.\.\.) /},s={className:"subst",begin:/\{/,
end:/\}/,keywords:i,illegal:/#/},o={begin:/\{\{/,relevance:0},c={
className:"string",contains:[e.BACKSLASH_ESCAPE],variants:[{
begin:/([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?'''/,end:/'''/,
contains:[e.BACKSLASH_ESCAPE,r],relevance:10},{
begin:/([uU]|[bB]|[rR]|[bB][rR]|[rR][bB])?"""/,end:/"""/,
contains:[e.BACKSLASH_ESCAPE,r],relevance:10},{
begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])'''/,end:/'''/,
contains:[e.BACKSLASH_ESCAPE,r,o,s]},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])"""/,
end:/"""/,contains:[e.BACKSLASH_ESCAPE,r,o,s]},{begin:/([uU]|[rR])'/,end:/'/,
relevance:10},{begin:/([uU]|[rR])"/,end:/"/,relevance:10},{
begin:/([bB]|[bB][rR]|[rR][bB])'/,end:/'/},{begin:/([bB]|[bB][rR]|[rR][bB])"/,
end:/"/},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])'/,end:/'/,
contains:[e.BACKSLASH_ESCAPE,o,s]},{begin:/([fFtT][rR]|[rR][fFtT]|[fFtT])"/,
end:/"/,contains:[e.BACKSLASH_ESCAPE,o,s]
},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]
},l="[0-9](_?[0-9])*",d=`(\\b(${l}))?\\.(${l})|\\b(${l})\\.`,g="\\b|"+a.join("|"),u={
className:"number",relevance:0,variants:[{
begin:`(\\b(${l})|(${d}))[eE][+-]?(${l})[jJ]?(?=${g})`},{begin:`(${d})[jJ]?`},{
begin:`\\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=${g})`},{
begin:`\\b0[bB](_?[01])+[lL]?(?=${g})`},{begin:`\\b0[oO](_?[0-7])+[lL]?(?=${g})`
},{begin:`\\b0[xX](_?[0-9a-fA-F])+[lL]?(?=${g})`},{begin:`\\b(${l})[jJ](?=${g})`
}]},b={className:"comment",begin:n.lookahead(/# type:/),end:/$/,keywords:i,
contains:[{begin:/# type:/},{begin:/#/,end:/\b\B/,endsWithParent:!0}]},m={
className:"params",variants:[{className:"",begin:/\(\s*\)/,skip:!0},{begin:/\(/,
end:/\)/,excludeBegin:!0,excludeEnd:!0,keywords:i,
contains:["self",r,u,c,e.HASH_COMMENT_MODE]}]};return s.contains=[c,u,r],{
name:"Python",aliases:["py","gyp","ipython"],unicodeRegex:!0,keywords:i,
illegal:/(<\/|\?)|=>/,contains:[r,u,{scope:"variable.language",match:/\bself\b/
},{beginKeywords:"if",relevance:0},{match:/\bor\b/,scope:"keyword"
},c,b,e.HASH_COMMENT_MODE,{match:[/\bdef/,/\s+/,t],scope:{1:"keyword",
3:"title.function"},contains:[m]},{variants:[{
match:[/\bclass/,/\s+/,t,/\s*/,/\(\s*/,t,/\s*\)/]},{match:[/\bclass/,/\s+/,t]}],
scope:{1:"keyword",3:"title.class",6:"title.class.inherited"}},{
className:"meta",begin:/^[\t ]*@/,end:/(?=#)|$/,contains:[u,m,c]}]}},
grmr_python_repl:e=>({aliases:["pycon"],contains:[{className:"meta.prompt",
starts:{end:/ |$/,starts:{end:"$",subLanguage:"python"}},variants:[{
begin:/^>>>(?=[ ]|$)/},{begin:/^\.\.\.(?=[ ]|$)/}]}]}),grmr_r:e=>{
const n=e.regex,t=/(?:(?:[a-zA-Z]|\.[._a-zA-Z])[._a-zA-Z0-9]*)|\.(?!\d)/,a=n.either(/0[xX][0-9a-fA-F]+\.[0-9a-fA-F]*[pP][+-]?\d+i?/,/0[xX][0-9a-fA-F]+(?:[pP][+-]?\d+)?[Li]?/,/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?[Li]?/),i=/[=!<>:]=|\|\||&&|:::?|<-|<<-|->>|->|\|>|[-+*\/?!$&|:<=>@^~]|\*\*/,r=n.either(/[()]/,/[{}]/,/\[\[/,/[[\]]/,/\\/,/,/)
;return{name:"R",keywords:{$pattern:t,
keyword:"function if in break next repeat else for while",
literal:"NULL NA TRUE FALSE Inf NaN NA_integer_|10 NA_real_|10 NA_character_|10 NA_complex_|10",
built_in:"LETTERS letters month.abb month.name pi T F abs acos acosh all any anyNA Arg as.call as.character as.complex as.double as.environment as.integer as.logical as.null.default as.numeric as.raw asin asinh atan atanh attr attributes baseenv browser c call ceiling class Conj cos cosh cospi cummax cummin cumprod cumsum digamma dim dimnames emptyenv exp expression floor forceAndCall gamma gc.time globalenv Im interactive invisible is.array is.atomic is.call is.character is.complex is.double is.environment is.expression is.finite is.function is.infinite is.integer is.language is.list is.logical is.matrix is.na is.name is.nan is.null is.numeric is.object is.pairlist is.raw is.recursive is.single is.symbol lazyLoadDBfetch length lgamma list log max min missing Mod names nargs nzchar oldClass on.exit pos.to.env proc.time prod quote range Re rep retracemem return round seq_along seq_len seq.int sign signif sin sinh sinpi sqrt standardGeneric substitute sum switch tan tanh tanpi tracemem trigamma trunc unclass untracemem UseMethod xtfrm"
},contains:[e.COMMENT(/#'/,/$/,{contains:[{scope:"doctag",match:/@examples/,
starts:{end:n.lookahead(n.either(/\n^#'\s*(?=@[a-zA-Z]+)/,/\n^(?!#')/)),
endsParent:!0}},{scope:"doctag",begin:"@param",end:/$/,contains:[{
scope:"variable",variants:[{match:t},{match:/`(?:\\.|[^`\\])+`/}],endsParent:!0
}]},{scope:"doctag",match:/@[a-zA-Z]+/},{scope:"keyword",match:/\\[a-zA-Z]+/}]
}),e.HASH_COMMENT_MODE,{scope:"string",contains:[e.BACKSLASH_ESCAPE],
variants:[e.END_SAME_AS_BEGIN({begin:/[rR]"(-*)\(/,end:/\)(-*)"/
}),e.END_SAME_AS_BEGIN({begin:/[rR]"(-*)\{/,end:/\}(-*)"/
}),e.END_SAME_AS_BEGIN({begin:/[rR]"(-*)\[/,end:/\](-*)"/
}),e.END_SAME_AS_BEGIN({begin:/[rR]'(-*)\(/,end:/\)(-*)'/
}),e.END_SAME_AS_BEGIN({begin:/[rR]'(-*)\{/,end:/\}(-*)'/
}),e.END_SAME_AS_BEGIN({begin:/[rR]'(-*)\[/,end:/\](-*)'/}),{begin:'"',end:'"',
relevance:0},{begin:"'",end:"'",relevance:0}]},{relevance:0,variants:[{scope:{
1:"operator",2:"number"},match:[i,a]},{scope:{1:"operator",2:"number"},
match:[/%[^%]*%/,a]},{scope:{1:"punctuation",2:"number"},match:[r,a]},{scope:{
2:"number"},match:[/[^a-zA-Z0-9._]|^/,a]}]},{scope:{3:"operator"},
match:[t,/\s+/,/<-/,/\s+/]},{scope:"operator",relevance:0,variants:[{match:i},{
match:/%[^%]*%/}]},{scope:"punctuation",relevance:0,match:r},{begin:"`",end:"`",
contains:[{begin:/\\./}]}]}},grmr_ruby:e=>{
const n=e.regex,t="([a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?)",a=n.either(/\b([A-Z]+[a-z0-9]+)+/,/\b([A-Z]+[a-z0-9]+)+[A-Z]+/),i=n.concat(a,/(::\w+)*/),r={
"variable.constant":["__FILE__","__LINE__","__ENCODING__"],
"variable.language":["self","super"],
keyword:["alias","and","begin","BEGIN","break","case","class","defined","do","else","elsif","end","END","ensure","for","if","in","module","next","not","or","redo","require","rescue","retry","return","then","undef","unless","until","when","while","yield","include","extend","prepend","public","private","protected","raise","throw"],
built_in:["proc","lambda","attr_accessor","attr_reader","attr_writer","define_method","private_constant","module_function"],
literal:["true","false","nil"]},s={className:"doctag",begin:"@[A-Za-z]+"},o={
begin:"#<",end:">"},c=[e.COMMENT("#","$",{contains:[s]
}),e.COMMENT("^=begin","^=end",{contains:[s],relevance:10
}),e.COMMENT("^__END__",e.MATCH_NOTHING_RE)],l={className:"subst",begin:/#\{/,
end:/\}/,keywords:r},d={className:"string",contains:[e.BACKSLASH_ESCAPE,l],
variants:[{begin:/'/,end:/'/},{begin:/"/,end:/"/},{begin:/`/,end:/`/},{
begin:/%[qQwWx]?\(/,end:/\)/},{begin:/%[qQwWx]?\[/,end:/\]/},{
begin:/%[qQwWx]?\{/,end:/\}/},{begin:/%[qQwWx]?</,end:/>/},{begin:/%[qQwWx]?\//,
end:/\//},{begin:/%[qQwWx]?%/,end:/%/},{begin:/%[qQwWx]?-/,end:/-/},{
begin:/%[qQwWx]?\|/,end:/\|/},{begin:/\B\?(\\\d{1,3})/},{
begin:/\B\?(\\x[A-Fa-f0-9]{1,2})/},{begin:/\B\?(\\u\{?[A-Fa-f0-9]{1,6}\}?)/},{
begin:/\B\?(\\M-\\C-|\\M-\\c|\\c\\M-|\\M-|\\C-\\M-)[\x20-\x7e]/},{
begin:/\B\?\\(c|C-)[\x20-\x7e]/},{begin:/\B\?\\?\S/},{
begin:n.concat(/<<[-~]?'?/,n.lookahead(/(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b/)),
contains:[e.END_SAME_AS_BEGIN({begin:/(\w+)/,end:/(\w+)/,
contains:[e.BACKSLASH_ESCAPE,l]})]}]},g="[0-9](_?[0-9])*",u={className:"number",
relevance:0,variants:[{
begin:`\\b([1-9](_?[0-9])*|0)(\\.(${g}))?([eE][+-]?(${g})|r)?i?\\b`},{
begin:"\\b0[dD][0-9](_?[0-9])*r?i?\\b"},{begin:"\\b0[bB][0-1](_?[0-1])*r?i?\\b"
},{begin:"\\b0[oO][0-7](_?[0-7])*r?i?\\b"},{
begin:"\\b0[xX][0-9a-fA-F](_?[0-9a-fA-F])*r?i?\\b"},{
begin:"\\b0(_?[0-7])+r?i?\\b"}]},b={variants:[{match:/\(\)/},{
className:"params",begin:/\(/,end:/(?=\))/,excludeBegin:!0,endsParent:!0,
keywords:r}]},m=[d,{variants:[{match:[/class\s+/,i,/\s+<\s+/,i]},{
match:[/\b(class|module)\s+/,i]}],scope:{2:"title.class",
4:"title.class.inherited"},keywords:r},{match:[/(include|extend)\s+/,i],scope:{
2:"title.class"},keywords:r},{relevance:0,match:[i,/\.new[. (]/],scope:{
1:"title.class"}},{relevance:0,match:/\b[A-Z][A-Z_0-9]+\b/,
className:"variable.constant"},{relevance:0,match:a,scope:"title.class"},{
match:[/def/,/\s+/,t],scope:{1:"keyword",3:"title.function"},contains:[b]},{
begin:"::"},{className:"symbol",begin:e.UNDERSCORE_IDENT_RE+"(!|\\?)?:",
relevance:0},{className:"symbol",begin:":(?!\\s)",contains:[d,{begin:t}],
relevance:0},u,{className:"variable",
begin:"(\\$\\W)|((\\$|@@?)(\\w+))(?=[^@$?])(?![A-Za-z])(?![@$?'])"},{
className:"params",begin:/\|(?!=)/,end:/\|/,excludeBegin:!0,excludeEnd:!0,
relevance:0,keywords:r},{begin:"("+e.RE_STARTERS_RE+"|unless)\\s*",
keywords:"unless",contains:[{className:"regexp",contains:[e.BACKSLASH_ESCAPE,l],
illegal:/\n/,variants:[{begin:"/",end:"/[a-z]*"},{begin:/%r\{/,end:/\}[a-z]*/},{
begin:"%r\\(",end:"\\)[a-z]*"},{begin:"%r!",end:"![a-z]*"},{begin:"%r\\[",
end:"\\][a-z]*"}]}].concat(o,c),relevance:0}].concat(o,c)
;l.contains=m,b.contains=m;const p=[{begin:/^\s*=>/,starts:{end:"$",contains:m}
},{className:"meta.prompt",
begin:"^([>?]>|[\\w#]+\\(\\w+\\):\\d+:\\d+[>*]|(\\w+-)?\\d+\\.\\d+\\.\\d+(p\\d+)?[^\\d][^>]+>)(?=[ ])",
starts:{end:"$",keywords:r,contains:m}}];return c.unshift(o),{name:"Ruby",
aliases:["rb","gemspec","podspec","thor","irb"],keywords:r,illegal:/\/\*/,
contains:[e.SHEBANG({binary:"ruby"})].concat(p).concat(c).concat(m)}},
grmr_rust:e=>{
const n=e.regex,t=/(r#)?/,a=n.concat(t,e.UNDERSCORE_IDENT_RE),i=n.concat(t,e.IDENT_RE),r={
scope:"title.function.invoke",relevance:0,
begin:n.concat(/\b/,/(?!(?:let|for|while|if|else|match)\b)/,i,n.lookahead(/\s*\(/))
},s="([ui](8|16|32|64|128|size)|f(16|32|64|128))?",o=["drop ","Copy","Send","Sized","Sync","Drop","Fn","FnMut","FnOnce","ToOwned","Clone","Debug","PartialEq","PartialOrd","Eq","Ord","AsRef","AsMut","Into","From","Default","Iterator","Extend","IntoIterator","DoubleEndedIterator","ExactSizeIterator","SliceConcatExt","ToString","assert!","assert_eq!","bitflags!","bytes!","cfg!","col!","concat!","concat_idents!","debug_assert!","debug_assert_eq!","env!","eprintln!","panic!","file!","format!","format_args!","include_bytes!","include_str!","line!","local_data_key!","module_path!","option_env!","print!","println!","select!","stringify!","try!","unimplemented!","unreachable!","vec!","write!","writeln!","macro_rules!","assert_ne!","debug_assert_ne!"],c=["i8","i16","i32","i64","i128","isize","u8","u16","u32","u64","u128","usize","f16","f32","f64","f128","str","char","bool","Box","Option","Result","String","Vec"]
;return{name:"Rust",aliases:["rs"],keywords:{$pattern:e.IDENT_RE+"!?",type:c,
keyword:["abstract","as","async","await","become","box","break","const","continue","crate","do","dyn","else","enum","extern","false","final","fn","for","if","impl","in","let","loop","macro","match","mod","move","mut","override","priv","pub","raw","ref","return","self","Self","static","struct","super","trait","true","try","type","typeof","union","unsafe","unsized","use","virtual","where","while","yield"],
literal:["true","false","Some","None","Ok","Err"],built_in:o},illegal:"</",
contains:[e.C_LINE_COMMENT_MODE,e.COMMENT("/\\*","\\*/",{contains:["self"]
}),e.inherit(e.QUOTE_STRING_MODE,{begin:/b?"/,illegal:null}),{scope:"symbol",
begin:/'[a-zA-Z_][a-zA-Z0-9_]*(?!')/},{scope:"string",variants:[{
begin:/b?r(#*)"(.|\n)*?"\1(?!#)/},{begin:/b?'/,end:/'/,contains:[{
scope:"char.escape",match:/\\('|"|\\|\w|x\w{2}|u\w{4}|U\w{8})/}]}]},{
scope:"number",variants:[{begin:"\\b0b([01_]+)"+s},{begin:"\\b0o([0-7_]+)"+s},{
begin:"\\b0x([A-Fa-f0-9_]+)"+s},{
begin:"\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)"+s}],relevance:0},{
begin:[/\bsafe/,/\s+/,/extern/],scope:{1:"keyword",3:"keyword"}},{
begin:[/fn/,/\s+/,a],scope:{1:"keyword",3:"title.function"}},{scope:"meta",
begin:"#!?\\[",end:"\\]",contains:[{scope:"string",begin:/"/,end:/"/,
contains:[e.BACKSLASH_ESCAPE]}]},{begin:[/let/,/\s+/,/(?:mut\s+)?/,a],scope:{
1:"keyword",3:"keyword",4:"variable"}},{begin:[/for/,/\s+/,a,/\s+/,/in/],scope:{
1:"keyword",3:"variable",5:"keyword"}},{begin:[/type/,/\s+/,a],scope:{
1:"keyword",3:"title.class"}},{
begin:[/(?:trait|enum|struct|union|impl|for)/,/\s+/,a],scope:{1:"keyword",
3:"title.class"}},{begin:e.IDENT_RE+"::",keywords:{keyword:"Self",built_in:o,
type:c}},{scope:"punctuation",begin:"->"},r]}},grmr_scss:e=>{
const n=Ce(e),t=Ie,a=De,i="@[a-z-]+",r={className:"variable",
begin:"(\\$[a-zA-Z-][a-zA-Z0-9_-]*)\\b",relevance:0};return{name:"SCSS",
case_insensitive:!0,illegal:"[=/|']",
contains:[e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,n.CSS_NUMBER_MODE,{
className:"selector-id",begin:"#[A-Za-z0-9_-]+",relevance:0},{
className:"selector-class",begin:"\\.[A-Za-z0-9_-]+",relevance:0
},n.ATTRIBUTE_SELECTOR_MODE,{className:"selector-tag",
begin:"\\b("+Te.join("|")+")\\b",relevance:0},{className:"selector-pseudo",
begin:":("+a.join("|")+")"},{className:"selector-pseudo",
begin:":(:)?("+t.join("|")+")"},r,{begin:/\(/,end:/\)/,
contains:[n.CSS_NUMBER_MODE]},n.CSS_VARIABLE,{className:"attribute",
begin:"\\b("+Le.join("|")+")\\b"},{
begin:"\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b"
},{begin:/:/,end:/[;}{]/,relevance:0,
contains:[n.BLOCK_COMMENT,r,n.HEXCOLOR,n.CSS_NUMBER_MODE,n.UNICODE_RANGE,e.QUOTE_STRING_MODE,e.APOS_STRING_MODE,n.IMPORTANT,n.FUNCTION_DISPATCH]
},{begin:"@(page|font-face)",keywords:{$pattern:i,keyword:"@page @font-face"}},{
begin:"@",end:"[{;]",returnBegin:!0,keywords:{$pattern:/[a-z-]+/,
keyword:"and or not only",attribute:Re.join(" ")},contains:[{begin:i,
className:"keyword"},{begin:/[a-z-]+(?=:)/,className:"attribute"
},r,e.QUOTE_STRING_MODE,e.APOS_STRING_MODE,n.HEXCOLOR,n.CSS_NUMBER_MODE]
},n.FUNCTION_DISPATCH]}},grmr_shell:e=>({name:"Shell Session",
aliases:["console","shellsession"],contains:[{className:"meta.prompt",
begin:/^\s{0,3}[./~\w\d[\]()@-]*[>%$#][ ]?/,starts:{end:/[^\\](?=\s*$)/,
subLanguage:"bash"}}]}),grmr_sql:e=>{
const n=e.regex,t=e.COMMENT("--","$"),a=["abs","acos","array_agg","asin","atan","avg","cast","ceil","ceiling","coalesce","corr","cos","cosh","count","covar_pop","covar_samp","cume_dist","dense_rank","deref","element","exp","extract","first_value","floor","json_array","json_arrayagg","json_exists","json_object","json_objectagg","json_query","json_table","json_table_primitive","json_value","lag","last_value","lead","listagg","ln","log","log10","lower","max","min","mod","nth_value","ntile","nullif","percent_rank","percentile_cont","percentile_disc","position","position_regex","power","rank","regr_avgx","regr_avgy","regr_count","regr_intercept","regr_r2","regr_slope","regr_sxx","regr_sxy","regr_syy","row_number","sin","sinh","sqrt","stddev_pop","stddev_samp","substring","substring_regex","sum","tan","tanh","translate","translate_regex","treat","trim","trim_array","unnest","upper","value_of","var_pop","var_samp","width_bucket"],i=a,r=["abs","acos","all","allocate","alter","and","any","are","array","array_agg","array_max_cardinality","as","asensitive","asin","asymmetric","at","atan","atomic","authorization","avg","begin","begin_frame","begin_partition","between","bigint","binary","blob","boolean","both","by","call","called","cardinality","cascaded","case","cast","ceil","ceiling","char","char_length","character","character_length","check","classifier","clob","close","coalesce","collate","collect","column","commit","condition","connect","constraint","contains","convert","copy","corr","corresponding","cos","cosh","count","covar_pop","covar_samp","create","cross","cube","cume_dist","current","current_catalog","current_date","current_default_transform_group","current_path","current_role","current_row","current_schema","current_time","current_timestamp","current_path","current_role","current_transform_group_for_type","current_user","cursor","cycle","date","day","deallocate","dec","decimal","decfloat","declare","default","define","delete","dense_rank","deref","describe","deterministic","disconnect","distinct","double","drop","dynamic","each","element","else","empty","end","end_frame","end_partition","end-exec","equals","escape","every","except","exec","execute","exists","exp","external","extract","false","fetch","filter","first_value","float","floor","for","foreign","frame_row","free","from","full","function","fusion","get","global","grant","group","grouping","groups","having","hold","hour","identity","in","indicator","initial","inner","inout","insensitive","insert","int","integer","intersect","intersection","interval","into","is","join","json_array","json_arrayagg","json_exists","json_object","json_objectagg","json_query","json_table","json_table_primitive","json_value","lag","language","large","last_value","lateral","lead","leading","left","like","like_regex","listagg","ln","local","localtime","localtimestamp","log","log10","lower","match","match_number","match_recognize","matches","max","member","merge","method","min","minute","mod","modifies","module","month","multiset","national","natural","nchar","nclob","new","no","none","normalize","not","nth_value","ntile","null","nullif","numeric","octet_length","occurrences_regex","of","offset","old","omit","on","one","only","open","or","order","out","outer","over","overlaps","overlay","parameter","partition","pattern","per","percent","percent_rank","percentile_cont","percentile_disc","period","portion","position","position_regex","power","precedes","precision","prepare","primary","procedure","ptf","range","rank","reads","real","recursive","ref","references","referencing","regr_avgx","regr_avgy","regr_count","regr_intercept","regr_r2","regr_slope","regr_sxx","regr_sxy","regr_syy","release","result","return","returns","revoke","right","rollback","rollup","row","row_number","rows","running","savepoint","scope","scroll","search","second","seek","select","sensitive","session_user","set","show","similar","sin","sinh","skip","smallint","some","specific","specifictype","sql","sqlexception","sqlstate","sqlwarning","sqrt","start","static","stddev_pop","stddev_samp","submultiset","subset","substring","substring_regex","succeeds","sum","symmetric","system","system_time","system_user","table","tablesample","tan","tanh","then","time","timestamp","timezone_hour","timezone_minute","to","trailing","translate","translate_regex","translation","treat","trigger","trim","trim_array","true","truncate","uescape","union","unique","unknown","unnest","update","upper","user","using","value","values","value_of","var_pop","var_samp","varbinary","varchar","varying","versioning","when","whenever","where","width_bucket","window","with","within","without","year","add","asc","collation","desc","final","first","last","view"].filter(e=>!a.includes(e)),s={
match:n.concat(/\b/,n.either(...i),/\s*\(/),relevance:0,keywords:{built_in:i}}
;function o(e){
return n.concat(/\b/,n.either(...e.map(e=>e.replace(/\s+/,"\\s+"))),/\b/)}
const c={scope:"keyword",
match:o(["create table","insert into","primary key","foreign key","not null","alter table","add constraint","grouping sets","on overflow","character set","respect nulls","ignore nulls","nulls first","nulls last","depth first","breadth first"]),
relevance:0};return{name:"SQL",case_insensitive:!0,illegal:/[{}]|<\//,keywords:{
$pattern:/\b[\w\.]+/,keyword:((e,{exceptions:n,when:t}={})=>{const a=t
;return n=n||[],e.map(e=>e.match(/\|\d+$/)||n.includes(e)?e:a(e)?e+"|0":e)})(r,{
when:e=>e.length<3}),literal:["true","false","unknown"],
type:["bigint","binary","blob","boolean","char","character","clob","date","dec","decfloat","decimal","float","int","integer","interval","nchar","nclob","national","numeric","real","row","smallint","time","timestamp","varchar","varying","varbinary"],
built_in:["current_catalog","current_date","current_default_transform_group","current_path","current_role","current_schema","current_transform_group_for_type","current_user","session_user","system_time","system_user","current_time","localtime","current_timestamp","localtimestamp"]
},contains:[{scope:"type",
match:o(["double precision","large object","with timezone","without timezone"])
},c,s,{scope:"variable",match:/@[a-z0-9][a-z0-9_]*/},{scope:"string",variants:[{
begin:/'/,end:/'/,contains:[{match:/''/}]}]},{begin:/"/,end:/"/,contains:[{
match:/""/}]},e.C_NUMBER_MODE,e.C_BLOCK_COMMENT_MODE,t,{scope:"operator",
match:/[-+*/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?/,relevance:0}]}},
grmr_swift:e=>{const n={match:/\s+/,relevance:0},t=e.COMMENT("/\\*","\\*/",{
contains:["self"]}),a=[e.C_LINE_COMMENT_MODE,t],i={match:[/\./,m(...be,...me)],
className:{2:"keyword"}},r={match:b(/\./,m(..._e)),relevance:0
},s=_e.filter(e=>"string"==typeof e).concat(["_|0"]),o={variants:[{
className:"keyword",
match:m(..._e.filter(e=>"string"!=typeof e).concat(pe).map(ue),...me)}]},c={
$pattern:m(/\b\w+/,/#\w+/),keyword:s.concat(Ee),literal:he},l=[i,r,o],g=[{
match:b(/\./,m(...ye)),relevance:0},{className:"built_in",
match:b(/\b/,m(...ye),/(?=\()/)}],u={match:/->/,relevance:0},p=[u,{
className:"operator",relevance:0,variants:[{match:Ne},{match:`\\.(\\.|${ve})+`}]
}],_="([0-9]_*)+",h="([0-9a-fA-F]_*)+",f={className:"number",relevance:0,
variants:[{match:`\\b(${_})(\\.(${_}))?([eE][+-]?(${_}))?\\b`},{
match:`\\b0x(${h})(\\.(${h}))?([pP][+-]?(${_}))?\\b`},{match:/\b0o([0-7]_*)+\b/
},{match:/\b0b([01]_*)+\b/}]},E=(e="")=>({className:"subst",variants:[{
match:b(/\\/,e,/[0\\tnr"']/)},{match:b(/\\/,e,/u\{[0-9a-fA-F]{1,8}\}/)}]
}),y=(e="")=>({className:"subst",match:b(/\\/,e,/[\t ]*(?:[\r\n]|\r\n)/)
}),w=(e="")=>({className:"subst",label:"interpol",begin:b(/\\/,e,/\(/),end:/\)/
}),v=(e="")=>({begin:b(e,/"""/),end:b(/"""/,e),contains:[E(e),y(e),w(e)]
}),N=(e="")=>({begin:b(e,/"/),end:b(/"/,e),contains:[E(e),w(e)]}),k={
className:"string",
variants:[v(),v("#"),v("##"),v("###"),N(),N("#"),N("##"),N("###")]
},x=[e.BACKSLASH_ESCAPE,{begin:/\[/,end:/\]/,relevance:0,
contains:[e.BACKSLASH_ESCAPE]}],O={begin:/\/[^\s](?=[^/\n]*\/)/,end:/\//,
contains:x},M=e=>{const n=b(e,/\//),t=b(/\//,e);return{begin:n,end:t,
contains:[...x,{scope:"comment",begin:`#(?!.*${t})`,end:/$/}]}},A={
scope:"regexp",variants:[M("###"),M("##"),M("#"),O]},S={match:b(/`/,Oe,/`/)
},C=[S,{className:"variable",match:/\$\d+/},{className:"variable",
match:`\\$${xe}+`}],T=[{match:/(@|#(un)?)available/,scope:"keyword",starts:{
contains:[{begin:/\(/,end:/\)/,keywords:Se,contains:[...p,f,k]}]}},{
scope:"keyword",match:b(/@/,m(...Ae),d(m(/\(/,/\s+/)))},{scope:"meta",
match:b(/@/,Oe)}],R={match:d(/\b[A-Z]/),relevance:0,contains:[{className:"type",
match:b(/(AV|CA|CF|CG|CI|CL|CM|CN|CT|MK|MP|MTK|MTL|NS|SCN|SK|UI|WK|XC)/,xe,"+")
},{className:"type",match:Me,relevance:0},{match:/[?!]+/,relevance:0},{
match:/\.\.\./,relevance:0},{match:b(/\s+&\s+/,d(Me)),relevance:0}]},D={
begin:/</,end:/>/,keywords:c,contains:[...a,...l,...T,u,R]};R.contains.push(D)
;const I={begin:/\(/,end:/\)/,relevance:0,keywords:c,contains:["self",{
match:b(Oe,/\s*:/),keywords:"_|0",relevance:0
},...a,A,...l,...g,...p,f,k,...C,...T,R]},L={begin:/</,end:/>/,
keywords:"repeat each",contains:[...a,R]},B={begin:/\(/,end:/\)/,keywords:c,
contains:[{begin:m(d(b(Oe,/\s*:/)),d(b(Oe,/\s+/,Oe,/\s*:/))),end:/:/,
relevance:0,contains:[{className:"keyword",match:/\b_\b/},{className:"params",
match:Oe}]},...a,...l,...p,f,k,...T,R,I],endsParent:!0,illegal:/["']/},F={
match:[/(func|macro)/,/\s+/,m(S.match,Oe,Ne)],className:{1:"keyword",
3:"title.function"},contains:[L,B,n],illegal:[/\[/,/%/]},$={
match:[/\b(?:subscript|init[?!]?)/,/\s*(?=[<(])/],className:{1:"keyword"},
contains:[L,B,n],illegal:/\[|%/},z={match:[/operator/,/\s+/,Ne],className:{
1:"keyword",3:"title"}},j={begin:[/precedencegroup/,/\s+/,Me],className:{
1:"keyword",3:"title"},contains:[R],keywords:[...fe,...he],end:/}/},U={
begin:[/(struct|protocol|class|extension|enum|actor)/,/\s+/,Oe,/\s*/],
beginScope:{1:"keyword",3:"title.class"},keywords:c,contains:[L,...l,{begin:/:/,
end:/\{/,keywords:c,contains:[{scope:"title.class.inherited",match:Me},...l],
relevance:0}]};for(const e of k.variants){
const n=e.contains.find(e=>"interpol"===e.label);n.keywords=c
;const t=[...l,...g,...p,f,k,...C];n.contains=[...t,{begin:/\(/,end:/\)/,
contains:["self",...t]}]}return{name:"Swift",keywords:c,contains:[...a,F,$,{
match:[/class\b/,/\s+/,/func\b/,/\s+/,/\b[A-Za-z_][A-Za-z0-9_]*\b/],scope:{
1:"keyword",3:"keyword",5:"title.function"}},{match:[/class\b/,/\s+/,/var\b/],
scope:{1:"keyword",3:"keyword"}},U,z,j,{beginKeywords:"import",end:/$/,
contains:[...a],relevance:0},A,...l,...g,...p,f,k,...C,...T,R,I]}},
grmr_typescript:e=>{
const n=e.regex,t=ge(e),a=te,i=["any","void","number","boolean","string","object","never","symbol","bigint","unknown"],r={
begin:[/namespace/,/\s+/,e.IDENT_RE],beginScope:{1:"keyword",3:"title.class"}
},s={beginKeywords:"interface",end:/\{/,excludeEnd:!0,keywords:{
keyword:"interface extends",built_in:i},contains:[t.exports.CLASS_REFERENCE]
},o={$pattern:te,
keyword:ie.concat(["type","interface","public","private","protected","implements","declare","abstract","readonly","enum","override","satisfies"]),
literal:re,built_in:de.concat(i),"variable.language":le},c={className:"meta",
begin:"@"+a},l=(e,n,t)=>{const a=e.contains.findIndex(e=>e.label===n)
;if(-1===a)throw Error("can not find mode to replace");e.contains.splice(a,1,t)}
;Object.assign(t.keywords,o),t.exports.PARAMS_CONTAINS.push(c)
;const d=t.contains.find(e=>"attr"===e.scope),g=Object.assign({},d,{
match:n.concat(a,n.lookahead(/\s*\?:/))})
;return t.exports.PARAMS_CONTAINS.push([t.exports.CLASS_REFERENCE,d,g]),
t.contains=t.contains.concat([c,r,s,g]),
l(t,"shebang",e.SHEBANG()),l(t,"use_strict",{className:"meta",relevance:10,
begin:/^\s*['"]use strict['"]/
}),t.contains.find(e=>"func.def"===e.label).relevance=0,Object.assign(t,{
name:"TypeScript",aliases:["ts","tsx","mts","cts"]}),t},grmr_vbnet:e=>{
const n=e.regex,t=/\d{1,2}\/\d{1,2}\/\d{4}/,a=/\d{4}-\d{1,2}-\d{1,2}/,i=/(\d|1[012])(:\d+){0,2} *(AM|PM)/,r=/\d{1,2}(:\d{1,2}){1,2}/,s={
className:"literal",variants:[{begin:n.concat(/# */,n.either(a,t),/ *#/)},{
begin:n.concat(/# */,r,/ *#/)},{begin:n.concat(/# */,i,/ *#/)},{
begin:n.concat(/# */,n.either(a,t),/ +/,n.either(i,r),/ *#/)}]
},o=e.COMMENT(/'''/,/$/,{contains:[{className:"doctag",begin:/<\/?/,end:/>/}]
}),c=e.COMMENT(null,/$/,{variants:[{begin:/'/},{begin:/([\t ]|^)REM(?=\s)/}]})
;return{name:"Visual Basic .NET",aliases:["vb"],case_insensitive:!0,
classNameAliases:{label:"symbol"},keywords:{
keyword:"addhandler alias aggregate ansi as async assembly auto binary by byref byval call case catch class compare const continue custom declare default delegate dim distinct do each equals else elseif end enum erase error event exit explicit finally for friend from function get global goto group handles if implements imports in inherits interface into iterator join key let lib loop me mid module mustinherit mustoverride mybase myclass namespace narrowing new next notinheritable notoverridable of off on operator option optional order overloads overridable overrides paramarray partial preserve private property protected public raiseevent readonly redim removehandler resume return select set shadows shared skip static step stop structure strict sub synclock take text then throw to try unicode until using when where while widening with withevents writeonly yield",
built_in:"addressof and andalso await directcast gettype getxmlnamespace is isfalse isnot istrue like mod nameof new not or orelse trycast typeof xor cbool cbyte cchar cdate cdbl cdec cint clng cobj csbyte cshort csng cstr cuint culng cushort",
type:"boolean byte char date decimal double integer long object sbyte short single string uinteger ulong ushort",
literal:"true false nothing"},
illegal:"//|\\{|\\}|endif|gosub|variant|wend|^\\$ ",contains:[{
className:"string",begin:/"(""|[^/n])"C\b/},{className:"string",begin:/"/,
end:/"/,illegal:/\n/,contains:[{begin:/""/}]},s,{className:"number",relevance:0,
variants:[{begin:/\b\d[\d_]*((\.[\d_]+(E[+-]?[\d_]+)?)|(E[+-]?[\d_]+))[RFD@!#]?/
},{begin:/\b\d[\d_]*((U?[SIL])|[%&])?/},{begin:/&H[\dA-F_]+((U?[SIL])|[%&])?/},{
begin:/&O[0-7_]+((U?[SIL])|[%&])?/},{begin:/&B[01_]+((U?[SIL])|[%&])?/}]},{
className:"label",begin:/^\w+:/},o,c,{className:"meta",
begin:/[\t ]*#(const|disable|else|elseif|enable|end|externalsource|if|region)\b/,
end:/$/,keywords:{
keyword:"const disable else elseif enable end externalsource if region then"},
contains:[c]}]}},grmr_wasm:e=>{e.regex;const n=e.COMMENT(/\(;/,/;\)/)
;return n.contains.push("self"),{name:"WebAssembly",keywords:{$pattern:/[\w.]+/,
keyword:["anyfunc","block","br","br_if","br_table","call","call_indirect","data","drop","elem","else","end","export","func","global.get","global.set","local.get","local.set","local.tee","get_global","get_local","global","if","import","local","loop","memory","memory.grow","memory.size","module","mut","nop","offset","param","result","return","select","set_global","set_local","start","table","tee_local","then","type","unreachable"]
},contains:[e.COMMENT(/;;/,/$/),n,{match:[/(?:offset|align)/,/\s*/,/=/],
className:{1:"keyword",3:"operator"}},{className:"variable",begin:/\$[\w_]+/},{
match:/(\((?!;)|\))+/,className:"punctuation",relevance:0},{
begin:[/(?:func|call|call_indirect)/,/\s+/,/\$[^\s)]+/],className:{1:"keyword",
3:"title.function"}},e.QUOTE_STRING_MODE,{match:/(i32|i64|f32|f64)(?!\.)/,
className:"type"},{className:"keyword",
match:/\b(f32|f64|i32|i64)(?:\.(?:abs|add|and|ceil|clz|const|convert_[su]\/i(?:32|64)|copysign|ctz|demote\/f64|div(?:_[su])?|eqz?|extend_[su]\/i32|floor|ge(?:_[su])?|gt(?:_[su])?|le(?:_[su])?|load(?:(?:8|16|32)_[su])?|lt(?:_[su])?|max|min|mul|nearest|neg?|or|popcnt|promote\/f32|reinterpret\/[fi](?:32|64)|rem_[su]|rot[lr]|shl|shr_[su]|store(?:8|16|32)?|sqrt|sub|trunc(?:_[su]\/f(?:32|64))?|wrap\/i64|xor))\b/
},{className:"number",relevance:0,
match:/[+-]?\b(?:\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?|0x[\da-fA-F](?:_?[\da-fA-F])*(?:\.[\da-fA-F](?:_?[\da-fA-D])*)?(?:[pP][+-]?\d(?:_?\d)*)?)\b|\binf\b|\bnan(?::0x[\da-fA-F](?:_?[\da-fA-D])*)?\b/
}]}},grmr_xml:e=>{
const n=e.regex,t=n.concat(/[\p{L}_]/u,n.optional(/[\p{L}0-9_.-]*:/u),/[\p{L}0-9_.-]*/u),a={
className:"symbol",begin:/&[a-z]+;|&#[0-9]+;|&#x[a-f0-9]+;/},i={begin:/\s/,
contains:[{className:"keyword",begin:/#?[a-z_][a-z1-9_-]+/,illegal:/\n/}]
},r=e.inherit(i,{begin:/\(/,end:/\)/}),s=e.inherit(e.APOS_STRING_MODE,{
className:"string"}),o=e.inherit(e.QUOTE_STRING_MODE,{className:"string"}),c={
endsWithParent:!0,illegal:/</,relevance:0,contains:[{className:"attr",
begin:/[\p{L}0-9._:-]+/u,relevance:0},{begin:/=\s*/,relevance:0,contains:[{
className:"string",endsParent:!0,variants:[{begin:/"/,end:/"/,contains:[a]},{
begin:/'/,end:/'/,contains:[a]},{begin:/[^\s"'=<>`]+/}]}]}]};return{
name:"HTML, XML",
aliases:["html","xhtml","rss","atom","xjb","xsd","xsl","plist","wsf","svg"],
case_insensitive:!0,unicodeRegex:!0,contains:[{className:"meta",begin:/<![a-z]/,
end:/>/,relevance:10,contains:[i,o,s,r,{begin:/\[/,end:/\]/,contains:[{
className:"meta",begin:/<![a-z]/,end:/>/,contains:[i,r,o,s]}]}]
},e.COMMENT(/\x3c!--/,/-->/,{relevance:10}),{begin:/<!\[CDATA\[/,end:/\]\]>/,
relevance:10},a,{className:"meta",end:/\?>/,variants:[{begin:/<\?xml/,
relevance:10,contains:[o]},{begin:/<\?[a-z][a-z0-9]+/}]},{className:"tag",
begin:/<style(?=\s|>)/,end:/>/,keywords:{name:"style"},contains:[c],starts:{
end:/<\/style>/,returnEnd:!0,subLanguage:"css"}},{className:"tag",
begin:/\x3cscript(?=\s|>)/,end:/>/,keywords:{name:"script"},contains:[c],starts:{
end:/<\/script>/,returnEnd:!0,subLanguage:"javascript"}},{className:"tag",
begin:/<>|<\/>/},{className:"tag",
begin:n.concat(/</,n.lookahead(n.concat(t,n.either(/\/>/,/>/,/\s/)))),
end:/\/?>/,contains:[{className:"name",begin:t,relevance:0,starts:c}]},{
className:"tag",begin:n.concat(/<\//,n.lookahead(n.concat(t,/>/))),contains:[{
className:"name",begin:t,relevance:0},{begin:/>/,relevance:0,endsParent:!0}]}]}
},grmr_yaml:e=>{
const n="true false yes no null",t="[\\w#;/?:@&=+$,.~*'()[\\]]+",a={
className:"string",relevance:0,variants:[{begin:/"/,end:/"/},{begin:/\S+/}],
contains:[e.BACKSLASH_ESCAPE,{className:"template-variable",variants:[{
begin:/\{\{/,end:/\}\}/},{begin:/%\{/,end:/\}/}]}]},i=e.inherit(a,{variants:[{
begin:/'/,end:/'/,contains:[{begin:/''/,relevance:0}]},{begin:/"/,end:/"/},{
begin:/[^\s,{}[\]]+/}]}),r={end:",",endsWithParent:!0,excludeEnd:!0,keywords:n,
relevance:0},s={begin:/\{/,end:/\}/,contains:[r],illegal:"\\n",relevance:0},o={
begin:"\\[",end:"\\]",contains:[r],illegal:"\\n",relevance:0},c=[{
className:"attr",variants:[{begin:/[\w*@][\w*@ :()\./-]*:(?=[ \t]|$)/},{
begin:/"[\w*@][\w*@ :()\./-]*":(?=[ \t]|$)/},{
begin:/'[\w*@][\w*@ :()\./-]*':(?=[ \t]|$)/}]},{className:"meta",
begin:"^---\\s*$",relevance:10},{className:"string",
begin:"[\\|>]([1-9]?[+-])?[ ]*\\n( +)[^ ][^\\n]*\\n(\\2[^\\n]+\\n?)*"},{
begin:"<%[%=-]?",end:"[%-]?%>",subLanguage:"ruby",excludeBegin:!0,excludeEnd:!0,
relevance:0},{className:"type",begin:"!\\w+!"+t},{className:"type",
begin:"!<"+t+">"},{className:"type",begin:"!"+t},{className:"type",begin:"!!"+t
},{className:"meta",begin:"&"+e.UNDERSCORE_IDENT_RE+"$"},{className:"meta",
begin:"\\*"+e.UNDERSCORE_IDENT_RE+"$"},{className:"bullet",begin:"-(?=[ ]|$)",
relevance:0},e.HASH_COMMENT_MODE,{beginKeywords:n,keywords:{literal:n}},{
className:"number",
begin:"\\b[0-9]{4}(-[0-9][0-9]){0,2}([Tt \\t][0-9][0-9]?(:[0-9][0-9]){2})?(\\.[0-9]*)?([ \\t])*(Z|[-+][0-9][0-9]?(:[0-9][0-9])?)?\\b"
},{className:"number",begin:e.C_NUMBER_RE+"\\b",relevance:0},s,o,{
className:"string",relevance:0,begin:/'/,end:/'/,contains:[{match:/''/,
scope:"char.escape",relevance:0}]},a],l=[...c]
;return l.pop(),l.push(i),r.contains=l,{name:"YAML",case_insensitive:!0,
aliases:["yml"],contains:c}}});const Ke=ne;for(const e of Object.keys(Pe)){
const n=e.replace("grmr_","").replace("_","-");Ke.registerLanguage(n,Pe[e])}
return Ke}()
;"object"==typeof exports&&"undefined"!=typeof module&&(module.exports=hljs);
;
/*! `powershell` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const n={$pattern:/-?[A-z\.\-]+\b/,
keyword:"if else foreach return do while until elseif begin for trap data dynamicparam end break throw param continue finally in switch exit filter try process catch hidden static parameter",
built_in:"ac asnp cat cd CFS chdir clc clear clhy cli clp cls clv cnsn compare copy cp cpi cpp curl cvpa dbp del diff dir dnsn ebp echo|0 epal epcsv epsn erase etsn exsn fc fhx fl ft fw gal gbp gc gcb gci gcm gcs gdr gerr ghy gi gin gjb gl gm gmo gp gps gpv group gsn gsnp gsv gtz gu gv gwmi h history icm iex ihy ii ipal ipcsv ipmo ipsn irm ise iwmi iwr kill lp ls man md measure mi mount move mp mv nal ndr ni nmo npssc nsn nv ogv oh popd ps pushd pwd r rbp rcjb rcsn rd rdr ren ri rjb rm rmdir rmo rni rnp rp rsn rsnp rujb rv rvpa rwmi sajb sal saps sasv sbp sc scb select set shcm si sl sleep sls sort sp spjb spps spsv start stz sujb sv swmi tee trcm type wget where wjb write"
},s={begin:"`[\\s\\S]",relevance:0},i={className:"variable",variants:[{
begin:/\$\B/},{className:"keyword",begin:/\$this/},{begin:/\$[\w\d][\w\d_:]*/}]
},a={className:"string",variants:[{begin:/"/,end:/"/},{begin:/@"/,end:/^"@/}],
contains:[s,i,{className:"variable",begin:/\$[A-z]/,end:/[^A-z]/}]},t={
className:"string",variants:[{begin:/'/,end:/'/},{begin:/@'/,end:/^'@/}]
},r=e.inherit(e.COMMENT(null,null),{variants:[{begin:/#/,end:/$/},{begin:/<#/,
end:/#>/}],contains:[{className:"doctag",variants:[{
begin:/\.(synopsis|description|example|inputs|outputs|notes|link|component|role|functionality)/
},{
begin:/\.(parameter|forwardhelptargetname|forwardhelpcategory|remotehelprunspace|externalhelp)\s+\S+/
}]}]}),c={className:"class",beginKeywords:"class enum",end:/\s*[{]/,
excludeEnd:!0,relevance:0,contains:[e.TITLE_MODE]},l={className:"function",
begin:/function\s+/,end:/\s*\{|$/,excludeEnd:!0,returnBegin:!0,relevance:0,
contains:[{begin:"function",relevance:0,className:"keyword"},{className:"title",
begin:/\w[\w\d]*((-)[\w\d]+)*/,relevance:0},{begin:/\(/,end:/\)/,
className:"params",relevance:0,contains:[i]}]},o={begin:/using\s/,end:/$/,
returnBegin:!0,contains:[a,t,{className:"keyword",
begin:/(using|assembly|command|module|namespace|type)/}]},p={
className:"function",begin:/\[.*\]\s*[\w]+[ ]??\(/,end:/$/,returnBegin:!0,
relevance:0,contains:[{className:"keyword",
begin:"(".concat(n.keyword.toString().replace(/\s/g,"|"),")\\b"),endsParent:!0,
relevance:0},e.inherit(e.TITLE_MODE,{endsParent:!0})]
},g=[p,r,s,e.NUMBER_MODE,a,t,{className:"built_in",variants:[{
begin:"(Add|Clear|Close|Copy|Enter|Exit|Find|Format|Get|Hide|Join|Lock|Move|New|Open|Optimize|Pop|Push|Redo|Remove|Rename|Reset|Resize|Search|Select|Set|Show|Skip|Split|Step|Switch|Undo|Unlock|Watch|Backup|Checkpoint|Compare|Compress|Convert|ConvertFrom|ConvertTo|Dismount|Edit|Expand|Export|Group|Import|Initialize|Limit|Merge|Mount|Out|Publish|Restore|Save|Sync|Unpublish|Update|Approve|Assert|Build|Complete|Confirm|Deny|Deploy|Disable|Enable|Install|Invoke|Register|Request|Restart|Resume|Start|Stop|Submit|Suspend|Uninstall|Unregister|Wait|Debug|Measure|Ping|Repair|Resolve|Test|Trace|Connect|Disconnect|Read|Receive|Send|Write|Block|Grant|Protect|Revoke|Unblock|Unprotect|Use|ForEach|Sort|Tee|Where)+(-)[\\w\\d]+"
}]},i,{className:"literal",begin:/\$(null|true|false)\b/},{
className:"selector-tag",begin:/@\B/,relevance:0}],m={begin:/\[/,end:/\]/,
excludeBegin:!0,excludeEnd:!0,relevance:0,contains:[].concat("self",g,{
begin:"(string|char|byte|int|long|bool|decimal|single|double|DateTime|xml|array|hashtable|void)",
className:"built_in",relevance:0},{className:"type",begin:/[\.\w\d]+/,
relevance:0})};return p.contains.unshift(m),{name:"PowerShell",
aliases:["pwsh","ps","ps1"],case_insensitive:!0,keywords:n,
contains:g.concat(c,l,o,{variants:[{className:"operator",
begin:"(-and|-as|-band|-bnot|-bor|-bxor|-casesensitive|-ccontains|-ceq|-cge|-cgt|-cle|-clike|-clt|-cmatch|-cne|-cnotcontains|-cnotlike|-cnotmatch|-contains|-creplace|-csplit|-eq|-exact|-f|-file|-ge|-gt|-icontains|-ieq|-ige|-igt|-ile|-ilike|-ilt|-imatch|-in|-ine|-inotcontains|-inotlike|-inotmatch|-ireplace|-is|-isnot|-isplit|-join|-le|-like|-lt|-match|-ne|-not|-notcontains|-notin|-notlike|-notmatch|-or|-regex|-replace|-shl|-shr|-split|-wildcard|-xor)\\b"
},{className:"literal",begin:/(-){1,2}[\w\d-]+/,relevance:0}]},m)}}})()
;hljs.registerLanguage("powershell",e)})();
;
/*! `dos` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const t=e.COMMENT(/^\s*@?rem\b/,/$/,{
relevance:10});return{name:"Batch file (DOS)",aliases:["bat","batch","cmd"],
case_insensitive:!0,illegal:/\/\*/,keywords:{
keyword:["if","else","goto","for","in","do","call","exit","not","exist","errorlevel","defined","equ","neq","lss","leq","gtr","geq"],
built_in:["prn","nul","lpt3","lpt2","lpt1","con","com4","com3","com2","com1","aux","shift","cd","dir","echo","setlocal","endlocal","set","pause","copy","append","assoc","at","attrib","break","cacls","cd","chcp","chdir","chkdsk","chkntfs","cls","cmd","color","comp","compact","convert","date","dir","diskcomp","diskcopy","doskey","erase","fs","find","findstr","format","ftype","graftabl","help","keyb","label","md","mkdir","mode","more","move","path","pause","print","popd","pushd","promt","rd","recover","rem","rename","replace","restore","rmdir","shift","sort","start","subst","time","title","tree","type","ver","verify","vol","ping","net","ipconfig","taskkill","xcopy","ren","del"]
},contains:[{className:"variable",begin:/%%[^ ]|%[^ ]+?%|![^ ]+?!/},{
className:"function",begin:"^\\s*[A-Za-z._?][A-Za-z0-9_$#@~.?]*(:|\\s+label)",
end:"goto:eof",contains:[e.inherit(e.TITLE_MODE,{
begin:"([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*"}),t]},{
className:"number",begin:"\\b\\d+",relevance:0},t]}}})()
;hljs.registerLanguage("dos",e)})();
;
/*! `dockerfile` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>({name:"Dockerfile",aliases:["docker"],
case_insensitive:!0,
keywords:["from","maintainer","expose","env","arg","user","onbuild","stopsignal"],
contains:[e.HASH_COMMENT_MODE,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,e.NUMBER_MODE,{
beginKeywords:"run cmd entrypoint volume add copy workdir label healthcheck shell",
starts:{end:/[^\\]$/,subLanguage:"bash"}}],illegal:"</"})})()
;hljs.registerLanguage("dockerfile",e)})();
;
/*! `nginx` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const n=e.regex,a={
className:"variable",variants:[{begin:/\$\d+/},{begin:/\$\{\w+\}/},{
begin:n.concat(/[$@]/,e.UNDERSCORE_IDENT_RE)}]},s={endsWithParent:!0,keywords:{
$pattern:/[a-z_]{2,}|\/dev\/poll/,
literal:["on","off","yes","no","true","false","none","blocked","debug","info","notice","warn","error","crit","select","break","last","permanent","redirect","kqueue","rtsig","epoll","poll","/dev/poll"]
},relevance:0,illegal:"=>",contains:[e.HASH_COMMENT_MODE,{className:"string",
contains:[e.BACKSLASH_ESCAPE,a],variants:[{begin:/"/,end:/"/},{begin:/'/,end:/'/
}]},{begin:"([a-z]+):/",end:"\\s",endsWithParent:!0,excludeEnd:!0,contains:[a]
},{className:"regexp",contains:[e.BACKSLASH_ESCAPE,a],variants:[{begin:"\\s\\^",
end:"\\s|\\{|;",returnEnd:!0},{begin:"~\\*?\\s+",end:"\\s|\\{|;",returnEnd:!0},{
begin:"\\*(\\.[a-z\\-]+)+"},{begin:"([a-z\\-]+\\.)+\\*"}]},{className:"number",
begin:"\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b"},{
className:"number",begin:"\\b\\d+[kKmMgGdshdwy]?\\b",relevance:0},a]};return{
name:"Nginx config",aliases:["nginxconf"],contains:[e.HASH_COMMENT_MODE,{
beginKeywords:"upstream location",end:/;|\{/,contains:s.contains,keywords:{
section:"upstream location"}},{className:"section",
begin:n.concat(e.UNDERSCORE_IDENT_RE+n.lookahead(/\s+\{/)),relevance:0},{
begin:n.lookahead(e.UNDERSCORE_IDENT_RE+"\\s"),end:";|\\{",contains:[{
className:"attribute",begin:e.UNDERSCORE_IDENT_RE,starts:s}],relevance:0}],
illegal:"[^\\s\\}\\{]"}}})();hljs.registerLanguage("nginx",e)})();
;
/*! `apache` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const n={className:"number",
begin:/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d{1,5})?/};return{
name:"Apache config",aliases:["apacheconf"],case_insensitive:!0,
contains:[e.HASH_COMMENT_MODE,{className:"section",begin:/<\/?/,end:/>/,
contains:[n,{className:"number",begin:/:\d{1,5}/
},e.inherit(e.QUOTE_STRING_MODE,{relevance:0})]},{className:"attribute",
begin:/\w+/,relevance:0,keywords:{
_:["order","deny","allow","setenv","rewriterule","rewriteengine","rewritecond","documentroot","sethandler","errordocument","loadmodule","options","header","listen","serverroot","servername"]
},starts:{end:/$/,relevance:0,keywords:{literal:"on off all deny allow"},
contains:[{scope:"punctuation",match:/\\\n/},{className:"meta",begin:/\s\[/,
end:/\]$/},{className:"variable",begin:/[\$%]\{/,end:/\}/,contains:["self",{
className:"number",begin:/[$%]\d+/}]},n,{className:"number",begin:/\b\d+/
},e.QUOTE_STRING_MODE]}}],illegal:/\S/}}})();hljs.registerLanguage("apache",e)
})();
;
/*! `cmake` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>({name:"CMake",aliases:["cmake.in"],
case_insensitive:!0,keywords:{
keyword:"block break cmake_host_system_information cmake_minimum_required cmake_parse_arguments cmake_policy configure_file continue elseif else endblock endforeach endfunction endif endmacro endwhile execute_process file find_file find_library find_package find_path find_program foreach function get_cmake_property get_directory_property get_filename_component get_property if include include_guard list macro mark_as_advanced math message option return separate_arguments set_directory_properties set_property set site_name string unset variable_watch while add_compile_definitions add_compile_options add_custom_command add_custom_target add_definitions add_dependencies add_executable add_library add_link_options add_subdirectory add_test aux_source_directory build_command create_test_sourcelist define_property enable_language enable_testing export fltk_wrap_ui get_source_file_property get_target_property get_test_property include_directories include_external_msproject include_regular_expression install link_directories link_libraries load_cache project qt_wrap_cpp qt_wrap_ui remove_definitions set_source_files_properties set_target_properties set_tests_properties source_group target_compile_definitions target_compile_features target_compile_options target_include_directories target_link_directories target_link_libraries target_link_options target_sources try_compile try_run ctest_build ctest_configure ctest_coverage ctest_empty_binary_directory ctest_memcheck ctest_read_custom_files ctest_run_script ctest_sleep ctest_start ctest_submit ctest_test ctest_update ctest_upload build_name exec_program export_library_dependencies install_files install_programs install_targets load_command make_directory output_required_files remove subdir_depends subdirs use_mangled_mesa utility_source variable_requires write_file qt5_use_modules qt5_use_package qt5_wrap_cpp on off true false and or not command policy target test exists is_newer_than is_directory is_symlink is_absolute matches less greater equal less_equal greater_equal strless strgreater strequal strless_equal strgreater_equal version_less version_greater version_equal version_less_equal version_greater_equal in_list defined"
},contains:[{className:"variable",begin:/\$\{/,end:/\}/
},e.COMMENT(/#\[\[/,/]]/),e.HASH_COMMENT_MODE,e.QUOTE_STRING_MODE,{
scope:"number",begin:/\b\d+(\.\d+)?\b/,relevance:0}]})})()
;hljs.registerLanguage("cmake",e)})();
;
/*! `matlab` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const a="('|\\.')+",s={relevance:0,
contains:[{begin:a}]};return{name:"Matlab",keywords:{
keyword:"arguments break case catch classdef continue else elseif end enumeration events for function global if methods otherwise parfor persistent properties return spmd switch try while",
built_in:"sin sind sinh asin asind asinh cos cosd cosh acos acosd acosh tan tand tanh atan atand atan2 atanh sec secd sech asec asecd asech csc cscd csch acsc acscd acsch cot cotd coth acot acotd acoth hypot exp expm1 log log1p log10 log2 pow2 realpow reallog realsqrt sqrt nthroot nextpow2 abs angle complex conj imag real unwrap isreal cplxpair fix floor ceil round mod rem sign airy besselj bessely besselh besseli besselk beta betainc betaln ellipj ellipke erf erfc erfcx erfinv expint gamma gammainc gammaln psi legendre cross dot factor isprime primes gcd lcm rat rats perms nchoosek factorial cart2sph cart2pol pol2cart sph2cart hsv2rgb rgb2hsv zeros ones eye repmat rand randn linspace logspace freqspace meshgrid accumarray size length ndims numel disp isempty isequal isequalwithequalnans cat reshape diag blkdiag tril triu fliplr flipud flipdim rot90 find sub2ind ind2sub bsxfun ndgrid permute ipermute shiftdim circshift squeeze isscalar isvector ans eps realmax realmin pi i|0 inf nan isnan isinf isfinite j|0 why compan gallery hadamard hankel hilb invhilb magic pascal rosser toeplitz vander wilkinson max min nanmax nanmin mean nanmean type table readtable writetable sortrows sort figure plot plot3 scatter scatter3 cellfun legend intersect ismember procrustes hold num2cell "
},illegal:'(//|"|#|/\\*|\\s+/\\w+)',contains:[{className:"function",
beginKeywords:"function",end:"$",contains:[e.UNDERSCORE_TITLE_MODE,{
className:"params",variants:[{begin:"\\(",end:"\\)"},{begin:"\\[",end:"\\]"}]}]
},{className:"built_in",begin:/true|false/,relevance:0,starts:s},{
begin:"[a-zA-Z][a-zA-Z_0-9]*"+a,relevance:0},{className:"number",
begin:e.C_NUMBER_RE,relevance:0,starts:s},{className:"string",begin:"'",end:"'",
contains:[{begin:"''"}]},{begin:/\]|\}|\)/,relevance:0,starts:s},{
className:"string",begin:'"',end:'"',contains:[{begin:'""'}],starts:s
},e.COMMENT("^\\s*%\\{\\s*$","^\\s*%\\}\\s*$"),e.COMMENT("%","$")]}}})()
;hljs.registerLanguage("matlab",e)})();
;
/*! `latex` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const n=[{begin:/\^{6}[0-9a-f]{6}/},{
begin:/\^{5}[0-9a-f]{5}/},{begin:/\^{4}[0-9a-f]{4}/},{begin:/\^{3}[0-9a-f]{3}/
},{begin:/\^{2}[0-9a-f]{2}/},{begin:/\^{2}[\u0000-\u007f]/}],a=[{
className:"keyword",begin:/\\/,relevance:0,contains:[{endsParent:!0,
begin:e.regex.either(...["(?:NeedsTeXFormat|RequirePackage|GetIdInfo)","Provides(?:Expl)?(?:Package|Class|File)","(?:DeclareOption|ProcessOptions)","(?:documentclass|usepackage|input|include)","makeat(?:letter|other)","ExplSyntax(?:On|Off)","(?:new|renew|provide)?command","(?:re)newenvironment","(?:New|Renew|Provide|Declare)(?:Expandable)?DocumentCommand","(?:New|Renew|Provide|Declare)DocumentEnvironment","(?:(?:e|g|x)?def|let)","(?:begin|end)","(?:part|chapter|(?:sub){0,2}section|(?:sub)?paragraph)","caption","(?:label|(?:eq|page|name)?ref|(?:paren|foot|super)?cite)","(?:alpha|beta|[Gg]amma|[Dd]elta|(?:var)?epsilon|zeta|eta|[Tt]heta|vartheta)","(?:iota|(?:var)?kappa|[Ll]ambda|mu|nu|[Xx]i|[Pp]i|varpi|(?:var)rho)","(?:[Ss]igma|varsigma|tau|[Uu]psilon|[Pp]hi|varphi|chi|[Pp]si|[Oo]mega)","(?:frac|sum|prod|lim|infty|times|sqrt|leq|geq|left|right|middle|[bB]igg?)","(?:[lr]angle|q?quad|[lcvdi]?dots|d?dot|hat|tilde|bar)"].map(e=>e+"(?![a-zA-Z@:_])"))
},{endsParent:!0,
begin:RegExp(["(?:__)?[a-zA-Z]{2,}_[a-zA-Z](?:_?[a-zA-Z])+:[a-zA-Z]*","[lgc]__?[a-zA-Z](?:_?[a-zA-Z])*_[a-zA-Z]{2,}","[qs]__?[a-zA-Z](?:_?[a-zA-Z])+","use(?:_i)?:[a-zA-Z]*","(?:else|fi|or):","(?:if|cs|exp):w","(?:hbox|vbox):n","::[a-zA-Z]_unbraced","::[a-zA-Z:]"].map(e=>e+"(?![a-zA-Z:_])").join("|"))
},{endsParent:!0,variants:n},{endsParent:!0,relevance:0,variants:[{
begin:/[a-zA-Z@]+/},{begin:/[^a-zA-Z@]?/}]}]},{className:"params",relevance:0,
begin:/#+\d?/},{variants:n},{className:"built_in",relevance:0,begin:/[$&^_]/},{
className:"meta",begin:/% ?!(T[eE]X|tex|BIB|bib)/,end:"$",relevance:10
},e.COMMENT("%","$",{relevance:0})],i={begin:/\{/,end:/\}/,relevance:0,
contains:["self",...a]},t=e.inherit(i,{relevance:0,endsParent:!0,
contains:[i,...a]}),r={begin:/\[/,end:/\]/,endsParent:!0,relevance:0,
contains:[i,...a]},s={begin:/\s+/,relevance:0},c=[t],l=[r],o=(e,n)=>({
contains:[s],starts:{relevance:0,contains:e,starts:n}}),d=(e,n)=>({
begin:"\\\\"+e+"(?![a-zA-Z@:_])",keywords:{$pattern:/\\[a-zA-Z]+/,keyword:"\\"+e
},relevance:0,contains:[s],starts:n}),g=(n,a)=>e.inherit({
begin:"\\\\begin(?=[ \t]*(\\r?\\n[ \t]*)?\\{"+n+"\\})",keywords:{
$pattern:/\\[a-zA-Z]+/,keyword:"\\begin"},relevance:0
},o(c,a)),m=(n="string")=>e.END_SAME_AS_BEGIN({className:n,begin:/(.|\r?\n)/,
end:/(.|\r?\n)/,excludeBegin:!0,excludeEnd:!0,endsParent:!0}),b=e=>({
className:"string",end:"(?=\\\\end\\{"+e+"\\})"}),p=(e="string")=>({relevance:0,
begin:/\{/,starts:{endsParent:!0,contains:[{className:e,end:/(?=\})/,
endsParent:!0,contains:[{begin:/\{/,end:/\}/,relevance:0,contains:["self"]}]}]}
});return{name:"LaTeX",aliases:["tex"],
contains:[...["verb","lstinline"].map(e=>d(e,{contains:[m()]})),d("mint",o(c,{
contains:[m()]})),d("mintinline",o(c,{contains:[p(),m()]})),d("url",{
contains:[p("link"),p("link")]}),d("hyperref",{contains:[p("link")]
}),d("href",o(l,{contains:[p("link")]
})),...[].concat(...["","\\*"].map(e=>[g("verbatim"+e,b("verbatim"+e)),g("filecontents"+e,o(c,b("filecontents"+e))),...["","B","L"].map(n=>g(n+"Verbatim"+e,o(l,b(n+"Verbatim"+e))))])),g("minted",o(l,o(c,b("minted")))),...a]
}}})();hljs.registerLanguage("latex",e)})();
;
/*! `protobuf` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const s={
match:[/(message|enum|service)\s+/,e.IDENT_RE],scope:{1:"keyword",
2:"title.class"}};return{name:"Protocol Buffers",aliases:["proto"],keywords:{
keyword:["package","import","option","optional","required","repeated","group","oneof"],
type:["double","float","int32","int64","uint32","uint64","sint32","sint64","fixed32","fixed64","sfixed32","sfixed64","bool","string","bytes"],
literal:["true","false"]},
contains:[e.QUOTE_STRING_MODE,e.NUMBER_MODE,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,s,{
className:"function",beginKeywords:"rpc",end:/[{;]/,excludeEnd:!0,
keywords:"rpc returns"},{begin:/^\s*[A-Z_]+(?=\s*=[^\n]+;$)/}]}}})()
;hljs.registerLanguage("protobuf",e)})();
;
/*! `vbscript` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const t=e.regex,r=["lcase","month","vartype","instrrev","ubound","setlocale","getobject","rgb","getref","string","weekdayname","rnd","dateadd","monthname","now","day","minute","isarray","cbool","round","formatcurrency","conversions","csng","timevalue","second","year","space","abs","clng","timeserial","fixs","len","asc","isempty","maths","dateserial","atn","timer","isobject","filter","weekday","datevalue","ccur","isdate","instr","datediff","formatdatetime","replace","isnull","right","sgn","array","snumeric","log","cdbl","hex","chr","lbound","msgbox","ucase","getlocale","cos","cdate","cbyte","rtrim","join","hour","oct","typename","trim","strcomp","int","createobject","loadpicture","tan","formatnumber","mid","split","cint","sin","datepart","ltrim","sqr","time","derived","eval","date","formatpercent","exp","inputbox","left","ascw","chrw","regexp","cstr","err"]
;return{name:"VBScript",aliases:["vbs"],case_insensitive:!0,keywords:{
keyword:["call","class","const","dim","do","loop","erase","execute","executeglobal","exit","for","each","next","function","if","then","else","on","error","option","explicit","new","private","property","let","get","public","randomize","redim","rem","select","case","set","stop","sub","while","wend","with","end","to","elseif","is","or","xor","and","not","class_initialize","class_terminate","default","preserve","in","me","byval","byref","step","resume","goto"],
built_in:["server","response","request","scriptengine","scriptenginebuildversion","scriptengineminorversion","scriptenginemajorversion"],
literal:["true","false","null","nothing","empty"]},illegal:"//",contains:[{
begin:t.concat(t.either(...r),"\\s*\\("),relevance:0,keywords:{built_in:r}
},e.inherit(e.QUOTE_STRING_MODE,{contains:[{begin:'""'}]}),e.COMMENT(/'/,/$/,{
relevance:0}),e.C_NUMBER_MODE]}}})();hljs.registerLanguage("vbscript",e)})();
;
/*! `armasm` grammar compiled for Highlight.js 11.12.0 */
(()=>{var s=(()=>{"use strict";return s=>{const e={
variants:[s.COMMENT("^[ \\t]*(?=#)","$",{relevance:0,excludeBegin:!0
}),s.COMMENT("[;@]","$",{relevance:0
}),s.C_LINE_COMMENT_MODE,s.C_BLOCK_COMMENT_MODE]};return{name:"ARM Assembly",
case_insensitive:!0,aliases:["arm"],keywords:{$pattern:"\\.?"+s.IDENT_RE,
meta:".2byte .4byte .align .ascii .asciz .balign .byte .code .data .else .end .endif .endm .endr .equ .err .exitm .extern .global .hword .if .ifdef .ifndef .include .irp .long .macro .rept .req .section .set .skip .space .text .word .arm .thumb .code16 .code32 .force_thumb .thumb_func .ltorg ALIAS ALIGN ARM AREA ASSERT ATTR CN CODE CODE16 CODE32 COMMON CP DATA DCB DCD DCDU DCDO DCFD DCFDU DCI DCQ DCQU DCW DCWU DN ELIF ELSE END ENDFUNC ENDIF ENDP ENTRY EQU EXPORT EXPORTAS EXTERN FIELD FILL FUNCTION GBLA GBLL GBLS GET GLOBAL IF IMPORT INCBIN INCLUDE INFO KEEP LCLA LCLL LCLS LTORG MACRO MAP MEND MEXIT NOFP OPT PRESERVE8 PROC QN READONLY RELOC REQUIRE REQUIRE8 RLIST FN ROUT SETA SETL SETS SN SPACE SUBT THUMB THUMBX TTL WHILE WEND ",
built_in:"r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 w0 w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12 w13 w14 w15 w16 w17 w18 w19 w20 w21 w22 w23 w24 w25 w26 w27 w28 w29 w30 x0 x1 x2 x3 x4 x5 x6 x7 x8 x9 x10 x11 x12 x13 x14 x15 x16 x17 x18 x19 x20 x21 x22 x23 x24 x25 x26 x27 x28 x29 x30 pc lr sp ip sl sb fp a1 a2 a3 a4 v1 v2 v3 v4 v5 v6 v7 v8 f0 f1 f2 f3 f4 f5 f6 f7 p0 p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 p11 p12 p13 p14 p15 c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 c10 c11 c12 c13 c14 c15 q0 q1 q2 q3 q4 q5 q6 q7 q8 q9 q10 q11 q12 q13 q14 q15 cpsr_c cpsr_x cpsr_s cpsr_f cpsr_cx cpsr_cxs cpsr_xs cpsr_xsf cpsr_sf cpsr_cxsf spsr_c spsr_x spsr_s spsr_f spsr_cx spsr_cxs spsr_xs spsr_xsf spsr_sf spsr_cxsf s0 s1 s2 s3 s4 s5 s6 s7 s8 s9 s10 s11 s12 s13 s14 s15 s16 s17 s18 s19 s20 s21 s22 s23 s24 s25 s26 s27 s28 s29 s30 s31 d0 d1 d2 d3 d4 d5 d6 d7 d8 d9 d10 d11 d12 d13 d14 d15 d16 d17 d18 d19 d20 d21 d22 d23 d24 d25 d26 d27 d28 d29 d30 d31 {PC} {VAR} {TRUE} {FALSE} {OPT} {CONFIG} {ENDIAN} {CODESIZE} {CPU} {FPU} {ARCHITECTURE} {PCSTOREOFFSET} {ARMASM_VERSION} {INTER} {ROPI} {RWPI} {SWST} {NOSWST} . @"
},contains:[{className:"keyword",
begin:"\\b(adc|(qd?|sh?|u[qh]?)?add(8|16)?|usada?8|(q|sh?|u[qh]?)?(as|sa)x|and|adrl?|sbc|rs[bc]|asr|b[lx]?|blx|bxj|cbn?z|tb[bh]|bic|bfc|bfi|[su]bfx|bkpt|cdp2?|clz|clrex|cmp|cmn|cpsi[ed]|cps|setend|dbg|dmb|dsb|eor|isb|it[te]{0,3}|lsl|lsr|ror|rrx|ldm(([id][ab])|f[ds])?|ldr((s|ex)?[bhd])?|movt?|mvn|mra|mar|mul|[us]mull|smul[bwt][bt]|smu[as]d|smmul|smmla|mla|umlaal|smlal?([wbt][bt]|d)|mls|smlsl?[ds]|smc|svc|sev|mia([bt]{2}|ph)?|mrr?c2?|mcrr2?|mrs|msr|orr|orn|pkh(tb|bt)|rbit|rev(16|sh)?|sel|[su]sat(16)?|nop|pop|push|rfe([id][ab])?|stm([id][ab])?|str(ex)?[bhd]?|(qd?)?sub|(sh?|q|u[qh]?)?sub(8|16)|[su]xt(a?h|a?b(16)?)|srs([id][ab])?|swpb?|swi|smi|tst|teq|wfe|wfi|yield)(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le|al|hs|lo)?[sptrx]?(?=\\s)"
},e,s.QUOTE_STRING_MODE,{className:"string",begin:"'",end:"[^\\\\]'",relevance:0
},{className:"title",begin:"\\|",end:"\\|",illegal:"\\n",relevance:0},{
className:"number",variants:[{begin:"[#$=]?0x[0-9a-f]+"},{begin:"[#$=]?0b[01]+"
},{begin:"[#$=]\\d+"},{begin:"\\b\\d+"}],relevance:0},{className:"symbol",
variants:[{begin:"^[ \\t]*[a-z_\\.\\$][a-z0-9_\\.\\$]+:"},{
begin:"^[a-z_\\.\\$][a-z0-9_\\.\\$]+"},{begin:"[=#]\\w+"}],relevance:0}]}}})()
;hljs.registerLanguage("armasm",s)})();
;
/*! `verilog` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const n=e.regex,t=["begin_keywords","celldefine","default_nettype","default_decay_time","default_trireg_strength","define","delay_mode_distributed","delay_mode_path","delay_mode_unit","delay_mode_zero","else","elsif","end_keywords","endcelldefine","endif","ifdef","ifndef","include","line","nounconnected_drive","pragma","resetall","timescale","unconnected_drive","undef","undefineall"]
;return{name:"Verilog",aliases:["v","sv","svh"],case_insensitive:!1,keywords:{
$pattern:/\$?[\w]+(\$[\w]+)*/,
keyword:["accept_on","alias","always","always_comb","always_ff","always_latch","and","assert","assign","assume","automatic","before","begin","bind","bins","binsof","bit","break","buf|0","bufif0","bufif1","byte","case","casex","casez","cell","chandle","checker","class","clocking","cmos","config","const","constraint","context","continue","cover","covergroup","coverpoint","cross","deassign","default","defparam","design","disable","dist","do","edge","else","end","endcase","endchecker","endclass","endclocking","endconfig","endfunction","endgenerate","endgroup","endinterface","endmodule","endpackage","endprimitive","endprogram","endproperty","endspecify","endsequence","endtable","endtask","enum","event","eventually","expect","export","extends","extern","final","first_match","for","force","foreach","forever","fork","forkjoin","function","generate|5","genvar","global","highz0","highz1","if","iff","ifnone","ignore_bins","illegal_bins","implements","implies","import","incdir","include","initial","inout","input","inside","instance","int","integer","interconnect","interface","intersect","join","join_any","join_none","large","let","liblist","library","local","localparam","logic","longint","macromodule","matches","medium","modport","module","nand","negedge","nettype","new","nexttime","nmos","nor","noshowcancelled","not","notif0","notif1","or","output","package","packed","parameter","pmos","posedge","primitive","priority","program","property","protected","pull0","pull1","pulldown","pullup","pulsestyle_ondetect","pulsestyle_onevent","pure","rand","randc","randcase","randsequence","rcmos","real","realtime","ref","reg","reject_on","release","repeat","restrict","return","rnmos","rpmos","rtran","rtranif0","rtranif1","s_always","s_eventually","s_nexttime","s_until","s_until_with","scalared","sequence","shortint","shortreal","showcancelled","signed","small","soft","solve","specify","specparam","static","string","strong","strong0","strong1","struct","super","supply0","supply1","sync_accept_on","sync_reject_on","table","tagged","task","this","throughout","time","timeprecision","timeunit","tran","tranif0","tranif1","tri","tri0","tri1","triand","trior","trireg","type","typedef","union","unique","unique0","unsigned","until","until_with","untyped","use","uwire","var","vectored","virtual","void","wait","wait_order","wand","weak","weak0","weak1","while","wildcard","wire","with","within","wor","xnor","xor"],
literal:["null"],
built_in:["$finish","$stop","$exit","$fatal","$error","$warning","$info","$realtime","$time","$printtimescale","$bitstoreal","$bitstoshortreal","$itor","$signed","$cast","$bits","$stime","$timeformat","$realtobits","$shortrealtobits","$rtoi","$unsigned","$asserton","$assertkill","$assertpasson","$assertfailon","$assertnonvacuouson","$assertoff","$assertcontrol","$assertpassoff","$assertfailoff","$assertvacuousoff","$isunbounded","$sampled","$fell","$changed","$past_gclk","$fell_gclk","$changed_gclk","$rising_gclk","$steady_gclk","$coverage_control","$coverage_get","$coverage_save","$set_coverage_db_name","$rose","$stable","$past","$rose_gclk","$stable_gclk","$future_gclk","$falling_gclk","$changing_gclk","$display","$coverage_get_max","$coverage_merge","$get_coverage","$load_coverage_db","$typename","$unpacked_dimensions","$left","$low","$increment","$clog2","$ln","$log10","$exp","$sqrt","$pow","$floor","$ceil","$sin","$cos","$tan","$countbits","$onehot","$isunknown","$fatal","$warning","$dimensions","$right","$high","$size","$asin","$acos","$atan","$atan2","$hypot","$sinh","$cosh","$tanh","$asinh","$acosh","$atanh","$countones","$onehot0","$error","$info","$random","$dist_chi_square","$dist_erlang","$dist_exponential","$dist_normal","$dist_poisson","$dist_t","$dist_uniform","$q_initialize","$q_remove","$q_exam","$async$and$array","$async$nand$array","$async$or$array","$async$nor$array","$sync$and$array","$sync$nand$array","$sync$or$array","$sync$nor$array","$q_add","$q_full","$psprintf","$async$and$plane","$async$nand$plane","$async$or$plane","$async$nor$plane","$sync$and$plane","$sync$nand$plane","$sync$or$plane","$sync$nor$plane","$system","$display","$displayb","$displayh","$displayo","$strobe","$strobeb","$strobeh","$strobeo","$write","$readmemb","$readmemh","$writememh","$value$plusargs","$dumpvars","$dumpon","$dumplimit","$dumpports","$dumpportson","$dumpportslimit","$writeb","$writeh","$writeo","$monitor","$monitorb","$monitorh","$monitoro","$writememb","$dumpfile","$dumpoff","$dumpall","$dumpflush","$dumpportsoff","$dumpportsall","$dumpportsflush","$fclose","$fdisplay","$fdisplayb","$fdisplayh","$fdisplayo","$fstrobe","$fstrobeb","$fstrobeh","$fstrobeo","$swrite","$swriteb","$swriteh","$swriteo","$fscanf","$fread","$fseek","$fflush","$feof","$fopen","$fwrite","$fwriteb","$fwriteh","$fwriteo","$fmonitor","$fmonitorb","$fmonitorh","$fmonitoro","$sformat","$sformatf","$fgetc","$ungetc","$fgets","$sscanf","$rewind","$ftell","$ferror"]
},contains:[e.C_BLOCK_COMMENT_MODE,e.C_LINE_COMMENT_MODE,e.QUOTE_STRING_MODE,{
scope:"number",contains:[e.BACKSLASH_ESCAPE],variants:[{
begin:/\b((\d+'([bhodBHOD]))[0-9xzXZa-fA-F_]+)/},{
begin:/\B(('([bhodBHOD]))[0-9xzXZa-fA-F_]+)/},{begin:/\b[0-9][0-9_]*/,
relevance:0}]},{scope:"variable",variants:[{begin:"#\\((?!parameter).+\\)"},{
begin:"\\.\\w+",relevance:0}]},{scope:"variable.constant",
match:n.concat(/`/,n.either("__FILE__","__LINE__"))},{scope:"meta",
begin:n.concat(/`/,n.either(...t)),end:/$|\/\/|\/\*/,returnEnd:!0,keywords:t}]}}
})();hljs.registerLanguage("verilog",e)})();
;
/*! `vhdl` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const r="\\d(_|\\d)*",t="[eE][-+]?"+r,n="\\b("+r+"#\\w+(\\.\\w+)?#("+t+")?|"+r+"(\\."+r+")?("+t+")?)"
;return{name:"VHDL",case_insensitive:!0,keywords:{
keyword:["abs","access","after","alias","all","and","architecture","array","assert","assume","assume_guarantee","attribute","begin","block","body","buffer","bus","case","component","configuration","constant","context","cover","disconnect","downto","default","else","elsif","end","entity","exit","fairness","file","for","force","function","generate","generic","group","guarded","if","impure","in","inertial","inout","is","label","library","linkage","literal","loop","map","mod","nand","new","next","nor","not","null","of","on","open","or","others","out","package","parameter","port","postponed","procedure","process","property","protected","pure","range","record","register","reject","release","rem","report","restrict","restrict_guarantee","return","rol","ror","select","sequence","severity","shared","signal","sla","sll","sra","srl","strong","subtype","then","to","transport","type","unaffected","units","until","use","variable","view","vmode","vprop","vunit","wait","when","while","with","xnor","xor"],
built_in:["boolean","bit","character","integer","time","delay_length","natural","positive","string","bit_vector","file_open_kind","file_open_status","std_logic","std_logic_vector","unsigned","signed","boolean_vector","integer_vector","std_ulogic","std_ulogic_vector","unresolved_unsigned","u_unsigned","unresolved_signed","u_signed","real_vector","time_vector"],
literal:["false","true","note","warning","error","failure","line","text","side","width"]
},illegal:/\{/,
contains:[e.C_BLOCK_COMMENT_MODE,e.COMMENT("--","$"),e.QUOTE_STRING_MODE,{
className:"number",begin:n,relevance:0},{className:"string",
begin:"'(U|X|0|1|Z|W|L|H|-)'",contains:[e.BACKSLASH_ESCAPE]},{
className:"symbol",begin:"'[A-Za-z](_?[A-Za-z0-9])*",
contains:[e.BACKSLASH_ESCAPE]}]}}})();hljs.registerLanguage("vhdl",e)})();
;
/*! `fortran` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const n=e.regex,a={
variants:[e.COMMENT("!","$",{relevance:0}),e.COMMENT("^C[ ]","$",{relevance:0
}),e.COMMENT("^C$","$",{relevance:0})]
},t=/(_[a-z_\d]+)?/,i=/([de][+-]?\d+)?/,c={className:"number",variants:[{
begin:n.concat(/\b\d+/,/\.(\d*)/,i,t)},{begin:n.concat(/\b\d+/,i,t)},{
begin:n.concat(/\.\d+/,i,t)}],relevance:0},o={className:"function",
beginKeywords:"subroutine function program",illegal:"[${=\\n]",
contains:[e.UNDERSCORE_TITLE_MODE,{className:"params",begin:"\\(",end:"\\)"}]}
;return{name:"Fortran",case_insensitive:!0,aliases:["f90","f95"],keywords:{
$pattern:/\b[a-z][a-z0-9_]+\b|\.[a-z][a-z0-9_]+\./,
keyword:["kind","do","concurrent","local","shared","while","private","call","intrinsic","where","elsewhere","type","endtype","endmodule","endselect","endinterface","end","enddo","endif","if","forall","endforall","only","contains","default","return","stop","then","block","endblock","endassociate","public","subroutine|10","function","program",".and.",".or.",".not.",".le.",".eq.",".ge.",".gt.",".lt.","goto","save","else","use","module","select","case","access","blank","direct","exist","file","fmt","form","formatted","iostat","name","named","nextrec","number","opened","rec","recl","sequential","status","unformatted","unit","continue","format","pause","cycle","exit","c_null_char","c_alert","c_backspace","c_form_feed","flush","wait","decimal","round","iomsg","synchronous","nopass","non_overridable","pass","protected","volatile","abstract","extends","import","non_intrinsic","value","deferred","generic","final","enumerator","class","associate","bind","enum","c_int","c_short","c_long","c_long_long","c_signed_char","c_size_t","c_int8_t","c_int16_t","c_int32_t","c_int64_t","c_int_least8_t","c_int_least16_t","c_int_least32_t","c_int_least64_t","c_int_fast8_t","c_int_fast16_t","c_int_fast32_t","c_int_fast64_t","c_intmax_t","C_intptr_t","c_float","c_double","c_long_double","c_float_complex","c_double_complex","c_long_double_complex","c_bool","c_char","c_null_ptr","c_null_funptr","c_new_line","c_carriage_return","c_horizontal_tab","c_vertical_tab","iso_c_binding","c_loc","c_funloc","c_associated","c_f_pointer","c_ptr","c_funptr","iso_fortran_env","character_storage_size","error_unit","file_storage_size","input_unit","iostat_end","iostat_eor","numeric_storage_size","output_unit","c_f_procpointer","ieee_arithmetic","ieee_support_underflow_control","ieee_get_underflow_mode","ieee_set_underflow_mode","newunit","contiguous","recursive","pad","position","action","delim","readwrite","eor","advance","nml","interface","procedure","namelist","include","sequence","elemental","pure","impure","integer","real","character","complex","logical","codimension","dimension","allocatable|10","parameter","external","implicit|10","none","double","precision","assign","intent","optional","pointer","target","in","out","common","equivalence","data"],
literal:[".False.",".True."],
built_in:["alog","alog10","amax0","amax1","amin0","amin1","amod","cabs","ccos","cexp","clog","csin","csqrt","dabs","dacos","dasin","datan","datan2","dcos","dcosh","ddim","dexp","dint","dlog","dlog10","dmax1","dmin1","dmod","dnint","dsign","dsin","dsinh","dsqrt","dtan","dtanh","float","iabs","idim","idint","idnint","ifix","isign","max0","max1","min0","min1","sngl","algama","cdabs","cdcos","cdexp","cdlog","cdsin","cdsqrt","cqabs","cqcos","cqexp","cqlog","cqsin","cqsqrt","dcmplx","dconjg","derf","derfc","dfloat","dgamma","dimag","dlgama","iqint","qabs","qacos","qasin","qatan","qatan2","qcmplx","qconjg","qcos","qcosh","qdim","qerf","qerfc","qexp","qgamma","qimag","qlgama","qlog","qlog10","qmax1","qmin1","qmod","qnint","qsign","qsin","qsinh","qsqrt","qtan","qtanh","abs","acos","aimag","aint","anint","asin","atan","atan2","char","cmplx","conjg","cos","cosh","exp","ichar","index","int","log","log10","max","min","nint","sign","sin","sinh","sqrt","tan","tanh","print","write","dim","lge","lgt","lle","llt","mod","nullify","allocate","deallocate","adjustl","adjustr","all","allocated","any","associated","bit_size","btest","ceiling","count","cshift","date_and_time","digits","dot_product","eoshift","epsilon","exponent","floor","fraction","huge","iand","ibclr","ibits","ibset","ieor","ior","ishft","ishftc","lbound","len_trim","matmul","maxexponent","maxloc","maxval","merge","minexponent","minloc","minval","modulo","mvbits","nearest","pack","present","product","radix","random_number","random_seed","range","repeat","reshape","rrspacing","scale","scan","selected_int_kind","selected_real_kind","set_exponent","shape","size","spacing","spread","sum","system_clock","tiny","transpose","trim","ubound","unpack","verify","achar","iachar","transfer","dble","entry","dprod","cpu_time","command_argument_count","get_command","get_command_argument","get_environment_variable","is_iostat_end","ieee_arithmetic","ieee_support_underflow_control","ieee_get_underflow_mode","ieee_set_underflow_mode","is_iostat_eor","move_alloc","new_line","selected_char_kind","same_type_as","extends_type_of","acosh","asinh","atanh","bessel_j0","bessel_j1","bessel_jn","bessel_y0","bessel_y1","bessel_yn","erf","erfc","erfc_scaled","gamma","log_gamma","hypot","norm2","atomic_define","atomic_ref","execute_command_line","leadz","trailz","storage_size","merge_bits","bge","bgt","ble","blt","dshiftl","dshiftr","findloc","iall","iany","iparity","image_index","lcobound","ucobound","maskl","maskr","num_images","parity","popcnt","poppar","shifta","shiftl","shiftr","this_image","sync","change","team","co_broadcast","co_max","co_min","co_sum","co_reduce"]
},illegal:/\/\*/,contains:[{className:"string",relevance:0,
variants:[e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]},o,{begin:/^C\s*=(?!=)/,
relevance:0},a,c]}}})();hljs.registerLanguage("fortran",e)})();
;
/*! `scala` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const n=e.regex,a={className:"subst",
variants:[{begin:"\\$[A-Za-z0-9_]+"},{begin:/\$\{/,end:/\}/}]},s={
className:"string",variants:[{begin:'"""',end:'"""'},{begin:'"',end:'"',
illegal:"\\n",contains:[e.BACKSLASH_ESCAPE]},{begin:'[a-z]+"',end:'"',
illegal:"\\n",contains:[e.BACKSLASH_ESCAPE,a]},{className:"string",
begin:'[a-z]+"""',end:'"""',contains:[a],relevance:10}]},i={className:"type",
begin:"\\b[A-Z][A-Za-z0-9_]*",relevance:0},t={className:"title",
begin:/[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/,
relevance:0},c={className:"class",beginKeywords:"class object trait type",
end:/[:={\[\n;]/,excludeEnd:!0,
contains:[e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,{
beginKeywords:"extends with",relevance:10},{begin:/\[/,end:/\]/,excludeBegin:!0,
excludeEnd:!0,relevance:0,
contains:[i,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},{className:"params",
begin:/\(/,end:/\)/,excludeBegin:!0,excludeEnd:!0,relevance:0,
contains:[i,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE]},t]},r={
className:"function",beginKeywords:"def",end:n.lookahead(/[:={\[(\n;]/),
contains:[t]};return{name:"Scala",keywords:{literal:"true false null",
keyword:"type yield lazy override def with val var sealed abstract private trait object if then forSome for while do throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicit export enum given transparent"
},contains:[{begin:["//>",/\s+/,/using/,/\s+/,/\S+/],beginScope:{1:"comment",
3:"keyword",5:"type"},end:/$/,contains:[{className:"string",begin:/\S+/}]
},e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,s,i,r,c,e.C_NUMBER_MODE,{
begin:[/^\s*/,"extension",/\s+(?=[[(])/],beginScope:{2:"keyword"}},{
begin:[/^\s*/,/end/,/\s+/,/(extension\b)?/],beginScope:{2:"keyword",4:"keyword"}
},{match:/\.inline\b/},{begin:/\binline(?=\s)/,keywords:"inline"},{
begin:[/\(\s*/,/using/,/\s+(?!\))/],beginScope:{2:"keyword"}},{className:"meta",
begin:"@[A-Za-z]+"}]}}})();hljs.registerLanguage("scala",e)})();
;
/*! `dart` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const n=e.regex,a={className:"subst",
variants:[{begin:"\\$[A-Za-z0-9_]+"}]},t={className:"subst",variants:[{
begin:/\$\{/,end:/\}/}],keywords:"true false null this is new super"},i={
className:"number",relevance:0,variants:[{
match:/\b[0-9][0-9_]*(\.[0-9][0-9_]*)?([eE][+-]?[0-9][0-9_]*)?\b/},{
match:/\b0[xX][0-9A-Fa-f][0-9A-Fa-f_]*\b/}]},s={className:"string",variants:[{
begin:"r'''",end:"'''"},{begin:'r"""',end:'"""'},{begin:"r'",end:"'",
illegal:"\\n"},{begin:'r"',end:'"',illegal:"\\n"},{begin:"'''",end:"'''",
contains:[e.BACKSLASH_ESCAPE,a,t]},{begin:'"""',end:'"""',
contains:[e.BACKSLASH_ESCAPE,a,t]},{begin:"'",end:"'",illegal:"\\n",
contains:[e.BACKSLASH_ESCAPE,a,t]},{begin:'"',end:'"',illegal:"\\n",
contains:[e.BACKSLASH_ESCAPE,a,t]}]};t.contains=[i,s]
;const r=["Comparable","DateTime","Duration","Function","Iterable","Iterator","List","Map","Match","Object","Pattern","RegExp","Set","Stopwatch","String","StringBuffer","StringSink","Symbol","Type","Uri","bool","double","int","num","Element","ElementList"],c=r.map(e=>e+"?"),l={
keyword:["abstract","as","assert","async","await","base","break","case","catch","class","const","continue","covariant","default","deferred","do","dynamic","else","enum","export","extends","extension","external","factory","false","final","finally","for","Function","get","hide","if","implements","import","in","interface","is","late","library","mixin","new","null","on","operator","part","required","rethrow","return","sealed","set","show","static","super","switch","sync","this","throw","true","try","typedef","var","void","when","while","with","yield"],
built_in:r.concat(c).concat(["Never","Null","dynamic","print","document","querySelector","querySelectorAll","window"]),
$pattern:/[A-Za-z][A-Za-z0-9_]*\??/},o={
match:n.concat(/\b_?/,n.either(/(?:[A-Z]+[a-z0-9]+)+/,/(?:[A-Z]+[a-z0-9]+)+[A-Z]+/),/(?![A-Za-z0-9_])/),
scope:"title.class"};return{name:"Dart",keywords:l,
contains:[s,e.COMMENT(/\/\*\*(?!\/)/,/\*\//,{subLanguage:"markdown",relevance:0
}),e.COMMENT(/\/{3,} ?/,/$/,{contains:[{subLanguage:"markdown",begin:".",
end:"$",relevance:0}]}),e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,{
className:"class",beginKeywords:"class interface",end:/\{/,excludeEnd:!0,
contains:[{beginKeywords:"extends implements"},e.UNDERSCORE_TITLE_MODE]},o,{
match:/\b(?!(?:assert|catch|for|if|switch|while)\b)[a-z_][A-Za-z0-9_]*(?=\()/,
scope:"title.function"},i,{className:"meta",begin:"@[A-Za-z]+"}]}}})()
;hljs.registerLanguage("dart",e)})();
;
/*! `haskell` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const n="([0-9]_*)+",a="([0-9a-fA-F]_*)+",i="([!#$%&*+.\\/<=>?@\\\\^~-]|(?!([(),;\\[\\]`|{}]|[_:\"']))(\\p{S}|\\p{P}))",s={
variants:[e.COMMENT("--+","$"),e.COMMENT(/\{-/,/-\}/,{contains:["self"]})]},l={
className:"meta",begin:/\{-#/,end:/#-\}/},t={className:"meta",begin:"^#",end:"$"
},c={className:"type",begin:"\\b[A-Z][\\w']*",relevance:0},r={begin:"\\(",
end:"\\)",illegal:'"',contains:[l,t,{className:"type",
begin:"\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?"},e.inherit(e.TITLE_MODE,{
begin:"[_a-z][\\w']*"}),s]},o={className:"number",relevance:0,variants:[{
match:`\\b(${n})(\\.(${n}))?([eE][+-]?(${n}))?\\b`},{
match:`\\b0[xX]_*(${a})(\\.(${a}))?([pP][+-]?(${n}))?\\b`},{
match:"\\b0[oO](([0-7]_*)+)\\b"},{match:"\\b0[bB](([01]_*)+)\\b"}]};return{
name:"Haskell",aliases:["hs"],
keywords:"let in if then else case of where do module import hiding qualified type data newtype deriving class instance as default infix infixl infixr foreign export ccall stdcall cplusplus jvm dotnet safe unsafe family forall mdo proc rec",
unicodeRegex:!0,contains:[{beginKeywords:"module",end:"where",
keywords:"module where",contains:[r,s],illegal:"\\W\\.|;"},{
begin:"\\bimport\\b",end:"$",keywords:"import qualified as hiding",
contains:[r,s],illegal:"\\W\\.|;"},{className:"class",
begin:"^(\\s*)?(class|instance)\\b",end:"where",
keywords:"class family instance where",contains:[c,r,s]},{className:"class",
begin:"\\b(data|(new)?type)\\b",end:"$",
keywords:"data family type newtype deriving where",contains:[l,c,r,{begin:/\{/,
end:/\}/,contains:r.contains},s]},{beginKeywords:"default",end:"$",
contains:[c,r,s]},{beginKeywords:"infix infixl infixr",end:"$",
contains:[e.C_NUMBER_MODE,s]},{begin:"\\bforeign\\b",end:"$",
keywords:"foreign import export ccall stdcall cplusplus jvm dotnet safe unsafe",
contains:[c,e.QUOTE_STRING_MODE,s]},{className:"meta",
begin:"#!\\/usr\\/bin\\/env runhaskell",end:"$"},l,t,{scope:"string",
begin:/'(?=\\?.')/,end:/'/,contains:[{scope:"char.escape",match:/\\./}]
},e.QUOTE_STRING_MODE,o,c,e.inherit(e.TITLE_MODE,{begin:"^[_a-z][\\w']*"}),{
begin:`(?!-)${i}--+|--+(?!-)${i}`},s,{begin:"->|<-"}]}}})()
;hljs.registerLanguage("haskell",e)})();
;
/*! `julia` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const r="[A-Za-z_\\u00A1-\\uFFFF][A-Za-z_0-9\\u00A1-\\uFFFF]*",t={$pattern:r,
keyword:["baremodule","begin","break","catch","ccall","const","continue","do","else","elseif","end","export","false","finally","for","function","global","if","import","in","isa","let","local","macro","module","quote","return","true","try","using","where","while"],
literal:["ARGS","C_NULL","DEPOT_PATH","ENDIAN_BOM","ENV","Inf","Inf16","Inf32","Inf64","InsertionSort","LOAD_PATH","MergeSort","NaN","NaN16","NaN32","NaN64","PROGRAM_FILE","QuickSort","RoundDown","RoundFromZero","RoundNearest","RoundNearestTiesAway","RoundNearestTiesUp","RoundToZero","RoundUp","VERSION|0","devnull","false","im","missing","nothing","pi","stderr","stdin","stdout","true","undef","\u03c0","\u212f"],
built_in:["AbstractArray","AbstractChannel","AbstractChar","AbstractDict","AbstractDisplay","AbstractFloat","AbstractIrrational","AbstractMatrix","AbstractRange","AbstractSet","AbstractString","AbstractUnitRange","AbstractVecOrMat","AbstractVector","Any","ArgumentError","Array","AssertionError","BigFloat","BigInt","BitArray","BitMatrix","BitSet","BitVector","Bool","BoundsError","CapturedException","CartesianIndex","CartesianIndices","Cchar","Cdouble","Cfloat","Channel","Char","Cint","Cintmax_t","Clong","Clonglong","Cmd","Colon","Complex","ComplexF16","ComplexF32","ComplexF64","CompositeException","Condition","Cptrdiff_t","Cshort","Csize_t","Cssize_t","Cstring","Cuchar","Cuint","Cuintmax_t","Culong","Culonglong","Cushort","Cvoid","Cwchar_t","Cwstring","DataType","DenseArray","DenseMatrix","DenseVecOrMat","DenseVector","Dict","DimensionMismatch","Dims","DivideError","DomainError","EOFError","Enum","ErrorException","Exception","ExponentialBackOff","Expr","Float16","Float32","Float64","Function","GlobalRef","HTML","IO","IOBuffer","IOContext","IOStream","IdDict","IndexCartesian","IndexLinear","IndexStyle","InexactError","InitError","Int","Int128","Int16","Int32","Int64","Int8","Integer","InterruptException","InvalidStateException","Irrational","KeyError","LinRange","LineNumberNode","LinearIndices","LoadError","MIME","Matrix","Method","MethodError","Missing","MissingException","Module","NTuple","NamedTuple","Nothing","Number","OrdinalRange","OutOfMemoryError","OverflowError","Pair","PartialQuickSort","PermutedDimsArray","Pipe","ProcessFailedException","Ptr","QuoteNode","Rational","RawFD","ReadOnlyMemoryError","Real","ReentrantLock","Ref","Regex","RegexMatch","RoundingMode","SegmentationFault","Set","Signed","Some","StackOverflowError","StepRange","StepRangeLen","StridedArray","StridedMatrix","StridedVecOrMat","StridedVector","String","StringIndexError","SubArray","SubString","SubstitutionString","Symbol","SystemError","Task","TaskFailedException","Text","TextDisplay","Timer","Tuple","Type","TypeError","TypeVar","UInt","UInt128","UInt16","UInt32","UInt64","UInt8","UndefInitializer","UndefKeywordError","UndefRefError","UndefVarError","Union","UnionAll","UnitRange","Unsigned","Val","Vararg","VecElement","VecOrMat","Vector","VersionNumber","WeakKeyDict","WeakRef"]
},n={keywords:t,illegal:/<\//},a={className:"subst",begin:/\$\(/,end:/\)/,
keywords:t},i={className:"variable",begin:"\\$"+r},o={className:"string",
contains:[e.BACKSLASH_ESCAPE,a,i],variants:[{begin:/\w*"""/,end:/"""\w*/,
relevance:10},{begin:/\w*"/,end:/"\w*/}]},s={className:"string",
contains:[e.BACKSLASH_ESCAPE,a,i],begin:"`",end:"`"},l={className:"meta",
begin:"@"+r};return n.name="Julia",n.contains=[{className:"number",
begin:/(\b0x[\d_]*(\.[\d_]*)?|0x\.\d[\d_]*)p[-+]?\d+|\b0[box][a-fA-F0-9][a-fA-F0-9_]*|(\b\d[\d_]*(\.[\d_]*)?|\.\d[\d_]*)([eEfF][-+]?\d+)?/,
relevance:0},{className:"string",begin:/'(.|\\[xXuU][a-zA-Z0-9]+)'/},o,s,l,{
className:"comment",variants:[{begin:"#=",end:"=#",relevance:10},{begin:"#",
end:"$"}]},e.HASH_COMMENT_MODE,{className:"keyword",
begin:"\\b(((abstract|primitive)\\s+)type|(mutable\\s+)?struct)\\b"},{begin:/<:/
}],a.contains=n.contains,n}})();hljs.registerLanguage("julia",e)})();
;
/*! `groovy` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict"
;var e="[0-9](_*[0-9])*",a=`\\.(${e})`,n="[0-9a-fA-F](_*[0-9a-fA-F])*",t={
className:"number",variants:[{
begin:`(\\b(${e})((${a})|\\.)?|(${a}))[eE][+-]?(${e})[fFdD]?\\b`},{
begin:`\\b(${e})((${a})[fFdD]?\\b|\\.([fFdD]\\b)?)`},{begin:`(${a})[fFdD]?\\b`
},{begin:`\\b(${e})[fFdD]\\b`},{
begin:`\\b0[xX]((${n})\\.?|(${n})?\\.(${n}))[pP][+-]?(${e})[fFdD]?\\b`},{
begin:"\\b(0|[1-9](_*[0-9])*)[lL]?\\b"},{begin:`\\b0[xX](${n})[lL]?\\b`},{
begin:"\\b0(_*[0-7])*[lL]?\\b"},{begin:"\\b0[bB][01](_*[01])*[lL]?\\b"}],
relevance:0};function r(e,a={}){return a.variants=e,a}return e=>{
const a=e.regex,n="[A-Za-z0-9_$]+",i=r([e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,e.COMMENT("/\\*\\*","\\*/",{
relevance:0,contains:[{begin:/\w+@/,relevance:0},{className:"doctag",
begin:"@[A-Za-z]+"}]})]),s={className:"regexp",begin:/~?\/[^\/\n]+\//,
contains:[e.BACKSLASH_ESCAPE]},l=t,b=r([{begin:/"""/,end:/"""/},{begin:/'''/,
end:/'''/},{begin:"\\$/",end:"/\\$",relevance:10
},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE],{className:"string"}),c={
match:[/(class|interface|trait|enum|record|extends|implements)/,/\s+/,e.UNDERSCORE_IDENT_RE],
scope:{1:"keyword",3:"title.class"}};return{name:"Groovy",keywords:{
"variable.language":"this super",literal:"true false null",
type:["byte","short","char","int","long","boolean","float","double","void"],
keyword:["def","as","in","assert","trait","abstract","static","volatile","transient","public","private","protected","synchronized","final","class","interface","enum","if","else","for","while","switch","case","break","default","continue","throw","throws","try","catch","finally","implements","extends","new","import","package","return","instanceof","var"]
},contains:[e.SHEBANG({binary:"groovy",relevance:10}),i,b,s,l,c,{
className:"meta",begin:"@[A-Za-z]+",relevance:0},{className:"attr",
begin:n+"[ \t]*:",relevance:0},{begin:/\?/,end:/:/,relevance:0,
contains:[i,b,s,l,"self"]},{className:"symbol",
begin:"^[ \t]*"+a.lookahead(n+":"),excludeBegin:!0,end:n+":",relevance:0}],
illegal:/#|<\//}}})();hljs.registerLanguage("groovy",e)})();
;
/*! `gradle` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>({name:"Gradle",case_insensitive:!0,
keywords:["task","project","allprojects","subprojects","artifacts","buildscript","configurations","dependencies","repositories","sourceSets","description","delete","from","into","include","exclude","source","classpath","destinationDir","includes","options","sourceCompatibility","targetCompatibility","group","flatDir","doLast","doFirst","flatten","todir","fromdir","ant","def","abstract","break","case","catch","continue","default","do","else","extends","final","finally","for","if","implements","instanceof","native","new","private","protected","public","return","static","switch","synchronized","throw","throws","transient","try","volatile","while","strictfp","package","import","false","null","super","this","true","antlrtask","checkstyle","codenarc","copy","boolean","byte","char","class","double","float","int","interface","long","short","void","compile","runTime","file","fileTree","abs","any","append","asList","asWritable","call","collect","compareTo","count","div","dump","each","eachByte","eachFile","eachLine","every","find","findAll","flatten","getAt","getErr","getIn","getOut","getText","grep","immutable","inject","inspect","intersect","invokeMethods","isCase","join","leftShift","minus","multiply","newInputStream","newOutputStream","newPrintWriter","newReader","newWriter","next","plus","pop","power","previous","print","println","push","putAt","read","readBytes","readLines","reverse","reverseEach","round","size","sort","splitEachLine","step","subMap","times","toInteger","toList","tokenize","upto","waitForOrKill","withPrintWriter","withReader","withStream","withWriter","withWriterAppend","write","writeLine"],
contains:[e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,e.APOS_STRING_MODE,e.QUOTE_STRING_MODE,e.NUMBER_MODE,e.REGEXP_MODE]
})})();hljs.registerLanguage("gradle",e)})();
;
/*! `properties` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const n="[ \\t\\f]*",t=n+"[:=]"+n,s="[ \\t\\f]+",a="([^\\\\:= \\t\\f\\n]|\\\\.)+",r={
end:"("+t+"|"+s+")",relevance:0,starts:{className:"string",end:/$/,relevance:0,
contains:[{begin:"\\\\\\\\"},{begin:"\\\\\\n"}]}};return{name:".properties",
disableAutodetect:!0,case_insensitive:!0,illegal:/\S/,
contains:[e.COMMENT("^\\s*[!#]","$"),{returnBegin:!0,variants:[{begin:a+t},{
begin:a+s}],contains:[{className:"attr",begin:a,endsParent:!0}],starts:r},{
className:"attr",begin:a+n+"$"}]}}})();hljs.registerLanguage("properties",e)
})();
;
/*! `http` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{const n="HTTP/([32]|1\\.[01])",a={
className:"attribute",
begin:e.regex.concat("^",/[A-Za-z][A-Za-z0-9-]*/,"(?=\\:\\s)"),starts:{
contains:[{className:"punctuation",begin:/: /,relevance:0,starts:{end:"$",
relevance:0}}]}},s=[a,{begin:"\\n\\n",starts:{subLanguage:[],endsWithParent:!0}
}];return{name:"HTTP",aliases:["https"],illegal:/\S/,contains:[{
begin:"^(?="+n+" \\d{3})",end:/$/,contains:[{className:"meta",begin:n},{
className:"number",begin:"\\b\\d{3}\\b"}],starts:{end:/\b\B/,illegal:/\S/,
contains:s}},{begin:"(?=^[A-Z]+ (.*?) "+n+"$)",end:/$/,contains:[{
className:"string",begin:" ",end:" ",excludeBegin:!0,excludeEnd:!0},{
className:"meta",begin:n},{className:"keyword",begin:"[A-Z]+"}],starts:{
end:/\b\B/,illegal:/\S/,contains:s}},e.inherit(a,{relevance:0})]}}})()
;hljs.registerLanguage("http",e)})();
;
/*! `delphi` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const a=["exports","register","file","shl","array","record","property","for","mod","while","set","ally","label","uses","raise","not","stored","class","safecall","var","interface","or","private","static","exit","index","inherited","to","else","stdcall","override","shr","asm","far","resourcestring","finalization","packed","virtual","out","and","protected","library","do","xorwrite","goto","near","function","end","div","overload","object","unit","begin","string","on","inline","repeat","until","destructor","write","message","program","with","read","initialization","except","default","nil","if","case","cdecl","in","downto","threadvar","of","try","pascal","const","external","constructor","type","public","then","implementation","finally","published","procedure","absolute","reintroduce","operator","as","is","abstract","alias","assembler","bitpacked","break","continue","cppdecl","cvar","enumerator","experimental","platform","deprecated","unimplemented","dynamic","export","far16","forward","generic","helper","implements","interrupt","iochecks","local","name","nodefault","noreturn","nostackframe","oldfpccall","otherwise","saveregisters","softfloat","specialize","strict","unaligned","varargs"],r=[e.C_LINE_COMMENT_MODE,e.COMMENT(/\{/,/\}/,{
relevance:0}),e.COMMENT(/\(\*/,/\*\)/,{relevance:10})],t={className:"meta",
variants:[{begin:/\{\$/,end:/\}/},{begin:/\(\*\$/,end:/\*\)/}]},n={
className:"string",begin:/'/,end:/'/,contains:[{begin:/''/}]},s={
className:"string",variants:[{match:/#\d[\d_]*/},{
match:/#\$[\dA-Fa-f][\dA-Fa-f_]*/},{match:/#&[0-7][0-7_]*/},{
match:/#%[01][01_]*/}]},i={begin:e.IDENT_RE+"\\s*=\\s*class\\s*\\(",
returnBegin:!0,contains:[e.TITLE_MODE]},c={className:"function",
beginKeywords:"function constructor destructor procedure",end:/[:;]/,
keywords:"function constructor|10 destructor|10 procedure|10",
contains:[e.TITLE_MODE,{className:"params",begin:/\(/,end:/\)/,keywords:a,
contains:[n,s,t].concat(r)},t].concat(r)};return{name:"Delphi",
aliases:["dpr","dfm","pas","pascal"],case_insensitive:!0,keywords:a,
illegal:/"|\$[G-Zg-z]|\/\*|<\/|\|/,contains:[n,s,{className:"number",
relevance:0,variants:[{match:/\b\d[\d_]*(\.\d[\d_]*)?/},{match:/\$[\dA-Fa-f_]+/
},{match:/\$/,relevance:0},{match:/&[0-7][0-7_]*/},{match:/%[01_]+/},{match:/%/,
relevance:0}]},i,c,t].concat(r)}}})();hljs.registerLanguage("delphi",e)})();
;
/*! `erlang` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const n="[a-z'][a-zA-Z0-9_']*",i="("+n+":"+n+"|"+n+")",a={
keyword:"after and andalso|10 band begin bnot bor bsl bzr bxor case catch cond div end fun if let not of orelse|10 query receive rem try when xor maybe else",
literal:"false true"},r=e.COMMENT("%","$"),s={className:"number",
begin:"\\b(\\d+(_\\d+)*#[a-fA-F0-9]+(_[a-fA-F0-9]+)*|\\d+(_\\d+)*(\\.\\d+(_\\d+)*)?([eE][-+]?\\d+)?)",
relevance:0},d={begin:"fun\\s+"+n+"/\\d+"},c={begin:i+"\\(",end:"\\)",
returnBegin:!0,relevance:0,contains:[{begin:i,relevance:0},{begin:"\\(",
end:"\\)",endsWithParent:!0,returnEnd:!0,relevance:0}]},t={begin:/\{/,end:/\}/,
relevance:0},o={begin:"\\b_([A-Z][A-Za-z0-9_]*)?",relevance:0},l={
begin:"[A-Z][a-zA-Z0-9_]*",relevance:0},g={begin:"#"+e.UNDERSCORE_IDENT_RE,
relevance:0,returnBegin:!0,contains:[{begin:"#"+e.UNDERSCORE_IDENT_RE,
relevance:0},{begin:/\{/,end:/\}/,relevance:0}]},b={scope:"string",
match:/\$(\\([^0-9]|[0-9]{1,3}|)|.)/},E={scope:"string",
match:/"""("*)(?!")[\s\S]*?"""\1/},_={scope:"string",
contains:[e.BACKSLASH_ESCAPE],variants:[{match:/~\w?"""("*)(?!")[\s\S]*?"""\1/
},{begin:/~\w?\(/,end:/\)/},{begin:/~\w?\[/,end:/\]/},{begin:/~\w?{/,end:/}/},{
begin:/~\w?</,end:/>/},{begin:/~\w?\//,end:/\//},{begin:/~\w?\|/,end:/\|/},{
begin:/~\w?'/,end:/'/},{begin:/~\w?"/,end:/"/},{begin:/~\w?`/,end:/`/},{
begin:/~\w?#/,end:/#/}]},u={beginKeywords:"fun receive if try case maybe",
end:"end",keywords:a};u.contains=[r,d,e.inherit(e.APOS_STRING_MODE,{className:""
}),u,c,_,E,e.QUOTE_STRING_MODE,s,t,o,l,g,b]
;const f=[r,d,u,c,_,E,e.QUOTE_STRING_MODE,s,t,o,l,g,b];c.contains[1].contains=f,
t.contains=f,g.contains[1].contains=f;const v={className:"params",begin:"\\(",
end:"\\)",contains:f};return{name:"Erlang",aliases:["erl"],keywords:a,
illegal:"(</|\\*=|\\+=|-=|/\\*|\\*/|\\(\\*|\\*\\))",contains:[{
className:"function",begin:"^"+n+"\\s*\\(",end:"->",returnBegin:!0,
illegal:"\\(|#|//|/\\*|\\\\|:|;",contains:[v,e.inherit(e.TITLE_MODE,{begin:n})],
starts:{end:";|\\.",keywords:a,contains:f}},r,{begin:"^-",end:"\\.",relevance:0,
excludeEnd:!0,returnBegin:!0,keywords:{$pattern:"-"+e.IDENT_RE,
keyword:["-module","-record","-undef","-export","-ifdef","-ifndef","-author","-copyright","-doc","-moduledoc","-vsn","-import","-include","-include_lib","-compile","-define","-else","-endif","-file","-behaviour","-behavior","-spec","-on_load","-nifs"].map(e=>e+"|1.5").join(" ")
},contains:[v,_,E,e.QUOTE_STRING_MODE]},s,_,E,e.QUOTE_STRING_MODE,g,o,l,t,b,{
begin:/\.$/}]}}})();hljs.registerLanguage("erlang",e)})();
;
/*! `elixir` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const n=e.regex,a="[a-zA-Z_][a-zA-Z0-9_.]*(!|\\?)?",i={$pattern:a,
keyword:["after","alias","and","case","catch","cond","defstruct","defguard","defguardp","do","else","end","fn","for","if","import","in","not","or","quote","raise","receive","require","reraise","rescue","try","unless","unquote","unquote_splicing","use","when","with|0"],
literal:["false","nil","true"]},s={className:"subst",begin:/#\{/,end:/\}/,
keywords:i},c={match:/\\[\s\S]/,scope:"char.escape",relevance:0
},r="[/|([{<\"']",t=[{begin:/"/,end:/"/},{begin:/'/,end:/'/},{begin:/\//,
end:/\//},{begin:/\|/,end:/\|/},{begin:/\(/,end:/\)/},{begin:/\[/,end:/\]/},{
begin:/\{/,end:/\}/},{begin:/</,end:/>/}],d=e=>({scope:"char.escape",
begin:n.concat(/\\/,e),relevance:0}),o={className:"string",
begin:"~[a-z](?="+r+")",contains:t.map(n=>e.inherit(n,{contains:[d(n.end),c,s]
}))},b={className:"string",begin:"~[A-Z](?="+r+")",
contains:t.map(n=>e.inherit(n,{contains:[d(n.end)]}))},g={className:"regex",
variants:[{begin:"~r(?="+r+")",contains:t.map(a=>e.inherit(a,{
end:n.concat(a.end,/[uismxfU]{0,7}/),contains:[d(a.end),c,s]}))},{
begin:"~R(?="+r+")",contains:t.map(a=>e.inherit(a,{
end:n.concat(a.end,/[uismxfU]{0,7}/),contains:[d(a.end)]}))}]},l={
className:"string",contains:[e.BACKSLASH_ESCAPE,s],variants:[{begin:/"""/,
end:/"""/},{begin:/'''/,end:/'''/},{begin:/~S"""/,end:/"""/,contains:[]},{
begin:/~S"/,end:/"/,contains:[]},{begin:/~S'''/,end:/'''/,contains:[]},{
begin:/~S'/,end:/'/,contains:[]},{begin:/'/,end:/'/},{begin:/"/,end:/"/}]},m={
className:"function",beginKeywords:"def defp defmacro defmacrop",end:/\B\b/,
contains:[e.inherit(e.TITLE_MODE,{begin:a,endsParent:!0})]},u=e.inherit(m,{
className:"class",beginKeywords:"defimpl defmodule defprotocol defrecord",
end:/\bdo\b|$|;/}),f=[{scope:"string",match:/\?'/,relevance:0
},l,g,b,o,e.HASH_COMMENT_MODE,u,m,{begin:"::"},{className:"symbol",
begin:":(?![\\s:])",contains:[l,{
begin:"[a-zA-Z_]\\w*[!?=]?|[-+~]@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?"
}],relevance:0},{className:"symbol",begin:a+":(?!:)",relevance:0},{
className:"title.class",begin:/(\b[A-Z][a-zA-Z0-9_]+)/,relevance:0},{
className:"number",
begin:"(\\b0o[0-7_]+)|(\\b0b[01_]+)|(\\b0x[0-9a-fA-F_]+)|(-?\\b[0-9][0-9_]*(\\.[0-9_]+([eE][-+]?[0-9]+)?)?)",
relevance:0},{className:"variable",begin:"(\\$\\W)|((\\$|@@?)(\\w+))"}]
;return s.contains=f,{name:"Elixir",aliases:["ex","exs"],keywords:i,contains:f}}
})();hljs.registerLanguage("elixir",e)})();
;
/*! `clojure` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const t="a-zA-Z_\\-!.?+*=<>&'",n="[#]?["+t+"]["+t+"0-9/;:$#]*",a="def defonce defprotocol defstruct defmulti defmethod defn- defn defmacro deftype defrecord",r={
$pattern:n,
built_in:a+" cond apply if-not if-let if not not= =|0 <|0 >|0 <=|0 >=|0 ==|0 +|0 /|0 *|0 -|0 rem quot neg? pos? delay? symbol? keyword? true? false? integer? empty? coll? list? set? ifn? fn? associative? sequential? sorted? counted? reversible? number? decimal? class? distinct? isa? float? rational? reduced? ratio? odd? even? char? seq? vector? string? map? nil? contains? zero? instance? not-every? not-any? libspec? -> ->> .. . inc compare do dotimes mapcat take remove take-while drop letfn drop-last take-last drop-while while intern condp case reduced cycle split-at split-with repeat replicate iterate range merge zipmap declare line-seq sort comparator sort-by dorun doall nthnext nthrest partition eval doseq await await-for let agent atom send send-off release-pending-sends add-watch mapv filterv remove-watch agent-error restart-agent set-error-handler error-handler set-error-mode! error-mode shutdown-agents quote var fn loop recur throw try monitor-enter monitor-exit macroexpand macroexpand-1 for dosync and or when when-not when-let comp juxt partial sequence memoize constantly complement identity assert peek pop doto proxy first rest cons cast coll last butlast sigs reify second ffirst fnext nfirst nnext meta with-meta ns in-ns create-ns import refer keys select-keys vals key val rseq name namespace promise into transient persistent! conj! assoc! dissoc! pop! disj! use class type num float double short byte boolean bigint biginteger bigdec print-method print-dup throw-if printf format load compile get-in update-in pr pr-on newline flush read slurp read-line subvec with-open memfn time re-find re-groups rand-int rand mod locking assert-valid-fdecl alias resolve ref deref refset swap! reset! set-validator! compare-and-set! alter-meta! reset-meta! commute get-validator alter ref-set ref-history-count ref-min-history ref-max-history ensure sync io! new next conj set! to-array future future-call into-array aset gen-class reduce map filter find empty hash-map hash-set sorted-map sorted-map-by sorted-set sorted-set-by vec vector seq flatten reverse assoc dissoc list disj get union difference intersection extend extend-type extend-protocol int nth delay count concat chunk chunk-buffer chunk-append chunk-first chunk-rest max min dec unchecked-inc-int unchecked-inc unchecked-dec-inc unchecked-dec unchecked-negate unchecked-add-int unchecked-add unchecked-subtract-int unchecked-subtract chunk-next chunk-cons chunked-seq? prn vary-meta lazy-seq spread list* str find-keyword keyword symbol gensym force rationalize"
},s={begin:n,relevance:0},o={scope:"number",relevance:0,variants:[{
match:/[-+]?0[xX][0-9a-fA-F]+N?/},{match:/[-+]?0[0-7]+N?/},{
match:/[-+]?[1-9][0-9]?[rR][0-9a-zA-Z]+N?/},{match:/[-+]?[0-9]+\/[0-9]+N?/},{
match:/[-+]?[0-9]+((\.[0-9]*([eE][+-]?[0-9]+)?M?)|([eE][+-]?[0-9]+M?|M))/},{
match:/[-+]?([1-9][0-9]*|0)N?/}]},c={scope:"character",variants:[{
match:/\\o[0-3]?[0-7]{1,2}/},{match:/\\u[0-9a-fA-F]{4}/},{
match:/\\(newline|space|tab|formfeed|backspace|return)/},{match:/\\\S/,
relevance:0}]},i={scope:"regex",begin:/#"/,end:/"/,contains:[e.BACKSLASH_ESCAPE]
},d=e.inherit(e.QUOTE_STRING_MODE,{illegal:null}),l={scope:"punctuation",
match:/,/,relevance:0},m=e.COMMENT(";","$",{relevance:0}),p={
className:"literal",begin:/\b(true|false|nil)\b/},u={
begin:"\\[|(#::?"+n+")?\\{",end:"[\\]\\}]",relevance:0},f={className:"symbol",
begin:"[:]{1,2}"+n},h={begin:"\\(",end:"\\)"},y={endsWithParent:!0,relevance:0
},g={keywords:r,className:"name",begin:n,relevance:0,starts:y
},b=[l,h,c,i,d,m,f,u,o,p,s],v={beginKeywords:a,keywords:{$pattern:n,keyword:a},
end:'(\\[|#|\\d|"|:|\\{|\\)|\\(|$)',contains:[{className:"title",begin:n,
relevance:0,excludeEnd:!0,endsParent:!0}].concat(b)}
;return h.contains=[v,g,y],y.contains=b,u.contains=b,{name:"Clojure",
aliases:["clj","edn"],illegal:/\S/,contains:[l,h,c,i,d,m,f,u,o,p]}}})()
;hljs.registerLanguage("clojure",e)})();
;
/*! `lisp` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const n="[a-zA-Z_\\-+\\*\\/<=>&#][a-zA-Z0-9_\\-+*\\/<=>&#!]*",a="\\|[^]*?\\|",i="(-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|-)?\\d+)?",s={
className:"literal",begin:"\\b(t{1}|nil)\\b"},l={className:"number",variants:[{
begin:i,relevance:0},{begin:"#(b|B)[0-1]+(/[0-1]+)?"},{
begin:"#(o|O)[0-7]+(/[0-7]+)?"},{begin:"#(x|X)[0-9a-fA-F]+(/[0-9a-fA-F]+)?"},{
begin:"#(c|C)\\("+i+" +"+i,end:"\\)"}]},b=e.inherit(e.QUOTE_STRING_MODE,{
illegal:null}),g=e.COMMENT(";","$",{relevance:0}),r={scope:"variable",
match:/\*[^\s()*]+\*/},t={className:"symbol",begin:"[:&]"+n},c={begin:n,
relevance:0},d={begin:a},o={contains:[l,b,r,t,{begin:"\\(",end:"\\)",
contains:["self",s,b,l,c]},c],variants:[{begin:"['`]\\(",end:"\\)"},{
begin:"\\(quote ",end:"\\)",keywords:{name:"quote"}},{begin:"'"+a}]},v={
variants:[{begin:"'"+n},{begin:"#'"+n+"(::"+n+")*"}]},m={begin:"\\(\\s*",
end:"\\)"},u={endsWithParent:!0,relevance:0};return m.contains=[{
className:"name",variants:[{begin:n,relevance:0},{begin:a}]
},u],u.contains=[o,v,m,s,l,b,g,r,t,d,c],{name:"Lisp",illegal:/\S/,
contains:[l,e.SHEBANG(),s,b,g,o,v,m,c]}}})();hljs.registerLanguage("lisp",e)
})();
;
/*! `scheme` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const t="[^\\(\\)\\[\\]\\{\\}\",'`;#|\\\\\\s]+",n="(-|\\+)?\\d+([./]\\d+)?",r={
$pattern:t,
built_in:"case-lambda call/cc class define-class exit-handler field import inherit init-field interface let*-values let-values let/ec mixin opt-lambda override protect provide public rename require require-for-syntax syntax syntax-case syntax-error unit/sig unless when with-syntax and begin call-with-current-continuation call-with-input-file call-with-output-file case cond define define-syntax delay do dynamic-wind else for-each if lambda let let* let-syntax letrec letrec-syntax map or syntax-rules ' * + , ,@ - ... / ; < <= = => > >= ` abs acos angle append apply asin assoc assq assv atan boolean? caar cadr call-with-input-file call-with-output-file call-with-values car cdddar cddddr cdr ceiling char->integer char-alphabetic? char-ci<=? char-ci<? char-ci=? char-ci>=? char-ci>? char-downcase char-lower-case? char-numeric? char-ready? char-upcase char-upper-case? char-whitespace? char<=? char<? char=? char>=? char>? char? close-input-port close-output-port complex? cons cos current-input-port current-output-port denominator display eof-object? eq? equal? eqv? eval even? exact->inexact exact? exp expt floor force gcd imag-part inexact->exact inexact? input-port? integer->char integer? interaction-environment lcm length list list->string list->vector list-ref list-tail list? load log magnitude make-polar make-rectangular make-string make-vector max member memq memv min modulo negative? newline not null-environment null? number->string number? numerator odd? open-input-file open-output-file output-port? pair? peek-char port? positive? procedure? quasiquote quote quotient rational? rationalize read read-char real-part real? remainder reverse round scheme-report-environment set! set-car! set-cdr! sin sqrt string string->list string->number string->symbol string-append string-ci<=? string-ci<? string-ci=? string-ci>=? string-ci>? string-copy string-fill! string-length string-ref string-set! string<=? string<? string=? string>=? string>? string? substring symbol->string symbol? tan transcript-off transcript-on truncate values vector vector->list vector-fill! vector-length vector-ref vector-set! with-input-from-file with-output-to-file write write-char zero?"
},a={className:"literal",begin:"(#t|#f|#\\\\"+t+"|#\\\\.)"},i={
className:"number",variants:[{begin:n,relevance:0},{begin:n+"[+\\-]"+n+"i",
relevance:0},{begin:"#b[0-1]+(/[0-1]+)?"},{begin:"#o[0-7]+(/[0-7]+)?"},{
begin:"#x[0-9a-f]+(/[0-9a-f]+)?"}]},c=e.QUOTE_STRING_MODE,s=[e.COMMENT(";","$",{
relevance:0}),e.COMMENT("#\\|","\\|#")],l={begin:t,relevance:0},o={
className:"symbol",begin:"'"+t},g={endsWithParent:!0,relevance:0},u={variants:[{
begin:/'/},{begin:"`"}],contains:[{begin:"\\(",end:"\\)",
contains:["self",a,c,i,l,o]}]},d={className:"name",relevance:0,begin:t,
keywords:r},p={variants:[{begin:"\\(",end:"\\)"},{begin:"\\[",end:"\\]"}],
contains:[{begin:/lambda/,endsWithParent:!0,returnBegin:!0,contains:[d,{
endsParent:!0,variants:[{begin:/\(/,end:/\)/},{begin:/\[/,end:/\]/}],
contains:[l]}]},d,g]};return g.contains=[a,i,c,l,o,u,p].concat(s),{
name:"Scheme",aliases:["scm"],illegal:/\S/,
contains:[e.SHEBANG(),i,c,o,u,p].concat(s)}}})()
;hljs.registerLanguage("scheme",e)})();
;
/*! `awk` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>({name:"Awk",keywords:{
keyword:"BEGIN END if else while do for in break continue delete next nextfile function func exit|10"
},contains:[{className:"variable",variants:[{begin:/\$[\w\d#@][\w\d_]*/},{
begin:/\$\{(.*?)\}/}]},{className:"string",contains:[e.BACKSLASH_ESCAPE],
variants:[{begin:/(u|b)?r?'''/,end:/'''/,relevance:10},{begin:/(u|b)?r?"""/,
end:/"""/,relevance:10},{begin:/(u|r|ur)'/,end:/'/,relevance:10},{
begin:/(u|r|ur)"/,end:/"/,relevance:10},{begin:/(b|br)'/,end:/'/},{
begin:/(b|br)"/,end:/"/},e.APOS_STRING_MODE,e.QUOTE_STRING_MODE]
},e.REGEXP_MODE,e.HASH_COMMENT_MODE,e.NUMBER_MODE]})})()
;hljs.registerLanguage("awk",e)})();
;
/*! `tcl` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>{
const a=e.regex,t=/[a-zA-Z_][a-zA-Z0-9_]*/,r={className:"number",
variants:[e.BINARY_NUMBER_MODE,e.C_NUMBER_MODE]};return{name:"Tcl",
aliases:["tk"],
keywords:["after","append","apply","array","auto_execok","auto_import","auto_load","auto_mkindex","auto_mkindex_old","auto_qualify","auto_reset","bgerror","binary","break","catch","cd","chan","clock","close","concat","continue","dde","dict","encoding","eof","error","eval","exec","exit","expr","fblocked","fconfigure","fcopy","file","fileevent","filename","flush","for","foreach","format","gets","glob","global","history","http","if","incr","info","interp","join","lappend|10","lassign|10","lindex|10","linsert|10","list","llength|10","load","lrange|10","lrepeat|10","lreplace|10","lreverse|10","lsearch|10","lset|10","lsort|10","mathfunc","mathop","memory","msgcat","namespace","open","package","parray","pid","pkg::create","pkg_mkIndex","platform","platform::shell","proc","puts","pwd","read","refchan","regexp","registry","regsub|10","rename","return","safe","scan","seek","set","socket","source","split","string","subst","switch","tcl_endOfWord","tcl_findLibrary","tcl_startOfNextWord","tcl_startOfPreviousWord","tcl_wordBreakAfter","tcl_wordBreakBefore","tcltest","tclvars","tell","time","tm","trace","unknown","unload","unset","update","uplevel","upvar","variable","vwait","while"],
contains:[e.COMMENT(";[ \\t]*#","$"),e.COMMENT("^[ \\t]*#","$"),{
beginKeywords:"proc",end:"[\\{]",excludeEnd:!0,contains:[{className:"title",
begin:"[ \\t\\n\\r]+(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*",end:"[ \\t\\n\\r]",
endsWithParent:!0,excludeEnd:!0}]},{className:"variable",variants:[{
begin:a.concat(/\$/,a.optional(/::/),t,"(::",t,")*")},{
begin:"\\$\\{(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*",end:"\\}",contains:[r]}]},{
className:"string",contains:[e.BACKSLASH_ESCAPE],
variants:[e.inherit(e.QUOTE_STRING_MODE,{illegal:null})]},r]}}})()
;hljs.registerLanguage("tcl",e)})();
;
/*! `vim` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>({name:"Vim Script",keywords:{
$pattern:/[!#@\w]+/,
keyword:"N|0 P|0 X|0 a|0 ab abc abo al am an|0 ar arga argd arge argdo argg argl argu as au aug aun b|0 bN ba bad bd be bel bf bl bm bn bo bp br brea breaka breakd breakl bro bufdo buffers bun bw c|0 cN cNf ca cabc caddb cad caddf cal cat cb cc ccl cd ce cex cf cfir cgetb cgete cg changes chd che checkt cl cla clo cm cmapc cme cn cnew cnf cno cnorea cnoreme co col colo com comc comp con conf cope cp cpf cq cr cs cst cu cuna cunme cw delm deb debugg delc delf dif diffg diffo diffp diffpu diffs diffthis dig di dl dell dj dli do doautoa dp dr ds dsp e|0 ea ec echoe echoh echom echon el elsei em en endfo endf endt endw ene ex exe exi exu f|0 files filet fin fina fini fir fix fo foldc foldd folddoc foldo for fu go gr grepa gu gv ha helpf helpg helpt hi hid his ia iabc if ij il im imapc ime ino inorea inoreme int is isp iu iuna iunme j|0 ju k|0 keepa kee keepj lN lNf l|0 lad laddb laddf la lan lat lb lc lch lcl lcs le lefta let lex lf lfir lgetb lgete lg lgr lgrepa lh ll lla lli lmak lm lmapc lne lnew lnf ln loadk lo loc lockv lol lope lp lpf lr ls lt lu lua luad luaf lv lvimgrepa lw m|0 ma mak map mapc marks mat me menut mes mk mks mksp mkv mkvie mod mz mzf nbc nb nbs new nm nmapc nme nn nnoreme noa no noh norea noreme norm nu nun nunme ol o|0 om omapc ome on ono onoreme opt ou ounme ow p|0 profd prof pro promptr pc ped pe perld po popu pp pre prev ps pt ptN ptf ptj ptl ptn ptp ptr pts pu pw py3 python3 py3d py3f py pyd pyf quita qa rec red redi redr redraws reg res ret retu rew ri rightb rub rubyd rubyf rund ru rv sN san sa sal sav sb sbN sba sbf sbl sbm sbn sbp sbr scrip scripte scs se setf setg setl sf sfir sh sim sig sil sl sla sm smap smapc sme sn sni sno snor snoreme sor so spelld spe spelli spellr spellu spellw sp spr sre st sta startg startr star stopi stj sts sun sunm sunme sus sv sw sy synti sync tN tabN tabc tabdo tabe tabf tabfir tabl tabm tabnew tabn tabo tabp tabr tabs tab ta tags tc tcld tclf te tf th tj tl tm tn to tp tr try ts tu u|0 undoj undol una unh unl unlo unm unme uns up ve verb vert vim vimgrepa vi viu vie vm vmapc vme vne vn vnoreme vs vu vunme windo w|0 wN wa wh wi winc winp wn wp wq wqa ws wu wv x|0 xa xmapc xm xme xn xnoreme xu xunme y|0 z|0 ~ Next Print append abbreviate abclear aboveleft all amenu anoremenu args argadd argdelete argedit argglobal arglocal argument ascii autocmd augroup aunmenu buffer bNext ball badd bdelete behave belowright bfirst blast bmodified bnext botright bprevious brewind break breakadd breakdel breaklist browse bunload bwipeout change cNext cNfile cabbrev cabclear caddbuffer caddexpr caddfile call catch cbuffer cclose center cexpr cfile cfirst cgetbuffer cgetexpr cgetfile chdir checkpath checktime clist clast close cmap cmapclear cmenu cnext cnewer cnfile cnoremap cnoreabbrev cnoremenu copy colder colorscheme command comclear compiler continue confirm copen cprevious cpfile cquit crewind cscope cstag cunmap cunabbrev cunmenu cwindow delete delmarks debug debuggreedy delcommand delfunction diffupdate diffget diffoff diffpatch diffput diffsplit digraphs display deletel djump dlist doautocmd doautoall deletep drop dsearch dsplit edit earlier echo echoerr echohl echomsg else elseif emenu endif endfor endfunction endtry endwhile enew execute exit exusage file filetype find finally finish first fixdel fold foldclose folddoopen folddoclosed foldopen function global goto grep grepadd gui gvim hardcopy help helpfind helpgrep helptags highlight hide history insert iabbrev iabclear ijump ilist imap imapclear imenu inoremap inoreabbrev inoremenu intro isearch isplit iunmap iunabbrev iunmenu join jumps keepalt keepmarks keepjumps lNext lNfile list laddexpr laddbuffer laddfile last language later lbuffer lcd lchdir lclose lcscope left leftabove lexpr lfile lfirst lgetbuffer lgetexpr lgetfile lgrep lgrepadd lhelpgrep llast llist lmake lmap lmapclear lnext lnewer lnfile lnoremap loadkeymap loadview lockmarks lockvar lolder lopen lprevious lpfile lrewind ltag lunmap luado luafile lvimgrep lvimgrepadd lwindow move mark make mapclear match menu menutranslate messages mkexrc mksession mkspell mkvimrc mkview mode mzscheme mzfile nbclose nbkey nbsart next nmap nmapclear nmenu nnoremap nnoremenu noautocmd noremap nohlsearch noreabbrev noremenu normal number nunmap nunmenu oldfiles open omap omapclear omenu only onoremap onoremenu options ounmap ounmenu ownsyntax print profdel profile promptfind promptrepl pclose pedit perl perldo pop popup ppop preserve previous psearch ptag ptNext ptfirst ptjump ptlast ptnext ptprevious ptrewind ptselect put pwd py3do py3file python pydo pyfile quit quitall qall read recover redo redir redraw redrawstatus registers resize retab return rewind right rightbelow ruby rubydo rubyfile rundo runtime rviminfo substitute sNext sandbox sargument sall saveas sbuffer sbNext sball sbfirst sblast sbmodified sbnext sbprevious sbrewind scriptnames scriptencoding scscope set setfiletype setglobal setlocal sfind sfirst shell simalt sign silent sleep slast smagic smapclear smenu snext sniff snomagic snoremap snoremenu sort source spelldump spellgood spellinfo spellrepall spellundo spellwrong split sprevious srewind stop stag startgreplace startreplace startinsert stopinsert stjump stselect sunhide sunmap sunmenu suspend sview swapname syntax syntime syncbind tNext tabNext tabclose tabedit tabfind tabfirst tablast tabmove tabnext tabonly tabprevious tabrewind tag tcl tcldo tclfile tearoff tfirst throw tjump tlast tmenu tnext topleft tprevious trewind tselect tunmenu undo undojoin undolist unabbreviate unhide unlet unlockvar unmap unmenu unsilent update vglobal version verbose vertical vimgrep vimgrepadd visual viusage view vmap vmapclear vmenu vnew vnoremap vnoremenu vsplit vunmap vunmenu write wNext wall while winsize wincmd winpos wnext wprevious wqall wsverb wundo wviminfo xit xall xmapclear xmap xmenu xnoremap xnoremenu xunmap xunmenu yank",
built_in:"synIDtrans atan2 range matcharg did_filetype asin feedkeys xor argv complete_check add getwinposx getqflist getwinposy screencol clearmatches empty extend getcmdpos mzeval garbagecollect setreg ceil sqrt diff_hlID inputsecret get getfperm getpid filewritable shiftwidth max sinh isdirectory synID system inputrestore winline atan visualmode inputlist tabpagewinnr round getregtype mapcheck hasmapto histdel argidx findfile sha256 exists toupper getcmdline taglist string getmatches bufnr strftime winwidth bufexists strtrans tabpagebuflist setcmdpos remote_read printf setloclist getpos getline bufwinnr float2nr len getcmdtype diff_filler luaeval resolve libcallnr foldclosedend reverse filter has_key bufname str2float strlen setline getcharmod setbufvar index searchpos shellescape undofile foldclosed setqflist buflisted strchars str2nr virtcol floor remove undotree remote_expr winheight gettabwinvar reltime cursor tabpagenr finddir localtime acos getloclist search tanh matchend rename gettabvar strdisplaywidth type abs py3eval setwinvar tolower wildmenumode log10 spellsuggest bufloaded synconcealed nextnonblank server2client complete settabwinvar executable input wincol setmatches getftype hlID inputsave searchpair or screenrow line settabvar histadd deepcopy strpart remote_peek and eval getftime submatch screenchar winsaveview matchadd mkdir screenattr getfontname libcall reltimestr getfsize winnr invert pow getbufline byte2line soundfold repeat fnameescape tagfiles sin strwidth spellbadword trunc maparg log lispindent hostname setpos globpath remote_foreground getchar synIDattr fnamemodify cscope_connection stridx winbufnr indent min complete_add nr2char searchpairpos inputdialog values matchlist items hlexists strridx browsedir expand fmod pathshorten line2byte argc count getwinvar glob foldtextresult getreg foreground cosh matchdelete has char2nr simplify histget searchdecl iconv winrestcmd pumvisible writefile foldlevel haslocaldir keys cos matchstr foldtext histnr tan tempname getcwd byteidx getbufvar islocked escape eventhandler remote_send serverlist winrestview synstack pyeval prevnonblank readfile cindent filereadable changenr exp"
},illegal:/;/,contains:[e.NUMBER_MODE,{className:"string",begin:"'",end:"'",
illegal:"\\n"},{className:"string",begin:/"(\\"|\n\\|[^"\n])*"/
},e.COMMENT('"',"$"),{className:"variable",begin:/[bwtglsav]:[\w\d_]+/},{
begin:[/\b(?:function|function!)/,/\s+/,e.IDENT_RE],className:{1:"keyword",
3:"title"},end:"$",relevance:0,contains:[{className:"params",begin:"\\(",
end:"\\)"}]},{className:"symbol",begin:/<[\w-]+>/}]})})()
;hljs.registerLanguage("vim",e)})();
;
/*! `glsl` grammar compiled for Highlight.js 11.12.0 */
(()=>{var e=(()=>{"use strict";return e=>({name:"GLSL",keywords:{
keyword:"break continue discard do else for if return while switch case default attribute binding buffer ccw centroid centroid varying coherent column_major const cw depth_any depth_greater depth_less depth_unchanged early_fragment_tests equal_spacing flat fractional_even_spacing fractional_odd_spacing highp in index inout invariant invocations isolines layout line_strip lines lines_adjacency local_size_x local_size_y local_size_z location lowp max_vertices mediump noperspective offset origin_upper_left out packed patch pixel_center_integer point_mode points precise precision quads r11f_g11f_b10f r16 r16_snorm r16f r16i r16ui r32f r32i r32ui r8 r8_snorm r8i r8ui readonly restrict rg16 rg16_snorm rg16f rg16i rg16ui rg32f rg32i rg32ui rg8 rg8_snorm rg8i rg8ui rgb10_a2 rgb10_a2ui rgba16 rgba16_snorm rgba16f rgba16i rgba16ui rgba32f rgba32i rgba32ui rgba8 rgba8_snorm rgba8i rgba8ui row_major sample shared smooth std140 std430 stream triangle_strip triangles triangles_adjacency uniform varying vertices volatile writeonly",
type:"atomic_uint bool bvec2 bvec3 bvec4 dmat2 dmat2x2 dmat2x3 dmat2x4 dmat3 dmat3x2 dmat3x3 dmat3x4 dmat4 dmat4x2 dmat4x3 dmat4x4 double dvec2 dvec3 dvec4 float iimage1D iimage1DArray iimage2D iimage2DArray iimage2DMS iimage2DMSArray iimage2DRect iimage3D iimageBuffer iimageCube iimageCubeArray image1D image1DArray image2D image2DArray image2DMS image2DMSArray image2DRect image3D imageBuffer imageCube imageCubeArray int isampler1D isampler1DArray isampler2D isampler2DArray isampler2DMS isampler2DMSArray isampler2DRect isampler3D isamplerBuffer isamplerCube isamplerCubeArray ivec2 ivec3 ivec4 mat2 mat2x2 mat2x3 mat2x4 mat3 mat3x2 mat3x3 mat3x4 mat4 mat4x2 mat4x3 mat4x4 sampler1D sampler1DArray sampler1DArrayShadow sampler1DShadow sampler2D sampler2DArray sampler2DArrayShadow sampler2DMS sampler2DMSArray sampler2DRect sampler2DRectShadow sampler2DShadow sampler3D samplerBuffer samplerCube samplerCubeArray samplerCubeArrayShadow samplerCubeShadow image1D uimage1DArray uimage2D uimage2DArray uimage2DMS uimage2DMSArray uimage2DRect uimage3D uimageBuffer uimageCube uimageCubeArray uint usampler1D usampler1DArray usampler2D usampler2DArray usampler2DMS usampler2DMSArray usampler2DRect usampler3D samplerBuffer usamplerCube usamplerCubeArray uvec2 uvec3 uvec4 vec2 vec3 vec4 void",
built_in:"gl_MaxAtomicCounterBindings gl_MaxAtomicCounterBufferSize gl_MaxClipDistances gl_MaxClipPlanes gl_MaxCombinedAtomicCounterBuffers gl_MaxCombinedAtomicCounters gl_MaxCombinedImageUniforms gl_MaxCombinedImageUnitsAndFragmentOutputs gl_MaxCombinedTextureImageUnits gl_MaxComputeAtomicCounterBuffers gl_MaxComputeAtomicCounters gl_MaxComputeImageUniforms gl_MaxComputeTextureImageUnits gl_MaxComputeUniformComponents gl_MaxComputeWorkGroupCount gl_MaxComputeWorkGroupSize gl_MaxDrawBuffers gl_MaxFragmentAtomicCounterBuffers gl_MaxFragmentAtomicCounters gl_MaxFragmentImageUniforms gl_MaxFragmentInputComponents gl_MaxFragmentInputVectors gl_MaxFragmentUniformComponents gl_MaxFragmentUniformVectors gl_MaxGeometryAtomicCounterBuffers gl_MaxGeometryAtomicCounters gl_MaxGeometryImageUniforms gl_MaxGeometryInputComponents gl_MaxGeometryOutputComponents gl_MaxGeometryOutputVertices gl_MaxGeometryTextureImageUnits gl_MaxGeometryTotalOutputComponents gl_MaxGeometryUniformComponents gl_MaxGeometryVaryingComponents gl_MaxImageSamples gl_MaxImageUnits gl_MaxLights gl_MaxPatchVertices gl_MaxProgramTexelOffset gl_MaxTessControlAtomicCounterBuffers gl_MaxTessControlAtomicCounters gl_MaxTessControlImageUniforms gl_MaxTessControlInputComponents gl_MaxTessControlOutputComponents gl_MaxTessControlTextureImageUnits gl_MaxTessControlTotalOutputComponents gl_MaxTessControlUniformComponents gl_MaxTessEvaluationAtomicCounterBuffers gl_MaxTessEvaluationAtomicCounters gl_MaxTessEvaluationImageUniforms gl_MaxTessEvaluationInputComponents gl_MaxTessEvaluationOutputComponents gl_MaxTessEvaluationTextureImageUnits gl_MaxTessEvaluationUniformComponents gl_MaxTessGenLevel gl_MaxTessPatchComponents gl_MaxTextureCoords gl_MaxTextureImageUnits gl_MaxTextureUnits gl_MaxVaryingComponents gl_MaxVaryingFloats gl_MaxVaryingVectors gl_MaxVertexAtomicCounterBuffers gl_MaxVertexAtomicCounters gl_MaxVertexAttribs gl_MaxVertexImageUniforms gl_MaxVertexOutputComponents gl_MaxVertexOutputVectors gl_MaxVertexTextureImageUnits gl_MaxVertexUniformComponents gl_MaxVertexUniformVectors gl_MaxViewports gl_MinProgramTexelOffset gl_BackColor gl_BackLightModelProduct gl_BackLightProduct gl_BackMaterial gl_BackSecondaryColor gl_ClipDistance gl_ClipPlane gl_ClipVertex gl_Color gl_DepthRange gl_EyePlaneQ gl_EyePlaneR gl_EyePlaneS gl_EyePlaneT gl_Fog gl_FogCoord gl_FogFragCoord gl_FragColor gl_FragCoord gl_FragData gl_FragDepth gl_FrontColor gl_FrontFacing gl_FrontLightModelProduct gl_FrontLightProduct gl_FrontMaterial gl_FrontSecondaryColor gl_GlobalInvocationID gl_InstanceID gl_InvocationID gl_Layer gl_LightModel gl_LightSource gl_LocalInvocationID gl_LocalInvocationIndex gl_ModelViewMatrix gl_ModelViewMatrixInverse gl_ModelViewMatrixInverseTranspose gl_ModelViewMatrixTranspose gl_ModelViewProjectionMatrix gl_ModelViewProjectionMatrixInverse gl_ModelViewProjectionMatrixInverseTranspose gl_ModelViewProjectionMatrixTranspose gl_MultiTexCoord0 gl_MultiTexCoord1 gl_MultiTexCoord2 gl_MultiTexCoord3 gl_MultiTexCoord4 gl_MultiTexCoord5 gl_MultiTexCoord6 gl_MultiTexCoord7 gl_Normal gl_NormalMatrix gl_NormalScale gl_NumSamples gl_NumWorkGroups gl_ObjectPlaneQ gl_ObjectPlaneR gl_ObjectPlaneS gl_ObjectPlaneT gl_PatchVerticesIn gl_Point gl_PointCoord gl_PointSize gl_Position gl_PrimitiveID gl_PrimitiveIDIn gl_ProjectionMatrix gl_ProjectionMatrixInverse gl_ProjectionMatrixInverseTranspose gl_ProjectionMatrixTranspose gl_SampleID gl_SampleMask gl_SampleMaskIn gl_SamplePosition gl_SecondaryColor gl_TessCoord gl_TessLevelInner gl_TessLevelOuter gl_TexCoord gl_TextureEnvColor gl_TextureMatrix gl_TextureMatrixInverse gl_TextureMatrixInverseTranspose gl_TextureMatrixTranspose gl_Vertex gl_VertexID gl_ViewportIndex gl_WorkGroupID gl_WorkGroupSize gl_in gl_out EmitStreamVertex EmitVertex EndPrimitive EndStreamPrimitive abs acos acosh all any asin asinh atan atanh atomicAdd atomicAnd atomicCompSwap atomicCounter atomicCounterDecrement atomicCounterIncrement atomicExchange atomicMax atomicMin atomicOr atomicXor barrier bitCount bitfieldExtract bitfieldInsert bitfieldReverse ceil clamp cos cosh cross dFdx dFdy degrees determinant distance dot equal exp exp2 faceforward findLSB findMSB floatBitsToInt floatBitsToUint floor fma fract frexp ftransform fwidth greaterThan greaterThanEqual groupMemoryBarrier imageAtomicAdd imageAtomicAnd imageAtomicCompSwap imageAtomicExchange imageAtomicMax imageAtomicMin imageAtomicOr imageAtomicXor imageLoad imageSize imageStore imulExtended intBitsToFloat interpolateAtCentroid interpolateAtOffset interpolateAtSample inverse inversesqrt isinf isnan ldexp length lessThan lessThanEqual log log2 matrixCompMult max memoryBarrier memoryBarrierAtomicCounter memoryBarrierBuffer memoryBarrierImage memoryBarrierShared min mix mod modf noise1 noise2 noise3 noise4 normalize not notEqual outerProduct packDouble2x32 packHalf2x16 packSnorm2x16 packSnorm4x8 packUnorm2x16 packUnorm4x8 pow radians reflect refract round roundEven shadow1D shadow1DLod shadow1DProj shadow1DProjLod shadow2D shadow2DLod shadow2DProj shadow2DProjLod sign sin sinh smoothstep sqrt step tan tanh texelFetch texelFetchOffset texture texture1D texture1DLod texture1DProj texture1DProjLod texture2D texture2DLod texture2DProj texture2DProjLod texture3D texture3DLod texture3DProj texture3DProjLod textureCube textureCubeLod textureGather textureGatherOffset textureGatherOffsets textureGrad textureGradOffset textureLod textureLodOffset textureOffset textureProj textureProjGrad textureProjGradOffset textureProjLod textureProjLodOffset textureProjOffset textureQueryLevels textureQueryLod textureSize transpose trunc uaddCarry uintBitsToFloat umulExtended unpackDouble2x32 unpackHalf2x16 unpackSnorm2x16 unpackSnorm4x8 unpackUnorm2x16 unpackUnorm4x8 usubBorrow",
literal:"true false"},illegal:'"',
contains:[e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE,e.C_NUMBER_MODE,{
className:"meta",begin:"#",end:"$"}]})})();hljs.registerLanguage("glsl",e)})();
