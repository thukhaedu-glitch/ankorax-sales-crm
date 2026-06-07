import{useState}from'react'
import{auth,db}from'../firebase'
import{createUserWithEmailAndPassword}from'firebase/auth'
import{doc,setDoc}from'firebase/firestore'
import{useNavigate,Link}from'react-router-dom'
import{Mail,Lock,Eye,EyeOff,User,AlertCircle}from'lucide-react'

export default function Signup(){
const[form,setForm]=useState({name:'',email:'',phone:'',password:'',confirm:''})
const[showPass,setShowPass]=useState(false)
const[error,setError]=useState('')
const[loading,setLoading]=useState(false)
const navigate=useNavigate()

const handleSignup=async e=>{
e.preventDefault()
setError('')
if(!form.name){setError('Name required');return}
if(form.password!==form.confirm){setError('Passwords do not match');return}
if(form.password.length<6){setError('Password must be at least 6 characters');return}
setLoading(true)
try{
const cred=await createUserWithEmailAndPassword(auth,form.email,form.password)
await setDoc(doc(db,'salesReps',cred.user.uid),{
name:form.name,
email:form.email,
phone:form.phone||'',
role:'Junior Rep',
active:true,
target:0,
createdAt:new Date().toISOString(),
createdBy:cred.user.uid,
})
navigate('/')
}catch(e){
if(e.code==='auth/email-already-in-use')setError('Email already in use')
else if(e.code==='auth/weak-password')setError('Password too weak')
else setError(e.message)
}
setLoading(false)
}

return(
<div style={{minHeight:'100vh',background:'linear-gradient(135deg,#e8f0fe,#f0f4ff,#e8f8f0)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{width:'100%',maxWidth:400,background:'rgba(255,255,255,0.85)',backdropFilter:'blur(20px)',borderRadius:20,padding:'40px 32px',boxShadow:'0 8px 32px rgba(79,110,247,0.1)',border:'0.5px solid rgba(255,255,255,0.9)'}}>

<div style={{textAlign:'center',marginBottom:28}}>
<div style={{width:48,height:48,background:'var(--primary)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 4px 16px rgba(79,110,247,0.3)'}}>
<span style={{color:'white',fontWeight:800,fontSize:20,fontFamily:'Georgia'}}>X</span>
</div>
<div style={{fontSize:20,fontWeight:700}}>Create Account</div>
<div style={{fontSize:13,color:'var(--text-3)',marginTop:4}}>Join AnkoraX Sales CRM</div>
</div>

{error&&(
<div style={{background:'#fcebeb',border:'0.5px solid #fca5a5',color:'#dc2626',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
<AlertCircle size={14}/>{error}
</div>
)}

<form onSubmit={handleSignup}>
<div style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Full Name *</label>
<div style={{position:'relative'}}>
<User size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="Your name..." style={{paddingLeft:32}}/>
</div>
</div>

<div style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Email *</label>
<div style={{position:'relative'}}>
<Mail size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required placeholder="your@email.com" style={{paddingLeft:32}}/>
</div>
</div>

<div style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Phone (optional)</label>
<input className="form-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="09..."/>
</div>

<div style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Password *</label>
<div style={{position:'relative'}}>
<Lock size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" type={showPass?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required placeholder="Min 6 characters" style={{paddingLeft:32,paddingRight:36}}/>
<button type="button" onClick={()=>setShowPass(v=>!v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}>
{showPass?<EyeOff size={13}/>:<Eye size={13}/>}
</button>
</div>
</div>

<div style={{marginBottom:20}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Confirm Password *</label>
<div style={{position:'relative'}}>
<Lock size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" type={showPass?'text':'password'} value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} required placeholder="Repeat password" style={{paddingLeft:32}}/>
</div>
</div>

<button type="submit" disabled={loading} className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:11,fontSize:14,marginBottom:14}}>
{loading?'Creating account...':'Create Account'}
</button>

<div style={{textAlign:'center',fontSize:13,color:'var(--text-3)'}}>
Already have an account?{' '}
<Link to="/login" style={{color:'var(--primary)',fontWeight:500,textDecoration:'none'}}>Sign in</Link>
</div>
</form>
</div>
</div>
)
}
