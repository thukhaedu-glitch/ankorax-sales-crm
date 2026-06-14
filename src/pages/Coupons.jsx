import{useState,useEffect}from'react'
import{db}from'../firebase'
import{collection,getDocs,addDoc,updateDoc,deleteDoc,doc,serverTimestamp}from'firebase/firestore'
import Layout from'../components/Layout'
import{Ticket,Plus,Trash2,Save,X,Copy,Check}from'lucide-react'

const fmtMMK=(n)=>Number(n||0).toLocaleString('en-US')+' MMK'
const fmtDate=(d)=>{if(!d)return'No expiry';try{return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}catch{return d}}

export default function Coupons(){
const[coupons,setCoupons]=useState([])
const[loading,setLoading]=useState(true)
const[modal,setModal]=useState(null)
const[saving,setSaving]=useState(false)
const[copied,setCopied]=useState('')

const blank={code:'',type:'percent',value:10,expiry:'',usageLimit:0,active:true}

const load=async()=>{
setLoading(true)
try{
const snap=await getDocs(collection(db,'coupons'))
setCoupons(snap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
useEffect(()=>{load()},[])

const openNew=()=>setModal({...blank})
const openEdit=(c)=>setModal({...c})

const save=async()=>{
if(!modal.code.trim()){alert('Code ထည့်ပါ');return}
setSaving(true)
try{
const data={
code:modal.code.trim().toUpperCase(),
type:modal.type,
value:Number(modal.value),
expiry:modal.expiry||'',
usageLimit:Number(modal.usageLimit)||0,
usedCount:modal.usedCount||0,
active:modal.active,
}
if(modal.id){
await updateDoc(doc(db,'coupons',modal.id),data)
setCoupons(prev=>prev.map(c=>c.id===modal.id?{...c,...data}:c))
}else{
data.createdAt=serverTimestamp()
const ref=await addDoc(collection(db,'coupons'),data)
setCoupons(prev=>[...prev,{id:ref.id,...data}])
}
setModal(null)
}catch(e){alert(e.message)}
setSaving(false)
}

const del=async(c)=>{
if(!confirm(`Coupon "${c.code}" ဖျက်မလား?`))return
try{
await deleteDoc(doc(db,'coupons',c.id))
setCoupons(prev=>prev.filter(x=>x.id!==c.id))
}catch(e){alert(e.message)}
}

const toggleActive=async(c)=>{
try{
await updateDoc(doc(db,'coupons',c.id),{active:!c.active})
setCoupons(prev=>prev.map(x=>x.id===c.id?{...x,active:!x.active}:x))
}catch(e){alert(e.message)}
}

const copyCode=(code)=>{navigator.clipboard.writeText(code);setCopied(code);setTimeout(()=>setCopied(''),2000)}

const isExpired=(c)=>c.expiry&&new Date(c.expiry)<new Date()
const isUsedUp=(c)=>c.usageLimit>0&&(c.usedCount||0)>=c.usageLimit

if(loading)return<Layout title="Coupons"><div style={{padding:40,textAlign:'center'}}>Loading...</div></Layout>

return(
<Layout title="Coupons">
<div style={{maxWidth:900,margin:'0 auto'}}>

{/* Modal */}
{modal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:420}}>
<div style={{padding:'18px 22px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontWeight:600,fontSize:15}}>{modal.id?'Edit':'New'} Coupon</div>
<button onClick={()=>setModal(null)} style={{background:'none',border:'none',cursor:'pointer'}}><X size={18}/></button>
</div>
<div style={{padding:22}}>
<div style={{marginBottom:14}}>
<label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4}}>Coupon Code *</label>
<input className="form-input" value={modal.code} onChange={e=>setModal({...modal,code:e.target.value.toUpperCase()})} placeholder="NEWYEAR20" style={{fontFamily:'monospace',fontWeight:600}}/>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
<div>
<label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4}}>Type</label>
<select className="form-input" value={modal.type} onChange={e=>setModal({...modal,type:e.target.value})}>
<option value="percent">Percent (%)</option>
<option value="fixed">Fixed (MMK)</option>
</select>
</div>
<div>
<label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4}}>{modal.type==='percent'?'Percent (%)':'Amount (MMK)'}</label>
<input type="number" className="form-input" value={modal.value} onChange={e=>setModal({...modal,value:e.target.value})}/>
</div>
</div>
<div style={{marginBottom:14}}>
<label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4}}>Expiry Date (optional)</label>
<input type="date" className="form-input" value={modal.expiry} onChange={e=>setModal({...modal,expiry:e.target.value})}/>
</div>
<div style={{marginBottom:14}}>
<label style={{fontSize:12,fontWeight:500,display:'block',marginBottom:4}}>Usage Limit (0 = unlimited)</label>
<input type="number" className="form-input" value={modal.usageLimit} onChange={e=>setModal({...modal,usageLimit:e.target.value})}/>
</div>
<label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer',marginBottom:18}}>
<input type="checkbox" checked={modal.active} onChange={e=>setModal({...modal,active:e.target.checked})}/>Active
</label>
<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
<button onClick={()=>setModal(null)} className="btn btn-ghost">Cancel</button>
<button onClick={save} disabled={saving} className="btn btn-primary"><Save size={14}/>{saving?'Saving...':'Save'}</button>
</div>
</div>
</div>
</div>
)}

{/* Header */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<div>
<h2 style={{fontSize:18,fontWeight:700,display:'flex',alignItems:'center',gap:8}}><Ticket size={20} color="var(--primary)"/>Coupons</h2>
<p style={{fontSize:13,color:'var(--text-3)'}}>Promo code တွေ ဖန်တီးပါ။ User က Upgrade page မှာ ရိုက်ထည့်ပြီး discount ရမယ်။</p>
</div>
<button onClick={openNew} className="btn btn-primary"><Plus size={15}/>New Coupon</button>
</div>

{/* List */}
<div className="card" style={{overflow:'hidden'}}>
{coupons.length===0?(
<div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>
<Ticket size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No coupons yet</div>
</div>
):(
<table style={{width:'100%'}}>
<thead>
<tr>
<th>Code</th>
<th>Discount</th>
<th>Expiry</th>
<th>Usage</th>
<th style={{textAlign:'center'}}>Status</th>
<th style={{textAlign:'center'}}>Action</th>
</tr>
</thead>
<tbody>
{coupons.map(c=>{
const expired=isExpired(c),usedUp=isUsedUp(c)
const dead=!c.active||expired||usedUp
return(
<tr key={c.id} style={{opacity:dead?0.55:1}}>
<td>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<span style={{fontFamily:'monospace',fontWeight:700,fontSize:14}}>{c.code}</span>
<button onClick={()=>copyCode(c.code)} style={{background:'none',border:'none',cursor:'pointer',color:copied===c.code?'#16a34a':'var(--text-3)'}}>{copied===c.code?<Check size={13}/>:<Copy size={13}/>}</button>
</div>
</td>
<td style={{fontWeight:600}}>{c.type==='percent'?`${c.value}% off`:`${fmtMMK(c.value)} off`}</td>
<td style={{fontSize:12,color:expired?'#dc2626':'var(--text-3)'}}>{fmtDate(c.expiry)}{expired&&' (expired)'}</td>
<td style={{fontSize:12,color:usedUp?'#dc2626':'var(--text-3)'}}>{c.usageLimit>0?`${c.usedCount||0}/${c.usageLimit}`:`${c.usedCount||0}/∞`}</td>
<td style={{textAlign:'center'}}>
<button onClick={()=>toggleActive(c)} style={{
fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,border:'none',cursor:'pointer',
background:c.active?'#eaf3de':'#f1f5f9',color:c.active?'#16a34a':'#64748b',
}}>{c.active?'Active':'Inactive'}</button>
</td>
<td style={{textAlign:'center'}}>
<div style={{display:'flex',gap:6,justifyContent:'center'}}>
<button onClick={()=>openEdit(c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)',fontSize:12,fontWeight:600}}>Edit</button>
<button onClick={()=>del(c)} style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626'}}><Trash2 size={14}/></button>
</div>
</td>
</tr>
)
})}
</tbody>
</table>
)}
</div>

</div>
</Layout>
)
}
