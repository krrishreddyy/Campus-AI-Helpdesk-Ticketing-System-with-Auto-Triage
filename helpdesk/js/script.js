/* Campus AI Helpdesk — demo frontend. Data is local; see TODO markers for servlet endpoints. */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const HR=36e5,page=document.body.dataset.page,qs=new URLSearchParams(location.search);
const store={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
/* ---- Auto-triage (rule based; mirror this logic in the Java servlet) ---- */
const KW={IT:{wifi:3,internet:3,laptop:2,software:2,vpn:2,printer:2},Hostel:{hostel:2,room:2,electricity:3,water:3,maintenance:2},Academics:{exam:3,attendance:3,marks:3,faculty:2,timetable:2},Finance:{fee:3,fees:3,payment:3,refund:3,invoice:3}};
const URG=['urgent','emergency','critical','immediately'],SLA={HIGH:4,MEDIUM:24,LOW:48};
function triage(text,cat){
  const w=text.toLowerCase().match(/[a-z]+/g)||[],sc={},hits=[];
  for(const d in KW)for(const k in KW[d])if(w.includes(k)){sc[d]=(sc[d]||0)+KW[d][k];hits.push([k,KW[d][k]])}
  URG.forEach(u=>w.includes(u)&&hits.push([u,4]));
  let dept=Object.keys(sc).sort((a,b)=>sc[b]-sc[a])[0]||(cat&&cat!=='General Support'?cat:'General');
  const t=hits.reduce((a,h)=>a+h[1],0),priority=t>=5?'HIGH':t>=3?'MEDIUM':'LOW';
  return{dept,priority,sla:SLA[priority],hits,rule:hits.length?'Rule Match':'Category Fallback'};
}
/* ---- Demo data ---- */
const ago=h=>Date.now()-h*HR;
const SEED=[
 {id:1024,student:'Rohan Reddy',subject:'Wi-Fi not working in hostel',desc:'The Wi-Fi connection in my hostel room has stopped working since this morning. Other rooms on the floor are affected too.',dept:'IT',pri:'HIGH',status:'OPEN',at:ago(.67),sla:4,hits:[['wifi',3],['internet',3],['hostel',2]],note:''},
 {id:1023,student:'Rohan Reddy',subject:'Fee payment issue',desc:'My semester fee payment was deducted but the portal still shows it as pending.',dept:'Finance',pri:'MEDIUM',status:'IN PROGRESS',at:ago(16),sla:24,hits:[['fee',3],['payment',3]],note:''},
 {id:1022,student:'Rohan Reddy',subject:'Attendance correction',desc:'My attendance for the 12 Sept lab was marked absent although I was present.',dept:'Academics',pri:'LOW',status:'RESOLVED',at:ago(50),sla:48,hits:[['attendance',3]],note:'Attendance updated by faculty.'},
 {id:1021,student:'Arjun',subject:'Laptop software issue',desc:'Licensed software on the lab laptop will not activate.',dept:'IT',pri:'MEDIUM',status:'IN PROGRESS',at:ago(16),sla:24,hits:[['laptop',2],['software',2]],note:''},
 {id:1020,student:'Meera S',subject:'Urgent: no water in hostel block C',desc:'There has been no water supply in block C since last night. Urgent maintenance needed.',dept:'Hostel',pri:'HIGH',status:'OPEN',at:ago(6.3),sla:4,hits:[['hostel',2],['water',3],['urgent',4]],note:''}];
let T=store.get('cah_t',null);if(!T){T=SEED;store.set('cah_t',T)}const save=()=>store.set('cah_t',T);
const fmtAgo=t=>{const h=(Date.now()-t)/HR;return h<1?Math.max(1,Math.round(h*60))+' min ago':h<24?'Today':h<48?'Yesterday':Math.floor(h/24)+' days ago'};
const fmtDate=t=>new Date(t).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),fmtTime=t=>new Date(t).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'});
const hm=ms=>{ms=Math.abs(ms);return String(Math.floor(ms/HR)).padStart(2,'0')+'h '+String(Math.floor(ms%HR/6e4)).padStart(2,'0')+'m'};
const left=t=>t.at+t.sla*HR-Date.now(),breached=t=>t.status!=='RESOLVED'&&left(t)<0;
const bd=(v,c)=>`<span class="badge ${(c||v).replace(' ','-')}">${v}</span>`;
const slaShort=t=>t.status==='RESOLVED'?'Met':breached(t)?`<span class="badge BREACHED">-${hm(left(t))}</span>`:hm(left(t));
function slaCard(t){
  if(t.status==='RESOLVED')return`<div class="card sla"><small>SLA</small><b>Met</b><div class="track"><div style="width:100%"></div></div><p>Resolved within SLA</p></div>`;
  const l=left(t);if(l<0)return`<div class="card sla bad"><small>SLA BREACHED</small><b>${hm(l)} overdue</b><div class="track"><div style="width:100%"></div></div><p><i class="fa-solid fa-triangle-exclamation"></i> Escalate this ticket</p></div>`;
  const p=Math.max(4,l/(t.sla*HR)*100);return`<div class="card sla ${p<25?'warn':''}"><small>SLA Remaining</small><b>${hm(l)}</b><div class="track"><div style="width:${p}%"></div></div><p>${p<25?'Close to deadline':'Within SLA'}</p></div>`;
}
function triageViz(r){
  const rows=r.hits.length?r.hits.map(h=>`<div><span>${h[0]}</span><b>+${h[1]}</b></div>`).join(''):'<div><span>no keyword match</span></div>';
  return`<div class="tri"><div class="n">TICKET TEXT</div><div class="ar">↓</div><div class="n">KEYWORD ANALYSIS</div><div class="ar">↓</div><div class="kw">${rows}</div><div class="ar">↓</div><div class="n">DEPARTMENT</div><div class="v">${r.dept}</div><div class="ar">↓</div><div class="n">PRIORITY</div><div class="v">${bd(r.priority)}</div><div class="ar">↓</div><div class="n">SLA</div><div class="v">${r.sla} HOURS</div></div>`;
}
/* ---- UI helpers ---- */
function toast(m){const e=document.createElement('div');e.className='toast';e.textContent=m;document.body.appendChild(e);setTimeout(()=>e.remove(),2400)}
function modal(h){const m=$('#modal');m.innerHTML=`<div class="mb" role="dialog">${h}</div>`;m.classList.add('on')}
function closeModal(){$('#modal').classList.remove('on')}
document.addEventListener('click',e=>{if(e.target.id==='modal')closeModal()});
document.addEventListener('keydown',e=>e.key==='Escape'&&closeModal());
const NOTES=[['fa-bolt','Ticket #1024 was auto-triaged to IT (HIGH).'],['fa-user-gear','Ticket #1023 is now In Progress.'],['fa-circle-check','Ticket #1022 was resolved.']];
function bell(){modal(`<h2 style="text-align:left">Notifications</h2>${NOTES.map(n=>`<div class="note"><i class="fa-solid ${n[0]}" style="color:var(--ind)"></i>${n[1]}</div>`).join('')}<button class="btn sm" style="margin-top:14px" onclick="closeModal()">Close</button>`);$('.top .ib em')?.remove()}
function table(cols,rows){return`<div class="card tw"><table class="rt"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td data-label="${cols[i]}">${c}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${cols.length}">No tickets match.</td></tr>`}</tbody></table></div>`}
const stud=()=>T.filter(t=>t.student==='Rohan Reddy');
function shell(){
  const staff=page.startsWith('staff'),nav=staff?[['staff-dashboard.html','fa-gauge','Dashboard'],['staff-dashboard.html?s=all','fa-ticket','All Tickets'],['staff-dashboard.html?s=OPEN','fa-inbox','Open'],['staff-dashboard.html?s=IN PROGRESS','fa-spinner','In Progress'],['staff-dashboard.html?s=RESOLVED','fa-circle-check','Resolved'],['staff-dashboard.html?s=BREACHED','fa-triangle-exclamation','SLA Breached']]:[['student-dashboard.html','fa-gauge','Dashboard'],['raise-ticket.html','fa-plus','Raise Ticket'],['my-tickets.html','fa-ticket','My Tickets'],['#n','fa-bell','Notifications'],['#p','fa-user','Profile']];
  const cur=location.pathname.split('/').pop()+(qs.get('s')&&staff?'?s='+qs.get('s'):'');
  $('#side').innerHTML=`<div class="logo"><i class="fa-solid fa-wand-magic-sparkles"></i>Campus AI</div>${nav.map(n=>`<a href="${n[0]}" class="${n[0]===cur||(n[0]==='staff-dashboard.html'&&cur==='staff-dashboard.html')?'on':''}" ${n[0][0]==='#'?`onclick="event.preventDefault();${n[0]==='#n'?'bell()':"toast('Profile is a placeholder in this demo')"}"`:''}><i class="fa-solid ${n[1]}"></i>${n[2]}</a>`).join('')}<a class="out" href="login.html"><i class="fa-solid fa-right-from-bracket"></i>Logout</a>`;
  $('#top').innerHTML=`<button class="ib" id="burger" aria-label="Menu" onclick="$('#side').classList.toggle('on')"><i class="fa-solid fa-bars"></i></button><h3 id="ttl"></h3><button class="ib" aria-label="Notifications" onclick="bell()"><i class="fa-regular fa-bell"></i><em></em></button><div class="av">${staff?'IT':'R'}</div>`;
}
const row=(t,staff)=>staff?[`<span class="id">#${t.id}</span>`,t.student,t.subject,bd(t.pri),bd(t.status),fmtTime(t.at),slaShort(t),`<a class="btn sm" href="staff-ticket-details.html?id=${t.id}">View</a>`]:[`<span class="id">#${t.id}</span>`,t.subject,t.dept,bd(t.pri),bd(t.status),fmtAgo(t.at),`<a class="btn sm" href="ticket-details.html?id=${t.id}">View</a>`];
const SC=['Ticket ID','Subject','Department','Priority','Status','Created','Action'],TC=['ID','Student','Issue','Priority','Status','Created','SLA','Action'];
/* ---- Pages ---- */
const P={
'student-dashboard'(){ // TODO: GET /student/tickets
  const s=stud(),c=k=>s.filter(t=>t.status===k).length;$('#ttl').textContent='Welcome back, Rohan 👋';
  $('#main').innerHTML=`<div class="hd"><div><h1>Dashboard</h1><p class="sub" style="margin:0">Your support activity at a glance.</p></div><a class="btn p" href="raise-ticket.html"><i class="fa-solid fa-plus"></i>Raise New Ticket</a></div>
  <div class="stats">${[['Total Tickets',s.length],['Open',c('OPEN')],['In Progress',c('IN PROGRESS')],['Resolved',c('RESOLVED')]].map(x=>`<div class="card stat"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div>
  <h3 style="margin-bottom:12px">Recent Tickets</h3>${table(SC,s.slice(0,5).map(t=>row(t)))}`},
'raise-ticket'(){ $('#ttl').textContent='Raise a Ticket';
  $('#main').innerHTML=`<h1>Raise a Support Ticket</h1><p class="sub">Describe the problem. We'll route it to the right team.</p><div class="two"><form class="card" id="f" novalidate>
  <label for="s">Subject</label><input id="s" placeholder="Wi-Fi is not working"><div class="err" id="es"></div>
  <label for="d">Description</label><textarea id="d" placeholder="Describe your problem..."></textarea><div class="err" id="ed"></div>
  <label for="c">Category</label><select id="c">${['General Support','IT','Hostel','Academics','Finance'].map(x=>`<option>${x}</option>`).join('')}</select>
  <label for="a">Attachment</label><input type="file" id="a"><br><br><button class="btn p">Submit Ticket</button></form>
  <div class="stack"><div class="card"><h3>AI Auto-Triage</h3><p class="sub" style="margin-top:-6px">Your ticket will automatically be analyzed.</p><ul class="info-list">${['Department detection','Priority detection','SLA assignment','Staff routing'].map(x=>`<li><i class="fa-solid fa-check"></i>${x}</li>`).join('')}</ul></div><div class="card" id="live"><h3>Live preview</h3><p class="sub">Start typing to see keyword analysis.</p></div></div></div>`;
  const run=()=>{const v=$('#s').value+' '+$('#d').value;if(v.trim())$('#live').innerHTML='<h3>Live preview</h3>'+triageViz(triage(v,$('#c').value))};
  ['s','d','c'].forEach(i=>$('#'+i).addEventListener('input',run));
  $('#f').onsubmit=e=>{e.preventDefault();const s=$('#s').value.trim(),d=$('#d').value.trim();$('#es').textContent=s.length<5?'Enter a subject (at least 5 characters).':'';$('#ed').textContent=d.length<15?'Describe the problem in at least 15 characters.':'';if(s.length<5||d.length<15)return;
    const r=triage(s+' '+d,$('#c').value),t={id:Math.max(...T.map(x=>x.id))+1,student:'Rohan Reddy',subject:s,desc:d,dept:r.dept,pri:r.priority,status:'OPEN',at:Date.now(),sla:r.sla,hits:r.hits,note:''};
    T.unshift(t);save(); // TODO: POST /student/create-ticket
    modal(`<div class="ok"><i class="fa-solid fa-check"></i></div><h2>Ticket Created Successfully</h2><div class="info card" style="box-shadow:none"><div><span>Ticket ID</span><b>#${t.id}</b></div><div><span>Department</span><b>${t.dept}</b></div><div><span>Priority</span>${bd(t.pri)}</div><div><span>SLA</span><b>${t.sla} Hours</b></div><div><span>Status</span>${bd('OPEN')}</div></div><a class="btn p" style="width:100%;justify-content:center;margin-top:16px" href="ticket-details.html?id=${t.id}">View Ticket</a>`)}},
'my-tickets'(){ $('#ttl').textContent='My Tickets';let f='All',q='';
  $('#main').innerHTML=`<h1>My Tickets</h1><p class="sub">Search and track every request.</p><div class="bar"><input id="q" placeholder="Search tickets..."><div class="chips">${['All','Open','In Progress','Resolved'].map(x=>`<button class="chip ${x==='All'?'on':''}">${x}</button>`).join('')}</div></div><div id="l"></div>`;
  const draw=()=>$('#l').innerHTML=table(SC,stud().filter(t=>(f==='All'||t.status===f.toUpperCase())&&(t.subject+t.id+t.dept).toLowerCase().includes(q)).map(t=>row(t)));
  $('#q').oninput=e=>{q=e.target.value.toLowerCase();draw()};$$('.chip').forEach(b=>b.onclick=()=>{f=b.textContent;$$('.chip').forEach(x=>x.classList.toggle('on',x===b));draw()});draw()},
'ticket-details'(){ const t=T.find(x=>x.id==qs.get('id'))||T[0]; // TODO: GET /student/ticket?id=1024
  $('#ttl').textContent='Ticket #'+t.id;
  $('#main').innerHTML=`<div class="hd"><div><h1>Ticket #${t.id}</h1><p class="sub" style="margin:0">${t.subject}</p></div><div>${bd(t.status)} ${bd(t.pri)}</div></div><div class="two"><div class="stack"><div class="card"><h3>Issue</h3><p><b>Subject:</b> ${t.subject}</p><p style="margin-top:8px;color:var(--ink2)">${t.desc}</p></div><div class="card"><h3>Timeline</h3>${tl(t)}</div><div class="card"><h3>Resolution Notes</h3><p style="color:var(--ink2)">${t.note||'Waiting for staff response...'}</p></div></div>
  <div class="stack"><div class="card info"><h3>Ticket Information</h3><div><span>Department</span><b>${t.dept}</b></div><div><span>Priority</span>${bd(t.pri)}</div><div><span>Created</span><b>${fmtDate(t.at)}</b></div><div><span>SLA</span><b>${t.sla} Hours</b></div></div>${slaCard(t)}</div></div>`},
'staff-dashboard'(){ $('#ttl').textContent='IT Support Dashboard';const s0=qs.get('s')||'';
  const c=k=>T.filter(t=>t.status===k).length;
  $('#main').innerHTML=`<h1>IT Support Dashboard</h1><p class="sub">Manage and resolve assigned tickets.</p><div class="stats">${[['Total Tickets',T.length+43],['Open',c('OPEN')+10],['In Progress',c('IN PROGRESS')+6],['Resolved',c('RESOLVED')+24],['SLA Breached',T.filter(breached).length,'red']].map(x=>`<div class="card stat ${x[2]||''}"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div>
  <div class="bar"><input id="q" placeholder="Search tickets..."><select id="fd"><option value="">All departments</option>${['IT','Hostel','Academics','Finance'].map(x=>`<option>${x}</option>`).join('')}</select><select id="fp"><option value="">All priorities</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select><select id="fs"><option value="">All statuses</option><option>OPEN</option><option>IN PROGRESS</option><option>RESOLVED</option></select><select id="fl"><option value="">All SLA</option><option value="ok">Within SLA</option><option value="BREACHED">Breached</option></select></div><div id="l"></div>`;
  if(['OPEN','IN PROGRESS','RESOLVED'].includes(s0))$('#fs').value=s0;if(s0==='BREACHED')$('#fl').value='BREACHED';
  const draw=()=>{const q=$('#q').value.toLowerCase(),d=$('#fd').value,p=$('#fp').value,s=$('#fs').value,l=$('#fl').value;
    $('#l').innerHTML=table(TC,T.filter(t=>(t.subject+t.student+t.id).toLowerCase().includes(q)&&(!d||t.dept===d)&&(!p||t.pri===p)&&(!s||t.status===s)&&(!l||(l==='BREACHED'?breached(t):!breached(t)))).map(t=>row(t,1)))}; // TODO: GET /staff/tickets
  $$('#main input,#main select').forEach(e=>e.oninput=draw);draw()},
'staff-ticket-details'(){ const t=T.find(x=>x.id==qs.get('id'))||T[0];$('#ttl').textContent='Ticket #'+t.id;
  $('#main').innerHTML=`<div class="hd"><div><h1>Ticket #${t.id}</h1><p class="sub" style="margin:0">Student: ${t.student}</p></div>${bd(t.status)}</div><div class="two"><div class="stack"><div class="card"><h3>${t.subject}</h3><p style="color:var(--ink2)">${t.desc}</p></div>
  <form class="card" id="u"><h3>Update status</h3><label for="st" style="margin-top:0">Change Status</label><select id="st">${['OPEN','IN PROGRESS','RESOLVED'].map(x=>`<option ${x===t.status?'selected':''}>${x}</option>`).join('')}</select><label for="n">Resolution note</label><textarea id="n" placeholder="Enter resolution details...">${t.note}</textarea><br><br><button class="btn p">Update Ticket</button></form></div>
  <div class="stack">${slaCard(t)}<div class="card"><h3>Auto-Triage Result</h3><div class="info"><div><span>Department</span><b>${t.dept}</b></div><div><span>Confidence</span><b>Rule Match</b></div><div><span>Priority</span>${bd(t.pri)}</div></div>${triageViz({hits:t.hits,dept:t.dept,priority:t.pri,sla:t.sla})}</div></div></div>`;
  $('#u').onsubmit=e=>{e.preventDefault();if($('#st').value==='RESOLVED'&&!$('#n').value.trim())return toast('Add a resolution note before resolving.');t.status=$('#st').value;t.note=$('#n').value;save();toast('Ticket updated');setTimeout(()=>location.reload(),700)}} // TODO: POST /staff/update-ticket
};
function tl(t){const o=['OPEN','IN PROGRESS','RESOLVED'],i=o.indexOf(t.status),at=t.at,st=[['Ticket Submitted',fmtTime(at),1],['Auto-Triaged',fmtTime(at),1],['Assigned to '+t.dept,fmtTime(at+6e4),1],['In Progress',i>0?'Updated':'Pending',i>0?(i>1?1:2):0],['Resolved',i>1?'Done':'Pending',i>1?1:0]];
  return`<ul class="tl">${st.map(s=>`<li class="${s[2]===1?'done':s[2]===2?'cur':''}"><i class="fa-solid ${s[2]===1?'fa-check':s[2]===2?'fa-circle':''}"></i><b>${s[0]}</b><small>${s[1]}</small></li>`).join('')}</ul>`}
if(P[page]){shell();P[page]()}
/* ---- Login ---- */
if(page==='login'){const f=$('#lf');f.onsubmit=e=>{e.preventDefault();const em=$('#em').value.trim(),pw=$('#pw').value;$('#ee').textContent=/^\S+@\S+\.\S+$/.test(em)?'':'Enter a valid email.';$('#pe').textContent=pw.length<3?'Enter your password.':'';if(!/^\S+@\S+\.\S+$/.test(em)||pw.length<3)return;
  sessionStorage.setItem('role',$('#role').value); // TODO: POST /login
  location.href=$('#role').value==='Staff'?'staff-dashboard.html':'student-dashboard.html'};
  $('#role').onchange=e=>{$('#em').value=e.target.value==='Staff'?'itstaff@campus.local':'student@campus.local'};$('#fp').onclick=e=>{e.preventDefault();toast('Password reset is a placeholder in this demo')}}
if(page==='home'){const h=$('#hm');h&&(h.onclick=()=>$('#nav').classList.toggle('on'))}
