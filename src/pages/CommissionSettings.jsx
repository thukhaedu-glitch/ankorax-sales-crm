import{useState,useEffect}from'react'
import{db}from'../firebase'
import{doc,getDoc,setDoc}from'firebase/firestore'
import Layout from'../components/Layout'
import{Percent,Plus,Trash2,Save,Award}from'lucide-react'

const fmtMMK=(n)=>n===Infinity||n===null||n===undefined?'∞':Number(n).toLocaleString('en-US')

// default tiers — config/commission မရှိရင် ဒါ သုံး
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

export default function CommissionSettings(){
const[tiers,setTiers]=useState(DEFAULT_TIERS)
const[bonus,setBonus]=useState(DEFAULT_BONUS)
const[loading,setLoading]=useState(true)
const[saving,setSaving]=useState(false)
const[msg,setMsg]=useState('')

const load=async()=>{
setLoading(true)
try{
const snap=await getDoc(doc(db,'config','commission'))
if(snap.exists()){
const d=snap.data()
if(d.tiers&&d.tiers.length)setTiers(d.tiers)
if(d.bonus)setBonus(d.bonus)
}
}catch(e){console.error(e)}
setLoading(false)
}
useEffect(()=>{load()},[])

const save=async()=>{
setSaving(true);setMsg('')
try{
await setDoc(doc(db,'config','commission'),{tiers,bonus,updatedAt:new Date().toISOString()})
setMsg('✓ Saved! Commission တွက်ချက်မှု update ဖြစ်ပါပြီ။')
setTimeout(()=>setMsg(''),4000)
}catch(e){setMsg('Error: '+e.message)}
setSaving(false)
}

const updateTier=(i,field,value)=>{
const t=[...tiers]
t[i]={...t[i],[field]:value===''?'':Number(value)}
setTiers(t)
}
const addTier=()=>{
const last=tiers[tiers.length-1]
const newMin=last&&last.max!==-1?last.max+1:0
setTiers([...tiers,{min:newMin,max:-1,rate:35}])
}
const delTier=(i)=>{
if(tiers.length<=1){alert('အနည်းဆုံး tier ၁ ခု လိုပါတယ်');return}
setTiers(tiers.filter((_,idx)=>idx!==i))
}

// preview — sale amount ဥပမာ နဲ့ commission တွက်ပြ
const[preview,setPreview]=useState(1000000)
const calcPreview=(amount)=>{
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

if(loading)return<Layout title="Commission Settings"><div style={{padding:40,textAlign:'center'}}>Loading...</div></Layout>

return(
<Layout title="Commission Settings">
<div style={{maxWidth:760,margin:'0 auto'}}>

<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<div>
<h2 style={{fontSize:18,fontWeight:700,display:'flex',alignItems:'center',gap:8}}><Percent size={20} color="var(--primary)"/>Commission Settings</h2>
<p style={{fontSize:13,color:'var(--text-3)'}}>Commission tier rate တွေ ဒီကနေ ပြင်ပါ။ Sale amount အလိုက် rate ကွဲပြားပါတယ်။</p>
</div>
<button onClick={save} disabled={saving} className="btn btn-primary"><Save size={15}/>{saving?'Saving...':'Save'}</button>
</div>

{msg&&<div style={{padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:13,background:msg.startsWith('✓')?'#eaf3de':'#fcebeb',color:msg.startsWith('✓')?'#16a34a':'#dc2626'}}>{msg}</div>}

{/* Tiers */}
<div className="card" style={{padding:20,marginBottom:16}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
<h3 style={{fontSize:15,fontWeight:700}}>Tier Rates</h3>
<button onClick={addTier} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 12px',borderRadius:8,border:'1px dashed var(--primary)',background:'var(--primary-light)',color:'var(--primary)',cursor:'pointer',fontSize:12,fontWeight:600}}><Plus size={14}/>Add Tier</button>
</div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,marginBottom:8,fontSize:11,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase'}}>
<span>Min (MMK)</span><span>Max (MMK, -1=∞)</span><span>Rate (%)</span><span></span>
</div>
{tiers.map((t,i)=>(
<div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,marginBottom:8,alignItems:'center'}}>
<input type="number" className="form-input" value={t.min} onChange={e=>updateTier(i,'min',e.target.value)} style={{fontSize:13}}/>
<input type="number" className="form-input" value={t.max} onChange={e=>updateTier(i,'max',e.target.value)} style={{fontSize:13}}/>
<input type="number" className="form-input" value={t.rate} onChange={e=>updateTier(i,'rate',e.target.value)} style={{fontSize:13}}/>
<button onClick={()=>delTier(i)} style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626'}}><Trash2 size={15}/></button>
</div>
))}
</div>

{/* Bonus */}
<div className="card" style={{padding:20,marginBottom:16}}>
<h3 style={{fontSize:15,fontWeight:700,marginBottom:14,display:'flex',alignItems:'center',gap:8}}><Award size={16} color="var(--primary)"/>Bonus</h3>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
<div>
<label style={{fontSize:12,color:'var(--text-3)',display:'block',marginBottom:4}}>Threshold (MMK ကျော်ရင်)</label>
<input type="number" className="form-input" value={bonus.threshold} onChange={e=>setBonus({...bonus,threshold:Number(e.target.value)})}/>
</div>
<div>
<label style={{fontSize:12,color:'var(--text-3)',display:'block',marginBottom:4}}>Bonus Amount (MMK)</label>
<input type="number" className="form-input" value={bonus.amount} onChange={e=>setBonus({...bonus,amount:Number(e.target.value)})}/>
</div>
</div>
</div>

{/* Preview */}
<div className="card" style={{padding:20}}>
<h3 style={{fontSize:15,fontWeight:700,marginBottom:14}}>Preview Calculator</h3>
<div style={{display:'flex',gap:12,alignItems:'flex-end'}}>
<div style={{flex:1}}>
<label style={{fontSize:12,color:'var(--text-3)',display:'block',marginBottom:4}}>Sale Amount (MMK)</label>
<input type="number" className="form-input" value={preview} onChange={e=>setPreview(Number(e.target.value))}/>
</div>
<div style={{textAlign:'right',padding:'8px 16px',background:'#eaf3de',borderRadius:10}}>
<div style={{fontSize:11,color:'var(--text-3)'}}>Commission</div>
<div style={{fontSize:20,fontWeight:700,color:'#16a34a'}}>{fmtMMK(calcPreview(preview))} MMK</div>
</div>
</div>
</div>

</div>
</Layout>
)
}
