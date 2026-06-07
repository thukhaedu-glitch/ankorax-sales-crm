import{useState}from'react'
import{auth}from'../firebase'
import{signInWithEmailAndPassword}from'firebase/auth'
import{useNavigate}from'react-router-dom'
import{Mail,Lock,Eye,EyeOff,AlertCircle}from'lucide-react'
import{useNavigate,Link}from'react-router-dom'

export default function Login(){
const[email,setEmail]=useState('')
const[pass,setPass]=useState('')
const[showPass,setShowPass]=useState(false)
const[error,setError]=useState('')
const[loading,setLoading]=useState(false)
const navigate=useNavigate()

const login=async e=>{
e.preventDefault()
setError('');setLoading(true)
try{
await signInWithEmailAndPassword(auth,email,pass)
navigate('/')
}catch(e){setError('Invalid email or password')}
setLoading(false)
}

return(
<div style={{minHeight:'100vh',background:'linear-gradient(135deg,#e8f0fe,#f0f4ff,#e8f8f0)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{width:'100%',maxWidth:380,background:'rgba(255,255,255,0.8)',backdropFilter:'blur(20px)',borderRadius:20,padding:'40px 32px',boxShadow:'0 8px 32px rgba(79,110,247,0.1)',border:'0.5px solid rgba(255,255,255,0.9)'}}>
<div style={{textAlign:'center',marginBottom:32}}>
<div style={{width:48,height:48,background:'var(--primary)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 4px 16px rgba(79,110,247,0.3)'}}>
<span style={{color:'white',fontWeight:800,fontSize:20,fontFamily:'Georgia'}}>X</span>
</div>
<div style={{fontSize:20,fontWeight:700}}>Sales CRM</div>
<div style={{fontSize:13,color:'var(--text-3)',marginTop:4}}>Sign in to your account</div>
</div>

{error&&(
<div style={{background:'#fcebeb',border:'0.5px solid #fca5a5',color:'#dc2626',padding:'10px 14px',borderRadius:10,fontSize:13,marginBottom:16,display:'flex',alignItems:'center',gap:8}}>
<AlertCircle size={14}/>{error}
</div>
)}

<form onSubmit={login}>
<div style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Email</label>
<div style={{position:'relative'}}>
<Mail size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="your@email.com" style={{paddingLeft:32}}/>
</div>
</div>
<div style={{marginBottom:20}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:4}}>Password</label>
<div style={{position:'relative'}}>
<Lock size={13} style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" type={showPass?'text':'password'} value={pass} onChange={e=>setPass(e.target.value)} required placeholder="••••••••" style={{paddingLeft:32,paddingRight:36}}/>
<button type="button" onClick={()=>setShowPass(v=>!v)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}>
{showPass?<EyeOff size={13}/>:<Eye size={13}/>}
</button>
</div>
</div>
<button type="submit" disabled={loading} className="btn btn-primary" style={{width:'100%',justifyContent:'center',padding:11,fontSize:14}}>
{loading?'Signing in...':'Sign In'}
</button>
  <div style={{textAlign:'center',fontSize:13,color:'var(--text-3)',marginTop:14}}>
Don't have an account?{' '}
<Link to="/signup" style={{color:'var(--primary)',fontWeight:500,textDecoration:'none'}}>Sign up</Link>
</div>
</form>
</div>
</div>
)
}
