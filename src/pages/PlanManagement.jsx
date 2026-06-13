import{useState,useEffect}from'react'
import{db}from'../firebase'
import{doc,getDoc,setDoc}from'firebase/firestore'
import Layout from'../components/Layout'
import{Save,Plus,Trash2,Star,CreditCard,RefreshCw}from'lucide-react'

const fmtMMK=(n)=>Number(n||0).toLocaleString('en-US')+' MMK'

// default seed — config/plans မရှိရင် ဒါ သုံး
const DEFAULT_DATA={
plans:[
{key:'free',label:'Free Trial',price:0,discount:0,documents:10,customers:25,members:2,features:{finance:false,reportBuilder:false,auditLog:false},featureList:['Core CRM modules','Draft invoices & quotes','Basic dashboards'],active:true,popular:false},
{key:'starter',label:'Starter',price:49900,discount:0,documents:100,customers:200,members:3,features:{finance:false,reportBuilder:false,auditLog:false},featureList:['Core CRM modules','Draft invoices & quotes','Basic dashboards','100 documents/mo','Standard support'],active:true,popular:false},
{key:'growth',label:'Growth',price:69900,discount:0,documents:500,customers:1000,members:10,features:{finance:true,reportBuilder:false,auditLog:false},featureList:['Full finance module','Bank auto-reconciliation','Journal entries logging','500 documents/mo','24/7 priority support'],active:true,popular:true},
{key:'business',label:'Business',price:89900,discount:0,documents:-1,customers:-1,members:-1,features:{finance:true,reportBuilder:true,auditLog:true},featureList:['Everything in Growth','Custom report builder','Granular role permissions','Multi-office audit logs','Dedicated account lead'],active:true,popular:false},
],
paymentInfo:{
kpay:{name:'KBZPay',number:'09-XXX-XXX-XXX',accountName:'Your Name'},
bank:{name:'KBZ Bank',number:'XXXX-XXXX-XXXX-XXXX',accountName:'Your Company'},
},
}

export default function PlanManagement(){
const[data,setData]=useState(null)
const[loading,setLoading]=useState(true)
const[saving,setSaving]=useState(false)
const[msg,setMsg]=useState('')

const load=async()=>{
setLoading(true)
try{
const snap=await getDoc(doc(db,'config','plans'))
if(snap.exists())setData(snap.data())
else setData(DEFAULT_DATA)
}catch(e){setData(DEFAULT_DATA)}
setLoading(false)
}
useEffect(()=>{load()},[])

const save=async()=>{
setSaving(true);setMsg('')
try{
await setDoc(doc(db,'config','plans'),{...data,updatedAt:new Date().toISOString()})
setMsg('✓ Saved! Main app မှာ အလိုအလျောက် update ဖြစ်ပါပြီ။')
setTimeout(()=>setMsg(''),4000)
}catch(e){setMsg('Error: '+e.message)}
setSaving(false)
}

const updatePlan=(i,field,value)=>{
const plans=[...data.plans]
plans[i]={...plans[i],[field]:value}
setData({...data,plans})
}
const updateFeature=(i,feat,value)=>{
const plans=[...data.plans]
plans[i]={...plans[i],features:{...plans[i].features,[feat]:value}}
setData({...data,plans})
}
const updateFeatureList=(i,text)=>{
const plans=[...data.plans]
plans[i]={...plans[i],featureList:text.split('\n').filter(x=>x.trim())}
setData({...data,plans})
}
const setPopular=(i)=>{
const plans=data.plans.map((p,idx)=>({...p,popular:idx===i}))
setData({...data,plans})
}
const updatePayment=(acc,field,value)=>{
setData({...data,paymentInfo:{...data.paymentInfo,[acc]:{...data.paymentInfo[acc],[field]:value}}})
}

if(loading)return<Layout title="Plan Management"><div style={{padding:40,textAlign:'center'}}>Loading...</div></Layout>

return(
<Layout title="Plan Management">
<div style={{maxWidth:1100,margin:'0 auto'}}>

{/* Header */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<div>
<h2 style={{fontSize:18,fontWeight:700}}>Plan Management</h2>
<p style={{fontSize:13,color:'var(--text-3)'}}>Plan ဈေး၊ limit၊ feature တွေ ဒီကနေ control လုပ်ပါ။ Save ရင် main app မှာ ချက်ချင်း update ဖြစ်ပါတယ်။</p>
</div>
<button onClick={save} disabled={saving} className="btn btn-primary"><Save size={15}/>{saving?'Saving...':'Save All'}</button>
</div>

{msg&&<div style={{padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:13,background:msg.startsWith('✓')?'#eaf3de':'#fcebeb',color:msg.startsWith('✓')?'#16a34a':'#dc2626'}}>{msg}</div>}

{/* Plan cards */}
<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:20}}>
{data.plans.map((p,i)=>(
<div key={p.key} className="card" style={{padding:20,border:p.popular?'2px solid var(--primary)':'0.5px solid var(--border)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<div style={{display:'flex',alignItems:'center',gap:8}}>
<input value={p.label} onChange={e=>updatePlan(i,'label',e.target.value)} style={{fontSize:16,fontWeight:700,border:'none',borderBottom:'1px dashed var(--border)',outline:'none',width:120,color:'var(--primary)'}}/>
<span style={{fontSize:10,color:'var(--text-3)',fontFamily:'monospace'}}>{p.key}</span>
</div>
<div style={{display:'flex',gap:8,alignItems:'center'}}>
<button onClick={()=>setPopular(i)} title="Mark popular" style={{background:'none',border:'none',cursor:'pointer',color:p.popular?'#f59e0b':'#cbd5e1'}}><Star size={16} fill={p.popular?'#f59e0b':'none'}/></button>
<label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,cursor:'pointer'}}>
<input type="checkbox" checked={p.active} onChange={e=>updatePlan(i,'active',e.target.checked)}/>Active
</label>
</div>
</div>

{/* Price + discount */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
<div>
<label style={{fontSize:11,color:'var(--text-3)',display:'block',marginBottom:3}}>Price (MMK)</label>
<input type="number" value={p.price} onChange={e=>updatePlan(i,'price',Number(e.target.value))} className="form-input" style={{fontSize:13}}/>
</div>
<div>
<label style={{fontSize:11,color:'var(--text-3)',display:'block',marginBottom:3}}>Discount (%)</label>
<input type="number" value={p.discount||0} onChange={e=>updatePlan(i,'discount',Number(e.target.value))} className="form-input" style={{fontSize:13}}/>
</div>
</div>
{p.discount>0&&<div style={{fontSize:11,color:'#16a34a',marginBottom:10}}>After discount: {fmtMMK(Math.round(p.price*(1-p.discount/100)))}</div>}

{/* Limits */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:12}}>
{['documents','customers','members'].map(f=>(
<div key={f}>
<label style={{fontSize:10,color:'var(--text-3)',display:'block',marginBottom:3,textTransform:'capitalize'}}>{f} (-1=∞)</label>
<input type="number" value={p[f]} onChange={e=>updatePlan(i,f,Number(e.target.value))} className="form-input" style={{fontSize:12,padding:'5px 8px'}}/>
</div>
))}
</div>

{/* Feature toggles */}
<div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
{[['finance','Finance'],['reportBuilder','Report Builder'],['auditLog','Audit Log']].map(([k,lbl])=>(
<label key={k} style={{display:'flex',alignItems:'center',gap:5,fontSize:12,cursor:'pointer'}}>
<input type="checkbox" checked={p.features?.[k]||false} onChange={e=>updateFeature(i,k,e.target.checked)}/>{lbl}
</label>
))}
</div>

{/* Feature list */}
<div>
<label style={{fontSize:11,color:'var(--text-3)',display:'block',marginBottom:3}}>Feature list (တစ်ကြောင်းစီ)</label>
<textarea value={(p.featureList||[]).join('\n')} onChange={e=>updateFeatureList(i,e.target.value)} rows={5} className="form-input" style={{fontSize:12,fontFamily:'inherit',resize:'vertical'}}/>
</div>
</div>
))}
</div>

{/* Payment info */}
<div className="card" style={{padding:20}}>
<h3 style={{fontSize:15,fontWeight:700,marginBottom:14,display:'flex',alignItems:'center',gap:8}}><CreditCard size={16} color="var(--primary)"/>Payment Accounts</h3>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
{Object.keys(data.paymentInfo||{}).map(acc=>(
<div key={acc} style={{background:'#f8fafc',borderRadius:10,padding:14}}>
<div style={{fontSize:12,fontWeight:700,marginBottom:8,textTransform:'uppercase',color:'var(--text-3)'}}>{acc}</div>
{['name','number','accountName'].map(f=>(
<div key={f} style={{marginBottom:8}}>
<label style={{fontSize:10,color:'var(--text-3)',display:'block',marginBottom:2}}>{f}</label>
<input value={data.paymentInfo[acc][f]||''} onChange={e=>updatePayment(acc,f,e.target.value)} className="form-input" style={{fontSize:12}}/>
</div>
))}
</div>
))}
</div>
</div>

<div style={{marginTop:16,textAlign:'right'}}>
<button onClick={save} disabled={saving} className="btn btn-primary"><Save size={15}/>{saving?'Saving...':'Save All'}</button>
</div>

</div>
</Layout>
)
}
