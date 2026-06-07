import{useState,useEffect}from'react'
import{db,auth}from'../firebase'
import{collection,getDocs,addDoc,updateDoc,deleteDoc,doc}from'firebase/firestore'
import Layout from'../components/Layout'
import{Plus,X,Save,Trash2,Edit,Users,Search,Mail,Phone,TrendingUp,DollarSign,Target}from'lucide-react'

const ROLES=['Senior Rep','Junior Rep','Manager','Team Lead']

export default function SalesReps(){
const[reps,setReps]=useState([])
const[leads,setLeads]=useState([])
const[commissions,setCommissions]=useState([])
const[loading,setLoading]=useState(true)
const[search,setSearch]=useState('')
const[modal,setModal]=useState(false)
const[selected,setSelected]=useState(null)
const[saving,setSaving]=useState(false)
const[form,setForm]=useState({
name:'',email:'',phone:'',role:'Junior Rep',
target:0,note:'',active:true,
})

useEffect(()=>{
const load=async()=>{
try{
const[rSnap,lSnap,cSnap]=await Promise.all([
getDocs(collection(db,'salesReps')),
getDocs(collection(db,'leads')),
getDocs(collection(db,'commissions')),
])
setReps(rSnap.docs.map(d=>({id:d.id,...d.data()})))
setLeads(lSnap.docs.map(d=>({id:d.id,...d.data()})))
setCommissions(cSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

const openAdd=()=>{
setForm({name:'',email:'',phone:'',role:'Junior Rep',target:0,note:'',active:true})
setSelected(null)
setModal(true)
}

const openEdit=(r)=>{
setForm({
name:r.name||'',email:r.email||'',phone:r.phone||'',
role:r.role||'Junior Rep',target:r.target||0,
note:r.note||'',active:r.active!==false,
})
setSelected(r)
setModal(true)
}

const handleSave=async()=>{
if(!form.name||!form.email){alert('Name and email required');return}
setSaving(true)
try{
if(!selected){
await addDoc(collection(db,'salesReps'),{
...form,target:Number(form.target),
createdAt:new Date().toISOString(),
createdBy:auth.currentUser.uid,
})
const snap=await getDocs(collection(db,'salesReps'))
setReps(snap.docs.map(d=>({id:d.id,...d.data()})))
}else{
await updateDoc(doc(db,'salesReps',selected.id),{
...form,target:Number(form.target),
updatedAt:new Date().toISOString(),
})
setReps(prev=>prev.map(r=>r.id===selected.id?{...r,...form,target:Number(form.target)}:r))
}
setModal(false)
}catch(e){alert(e.message)}
setSaving(false)
}

const handleDelete=async(id)=>{
if(!confirm('Delete this sales rep?'))return
await deleteDoc(doc(db,'salesReps',id))
setReps(prev=>prev.filter(r=>r.id!==id))
}

const toggleActive=async(r)=>{
await updateDoc(doc(db,'salesReps',r.id),{active:!r.active})
setReps(prev=>prev.map(x=>x.id===r.id?{...x,active:!x.active}:x))
}

const getRepStats=(repId)=>{
const repLeads=leads.filter(l=>l.assignedTo===repId)
const wonLeads=repLeads.filter(l=>l.status==='Won')
const totalSales=wonLeads.reduce((s,l)=>s+Number(l.dealValue||0),0)
const totalComm=commissions.filter(c=>c.salesRepId===repId).reduce((s,c)=>s+Number(c.commissionAmount||0),0)
const paidComm=commissions.filter(c=>c.salesRepId===repId&&c.status==='paid').reduce((s,c)=>s+Number(c.commissionAmount||0),0)
return{leads:repLeads.length,won:wonLeads.length,totalSales,totalComm,paidComm}
}

const filtered=reps.filter(r=>
r.name?.toLowerCase().includes(search.toLowerCase())||
r.email?.toLowerCase().includes(search.toLowerCase())
)

const totalTarget=reps.reduce((s,r)=>s+Number(r.target||0),0)
const totalComm=commissions.reduce((s,c)=>s+Number(c.commissionAmount||0),0)

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>

return(
<Layout title="Sales Team">

{modal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'white'}}>
<div style={{fontWeight:600,fontSize:15}}>{selected?'Edit Sales Rep':'New Sales Rep'}</div>
<button type="button" onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24,display:'grid',gap:12}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div style={{gridColumn:'1/-1'}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Full Name *</label>
<input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Name..."/>
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
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Role</label>
<select className="form-input" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
{ROLES.map(r=><option key={r}>{r}</option>)}
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Monthly Target (Ks)</label>
<input className="form-input" type="number" value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))} style={{textAlign:'right'}}/>
</div>
<div style={{gridColumn:'1/-1'}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Note</label>
<input className="form-input" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Optional..."/>
</div>
<div style={{gridColumn:'1/-1',display:'flex',alignItems:'center',gap:10}}>
<div style={{
width:40,height:22,borderRadius:11,
background:form.active?'var(--primary)':'#e2e8f0',
position:'relative',cursor:'pointer',transition:'background 0.2s',
}} onClick={()=>setForm(f=>({...f,active:!f.active}))}>
<div style={{
position:'absolute',top:3,
left:form.active?20:3,
width:16,height:16,borderRadius:'50%',
background:'white',transition:'left 0.2s',
boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
}}/>
</div>
<span style={{fontSize:13,fontWeight:500,color:form.active?'var(--primary)':'var(--text-3)'}}>
{form.active?'Active':'Inactive'}
</span>
</div>
</div>
<div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:8}}>
<button type="button" onClick={()=>setModal(false)} className="btn btn-ghost">Cancel</button>
<button type="button" onClick={handleSave} disabled={saving} className="btn btn-primary">
<Save size={14}/>{saving?'Saving...':selected?'Update':'Add Rep'}
</button>
</div>
</div>
</div>
</div>
)}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
{[
{label:'Total Reps',value:reps.length,color:'#4F6EF7'},
{label:'Active',value:reps.filter(r=>r.active!==false).length,color:'#16a34a'},
{label:'Total Target',value:`${totalTarget.toLocaleString()} Ks`,color:'#8b5cf6'},
{label:'Total Commission',value:`${totalComm.toLocaleString()} Ks`,color:'#d97706'},
].map(({label,value,color})=>(
<div key={label} className="card" style={{padding:16}}>
<div style={{fontSize:11,color:'var(--text-3)',marginBottom:6}}>{label}</div>
<div style={{fontSize:16,fontWeight:700,color}}>{value}</div>
</div>
))}
</div>

{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,justifyContent:'space-between',flexWrap:'wrap'}}>
<div style={{position:'relative',flex:1,maxWidth:280}}>
<Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search reps..." style={{paddingLeft:26,fontSize:12}}/>
</div>
<button type="button" onClick={openAdd} className="btn btn-primary"><Plus size={14}/>Add Rep</button>
</div>

{/* Rep Cards */}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
{filtered.length===0?(
<div className="card" style={{padding:48,textAlign:'center',color:'var(--text-3)',gridColumn:'1/-1'}}>
<Users size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No sales reps yet</div>
</div>
):filtered.map(r=>{
const stats=getRepStats(r.id)
const targetPct=r.target>0?Math.min(Math.round(stats.totalSales/r.target*100),100):0
return(
<div key={r.id} className="card" style={{padding:20,opacity:r.active===false?0.6:1}}>
{/* Header */}
<div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14}}>
<div style={{display:'flex',alignItems:'center',gap:12}}>
<div style={{
width:44,height:44,borderRadius:12,
background:'linear-gradient(135deg,#4F6EF7,#7C3AED)',
display:'flex',alignItems:'center',justifyContent:'center',
color:'white',fontWeight:700,fontSize:16,flexShrink:0,
}}>
{r.name?.charAt(0).toUpperCase()}
</div>
<div>
<div style={{fontWeight:600,fontSize:14}}>{r.name}</div>
<div style={{fontSize:11,color:'var(--text-3)',marginTop:1}}>{r.role}</div>
</div>
</div>
<div style={{display:'flex',gap:4,alignItems:'center'}}>
<div style={{
width:8,height:8,borderRadius:'50%',
background:r.active!==false?'#16a34a':'#94a3b8',
}}/>
<span style={{fontSize:10,color:r.active!==false?'#16a34a':'#94a3b8',fontWeight:500}}>
{r.active!==false?'Active':'Inactive'}
</span>
</div>
</div>

{/* Contact */}
<div style={{marginBottom:14,display:'grid',gap:4}}>
{r.email&&(
<div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-2)'}}>
<Mail size={11} color="var(--text-3)"/>{r.email}
</div>
)}
{r.phone&&(
<div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-2)'}}>
<Phone size={11} color="var(--text-3)"/>{r.phone}
</div>
)}
</div>

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
{[
{label:'Leads',value:stats.leads,icon:Target,color:'#4F6EF7'},
{label:'Won',value:stats.won,icon:TrendingUp,color:'#16a34a'},
{label:'Commission',value:`${(stats.totalComm/1000).toFixed(0)}K`,icon:DollarSign,color:'#d97706'},
].map(({label,value,icon:Icon,color})=>(
<div key={label} style={{background:'#f8fafc',borderRadius:8,padding:'8px 10px',textAlign:'center'}}>
<Icon size={13} color={color} style={{marginBottom:3}}/>
<div style={{fontSize:13,fontWeight:700,color}}>{value}</div>
<div style={{fontSize:10,color:'var(--text-3)'}}>{label}</div>
</div>
))}
</div>

{/* Target Progress */}
{r.target>0&&(
<div style={{marginBottom:14}}>
<div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
<span style={{color:'var(--text-3)'}}>Monthly Target</span>
<span style={{fontWeight:600,color:targetPct>=100?'#16a34a':'var(--primary)'}}>{targetPct}%</span>
</div>
<div style={{height:6,background:'#f1f5f9',borderRadius:3}}>
<div style={{
height:6,borderRadius:3,
background:targetPct>=100?'#16a34a':'var(--primary)',
width:`${targetPct}%`,
transition:'width 0.3s',
}}/>
</div>
<div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginTop:3,color:'var(--text-3)'}}>
<span>{stats.totalSales.toLocaleString()} Ks</span>
<span>Target: {Number(r.target).toLocaleString()} Ks</span>
</div>
</div>
)}

{/* Actions */}
<div style={{display:'flex',gap:6,justifyContent:'flex-end',paddingTop:10,borderTop:'0.5px solid #f1f5f9'}}>
<button type="button" onClick={()=>toggleActive(r)} className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px',color:r.active!==false?'#dc2626':'#16a34a'}}>
{r.active!==false?'Deactivate':'Activate'}
</button>
<button type="button" onClick={()=>openEdit(r)} className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px'}}>
<Edit size={12}/>Edit
</button>
<button type="button" onClick={()=>handleDelete(r.id)} className="btn btn-ghost" style={{fontSize:11,padding:'4px 10px',color:'#dc2626'}}>
<Trash2 size={12}/>Delete
</button>
</div>
</div>
)
})}
</div>

</Layout>
)
}
