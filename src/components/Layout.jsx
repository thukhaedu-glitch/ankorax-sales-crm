import{useState}from'react'
import{auth}from'../firebase'
import{signOut}from'firebase/auth'
import{useLocation,useNavigate}from'react-router-dom'

import{LayoutDashboard,Users,UserPlus,Calendar,DollarSign,Menu,X,LogOut,Target,UserCheck,CreditCard,BarChart2,Settings,Ticket,Percent}from'lucide-react'


const NAV=[
{path:'/',label:'Dashboard',icon:LayoutDashboard},
{path:'/leads',label:'Leads',icon:Target},
{path:'/clients',label:'Clients',icon:Users},
{path:'/follow-ups',label:'Follow-ups',icon:Calendar},
{path:'/commissions',label:'Commissions',icon:DollarSign},
{path:'/sales-reps',label:'Sales Team',icon:UserPlus},
{path:'/users',label:'Users',icon:Users},
{path:'/payments',label:'Payments',icon:CreditCard},
{path:'/analytics',label:'Analytics',icon:BarChart2},
{path:'/plan-management',label:'Plan Management',icon:Settings},
{path:'/coupons',label:'Coupons',icon:Ticket},
{path:'/commission-settings',label:'Commission Settings',icon:Percent},
]

const Logo=()=>(
<svg width="32" height="32" viewBox="0 0 32 32" fill="none">
<rect width="32" height="32" rx="9" fill="url(#g)"/>
<defs>
<linearGradient id="g" x1="0" y1="0" x2="32" y2="32">
<stop offset="0%" stopColor="#4F6EF7"/>
<stop offset="100%" stopColor="#7C3AED"/>
</linearGradient>
</defs>
<text x="4" y="23" fontSize="17" fontWeight="800" fill="white" fontFamily="Georgia,serif">X</text>
</svg>
)

export default function Layout({children,title}){
const[open,setOpen]=useState(false)
const location=useLocation()
const navigate=useNavigate()

return(
<div style={{display:'flex',minHeight:'100vh'}}>
{open&&<div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.3)',zIndex:98}}/>}

<aside className={`sidebar${open?' open':''}`}>
<div style={{padding:'18px 16px 14px',borderBottom:'0.5px solid var(--border)'}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<Logo/>
<div>
<div style={{fontWeight:700,fontSize:14,color:'var(--text-1)'}}>Ankora<span style={{color:'var(--primary)'}}>X</span></div>
<div style={{fontSize:10,color:'var(--text-3)'}}>Sales CRM</div>
</div>
</div>
</div>

<nav style={{flex:1,padding:'12px 10px',overflowY:'auto'}}>
<div style={{fontSize:10,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.07em',padding:'8px 8px 4px'}}>Main</div>
{NAV.map(item=>(
<div key={item.path} className={`nav-item${location.pathname===item.path?' active':''}`} onClick={()=>{navigate(item.path);setOpen(false)}}>
<item.icon size={16}/><span>{item.label}</span>
</div>
))}
</nav>

<div style={{padding:10,borderTop:'0.5px solid var(--border)'}}>
<div style={{fontSize:10,color:'var(--text-3)',textAlign:'center',marginBottom:8}}>
Powered by <span style={{fontWeight:700,color:'var(--primary)'}}>AnkoraX</span>
</div>
<div className="nav-item" style={{color:'#ef4444'}} onClick={()=>signOut(auth)}>
<LogOut size={16}/><span>Logout</span>
</div>
</div>
</aside>

<div className="main-area">
<div className="topbar">
<button onClick={()=>setOpen(v=>!v)} className="btn btn-ghost" style={{padding:'6px 8px',display:'none'}} id="hamburger">
{open?<X size={18}/>:<Menu size={18}/>}
</button>
<div style={{fontWeight:500,fontSize:15,color:'var(--text-1)',flex:1}}>{title}</div>
<div style={{fontSize:11,background:'var(--primary-light)',color:'var(--primary)',padding:'3px 10px',borderRadius:20,fontWeight:600}}>Sales CRM</div>
</div>
<div className="page-content">{children}</div>
</div>
</div>
)
}
