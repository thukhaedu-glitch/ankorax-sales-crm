import{useState,useEffect}from'react'
import{db,auth}from'../firebase'
import{collection,getDocs,addDoc,updateDoc,deleteDoc,doc}from'firebase/firestore'
import Layout from'../components/Layout'
import{Plus,X,Save,Trash2,Edit,DollarSign,TrendingUp,Calculator,Search,CheckCircle}from'lucide-react'

const TIERS=[
{min:0,max:300000,rate:0.15,label:'0 – 300,000'},
{min:300001,max:800000,rate:0.25,label:'300,001 – 800,000'},
{min:800001,max:1500000,rate:0.27,label:'800,001 – 1,500,000'},
{min:1500001,max:3000000,rate:0.30,label:'1,500,001 – 3,000,000'},
{min:3000001,max:5000000,rate:0.33,label:'3,000,001 – 5,000,000'},
{min:5000001,max:10000000,rate:0.35,label:'5,000,001 – 10,000,000'},
{min:10000001,max:Infinity,rate:0.35,label:'10,000,000+',bonus:500000},
]

const calcCommission=(amount)=>{
let total=0
let breakdown=[]
let remaining=amount

for(const tier of TIERS){
if(remaining<=0)break
const tierRange=tier.max===Infinity?remaining:Math.min(remaining,tier.max-tier.min+1)
const tierAmount=Math.min(remaining,tierRange)
const comm=Math.round(tierAmount*tier.rate)
if(tierAmount>0){
breakdown.push({
label:tier.label,
rate:`${(tier.rate*100).toFixed(0)}%`,
amount:tierAmount,
commission:comm,
})
total+=comm
}
remaining-=tierAmount
}

// Bonus
if(amount>10000000){
breakdown.push({label:'Bonus (10M+)',rate:'Flat',amount:0,commission:500000})
total+=500000
}

return{total,breakdown}
}

export default function Commissions(){
const[commissions,setCommissions]=useState([])
const[salesReps,setSalesReps]=useState([])
const[clients,setClients]=useState([])
const[loading,setLoading]=useState(true)
const[search,setSearch]=useState('')
const[filterRep,setFilterRep]=useState('')
const[filterStatus,setFilterStatus]=useState('')
const[modal,setModal]=useState(false)
const[selected,setSelected]=useState(null)
const[saving,setSaving]=useState(false)
const[calcAmount,setCalcAmount]=useState('')
const[showCalc,setShowCalc]=useState(false)
const[form,setForm]=useState({
salesRepId:'',salesRepName:'',
clientId:'',clientName:'',
saleAmount:0,
month:new Date().toISOString().slice(0,7),
note:'',status:'pending',
})

useEffect(()=>{
const load=async()=>{
try{
const[cSnap,rSnap,clSnap]=await Promise.all([
getDocs(collection(db,'commissions')),
getDocs(collection(db,'salesReps')),
getDocs(collection(db,'crmClients')),
])
setCommissions(cSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.month||'').localeCompare(a.month||'')))
setSalesReps(rSnap.docs.map(d=>({id:d.id,...d.data()})))
setClients(clSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

const openAdd=()=>{
setForm({salesRepId:'',salesRepName:'',clientId:'',clientName:'',saleAmount:0,month:new Date().toISOString().slice(0,7),note:'',status:'pending'})
setSelected(null)
setModal(true)
}

const openEdit=(c)=>{
setForm({
salesRepId:c.salesRepId||'',salesRepName:c.salesRepName||'',
clientId:c.clientId||'',clientName:c.clientName||'',
saleAmount:c.saleAmount||0,
month:c.month||'',note:c.note||'',status:c.status||'pending',
})
setSelected(c)
setModal(true)
}

const handleSave=async()=>{
if(!form.salesRepId||!form.saleAmount){alert('Sales rep and amount required');return}
setSaving(true)
try{
const{total,breakdown}=calcCommission(Number(form.saleAmount))
const data={...form,saleAmount:Number(form.saleAmount),commissionAmount:total,breakdown,updatedAt:new Date().toISOString()}
if(!selected){
await addDoc(collection(db,'commissions'),{...data,createdAt:new Date().toISOString(),createdBy:auth.currentUser.uid})
const snap=await getDocs(collection(db,'commissions'))
setCommissions(snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.month||'').localeCompare(a.month||'')))
}else{
await updateDoc(doc(db,'commissions',selected.id),data)
setCommissions(prev=>prev.map(c=>c.id===selected.id?{...c,...data}:c))
}
setModal(false)
}catch(e){alert(e.message)}
setSaving(false)
}

const handleDelete=async(id)=>{
if(!confirm('Delete?'))return
await deleteDoc(doc(db,'commissions',id))
setCommissions(prev=>prev.filter(c=>c.id!==id))
}

const handleMarkPaid=async(id)=>{
await updateDoc(doc(db,'commissions',id),{status:'paid',paidAt:new Date().toISOString()})
setCommissions(prev=>prev.map(c=>c.id===id?{...c,status:'paid'}:c))
}

const filtered=commissions.filter(c=>{
const matchSearch=c.salesRepName?.toLowerCase().includes(search.toLowerCase())||c.clientName?.toLowerCase().includes(search.toLowerCase())
const matchRep=filterRep?c.salesRepId===filterRep:true
const matchStatus=filterStatus?c.status===filterStatus:true
return matchSearch&&matchRep&&matchStatus
})

const totalCommission=filtered.reduce((s,c)=>s+Number(c.commissionAmount||0),0)
const paidCommission=filtered.filter(c=>c.status==='paid').reduce((s,c)=>s+Number(c.commissionAmount||0),0)
const pendingCommission=filtered.filter(c=>c.status==='pending').reduce((s,c)=>s+Number(c.commissionAmount||0),0)

// Preview calc
const preview=calcAmount?calcCommission(Number(calcAmount)):null

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>

const formPreview=form.saleAmount?calcCommission(Number(form.saleAmount)):null

return(
<Layout title="Commissions">

{/* Add/Edit Modal */}
{modal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:560,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'white'}}>
<div style={{fontWeight:600,fontSize:15}}>{selected?'Edit Commission':'New Commission'}</div>
<button type="button" onClick={()=>setModal(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24,display:'grid',gap:12}}>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Sales Rep *</label>
<select className="form-input" value={form.salesRepId} onChange={e=>{
const rep=salesReps.find(r=>r.id===e.target.value)
setForm(f=>({...f,salesRepId:e.target.value,salesRepName:rep?.name||''}))
}}>
<option value="">— Select Rep —</option>
{salesReps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Client</label>
<select className="form-input" value={form.clientId} onChange={e=>{
const cl=clients.find(c=>c.id===e.target.value)
setForm(f=>({...f,clientId:e.target.value,clientName:cl?.companyName||''}))
}}>
<option value="">— Select Client —</option>
{clients.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Sale Amount (Ks) *</label>
<input className="form-input" type="number" value={form.saleAmount} onChange={e=>setForm(f=>({...f,saleAmount:e.target.value}))} style={{textAlign:'right'}}/>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Month</label>
<input className="form-input" type="month" value={form.month} onChange={e=>setForm(f=>({...f,month:e.target.value}))}/>
</div>
<div style={{gridColumn:'1/-1'}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Note</label>
<input className="form-input" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder="Optional..."/>
</div>
</div>

{/* Live Preview */}
{formPreview&&(
<div style={{background:'#f8fafc',borderRadius:10,padding:14,border:'0.5px solid var(--border)'}}>
<div style={{fontSize:12,fontWeight:600,color:'var(--text-2)',marginBottom:10,textTransform:'uppercase',letterSpacing:'0.05em'}}>Commission Breakdown</div>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead>
<tr>
{['Tier','Rate','Amount','Commission'].map(h=>(
<th key={h} style={{fontSize:10,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',padding:'4px 8px',textAlign:'right',background:'transparent',borderBottom:'0.5px solid #e2e8f0'}}>{h}</th>
))}
</tr>
</thead>
<tbody>
{formPreview.breakdown.map((b,i)=>(
<tr key={i}>
<td style={{fontSize:11,padding:'4px 8px',color:'var(--text-2)'}}>{b.label}</td>
<td style={{fontSize:11,padding:'4px 8px',textAlign:'right',color:'var(--primary)',fontWeight:600}}>{b.rate}</td>
<td style={{fontSize:11,padding:'4px 8px',textAlign:'right'}}>{b.amount.toLocaleString()}</td>
<td style={{fontSize:11,padding:'4px 8px',textAlign:'right',fontWeight:600,color:'#16a34a'}}>{b.commission.toLocaleString()}</td>
</tr>
))}
</tbody>
<tfoot>
<tr style={{borderTop:'1.5px solid #e2e8f0'}}>
<td colSpan={3} style={{fontSize:12,fontWeight:700,padding:'6px 8px'}}>Total Commission</td>
<td style={{fontSize:14,fontWeight:700,color:'var(--primary)',textAlign:'right',padding:'6px 8px'}}>{formPreview.total.toLocaleString()} Ks</td>
</tr>
</tfoot>
</table>
</div>
)}

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

{/* Calculator Modal */}
{showCalc&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontWeight:600,fontSize:15,display:'flex',alignItems:'center',gap:8}}><Calculator size={16} color="var(--primary)"/>Commission Calculator</div>
<button type="button" onClick={()=>setShowCalc(false)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24}}>
<div style={{marginBottom:16}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Sale Amount (Ks)</label>
<input className="form-input" type="number" value={calcAmount} onChange={e=>setCalcAmount(e.target.value)} placeholder="Enter amount..." style={{fontSize:16,textAlign:'right'}}/>
</div>

{/* Tier Table */}
<div style={{marginBottom:16,background:'#f8fafc',borderRadius:10,padding:12}}>
<div style={{fontSize:11,fontWeight:700,color:'var(--text-3)',marginBottom:8,textTransform:'uppercase'}}>Commission Tiers</div>
{TIERS.map((t,i)=>(
<div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:'0.5px solid #e2e8f0'}}>
<span style={{color:'var(--text-2)'}}>{t.label}</span>
<span style={{fontWeight:600,color:'var(--primary)'}}>{(t.rate*100).toFixed(0)}%{t.bonus?` + ${t.bonus.toLocaleString()} Bonus`:''}</span>
</div>
))}
</div>

{preview&&(
<div style={{background:'white',borderRadius:10,border:'0.5px solid var(--border)',overflow:'hidden'}}>
<table style={{width:'100%',borderCollapse:'collapse'}}>
<thead>
<tr style={{background:'rgba(79,110,247,0.06)'}}>
{['Sale Tier','%','Cal Amount','Commission'].map(h=>(
<th key={h} style={{fontSize:10,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',padding:'7px 10px',textAlign:'right',background:'transparent',borderBottom:'0.5px solid #e2e8f0'}}>{h}</th>
))}
</tr>
</thead>
<tbody>
{preview.breakdown.map((b,i)=>(
<tr key={i}>
<td style={{fontSize:11,padding:'6px 10px',color:'var(--text-2)'}}>{b.label}</td>
<td style={{fontSize:11,padding:'6px 10px',textAlign:'right',fontWeight:600,color:'var(--primary)'}}>{b.rate}</td>
<td style={{fontSize:11,padding:'6px 10px',textAlign:'right'}}>{b.amount.toLocaleString()}</td>
<td style={{fontSize:11,padding:'6px 10px',textAlign:'right',fontWeight:600,color:'#16a34a'}}>{b.commission.toLocaleString()}</td>
</tr>
))}
</tbody>
<tfoot>
<tr style={{background:'linear-gradient(135deg,#4F6EF7,#7C3AED)'}}>
<td colSpan={3} style={{fontSize:13,fontWeight:700,padding:'10px',color:'white'}}>Total Commission</td>
<td style={{fontSize:16,fontWeight:800,color:'white',textAlign:'right',padding:'10px'}}>{preview.total.toLocaleString()} Ks</td>
</tr>
</tfoot>
</table>
</div>
)}
</div>
</div>
</div>
)}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
<div className="card" style={{padding:16,background:'linear-gradient(135deg,#4F6EF7,#7C3AED)',color:'white'}}>
<div style={{fontSize:11,opacity:0.8,marginBottom:6}}>Total Commission</div>
<div style={{fontSize:20,fontWeight:700}}>{totalCommission.toLocaleString()} Ks</div>
</div>
<div className="card" style={{padding:16,background:'linear-gradient(135deg,#16a34a,#059669)',color:'white'}}>
<div style={{fontSize:11,opacity:0.8,marginBottom:6}}>Paid</div>
<div style={{fontSize:20,fontWeight:700}}>{paidCommission.toLocaleString()} Ks</div>
</div>
<div className="card" style={{padding:16,background:'linear-gradient(135deg,#d97706,#b45309)',color:'white'}}>
<div style={{fontSize:11,opacity:0.8,marginBottom:6}}>Pending</div>
<div style={{fontSize:20,fontWeight:700}}>{pendingCommission.toLocaleString()} Ks</div>
</div>
</div>

{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,justifyContent:'space-between',flexWrap:'wrap'}}>
<div style={{display:'flex',gap:8,flex:1,flexWrap:'wrap'}}>
<div style={{position:'relative'}}>
<Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{paddingLeft:26,fontSize:12,width:160}}/>
</div>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterRep} onChange={e=>setFilterRep(e.target.value)}>
<option value="">All Reps</option>
{salesReps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
</select>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
<option value="">All Status</option>
<option value="pending">Pending</option>
<option value="paid">Paid</option>
</select>
</div>
<div style={{display:'flex',gap:8}}>
<button type="button" onClick={()=>setShowCalc(true)} className="btn btn-ghost" style={{fontSize:12}}>
<Calculator size={14}/>Calculator
</button>
<button type="button" onClick={openAdd} className="btn btn-primary"><Plus size={14}/>New</button>
</div>
</div>

{/* Table */}
<div className="card" style={{overflow:'hidden'}}>
{filtered.length===0?(
<div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>
<DollarSign size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No commissions yet</div>
</div>
):(
<table>
<thead>
<tr>
<th>Sales Rep</th><th>Client</th><th>Month</th>
<th style={{textAlign:'right'}}>Sale Amount</th>
<th style={{textAlign:'right'}}>Commission</th>
<th style={{textAlign:'center'}}>Status</th>
<th style={{textAlign:'center'}}>Actions</th>
</tr>
</thead>
<tbody>
{filtered.map(c=>(
<tr key={c.id}>
<td style={{fontWeight:500}}>{c.salesRepName||'-'}</td>
<td style={{fontSize:12,color:'var(--text-2)'}}>{c.clientName||'-'}</td>
<td style={{fontSize:12,color:'var(--text-3)'}}>{c.month||'-'}</td>
<td style={{textAlign:'right',fontWeight:500}}>{Number(c.saleAmount||0).toLocaleString()} Ks</td>
<td style={{textAlign:'right',fontWeight:700,color:'var(--primary)'}}>{Number(c.commissionAmount||0).toLocaleString()} Ks</td>
<td style={{textAlign:'center'}}>
{c.status==='paid'?(
<span style={{background:'rgba(22,163,74,0.1)',color:'#16a34a',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>Paid ✓</span>
):(
<span style={{background:'rgba(217,119,6,0.1)',color:'#d97706',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>Pending</span>
)}
</td>
<td style={{textAlign:'center'}}>
<div style={{display:'flex',gap:4,justifyContent:'center'}}>
{c.status==='pending'&&(
<button type="button" onClick={()=>handleMarkPaid(c.id)} title="Mark Paid" style={{background:'none',border:'none',cursor:'pointer',color:'#16a34a',padding:4,borderRadius:6}}><CheckCircle size={14}/></button>
)}
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
