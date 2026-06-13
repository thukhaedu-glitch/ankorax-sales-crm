import{useState,useEffect}from'react'
import{db}from'../firebase'
import{collection,getDocs}from'firebase/firestore'
import Layout from'../components/Layout'
import{Users,DollarSign,TrendingUp,Crown,CheckCircle,AlertTriangle}from'lucide-react'
import{PieChart,Pie,Cell,ResponsiveContainer,Legend,BarChart,Bar,XAxis,YAxis,Tooltip,CartesianGrid}from'recharts'

const fmtMMK=(n)=>Number(n||0).toLocaleString('en-US')+' MMK'
const PLAN_COLORS={free:'#94a3b8',starter:'#8b5cf6',growth:'#4F6EF7',business:'#2563eb'}
const PLAN_LABELS={free:'Free Trial',starter:'Starter',growth:'Growth',business:'Business'}
const PLAN_PRICE={free:0,starter:49900,growth:69900,business:89900}

const normalizePlan=(p)=>{
if(!p)return'free'
const x=String(p).toLowerCase()
if(x==='free'||x==='trial')return'free'
if(x==='starter')return'starter'
if(x==='growth')return'growth'
if(x==='business')return'business'
return'free'
}

export default function Analytics(){
const[companies,setCompanies]=useState([])
const[upgrades,setUpgrades]=useState([])
const[loading,setLoading]=useState(true)

useEffect(()=>{
const load=async()=>{
try{
const[cSnap,uSnap]=await Promise.all([
getDocs(collection(db,'companies')),
getDocs(collection(db,'upgradeRequests')),
])
setCompanies(cSnap.docs.map(d=>({id:d.id,...d.data()})))
setUpgrades(uSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

if(loading)return<Layout title="Analytics"><div style={{padding:40,textAlign:'center'}}>Loading...</div></Layout>

const now=new Date()
// plan အလိုက် count
const planCount={free:0,starter:0,growth:0,business:0}
let activeCount=0,expiredCount=0
companies.forEach(c=>{
const plan=normalizePlan(c.plan)
planCount[plan]=(planCount[plan]||0)+1
const endD=c.subscriptionEnd||c.endDate||''
const raw=c.subscriptionStatus||'active'
const isExpired=endD&&new Date(endD)<now&&(raw==='active'||raw==='hold')
if(raw==='active'&&!isExpired)activeCount++
else if(isExpired||raw==='expired')expiredCount++
})

const totalUsers=companies.length
const paidUsers=planCount.starter+planCount.growth+planCount.business
const freeUsers=planCount.free

// subscription revenue (approved upgrades)
const approvedUps=upgrades.filter(u=>u.status==='approved')
const totalRevenue=approvedUps.reduce((s,u)=>s+Number(u.amount||0),0)
// ဒီလ revenue
const ym=now.getFullYear()+'-'+now.getMonth()
const monthRevenue=approvedUps.filter(u=>{
const t=u.approvedAt?.seconds?new Date(u.approvedAt.seconds*1000):(u.createdAt?.seconds?new Date(u.createdAt.seconds*1000):null)
if(!t)return false
return(t.getFullYear()+'-'+t.getMonth())===ym
}).reduce((s,u)=>s+Number(u.amount||0),0)

// pie data (plan distribution)
const pieData=Object.keys(planCount).filter(k=>planCount[k]>0).map(k=>({
name:PLAN_LABELS[k],value:planCount[k],plan:k,
}))

// bar data (plan အလိုက် ဖြစ်နိုင်ခြေ revenue — count × price)
const barData=['starter','growth','business'].map(k=>({
plan:PLAN_LABELS[k],
users:planCount[k],
revenue:planCount[k]*PLAN_PRICE[k],
}))

const stat=(label,value,Icon,color,bg,sub)=>(
<div className="card" style={{padding:18}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
<span style={{fontSize:12,color:'var(--text-3)'}}>{label}</span>
<div style={{width:32,height:32,borderRadius:8,background:bg,display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={16} color={color}/></div>
</div>
<div style={{fontSize:22,fontWeight:700,color}}>{value}</div>
{sub&&<div style={{fontSize:11,color:'var(--text-3)',marginTop:2}}>{sub}</div>}
</div>
)

return(
<Layout title="Analytics">

{/* Top stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
{stat('Total Users',totalUsers,Users,'#4F6EF7','rgba(79,110,247,0.1)',`${paidUsers} paid · ${freeUsers} free`)}
{stat('Paid Subscribers',paidUsers,Crown,'#8b5cf6','rgba(139,92,246,0.1)',`${totalUsers>0?Math.round(paidUsers/totalUsers*100):0}% conversion`)}
{stat('Total Revenue',fmtMMK(totalRevenue),DollarSign,'#16a34a','rgba(22,163,74,0.1)',`${approvedUps.length} payments`)}
{stat('This Month',fmtMMK(monthRevenue),TrendingUp,'#d97706','rgba(217,119,6,0.1)','approved this month')}
</div>

{/* Active / Expired */}
<div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12,marginBottom:20}}>
{stat('Active',activeCount,CheckCircle,'#16a34a','rgba(22,163,74,0.1)','currently active')}
{stat('Expired',expiredCount,AlertTriangle,'#d97706','rgba(217,119,6,0.1)','need renewal')}
</div>

{/* Charts */}
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

{/* Plan distribution pie */}
<div className="card" style={{padding:20}}>
<h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Plan Distribution</h3>
{pieData.length===0?(
<div style={{textAlign:'center',color:'var(--text-3)',padding:40}}>No data yet</div>
):(
<ResponsiveContainer width="100%" height={260}>
<PieChart>
<Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({name,value})=>`${name}: ${value}`}>
{pieData.map((e,i)=><Cell key={i} fill={PLAN_COLORS[e.plan]}/>)}
</Pie>
<Legend/>
</PieChart>
</ResponsiveContainer>
)}
</div>

{/* Revenue by plan bar */}
<div className="card" style={{padding:20}}>
<h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Revenue Potential by Plan</h3>
<ResponsiveContainer width="100%" height={260}>
<BarChart data={barData}>
<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
<XAxis dataKey="plan" tick={{fontSize:12}}/>
<YAxis tick={{fontSize:11}} tickFormatter={v=>v>=1000?(v/1000)+'k':v}/>
<Tooltip formatter={(v,n)=>n==='revenue'?fmtMMK(v):v}/>
<Bar dataKey="revenue" name="Revenue" fill="#4F6EF7" radius={[6,6,0,0]}/>
</BarChart>
</ResponsiveContainer>
</div>

</div>

{/* Plan breakdown table */}
<div className="card" style={{padding:20,marginTop:16}}>
<h3 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Plan Breakdown</h3>
<table style={{width:'100%'}}>
<thead>
<tr>
<th>Plan</th>
<th style={{textAlign:'center'}}>Users</th>
<th style={{textAlign:'center'}}>Price/mo</th>
<th style={{textAlign:'right'}}>Monthly Potential</th>
</tr>
</thead>
<tbody>
{['free','starter','growth','business'].map(k=>(
<tr key={k}>
<td>
<span style={{display:'inline-flex',alignItems:'center',gap:8}}>
<span style={{width:10,height:10,borderRadius:'50%',background:PLAN_COLORS[k]}}/>
{PLAN_LABELS[k]}
</span>
</td>
<td style={{textAlign:'center',fontWeight:600}}>{planCount[k]}</td>
<td style={{textAlign:'center',color:'var(--text-3)'}}>{PLAN_PRICE[k]?fmtMMK(PLAN_PRICE[k]):'Free'}</td>
<td style={{textAlign:'right',fontWeight:600,color:'var(--primary)'}}>{fmtMMK(planCount[k]*PLAN_PRICE[k])}</td>
</tr>
))}
<tr style={{borderTop:'2px solid var(--border)'}}>
<td style={{fontWeight:700}}>Total</td>
<td style={{textAlign:'center',fontWeight:700}}>{totalUsers}</td>
<td></td>
<td style={{textAlign:'right',fontWeight:700,color:'#16a34a'}}>{fmtMMK(barData.reduce((s,b)=>s+b.revenue,0))}</td>
</tr>
</tbody>
</table>
</div>

</Layout>
)
}
