import{useState,useEffect}from'react'
import{db,auth}from'../firebase'
import{collection,getDocs,addDoc,updateDoc,deleteDoc,doc,serverTimestamp}from'firebase/firestore'
import Layout from'../components/Layout'
import{Plus,X,Save,Trash2,Edit,Search,Target,Phone,Mail,DollarSign}from'lucide-react'

const STATUSES=['New','Contacted','Demo','Negotiating','Won','Lost']
const STATUS_COLORS={New:'#4F6EF7',Contacted:'#06b6d4',Demo:'#8b5cf6',Negotiating:'#d97706',Won:'#16a34a',Lost:'#dc2626'}
const STATUS_BG={New:'rgba(79,110,247,0.1)',Contacted:'rgba(6,182,212,0.1)',Demo:'rgba(139,92,246,0.1)',Negotiating:'rgba(217,119,6,0.1)',Won:'rgba(22,163,74,0.1)',Lost:'rgba(220,38,38,0.1)'}

export default function Leads(){
const[leads,setLeads]=useState([])
const[salesReps,setSalesReps]=useState([])
const[loading,setLoading]=useState(true)
const[search,setSearch]=useState('')
const[filterStatus,setFilterStatus]=useState('')
const[modal,setModal]=useState(null)
const[selected,setSelected]=useState(null)
const[saving,setSaving]=useState(false)
const[form,setForm]=useState({
companyName:'',contactName:'',phone:'',email:'',
status:'New',dealValue:0,source:'',note:'',
assignedTo:'',assignedName:'',
})

useEffect(()=>{
const load=async()=>{
try{
const[lSnap,rSnap]=await Promise.all([
getDocs(collection(db,'leads')),
getDocs(collection(db,'salesReps')),
])
setLeads(lSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')))
setSalesReps(rSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

const openAdd=()=>{
setForm({companyName:'',contactName:'',phone:'',email:'',status:'New',dealValue:0,source:'',note:'',assignedTo:'',assignedName:''})
setSelected(null)
setModal(true)
}

const openEdit=(l)=>{
setForm({
companyName:l.companyName||'',contactName:l.contactName||'',
phone:l.phone||'',email:l.email||'',status:l.status||'New',
dealValue:l.dealValue||0,source:l.source||'',note:l.note||'',
assignedTo:l.assignedTo||'',assignedName:l.assignedName||'',
})
setSelected(l)
setModal(true)
}

const handleSave=async()=>{
if(!form.companyName){alert('Company name required');return}
setSaving(true)
try{
if(!selected){
await addDoc(collection(db,'leads'),{
...form,dealValue:Number(form.dealValue),
createdAt:new Date().toISOString(),
createdBy:auth.currentUser.uid,
})
const snap=await getDocs(collection(db,'leads'))
setLeads(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')))
}else{
await updateDoc(doc(db,'leads',selected.id),{...form,dealValue:Number(form.dealValue),updatedAt:new Date().toISOString()})
setLeads(prev=>prev.map(l=>l.id===selected.id?{...l,...form,dealValue:Number(form.dealValue)}:l))
}
setModal(null)
}catch(e){alert(e.message)}
setSaving(false)
}

const handleDelete=async(id)=>{
if(!confirm('Delete this lead?'))return
await deleteDoc(doc(db,'leads',id))
setLeads(prev=>prev.filter(l=>l.id!==id))
}

const handleStatusChange=async(id,status)=>{
await updateDoc(doc(db,'leads',id),{status,updatedAt:new Date().toISOString()})
setLeads(prev=>prev.map(l=>l.id===id?{...l,status}:l))
}

const filtered=leads.filter(l=>{
const matchSearch=l.companyName?.toLowerCase().includes(search.toLowerCase())||l.contactName?.toLowerCase().includes(search.toLowerCase())
const matchStatus=filterStatus?l.status===filterStatus:true
return matchSearch&&matchStatus
})

const totalValue=filtered.reduce((s,l)=>s+Number(l.dealValue||0),0)
const wonValue=filtered.filter(l=>l.status==='Won').reduce((s,l)=>s+Number(l.dealValue||0),0)

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>

return(
<Layout title="Leads">

{modal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:520,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'white'}}>
<div style={{fontWeight:600,fontSize:15}}>{selected?'Edit Lead':'New Lead'}</div>
<button type="button" onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24,display:'grid',gap:12}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1/-1'}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Company Name *</label>
<input className="form-input" value={form.companyName} onChange={e=>setForm(f=>({...f,companyName:e.target.value}))} placeholder="Company..."/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Contact Name</label>
<input className="form-input" value={form.contactName} onChange={e=>setForm(f=>({...f,contactName:e.target.value}))} placeholder="Name..."/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Phone</label>
<input className="form-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="09..."/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Email</label>
<input className="form-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@..."/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Status</label>
<select className="form-input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
{STATUSES.map(s=><option key={s}>{s}</option>)}
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Deal Value (Ks)</label>
<input className="form-input" type="number" value={form.dealValue} onChange={e=>setForm(f=>({...f,dealValue:e.target.value}))} style={{textAlign:'right'}}/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Source</label>
<select className="form-input" value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))}>
<option value="">— Select —</option>
{['Referral','Social Media','Cold Call','Website','Event','Other'].map(s=><option key={s}>{s}</option>)}
</select>
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
<textarea className="form-input" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Notes..." rows={3} style={{resize:'vertical'}}/>
</div>
</div>
<div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8}}>
<button type="button" onClick={()=>setModal(null)} className="btn btn-ghost">Cancel</button>
<button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
<Save size={14}/>{saving?'Saving...':selected?'Update':'Add Lead'}
</button>
</div>
</div>
</div>
</div>
)}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
{STATUSES.slice(0,4).map(s=>(
<div key={s} className="card" style={{padding:14}}>
<div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>{s}</div>
<div style={{fontSize:20,fontWeight:700,color:STATUS_COLORS[s]}}>{leads.filter(l=>l.status===s).length}</div>
</div>
))}
</div>

<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
<div className="card" style={{padding:14,background:'linear-gradient(135deg,#4F6EF7,#7C3AED)',color:'white'}}>
<div style={{fontSize:11,opacity:0.8,marginBottom:4}}>Total Pipeline Value</div>
<div style={{fontSize:18,fontWeight:700}}>{totalValue.toLocaleString()} Ks</div>
</div>
<div className="card" style={{padding:14,background:'linear-gradient(135deg,#16a34a,#059669)',color:'white'}}>
<div style={{fontSize:11,opacity:0.8,marginBottom:4}}>Won Value</div>
<div style={{fontSize:18,fontWeight:700}}>{wonValue.toLocaleString()} Ks</div>
</div>
</div>

{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,justifyContent:'space-between',flexWrap:'wrap'}}>
<div style={{display:'flex',gap:8,flex:1,flexWrap:'wrap'}}>
<div style={{position:'relative',minWidth:180}}>
<Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search leads..." style={{paddingLeft:26,fontSize:12}}/>
</div>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
<option value="">All Status</option>
{STATUSES.map(s=><option key={s}>{s}</option>)}
</select>
</div>
<button type="button" onClick={openAdd} className="btn btn-primary"><Plus size={14}/>New Lead</button>
</div>

{/* Table */}
<div className="card" style={{overflow:'hidden'}}>
{filtered.length===0?(
<div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>
<Target size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No leads found</div>
</div>
):(
<table>
<thead>
<tr>
<th>Company</th><th>Contact</th><th>Source</th><th>Assigned</th>
<th style={{textAlign:'right'}}>Deal Value</th>
<th style={{textAlign:'center'}}>Status</th>
<th style={{textAlign:'center'}}>Actions</th>
</tr>
</thead>
<tbody>
{filtered.map(l=>(
<tr key={l.id}>
<td>
<div style={{fontWeight:500}}>{l.companyName}</div>
<div style={{fontSize:11,color:'var(--text-3)'}}>{l.createdAt?.slice(0,10)}</div>
</td>
<td>
<div style={{fontSize:13}}>{l.contactName||'-'}</div>
{l.phone&&<div style={{fontSize:11,color:'var(--text-3)',display:'flex',alignItems:'center',gap:3}}><Phone size={10}/>{l.phone}</div>}
{l.email&&<div style={{fontSize:11,color:'var(--text-3)',display:'flex',alignItems:'center',gap:3}}><Mail size={10}/>{l.email}</div>}
</td>
<td style={{fontSize:12,color:'var(--text-2)'}}>{l.source||'-'}</td>
<td style={{fontSize:12}}>{l.assignedName||<span style={{color:'var(--text-3)'}}>Unassigned</span>}</td>
<td style={{textAlign:'right',fontWeight:600,color:'var(--primary)'}}>{Number(l.dealValue||0).toLocaleString()} Ks</td>
<td style={{textAlign:'center'}}>
<select value={l.status} onChange={e=>handleStatusChange(l.id,e.target.value)} style={{
background:STATUS_BG[l.status],color:STATUS_COLORS[l.status],
border:'none',borderRadius:20,padding:'3px 8px',fontSize:11,fontWeight:600,cursor:'pointer',outline:'none'
}}>
{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
</select>
</td>
<td style={{textAlign:'center'}}>
<div style={{display:'flex',gap:4,justifyContent:'center'}}>
<button type="button" onClick={()=>openEdit(l)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-2)',padding:4,borderRadius:6}}><Edit size={14}/></button>
<button type="button" onClick={()=>handleDelete(l.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4,borderRadius:6}}><Trash2 size={14}/></button>
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
