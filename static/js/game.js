const app=document.getElementById('app');
let aiPending=false;
let journalReturnPage='investigate';
let journalOverlayOpen=false;
let journalZoom=1;
let phoneOpen=false;
let phoneTab='messages';
const phoneReports=['forensic','trace','comparison','teapot'];
function phoneToggle(){phoneOpen=!phoneOpen;if(phoneOpen)journalOverlayOpen=false;render()}
function phoneClose(){phoneOpen=false;render()}
function phoneSwitch(tab){phoneTab=tab;render()}
function phoneCollect(id){phoneOpen=false;showEvidence(id)}
function phoneView(){
 const ready=state.labRequested;
 const messages=[['小檔','調查員，記得核對證詞與證物。有人說謊，不代表他就是兇手。'],['調查局鑑識組',ready?'茶杯檢驗資料已上傳，可在「鑑識報告」查看。':'尚未收到茶杯檢驗申請。取得書房茶杯後，可透過手機送出。']];
 return `<div class="phone-head"><span>● 調查局內部通訊</span><strong>CASE 001</strong></div><div class="phone-tabs"><button class="${phoneTab==='messages'?'selected':''}" onclick="phoneSwitch('messages')">聯絡夥伴</button><button class="${phoneTab==='reports'?'selected':''}" onclick="phoneSwitch('reports')">鑑識報告</button></div><div class="phone-body">${phoneTab==='messages'?`<h3>聯絡夥伴 · 小檔</h3>${messages.map(([who,msg])=>`<article class="phone-message"><b>${who}</b><p>${msg}</p></article>`).join('')}<button class="phone-action" onclick="requestLab()" ${!has('cup')||ready?'disabled':''}>${ready?'✓ 已提出茶杯鑑識申請':'申請茶杯鑑識'}</button><p class="phone-hint">${!has('cup')?'請先在書房登記死者的茶杯。':ready?'申請已送出，可切換至鑑識報告。':'申請後可直接在手機查看鑑識資料。'}</p>`:`<h3>調查局 · 鑑識資料庫</h3>${ready?phoneReports.map(id=>`<button class="phone-report" onclick="phoneCollect('${id}')"><span>${has(id)?'✓ 已登記':'＋ 待查閱'}</span><b>${evidence[id][0]}</b><small>點擊開啟資料並登記證物</small></button>`).join(''):'<p class="phone-empty">目前沒有可調閱的鑑識報告。請先取得茶杯並提出申請。</p>'}`}</div><div class="phone-foot">UNRESOLVED FILES · SECURE LINE</div>`;
}

function journalZoomChange(delta){journalZoom=Math.max(.7,Math.min(1.3,Math.round((journalZoom+delta)*10)/10));const book=document.querySelector('.journal-window-content > div');if(book)book.style.zoom=journalZoom;const label=document.getElementById('journal-zoom-label');if(label)label.textContent=Math.round(journalZoom*100)+'%';}
function journalClose(){journalOverlayOpen=false;render()}

let aiMode='unknown';
const evidence={cup:['死者的茶杯','書房','杯底有不尋常的沉積物，值得送驗。'],clock:['停止的時鐘','書房','時鐘停在21:10，但停止原因尚未確定。'],lock:['書房門鎖','書房','門鎖可由室內正常上鎖，沒有強行破壞痕跡。'],letter:['未完成的書信','書房','死者打算隔日向調查單位提交公司財務資料。'],divorce:['離婚協議','客廳','文件尚未簽署，顯示夫妻間存在財產爭議。'],corridor:['走廊出入紀錄','二樓走廊','紀錄顯示20:45美咲曾前往書房。'],tea:['紅茶準備紀錄','廚房','管家20:35將紅茶送到書房。'],storage:['茶杯保管紀錄','廚房','專用杯在20:20前曾由秘書領取整理。'],finance:['公司財務帳目','私人辦公室','公司資金出現多筆異常轉帳，經手者為高橋。'],diary:['秘書工作日誌','私人辦公室','20:20記載「整理董事長專用茶具」，與保管紀錄吻合。'],forensic:['鑑識報告','調查局系統','死者茶杯與檢體中發現相同的虛構有害物質；符合事先接觸茶杯的可能。'],records:['文件調閱紀錄','私人辦公室','死者當日查閱異常轉帳，準備隔日對外揭露。'],trace:['茶杯接觸鑑識紀錄','調查局系統','杯身有高橋的接觸痕跡；結合保管紀錄才能判斷接觸時間。'],vial:['抽屜中的封存試劑瓶','私人辦公室','在高橋專用抽屜中找到未標示用途的封存小瓶。發現位置與封存過程已記錄；內容物須經比對，不能只憑小瓶認定犯案。'],teapot:['茶壺與茶杯殘留分布報告','調查局系統','鑑識檢測茶壺內液體未發現 X-17；杯內壁局部沉積處檢出 X-17。這支持杯子可能在倒茶前已受污染，但不能單憑此報告排除送茶者接觸杯子的可能。'],doorhabit:['書房門內側使用痕跡與日常紀錄','書房','門內側的旋鈕留有近期正常操作痕跡，宅邸日常紀錄亦記載死者晚間習慣自行鎖書房。這支持自行上鎖的情境，但無法確證當晚操作人。'],comparison:['物質成分比對報告','調查局系統','鑑識將小瓶殘留物與茶杯、死者檢體比對，三者均檢出相同的虛構化合物 X-17，且伴隨一致的稀有雜質特徵。這強化了物質來源的關聯，但仍須結合時間、保管及其他證據判斷。']};
const scenes={'書房':['cup','clock','lock','doorhabit','letter'],'客廳':['divorce'],'二樓走廊':['corridor'],'廚房':['tea','storage'],'私人辦公室':['finance','diary','records','vial'],'調查局系統':['forensic','trace','comparison','teapot']};
// 固定座標依證物 ID，不受列表順序、鑑識解鎖或重新渲染影響。
const evidenceVisual={
 cup:['☕','物品','杯底有異常沉積'],clock:['◷','現場','停在 21:10'],lock:['▣','現場','門鎖未遭破壞'],letter:['✉','文件','準備揭露財務資料'],divorce:['✒','文件','離婚協議未簽'],corridor:['⇢','紀錄','20:45 有人經過'],tea:['☕','紀錄','20:35 送茶'],storage:['▤','紀錄','20:20 前曾領杯'],finance:['▥','文件','存在異常轉帳'],diary:['▧','文件','20:20 整理茶具'],forensic:['⚗','鑑識','杯與檢體有相同物質'],records:['▤','紀錄','死者曾調閱帳目'],trace:['◎','鑑識','杯身有接觸痕跡'],vial:['⚗','物品','私人抽屜發現小瓶'],teapot:['⚗','鑑識','壺陰性／杯陽性'],doorhabit:['▣','現場','有自行鎖門習慣'],comparison:['⚗','鑑識','三處成分特徵相符']};
let evidenceFilter='全部',evidenceDetailId=null;
function evidenceSetFilter(v){evidenceFilter=v;render()}
function evidenceOpen(id){if(has(id)){evidenceDetailId=id;render()}}
function evidenceClose(){evidenceDetailId=null;render()}
function evidenceAlbum(){
 const owned=state.found.filter(id=>evidence[id]);
 const categories=['全部','物品','現場','文件','紀錄','鑑識'];
 const visible=owned.filter(id=>evidenceFilter==='全部'||evidenceVisual[id][1]===evidenceFilter);
 const selected=evidenceDetailId&&owned.includes(evidenceDetailId)?evidenceDetailId:null;
 return `<section class="panel album-panel"><div class="album-head"><div><span class="eyebrow">CASE 001 / EVIDENCE ARCHIVE</span><h2>證據檔案</h2><p class="muted">先看卡片重點；需要時再展開完整紀錄。</p></div><div class="album-count">${owned.length} / ${Object.keys(evidence).length} 已收錄</div></div>
 <div class="album-filters" role="group" aria-label="證據類別">${categories.map(c=>`<button class="${evidenceFilter===c?'active':''}" aria-pressed="${evidenceFilter===c}" onclick="evidenceSetFilter('${c}')">${c}</button>`).join('')}</div>
 ${owned.length?`<div class="album-grid">${visible.map(id=>{const m=evidenceVisual[id];return `<button class="album-card" onclick="evidenceOpen('${id}')"><span class="album-illustration" aria-hidden="true">${m[0]}</span><span class="album-category">${m[1]} · ${evidence[id][1]}</span><strong>${evidence[id][0]}</strong><span class="album-finding">${m[2]}</span><span class="album-more">查看詳情 →</span></button>`}).join('')}</div>${visible.length?'':'<p class="album-empty">這個類別尚無證據。</p>'}`:`<div class="album-empty">尚未取得證據。<button onclick="go('investigate')">前往現場調查</button></div>`}
 <p class="muted album-note">卡片是摘要，不代表已經證明犯案。請透過訊問和推理交叉驗證。</p></section>
 ${selected?`<div class="overlay" onclick="evidenceClose()"><section class="evidence-modal album-detail" role="dialog" aria-modal="true" aria-label="證物詳情" onclick="event.stopPropagation()"><div class="modal-top"><span class="tag">${evidenceVisual[selected][1]} · ${evidence[selected][1]}</span><button onclick="evidenceClose()" aria-label="關閉">✕</button></div><div class="album-detail-icon" aria-hidden="true">${evidenceVisual[selected][0]}</div><h2>${evidence[selected][0]}</h2><div class="album-highlight"><small>調查重點</small><strong>${evidenceVisual[selected][2]}</strong></div><details class="album-full-text"><summary>展開完整調查紀錄</summary><p>${escapeHtml(evidence[selected][2])}</p></details><div class="album-actions"><button onclick="evidenceClose()">返回卡片</button><button onclick="evidenceClose();go('deduction')">前往推理分析 →</button></div></section></div>`:''}`;
}
const evidencePositions={'cup': [29, 74], 'clock': [69, 30], 'lock': [84, 57], 'doorhabit': [79, 78], 'letter': [47, 54], 'divorce': [48, 64], 'corridor': [52, 56], 'tea': [32, 66], 'storage': [72, 64], 'finance': [29, 69], 'diary': [54, 52], 'records': [73, 70], 'vial': [80, 33], 'forensic': [25, 44], 'trace': [72, 43], 'comparison': [31, 77], 'teapot': [72, 77]};
const people={'白石美咲':'我晚上八點後就一直待在房間，沒有再見過丈夫。','白石悠真':'我在客廳處理自己的事情，沒有進過父親的書房。','高橋修司':'九點之後，我沒有再進入書房。','佐藤千尋':'我在八點三十五分把紅茶送到書房，之後就回廚房工作。'};
// 固定證詞是劇情可驗證的內容；AI 回答只供自由對話，不可當成正式反駁對象。
const statementRules={
 '白石美咲':{id:'misaki_alibi',text:people['白石美咲'],label:'最初證詞 · 八點後未離房'},
 '高橋修司':{id:'takahashi_cup',text:'我確實協助整理過茶具，但那是九點之前的工作。',label:'固定話題 · 紅茶與茶杯'},
 '佐藤千尋':{id:'chihiro_tea',text:people['佐藤千尋'],label:'最初證詞 · 送茶過程'}
};
const initial=()=>({page:'home',name:'調查員',found:[],flags:[],scene:'書房',person:'白石美咲',dialog:'',step:0,answers:{},selected:null,modal:null,questionEvidence:'',questionText:'',labRequested:false,history:{},activeHint:0,deductionTopic:null,deductionStep:0,deductionChoice:'',deductionFeedback:'',deductionCompleted:[],interrogateTab:'topics',selectedTestimony:null,interrogateFeedback:'',interrogateBusy:false,serverDeductions:{},serverReady:false,confrontationStep:0,confrontationDone:false});
let state=initial();
try {const saved=JSON.parse(localStorage.getItem('unresolved_case_v14'));if(saved&&Array.isArray(saved.found)&&Array.isArray(saved.flags))state={...initial(),...saved,modal:null,selectedTestimony:null};}catch(e){}
function logDialogue(person,question,response){if(!state.history)state.history={};if(!state.history[person])state.history[person]=[];state.history[person].push({question,response});state.history[person]=state.history[person].slice(-30)}
function save(){try{localStorage.setItem('unresolved_case_v14',JSON.stringify({...state,modal:null}));}catch(e){}}
function closeModal(){state.modal=null;render()}
function showEvidence(id){state.selected=id;state.modal=id;render()}
let progressQueue=Promise.resolve();
function progressEvent(action,extra={}){progressQueue=progressQueue.catch(()=>{}).then(async()=>{const r=await fetch('/api/progress',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});const data=await r.json();if(!r.ok)throw Error(data.error||'伺服器進度同步失敗');return data;});return progressQueue;}
async function syncProgress(){try{await progressQueue.catch(()=>{});const r=await fetch('/api/progress');if(!r.ok)throw Error();const p=await r.json();state.found=Array.isArray(p.found)?p.found:[];state.labRequested=!!p.lab;if(p.scene&&scenes[p.scene])state.scene=p.scene;state.serverDeductions=p.deductions||{};state.deductionCompleted=Object.keys(state.serverDeductions).filter(k=>state.serverDeductions[k]===3);state.flags=state.flags.filter(k=>!['lie','room','motive','opportunity','misaki','takahashi'].includes(k));state.flags.push(...state.deductionCompleted);if((p.challenges||[]).includes('白石美咲'))state.flags.push('misaki');if((p.challenges||[]).includes('高橋修司'))state.flags.push('takahashi');if((p.challenges||[]).includes('佐藤千尋'))state.flags.push('chihiro');render();if(!p.scene)await move(state.scene);}catch(e){state.dialog='無法讀取伺服器進度，請確認 Flask 正在執行。';render();}}

async function registerEvidence(id){if(['forensic','trace','comparison','teapot'].includes(id)&&(!state.labRequested||!has('cup')||(id==='comparison'&&!has('vial'))))return;if(!has(id)){try{await progressEvent(['forensic','trace','comparison','teapot'].includes(id)?'collect_lab':'collect',{id});state.found.push(id)}catch(e){state.dialog=e.message;render();return;}}state.modal=null;state.dialog='已登記：'+evidence[id][0];render()}
function chooseEvidence(id){state.questionEvidence=id;state.interrogateFeedback='';render()}
async function evidenceChallenge(){
 const id=state.questionEvidence,p=state.person;
 if(!id){state.interrogateFeedback='請先從已取得的證物中選擇一件。';render();return;}
 const rule=statementRules[p];
 const validStatement=rule&&state.selectedTestimony===rule.id;
 const quoted=validStatement?rule.text:'';
 if(!validStatement){state.interrogateFeedback='請先到「證詞紀錄」選擇可核對的固定證詞。AI 自由對話與其他普通發言不能直接解鎖劇情。';render();return;}
 const prompt=(quoted?'反駁證詞「'+quoted.slice(0,65)+'」；':'')+'出示證據：'+evidence[id][0];
 let response='',unlock='';
 if(p==='白石美咲'&&['corridor','divorce'].includes(id)&&has('corridor')&&has('divorce')){
  response='……我承認，20:45我去過書房，為的是離婚協議。我不想讓別人知道，但我離開時他還活著。';unlock='misaki';
 }else if(p==='高橋修司'&&['storage','diary','trace','vial','comparison','teapot'].includes(id)&&has('storage')&&has('diary')&&has('trace')&&has('vial')&&has('comparison')&&has('teapot')){
  response='我確實在20:20整理過那只杯子……至於抽屜裡的瓶子為何和茶杯檢出同樣的物質，我需要先看完整的檢驗紀錄。';unlock='takahashi';
 }else if(p==='佐藤千尋'&&['teapot','tea','storage'].includes(id)&&has('teapot')&&has('tea')&&has('storage')){
  response='我在20:35把托盤送進書房。茶壺裡沒有檢出那種物質，這只能說明茶壺本身沒有被檢出，不能證明我完全沒碰過杯子。杯子在我準備茶之前，就由秘書整理過。';unlock='chihiro';
 }else response='這份資料並不能直接反駁我的說法。你還有其他問題嗎？';
 if(unlock){try{await progressEvent('challenge',{person:p,proof:id,statement_id:rule.id});addflag(unlock)}catch(e){state.interrogateFeedback='伺服器未能確認質問進度，請重試。';render();return;}}
 logDialogue(p,prompt,response);state.selectedTestimony=null;state.dialog='';state.interrogateFeedback=unlock?'新證詞已收錄。可在證詞紀錄中查看，並返回推理分析核對。':'目前尚未形成有效反駁。請留意證物與證詞之間的關聯。';
 render();
}
function interrogateSelect(p){state.person=p;state.selectedTestimony=null;state.questionEvidence='';state.interrogateFeedback='';render()}
function interrogateTab(tab){state.interrogateTab=tab;state.interrogateFeedback='';render()}
function selectTestimony(index){
 const p=state.person;
 if(!statementRules[p]||index!==statementRules[p].id)return;
 state.selectedTestimony=index;
 state.interrogateTab='proof';
 state.interrogateFeedback='已選取證詞。請從已取得的證物中選擇反駁依據；只有與案件矛盾相關的證據才能解鎖新證詞。';
 render();
}
function returnToTestimony(){state.interrogateTab='history';render()}

function openDeductionFromInterrogate(){state.page='deduction';state.deductionTopic=state.person==='白石美咲'?'lie':state.person==='高橋修司'||state.person==='佐藤千尋'?'opportunity':null;state.interrogateFeedback='';render()}
async function freeAsk(){
 const input=document.getElementById('freeQuestion');const v=input?.value.trim();if(!v||aiPending)return;
 if(v.length>300){state.dialog='問題最多300字。';render();return;}
 const person=state.person;
 aiPending=true;input.disabled=true;const sendButton=document.getElementById('aiSend');if(sendButton)sendButton.disabled=true;state.interrogateBusy=true;state.interrogateFeedback='正在等待 AI 回應……';
 try{
  await progressQueue.catch(()=>{});
  const res=await fetch('/api/interrogate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({person,question:v})});
  const data=await res.json();
  if(!res.ok)throw Error(data.error||'詢問失敗');
  logDialogue(person,v,data.answer);aiMode=data.mode||'ai';state.interrogateFeedback=data.mode==='scripted'?(data.notice||'目前使用預設劇情回答（非即時 AI）。'):'';
 }catch(e){state.interrogateFeedback=e.message+'（可改用固定話題繼續遊戲）';}
 aiPending=false;state.interrogateBusy=false;render();
}

const has=id=>state.found.includes(id),flag=id=>state.flags.includes(id),addflag=id=>{if(!flag(id))state.flags.push(id)},btn=(label,action)=>`<button onclick="${action}">${label}</button>`;
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
// V22: 手札與玩家自由筆記獨立存放，避免任何 HTML 注入或劇情解鎖。
let journalTab='people', journalPerson='白石美咲', journalPair=[];
const journalKey='unresolved_case_case001_journal_v22';
let journalData={notes:'',links:[]};
try {const raw=JSON.parse(localStorage.getItem(journalKey));if(raw&&typeof raw.notes==='string'&&Array.isArray(raw.links))journalData={notes:raw.notes.slice(0,12000),links:raw.links.filter(v=>typeof v==='string')};}catch(e){}
function journalSave(){try{localStorage.setItem(journalKey,JSON.stringify(journalData));}catch(e){}}
function journalReset(){journalData={notes:'',links:[]};journalTab='people';journalPair=[];try{localStorage.removeItem(journalKey)}catch(e){}}
function journalSwitch(tab){journalTab=tab;journalPair=[];render()}
function journalChoosePerson(name){journalPerson=name;render()}
function journalType(value){journalData.notes=String(value).slice(0,12000);journalSave();const indicator=document.getElementById('journal-saved');if(indicator)indicator.textContent='✓ 已儲存於這台裝置';}
const journalLinks=[
 ['corridor','divorce','行蹤紀錄與離婚協議：有人隱瞞了會面，但仍需核對死亡時間。'],
 ['cup','teapot','茶杯與茶壺：兩者檢測結果不同，值得確認污染發生的環節。'],
 ['storage','diary','茶杯保管與工作日誌：兩份紀錄可以交叉核對整理茶具的時間。'],
 ['finance','records','財務帳目與調閱紀錄：死者正在追查公司資金問題。'],
 ['vial','comparison','封存小瓶與比對報告：物質相符，但不能單憑此點定罪。'],
 ['lock','doorhabit','門鎖與生活習慣：自行鎖門是一種可能，並非當晚的直接目擊。']
];
function journalPairClick(id){if(!has(id))return;if(journalPair.includes(id))journalPair=journalPair.filter(x=>x!==id);else journalPair=[...journalPair.slice(-1),id];render()}
function journalConnect(){if(journalPair.length!==2)return;const found=journalLinks.find(([a,b])=>journalPair.includes(a)&&journalPair.includes(b));if(found&&!journalData.links.includes(found[0]+'|'+found[1]))journalData.links.push(found[0]+'|'+found[1]);journalSave();journalPair=[];render()}
const journalEvents=[
 ['20:20','秘書工作日誌記載整理茶具','diary','紀錄'],
 ['20:35','管家送茶至書房','tea','紀錄'],
 ['20:45','走廊出入紀錄顯示美咲前往書房','corridor','紀錄'],
 ['21:10','時鐘指針停止，原因尚未確定','clock','待查'],
 ['22:15','死者被發現於上鎖書房',null,'已知案情']
];
const journalPersonData={
 '白石美咲':['妻子','婚姻與財產關係','misaki','對八點後的行蹤提出明確說法。'],
 '白石悠真':['兒子','家庭關係','none','表示案發當晚待在客廳。'],
 '高橋修司':['私人秘書','公司財務與茶具保管','takahashi','表示九點後未進書房；這不等於否認更早接觸茶杯。'],
 '佐藤千尋':['管家','茶具準備與送茶','chihiro','表示在 20:35 送茶。']
};
function journalView(){
 const tabs=[['people','人物檔案'],['timeline','事件時間線'],['links','線索關聯'],['notes','我的筆記']];
 const acquired=state.found.filter(id=>evidence[id]);
 const pagePeople=`<div class="journal-person-tabs">${Object.keys(journalPersonData).map(p=>`<button class="${p===journalPerson?'current':''}" onclick="journalChoosePerson('${p}')">${p}</button>`).join('')}</div><div class="journal-dossier"><div class="journal-portrait" data-person="${journalPerson}"><div class="portrait-initial">${journalPerson.slice(-2)}</div><span>PERSONNEL FILE</span></div><div class="journal-profile"><span class="journal-stamp">人物調查卡</span><h3>${journalPerson}</h3><p>${journalPersonData[journalPerson][0]}</p><p><b>調查方向：</b>${journalPersonData[journalPerson][1]}</p><p>${journalPersonData[journalPerson][3]}</p>${flag(journalPersonData[journalPerson][2])?'<span class="journal-mark">✓ 已完成關鍵質問</span>':'<span class="journal-unconfirmed">尚未完成關鍵質問</span>'}</div></div><div class="journal-paper-note"><b>已收錄的相關資料</b><div class="journal-chip-row">${acquired.filter(id=>({ '白石美咲':['divorce','corridor'],'白石悠真':[],'高橋修司':['finance','records','diary','storage','trace','vial','comparison'],'佐藤千尋':['tea','teapot','storage']}[journalPerson]||[]).includes(id)).map(id=>`<span class="journal-chip">${escapeHtml(evidence[id][0])}</span>`).join('')||'<span class="journal-muted">尚未取得與此人直接相關的證物。</span>'}</div></div>`;
 const pageTimeline=`<div class="journal-timeline">${journalEvents.filter(e=>!e[2]||has(e[2])).map(([time,label,id,status])=>`<div class="journal-time-entry"><span class="journal-time">${time}</span><div><b>${escapeHtml(label)}</b><small>${status}${id?' · '+evidence[id][1]:''}</small></div></div>`).join('')}</div><p class="journal-caution">時間線只整理目前已知的事件與紀錄；時鐘停止時間不等於死亡時間。</p>`;
 const linksFound=journalLinks.filter(([a,b])=>journalData.links.includes(a+'|'+b)&&has(a)&&has(b));
 const match=journalPair.length===2?journalLinks.find(([a,b])=>journalPair.includes(a)&&journalPair.includes(b)):null;
 const pageLinks=`<p class="journal-instruction">點選兩張已取得的證物卡，嘗試建立關聯。關聯不代表定罪。</p><div class="journal-clue-grid">${acquired.map(id=>`<button class="journal-clue ${journalPair.includes(id)?'chosen':''}" aria-pressed="${journalPair.includes(id)}" onclick="journalPairClick('${id}')"><span>${evidenceVisual[id][0]}</span><b>${escapeHtml(evidence[id][0])}</b></button>`).join('')||'<p>先到現場蒐集證物，再回來建立關聯。</p>'}</div><div class="journal-link-controls"><span>${journalPair.length?journalPair.map(id=>evidence[id][0]).join(' ＋ '):'尚未選取證物'}</span><button onclick="journalConnect()" ${!match?'disabled':''}>${match?'建立關聯':'選擇可關聯的兩件證物'}</button></div>${journalPair.length===2&&!match?'<p class="journal-caution">目前沒有可確認的預設關聯；可以換一組證物。</p>':''}<div class="journal-connected"><h3>已建立的關聯</h3>${linksFound.map(([a,b,desc])=>`<div class="journal-string"><span>${evidence[a][0]}</span><i>⟷</i><span>${evidence[b][0]}</span><p>${desc}</p></div>`).join('')||'<p class="journal-muted">還沒有建立關聯。</p>'}</div>`;
 const pageNotes=`<div class="journal-notes"><label for="journal-text">我的調查紀錄</label><p>這一頁由你自己決定要寫什麼；不會自動生成結論，也不會被 AI 修改。</p><textarea id="journal-text" maxlength="12000" placeholder="例如：我懷疑某人的時間線有問題……" oninput="journalType(this.value)">${escapeHtml(journalData.notes)}</textarea><span id="journal-saved">✓ 內容會自動儲存於這台裝置</span></div>`;
 const content={people:pagePeople,timeline:pageTimeline,links:pageLinks,notes:pageNotes};
 return `<section class="journal-shell"><header class="journal-top"><div><span>UNRESOLVED FILES / CASE 001</span><h2>調查手札</h2><p>雨夜的最後證言 · ${escapeHtml(state.name)}</p></div><div class="journal-top-icon" aria-hidden="true">✦</div></header><nav class="journal-tabs" aria-label="手札分頁">${tabs.map(([id,name])=>`<button class="${journalTab===id?'active':''}" aria-current="${journalTab===id?'page':'false'}" onclick="journalSwitch('${id}')">${name}</button>`).join('')}</nav><div class="journal-book"><div class="journal-page journal-left"><span class="journal-page-number">CASE / 001</span><div class="journal-page-title"><span>INVESTIGATION RECORD</span><h3>${tabs.find(([id])=>id===journalTab)[1]}</h3></div>${content[journalTab]}<span class="journal-page-bottom">UNRESOLVED INVESTIGATION BUREAU</span></div><div class="journal-page journal-right"><span class="journal-page-number">NOTES / ${String(acquired.length).padStart(2,'0')}</span><div class="journal-page-title"><span>CASE STATUS</span><h3>調查進度</h3></div><div class="journal-polaroid"><div class="journal-photo">✧<span>白石宅邸 · 雨夜</span></div><p>密室死亡事件</p></div><div class="journal-summary"><div><b>${acquired.length}</b><span>已取得證物</span></div><div><b>${['lie','room','motive','opportunity'].filter(flag).length}</b><span>完成推論</span></div></div><div class="journal-sticky"><b>調查提醒</b><p>${acquired.length===0?'先到書房檢查現場，再詢問宅邸相關人士。':!has('cup')?'書房的茶杯可能是值得確認的物件。':!state.labRequested?'已取得茶杯，可考慮申請鑑識。':!has('forensic')?'鑑識申請已送出，可開啟聯絡手機查看。':'持續核對人物證詞與證物，避免只憑單一線索下結論。'}</p></div><div class="journal-shortcuts"><button onclick="go('investigate')">前往現場 ↗</button><button onclick="go('evidence')">證據檔案 ↗</button></div><span class="journal-page-bottom">PERSONAL INVESTIGATION JOURNAL</span></div></div><p class="journal-storage-note">自由筆記與手動建立的關聯儲存在目前瀏覽器；清除瀏覽器資料可能導致遺失。案件重設時會一併清除。</p></section>`;
}
function journalToggle(){journalOverlayOpen=!journalOverlayOpen;if(journalOverlayOpen)phoneOpen=false;render()}
function sceneTurn(direction){const names=Object.keys(scenes).filter(n=>n!=='調查局系統');const i=names.indexOf(state.scene);move(names[(Math.max(0,i)+direction+names.length)%names.length])}
function deductionAllDone(){return ['lie','room','motive','opportunity'].every(k=>(state.serverDeductions?.[k]||0)===3)}
function nav(){return `<div class="nav">${[['investigate','現場調查'],['suspects','嫌疑人詢問'],['evidence','證據圖鑑'],['deduction','推理分析']].map(([p,n])=>btn(n,`go('${p}')`)).join('')}<button class="${deductionAllDone()?'':'verdict-locked'}" ${deductionAllDone()?`onclick="go('accuse')"`:'disabled title="請先完成四項推理分析"'}>${deductionAllDone()?'結案報告':'🔒 結案報告'}</button></div>`}
function go(p){if(p==='accuse'&&!deductionAllDone()){state.dialog='請先完成推理分析的四個主要疑點，才能開啟結案報告。';render();return;}journalOverlayOpen=false;if(p==='investigate'){state.page='investigate';move(state.scene==='調查局系統'?'書房':state.scene);return;}if(p!=='deduction')state.deductionTopic=null;state.page=p;state.dialog='';state.modal=null;render()}
function collect(id){if(!has(id))state.found.push(id);state.dialog=`已登記：${evidence[id][0]}。${evidence[id][2]}`;render()}
function inspect(id){state.dialog=`${evidence[id][0]}：${evidence[id][2]}`;if(!has(id))state.dialog+=' 可選擇登記此證物。';state.selected=id;render()}
async function requestLab(){if(!has('cup')){state.dialog='請先在書房登記茶杯，才能申請鑑識。';render();return;}try{await progressEvent('lab');state.labRequested=true;state.dialog='已送出茶杯鑑識申請。請開啟隨身聯絡手機，查看鑑識報告。'}catch(e){state.dialog=e.message}render()}
async function move(s){try{await progressEvent('visit',{scene:s});state.scene=s;state.selected=null;state.dialog='';render()}catch(e){state.dialog='無法切換調查地點：'+e.message;render()}}
function ask(person,topic){state.person=person;let response=people[person];if(topic==='time')response=people[person];if(topic==='motive')response=person==='高橋修司'?'董事長最近確實在核對公司帳目。':person==='白石美咲'?'我們的婚姻確實出了問題。':person==='白石悠真'?'我有債務，但我沒有殺父親。':'我只知道先生最近心情不太好。';if(topic==='tea')response=person==='佐藤千尋'?'紅茶是我送的，茶壺和杯子都在托盤上。我不能保證杯子在我接手前沒被碰過。':person==='高橋修司'?'我確實協助整理過茶具，但那是九點之前的工作。':'我不清楚茶杯的保管情況。';state.dialog='';state.interrogateFeedback='';logDialogue(person,({time:'案發時間',motive:'人物關係與動機',tea:'紅茶與茶杯'}[topic]),response);state.questionText='';render()}
function hint(){const missing=[['lie',['corridor','divorce'],'先調查客廳與二樓走廊，再詢問妻子。'],['room',['cup','forensic','lock','doorhabit','teapot'],'先檢查書房門鎖與日常紀錄，登記茶杯後申請鑑識，並比較茶壺與茶杯殘留。'],['motive',['finance','records'],'調查私人辦公室的財務與文件調閱紀錄。'],['opportunity',['storage','diary','trace','vial','comparison','teapot'],'除了茶杯保管紀錄與秘書抽屜小瓶，還要比較茶壺與茶杯的檢驗結果，評估管家的其他可能性。']];const next=missing.find(([k,ids])=>!flag(k));state.dialog=next?next[2]:'四項推論已完成。收集全部證物後，就能提交結案報告。';render()}
function combine(key){const requirements={lie:['corridor','divorce'],room:['cup','forensic','lock','doorhabit','teapot'],motive:['finance','records'],opportunity:['storage','diary','trace','vial','comparison','teapot']};if(requirements[key].every(has)){addflag(key);state.dialog={lie:'已形成推論：美咲隱瞞了會面。',room:'已形成推論：死者自行鎖門，並不能排除事先設局。',motive:'已形成推論：高橋有掩蓋財務問題的動機。',opportunity:'已形成推論：高橋有接觸專用茶杯的機會與相關痕跡。'}[key]}else state.dialog='證據不足，請繼續調查。';render()}
const deductionCases={
 lie:{title:'矛盾的證詞',subtitle:'有人隱瞞了自己的行蹤，但隱瞞是否等於殺人？',required:['corridor','divorce'],steps:[{question:'美咲聲稱八點後一直待在房間。你要先核對哪項資料？',options:['走廊出入紀錄','停止的時鐘','財務帳目'],answer:0,reason:'走廊紀錄能直接檢驗她是否離開房間。'},{question:'哪項資料能幫助解釋她隱瞞行蹤的原因？',options:['茶杯保管紀錄','離婚協議','書房門鎖'],answer:1,reason:'離婚協議提供她不願公開會面的合理背景。'},{question:'目前最合理的推論是？',options:['她必然是兇手','她刻意隱瞞會面，但仍須另查是否涉案','她所有證詞都可信'],answer:1,reason:'說謊只證明證詞不實，不能直接證明殺人。'}]},
 room:{title:'密室之謎',subtitle:'從內側上鎖的書房，真的能排除他殺嗎？',required:['cup','forensic','lock','doorhabit','teapot'],steps:[{question:'要確認死因，應優先比對什麼？',options:['時鐘與離婚協議','茶杯與鑑識報告','財務帳目與走廊紀錄'],answer:1,reason:'鑑識結果可釐清茶杯中的異常物質與死亡的關聯。'},{question:'門鎖與死者的日常紀錄合起來，最能支持什麼？',options:['死者有自行鎖門的習慣，但不能確證當晚一定由他上鎖','必定有人破門而入','證明死者自殺'],answer:0,reason:'使用痕跡與生活習慣只能支持合理重建，不能單獨當作目擊證明。'},{question:'你能得出什麼結論？',options:['有密道存在','死者可能在事先遭設局後自行鎖門','管家一定是犯人'],answer:1,reason:'密室不排除事先設局的可能性。'}]},
 motive:{title:'被掩蓋的帳目',subtitle:'財務異常和死者的行動，能拼出什麼動機？',required:['finance','records'],steps:[{question:'哪項證據顯示公司資金異常？',options:['財務帳目','離婚協議','時鐘'],answer:0,reason:'財務帳目顯示異常轉帳與經手者。'},{question:'哪項資料顯示死者已注意到問題？',options:['門鎖','文件調閱紀錄','紅茶準備紀錄'],answer:1,reason:'調閱紀錄顯示死者已追查資金流向。'},{question:'合理的動機推論是？',options:['有人可能想阻止資金問題曝光','所有家人都有同等嫌疑','有人因時鐘故障而殺人'],answer:0,reason:'資金問題可能提供動機，但仍需要作案機會與物證。'}]},
 opportunity:{title:'誰接觸過茶杯？',subtitle:'接觸紀錄是否能和嫌疑人的行動互相印證？',required:['storage','diary','trace','vial','comparison','teapot'],steps:[{question:'要核對茶杯的領取時間，應查看哪項資料？',options:['離婚協議','茶杯保管紀錄','時鐘'],answer:1,reason:'保管紀錄記載專用杯的領取情況。'},{question:'哪兩種資訊能補強接觸行為？',options:['工作日誌與接觸鑑識紀錄','走廊紀錄與離婚協議','時鐘與書信'],answer:0,reason:'日誌和鑑識紀錄可交叉驗證接觸事實。'},{question:'茶壺未檢出 X-17，杯壁局部殘留與小瓶成分相符。哪個推論最合理？',options:['管家因此絕對不可能涉案','茶杯可能在送茶前被動手腳；高橋的接觸與小瓶關聯值得追查，但不能只靠單項證據定罪','茶壺沒有殘留代表沒有發生他殺'],answer:1,reason:'茶壺陰性支持杯子預先受污染的假設，不能絕對排除送茶者；再結合小瓶、保管、財務與時間證據才有說服力。'}]}
};
function deductionOpen(key){state.deductionTopic=key;state.deductionStep=Math.min(state.serverDeductions?.[key]||0,2);state.deductionChoice='';state.deductionFeedback='';render()}
function deductionBack(){state.deductionTopic=null;state.deductionChoice='';state.deductionFeedback='';render()}
function deductionPick(value){state.deductionChoice=String(value);state.deductionFeedback='';render()}
async function deductionNext(){const c=deductionCases[state.deductionTopic];if(!c||state.deductionChoice==='')return;const topic=state.deductionTopic,step=state.deductionStep,answer=Number(state.deductionChoice);if(answer!==c.steps[step].answer){state.deductionFeedback='這項判斷還缺乏支持，請重新檢查證據與證詞。';render();return;}if((state.serverDeductions?.[topic]||0)>=3){state.deductionFeedback='此推論已完成。';render();return;}try{await progressEvent('deduce',{topic,step,answer});state.serverDeductions[topic]=step+1;}catch(e){state.deductionFeedback=e.message;render();return;}if(step===c.steps.length-1){addflag(topic);if(!state.deductionCompleted.includes(topic))state.deductionCompleted.push(topic);state.dialog='推論成立：'+c.title+'。你可以繼續調查其他疑點。';deductionBack();return;}state.deductionStep++;state.deductionChoice='';state.deductionFeedback='';render()}
function deductionView(){const key=state.deductionTopic;if(!key)return `<div class="deduction-grid">${Object.entries(deductionCases).map(([id,c],i)=>`<article class="deduction-card"><span class="eyebrow">疑點 0${i+1}</span><h3>${c.title}</h3><p>${c.subtitle}</p><p class="deduction-status">${flag(id)?'✓ 已完成推論':c.required.every(has)?'可開始分析':'待蒐集相關證據'}</p><button onclick="deductionOpen('${id}')">${flag(id)?'重新檢視':'開始推理'} →</button></article>`).join('')}</div>`;const c=deductionCases[key];if(!c.required.every(has))return `<div class="deduction-detail"><button onclick="deductionBack()">← 返回疑點列表</button><h2>${c.title}</h2><p>目前還缺少支持這個疑點的資料。你可以先自由探索，不需要依固定順序蒐證。</p><h3>尚需調查</h3><ul>${c.required.filter(id=>!has(id)).map(id=>`<li>${evidence[id][0]}（${evidence[id][1]}）</li>`).join('')}</ul><button onclick="go('investigate')">返回現場調查</button></div>`;const step=c.steps[state.deductionStep];return `<div class="deduction-detail"><button onclick="deductionBack()">← 返回疑點列表</button><p class="eyebrow">${c.title} · ${state.deductionStep+1} / ${c.steps.length}</p><div class="deduction-progress">${c.steps.map((_,i)=>`<span class="${i<=state.deductionStep?'active':''}"></span>`).join('')}</div><h2>${step.question}</h2><p class="muted">請根據已取得的資料判斷；答錯可以重新嘗試。</p><div class="deduction-options">${step.options.map((opt,i)=>`<button class="${state.deductionChoice===String(i)?'selected':''}" onclick="deductionPick(${i})">${String.fromCharCode(65+i)}. ${opt}</button>`).join('')}</div>${state.deductionFeedback?`<p class="deduction-error" role="alert">${state.deductionFeedback}</p>`:''}<button class="deduction-next" onclick="deductionNext()" ${state.deductionChoice===''?'disabled':''}>${state.deductionStep===c.steps.length-1?'完成推論':'確認並繼續'}</button></div>`}
const confrontationScenes=[
 {speaker:'小檔',text:'四組推論已成立。接下來要把證據串成完整的事件，而不只是指出一個名字。'},
 {speaker:'調查員',text:'茶壺沒有檢出 X-17，茶杯內壁卻有局部殘留。這支持杯子可能在送茶之前就受到污染。'},
 {speaker:'佐藤千尋',text:'我確實送了茶，但茶杯在交到我手上之前，還有人碰過。'},
 {speaker:'白石美咲',text:'我承認曾去書房談離婚，但那不代表我殺了他。我離開時，他還活著。'},
 {speaker:'調查員',text:'門鎖痕跡和生活習慣支持死者可能自行上鎖。密室並不能排除更早的犯案準備。'},
 {speaker:'高橋修司',text:'我整理過茶杯，這是工作。你們不能只憑接觸痕跡就指控我。'},
 {speaker:'調查員',text:'單靠接觸痕跡確實不夠。但財務異常、保管紀錄、工作日誌，以及小瓶與茶杯的物質比對，彼此形成關聯。'},
 {speaker:'小檔',text:'案件重建完成。各項證據支持高橋涉案的推論；仍須記住，生活習慣與物質比對並不是直接目擊證據。'}
];
function confrontationNext(){state.confrontationStep=Math.min(state.confrontationStep+1,confrontationScenes.length);if(state.confrontationStep>=confrontationScenes.length)state.confrontationDone=true;render()}
function confrontationRestart(){state.confrontationStep=0;state.confrontationDone=false;render()}
function setAnswer(i,v){state.answers[i]=v;save()}
async function submit(){if(!deductionAllDone()){state.dialog='請先完成全部四項推理分析。';render();return;}if(Object.keys(state.answers).length<4){state.dialog='請先回答結案報告中的全部四個問題。';render();return;}try{await progressQueue.catch(()=>{});const r=await fetch('/api/verdict',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({answers:[0,1,2,3].map(i=>state.answers[i])})});const data=await r.json();if(!r.ok)throw Error(data.error||'結案驗證失敗');state.success=!!data.success;if(state.success){state.confrontationStep=0;state.confrontationDone=false;}state.serverReady=!!data.ready;state.missingEvidence=data.missing_evidence||[];state.attempts=(state.attempts||0)+1;go('result')}catch(e){state.dialog=e.message;render()}}
async function reset(){if(!confirm('確定要清除第一副本的所有進度嗎？'))return;try{await progressEvent('reset');state=initial();journalReset();render();await move(state.scene)}catch(e){state.dialog='重設失敗：'+e.message;render()}}
function render(){save();let html='';if(state.page==='home')html=`<div class="hero home-hero"><div class="hero-inner"><span class="eyebrow">UNRESOLVED FILES / INVESTIGATION BUREAU</span><h1>未解檔案</h1><div class="hero-line"></div><h2>UNRESOLVED FILES</h2><p>一款結合證據蒐集、嫌疑人詢問與邏輯推理的多案件遊戲。</p>${btn('開始遊戲',"go('cases')")}</div></div>`;
if(state.page==='cases')html=`<h1>副本選擇</h1><div class="case-cover panel"><span class="eyebrow">CASE FILE / 001</span><h2>CASE 001｜雨夜的最後證言</h2><p>白石宅邸的密室死亡事件。</p>${btn('進入副本',"go('motto')")}</div><div class="panel muted">CASE 002｜尚未開放</div>`;
if(state.page==='motto')html=`<div class="motto-screen"><span class="eyebrow">CASE 001 / PROLOGUE</span><h2>「說謊的人，未必是兇手。」</h2><p>「而說真話的人，也未必清白。」</p><p class="muted">證據，才是揭開真相的關鍵。</p>${btn('繼續',"go('identity')")}</div>`;
if(state.page==='identity')html=`<h1>調查員檔案</h1><div class="panel identity-panel"><p>你是「未解檔案調查局」新加入的調查員。你有權調查現場、詢問相關人物、整理證據，並提交結案報告。</p><label>調查員名稱 <input id="playerName" maxlength="20" value="${escapeHtml(state.name)}"></label><p class="muted">AI 助手「小檔」將提供調查指引，但不會替你決定誰是兇手。</p>${btn('接收第一份案件',"state.name=document.getElementById('playerName').value.trim()||'調查員';go('intro')")}</div>`;
if(state.page==='intro')html=`<h1>CASE 001｜雨夜的最後證言</h1><div class="panel intro-panel"><p>10月17日22:15，企業家白石隆一被發現陳屍於私人宅邸書房。書房從內側上鎖，現場沒有明顯打鬥痕跡。</p><p>當晚宅邸內有四名相關人士。你的任務是調查死亡原因、核對證詞、破解密室疑點，並找出真兇。</p><p class="tag">調查員 ${escapeHtml(state.name)}，案件正式交由你接手。</p>${btn('開始調查',"go('investigate')")}</div>`;
if(['investigate','suspects','evidence','journal','deduction','accuse','result'].includes(state.page)){html=`<h1>CASE 001｜雨夜的最後證言</h1>${nav()}`;
if(state.page==='investigate'&&state.scene==='調查局系統')state.scene='書房';
if(state.page==='investigate')html+=`<div class="panel investigation-full"><h2>現場調查</h2><div class="scene-switch"><div class="scene-current"><small>調查地點 ${Object.keys(scenes).filter(n=>n!=='調查局系統').indexOf(state.scene)+1} / ${Object.keys(scenes).length-1}</small><strong>${escapeHtml(state.scene)}</strong></div></div><p class="muted">標記位置固定不移動；也可以使用場景下方的「物品清單」直接查看，避免點不到。</p><div class="scene-frame"><button class="scene-arrow scene-arrow-left" onclick="sceneTurn(-1)" aria-label="上一個調查地點" title="上一個調查地點">❮</button><div class="scene scene-art scene-full" data-scene="${state.scene}"><div class="scene-heading">點擊固定標記調查物品</div>${scenes[state.scene].filter(id=>!['forensic','trace','comparison','teapot'].includes(id)||state.labRequested).map(id=>`<button class="hotspot" style="--spot-x:${evidencePositions[id][0]}%;--spot-y:${evidencePositions[id][1]}%" onclick="showEvidence('${id}')" aria-label="查看${evidence[id][0]}"><span class="hotspot-dot">${has(id)?'✓':'+'}</span><span class="hotspot-label">${evidence[id][0]}</span></button>`).join('')}</div><button class="scene-arrow scene-arrow-right" onclick="sceneTurn(1)" aria-label="下一個調查地點" title="下一個調查地點">❯</button></div><div class="scene-evidence-list"><h3>場景物品清單</h3><div class="scene-evidence-grid">${scenes[state.scene].filter(id=>!['forensic','trace','comparison','teapot'].includes(id)||state.labRequested).map(id=>`<button class="scene-evidence-button" onclick="showEvidence('${id}')"><span>${has(id)?'✓ 已登記':'＋ 待調查'}</span><strong>${evidence[id][0]}</strong></button>`).join('')}</div></div>${state.scene==='書房'?btn('申請茶杯鑑識','requestLab()'):''}${state.scene==='調查局系統'&&!state.labRequested?'<p class="muted">尚未收到鑑識申請。請先調查書房的茶杯。</p>':''}</div>`;
if(state.page==='suspects'){
 const p=state.person,history=state.history?.[p]||[],tab=state.interrogateTab||'topics';
 const details={'白石美咲':['妻子','優雅而警戒，對婚姻話題敏感','美咲'],'白石悠真':['兒子','對父親的關係感到壓力','悠真'],'高橋修司':['私人秘書','冷靜謹慎，回答常有所保留','修司'],'佐藤千尋':['管家','熟悉宅邸日常工作','千尋']};
 html+=`<section class="interrogation panel"><div class="interrogation-head"><div><span class="eyebrow">CASE 001 / INTERROGATION</span><h2>嫌疑人訊問</h2><p class="muted">自由詢問、出示證據、整理證詞。重要反駁將影響推理進度。</p></div><span class="interrogation-counter">${history.length} 則紀錄</span></div>
 <div class="suspect-tabs" role="group" aria-label="切換嫌疑人">${Object.keys(people).map(name=>`<button class="suspect-tab ${p===name?'is-current':''}" aria-pressed="${p===name}" onclick="interrogateSelect('${name}')">${name}</button>`).join('')}</div>
 <div class="interrogation-stage"><div class="stage-backdrop"></div><div class="character-figure ${flag(p==='白石美咲'?'misaki':p==='高橋修司'?'takahashi':p==='佐藤千尋'?'chihiro':'none')?'character-questioned':''}" data-person="${p}"><div class="character-halo"></div><div class="character-head"></div><div class="character-body"></div><span class="character-caption">人物示意立繪</span></div><div class="stage-information"><span class="eyebrow">PERSON FILE</span><h3>${p}</h3><p>${details[p][0]}</p><p>${details[p][1]}</p>${flag(p==='白石美咲'?'misaki':p==='高橋修司'?'takahashi':p==='佐藤千尋'?'chihiro':'none')?'<span class="interrogation-unlocked">已完成關鍵質問</span>':''}</div><div class="visual-novel-dialogue"><span class="speaker-name">${p}</span><p>${history.length?escapeHtml(history[history.length-1].response):escapeHtml(people[p])}</p></div></div>
 <div class="interrogation-workspace"><div class="interrogation-main"><div class="interrogation-mode" role="group" aria-label="訊問方式">${[['topics','詢問話題'],['free','自由詢問'],['proof','出示證據'],['history','證詞紀錄']].map(([id,label])=>`<button class="${tab===id?'active':''}" aria-pressed="${tab===id}" onclick="interrogateTab('${id}')">${label}</button>`).join('')}</div>
 ${tab==='topics'?`<div class="mode-panel"><h3>選擇詢問話題</h3><p class="muted">不需要 API 金鑰。對話會保留在此人物的紀錄中。</p><div class="topic-grid">${[['time','案發當晚的行蹤','核對時間與人物活動'],['motive','人物關係與動機','了解死者與嫌疑人的關係'],['tea','紅茶與茶杯','詢問茶具的準備與保管']].map(([id,title,desc])=>`<button class="topic-button" onclick="ask('${p}','${id}')"><strong>${title}</strong><small>${desc}</small></button>`).join('')}</div></div>`:''}
 ${tab==='free'?`<div class="mode-panel"><h3>自由詢問 · OpenAI API</h3><p class="muted">可以連續追問。AI 對話是輔助互動，關鍵證詞仍需使用「出示證據」正式解鎖。</p><label for="freeQuestion">你的問題</label><div class="question-row"><input id="freeQuestion" maxlength="300" placeholder="例如：你最後一次見到死者是什麼時候？" onkeydown="if(event.key==='Enter')freeAsk()" ${aiPending?'disabled':''}><button id="aiSend" onclick="freeAsk()" ${aiPending?'disabled':''}>${aiPending?'回應中…':'送出詢問'}</button></div></div>`:''}
 ${tab==='proof'?`<div class="mode-panel"><h3>證據質問</h3><p class="muted">先選擇固定證詞，再出示證據。AI 自由回答不能作為正式證詞反駁。</p>${state.selectedTestimony!==null?`<div class="selected-testimony"><strong>正在反駁的證詞</strong><p>${escapeHtml(statementRules[p]?.text||'')}</p><button onclick="returnToTestimony()">重新選擇證詞</button></div>`:''}${state.found.length?`<div class="proof-grid">${state.found.map(id=>`<button class="proof-item ${state.questionEvidence===id?'chosen':''}" aria-pressed="${state.questionEvidence===id}" onclick="chooseEvidence('${id}')"><strong>${evidence[id][0]}</strong><small>${evidence[id][1]}</small></button>`).join('')}</div><button class="proof-submit" onclick="evidenceChallenge()" ${!state.questionEvidence?'disabled':''}>出示選定證據</button>`:`<p class="empty-evidence">尚未取得任何證據。請先前往現場調查。</p><button onclick="go('investigate')">前往現場調查</button>`}</div>`:''}
 ${tab==='history'?`<div class="mode-panel"><h3>證詞紀錄與矛盾反駁</h3><p class="muted">只有標示「可核對」的固定證詞可以啟動正式證據質問；AI 對話供參考。</p><div class="testimony-list">${statementRules[p]?`<button class="testimony-select" onclick="selectTestimony('${statementRules[p].id}')"><strong>${escapeHtml(statementRules[p].label)} · 可核對</strong><span>${escapeHtml(statementRules[p].text)}</span><small>選取固定證詞並出示證據 →</small></button>`:`<p class="muted">目前沒有可正式反駁的固定證詞。</p>`}${history.map((entry,i)=>`<div class="testimony-select" style="cursor:default"><strong>第 ${i+1} 則 · ${escapeHtml(entry.question)}</strong><span>${escapeHtml(entry.response)}</span><small>對話參考紀錄 · 不作為正式反駁依據</small></div>`).join('')}</div><button onclick="openDeductionFromInterrogate()">前往相關推理疑點 →</button>${flag(p==='白石美咲'?'misaki':p==='高橋修司'?'takahashi':p==='佐藤千尋'?'chihiro':'none')?'<p class="interrogation-unlocked">✓ 已記錄此人的關鍵質問</p>':''}</div>`:''}
 ${state.interrogateFeedback?`<p class="interrogation-feedback" role="status">${escapeHtml(state.interrogateFeedback)}</p>`:''}
 </div><aside class="transcript-side"><div class="transcript-title"><h3>對話紀錄</h3><span>${history.length} 則</span></div><div class="vn-transcript" aria-live="polite">${history.length?history.map(entry=>`<div class="transcript-entry"><div class="transcript-player"><span>調查員</span><p>${escapeHtml(entry.question)}</p></div><div class="transcript-person"><span>${p}</span><p>${escapeHtml(entry.response)}</p></div></div>`).join(''):`<p class="muted">尚未開始訊問。可先選擇話題，或直接自由提問。</p>`}</div></aside></div></section>`;
}
if(state.page==='evidence')html+=evidenceAlbum();
if(state.page==='journal')html+=journalView();
if(state.page==='deduction')html+=`<div class="panel deduction-panel"><span class="eyebrow">CASE 001 / DEDUCTION</span><h2>推理分析</h2><p>自由調查、比對證詞，選擇你想破解的疑點。關鍵時刻以證據回答問題；說謊不代表殺人。</p><div class="deduction-actions">${btn('小檔：提示調查方向','hint()')}${btn('查看證據圖鑑',"go('evidence')")}</div>${deductionView()}</div>`;
if(state.page==='accuse'){let qs=[['誰是真兇？',['白石美咲','白石悠真','高橋修司','佐藤千尋']],['主要動機？',['爭奪遺產','掩蓋挪用資金','感情糾紛']],['密室如何形成？',['兇手從密道離開','事先接觸茶杯，死者自行鎖門','門鎖被破壞']],['哪組證據最能支持指認？',['離婚協議與時鐘','兒子的債務資料','財務、接觸與鑑識證據']]];html+=`<div class="panel"><h2>最終結案報告</h2><p>完成四項推理分析後才能進入結案報告。答對四道結案問題並取得全部 17 件證物即可通關；證詞反駁不列入必要條件。</p><div class="progress">已取得 ${state.found.length}/${Object.keys(evidence).length} 件證物 · 尚缺 ${Object.keys(evidence).filter(id=>!has(id)).length} 件 · 已建立 ${['lie','room','motive','opportunity'].filter(flag).length}/4 項推論</div>${qs.map(([q,opts],i)=>`<div class="panel"><b>${i+1}. ${q}</b><div class="choices">${opts.map(v=>`<label><input type="radio" name="q${i}" ${state.answers[i]===v?'checked':''} onchange="setAnswer(${i},'${v}')"> ${v}</label>`).join('')}</div></div>`).join('')}${btn('提交結案報告','submit()')}</div>`}
if(state.page==='result'){
 if(state.success){const n=state.confrontationStep,scene=confrontationScenes[n];html+=`<section class="panel confrontation"><span class="eyebrow">CASE 001 / FINAL CONFRONTATION</span><h2>${state.confrontationDone?'真相重建完成':'最終對質 · 真相重建'}</h2><div class="confrontation-progress">${Math.min(n+1,confrontationScenes.length)} / ${confrontationScenes.length}</div>${!state.confrontationDone?`<div class="confrontation-dialogue"><span class="speaker-name">${escapeHtml(scene.speaker)}</span><p>${escapeHtml(scene.text)}</p></div><button class="confrontation-next" onclick="confrontationNext()">${n===confrontationScenes.length-1?'完成案件重建':'下一段對話 →'}</button>`:`<p>你已完成證詞反駁、密室推理與證據鏈重建。美咲隱瞞會面，不等於犯下殺人罪；高橋的嫌疑則來自多項獨立證據的相互支持。</p><p class="tag">CASE 001 已結案</p><button onclick="confrontationRestart()">重新觀看對質</button>`}<div class="result-actions">${btn('返回調查',"go('investigate')")}${btn('重新開始','reset()')}</div></section>`;}else{html+=`<section class="panel"><h2>推理尚未成立</h2><p>${state.serverReady?'部分結案判斷與證據不一致。請重新核對推論。':'尚缺少證物：'+(state.missingEvidence||[]).map(id=>evidence[id]?.[0]||id).join('、')+'。你可以先返回現場補齊。'}</p>${btn('返回調查',"go('investigate')")}${btn('重新開始','reset()')}</section>`;}
}}if(state.modal){const id=state.modal;html+=`<div class="overlay" onclick="closeModal()"><section class="evidence-modal" role="dialog" aria-modal="true" aria-label="證物詳情" onclick="event.stopPropagation()"><div class="modal-top"><span class="tag">現場發現 · ${evidence[id][1]}</span><button onclick="closeModal()" aria-label="關閉">✕</button></div><h2>${evidence[id][0]}</h2><p>${evidence[id][2]}</p><div class="modal-actions">${has(id)?'<span class="tag">✓ 已登記</span>':btn('登記證物',`registerEvidence('${id}')`)}${btn('返回調查','closeModal()')}</div></section></div>`}if(state.dialog&&state.page!=='result')html+=`<div class="toast-note" role="status"><span class="tag">調查紀錄</span><p>${escapeHtml(state.dialog)}</p><button onclick="state.dialog='';render()">關閉</button></div>`;if(['investigate','suspects','evidence','deduction','accuse','result'].includes(state.page))html+=`<button class="journal-float ${journalOverlayOpen?'opened':''}" onclick="journalToggle()" title="${journalOverlayOpen?'關閉手札':'打開隨身手札'}" aria-label="${journalOverlayOpen?'關閉調查手札':'打開調查手札'}"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 10c8-3 15-2 20 2 5-4 12-5 20-2v40c-8-3-15-2-20 2-5-4-12-5-20-2z" fill="#e9d2a3" stroke="#6a4a2b" stroke-width="3"/><path d="M32 12v40M17 20l10 1m-10 6 10 1m10-7 10-1m-10 8 10-1" stroke="#896947" stroke-width="2" fill="none"/></svg><span>${journalOverlayOpen?'關閉':'手札'}</span></button>`;if(['investigate','suspects','evidence','deduction','accuse','result'].includes(state.page))html+=`<button class="phone-float" onclick="phoneToggle()" title="調查局聯絡手機" aria-label="開啟調查局聯絡手機"><span class="phone-icon">▣</span><small>聯絡</small></button>`;
if(phoneOpen)html+=`<div class="phone-overlay" onclick="phoneClose()"><section class="phone-window" role="dialog" aria-modal="true" aria-label="調查局聯絡手機" onclick="event.stopPropagation()"><div class="phone-toolbar"><span>調查局聯絡手機</span><button onclick="phoneClose()" aria-label="關閉手機">✕</button></div>${phoneView()}</section></div>`;
if(journalOverlayOpen)html+=`<div class="journal-overlay" role="presentation" onclick="journalClose()"><section class="journal-window" role="dialog" aria-modal="true" aria-label="調查手札" onclick="event.stopPropagation()"><div class="journal-window-toolbar"><strong>📖 隨身調查手札</strong><div class="journal-window-actions"><button onclick="journalZoomChange(-.1)" aria-label="縮小手札">－</button><span id="journal-zoom-label">${Math.round(journalZoom*100)}%</span><button onclick="journalZoomChange(.1)" aria-label="放大手札">＋</button><button class="journal-close" onclick="journalClose()" aria-label="關閉手札">✕</button></div></div><div class="journal-window-content"><div style="zoom:${journalZoom}">${journalView()}</div></div></section></div>`;app.innerHTML=html}
render();
syncProgress();

// V25: draggable journal launcher; save viewport-relative position locally.
(() => {
  const KEY = 'unresolved_case_journal_button_position_v25';
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  function place(button) {
    if (!button || !saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return;
    const r = button.getBoundingClientRect();
    const left = clamp(saved.x * innerWidth, 8, Math.max(8, innerWidth - r.width - 8));
    const top = clamp(saved.y * innerHeight, 8, Math.max(8, innerHeight - r.height - 8));
    button.style.left = left + 'px'; button.style.top = top + 'px';
    button.style.right = 'auto'; button.style.bottom = 'auto';
  }
  const observer = new MutationObserver(() => place(document.querySelector('.journal-float')));
  const root = document.getElementById('app');
  if (root) observer.observe(root, {childList: true});
  addEventListener('resize', () => place(document.querySelector('.journal-float')));
  let drag = null, suppressClick = false;
  document.addEventListener('pointerdown', (e) => {
    const button = e.target.closest('.journal-float');
    if (!button || e.button !== 0) return;
    const r = button.getBoundingClientRect();
    drag = {id:e.pointerId, button, startX:e.clientX, startY:e.clientY, left:r.left, top:r.top, moved:false};
    button.setPointerCapture(e.pointerId);
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx=e.clientX-drag.startX, dy=e.clientY-drag.startY;
    if (!drag.moved && Math.hypot(dx,dy) < 7) return;
    drag.moved=true;
    const b=drag.button, r=b.getBoundingClientRect();
    b.style.left=clamp(drag.left+dx,8,Math.max(8,innerWidth-r.width-8))+'px';
    b.style.top=clamp(drag.top+dy,8,Math.max(8,innerHeight-r.height-8))+'px';
    b.style.right='auto'; b.style.bottom='auto';
  });
  function finish(e) {
    if (!drag || drag.id !== e.pointerId) return;
    if (drag.moved) {
      const r=drag.button.getBoundingClientRect();
      saved={x:r.left/innerWidth,y:r.top/innerHeight};
      try {localStorage.setItem(KEY,JSON.stringify(saved));} catch (_) {}
      suppressClick=true;
    }
    drag=null;
  }
  document.addEventListener('pointerup', finish);
  document.addEventListener('pointercancel', finish);
  document.addEventListener('click', e => {
    if (suppressClick && e.target.closest('.journal-float')) {
      e.preventDefault(); e.stopImmediatePropagation(); suppressClick=false;
    }
  }, true);
  place(document.querySelector('.journal-float'));
})();

// Move the floating phone without interfering with normal click-to-open.
(function(){
 const key='unresolved_phone_position_v1';let dragging=null,blockClick=false;
 function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
 function position(){const el=document.querySelector('.phone-float');if(!el)return;let pos;try{pos=JSON.parse(localStorage.getItem(key)||'null')}catch(e){};if(pos&&Number.isFinite(pos.x)&&Number.isFinite(pos.y)){el.style.left=clamp(pos.x,8,Math.max(8,innerWidth-el.offsetWidth-8))+'px';el.style.top=clamp(pos.y,8,Math.max(8,innerHeight-el.offsetHeight-8))+'px';el.style.right='auto';el.style.bottom='auto';}}
 document.addEventListener('pointerdown',e=>{const el=e.target.closest('.phone-float');if(!el)return;const r=el.getBoundingClientRect();dragging={id:e.pointerId,el,startX:e.clientX,startY:e.clientY,dx:e.clientX-r.left,dy:e.clientY-r.top,moved:false};el.setPointerCapture(e.pointerId);});
 document.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragging.id)return;const d=dragging;if(Math.hypot(e.clientX-d.startX,e.clientY-d.startY)>6)d.moved=true;if(!d.moved)return;d.el.style.left=clamp(e.clientX-d.dx,8,Math.max(8,innerWidth-d.el.offsetWidth-8))+'px';d.el.style.top=clamp(e.clientY-d.dy,8,Math.max(8,innerHeight-d.el.offsetHeight-8))+'px';d.el.style.right='auto';d.el.style.bottom='auto';e.preventDefault();});
 document.addEventListener('pointerup',e=>{if(!dragging||e.pointerId!==dragging.id)return;const d=dragging;if(d.moved){blockClick=true;localStorage.setItem(key,JSON.stringify({x:parseFloat(d.el.style.left),y:parseFloat(d.el.style.top)}))}dragging=null;});
 document.addEventListener('click',e=>{if(blockClick&&e.target.closest('.phone-float')){e.preventDefault();e.stopImmediatePropagation();blockClick=false;}},true);
 const observer=new MutationObserver(position);observer.observe(app,{childList:true});window.addEventListener('resize',position);position();
})();
