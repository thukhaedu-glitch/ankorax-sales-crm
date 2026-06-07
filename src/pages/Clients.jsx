import{useState,useEffect}from'react'
import{db,auth}from'../firebase'
import{collection,getDocs,addDoc,updateDoc,deleteDoc,doc,setDoc}from'firebase/firestore'
import Layout from'../components/Layout'
import{Plus,X,Save,Trash2,Edit,Search,Users,Eye,Copy,CheckCircle}from'lucide-react'

const PLANS=['Starter','Growth','Business']
const PLAN_PRICES={Starter:49900,Growth:69900,Business:89900}
const STATUS_COLORS={active:'#16a34a',expired:'#d97706',blocked:'#dc2626',hold:'#64748b'}
const STATUS_BG={active:'rgba(22,163,74,0.1)',expired:'rgba(217,119,6,0.1)',blocked:'rgba(220,38,38,0.1)',hold:'#f1f5f9'}

export default function Clients(){
const[clients,setClients]=useState([])
const[salesReps,setSalesReps]=useState([])
const[loading,setLoading]=useState(true)
const[search,setSearch]=useState('')
const[filterStatus,setFilterStatus]=useState('')
const[filterPlan,setFilterPlan]=useState('')
const[modal,setModal]=useState(null)
const[selected,setSelected]=useState(null)
const[saving,setSaving]=useState(false)
const[copied,setCopied]=useState(null)
const[form,setForm]=useState({
companyName:'',contactName:'',email:'',phone:'',
plan:'Starter',status:'active',
startDate:new Date().toISOString().split('T')[0],
endDate:'',assignedTo:'',assignedName:'',
note:'',createAccount:true,
})

useEffect(()=>{
const load=async()=>{
try{
const[cSnap,rSnap]=await Promise.all([
getDocs(collection(db,'crmClients')),
getDocs(collection(db,'salesReps')),
])
setClients(cSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')))
setSalesReps(rSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

const openAdd=()=>{
setForm({
companyName:'',contactName:'',email:'',phone:'',
plan:'Starter',status:'active',
startDate:new Date().toISOString().split('T')[0],
endDate:'',assignedTo:'',assignedName:'',
note:'',createAccount:true,
})
setSelected(null)
setModal(true)
}

const openEdit=(c)=>{
setForm({
companyName:c.companyName||'',contactName:c.contactName||'',
email:c.email||'',phone:c.phone||'',
plan:c.plan||'Starter',status:c.status||'active',
startDate:c.startDate||'',endDate:c.endDate||'',
assignedTo:c.assignedTo||'',assignedName:c.assignedName||'',
note:c.note||'',createAccount:false,
})
setSelected(c)
setModal(true)
}

const handleSave=async()=>{
if(!form.companyName||!form.email){alert('Company name and email required');return}
setSaving(true)
try{
if(!selected){
// Create client record
const clientRef=await addDoc(collection(db,'crmClients'),{
...form,
planPrice:PLAN_PRICES[form.plan],
createdAt:new Date().toISOString(),
createdBy:auth.currentUser.uid,
})

// Create Firebase Auth account if checked
if(form.createAccount){
// Store pending account creation
await addDoc(collection(db,'pendingAccounts'),{
email:form.email,
companyName:form.companyName,
plan:form.plan,
clientId:clientRef.id,
createdAt:new Date().toISOString(),
status:'pending',
})
}

const snap=await getDocs(collection(db,'crmClients'))
setClients(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')))
}else{
await updateDoc(doc(db,'crmClients',selected.id),{
...form,planPrice:PLAN_PRICES[form.plan],
updatedAt:new Date().toISOString(),
})
setClients(prev=>prev.map(c=>c.id===selected.id?{...c,...form,planPrice:PLAN_PRICES[form.plan]}:c))
}
setModal(null)
}catch(e){alert(e.message)}
setSaving(false)
}

const handleDelete=async(id)=>{
if(!confirm('Delete this client?'))return
await deleteDoc(doc(db,'crmClients',id))
setClients(prev=>prev.filter(c=>c.id!==id))
}

const handleStatusChange=async(id,status)=>{
await updateDoc(doc(db,'crmClients',id),{status,updatedAt:new Date().toISOString()})
setClients(prev=>prev.map(c=>c.id===id?{...c,status}:c))
}

const copyEmail=(email)=>{
navigator.clipboard.writeText(email)
setCopied(email)
setTimeout(()=>setCopied(null),2000)
}

const filtered=clients.filter(c=>{
const matchSearch=c.companyName?.toLowerCase().includes(search.toLowerCase())||c.contactName?.toLowerCase().includes(search.toLowerCase())||c.email?.toLowerCase().includes(search.toLowerCase())
const matchStatus=filterStatus?c.status===filterStatus:true
const matchPlan=filterPlan?c.plan===filterPlan:true
return matchSearch&&matchStatus&&matchPlan
})

const activeClients=clients.filter(c=>c.status==='active')
const totalMRR=activeClients.reduce((s,c)=>s+Number(c.planPrice||0),0)

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>

return(
<Layout title="Clients">

{modal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:540,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'white'}}>
<div style={{fontWeight:600,fontSize:15}}>{selected?'Edit Client':'New Client'}</div>
<button type="button" onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24,display:'grid',gap:12}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1/-1'}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Company Name *</label>
<input className="form-input" value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} placeholder="Company name..."/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Contact Name</label>
<input className="form-input" value={form.contactName} onChange={e=>setForm(f=>({...f,contactName:e.target.value}))} placeholder="Name..."/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Email *</label>
<input className="form-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@..."/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Phone</label>
<input className="form-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="09..."/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Plan</label>
<select className="form-input" value={form.plan} onChange={e=>setForm(f=>({...f,plan:e.target.value}))}>
{PLANS.map(p=><option key={p} value={p}>{p} — {PLAN_PRICES[p].toLocaleString()} MMK/mo</option>)}
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Status</label>
<select className="form-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
{['active','expired','blocked','hold'].map(s=><option key={s} value={s} style={{textTransform:'capitalize'}}>{s}</option>)}
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Start Date</label>
<input className="form-input" type="date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>End Date</label>
<input className="form-input" type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Assign To</label>
<select className="form-input" value={form.assignedTo} onChange={e=>{
const rep=salesReps.find(r=>r.id===e.target.value)
setForm(f=>({...f,assignedTo:e.target.value,assignedName:rep?.name||''}))
}}>
<option value="">— Unassigned —</option>
{salesReps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
</select>
</div>
<div style={{gridColumn:'1/-1'}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Note</label>
<textarea className="form-input" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2} style={{resize:'vertical'}}/>
</div>
{!selected&&(
<div style={{gridColumn:'1/-1',padding:12,background:'rgba(79,110,247,0.06)',borderRadius:8,display:'flex',alignItems:'center',gap:10}}>
<input type="checkbox" checked={form.createAccount} onChange={e=>setForm(f=>({...f,createAccount:e.target.checked}))} id="createAcc" style={{width:16,height:16}}/>
<label htmlFor="createAcc" style={{fontSize:13,cursor:'pointer',color:'var(--text-1)'}}>
Create AnkoraX account for this client
<div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>Pending account ကို admin panel မှာ approve လုပ်ရမည်</div>
</label>
</div>
)}
</div>
<div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8}}>
<button type="button" onClick={()=>setModal(null)} className="btn btn-ghost">Cancel</button>
<button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
<Save size={14}/>{saving?'Saving...':selected?'Update':'Add Client'}
</button>
</div>
</div>
</div>
</div>
)}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
{[
{label:'Total Clients',value:clients.length,color:'#4F6EF7'},
{label:'Active',value:activeClients.length,color:'#16a34a'},
{label:'Expired/Hold',value:clients.filter(c=>c.status==='expired'||c.status==='hold').length,color:'#d97706'},
{label:'MRR',value:`${totalMRR.toLocaleString()} Ks`,color:'#8b5cf6'},
].map(({label,value,color})=>(
<div key={label} className="card" style={{padding:16}}>
<div style={{fontSize:11,color:'var(--text-3)',marginBottom:6}}>{label}</div>
<div style={{fontSize:18,fontWeight:700,color}}>{value}</div>
</div>
))}
</div>

{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,justifyContent:'space-between',flexWrap:'wrap'}}>
<div style={{display:'flex',gap:8,flex:1,flexWrap:'wrap'}}>
<div style={{position:'relative',minWidth:180}}>
<Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search clients..." style={{paddingLeft:26,fontSize:12}}/>
</div>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
<option value="">All Status</option>
{['active','expired','blocked','hold'].map(s=><option key={s} value={s} style={{textTransform:'capitalize'}}>{s}</option>)}
</select>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterPlan} onChange={e=>setFilterPlan(e.target.value)}>
<option value="">All Plans</option>
{PLANS.map(p=><option key={p}>{p}</option>)}
</select>
</div>
<button type="button" onClick={openAdd} className="btn btn-primary"><Plus size={14}/>New Client</button>
</div>

{/* Table */}
<div className="card" style={{overflow:'hidden'}}>
{filtered.length===0?(
<div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>
<Users size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No clients found</div>
</div>
):(
<table>
<thead>
<tr>
<th>Company</th><th>Contact</th><th>Plan</th><th>Assigned</th>
<th>Start</th><th>End</th>
<th style={{textAlign:'center'}}>Status</th>
<th style={{textAlign:'center'}}>Actions</th>
</tr>
</thead>
<tbody>
{filtered.map(c=>(
<tr key={c.id}>
<td>
<div style={{fontWeight:500}}>{c.companyName}</div>
<div style={{fontSize:11,color:'var(--text-3)'}}>{c.createdAt?.slice(0,10)}</div>
</td>
<td>
<div style={{fontSize:12}}>{c.contactName||'-'}</div>
<div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text-3)'}}>
{c.email}
<button type="button" onClick={()=>copyEmail(c.email)} style={{background:'none',border:'none',cursor:'pointer',color:copied===c.email?'#16a34a':'var(--text-3)',padding:2}}>
{copied===c.email?<CheckCircle size={10}/>:<Copy size={10}/>}
</button>
</div>
</td>
<td>
<span style={{background:'var(--primary-light)',color:'var(--primary)',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>{c.plan}</span>
<div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{Number(c.planPrice||0).toLocaleString()} Ks/mo</div>
</td>
<td style={{fontSize:12,color:'var(--text-2)'}}>{c.assignedName||'-'}</td>
<td style={{fontSize:12,color:'var(--text-3)'}}>{c.startDate||'-'}</td>
<td style={{fontSize:12,color:c.endDate&&c.endDate<new Date().toISOString().split('T')[0]?'#dc2626':'var(--text-3)'}}>{c.endDate||'-'}</td>
<td style={{textAlign:'center'}}>
<select value={c.status} onChange={e=>handleStatusChange(c.id,e.target.value)} style={{
background:STATUS_BG[c.status],color:STATUS_COLORS[c.status],
border:'none',borderRadius:20,padding:'3px 8px',fontSize:11,fontWeight:600,cursor:'pointer',outline:'none',textTransform:'capitalize'
}}>
{['active','expired','blocked','hold'].map(s=><option key={s} value={s}>{s}</option>)}
</select>
</td>
<td style={{textAlign:'center'}}>
<div style={{display:'flex',gap:4,justifyContent:'center'}}>
<button type="button" onClick={()=>openEdit(c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-2)',padding:4,borderRadius:6}}><Edit size={14}/></button>
<button type="button" onClick={()=>handleDelete(c.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4,borderRadius:6}}><Trash2 size={14}/></button>
</div>
</td>
</tr>
))}
</tbody>
</table>
)}
</div>
</Layout>
)
}
