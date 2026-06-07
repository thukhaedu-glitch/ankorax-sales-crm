import{useState,useEffect}from'react'
import{db,auth}from'../firebase'
import{collection,getDocs,query,orderBy,limit}from'firebase/firestore'
import Layout from'../components/Layout'
import{Target,Users,Calendar,DollarSign,TrendingUp,CheckCircle,Clock,XCircle}from'lucide-react'
import{LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,PieChart,Pie,Cell}from'recharts'

const LEAD_STATUSES=['New','Contacted','Demo','Negotiating','Won','Lost']
const STATUS_COLORS={New:'#4F6EF7',Contacted:'#06b6d4',Demo:'#8b5cf6',Negotiating:'#d97706',Won:'#16a34a',Lost:'#dc2626'}

export default function Dashboard(){
const[leads,setLeads]=useState([])
const[clients,setClients]=useState([])
const[followUps,setFollowUps]=useState([])
const[commissions,setCommissions]=useState([])
const[loading,setLoading]=useState(true)

useEffect(()=>{
const load=async()=>{
try{
const[lSnap,cSnap,fSnap,comSnap]=await Promise.all([
getDocs(collection(db,'leads')),
getDocs(collection(db,'crmClients')),
getDocs(collection(db,'followUps')),
getDocs(collection(db,'commissions')),
])
setLeads(lSnap.docs.map(d=>({id:d.id,...d.data()})))
setClients(cSnap.docs.map(d=>({id:d.id,...d.data()})))
setFollowUps(fSnap.docs.map(d=>({id:d.id,...d.data()})))
setCommissions(comSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

const wonLeads=leads.filter(l=>l.status==='Won')
const totalDealValue=wonLeads.reduce((s,l)=>s+Number(l.dealValue||0),0)
const totalCommission=commissions.reduce((s,c)=>s+Number(c.amount||0),0)
const todayFollowUps=followUps.filter(f=>f.date===new Date().toISOString().split('T')[0]&&!f.done)

const pieData=LEAD_STATUSES.map(s=>({
name:s,
value:leads.filter(l=>l.status===s).length,
})).filter(d=>d.value>0)

const monthlyData=Array.from({length:6},(_,i)=>{
const d=new Date()
d.setMonth(d.getMonth()-5+i)
const m=d.toISOString().slice(0,7)
const label=d.toLocaleString('default',{month:'short'})
return{
month:label,
leads:leads.filter(l=>l.createdAt?.slice(0,7)===m).length,
won:leads.filter(l=>l.status==='Won'&&l.createdAt?.slice(0,7)===m).length,
}
})

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>

return(
<Layout title="Dashboard">

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
{[
{label:'Total Leads',value:leads.length,icon:Target,color:'#4F6EF7',bg:'rgba(79,110,247,0.1)'},
{label:'Won Deals',value:wonLeads.length,icon:CheckCircle,color:'#16a34a',bg:'rgba(22,163,74,0.1)'},
{label:'Total Revenue',value:`${totalDealValue.toLocaleString()} Ks`,icon:TrendingUp,color:'#8b5cf6',bg:'rgba(139,92,246,0.1)'},
{label:'Commissions',value:`${totalCommission.toLocaleString()} Ks`,icon:DollarSign,color:'#d97706',bg:'rgba(217,119,6,0.1)'},
].map(({label,value,icon:Icon,color,bg})=>(
<div key={label} className="card" style={{padding:16}}>
<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
<span style={{fontSize:12,color:'var(--text-2)',fontWeight:500}}>{label}</span>
<div style={{width:32,height:32,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
<Icon size={16} color={color}/>
</div>
</div>
<div style={{fontSize:20,fontWeight:700,color}}>{value}</div>
</div>
))}
</div>

{/* Charts */}
<div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16,marginBottom:20}}>
<div className="card" style={{padding:20}}>
<div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Monthly Leads vs Won</div>
<ResponsiveContainer width="100%" height={200}>
<LineChart data={monthlyData}>
<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
<XAxis dataKey="month" tick={{fontSize:11,fill:'#9aa0b4'}} axisLine={false} tickLine={false}/>
<YAxis tick={{fontSize:11,fill:'#9aa0b4'}} axisLine={false} tickLine={false}/>
<Tooltip contentStyle={{fontSize:12,borderRadius:8,border:'0.5px solid #e2e8f0'}}/>
<Line type="monotone" dataKey="leads" name="Leads" stroke="#4F6EF7" strokeWidth={2} dot={{r:3}}/>
<Line type="monotone" dataKey="won" name="Won" stroke="#16a34a" strokeWidth={2} dot={{r:3}}/>
</LineChart>
</ResponsiveContainer>
</div>

<div className="card" style={{padding:20}}>
<div style={{fontWeight:600,fontSize:14,marginBottom:16}}>Lead Pipeline</div>
<ResponsiveContainer width="100%" height={200}>
<PieChart>
<Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
{pieData.map((entry,i)=><Cell key={i} fill={STATUS_COLORS[entry.name]||'#4F6EF7'}/>)}
</Pie>
<Tooltip contentStyle={{fontSize:11,borderRadius:8}}/>
</PieChart>
</ResponsiveContainer>
</div>
</div>

{/* Today Follow-ups + Recent Clients */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
<div className="card" style={{padding:20}}>
<div style={{fontWeight:600,fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
<Calendar size={15} color="var(--primary)"/>
Today's Follow-ups
<span style={{background:'rgba(220,38,38,0.1)',color:'#dc2626',fontSize:11,padding:'1px 7px',borderRadius:20,fontWeight:600}}>{todayFollowUps.length}</span>
</div>
{todayFollowUps.length===0?(
<div style={{textAlign:'center',color:'var(--text-3)',fontSize:12,padding:20}}>No follow-ups today 🎉</div>
):todayFollowUps.slice(0,5).map(f=>(
<div key={f.id} style={{padding:'8px 0',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div>
<div style={{fontSize:13,fontWeight:500}}>{f.clientName||f.leadName}</div>
<div style={{fontSize:11,color:'var(--text-3)'}}>{f.note}</div>
</div>
<span style={{fontSize:11,background:'rgba(217,119,6,0.1)',color:'#d97706',padding:'2px 8px',borderRadius:20,fontWeight:500}}>Today</span>
</div>
))}
</div>

<div className="card" style={{padding:20}}>
<div style={{fontWeight:600,fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
<Users size={15} color="#16a34a"/>
Recent Clients
</div>
{clients.length===0?(
<div style={{textAlign:'center',color:'var(--text-3)',fontSize:12,padding:20}}>No clients yet</div>
):clients.slice(0,5).map(c=>(
<div key={c.id} style={{padding:'8px 0',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div>
<div style={{fontSize:13,fontWeight:500}}>{c.companyName}</div>
<div style={{fontSize:11,color:'var(--text-3)'}}>{c.plan||'Starter'} • {c.createdAt?.slice(0,10)}</div>
</div>
<span style={{fontSize:11,background:'rgba(22,163,74,0.1)',color:'#16a34a',padding:'2px 8px',borderRadius:20,fontWeight:500}}>Active</span>
</div>
))}
</div>
</div>

</Layout>
)
}
