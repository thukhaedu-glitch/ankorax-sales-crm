import{useState,useEffect}from'react'
import{db,storage}from'../firebase'
import{doc,getDoc,setDoc}from'firebase/firestore'
import{ref,uploadBytes,getDownloadURL}from'firebase/storage'
import Layout from'../components/Layout'
import{Save,Upload,X,FileText,Palette}from'lucide-react'

const DEFAULT={
businessName:'Ankorax',
addressLine:'Yangon, Myanmar',
phone:'',
email:'support@ankorax.com',
website:'',
logoUrl:'',
primaryColor:'#4f6ef7',
footerNote:'Thank you for your business — Ankorax',
}

export default function ReceiptSettings(){
const[data,setData]=useState(DEFAULT)
const[loading,setLoading]=useState(true)
const[saving,setSaving]=useState(false)
const[msg,setMsg]=useState('')

useEffect(()=>{
const load=async()=>{
try{
const snap=await getDoc(doc(db,'config','receipt'))
if(snap.exists())setData({...DEFAULT,...snap.data()})
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

const save=async()=>{
setSaving(true);setMsg('')
try{
await setDoc(doc(db,'config','receipt'),{...data,updatedAt:new Date().toISOString()})
setMsg('✓ Saved! Receipt template update ဖြစ်ပါပြီ။')
setTimeout(()=>setMsg(''),4000)
}catch(e){setMsg('Error: '+e.message)}
setSaving(false)
}

const uploadLogo=async(file)=>{
if(!file)return
try{
const r=ref(storage,`receiptLogo/${Date.now()}_${file.name}`)
await uploadBytes(r,file)
const url=await getDownloadURL(r)
setData({...data,logoUrl:url})
}catch(e){alert('Upload failed: '+e.message)}
}

const up=(k,v)=>setData({...data,[k]:v})

if(loading)return<Layout title="Receipt Settings"><div style={{padding:40,textAlign:'center'}}>Loading...</div></Layout>

return(
<Layout title="Receipt Settings">
<div style={{maxWidth:680,margin:'0 auto'}}>

<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<div>
<h2 style={{fontSize:18,fontWeight:700,display:'flex',alignItems:'center',gap:8}}><FileText size={20} color="var(--primary)"/>Receipt Settings</h2>
<p style={{fontSize:13,color:'var(--text-3)'}}>Customer download လုပ်တဲ့ PDF receipt ရဲ့ ပုံစံ ပြင်ပါ။</p>
</div>
<button onClick={save} disabled={saving} className="btn btn-primary"><Save size={15}/>{saving?'Saving...':'Save'}</button>
</div>

{msg&&<div style={{padding:'10px 14px',borderRadius:8,marginBottom:16,fontSize:13,background:msg.startsWith('✓')?'#eaf3de':'#fcebeb',color:msg.startsWith('✓')?'#16a34a':'#dc2626'}}>{msg}</div>}

{/* Logo + color */}
<div className="card" style={{padding:20,marginBottom:16}}>
<h3 style={{fontSize:14,fontWeight:700,marginBottom:14,display:'flex',alignItems:'center',gap:8}}><Palette size={15} color="var(--primary)"/>Branding</h3>
<div style={{display:'flex',gap:20,alignItems:'flex-start'}}>
<div>
<label style={{fontSize:12,color:'var(--text-3)',display:'block',marginBottom:6}}>Logo</label>
{data.logoUrl?(
<div style={{position:'relative',display:'inline-block'}}>
<img src={data.logoUrl} alt="logo" style={{width:120,height:120,objectFit:'contain',borderRadius:8,border:'0.5px solid var(--border)',background:'#f8fafc',padding:8}}/>
<button onClick={()=>up('logoUrl','')} style={{position:'absolute',top:-6,right:-6,background:'#dc2626',color:'white',border:'none',borderRadius:'50%',width:22,height:22,cursor:'pointer'}}><X size={12}/></button>
</div>
):(
<label style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,width:120,height:120,border:'2px dashed var(--border)',borderRadius:8,cursor:'pointer',color:'var(--text-3)'}}>
<Upload size={20}/><span style={{fontSize:11}}>Upload Logo</span>
<input type="file" accept="image/*" style={{display:'none'}} onChange={e=>uploadLogo(e.target.files[0])}/>
</label>
)}
<div style={{fontSize:10,color:'var(--text-3)',marginTop:6,maxWidth:120}}>မထည့်ရင် default logo သုံးမယ်</div>
</div>
<div style={{flex:1}}>
<label style={{fontSize:12,color:'var(--text-3)',display:'block',marginBottom:6}}>Primary Color</label>
<div style={{display:'flex',gap:10,alignItems:'center'}}>
<input type="color" value={data.primaryColor} onChange={e=>up('primaryColor',e.target.value)} style={{width:48,height:40,border:'0.5px solid var(--border)',borderRadius:8,cursor:'pointer'}}/>
<input value={data.primaryColor} onChange={e=>up('primaryColor',e.target.value)} className="form-input" style={{width:120,fontFamily:'monospace'}}/>
</div>
<div style={{marginTop:12,padding:14,borderRadius:8,background:data.primaryColor,color:'white',fontSize:13,fontWeight:600}}>Preview — header color</div>
</div>
</div>
</div>

{/* Business info */}
<div className="card" style={{padding:20}}>
<h3 style={{fontSize:14,fontWeight:700,marginBottom:14}}>Business Info</h3>
<div style={{display:'grid',gap:12}}>
{[
['businessName','Business Name'],
['addressLine','Address'],
['phone','Phone'],
['email','Email'],
['website','Website'],
['footerNote','Footer Note'],
].map(([k,label])=>(
<div key={k}>
<label style={{fontSize:12,color:'var(--text-3)',display:'block',marginBottom:4}}>{label}</label>
<input value={data[k]||''} onChange={e=>up(k,e.target.value)} className="form-input"/>
</div>
))}
</div>
</div>

</div>
</Layout>
)
}
