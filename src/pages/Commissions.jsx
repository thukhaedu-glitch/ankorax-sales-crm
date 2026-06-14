import{useState,useEffect}from'react'
import{db}from'../firebase'
import{collection,getDocs,updateDoc,doc,getDoc}from'firebase/firestore'
import Layout from'../components/Layout'
import{DollarSign,TrendingUp,Calculator,Search,CheckCircle,X}from'lucide-react'

// default — config/commission မရှိရင် ဒါ သုံး
const DEFAULT_TIERS=[
{min:0,max:300000,rate:15},
{min:300001,max:800000,rate:25},
{min:800001,max:1500000,rate:27},
{min:1500001,max:3000000,rate:30},
{min:3000001,max:5000000,rate:33},
{min:5000001,max:10000000,rate:35},
{min:10000001,max:-1,rate:35},
]
const DEFAULT_BONUS={threshold:10000000,amount:500000}

// tiers + bonus ကို parameter အဖြစ် လက်ခံ
const calcCommission=(amount,tiers,bonus)=>{
let total=0
let breakdown=[]
let remaining=amount

for(const tier of tiers){
if(remaining<=0)break
const max=tier.max===-1?Infinity:tier.max
const tierRange=max===Infinity?remaining:Math.min(remaining,max-tier.min+1)
const tierAmount=Math.min(remaining,tierRange)
const comm=Math.round(tierAmount*(tier.rate/100))
if(tierAmount>0){
breakdown.push({
label:max===Infinity?`${tier.min.toLocaleString()}+`:`${tier.min.toLocaleString()} – ${max.toLocaleString()}`,
rate:`${tier.rate}%`,
amount:tierAmount,
commission:comm,
})
total+=comm
}
remaining-=tierAmount
}

// Bonus
if(bonus&&amount>bonus.threshold){
breakdown.push({label:`Bonus (${(bonus.threshold/1000000)}M+)`,rate:'Flat',amount:0,commission:bonus.amount})
total+=bonus.amount
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
const[tiers,setTiers]=useState(DEFAULT_TIERS)
const[bonus,setBonus]=useState(DEFAULT_BONUS)
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
const[cSnap,rSnap,clSnap,cfgSnap]=await Promise.all([
getDocs(collection(db,'commissions')),
getDocs(collection(db,'salesReps')),
getDocs(collection(db,'crmClients')),
getDoc(doc(db,'config','commission')),
])
setCommissions(cSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.month||'').localeCompare(a.month||'')))
setSalesReps(rSnap.docs.map(d=>({id:d.id,...d.data()})))
setClients(clSnap.docs.map(d=>({id:d.id,...d.data()})))
if(cfgSnap.exists()){
const cfg=cfgSnap.data()
if(cfg.tiers&&cfg.tiers.length)setTiers(cfg.tiers)
if(cfg.bonus)setBonus(cfg.bonus)
}
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])


const handleMarkPaid=async(id)=>{
await updateDoc(doc(db,'commissions',id),{status:'paid',paidAt:new Date().toISOString()})
setCommissions(prev=>prev.map(c=>c.id===id?{...c,status:'paid'}:c))
}

const handleCancel=async(id)=>{
if(!confirm('ဒီ commission ကို cancel မလား? (customer cancel/refund ဖြစ်လို့)'))return
await updateDoc(doc(db,'commissions',id),{status:'cancelled',cancelledAt:new Date().toISOString()})
setCommissions(prev=>prev.map(c=>c.id===id?{...c,status:'cancelled'}:c))
}

// deferred → 10 ရက်ပြည့်ရင် pending ဖြစ်တယ် (display)
const isReady=(c)=>!c.deferredUntil||new Date(c.deferredUntil)<=new Date()
const effStatus=(c)=>{
if(c.status==='paid')return'paid'
if(c.status==='cancelled')return'cancelled'
if(c.status==='deferred'&&!isReady(c))return'deferred'
return'pending'
}
const daysLeft=(c)=>{
if(!c.deferredUntil)return 0
const d=Math.ceil((new Date(c.deferredUntil)-new Date())/(1000*60*60*24))
return d>0?d:0
}

const filtered=commissions.filter(c=>{
const matchSearch=c.salesRepName?.toLowerCase().includes(search.toLowerCase())||c.clientName?.toLowerCase().includes(search.toLowerCase())
const matchRep=filterRep?c.salesRepId===filterRep:true
const matchStatus=filterStatus?effStatus(c)===filterStatus:true
return matchSearch&&matchRep&&matchStatus
})

const totalCommission=filtered.filter(c=>effStatus(c)!=='cancelled').reduce((s,c)=>s+Number(c.commissionAmount||0),0)
const paidCommission=filtered.filter(c=>c.status==='paid').reduce((s,c)=>s+Number(c.commissionAmount||0),0)
const pendingCommission=filtered.filter(c=>effStatus(c)==='pending').reduce((s,c)=>s+Number(c.commissionAmount||0),0)

// Preview calc
const preview=calcAmount?calcCommission(Number(calcAmount),tiers,bonus):null

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>


return(
<Layout title="Commissions">

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
{tiers.map((t,i)=>(
<div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:'0.5px solid #e2e8f0'}}>
<span style={{color:'var(--text-2)'}}>{t.max===-1?`${t.min.toLocaleString()}+`:`${t.min.toLocaleString()} – ${t.max.toLocaleString()}`}</span>
<span style={{fontWeight:600,color:'var(--primary)'}}>{t.rate}%</span>
</div>
))}
{bonus&&(
<div style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',marginTop:2}}>
<span style={{color:'var(--text-2)'}}>Bonus ({(bonus.threshold/1000000)}M+)</span>
<span style={{fontWeight:600,color:'#16a34a'}}>+{bonus.amount.toLocaleString()}</span>
</div>
)}
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
{(()=>{
const es=effStatus(c)
if(es==='paid')return<span style={{background:'rgba(22,163,74,0.1)',color:'#16a34a',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>Paid ✓</span>
if(es==='cancelled')return<span style={{background:'rgba(220,38,38,0.1)',color:'#dc2626',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>Cancelled</span>
if(es==='deferred')return<span style={{background:'rgba(100,116,139,0.12)',color:'#64748b',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}} title={`${daysLeft(c)} days left`}>Deferred ({daysLeft(c)}d)</span>
return<span style={{background:'rgba(217,119,6,0.1)',color:'#d97706',padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600}}>Pending</span>
})()}
</td>
<td style={{textAlign:'center'}}>
<div style={{display:'flex',gap:4,justifyContent:'center'}}>
{effStatus(c)==='pending'&&(
<button type="button" onClick={()=>handleMarkPaid(c.id)} title="Mark Paid" style={{background:'none',border:'none',cursor:'pointer',color:'#16a34a',padding:4,borderRadius:6}}><CheckCircle size={14}/></button>
)}
{(effStatus(c)==='deferred'||effStatus(c)==='pending')&&(
<button type="button" onClick={()=>handleCancel(c.id)} title="Cancel (customer refund)" style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626',padding:4,borderRadius:6}}><X size={14}/></button>
)}
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
