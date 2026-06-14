import{useState,useEffect}from'react'
import{db}from'../firebase'
import{collection,getDocs,query,where,orderBy,doc,updateDoc,addDoc,getDoc,serverTimestamp}from'firebase/firestore'
import Layout from'../components/Layout'
import{CreditCard,Check,X,Clock,ExternalLink,Building}from'lucide-react'

const fmtMMK=(n)=>Number(n||0).toLocaleString('en-US')+' MMK'

// Commission — Firestore config/commission ကနေ ဖတ် (fallback ပါ)
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
const calcCommission=(amount,tiers,bonus)=>{
let total=0,remaining=amount
for(const tier of tiers){
if(remaining<=0)break
const max=tier.max===-1?Infinity:tier.max
const tierRange=max===Infinity?remaining:Math.min(remaining,max-tier.min+1)
const tierAmount=Math.min(remaining,tierRange)
total+=Math.round(tierAmount*(tier.rate/100))
remaining-=tierAmount
}
if(bonus&&amount>bonus.threshold)total+=bonus.amount
return total
}
const fmtDateTime=(ts)=>{
if(!ts)return'-'
try{const d=ts.seconds?new Date(ts.seconds*1000):new Date(ts);return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return'-'}
}

export default function Payments(){
const[requests,setRequests]=useState([])
const[loading,setLoading]=useState(true)
const[filter,setFilter]=useState('pending')
const[processing,setProcessing]=useState(null)
const[proofModal,setProofModal]=useState(null)

const load=async()=>{
setLoading(true)
try{
const snap=await getDocs(query(collection(db,'upgradeRequests'),orderBy('createdAt','desc')))
setRequests(snap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
useEffect(()=>{load()},[])

const handleApprove=async(req)=>{
if(!confirm(`"${req.requestedByEmail}" ရဲ့ ${req.requestedPlan} plan (${fmtMMK(req.amount)}) ကို approve လုပ်မလား?`))return
setProcessing(req.id)
try{
// end date = +30 days
const end=new Date()
end.setDate(end.getDate()+30)
const start=new Date()
// company upgrade
await updateDoc(doc(db,'companies',req.companyId),{
plan:req.requestedPlan,
subscriptionStatus:'active',
subscriptionStart:start.toISOString().split('T')[0],
subscriptionEnd:end.toISOString().split('T')[0],
updatedAt:new Date().toISOString(),
})
// request status update
await updateDoc(doc(db,'upgradeRequests',req.id),{
status:'approved',
approvedAt:serverTimestamp(),
})
// company audit log
try{
await addDoc(collection(db,'companies',req.companyId,'auditLogs'),{
action:'upgrade',module:'subscription',
description:`Plan upgraded to ${req.requestedPlan} (approved via CRM)`,
timestamp:serverTimestamp(),
userEmail:'CRM Admin',
})
}catch(e){}
// Auto commission — company ရဲ့ assigned sale rep ကို (coupon နုတ်ပြီး amount အပေါ်)
try{
const compSnap=await getDoc(doc(db,'companies',req.companyId))
const comp=compSnap.exists()?compSnap.data():{}
if(comp.assignedTo){
// commission config Firestore ကနေ ဖတ်
let tiers=DEFAULT_TIERS,bonus=DEFAULT_BONUS
try{
const cfgSnap=await getDoc(doc(db,'config','commission'))
if(cfgSnap.exists()){
const cfg=cfgSnap.data()
if(cfg.tiers&&cfg.tiers.length)tiers=cfg.tiers
if(cfg.bonus)bonus=cfg.bonus
}
}catch(e){}
const commAmount=calcCommission(Number(req.amount||0),tiers,bonus)
const deferDays=10
const deferUntil=new Date()
deferUntil.setDate(deferUntil.getDate()+deferDays)
await addDoc(collection(db,'commissions'),{
salesRepId:comp.assignedTo,
salesRepName:comp.assignedName||'',
saleAmount:Number(req.amount||0),
commissionAmount:commAmount,
source:'subscription',
status:'deferred',
deferredUntil:deferUntil.toISOString(),
month:new Date().toISOString().slice(0,7),
companyId:req.companyId,
companyName:comp.companyName||comp.name||'',
clientName:comp.companyName||comp.name||'',
plan:req.requestedPlan,
couponCode:req.couponCode||'',
note:`Subscription: ${req.requestedPlan}${req.couponCode?' (coupon '+req.couponCode+')':''}`,
createdAt:new Date().toISOString(),
createdBy:'CRM Auto',
})
}
}catch(e){console.error('commission:',e)}
setRequests(prev=>prev.map(r=>r.id===req.id?{...r,status:'approved'}:r))
}catch(e){alert(e.message)}
setProcessing(null)
}

const handleReject=async(req)=>{
const reason=prompt('Reject ဖြစ်တဲ့ အကြောင်းရင်း (optional):')
if(reason===null)return
setProcessing(req.id)
try{
await updateDoc(doc(db,'upgradeRequests',req.id),{
status:'rejected',
rejectReason:reason||'',
rejectedAt:serverTimestamp(),
})
setRequests(prev=>prev.map(r=>r.id===req.id?{...r,status:'rejected'}:r))
}catch(e){alert(e.message)}
setProcessing(null)
}

// Refund — approved payment ကို ပြန်အမ်း (plan free + commission cancel)
const handleRefund=async(req)=>{
// 48hr window စစ် — approve လုပ်ပြီး 48 နာရီအတွင်းပဲ
const approvedTime=req.approvedAt?.seconds?new Date(req.approvedAt.seconds*1000):(req.createdAt?.seconds?new Date(req.createdAt.seconds*1000):null)
if(approvedTime){
const hoursSince=(new Date()-approvedTime)/(1000*60*60)
if(hoursSince>48){
alert(`Refund window ကျော်လွန်ပါပြီ။\n\nPayment က ${Math.floor(hoursSince)} နာရီ ကြာပါပြီ (48hr limit)။ Refund လုပ်လို့ မရတော့ပါ။`)
return
}
}
if(!confirm(`"${req.requestedByEmail}" ရဲ့ ${fmtMMK(req.amount)} payment ကို refund လုပ်မလား?\n\n⚠️ Plan က free ပြန်ဖြစ်ပြီး၊ သက်ဆိုင်တဲ့ commission တွေ cancel ဖြစ်ပါမယ်။`))return
setProcessing(req.id)
try{
// request status → refunded
await updateDoc(doc(db,'upgradeRequests',req.id),{status:'refunded',refundedAt:serverTimestamp()})
// company plan → free
try{await updateDoc(doc(db,'companies',req.companyId),{plan:'free',subscriptionStatus:'expired',updatedAt:new Date().toISOString()})}catch(e){}
// commission cancel (deferred/pending ဖြစ်နေတာ)
try{
const cSnap=await getDocs(query(collection(db,'commissions'),where('companyId','==',req.companyId)))
for(const d of cSnap.docs){
const c=d.data()
if(c.status==='deferred'||c.status==='pending'){
await updateDoc(doc(db,'commissions',d.id),{status:'cancelled',cancelledAt:new Date().toISOString(),cancelReason:'payment refunded'})
}
}
}catch(e){}
// audit log
try{await addDoc(collection(db,'companies',req.companyId,'auditLogs'),{action:'refund',module:'subscription',description:`Payment refunded (${fmtMMK(req.amount)}) — plan reset to free`,timestamp:serverTimestamp(),userEmail:'CRM Admin'})}catch(e){}
setRequests(prev=>prev.map(r=>r.id===req.id?{...r,status:'refunded'}:r))
}catch(e){alert(e.message)}
setProcessing(null)
}
const counts={
pending:requests.filter(r=>r.status==='pending').length,
approved:requests.filter(r=>r.status==='approved').length,
rejected:requests.filter(r=>r.status==='rejected').length,
}

const statusBadge=(s)=>{
const map={pending:{bg:'#faeeda',c:'#d97706',t:'Pending'},approved:{bg:'#eaf3de',c:'#16a34a',t:'Approved'},rejected:{bg:'#fcebeb',c:'#dc2626',t:'Rejected'},refunded:{bg:'#fcebeb',c:'#dc2626',t:'Refunded'}}
const x=map[s]||map.pending
return<span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,background:x.bg,color:x.c}}>{x.t}</span>
}

if(loading)return<Layout title="Payments"><div style={{padding:40,textAlign:'center'}}>Loading...</div></Layout>

return(
<Layout title="Payments">

{/* Proof Modal */}
{proofModal&&(
<div onClick={()=>setProofModal(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20,cursor:'pointer'}}>
<img src={proofModal} alt="proof" style={{maxWidth:'90%',maxHeight:'90%',borderRadius:12}}/>
</div>
)}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
{[
{label:'Pending',value:counts.pending,color:'#d97706'},
{label:'Approved',value:counts.approved,color:'#16a34a'},
{label:'Rejected',value:counts.rejected,color:'#dc2626'},
].map(({label,value,color})=>(
<div key={label} className="card" style={{padding:16}}>
<div style={{fontSize:11,color:'var(--text-3)',marginBottom:6}}>{label}</div>
<div style={{fontSize:20,fontWeight:700,color}}>{value}</div>
</div>
))}
</div>

{/* Filter tabs */}
<div style={{display:'flex',gap:8,marginBottom:16}}>
{['pending','approved','rejected','all'].map(f=>(
<button key={f} onClick={()=>setFilter(f)} style={{
padding:'6px 14px',borderRadius:20,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,textTransform:'capitalize',
background:filter===f?'var(--primary)':'#f1f5f9',color:filter===f?'white':'var(--text-2)',
}}>{f}</button>
))}
</div>

{/* List */}
<div className="card" style={{overflow:'hidden'}}>
{filtered.length===0?(
<div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>
<CreditCard size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No {filter==='all'?'':filter} requests</div>
</div>
):(
<div style={{overflowX:'auto'}}>
<table style={{width:'100%'}}>
<thead>
<tr>
<th>Requested By</th>
<th>Plan</th>
<th>Amount</th>
<th>Txn Note</th>
<th>Proof</th>
<th>Date</th>
<th style={{textAlign:'center'}}>Status</th>
<th style={{textAlign:'center'}}>Action</th>
</tr>
</thead>
<tbody>
{filtered.map(req=>(
<tr key={req.id}>
<td>
<div style={{fontSize:13,fontWeight:500}}>{req.requestedByEmail}</div>
<div style={{fontSize:10,color:'var(--text-3)',fontFamily:'monospace'}}>{req.companyId?.slice(0,16)}...</div>
</td>
<td>
<span style={{fontSize:11,color:'var(--text-3)'}}>{req.currentPlan}</span>
<span style={{margin:'0 4px'}}>→</span>
<span style={{fontSize:12,fontWeight:600,color:'var(--primary)',textTransform:'capitalize'}}>{req.requestedPlan}</span>
</td>
<td style={{fontSize:13,fontWeight:600}}>
{fmtMMK(req.amount)}
{req.couponCode&&<div style={{fontSize:10,fontWeight:600,color:'#16a34a',background:'#eaf3de',padding:'1px 6px',borderRadius:10,marginTop:3,display:'inline-block'}}>🎟 {req.couponCode}</div>}
</td>
<td style={{fontSize:12,color:'var(--text-2)',maxWidth:160}}>{req.txnNote||'-'}</td>
<td>
{req.proofUrl?(
<button onClick={()=>setProofModal(req.proofUrl)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)',display:'flex',alignItems:'center',gap:4,fontSize:12}}>
<ExternalLink size={13}/>View
</button>
):<span style={{fontSize:12,color:'var(--text-3)'}}>No proof</span>}
</td>
<td style={{fontSize:11,color:'var(--text-3)'}}>{fmtDateTime(req.createdAt)}</td>
<td style={{textAlign:'center'}}>{statusBadge(req.status)}</td>
<td style={{textAlign:'center'}}>
{req.status==='pending'?(
<div style={{display:'flex',gap:6,justifyContent:'center'}}>
<button onClick={()=>handleApprove(req)} disabled={processing===req.id} title="Approve" style={{background:'#16a34a',color:'white',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',display:'flex',alignItems:'center',gap:3,fontSize:11,fontWeight:600}}>
<Check size={13}/>{processing===req.id?'...':'Approve'}
</button>
<button onClick={()=>handleReject(req)} disabled={processing===req.id} title="Reject" style={{background:'#fcebeb',color:'#dc2626',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',display:'flex',alignItems:'center'}}>
<X size={13}/>
</button>
</div>
):req.status==='approved'?(
<div style={{display:'flex',gap:6,justifyContent:'center',alignItems:'center'}}>
<span style={{fontSize:11,color:'#16a34a'}}>✓ Done</span>
{(()=>{
const at=req.approvedAt?.seconds?new Date(req.approvedAt.seconds*1000):(req.createdAt?.seconds?new Date(req.createdAt.seconds*1000):null)
const withinWindow=!at||((new Date()-at)/(1000*60*60))<=48
return withinWindow?(
<button onClick={()=>handleRefund(req)} disabled={processing===req.id} title="Refund (48hr window)" style={{background:'#fcebeb',color:'#dc2626',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontSize:11,fontWeight:600}}>
{processing===req.id?'...':'Refund'}
</button>
):(
<span style={{fontSize:10,color:'var(--text-3)'}} title="48hr refund window passed">⏱ Window closed</span>
)
})()}
</div>
):req.status==='refunded'?(
<span style={{fontSize:11,fontWeight:600,color:'#dc2626',background:'#fcebeb',padding:'3px 10px',borderRadius:20}}>Refunded</span>
):(
<span style={{fontSize:11,color:'var(--text-3)'}}>{req.rejectReason||'Rejected'}</span>
)}
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
