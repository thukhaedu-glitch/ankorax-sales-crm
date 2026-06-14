import{useState,useEffect}from'react'
import{db,storage}from'../firebase'
import{doc,getDoc,setDoc}from'firebase/firestore'
import{ref,uploadBytes,getDownloadURL}from'firebase/storage'
import Layout from'../components/Layout'
import{Save,Plus,Trash2,Star,CreditCard,RefreshCw,Upload,Copy,Check,X}from'lucide-react'

const fmtMMK=(n)=>Number(n||0).toLocaleString('en-US')+' MMK'

// default seed — config/plans မရှိရင် ဒါ သုံး
const DEFAULT_DATA={
plans:[
{key:'free',label:'Free Trial',price:0,discount:0,documents:10,customers:25,members:2,features:{finance:false,reportBuilder:false,auditLog:false},featureList:['Core CRM modules','Draft invoices & quotes','Basic dashboards'],active:true,popular:false},
{key:'starter',label:'Starter',price:49900,discount:0,documents:100,customers:200,members:3,features:{finance:false,reportBuilder:false,auditLog:false},featureList:['Core CRM modules','Draft invoices & quotes','Basic dashboards','100 documents/mo','Standard support'],active:true,popular:false},
{key:'growth',label:'Growth',price:69900,discount:0,documents:500,customers:1000,members:10,features:{finance:true,reportBuilder:false,auditLog:false},featureList:['Full finance module','Bank auto-reconciliation','Journal entries logging','500 documents/mo','24/7 priority support'],active:true,popular:true},
{key:'business',label:'Business',price:89900,discount:0,documents:-1,customers:-1,members:-1,features:{finance:true,reportBuilder:true,auditLog:true},featureList:['Everything in Growth','Custom report builder','Granular role permissions','Multi-office audit logs','Dedicated account lead'],active:true,popular:false},
],
paymentAccounts:[
{id:'acc1',name:'KBZPay',number:'09-XXX-XXX-XXX',accountName:'Your Name',qrUrl:''},
{id:'acc2',name:'KBZ Bank',number:'XXXX-XXXX-XXXX-XXXX',accountName:'Your Company',qrUrl:''},
],
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
if(snap.exists()){
const d=snap.data()
// old paymentInfo object → paymentAccounts array migrate
if(!d.paymentAccounts&&d.paymentInfo){
d.paymentAccounts=Object.entries(d.paymentInfo).map(([k,v],i)=>({id:'acc'+(i+1),name:v.name||k,number:v.number||'',accountName:v.accountName||'',qrUrl:v.qrUrl||''}))
}
if(!d.paymentAccounts)d.paymentAccounts=DEFAULT_DATA.paymentAccounts
setData(d)
}
else setData(DEFAULT_DATA)
}catch(e){setData(DEFAULT_DATA)}
setLoading(false)
}
useEffect(()=>{load()},[])

const save=async()=>{
setSaving(true);setMsg('')
try{
// backward compat — paymentInfo object ပါ ထည့် (old main app code အတွက်)
const paymentInfo={}
data.paymentAccounts.forEach((a,i)=>{paymentInfo[a.id||('acc'+i)]={name:a.name,number:a.number,accountName:a.accountName,qrUrl:a.qrUrl||''}})
await setDoc(doc(db,'config','plans'),{...data,paymentInfo,updatedAt:new Date().toISOString()})
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
const updatePayment=(idx,field,value)=>{
const accs=[...data.paymentAccounts]
accs[idx]={...accs[idx],[field]:value}
setData({...data,paymentAccounts:accs})
}
const addPayment=()=>{
setData({...data,paymentAccounts:[...data.paymentAccounts,{id:'acc'+Date.now().toString(36),name:'New Account',number:'',accountName:'',qrUrl:''}]})
}
const deletePayment=(idx)=>{
if(!confirm('ဒီ payment account ကို ဖြုတ်မလား?'))return
setData({...data,paymentAccounts:data.paymentAccounts.filter((_,i)=>i!==idx)})
}
const uploadQR=async(idx,file)=>{
if(!file)return
try{
const r=ref(storage,`paymentQR/${Date.now()}_${file.name}`)
await uploadBytes(r,file)
const url=await getDownloadURL(r)
updatePayment(idx,'qrUrl',url)
}catch(e){alert('Upload failed: '+e.message)}
}
const copyText=(text)=>{
navigator.clipboard.writeText(text)
setMsg('✓ Copied: '+text)
setTimeout(()=>setMsg(''),2000)
}

// Plan အသစ်ထည့်
const addPlan=()=>{
const newKey='plan_'+Date.now().toString(36)
const newPlan={key:newKey,label:'New Plan',price:0,discount:0,documents:50,customers:100,members:3,features:{finance:false,reportBuilder:false,auditLog:false},featureList:['Feature 1','Feature 2'],active:true,popular:false}
setData({...data,plans:[...data.plans,newPlan]})
}

// Plan ဖြုတ်
const deletePlan=(i)=>{
const p=data.plans[i]
if(p.key==='free'){alert('Free Trial plan ကို ဖြုတ်လို့မရပါ (signup အသစ်တွေ သုံးနေလို့)။');return}
if(!confirm(`"${p.label}" plan ကို ဖြုတ်မလား?\n\n⚠️ ဒီ plan သုံးနေတဲ့ company ရှိရင် ပြသနာဖြစ်နိုင်ပါတယ်။ Save လုပ်မှ အတည်ဖြစ်ပါမယ်။`))return
setData({...data,plans:data.plans.filter((_,idx)=>idx!==i)})
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
<button onClick={()=>deletePlan(i)} title="Delete plan" style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626'}}><Trash2 size={15}/></button>
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

{/* Add Plan button */}
<button onClick={addPlan} style={{display:'flex',alignItems:'center',gap:8,padding:'10px 18px',borderRadius:10,border:'1px dashed var(--primary)',background:'var(--primary-light)',color:'var(--primary)',cursor:'pointer',fontSize:13,fontWeight:600,marginBottom:20}}>
<Plus size={16}/>Add New Plan
</button>

{/* Payment info */}
<div className="card" style={{padding:20}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<h3 style={{fontSize:15,fontWeight:700,display:'flex',alignItems:'center',gap:8}}><CreditCard size={16} color="var(--primary)"/>Payment Accounts</h3>
<button onClick={addPayment} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,border:'1px dashed var(--primary)',background:'var(--primary-light)',color:'var(--primary)',cursor:'pointer',fontSize:12,fontWeight:600}}><Plus size={14}/>Add Account</button>
</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
{(data.paymentAccounts||[]).map((acc,idx)=>(
<div key={acc.id||idx} style={{background:'#f8fafc',borderRadius:10,padding:14,position:'relative'}}>
<button onClick={()=>deletePayment(idx)} style={{position:'absolute',top:10,right:10,background:'none',border:'none',cursor:'pointer',color:'#dc2626'}}><Trash2 size={14}/></button>
{['name','number','accountName'].map(f=>(
<div key={f} style={{marginBottom:8}}>
<label style={{fontSize:10,color:'var(--text-3)',display:'block',marginBottom:2,textTransform:'capitalize'}}>{f==='accountName'?'Account Name':f}</label>
<div style={{display:'flex',gap:6}}>
<input value={acc[f]||''} onChange={e=>updatePayment(idx,f,e.target.value)} className="form-input" style={{fontSize:12,flex:1}}/>
{f==='number'&&<button onClick={()=>copyText(acc.number)} title="Copy" style={{background:'var(--primary-light)',border:'none',borderRadius:6,padding:'0 10px',cursor:'pointer',color:'var(--primary)'}}><Copy size={14}/></button>}
</div>
</div>
))}
{/* QR upload */}
<div style={{marginTop:10}}>
<label style={{fontSize:10,color:'var(--text-3)',display:'block',marginBottom:4}}>QR Code (optional)</label>
{acc.qrUrl?(
<div style={{position:'relative',display:'inline-block'}}>
<img src={acc.qrUrl} alt="QR" style={{width:100,height:100,objectFit:'cover',borderRadius:8,border:'0.5px solid var(--border)'}}/>
<button onClick={()=>updatePayment(idx,'qrUrl','')} style={{position:'absolute',top:-6,right:-6,background:'#dc2626',color:'white',border:'none',borderRadius:'50%',width:20,height:20,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><X size={12}/></button>
</div>
):(
<label style={{display:'inline-flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,width:100,height:100,border:'2px dashed var(--border)',borderRadius:8,cursor:'pointer',color:'var(--text-3)'}}>
<Upload size={18}/>
<span style={{fontSize:10}}>Upload QR</span>
<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadQR(idx,e.target.files[0])}/>
</label>
)}
</div>
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
