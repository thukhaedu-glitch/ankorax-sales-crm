import{useState,useEffect}from'react'
import{db}from'../firebase'
import{collection,getDocs,updateDoc,doc,addDoc,query,orderBy,limit}from'firebase/firestore'
import Layout from'../components/Layout'
import{Search,Users,Eye,UserCheck,X,Save,Clock,Building,Calendar,Shield}from'lucide-react'

const PLANS=['Starter','Growth','Business']
const STATUS_COLORS={active:'#16a34a',expired:'#d97706',blocked:'#dc2626',hold:'#64748b'}
const STATUS_BG={active:'rgba(22,163,74,0.1)',expired:'rgba(217,119,6,0.1)',blocked:'rgba(220,38,38,0.1)',hold:'#f1f5f9'}

export default function UsersPage(){
const[companies,setCompanies]=useState([])
const[crmClients,setCrmClients]=useState([])
const[salesReps,setSalesReps]=useState([])
const[loading,setLoading]=useState(true)
const[search,setSearch]=useState('')
const[filterStatus,setFilterStatus]=useState('')
const[filterPlan,setFilterPlan]=useState('')
const[filterRep,setFilterRep]=useState('')
const[detailModal,setDetailModal]=useState(null)
const[auditLogs,setAuditLogs]=useState([])
const[assignModal,setAssignModal]=useState(null)
const[assignRepId,setAssignRepId]=useState('')
const[saving,setSaving]=useState(false)
const[noteText,setNoteText]=useState('')
const[notes,setNotes]=useState([])

useEffect(()=>{
const load=async()=>{
try{
const[compSnap,crmSnap,repSnap]=await Promise.all([
getDocs(collection(db,'companies')),
getDocs(collection(db,'crmClients')),
getDocs(collection(db,'salesReps')),
])
setCompanies(compSnap.docs.map(d=>({id:d.id,...d.data(),_source:'main'})))
setCrmClients(crmSnap.docs.map(d=>({id:d.id,...d.data(),_source:'crm'})))
setSalesReps(repSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

// Merge companies + crmClients
const allUsers=()=>{
const mainList=companies.map(c=>({
id:c.id,
companyName:c.companyName||c.name||'Unknown',
email:c.ownerEmail||c.email||'-',
plan:c.plan||'Starter',
status:c.subscriptionStatus||'active',
assignedTo:c.assignedTo||'',
assignedName:c.assignedName||'',
startDate:c.subscriptionStart||c.createdAt?.seconds?new Date(c.createdAt.seconds*1000).toISOString().split('T')[0]:'',
endDate:c.subscriptionEnd||'',
createdAt:c.createdAt?.seconds?new Date(c.createdAt.seconds*1000).toISOString():'',
lastLogin:c.lastLogin||'',
memberCount:Object.keys(c.members||{}).length,
_source:'main',
_raw:c,
}))

const crmList=crmClients.map(c=>({
id:c.id,
companyName:c.companyName||'Unknown',
email:c.email||'-',
plan:c.plan||'Starter',
status:c.status||'active',
assignedTo:c.assignedTo||'',
assignedName:c.assignedName||'',
startDate:c.startDate||'',
endDate:c.endDate||'',
createdAt:c.createdAt||'',
lastLogin:'-',
memberCount:1,
_source:'crm',
_raw:c,
}))

// Deduplicate by email
const seen=new Set()
const merged=[]
for(const u of[...mainList,...crmList]){
if(!seen.has(u.email)){
seen.add(u.email)
merged.push(u)
}
}
return merged.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
}

const filtered=allUsers().filter(u=>{
const matchSearch=u.companyName?.toLowerCase().includes(search.toLowerCase())||u.email?.toLowerCase().includes(search.toLowerCase())
const matchStatus=filterStatus?u.status===filterStatus:true
const matchPlan=filterPlan?u.plan===filterPlan:true
const matchRep=filterRep?u.assignedTo===filterRep:true
return matchSearch&&matchStatus&&matchPlan&&matchRep
})

const openDetail=async(user)=>{
setDetailModal(user)
setNoteText('')
// Load audit logs
try{
if(user._source==='main'){
const logSnap=await getDocs(collection(db,'companies',user.id,'auditLogs'))
const logs=logSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.timestamp?.seconds||0)-(a.timestamp?.seconds||0)).slice(0,20)
setAuditLogs(logs)
}else{
setAuditLogs([])
}
// Load notes
const noteSnap=await getDocs(collection(db,'userNotes',user.id,'notes'))
setNotes(noteSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')))
}catch(e){
setAuditLogs([])
setNotes([])
}
}

const handleAssign=async()=>{
if(!assignRepId||!assignModal)return
setSaving(true)
try{
const rep=salesReps.find(r=>r.id===assignRepId)
const collection_name=assignModal._source==='main'?'companies':'crmClients'
await updateDoc(doc(db,collection_name,assignModal.id),{
assignedTo:assignRepId,
assignedName:rep?.name||'',
updatedAt:new Date().toISOString(),
})
// Update local state
setCompanies(prev=>prev.map(c=>c.id===assignModal.id&&assignModal._source==='main'?{...c,assignedTo:assignRepId,assignedName:rep?.name||''}:c))
setCrmClients(prev=>prev.map(c=>c.id===assignModal.id&&assignModal._source==='crm'?{...c,assignedTo:assignRepId,assignedName:rep?.name||''}:c))
setAssignModal(null)
}catch(e){alert(e.message)}
setSaving(false)
}

const handleStatusChange=async(user,status)=>{
try{
const col=user._source==='main'?'companies':'crmClients'
const field=user._source==='main'?'subscriptionStatus':'status'
await updateDoc(doc(db,col,user.id),{[field]:status,updatedAt:new Date().toISOString()})
if(user._source==='main')setCompanies(prev=>prev.map(c=>c.id===user.id?{...c,subscriptionStatus:status}:c))
else setCrmClients(prev=>prev.map(c=>c.id===user.id?{...c,status}:c))
}catch(e){alert(e.message)}
}

const handleAddNote=async()=>{
if(!noteText.trim()||!detailModal)return
try{
const ref=await addDoc(collection(db,'userNotes',detailModal.id,'notes'),{
text:noteText,
createdAt:new Date().toISOString(),
createdBy:'admin',
})
setNotes(prev=>[{id:ref.id,text:noteText,createdAt:new Date().toISOString()},...prev])
setNoteText('')
}catch(e){alert(e.message)}
}

const fmtDate=(d)=>{
if(!d)return'-'
try{return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
catch{return d}
}

const fmtDateTime=(ts)=>{
if(!ts)return'-'
try{
const d=ts.seconds?new Date(ts.seconds*1000):new Date(ts)
return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
}catch{return'-'}
}

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>

const stats={
total:allUsers().length,
active:allUsers().filter(u=>u.status==='active').length,
expired:allUsers().filter(u=>u.status==='expired').length,
blocked:allUsers().filter(u=>u.status==='blocked').length,
}

return(
<Layout title="Users">

{/* Assign Modal */}
{assignModal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontWeight:600,fontSize:15}}>Assign Sales Rep</div>
<button type="button" onClick={()=>setAssignModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24}}>
<div style={{marginBottom:8,fontSize:13,color:'var(--text-2)'}}>
Company: <strong>{assignModal.companyName}</strong>
</div>
{assignModal.assignedName&&(
<div style={{marginBottom:12,fontSize:12,color:'var(--text-3)'}}>
Current: {assignModal.assignedName}
</div>
)}
<select className="form-input" value={assignRepId} onChange={e=>setAssignRepId(e.target.value)} style={{marginBottom:16}}>
<option value="">— Select Rep —</option>
{salesReps.filter(r=>r.active!==false).map(r=>(
<option key={r.id} value={r.id}>{r.name} ({r.role})</option>
))}
</select>
<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
<button type="button" onClick={()=>setAssignModal(null)} className="btn btn-ghost">Cancel</button>
<button type="button" onClick={handleAssign} disabled={saving||!assignRepId} className="btn btn-primary">
<Save size={14}/>{saving?'Saving...':'Assign'}
</button>
</div>
</div>
</div>
</div>
)}

{/* Detail Modal */}
{detailModal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:680,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'white',zIndex:1}}>
<div style={{fontWeight:600,fontSize:15,display:'flex',alignItems:'center',gap:8}}>
<Building size={16} color="var(--primary)"/>
{detailModal.companyName}
</div>
<button type="button" onClick={()=>setDetailModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24}}>

{/* Info Grid */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
{[
{label:'Email',value:detailModal.email},
{label:'Plan',value:detailModal.plan},
{label:'Status',value:detailModal.status},
{label:'Assigned Rep',value:detailModal.assignedName||'Unassigned'},
{label:'Start Date',value:fmtDate(detailModal.startDate)},
{label:'End Date',value:fmtDate(detailModal.endDate)},
{label:'Created',value:fmtDate(detailModal.createdAt)},
{label:'Members',value:detailModal.memberCount},
{label:'Source',value:detailModal._source==='main'?'Main App':'CRM'},
{label:'Last Login',value:fmtDate(detailModal.lastLogin)},
].map(({label,value})=>(
<div key={label} style={{background:'#f8fafc',borderRadius:8,padding:'10px 12px'}}>
<div style={{fontSize:10,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',marginBottom:3}}>{label}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--text-1)'}}>{String(value||'-')}</div>
</div>
))}
</div>

{/* Notes */}
<div style={{marginBottom:20}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
<Shield size={14} color="var(--primary)"/>Notes
</div>
<div style={{display:'flex',gap:8,marginBottom:10}}>
<input className="form-input" value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add note..." style={{flex:1,fontSize:12}} onKeyDown={e=>e.key==='Enter'&&handleAddNote()}/>
<button type="button" onClick={handleAddNote} className="btn btn-primary" style={{fontSize:12,padding:'6px 14px'}}>Add</button>
</div>
{notes.length===0?(
<div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:12}}>No notes yet</div>
):notes.map(n=>(
<div key={n.id} style={{padding:'8px 12px',background:'#f8fafc',borderRadius:8,marginBottom:6,fontSize:12}}>
<div style={{color:'var(--text-1)',marginBottom:2}}>{n.text}</div>
<div style={{fontSize:10,color:'var(--text-3)'}}>{fmtDate(n.createdAt)}</div>
</div>
))}
</div>

{/* Audit Log */}
<div>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
<Clock size={14} color="var(--primary)"/>Activity History
</div>
{auditLogs.length===0?(
<div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:16,background:'#f8fafc',borderRadius:8}}>
{detailModal._source==='crm'?'CRM client — no activity log':'No activity yet'}
</div>
):auditLogs.map(log=>(
<div key={log.id} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'0.5px solid #f1f5f9'}}>
<div style={{width:8,height:8,borderRadius:'50%',background:'var(--primary)',flexShrink:0,marginTop:5}}/>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:500,color:'var(--text-1)'}}>{log.description}</div>
<div style={{fontSize:10,color:'var(--text-3)',marginTop:2,display:'flex',gap:8}}>
<span>{fmtDateTime(log.timestamp)}</span>
<span>{log.userEmail}</span>
</div>
</div>
</div>
))}
</div>

</div>
</div>
</div>
)}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
{[
{label:'Total Users',value:stats.total,color:'#4F6EF7'},
{label:'Active',value:stats.active,color:'#16a34a'},
{label:'Expired',value:stats.expired,color:'#d97706'},
{label:'Blocked',value:stats.blocked,color:'#dc2626'},
].map(({label,value,color})=>(
<div key={label} className="card" style={{padding:16}}>
<div style={{fontSize:11,color:'var(--text-3)',marginBottom:6}}>{label}</div>
<div style={{fontSize:20,fontWeight:700,color}}>{value}</div>
</div>
))}
</div>

{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,justifyContent:'space-between',flexWrap:'wrap'}}>
<div style={{display:'flex',gap:8,flex:1,flexWrap:'wrap'}}>
<div style={{position:'relative',minWidth:200}}>
<Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or email..." style={{paddingLeft:26,fontSize:12}}/>
</div>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
<option value="">All Status</option>
{['active','expired','blocked','hold'].map(s=><option key={s} value={s} style={{textTransform:'capitalize'}}>{s}</option>)}
</select>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterPlan} onChange={e=>setFilterPlan(e.target.value)}>
<option value="">All Plans</option>
{PLANS.map(p=><option key={p}>{p}</option>)}
</select>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterRep} onChange={e=>setFilterRep(e.target.value)}>
<option value="">All Reps</option>
{salesReps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
</select>
</div>
</div>

{/* Table */}
<div className="card" style={{overflow:'hidden',width:'100%'}}>
{filtered.length===0?(
<div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>
<Users size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No users found</div>
</div>
):(
<div style={{overflowX:'auto'}}>
<table style={{width:'100%'}}>
<thead>
<tr>
<th>Company</th>
<th>Email</th>
<th>Plan</th>
<th>Assigned Rep</th>
<th>Start</th>
<th>End</th>
<th style={{textAlign:'center'}}>Status</th>
<th style={{textAlign:'center'}}>Actions</th>
</tr>
</thead>
<tbody>
{filtered.map(u=>(
<tr key={u.id+u._source}>
<td>
<div style={{fontWeight:500}}>{u.companyName}</div>
<div style={{fontSize:10,background:u._source==='main'?'rgba(79,110,247,0.1)':'rgba(22,163,74,0.1)',color:u._source==='main'?'#4F6EF7':'#16a34a',padding:'1px 6px',borderRadius:20,display:'inline-block',marginTop:2}}>{u._source==='main'?'Main App':'CRM'}</div>
</td>
<td style={{fontSize:12,color:'var(--text-2)'}}>{u.email}</td>
<td>
<span style={{background:'var(--primary-light)',color:'var(--primary)',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>{u.plan}</span>
</td>
<td>
{u.assignedName?(
<span style={{fontSize:12,fontWeight:500}}>{u.assignedName}</span>
):(
<span style={{fontSize:11,color:'var(--text-3)'}}>Unassigned</span>
)}
</td>
<td style={{fontSize:12,color:'var(--text-3)'}}>{fmtDate(u.startDate)}</td>
<td style={{fontSize:12,color:u.endDate&&u.endDate<new Date().toISOString().split('T')[0]?'#dc2626':'var(--text-3)'}}>{fmtDate(u.endDate)}</td>
<td style={{textAlign:'center'}}>
<select value={u.status} onChange={e=>handleStatusChange(u,e.target.value)} style={{
background:STATUS_BG[u.status]||'#f1f5f9',
color:STATUS_COLORS[u.status]||'#64748b',
border:'none',borderRadius:20,padding:'3px 8px',
fontSize:11,fontWeight:600,cursor:'pointer',outline:'none',textTransform:'capitalize',
}}>
{['active','expired','blocked','hold'].map(s=><option key={s} value={s}>{s}</option>)}
</select>
</td>
<td style={{textAlign:'center'}}>
<div style={{display:'flex',gap:4,justifyContent:'center'}}>
<button type="button" onClick={()=>{setAssignModal(u);setAssignRepId(u.assignedTo||'')}} title="Assign Rep" style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)',padding:4,borderRadius:6}}>
<UserCheck size={14}/>
</button>
<button type="button" onClick={()=>openDetail(u)} title="View Detail" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-2)',padding:4,borderRadius:6}}>
<Eye size={14}/>
</button>
</div>
</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</div>

</Layout>
)
}
