import{useState,useEffect}from'react'
import{db}from'../firebase'
import{doc,getDoc}from'firebase/firestore'
import{useParams}from'react-router-dom'
import{CheckCircle,XCircle,Loader}from'lucide-react'

const fmtMMK=(n)=>Number(n||0).toLocaleString('en-US')+' MMK'
const fmtTS=(ts)=>{if(!ts)return'-';try{const d=ts.seconds?new Date(ts.seconds*1000):new Date(ts);return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}catch{return'-'}}

export default function VerifyReceipt(){
const{requestId}=useParams()
const[req,setReq]=useState(null)
const[loading,setLoading]=useState(true)
const[notFound,setNotFound]=useState(false)

useEffect(()=>{
const load=async()=>{
try{
const snap=await getDoc(doc(db,'upgradeRequests',requestId))
if(snap.exists())setReq({id:snap.id,...snap.data()})
else setNotFound(true)
}catch(e){console.error(e);setNotFound(true)}
setLoading(false)
}
load()
},[requestId])

const wrap={minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'system-ui,-apple-system,sans-serif'}
const card={background:'white',borderRadius:20,padding:'40px 32px',maxWidth:420,width:'100%',boxShadow:'0 8px 32px rgba(0,0,0,0.08)',border:'0.5px solid #e2e8f0'}

if(loading)return<div style={wrap}><div style={{...card,textAlign:'center'}}><Loader size={32} color="#4f6ef7" style={{animation:'spin 1s linear infinite'}}/><div style={{marginTop:12,color:'#94a3b8'}}>Verifying...</div></div></div>

if(notFound||!req)return(
<div style={wrap}>
<div style={{...card,textAlign:'center'}}>
<div style={{width:64,height:64,borderRadius:'50%',background:'rgba(220,38,38,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px'}}>
<XCircle size={32} color="#dc2626"/>
</div>
<h2 style={{fontSize:20,fontWeight:700,color:'#dc2626',marginBottom:8}}>Receipt မတွေ့ပါ</h2>
<p style={{color:'#94a3b8',fontSize:14}}>ဒီ receipt ID က မှားနေတယ် ဒါမှမဟုတ် ရှိမနေပါ။</p>
</div>
</div>
)

const isValid=req.status==='approved'
const isRefunded=req.status==='refunded'

return(
<div style={wrap}>
<div style={card}>
<div style={{textAlign:'center',marginBottom:24}}>
<div style={{fontSize:22,fontWeight:800,color:'#4f6ef7',marginBottom:4}}>Ankorax</div>
<div style={{fontSize:13,color:'#94a3b8'}}>Receipt Verification</div>
</div>

{/* status */}
<div style={{textAlign:'center',marginBottom:24}}>
{isValid?(
<>
<div style={{width:64,height:64,borderRadius:'50%',background:'rgba(22,163,74,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
<CheckCircle size={32} color="#16a34a"/>
</div>
<div style={{fontSize:18,fontWeight:700,color:'#16a34a'}}>✓ Verified</div>
<div style={{fontSize:13,color:'#94a3b8',marginTop:4}}>ဒီ receipt က စစ်မှန်ပါတယ်</div>
</>
):isRefunded?(
<>
<div style={{width:64,height:64,borderRadius:'50%',background:'rgba(220,38,38,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
<XCircle size={32} color="#dc2626"/>
</div>
<div style={{fontSize:18,fontWeight:700,color:'#dc2626'}}>Refunded</div>
<div style={{fontSize:13,color:'#94a3b8',marginTop:4}}>ဒီ payment ကို refund လုပ်ပြီးပါပြီ</div>
</>
):(
<>
<div style={{width:64,height:64,borderRadius:'50%',background:'rgba(217,119,6,0.1)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px'}}>
<Loader size={32} color="#d97706"/>
</div>
<div style={{fontSize:18,fontWeight:700,color:'#d97706',textTransform:'capitalize'}}>{req.status}</div>
</>
)}
</div>

{/* detail */}
<div style={{background:'#f8fafc',borderRadius:12,padding:16}}>
{[
['Receipt ID',req.id],
['Plan',(req.requestedPlan||'').charAt(0).toUpperCase()+(req.requestedPlan||'').slice(1)],
['Amount',fmtMMK(req.amount)],
['Date',fmtTS(req.approvedAt||req.createdAt)],
['Email',req.requestedByEmail||'-'],
].map(([k,v])=>(
<div key={k} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'0.5px solid #e2e8f0',fontSize:13}}>
<span style={{color:'#94a3b8'}}>{k}</span>
<span style={{fontWeight:600,color:'#1e293b',textAlign:'right',maxWidth:'60%',wordBreak:'break-all'}}>{v}</span>
</div>
))}
</div>

<div style={{textAlign:'center',marginTop:20,fontSize:11,color:'#cbd5e1'}}>Powered by Ankorax</div>
</div>
<style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
</div>
)
}
