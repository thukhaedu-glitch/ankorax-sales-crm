import{useState,useEffect}from'react'
import{db,auth}from'../firebase'
import{collection,getDocs,addDoc,updateDoc,deleteDoc,doc}from'firebase/firestore'
import Layout from'../components/Layout'
import{Plus,X,Save,Trash2,Edit,Calendar,CheckCircle,Clock,AlertCircle,Search}from'lucide-react'

const PRIORITIES=['Low','Medium','High','Critical']
const PRIORITY_COLORS={Low:'#64748b',Medium:'#4F6EF7',High:'#d97706',Critical:'#dc2626'}
const PRIORITY_BG={Low:'#f1f5f9',Medium:'rgba(79,110,247,0.1)',High:'rgba(217,119,6,0.1)',Critical:'rgba(220,38,38,0.1)'}
const TYPES=['Call','Email','Meeting','Demo','Follow-up','Other']

export default function FollowUps(){
const[followUps,setFollowUps]=useState([])
const[clients,setClients]=useState([])
const[leads,setLeads]=useState([])
const[loading,setLoading]=useState(true)
const[search,setSearch]=useState('')
const[filterType,setFilterType]=useState('upcoming') // upcoming/today/done/all
const[modal,setModal]=useState(false)
const[selected,setSelected]=useState(null)
const[saving,setSaving]=useState(false)
const[form,setForm]=useState({
type:'Call',
date:new Date().toISOString().split('T')[0],
time:'09:00',
linkedTo:'',
linkedType:'lead',
linkedName:'',
note:'',
priority:'Medium',
done:false,
})

const today=new Date().toISOString().split('T')[0]

useEffect(()=>{
const load=async()=>{
try{
const[fSnap,cSnap,lSnap]=await Promise.all([
getDocs(collection(db,'followUps')),
getDocs(collection(db,'crmClients')),
getDocs(collection(db,'leads')),
])
setFollowUps(fSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.date||'').localeCompare(b.date||'')))
setClients(cSnap.docs.map(d=>({id:d.id,...d.data()})))
setLeads(lSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

const openAdd=()=>{
setForm({type:'Call',date:today,time:'09:00',linkedTo:'',linkedType:'lead',linkedName:'',note:'',priority:'Medium',done:false})
setSelected(null)
setModal(true)
}

const openEdit=(f)=>{
setForm({
type:f.type||'Call',date:f.date||today,time:f.time||'09:00',
linkedTo:f.linkedTo||'',linkedType:f.linkedType||'lead',linkedName:f.linkedName||'',
note:f.note||'',priority:f.priority||'Medium',done:f.done||false,
})
setSelected(f)
setModal(true)
}

const handleSave=async()=>{
if(!form.date){alert('Date required');return}
setSaving(true)
try{
if(!selected){
await addDoc(collection(db,'followUps'),{
...form,
createdAt:new Date().toISOString(),
createdBy:auth.currentUser.uid,
})
const snap=await getDocs(collection(db,'followUps'))
setFollowUps(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.date||'').localeCompare(b.date||'')))
}else{
await updateDoc(doc(db,'followUps',selected.id),{...form,updatedAt:new Date().toISOString()})
setFollowUps(prev=>prev.map(f=>f.id===selected.id?{...f,...form}:f))
}
setModal(false)
}catch(e){alert(e.message)}
setSaving(false)
}

const handleDelete=async(id)=>{
if(!confirm('Delete this follow-up?'))return
await deleteDoc(doc(db,'followUps',id))
setFollowUps(prev=>prev.filter(f=>f.id!==id))
}

const toggleDone=async(f)=>{
await updateDoc(doc(db,'followUps',f.id),{done:!f.done,updatedAt:new Date().toISOString()})
setFollowUps(prev=>prev.map(x=>x.id===f.id?{...x,done:!x.done}:x))
}

const filtered=followUps.filter(f=>{
const matchSearch=f.linkedName?.toLowerCase().includes(search.toLowerCase())||f.note?.toLowerCase().includes(search.toLowerCase())
let matchType=true
if(filterType==='today')matchType=f.date===today&&!f.done
else if(filterType==='upcoming')matchType=f.date>=today&&!f.done
else if(filterType==='done')matchType=f.done
return matchSearch&&matchType
})

const overdueCount=followUps.filter(f=>!f.done&&f.date<today).length
const todayCount=followUps.filter(f=>!f.done&&f.date===today).length

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>

const linkedOptions=form.linkedType==='lead'?leads:clients

return(
<Layout title="Follow-ups">

{modal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'white'}}>
<div style={{fontWeight:600,fontSize:15}}>{selected?'Edit Follow-up':'New Follow-up'}</div>
<button type="button" onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24,display:'grid',gap:12}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Type</label>
<select className="form-input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
{TYPES.map(t=><option key={t}>{t}</option>)}
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Priority</label>
<select className="form-input" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
{PRIORITIES.map(p=><option key={p}>{p}</option>)}
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Date *</label>
<input className="form-input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Time</label>
<input className="form-input" type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))}/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Link to</label>
<select className="form-input" value={form.linkedType} onChange={e=>setForm(f=>({...f,linkedType:e.target.value,linkedTo:'',linkedName:''}))}>
<option value="lead">Lead</option>
<option value="client">Client</option>
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>{form.linkedType==='lead'?'Lead':'Client'}</label>
<select className="form-input" value={form.linkedTo} onChange={e=>{
const item=linkedOptions.find(x=>x.id===e.target.value)
setForm(f=>({...f,linkedTo:e.target.value,linkedName:item?.companyName||item?.name||''}))
}}>
<option value="">— Select —</option>
{linkedOptions.map(x=><option key={x.id} value={x.id}>{x.companyName||x.name}</option>)}
</select>
</div>
<div style={{gridColumn:'1/-1'}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Note</label>
<textarea className="form-input" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={3} placeholder="What to discuss..." style={{resize:'vertical'}}/>
</div>
</div>
<div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8}}>
<button type="button" onClick={()=>setModal(false)} className="btn btn-ghost">Cancel</button>
<button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
<Save size={14}/>{saving?'Saving...':selected?'Update':'Add'}
</button>
</div>
</div>
</div>
</div>
)}

{/* Banners */}
{overdueCount>0&&(
<div style={{background:'rgba(220,38,38,0.08)',border:'0.5px solid rgba(220,38,38,0.2)',borderRadius:12,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
<AlertCircle size={16} color="#dc2626"/>
<span style={{fontSize:13,fontWeight:500,color:'#dc2626'}}>{overdueCount} overdue follow-up{overdueCount>1?'s':''} — action needed!</span>
</div>
)}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
{[
{label:'Total',value:followUps.length,color:'#4F6EF7'},
{label:'Today',value:todayCount,color:'#d97706'},
{label:'Overdue',value:overdueCount,color:'#dc2626'},
{label:'Done',value:followUps.filter(f=>f.done).length,color:'#16a34a'},
].map(({label,value,color})=>(
<div key={label} className="card" style={{padding:14}}>
<div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>{label}</div>
<div style={{fontSize:20,fontWeight:700,color}}>{value}</div>
</div>
))}
</div>

{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,justifyContent:'space-between',flexWrap:'wrap'}}>
<div style={{display:'flex',gap:6,flexWrap:'wrap',flex:1}}>
{['upcoming','today','done','all'].map(t=>(
<button key={t} type="button" onClick={()=>setFilterType(t)} className="btn" style={{
fontSize:12,padding:'5px 14px',textTransform:'capitalize',
background:filterType===t?'var(--primary)':'white',
color:filterType===t?'white':'var(--text-2)',
border:`0.5px solid ${filterType===t?'var(--primary)':'var(--border)'}`,
}}>
{t}
</button>
))}
<div style={{position:'relative'}}>
<Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{paddingLeft:26,fontSize:12,width:160}}/>
</div>
</div>
<button type="button" onClick={openAdd} className="btn btn-primary"><Plus size={14}/>New Follow-up</button>
</div>

{/* List */}
<div style={{display:'grid',gap:10}}>
{filtered.length===0?(
<div className="card" style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>
<Calendar size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No follow-ups found</div>
</div>
):filtered.map(f=>{
const isOverdue=!f.done&&f.date<today
const isToday=f.date===today
return(
<div key={f.id} className="card" style={{padding:16,opacity:f.done?0.6:1,borderLeft:`3px solid ${isOverdue?'#dc2626':isToday?'#d97706':PRIORITY_COLORS[f.priority]}`}}>
<div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
<div style={{display:'flex',alignItems:'flex-start',gap:12,flex:1}}>
<button type="button" onClick={()=>toggleDone(f)} style={{
width:22,height:22,borderRadius:'50%',flexShrink:0,marginTop:1,
border:`2px solid ${f.done?'#16a34a':'#d1d5db'}`,
background:f.done?'#16a34a':'white',
display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
}}>
{f.done&&<span style={{color:'white',fontSize:12,fontWeight:700}}>✓</span>}
</button>
<div style={{flex:1}}>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap'}}>
<span style={{fontSize:13,fontWeight:600,color:f.done?'var(--text-3)':'var(--text-1)',textDecoration:f.done?'line-through':'none'}}>
{f.linkedName||'General'}
</span>
<span style={{background:'var(--primary-light)',color:'var(--primary)',fontSize:11,padding:'1px 7px',borderRadius:20,fontWeight:500}}>{f.type}</span>
<span style={{background:PRIORITY_BG[f.priority],color:PRIORITY_COLORS[f.priority],fontSize:10,padding:'1px 7px',borderRadius:20,fontWeight:600}}>{f.priority}</span>
{isOverdue&&<span style={{background:'rgba(220,38,38,0.1)',color:'#dc2626',fontSize:10,padding:'1px 7px',borderRadius:20,fontWeight:600}}>Overdue</span>}
{isToday&&!f.done&&<span style={{background:'rgba(217,119,6,0.1)',color:'#d97706',fontSize:10,padding:'1px 7px',borderRadius:20,fontWeight:600}}>Today</span>}
</div>
{f.note&&<div style={{fontSize:12,color:'var(--text-2)',marginBottom:4}}>{f.note}</div>}
<div style={{fontSize:11,color:'var(--text-3)',display:'flex',alignItems:'center',gap:4}}>
<Clock size={10}/>{f.date} {f.time&&`at ${f.time}`}
</div>
</div>
</div>
<div style={{display:'flex',gap:4,flexShrink:0}}>
<button type="button" onClick={()=>openEdit(f)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-2)',padding:4,borderRadius:6}}><Edit size={13}/></button>
<button type="button" onClick={()=>handleDelete(f.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4,borderRadius:6}}><Trash2 size={13}/></button>
</div>
</div>
</div>
)
})}
</div>

</Layout>
)
}
