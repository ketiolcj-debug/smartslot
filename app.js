const tg = window.Telegram?.WebApp;
if(tg){tg.ready();tg.expand();}

const state={cfg:null,me:null,betIndex:1,spinning:false,auto:false};
const $=id=>document.getElementById(id);
const emoji={seven:"7️⃣",dollar:"💲",bell:"🔔",melon:"🍉",grapes:"🍇",plum:"🫐",orange:"🍊",lemon:"🍋",cherry:"🍒"};

function initData(){return tg?.initData||""}
async function api(path,opts={}){
  const headers=Object.assign({"Content-Type":"application/json","X-Telegram-Init-Data":initData()},opts.headers||{});
  const r=await fetch(path,{...opts,headers});
  const data=await r.json().catch(()=>({error:"Invalid server response"}));
  if(!r.ok) throw new Error(data.error||"Request failed");
  return data;
}
function money(n){return Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
function toast(s){$("toast").textContent=s;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),2600)}
function msg(s,lose=false){$("message").textContent=s;$("message").classList.toggle("lose",lose)}
function renderMe(){
  const m=state.me;if(!m)return;
  $("balance").textContent=money(m.balance);$("currency").textContent=m.currency;
  const initial=(m.first_name||"S").trim()[0]?.toUpperCase()||"S";
  $("avatar").textContent=initial;$("bigAvatar").textContent=initial;
  $("profileName").textContent=m.first_name||"Player";
  $("profileUsername").textContent=m.username?"@"+m.username:"Telegram player";
  $("gamesPlayed").textContent=m.games_played;$("totalWon").textContent=money(m.total_won)+" "+m.currency;
  $("withdrawPhone").value=m.phone||"";
}
function renderBet(){
  const b=state.cfg.bets[state.betIndex];
  $("betLabel").textContent=money(b);$("spinBet").textContent=money(b);
  $("betPrev").textContent=money(state.cfg.bets[Math.max(0,state.betIndex-1)]);
  $("betNext").textContent=money(state.cfg.bets[Math.min(state.cfg.bets.length-1,state.betIndex+1)]);
}
function buildReels(){
  const wrap=$("reels");wrap.innerHTML="";
  for(let c=0;c<3;c++){const r=document.createElement("div");r.className="reel";for(let y=0;y<3;y++){const d=document.createElement("div");d.className="cell";d.textContent="•";r.appendChild(d)}wrap.appendChild(r)}
}
function showGrid(grid,winning){
  const cells=[...document.querySelectorAll(".cell")];
  grid.forEach((col,x)=>col.forEach((key,y)=>{cells[x*3+y].textContent=emoji[key]||"•";cells[x*3+y].classList.remove("win")}));
  winning.forEach(line=>{const coords=[[[0,0],[1,0],[2,0]],[[0,1],[1,1],[2,1]],[[0,2],[1,2],[2,2]],[[0,0],[1,1],[2,2]],[[0,2],[1,1],[2,0]]][line];coords.forEach(([x,y])=>cells[x*3+y].classList.add("win"))});
}
async function spin(){
  if(state.spinning)return;
  state.spinning=true;$("spinBtn").disabled=true;msg("Spinning…");
  const bet=state.cfg.bets[state.betIndex];
  try{
    const data=await api("/api/game/spin",{method:"POST",body:JSON.stringify({bet})});
    await new Promise(r=>setTimeout(r,500));
    showGrid(data.grid,data.winning_lines);
    $("multiplier").textContent=data.multiplier+"×";
    $("win").textContent=money(data.win);
    state.me.balance=data.balance;state.me.games_played++;state.me.total_won+=Number(data.win);renderMe();
    msg(data.win>0?`WIN ${money(data.win)} ETB!`:"No win — spin again.",data.win<=0);
  }catch(e){msg(e.message,true);toast(e.message)}
  finally{state.spinning=false;$("spinBtn").disabled=false;if(state.auto&&state.me.balance>=bet)setTimeout(spin,900)}
}
async function loadHistory(){
  try{
    const h=await api("/api/history");const list=$("historyList");list.innerHTML="";
    const items=[];
    h.deposits.forEach(x=>items.push({t:"Deposit",amount:x.amount,status:x.status,id:x.transaction_id,date:x.created_at}));
    h.withdrawals.forEach(x=>items.push({t:"Withdrawal",amount:x.amount,status:x.status,id:x.phone,date:x.created_at}));
    h.spins.forEach(x=>items.push({t:"Spin",amount:x.win,date:x.created_at,status:x.win>0?"win":"loss",id:"Bet "+money(x.bet)}));
    items.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    list.innerHTML=items.slice(0,60).map(x=>`<div class="history-item"><div><b>${x.t}</b><small>${x.id||""}</small><small>${new Date(x.date).toLocaleString()}</small></div><div><b>${money(x.amount)} ETB</b><div class="status ${x.status}">${x.status}</div></div></div>`).join("")||"<p class='muted'>No activity yet.</p>";
  }catch(e){toast(e.message)}
}
function setupTabs(){
  document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    document.querySelectorAll(".tab-panel").forEach(x=>x.classList.add("hidden"));
    $(b.dataset.tab+"Tab").classList.remove("hidden");
    if(b.dataset.tab==="history")loadHistory();
  });
}
async function boot(){
  try{
    if(!initData()){throw new Error("Open SmartSlot from Telegram, not from a normal browser.")}
    state.cfg=await api("/api/config");state.me=await api("/api/me");
    $("currency").textContent=state.cfg.currency;
    $("telebirrPhone").textContent=state.cfg.telebirr_phone;$("telebirrName").textContent=state.cfg.telebirr_name;
    $("payRows").innerHTML=state.cfg.symbols.slice().sort((a,b)=>b.value-a.value).map(s=>`<div class="payrow"><span>${emoji[s.key]} ${s.name}</span><b>${s.value}×</b></div>`).join("");
    buildReels();renderMe();renderBet();setupTabs();
  }catch(e){toast(e.message);msg(e.message,true)}
}
$("spinBtn").onclick=spin;
$("betDown").onclick=()=>{state.betIndex=Math.max(0,state.betIndex-1);renderBet()};
$("betUp").onclick=()=>{state.betIndex=Math.min(state.cfg.bets.length-1,state.betIndex+1);renderBet()};
$("betPrev").onclick=()=>{state.betIndex=Math.max(0,state.betIndex-1);renderBet()};
$("betNext").onclick=()=>{state.betIndex=Math.min(state.cfg.bets.length-1,state.betIndex+1);renderBet()};
$("autoBtn").onclick=()=>{state.auto=!state.auto;$("autoBtn").classList.toggle("active",state.auto);if(state.auto&&!state.spinning)spin()};
$("refreshBtn").onclick=async()=>{try{state.me=await api("/api/me");renderMe();toast("Balance refreshed")}catch(e){toast(e.message)}};
$("paytableBtn").onclick=()=>$("paytableModal").classList.remove("hidden");
$("closePay").onclick=()=>$("paytableModal").classList.add("hidden");

$("depositForm").onsubmit=async e=>{
  e.preventDefault();$("depositMsg").textContent="Submitting…";
  try{const d=await api("/api/deposit",{method:"POST",body:JSON.stringify({amount:$("depositAmount").value,transaction_id:$("transactionId").value.trim()})});$("depositMsg").textContent=d.message;$("depositForm").reset();loadHistory()}
  catch(err){$("depositMsg").textContent=err.message}
};
$("withdrawForm").onsubmit=async e=>{
  e.preventDefault();$("withdrawMsg").textContent="Submitting…";
  try{const d=await api("/api/withdraw",{method:"POST",body:JSON.stringify({amount:$("withdrawAmount").value,phone:$("withdrawPhone").value.trim()})});$("withdrawMsg").textContent=d.message;$("withdrawForm").reset();state.me=await api("/api/me");renderMe();loadHistory()}
  catch(err){$("withdrawMsg").textContent=err.message}
};

boot();
