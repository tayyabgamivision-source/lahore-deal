// Lahore Deal - multiplayer server (no dependencies). Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const PORT=process.env.PORT||3000;
const COL={brown:{n:'Brown',h:'#8d5a3b',s:2,v:1,r:[1,2]},lblue:{n:'Light Blue',h:'#7ccbf0',s:3,v:1,r:[1,2,3]},pink:{n:'Pink',h:'#e0669e',s:3,v:2,r:[1,2,4]},orange:{n:'Orange',h:'#f28c28',s:3,v:2,r:[1,3,5]},red:{n:'Red',h:'#d9352f',s:3,v:3,r:[2,3,6]},yellow:{n:'Yellow',h:'#f2d02b',s:3,v:3,r:[2,4,6]},green:{n:'Green',h:'#2e9c56',s:3,v:4,r:[2,4,7]},blue:{n:'Dark Blue',h:'#2748b8',s:2,v:4,r:[3,8]},rail:{n:'Railway',h:'#33333a',s:4,v:2,r:[1,2,3,4]},util:{n:'Utility',h:'#9bb59b',s:2,v:2,r:[1,2]}};
const NM={brown:['Anarkali','Bhati Gate'],lblue:['Mall Road','Liberty Market','Model Town'],pink:['Johar Town','Iqbal Town','Township'],orange:['Bahria Town','Wapda Town','Valencia'],red:['Gulberg','Garden Town','Cavalry Ground'],yellow:['Cantt','Askari 10','Sabzazar'],green:['DHA Phase 5','DHA Phase 6','DHA Phase 8'],blue:['Lahore Fort','Badshahi Mosque'],rail:['Lahore Junction','Badami Bagh','Walton Station','Raiwind Junction'],util:['WAPDA','SNGPL']};
const ALL=Object.keys(COL),rooms={};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=crypto.randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
function mkDeck(){let id=0;const d=[];const add=(o,k=1)=>{for(let i=0;i<k;i++)d.push({id:id++,...o})};
for(const c in COL)NM[c].forEach(n=>add({t:'prop',n,c,v:COL[c].v}));
[[1,6],[2,5],[3,3],[4,3],[5,2],[10,1]].forEach(([v,k])=>add({t:'money',n:v+'M',v},k));
[[['pink','orange'],2,2],[[ 'lblue','brown'],1,1],[['lblue','rail'],4,1],[['red','yellow'],3,2],[['green','blue'],4,1],[['green','rail'],4,1],[['util','rail'],2,1],[ALL,0,2]].forEach(([cs,v,k])=>add({t:'wild',n:'Wild',cs,c:cs[0],v},k));
[['brown','lblue'],['pink','orange'],['red','yellow'],['green','blue'],['rail','util']].forEach(cs=>add({t:'rent',n:'Rent',cs,v:1},2));
add({t:'rent',n:'Wild Rent',cs:ALL,v:3,wild:true},3);
[['Deal Breaker',5,2],['Just Say No',4,3],['Sly Deal',3,3],['Forced Deal',3,3],['Debt Collector',3,3],["It's My Birthday",2,3],['Double the Rent',1,2],['House',3,3],['Hotel',4,2],['Pass Go',1,10]].forEach(([n,v,k])=>add({t:'act',n,v},k));
return shuffle(d)}
const getP=(r,id)=>r.players.find(p=>p.id==id),log=(r,s)=>{r.log.push(s);if(r.log.length>60)r.log.shift()};
const full=(p,c)=>p.props[c].length>=COL[c].s,nsets=p=>ALL.filter(c=>full(p,c)).length;
const assets=p=>[...p.bank,...ALL.flatMap(c=>[...p.props[c],...p.ext[c]])];
const colOf=(p,id)=>ALL.find(c=>p.props[c].some(x=>x.id==id));
function rentOf(p,c){const n=Math.min(p.props[c].length,COL[c].s);if(!n)return 0;let v=COL[c].r[n-1];if(full(p,c)){if(p.ext[c].some(x=>x.n=='House'))v+=3;if(p.ext[c].some(x=>x.n=='Hotel'))v+=4}return v}
function draw(r,p,n){for(let i=0;i<n;i++){if(!r.deck.length){r.deck=shuffle(r.disc);r.disc=[]}if(r.deck.length)p.hand.push(r.deck.pop())}}
function startTurn(r){const p=r.players[r.turn];r.plays=3;r.discarding=false;draw(r,p,p.hand.length?2:5);log(r,`— ${p.name}'s turn —`)}
function take(p,id){let i=p.bank.findIndex(x=>x.id==id);if(i>=0)return{card:p.bank.splice(i,1)[0],z:'bank'};
for(const c of ALL){i=p.props[c].findIndex(x=>x.id==id);if(i>=0)return{card:p.props[c].splice(i,1)[0],z:'prop',c};i=p.ext[c].findIndex(x=>x.id==id);if(i>=0)return{card:p.ext[c].splice(i,1)[0],z:'ext',c}}return null}
function fix(p){for(const c of ALL)if(!full(p,c)&&p.ext[c].length){p.bank.push(...p.ext[c]);p.ext[c]=[]}}
function apply(r,q){const a=getP(r,q.actor),t=getP(r,q.cur);
if(q.kind=='pay'){if(!assets(t).length){log(r,`${t.name} has nothing to pay`);return true}q.stage='pay';q.wait=t.id;return false}
if(q.kind=='sly'){const x=take(t,q.their);if(x){a.props[x.c].push(x.card);fix(t);log(r,`${a.name} stole ${x.card.n} from ${t.name}`)}}
if(q.kind=='forced'){const x=take(t,q.their),y=take(a,q.mine);if(x&&y){a.props[x.c].push(x.card);t.props[y.c].push(y.card);fix(t);fix(a);log(r,`${a.name} swapped ${y.card.n} for ${t.name}'s ${x.card.n}`)}}
if(q.kind=='breaker'){a.props[q.color].push(...t.props[q.color]);t.props[q.color]=[];a.ext[q.color].push(...t.ext[q.color]);t.ext[q.color]=[];log(r,`${a.name} took ${t.name}'s ${COL[q.color].n} set!`)}
return true}
function step(r){const q=r.pend;if(!q)return;
for(;;){if(!q.cur){if(!q.targets.length){r.pend=null;return}q.cur=q.targets.shift();q.stage='resp';q.depth=0;q.acc=false}
if(q.stage=='resp'){const who=q.depth%2?q.actor:q.cur;
if(!q.acc&&getP(r,who).hand.some(c=>c.n=='Just Say No')){q.wait=who;return}
q.acc=false;
if(q.depth%2){log(r,`${getP(r,q.cur).name}'s Just Say No stands: ${q.name} cancelled`);q.cur=null;continue}
if(!apply(r,q))return;q.cur=null;continue}
return}}
function attack(r,p,c,kind,tg,extra){r.disc.push(c);r.pend={kind,actor:p.id,targets:tg.map(x=>x.id),cur:null,stage:'resp',depth:0,acc:false,name:c.n,...extra};log(r,`${p.name} played ${c.n}`);step(r)}
function next(r){r.turn=(r.turn+1)%r.players.length;startTurn(r)}
function act(r,p,b){const t=b.type;
if(t=='start'){if(r.st!='lobby'||r.host!=p.id||r.players.length<2)return'Need 2+ players';r.deck=mkDeck();r.disc=[];r.players.forEach(x=>draw(r,x,5));r.st='play';r.turn=0;startTurn(r);return}
if(r.st!='play')return'Game not running';
if(t=='jsn'||t=='accept'){const q=r.pend;if(!q||q.wait!=p.id||q.stage!='resp')return'Nothing to respond to';
if(t=='jsn'){const i=p.hand.findIndex(x=>x.n=='Just Say No');if(i<0)return'No card';r.disc.push(p.hand.splice(i,1)[0]);q.depth++;log(r,`${p.name} played Just Say No!`)}else q.acc=true;
step(r);return}
if(t=='pay'){const q=r.pend;if(!q||q.wait!=p.id||q.stage!='pay')return'Not paying';const ids=[...new Set(b.ids||[])],all=assets(p);
const sel=ids.map(i=>all.find(x=>x.id==i));if(sel.some(x=>!x))return'Bad card';const sum=sel.reduce((s,x)=>s+x.v,0);
if(sum<q.amt&&sel.length<all.length)return`Pay at least ${q.amt}M (or everything you have)`;
const a=getP(r,q.actor);sel.forEach(x=>{const o=take(p,x.id);if(o.z=='prop')a.props[o.c].push(o.card);else a.bank.push(o.card)});fix(p);
log(r,`${p.name} paid ${a.name} ${sum}M`);q.cur=null;q.stage='resp';step(r);return}
if(r.players[r.turn]!==p||r.pend)return'Not your turn';
if(t=='discard'){if(!r.discarding)return;const i=p.hand.findIndex(x=>x.id==b.id);if(i<0)return;r.disc.push(p.hand.splice(i,1)[0]);if(p.hand.length<=7)next(r);return}
if(t=='end'){if(r.discarding)return;if(p.hand.length>7)r.discarding=true;else next(r);return}
if(r.discarding)return'Discard first';
if(t=='flip'){const col=colOf(p,b.id);if(!col)return'No';const c=p.props[col].find(x=>x.id==b.id);if(c.t!='wild'||!c.cs.includes(b.color))return'No';p.props[col].splice(p.props[col].indexOf(c),1);c.c=b.color;p.props[b.color].push(c);fix(p);return}
if(t!='play'||r.plays<1)return'No plays left';
const c=p.hand.find(x=>x.id==b.id);if(!c)return'No card';
const use=()=>{p.hand.splice(p.hand.indexOf(c),1);r.plays--},others=r.players.filter(x=>x!==p),T=getP(r,b.target),okT=T&&T!==p;
if(b.mode=='bank'){if(c.t=='prop'||c.t=='wild')return'Properties cannot be banked';use();p.bank.push(c);log(r,`${p.name} banked a card (${c.v}M)`);return}
if(b.mode=='prop'){const ok=(c.t=='prop'&&b.color==c.c)||(c.t=='wild'&&c.cs.includes(b.color));if(!ok)return'Bad colour';use();c.c=b.color;p.props[b.color].push(c);log(r,`${p.name} played ${c.n} (${COL[b.color].n})`);return}
if(b.mode=='rent'){if(c.t!='rent'||!c.cs.includes(b.color)||!p.props[b.color].length)return'Bad rent';
const ds=(b.dbls||[]).map(i=>p.hand.find(x=>x.id==i&&x.n=='Double the Rent'));if(ds.some(x=>!x)||new Set(b.dbls).size!=ds.length||ds.length>r.plays-1)return'Bad doubles';
let tg=others;if(c.wild){if(!okT)return'Pick a player';tg=[T]}
use();ds.forEach(d=>{p.hand.splice(p.hand.indexOf(d),1);r.disc.push(d);r.plays--});
attack(r,p,c,'pay',tg,{amt:rentOf(p,b.color)*2**ds.length,text:`Rent on ${COL[b.color].n}`});return}
if(b.mode!='act'||c.t!='act')return'Bad play';const n=c.n;
if(n=='Pass Go'){use();r.disc.push(c);draw(r,p,2);log(r,`${p.name} played Pass Go`);return}
if(n=="It's My Birthday"){use();return attack(r,p,c,'pay',others,{amt:2,text:'Birthday gift'})}
if(n=='Debt Collector'){if(!okT)return'Pick a player';use();return attack(r,p,c,'pay',[T],{amt:5,text:'Debt'})}
if(n=='Sly Deal'){if(!okT)return'Pick a player';const k=colOf(T,b.their);if(!k||full(T,k))return'Bad property';const nm=T.props[k].find(x=>x.id==b.their).n;use();return attack(r,p,c,'sly',[T],{their:b.their,text:`They want your ${nm}`})}
if(n=='Forced Deal'){if(!okT)return'Pick a player';const k=colOf(T,b.their),m=colOf(p,b.mine);if(!k||full(T,k)||!m||full(p,m))return'Bad properties';
const nm=T.props[k].find(x=>x.id==b.their).n,mn=p.props[m].find(x=>x.id==b.mine).n;use();return attack(r,p,c,'forced',[T],{their:b.their,mine:b.mine,text:`They want to swap their ${mn} for your ${nm}`})}
if(n=='Deal Breaker'){if(!okT||!ALL.includes(b.color)||!full(T,b.color))return'Pick a full set';use();return attack(r,p,c,'breaker',[T],{color:b.color,text:`They want your whole ${COL[b.color].n} set`})}
if(n=='House'||n=='Hotel'){const k=b.color;if(!ALL.includes(k)||k=='rail'||k=='util'||!full(p,k))return'Needs a full set';const h=p.ext[k].some(x=>x.n=='House'),H=p.ext[k].some(x=>x.n=='Hotel');
if(n=='House'&&h||n=='Hotel'&&(!h||H))return'Not allowed here';use();p.ext[k].push(c);log(r,`${p.name} built a ${n} on ${COL[k].n}`);return}
return'Cannot play that'}
function view(r,pid){const me=getP(r,pid),q=r.pend;return{code:r.code,host:r.host,st:r.st,me:pid,hand:me?me.hand:[],deckN:r.deck.length,top:r.disc[r.disc.length-1]||null,turn:r.players[r.turn]&&r.players[r.turn].id,plays:r.plays,discarding:r.discarding,winner:r.winner,log:r.log.slice(-30),
pend:q&&{kind:q.kind,name:q.name,actor:q.actor,cur:q.cur,stage:q.stage,depth:q.depth,amt:q.amt,wait:q.wait,text:q.text},
players:r.players.map(p=>({id:p.id,name:p.name,hn:p.hand.length,bank:p.bank,props:p.props,ext:p.ext}))}}
function bcast(r){for(const [pid,res] of r.clients)res.write('data: '+JSON.stringify(view(r,pid))+'\n\n')}
const mkP=name=>({id:crypto.randomBytes(6).toString('hex'),name:String(name||'Player').slice(0,14),hand:[],bank:[],props:Object.fromEntries(ALL.map(c=>[c,[]])),ext:Object.fromEntries(ALL.map(c=>[c,[]]))});
const body=req=>new Promise(res=>{let s='';req.on('data',d=>s+=d);req.on('end',()=>{try{res(JSON.parse(s||'{}'))}catch{res({})}})});
http.createServer(async(req,res)=>{const u=new URL(req.url,'http://x'),json=(o,c=200)=>{res.writeHead(c,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
if(u.pathname=='/cfg')return json({COL,lan:Object.values(os.networkInterfaces()).flat().filter(l=>l.family=='IPv4'&&!l.internal).map(l=>l.address).sort((a,b)=>(b.startsWith('192.168')-a.startsWith('192.168'))||(b.startsWith('10.')-a.startsWith('10.')))});
if(u.pathname=='/events'){const r=rooms[u.searchParams.get('room')],pid=u.searchParams.get('pid');if(!r||!getP(r,pid)){res.writeHead(404);return res.end()}
res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache',Connection:'keep-alive'});r.clients.set(pid,res);res.write('data: '+JSON.stringify(view(r,pid))+'\n\n');
const ka=setInterval(()=>res.write(': ping\n\n'),20000);req.on('close',()=>{clearInterval(ka);if(r.clients.get(pid)===res)r.clients.delete(pid)});return}
if(req.method=='POST'){const b=await body(req);
if(u.pathname=='/create'){const code=Array.from({length:4},()=>'ABCDEFGHJKMNPQRSTUVWXYZ'[crypto.randomInt(23)]).join(''),p=mkP(b.name);rooms[code]={code,host:p.id,players:[p],st:'lobby',deck:[],disc:[],turn:0,plays:0,pend:null,log:[],clients:new Map(),winner:null};return json({pid:p.id,code})}
if(u.pathname=='/join'){const r=rooms[String(b.code||'').toUpperCase()];if(!r)return json({err:'Room not found'});if(r.st!='lobby')return json({err:'Game already started'});if(r.players.length>=5)return json({err:'Room is full (5 max)'});const p=mkP(b.name);r.players.push(p);bcast(r);return json({pid:p.id,code:r.code})}
if(u.pathname=='/act'){const r=rooms[b.room],p=r&&getP(r,b.pid);if(!p)return json({err:'Unknown player'});const e=act(r,p,b);
if(r.st=='play'&&!r.pend){const w=r.players.find(x=>nsets(x)>=3);if(w){r.st='over';r.winner=w.id;log(r,`${w.name} wins!`)}}
bcast(r);return json(e?{err:e}:{ok:1})}}
const f=path.join(__dirname,'index.html');if(u.pathname=='/'&&fs.existsSync(f)){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(f))}
res.writeHead(404);res.end('Not found')}).listen(PORT,'0.0.0.0',()=>{console.log(`\nLahore Deal running!\n  This PC:  http://localhost:${PORT}`);
for(const l of Object.values(os.networkInterfaces()).flat())if(l.family=='IPv4'&&!l.internal)console.log(`  Friends on same WiFi:  http://${l.address}:${PORT}`)});
