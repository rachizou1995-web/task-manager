import { useState, useEffect } from "react";

// ─── Date helpers ──────────────────────────────────────────────────────────────
const TODAY = new Date();
TODAY.setHours(0,0,0,0);
const todayStr = TODAY.toISOString().slice(0,10);
// const todayDow = TODAY.getDay();
const todayDate = TODAY.getDate();
const DOW_LABELS = ["日","月","火","水","木","金","土"];
const MONTH_DATES = Array.from({length:28},(_,i)=>i+1);

function dateStr(d){ return d.toISOString().slice(0,10); }

function startOfWeekForDate(d){
  const x = new Date(d);
  x.setDate(d.getDate() - ((d.getDay()+6)%7));
  return dateStr(x);
}

// Is this recurring task active on a given Date?
function isActiveOn(task, d){
  const dDow  = d.getDay();
  const dDate = d.getDate();
  const dStr  = dateStr(d);
  if(task.type==="daily")   return true;
  if(task.type==="weekly")  return (task.dow??[]).includes(dDow);
  if(task.type==="monthly") return (task.monthDay??1)===dDate;
  if(task.type==="adhoc")   return task.deadline===dStr || !task.deadline;
  return false;
}

// Was this task "done" for a specific date's cycle?
function isDoneForDate(task, d){
  if(!task.completedAt) return false;
  const dStr = dateStr(d);
  if(task.type==="daily")   return task.completedAt===dStr;
  if(task.type==="weekly"){
    const w = startOfWeekForDate(d);
    const end = new Date(d); end.setDate(d.getDate()-(d.getDay()+6)%7+6);
    return task.completedAt>=w && task.completedAt<=dateStr(end);
  }
  if(task.type==="monthly"){
    const c = new Date(task.completedAt);
    return c.getMonth()===d.getMonth() && c.getFullYear()===d.getFullYear();
  }
  if(task.type==="adhoc") return !!task.completedAt;
  return false;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIORITY_ORDER={high:0,medium:1,low:2};

const TYPE_META={
  daily:  {label:"デイリー",    color:"#1B4FBF",bg:"#EEF3FC",icon:"☀️"},
  weekly: {label:"ウィークリー",color:"#0D7373",bg:"#E8F8F8",icon:"📅"},
  monthly:{label:"マンスリー",  color:"#7A3B0E",bg:"#FBF3EE",icon:"🗓"},
  adhoc:  {label:"アドホック",  color:"#5B1E8C",bg:"#F3EEF9",icon:"📌"},
};

const PRIORITY_META={
  high:  {label:"高",color:"#C0392B",bg:"#FDF0EF",dot:"#E74C3C"},
  medium:{label:"中",color:"#1B6B3A",bg:"#EEF8F2",dot:"#27AE60"},
  low:   {label:"低",color:"#7F8C8D",bg:"#F4F5F5",dot:"#95A5A6"},
};

const TABS=[
  {id:"home",    label:"今日",      icon:"⌂"},
  {id:"calendar",label:"カレンダー",icon:"📆"},
  {id:"daily",   label:"デイリー",  icon:"☀️"},
  {id:"weekly",  label:"週次",      icon:"📅"},
  {id:"monthly", label:"月次",      icon:"🗓"},
  {id:"adhoc",   label:"その他",    icon:"📌"},
];

let _id=100; const uid=()=>String(++_id);

const SEED=[
  {id:uid(),type:"daily",  title:"メールチェック・返信",         priority:"high",  completedAt:null,dow:[],   monthDay:1, deadline:"",note:""},
  {id:uid(),type:"daily",  title:"Slackの未読確認",              priority:"medium",completedAt:null,dow:[],   monthDay:1, deadline:"",note:""},
  {id:uid(),type:"weekly", title:"週次レポート作成",              priority:"high",  completedAt:null,dow:[1],  monthDay:1, deadline:"",note:""},
  {id:uid(),type:"weekly", title:"チームミーティング準備",        priority:"medium",completedAt:null,dow:[3,5],monthDay:1, deadline:"",note:""},
  {id:uid(),type:"monthly",title:"月次損益レポート",              priority:"high",  completedAt:null,dow:[],   monthDay:5, deadline:"",note:""},
  {id:uid(),type:"monthly",title:"経費精算",                      priority:"medium",completedAt:null,dow:[],   monthDay:25,deadline:"",note:""},
  {id:uid(),type:"adhoc",  title:"Q2事業計画レビュー",            priority:"high",  completedAt:null,dow:[],   monthDay:1, deadline:"2026-03-10",note:"役員会議前に確認"},
  {id:uid(),type:"adhoc",  title:"新入社員オリエンテーション資料",priority:"medium",completedAt:null,dow:[],   monthDay:1, deadline:"2026-03-15",note:""},
];

// ─── useBreakpoint ─────────────────────────────────────────────────────────────
function useIsMobile(){
  const [m,setM]=useState(window.innerWidth<768);
  useEffect(()=>{const fn=()=>setM(window.innerWidth<768);window.addEventListener("resize",fn);return()=>window.removeEventListener("resize",fn);},[]);
  return m;
}

// ─── Chips ────────────────────────────────────────────────────────────────────
function TypeChip({type}){const m=TYPE_META[type];return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:m.bg,color:m.color,whiteSpace:"nowrap"}}>{m.icon} {m.label}</span>;}
function PriorityChip({priority}){const m=PRIORITY_META[priority];return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:m.bg,color:m.color,whiteSpace:"nowrap"}}>{m.label}</span>;}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({task,done,onToggle,onTap,showType=false,isMobile}){
  const tm=TYPE_META[task.type]; const pm=PRIORITY_META[task.priority];
  const daysLeft=task.deadline?Math.ceil((new Date(task.deadline)-TODAY)/86400000):null;
  const overdue=task.type==="adhoc"&&task.deadline&&task.deadline<todayStr;
  return(
    <div className="task-card" onClick={()=>onTap(task)} style={{background:"#fff",borderRadius:isMobile?14:10,padding:isMobile?"14px 16px":"12px 16px",marginBottom:isMobile?10:8,display:"flex",alignItems:"center",gap:isMobile?14:12,boxShadow:isMobile?"0 1px 4px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)":"none",border:isMobile?"none":"1px solid #ECEEF2",opacity:done?0.52:1,borderLeft:`${isMobile?4:3}px solid ${done?"#E0E4EC":pm.dot}`,paddingLeft:isMobile?14:13,cursor:"pointer",transition:"background 0.12s,transform 0.1s",WebkitTapHighlightColor:"transparent"}}>
      <div onClick={e=>{e.stopPropagation();onToggle(task.id);}} style={{width:isMobile?26:20,height:isMobile?26:20,borderRadius:isMobile?8:5,flexShrink:0,cursor:"pointer",border:`${isMobile?2:1.5}px solid ${done?tm.color:"#C8CDD4"}`,background:done?tm.color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
        {done&&<span style={{color:"#fff",fontSize:isMobile?13:10,fontWeight:900,lineHeight:1}}>✓</span>}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:isMobile?15:13,fontWeight:600,color:done?"#A0A8B3":"#1A1F36",textDecoration:done?"line-through":"none",lineHeight:1.35,marginBottom:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{task.title}</div>
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          {showType&&<TypeChip type={task.type}/>}
          <PriorityChip priority={task.priority}/>
          {task.type==="adhoc"&&task.deadline&&<span style={{fontSize:11,fontWeight:600,color:overdue?"#C0392B":daysLeft<=3?"#E67E22":"#9AA3AF"}}>{overdue?"⚠ 期限切れ":daysLeft===0?"今日まで":`残${daysLeft}日`}</span>}
          {task.note&&<span style={{fontSize:11,color:"#B0B8C1"}}>{task.note}</span>}
        </div>
      </div>
      <span style={{color:"#C8CDD4",fontSize:14,flexShrink:0}}>›</span>
    </div>
  );
}

// ─── Priority Group ────────────────────────────────────────────────────────────
function PriorityGroup({priority,items,onToggle,onTap,showType,isMobile}){
  if(!items.length) return null;
  const pm=PRIORITY_META[priority];
  const labels={high:"優先度 高",medium:"優先度 中",low:"優先度 低"};
  const doneCount=items.filter(x=>x.done).length;
  return(
    <div style={{marginBottom:isMobile?20:16}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:isMobile?10:8,paddingLeft:2}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:pm.dot,flexShrink:0}}/>
        <span style={{fontSize:11,fontWeight:700,color:pm.color,letterSpacing:"0.04em"}}>{labels[priority]}</span>
        <span style={{fontSize:11,color:"#C0C7D0",marginLeft:"auto",fontFamily:"monospace"}}>{doneCount}/{items.length}</span>
      </div>
      {items.map(({task,done})=><TaskCard key={task.id} task={task} done={done} onToggle={onToggle} onTap={onTap} showType={showType} isMobile={isMobile}/>)}
    </div>
  );
}

// ─── Day Task List (shared by Home + Calendar) ─────────────────────────────────
function DayTaskList({targetDate,tasks,onToggle,onTap,isMobile}){
  const isToday=dateStr(targetDate)===todayStr;
  const dayTasks=tasks.filter(t=>isActiveOn(t,targetDate));
  const withDone=dayTasks.map(t=>({task:t,done:isDoneForDate(t,targetDate)}));
  const sorted=[...withDone].sort((a,b)=>PRIORITY_ORDER[a.task.priority]-PRIORITY_ORDER[b.task.priority]);
  const byPri={high:[],medium:[],low:[]};
  sorted.forEach(x=>byPri[x.task.priority]?.push(x));
  const total=dayTasks.length;
  const doneCount=withDone.filter(x=>x.done).length;
  const pct=total?Math.round(doneCount/total*100):0;

  return(
    <div>
      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#1B3A6B 0%,#2A5298 100%)",borderRadius:isMobile?20:14,padding:isMobile?"22px 20px 20px":"20px 24px",marginBottom:isMobile?24:20,color:"#fff"}}>
        <div style={{fontSize:12,fontWeight:600,opacity:0.6,letterSpacing:"0.06em",marginBottom:4}}>
          {targetDate.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric",weekday:"short"})}
          {isToday&&<span style={{marginLeft:8,background:"rgba(255,255,255,0.2)",borderRadius:10,padding:"1px 8px",fontSize:10,fontWeight:700}}>今日</span>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
          <div>
            <div style={{fontSize:isMobile?26:22,fontWeight:800,lineHeight:1.1,marginBottom:4}}>
              {isToday?"今日のタスク":"この日のタスク"}
            </div>
            <div style={{fontSize:13,opacity:0.7}}>{doneCount} / {total} 完了</div>
          </div>
          <div style={{fontFamily:"monospace",fontSize:isMobile?42:36,fontWeight:800,lineHeight:1,color:pct===100?"#4ADE80":"#fff"}}>
            {pct}<span style={{fontSize:isMobile?18:16}}>%</span>
          </div>
        </div>
        <div style={{height:5,background:"rgba(255,255,255,0.2)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#4ADE80":"rgba(255,255,255,0.85)",borderRadius:3,transition:"width 0.5s ease"}}/>
        </div>
        <div style={{display:"flex",gap:14,marginTop:12,flexWrap:"wrap"}}>
          {Object.entries(TYPE_META).map(([type,m])=>{
            const cnt=dayTasks.filter(t=>t.type===type).length;
            if(!cnt) return null;
            return <div key={type} style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:12}}>{m.icon}</span><span style={{fontSize:12,opacity:0.8,fontWeight:600}}>{m.label} {cnt}</span></div>;
          })}
        </div>
      </div>
      {total===0?(
        <div style={{textAlign:"center",padding:"60px 0",color:"#C0C7D0"}}>
          <div style={{fontSize:44,marginBottom:12}}>📭</div>
          <div style={{fontSize:14,fontWeight:600,color:"#9AA3AF"}}>この日のタスクはありません</div>
        </div>
      ):(
        <>
          <PriorityGroup priority="high"   items={byPri.high}   onToggle={onToggle} onTap={onTap} showType isMobile={isMobile}/>
          <PriorityGroup priority="medium" items={byPri.medium} onToggle={onToggle} onTap={onTap} showType isMobile={isMobile}/>
          <PriorityGroup priority="low"    items={byPri.low}    onToggle={onToggle} onTap={onTap} showType isMobile={isMobile}/>
        </>
      )}
    </div>
  );
}

// ─── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({tasks,onToggle,onTap,isMobile}){
  const [viewYear,setViewYear]=useState(TODAY.getFullYear());
  const [viewMonth,setViewMonth]=useState(TODAY.getMonth());
  const [selected,setSelected]=useState(new Date(TODAY));

  function prevMonth(){if(viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1);}
  function nextMonth(){if(viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1);}

  // Build calendar grid
  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(new Date(viewYear,viewMonth,d));

  // Dot density per day
  function taskCountForDay(d){
    if(!d) return 0;
    return tasks.filter(t=>isActiveOn(t,d)).length;
  }
  function doneCountForDay(d){
    if(!d) return 0;
    return tasks.filter(t=>isActiveOn(t,d)&&isDoneForDate(t,d)).length;
  }

  const selStr=dateStr(selected);
  const CELL=isMobile?44:48;

  return(
    <div>
      {/* Calendar card */}
      <div style={{background:"#fff",borderRadius:isMobile?16:12,border:"1px solid #ECEEF2",padding:isMobile?"16px":"20px",marginBottom:isMobile?20:18,boxShadow:isMobile?"0 1px 4px rgba(0,0,0,0.06)":"none"}}>
        {/* Month header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <button onClick={prevMonth} style={{width:34,height:34,borderRadius:8,border:"1px solid #ECEEF2",background:"#fff",cursor:"pointer",fontSize:16,color:"#555",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <div style={{fontSize:isMobile?16:15,fontWeight:800,color:"#1A1F36"}}>
            {viewYear}年 {viewMonth+1}月
          </div>
          <button onClick={nextMonth} style={{width:34,height:34,borderRadius:8,border:"1px solid #ECEEF2",background:"#fff",cursor:"pointer",fontSize:16,color:"#555",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>

        {/* DOW headers */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:6}}>
          {DOW_LABELS.map((d,i)=>(
            <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:i===0?"#E74C3C":i===6?"#2A5298":"#9AA3AF",padding:"4px 0"}}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={`e${i}`}/>;
            const ds=dateStr(d);
            const isSelected=ds===selStr;
            const isT=ds===todayStr;
            const cnt=taskCountForDay(d);
            const dnCnt=doneCountForDay(d);
            const isDow0=d.getDay()===0; const isDow6=d.getDay()===6;
            const allDone=cnt>0&&dnCnt===cnt;
            return(
              <button key={ds} onClick={()=>setSelected(new Date(d))} style={{height:CELL,borderRadius:10,border:"none",cursor:"pointer",background:isSelected?"#1B3A6B":isT?"#EEF3FC":"transparent",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,transition:"background 0.12s",WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:isMobile?14:13,fontWeight:isT||isSelected?800:400,color:isSelected?"#fff":isT?"#1B3A6B":isDow0?"#E74C3C":isDow6?"#2A5298":"#1A1F36",lineHeight:1}}>
                  {d.getDate()}
                </span>
                {cnt>0&&(
                  <div style={{display:"flex",gap:2,alignItems:"center"}}>
                    {allDone
                      ?<span style={{fontSize:8,color:isSelected?"rgba(255,255,255,0.7)":"#27AE60"}}>●</span>
                      :<>
                        {Array.from({length:Math.min(cnt,3)}).map((_,j)=>(
                          <span key={j} style={{width:4,height:4,borderRadius:"50%",background:isSelected?"rgba(255,255,255,0.6)":j<dnCnt?"#27AE60":"#E1E4E8",display:"inline-block"}}/>
                        ))}
                        {cnt>3&&<span style={{fontSize:7,color:isSelected?"rgba(255,255,255,0.6)":"#9AA3AF"}}>+</span>}
                      </>
                    }
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{display:"flex",gap:14,marginTop:12,paddingTop:10,borderTop:"1px solid #F3F4F6",flexWrap:"wrap"}}>
          {[{dot:"#27AE60",label:"完了"},{dot:"#E1E4E8",label:"未完了"},{bg:"#EEF3FC",label:"今日"},{bg:"#1B3A6B",label:"選択中",color:"#fff"}].map(l=>(
            <div key={l.label} style={{display:"flex",alignItems:"center",gap:5}}>
              {l.dot?<span style={{width:8,height:8,borderRadius:"50%",background:l.dot,display:"inline-block"}}/>:<span style={{width:16,height:16,borderRadius:5,background:l.bg,display:"inline-flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:8,color:l.color||"#1B3A6B"}}>日</span></span>}
              <span style={{fontSize:10,color:"#9AA3AF",fontWeight:600}}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day tasks */}
      <DayTaskList targetDate={selected} tasks={tasks} onToggle={onToggle} onTap={onTap} isMobile={isMobile}/>
    </div>
  );
}

// ─── Type view ────────────────────────────────────────────────────────────────
function TypeView({type,tasks,onToggle,onTap,onAdd,isMobile}){
  const m=TYPE_META[type];
  const list=[...tasks.filter(t=>t.type===type)].sort((a,b)=>PRIORITY_ORDER[a.priority]-PRIORITY_ORDER[b.priority]);
  const byPri={high:[],medium:[],low:[]};
  list.forEach(t=>byPri[t.priority]?.push({task:t,done:isDoneForDate(t,TODAY)}));
  const done=list.filter(t=>isDoneForDate(t,TODAY)).length;
  return(
    <div>
      <div style={{background:m.bg,borderRadius:isMobile?16:12,padding:isMobile?"18px":"16px 20px",marginBottom:isMobile?20:16,border:`1px solid ${m.color}22`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:isMobile?24:20}}>{m.icon}</span>
          <div>
            <div style={{fontSize:isMobile?17:15,fontWeight:800,color:m.color}}>{m.label}</div>
            <div style={{fontSize:11,color:m.color,opacity:0.65}}>{list.length}件登録 · {done}件完了済み</div>
          </div>
        </div>
        {!isMobile&&<button onClick={onAdd} style={{background:m.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 18px",fontSize:12,fontWeight:700,cursor:"pointer"}}>＋ 追加</button>}
      </div>
      {list.length===0?(
        <div style={{textAlign:"center",padding:"48px 0"}}><div style={{fontSize:40,marginBottom:10}}>📋</div><div style={{fontSize:13,color:"#9AA3AF"}}>タスクが登録されていません</div></div>
      ):(
        <>
          <PriorityGroup priority="high"   items={byPri.high}   onToggle={onToggle} onTap={onTap} showType={false} isMobile={isMobile}/>
          <PriorityGroup priority="medium" items={byPri.medium} onToggle={onToggle} onTap={onTap} showType={false} isMobile={isMobile}/>
          <PriorityGroup priority="low"    items={byPri.low}    onToggle={onToggle} onTap={onTap} showType={false} isMobile={isMobile}/>
        </>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function TaskModal({initial,defaultType,onSave,onDelete,onClose,isMobile}){
  const isEdit=!!initial?.id;
  const [form,setForm]=useState(initial??{type:defaultType??"daily",title:"",priority:"medium",dow:[],monthDay:todayDate,deadline:"",note:""});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const toggleDow=d=>set("dow",form.dow.includes(d)?form.dow.filter(x=>x!==d):[...form.dow,d]);
  const inp={width:"100%",border:"1.5px solid #E1E4E8",borderRadius:isMobile?10:7,padding:isMobile?"13px 14px":"10px 12px",fontSize:isMobile?15:13,color:"#1A1F36",background:"#FAFBFC",fontFamily:"inherit",outline:"none",WebkitAppearance:"none"};
  const lbl={display:"block",fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"#9AA3AF",marginBottom:isMobile?8:6};
  const field={marginBottom:isMobile?18:14};
  const inner=(
    <div style={{padding:isMobile?"20px 20px 36px":"28px 28px 24px",maxHeight:"90vh",overflowY:"auto"}}>
      {isMobile&&<div style={{width:36,height:4,background:"#E0E4EC",borderRadius:2,margin:"0 auto 18px"}}/>}
      <div style={{display:"flex",alignItems:"center",marginBottom:isMobile?20:18}}>
        <div style={{width:3,height:18,background:"#1B3A6B",borderRadius:2,marginRight:10}}/>
        <span style={{fontSize:isMobile?16:15,fontWeight:800,color:"#1A1F36"}}>{isEdit?"タスクを編集":"タスクを追加"}</span>
        {isEdit&&<button onClick={()=>onDelete(form.id)} style={{marginLeft:"auto",background:"#FDF0EF",border:"none",borderRadius:8,padding:"7px 14px",color:"#C0392B",cursor:"pointer",fontSize:12,fontWeight:700}}>削除</button>}
      </div>
      <div style={field}>
        <label style={lbl}>種別</label>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:isMobile?8:6}}>
          {Object.entries(TYPE_META).map(([k,m])=>(
            <button key={k} onClick={()=>set("type",k)} style={{padding:isMobile?"10px 4px":"8px 4px",borderRadius:isMobile?10:7,border:`2px solid ${form.type===k?m.color:"#E1E4E8"}`,background:form.type===k?m.bg:"#fff",color:form.type===k?m.color:"#9AA3AF",fontSize:11,fontWeight:700,cursor:"pointer",lineHeight:1.5}}>
              {m.icon}<br/>{m.label}
            </button>
          ))}
        </div>
      </div>
      <div style={field}><label style={lbl}>タスク名</label><input value={form.title} onChange={e=>set("title",e.target.value)} placeholder="タスクの内容を入力..." style={inp} autoFocus/></div>
      <div style={field}>
        <label style={lbl}>優先度</label>
        <div style={{display:"flex",gap:8}}>
          {Object.entries(PRIORITY_META).map(([k,m])=>(
            <button key={k} onClick={()=>set("priority",k)} style={{flex:1,padding:isMobile?"12px":"9px",borderRadius:isMobile?10:7,border:`2px solid ${form.priority===k?m.color:"#E1E4E8"}`,background:form.priority===k?m.bg:"#fff",color:form.priority===k?m.color:"#9AA3AF",fontSize:isMobile?14:12,fontWeight:700,cursor:"pointer"}}>{m.label}</button>
          ))}
        </div>
      </div>
      {form.type==="weekly"&&(
        <div style={field}>
          <label style={lbl}>実施曜日（複数可）</label>
          <div style={{display:"flex",gap:6}}>
            {DOW_LABELS.map((d,i)=>(<button key={i} onClick={()=>toggleDow(i)} style={{flex:1,padding:isMobile?"11px 0":"8px 0",borderRadius:isMobile?10:7,border:`2px solid ${form.dow.includes(i)?"#0D7373":"#E1E4E8"}`,background:form.dow.includes(i)?"#E8F8F8":"#fff",color:form.dow.includes(i)?"#0D7373":"#9AA3AF",fontSize:12,fontWeight:700,cursor:"pointer"}}>{d}</button>))}
          </div>
        </div>
      )}
      {form.type==="monthly"&&(<div style={field}><label style={lbl}>実施日（毎月）</label><select value={form.monthDay} onChange={e=>set("monthDay",Number(e.target.value))} style={inp}>{MONTH_DATES.map(d=><option key={d} value={d}>毎月 {d} 日</option>)}</select></div>)}
      {form.type==="adhoc"&&(<div style={field}><label style={lbl}>期限日</label><input type="date" value={form.deadline} onChange={e=>set("deadline",e.target.value)} style={inp}/></div>)}
      <div style={field}><label style={lbl}>メモ（任意）</label><input value={form.note} onChange={e=>set("note",e.target.value)} placeholder="補足など..." style={inp}/></div>
      <div style={{display:"flex",gap:10,marginTop:8}}>
        <button onClick={onClose} style={{flex:1,background:"#F4F5F7",border:"none",borderRadius:isMobile?12:8,padding:isMobile?"15px":"11px",color:"#5A6374",fontSize:isMobile?15:13,fontWeight:600,cursor:"pointer"}}>キャンセル</button>
        <button onClick={()=>form.title.trim()&&onSave(form)} style={{flex:2,background:"#1B3A6B",border:"none",borderRadius:isMobile?12:8,padding:isMobile?"15px":"11px",color:"#fff",fontSize:isMobile?15:13,fontWeight:700,cursor:"pointer"}}>{isEdit?"保存する":"追加する"}</button>
      </div>
    </div>
  );
  if(isMobile) return(
    <div className="modal-overlay" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(10,20,45,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300}}>
      <div className="sheet-box" onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:"22px 22px 0 0",width:"100%",maxWidth:500}}>{inner}</div>
    </div>
  );
  return(
    <div className="modal-overlay" onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(10,20,45,0.45)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:24}}>
      <div className="modal-box" onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:14,width:"100%",maxWidth:480,boxShadow:"0 20px 60px rgba(10,20,45,0.22)",maxHeight:"90vh",overflowY:"auto"}}>{inner}</div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App(){
  const [tasks,setTasks]=useState(SEED);
  const [tab,setTab]=useState("home");
  const [modal,setModal]=useState(null);
  const isMobile=useIsMobile();

  function toggle(id){
    setTasks(ts=>ts.map(t=>t.id!==id?t:{...t,completedAt:isDoneForDate(t,TODAY)?null:todayStr}));
  }
  function openAdd(type){setModal({mode:"add",defaultType:type??(tab==="home"||tab==="calendar"?"daily":tab),task:null});}
  function openEdit(task){setModal({mode:"edit",defaultType:task.type,task:{...task}});}
  function saveTask(form){
    setTasks(ts=>modal.mode==="edit"?ts.map(t=>t.id===form.id?{...form}:t):[...ts,{...form,id:uid(),completedAt:null}]);
    setModal(null);
  }
  function deleteTask(id){setTasks(ts=>ts.filter(t=>t.id!==id));setModal(null);}

  const todayUndone=tasks.filter(t=>isActiveOn(t,TODAY)&&!isDoneForDate(t,TODAY)).length;
  const badge=p=>{
    if(p==="home") return todayUndone;
    if(p==="calendar") return 0;
    return tasks.filter(t=>t.type===p).length;
  };

  const content=(
    <>
      {tab==="home"    && <DayTaskList targetDate={TODAY} tasks={tasks} onToggle={toggle} onTap={openEdit} isMobile={isMobile}/>}
      {tab==="calendar"&& <CalendarView tasks={tasks} onToggle={toggle} onTap={openEdit} isMobile={isMobile}/>}
      {["daily","weekly","monthly","adhoc"].includes(tab)&&<TypeView type={tab} tasks={tasks} onToggle={toggle} onTap={openEdit} onAdd={()=>openAdd(tab)} isMobile={isMobile}/>}
    </>
  );

  return(
    <div style={{minHeight:"100vh",background:"#F4F6FA",fontFamily:"'IBM Plex Sans','Hiragino Kaku Gothic ProN',sans-serif",color:"#1A1F36"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#F4F6FA;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#ccc;border-radius:2px;}
        .task-card:hover{background:#F5F8FF!important;}
        .task-card:active{transform:scale(0.985);}
        .nav-btn{transition:all 0.12s;cursor:pointer;border:none;text-align:left;}
        .nav-btn:hover{background:rgba(255,255,255,0.13)!important;}
        .tab-btn:active{opacity:0.65;}
        .modal-overlay{animation:fi 0.18s ease;}
        .modal-box{animation:su-c 0.2s ease;}
        .sheet-box{animation:su-b 0.25s cubic-bezier(0.32,0.72,0,1);}
        @keyframes fi{from{opacity:0}to{opacity:1}}
        @keyframes su-c{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes su-b{from{transform:translateY(100%)}to{transform:translateY(0)}}
        select,input{-webkit-appearance:none;}
        input:focus,select:focus{border-color:#1B3A6B!important;box-shadow:0 0 0 3px rgba(27,58,107,0.1);outline:none;}
        .fab{transition:transform 0.1s,box-shadow 0.1s;}
        .fab:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(27,58,107,0.4)!important;}
        .fab:active{transform:scale(0.92);}
        button{font-family:inherit;}
      `}</style>

      {/* ── PC ── */}
      {!isMobile&&(
        <div style={{display:"flex",minHeight:"100vh"}}>
          <div style={{width:220,background:"#1B3A6B",display:"flex",flexDirection:"column",flexShrink:0,minHeight:"100vh"}}>
            <div style={{padding:"24px 20px 16px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
              <div style={{color:"#fff",fontWeight:800,fontSize:12,letterSpacing:"0.1em"}}>TASK MANAGER</div>
              <div style={{color:"rgba(255,255,255,0.38)",fontSize:10,marginTop:3,fontFamily:"monospace"}}>{todayStr}</div>
            </div>
            <nav style={{flex:1,padding:"12px 8px"}}>
              {TABS.map(t=>{
                const active=tab===t.id; const b=badge(t.id);
                return(
                  <button key={t.id} className="nav-btn" onClick={()=>setTab(t.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"10px 12px",borderRadius:8,background:active?"rgba(255,255,255,0.16)":"transparent",color:active?"#fff":"rgba(255,255,255,0.5)",fontSize:13,fontWeight:active?700:400,marginBottom:2}}>
                    <span style={{fontSize:14,width:18,textAlign:"center"}}>{t.icon}</span>
                    <span style={{flex:1}}>{t.label}</span>
                    {b>0&&<span style={{fontSize:10,fontWeight:700,background:active?"rgba(255,255,255,0.22)":"rgba(255,255,255,0.1)",color:"#fff",padding:"1px 7px",borderRadius:10}}>{b}</span>}
                  </button>
                );
              })}
            </nav>
            <div style={{padding:"14px 10px 24px"}}>
              <button onClick={()=>openAdd(tab==="home"||tab==="calendar"?"daily":tab)} style={{width:"100%",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:8,padding:"10px",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.04em"}}>＋ タスク追加</button>
            </div>
          </div>
          <div style={{flex:1,overflow:"auto"}}>
            <div style={{background:"#fff",padding:"14px 32px",borderBottom:"1px solid #ECEEF2",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50}}>
              <div style={{fontSize:16,fontWeight:800,color:"#1A1F36"}}>{TABS.find(t=>t.id===tab)?.label}{!["home","calendar"].includes(tab)?"タスク":""}</div>
              {todayUndone>0&&tab==="home"&&<div style={{background:"#1B3A6B",color:"#fff",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700}}>残り {todayUndone} 件</div>}
            </div>
            <div style={{maxWidth:720,margin:"0 auto",padding:"28px 32px"}}>{content}</div>
          </div>
        </div>
      )}

      {/* ── Mobile ── */}
      {isMobile&&(
        <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",display:"flex",flexDirection:"column"}}>
          <div style={{background:"#fff",padding:"16px 20px 12px",position:"sticky",top:0,zIndex:100,borderBottom:"1px solid #F0F2F5",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9AA3AF",letterSpacing:"0.06em"}}>{TODAY.toLocaleDateString("ja-JP",{year:"numeric",month:"long",day:"numeric"})}</div>
              <div style={{fontSize:19,fontWeight:800,color:"#1A1F36"}}>{TABS.find(t=>t.id===tab)?.label}{!["home","calendar"].includes(tab)?"タスク":""}</div>
            </div>
            {todayUndone>0&&tab==="home"&&<div style={{background:"#1B3A6B",color:"#fff",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:700}}>残り{todayUndone}件</div>}
          </div>
          <div style={{flex:1,padding:"16px 16px 110px",overflowY:"auto"}}>{content}</div>
          <button className="fab" onClick={()=>openAdd(tab==="home"||tab==="calendar"?"daily":tab)} style={{position:"fixed",bottom:82,right:20,width:54,height:54,borderRadius:16,background:"#1B3A6B",color:"#fff",border:"none",fontSize:26,cursor:"pointer",boxShadow:"0 4px 20px rgba(27,58,107,0.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>+</button>
          <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderTop:"1px solid #F0F2F5",display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,6px)"}}>
            {TABS.map(t=>{
              const active=tab===t.id; const b=badge(t.id);
              return(
                <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 2px 8px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,position:"relative"}}>
                  <div style={{position:"relative"}}>
                    <span style={{fontSize:17,lineHeight:1}}>{t.icon}</span>
                    {b>0&&<span style={{position:"absolute",top:-4,right:-7,background:active?"#1B3A6B":"#E74C3C",color:"#fff",borderRadius:10,fontSize:9,fontWeight:800,padding:"1px 5px",lineHeight:1.4}}>{b}</span>}
                  </div>
                  <span style={{fontSize:9,fontWeight:active?800:500,color:active?"#1B3A6B":"#9AA3AF"}}>{t.label}</span>
                  {active&&<div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",width:20,height:3,background:"#1B3A6B",borderRadius:"3px 3px 0 0"}}/>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {modal&&<TaskModal initial={modal.task} defaultType={modal.defaultType} onSave={saveTask} onDelete={deleteTask} onClose={()=>setModal(null)} isMobile={isMobile}/>}
    </div>
  );
}