import{useState,useEffect}from'react'
import{db,secondaryAuth}from'../firebase'
import{collection,getDocs,getDoc,updateDoc,doc,addDoc,setDoc,query,where,orderBy,limit,deleteField,deleteDoc,serverTimestamp}from'firebase/firestore'
import{createUserWithEmailAndPassword,signOut}from'firebase/auth'
import Layout from'../components/Layout'
import{Search,Users,Eye,UserCheck,X,Save,Clock,Building,Shield,Phone,Mail,Trash2,Plus,Copy,Ban,CreditCard}from'lucide-react'

const PLANS=['Starter','Growth','Business']
const STATUS_COLORS={active:'#16a34a',expired:'#d97706',blocked:'#dc2626',hold:'#64748b'}
const STATUS_BG={active:'rgba(22,163,74,0.1)',expired:'rgba(217,119,6,0.1)',blocked:'rgba(220,38,38,0.1)',hold:'#f1f5f9'}

export default function UsersPage(){
const[companies,setCompanies]=useState([])
const[crmClients,setCrmClients]=useState([])
const[salesReps,setSalesReps]=useState([])
const[loading,setLoading]=useState(true)
const[search,setSearch]=useState('')
const[filterStatus,setFilterStatus]=useState('')
const[filterPlan,setFilterPlan]=useState('')
const[filterRep,setFilterRep]=useState('')
const[detailModal,setDetailModal]=useState(null)
const[auditLogs,setAuditLogs]=useState([])
const[assignModal,setAssignModal]=useState(null)
const[assignRepId,setAssignRepId]=useState('')
const[saving,setSaving]=useState(false)
const[noteText,setNoteText]=useState('')
const[notes,setNotes]=useState([])
const[loadingDetail,setLoadingDetail]=useState(false)
const[memberEmails,setMemberEmails]=useState({})
const[createModal,setCreateModal]=useState(false)
const[createForm,setCreateForm]=useState({companyName:'',ownerName:'',email:'',phone:''})
const[createResult,setCreateResult]=useState(null)
const[creating,setCreating]=useState(false)

useEffect(()=>{
const load=async()=>{
try{
const[compSnap,crmSnap,repSnap]=await Promise.all([
getDocs(collection(db,'companies')),
getDocs(collection(db,'crmClients')),
getDocs(collection(db,'salesReps')),
])
setCompanies(compSnap.docs.map(d=>({id:d.id,...d.data()})))
setCrmClients(crmSnap.docs.map(d=>({id:d.id,...d.data()})))
setSalesReps(repSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){console.error(e)}
setLoading(false)
}
load()
},[])

const allUsers=()=>{
const mainList=companies.map(c=>{
const memberEntries=Object.entries(c.members||{})
const ownerEntry=memberEntries.find(([uid,role])=>role==='owner')
const adminEntries=memberEntries.filter(([uid,role])=>role==='admin')
const staffEntries=memberEntries.filter(([uid,role])=>role==='staff')
const rawStatus=c.subscriptionStatus||'active'
const endD=c.subscriptionEnd||c.endDate||''
// Auto-expired: end date ကျော်ပြီး status က active/hold ဆို expired ပြ
const computedStatus=(endD&&new Date(endD)<new Date()&&(rawStatus==='active'||rawStatus==='hold'))?'expired':rawStatus
return{
id:c.id,
companyName:c.companyName||c.name||'Unknown',
companyCode:c.companyCode||c.id?.slice(0,8).toUpperCase()||'-',
email:c.ownerEmail||c.email||c.contactEmail||'-',
phone:c.phone||c.ownerPhone||c.contactPhone||'-',
ownerUid:ownerEntry?.[0]||'',
plan:c.plan||c.subscriptionPlan||'Starter',
status:computedStatus,
rawStatus,
assignedTo:c.assignedTo||'',
assignedName:c.assignedName||'',
startDate:c.subscriptionStart||c.startDate||(c.createdAt?.seconds?new Date(c.createdAt.seconds*1000).toISOString().split('T')[0]:''),
endDate:c.subscriptionEnd||c.endDate||'',
createdAt:c.createdAt?.seconds?new Date(c.createdAt.seconds*1000).toISOString():c.createdAt||'',
lastLogin:c.lastLogin||'',
memberCount:memberEntries.length,
members:c.members||{},
ownerCount:ownerEntry?1:0,
adminCount:adminEntries.length,
staffCount:staffEntries.length,
_source:'main',
refundStatus:c.refundStatus||'',
refundReason:c.refundReason||'',
_raw:c,
}
})

const crmList=crmClients.map(c=>({
id:c.id,
companyName:c.companyName||'Unknown',
companyCode:c.id?.slice(0,8).toUpperCase()||'-',
email:c.email||'-',
phone:c.phone||'-',
plan:c.plan||'Starter',
status:c.status||'active',
assignedTo:c.assignedTo||'',
assignedName:c.assignedName||'',
startDate:c.startDate||'',
endDate:c.endDate||'',
createdAt:c.createdAt||'',
lastLogin:'-',
memberCount:1,
members:{},
ownerCount:0,
adminCount:0,
staffCount:0,
_source:'crm',
_raw:c,
}))

const seen=new Set()
const merged=[]
for(const u of[...mainList,...crmList]){
const key=u.email&&u.email!=='-'?u.email:u.id
if(!seen.has(key)){
seen.add(key)
merged.push(u)
}
}
return merged.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))
}

const filtered=allUsers().filter(u=>{
const matchSearch=
u.companyName?.toLowerCase().includes(search.toLowerCase())||
u.email?.toLowerCase().includes(search.toLowerCase())||
u.companyCode?.toLowerCase().includes(search.toLowerCase())||
u.phone?.toLowerCase().includes(search.toLowerCase())||
u.id?.toLowerCase().includes(search.toLowerCase())
const matchStatus=filterStatus?(filterStatus==='__inactive'?u.status!=='active':u.status===filterStatus):true
const matchPlan=filterPlan?u.plan===filterPlan:true
const matchRep=filterRep?u.assignedTo===filterRep:true
return matchSearch&&matchStatus&&matchPlan&&matchRep
})

const openDetail=async(user)=>{
setDetailModal(user)
setNoteText('')
setAuditLogs([])
setNotes([])
setMemberEmails({})
setLoadingDetail(true)

if(user._source==='main'){
// Load member info from users collection (email, phone, displayName)
try{
const uids=Object.keys(user.members||{})
const emailMap={}

// memberProfiles အရင်ကြိုးစား (ရှိရင်)
try{
const profSnap=await getDocs(collection(db,'companies',user.id,'memberProfiles'))
profSnap.docs.forEach(d=>{emailMap[d.id]=d.data()})
}catch(e){}

// users collection ကနေ တိုက်ရိုက်ဆွဲ (memberProfiles မရှိတဲ့ uid အတွက်)
for(const uid of uids){
if(!emailMap[uid]||!emailMap[uid].email){
try{
const userSnap=await getDoc(doc(db,'users',uid))
if(userSnap.exists()){
const ud=userSnap.data()
emailMap[uid]={
email:ud.email||'-',
phone:ud.phone||'',
displayName:ud.displayName||'',
role:ud.role||user.members[uid],
}
}
}catch(e){}
}
}
setMemberEmails(emailMap)
}catch(e){console.error('member load:',e)}

// Load audit logs
try{
const logSnap=await getDocs(
query(collection(db,'companies',user.id,'auditLogs'),orderBy('timestamp','desc'),limit(30))
)
setAuditLogs(logSnap.docs.map(d=>({id:d.id,...d.data()})))
}catch(e){
console.error('auditLogs:',e)
setAuditLogs([])
}
}

// Load notes
try{
const noteSnap=await getDocs(collection(db,'userNotes',user.id,'notes'))
setNotes(noteSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')))
}catch(e){
console.error('notes:',e)
setNotes([])
}
setLoadingDetail(false)
}

const handleAssign=async()=>{
if(!assignRepId||!assignModal)return
setSaving(true)
try{
const rep=salesReps.find(r=>r.id===assignRepId)
const col=assignModal._source==='main'?'companies':'crmClients'
await updateDoc(doc(db,col,assignModal.id),{
assignedTo:assignRepId,
assignedName:rep?.name||'',
updatedAt:new Date().toISOString(),
})
if(assignModal._source==='main')setCompanies(prev=>prev.map(c=>c.id===assignModal.id?{...c,assignedTo:assignRepId,assignedName:rep?.name||''}:c))
else setCrmClients(prev=>prev.map(c=>c.id===assignModal.id?{...c,assignedTo:assignRepId,assignedName:rep?.name||''}:c))
setAssignModal(null)
}catch(e){alert(e.message)}
setSaving(false)
}

const handleStatusChange=async(user,status)=>{
try{
if(user._source==='main'){
await updateDoc(doc(db,'companies',user.id),{subscriptionStatus:status,updatedAt:new Date().toISOString()})
setCompanies(prev=>prev.map(c=>c.id===user.id?{...c,subscriptionStatus:status}:c))
}else{
await updateDoc(doc(db,'crmClients',user.id),{status,updatedAt:new Date().toISOString()})
setCrmClients(prev=>prev.map(c=>c.id===user.id?{...c,status}:c))
}
}catch(e){alert(e.message)}
}

const handleAddNote=async()=>{
if(!noteText.trim()||!detailModal)return
try{
const ref=await addDoc(collection(db,'userNotes',detailModal.id,'notes'),{
text:noteText,
createdAt:new Date().toISOString(),
createdBy:'admin',
})
setNotes(prev=>[{id:ref.id,text:noteText,createdAt:new Date().toISOString()},...prev])
setNoteText('')
}catch(e){alert(e.message)}
}

// Member role update
const handleMemberRole=async(uid,newRole)=>{
if(!detailModal)return
const profile=memberEmails[uid]
const who=profile?.email||uid.slice(0,12)
if(!confirm(`Change role of ${who} to "${newRole}"?`))return
try{
await updateDoc(doc(db,'companies',detailModal.id),{[`members.${uid}`]:newRole})
// memberProfiles role ပါ update
try{await updateDoc(doc(db,'companies',detailModal.id,'memberProfiles',uid),{role:newRole})}catch(e){}
// users role ပါ update
try{await updateDoc(doc(db,'users',uid),{role:newRole})}catch(e){}
// local state update
const newMembers={...detailModal.members,[uid]:newRole}
setDetailModal({...detailModal,members:newMembers})
setCompanies(prev=>prev.map(c=>c.id===detailModal.id?{...c,members:newMembers}:c))
}catch(e){alert(e.message)}
}

// Member remove
const handleMemberRemove=async(uid)=>{
if(!detailModal)return
const profile=memberEmails[uid]
const who=profile?.email||uid.slice(0,12)
if(detailModal.members[uid]==='owner'){alert('Owner ကို remove လုပ်လို့မရပါ။');return}
if(!confirm(`Remove ${who} from this company? ဒါ irreversible ဖြစ်ပါတယ်။`))return
try{
await updateDoc(doc(db,'companies',detailModal.id),{[`members.${uid}`]:deleteField()})
// memberProfiles ဖျက်
try{await deleteDoc(doc(db,'companies',detailModal.id,'memberProfiles',uid))}catch(e){}
// local state update
const newMembers={...detailModal.members}
delete newMembers[uid]
setDetailModal({...detailModal,members:newMembers,memberCount:Object.keys(newMembers).length})
setCompanies(prev=>prev.map(c=>c.id===detailModal.id?{...c,members:newMembers}:c))
}catch(e){alert(e.message)}
}

// Delete whole company/client (irreversible)
// company cancel ဖြစ်ရင် — deferred/pending commission တွေ auto cancel (rep မရအောင်)
const cancelCompanyCommissions=async(companyId)=>{
try{
const snap=await getDocs(query(collection(db,'commissions'),where('companyId','==',companyId)))
for(const d of snap.docs){
const c=d.data()
if(c.status==='deferred'||c.status==='pending'){
await updateDoc(doc(db,'commissions',d.id),{status:'cancelled',cancelledAt:new Date().toISOString(),cancelReason:'company blocked/deleted'})
}
}
}catch(e){console.error('cancel commissions:',e)}
}

// Downgrade — plan လျှော့
const handleDowngrade=async(user,newPlan)=>{
if(!newPlan||newPlan===user.plan)return
if(!confirm(`"${user.companyName}" ကို ${user.plan} → ${newPlan} downgrade လုပ်မလား?`))return
try{
await updateDoc(doc(db,'companies',user.id),{plan:newPlan,updatedAt:new Date().toISOString()})
try{await addDoc(collection(db,'companies',user.id,'auditLogs'),{action:'downgrade',module:'subscription',description:`Plan downgraded ${user.plan} → ${newPlan} (via CRM)`,timestamp:serverTimestamp(),userEmail:'CRM Admin'})}catch(e){}
setCompanies(prev=>prev.map(c=>c.id===user.id?{...c,plan:newPlan}:c))
setDetailModal({...detailModal,plan:newPlan})
}catch(e){alert(e.message)}
}

// Refund request — customer တောင်းတာ mark
const handleRefundRequest=async(user)=>{
const reason=prompt('Refund request အကြောင်းရင်း (optional):')
if(reason===null)return
try{
await updateDoc(doc(db,'companies',user.id),{refundStatus:'requested',refundReason:reason||'',refundRequestedAt:new Date().toISOString()})
setCompanies(prev=>prev.map(c=>c.id===user.id?{...c,refundStatus:'requested'}:c))
setDetailModal({...detailModal,refundStatus:'requested',refundReason:reason||''})
}catch(e){alert(e.message)}
}

// Refunded — ပိုက်ဆံ ပြန်ပေးပြီး (commission ပါ cancel)
const handleRefunded=async(user)=>{
if(!confirm(`"${user.companyName}" ကို refund ပြီးကြောင်း mark လုပ်မလား?\n\n⚠️ သက်ဆိုင်တဲ့ commission တွေ cancel ဖြစ်ပြီး၊ plan က free ပြန်ဖြစ်ပါမယ်။`))return
try{
await updateDoc(doc(db,'companies',user.id),{
refundStatus:'refunded',refundedAt:new Date().toISOString(),
plan:'free',subscriptionStatus:'expired',
updatedAt:new Date().toISOString(),
})
await cancelCompanyCommissions(user.id)
try{await addDoc(collection(db,'companies',user.id,'auditLogs'),{action:'refund',module:'subscription',description:'Payment refunded — plan reset to free',timestamp:serverTimestamp(),userEmail:'CRM Admin'})}catch(e){}
setCompanies(prev=>prev.map(c=>c.id===user.id?{...c,refundStatus:'refunded',plan:'free',subscriptionStatus:'expired'}:c))
setDetailModal({...detailModal,refundStatus:'refunded',plan:'free'})
}catch(e){alert(e.message)}
}

const handleClearRefund=async(user)=>{
try{
await updateDoc(doc(db,'companies',user.id),{refundStatus:deleteField()})
setCompanies(prev=>prev.map(c=>c.id===user.id?{...c,refundStatus:''}:c))
setDetailModal({...detailModal,refundStatus:''})
}catch(e){alert(e.message)}
}

const handleBlockCompany=async(user)=>{
const label=user.companyName||user.email||user.id
const isBlocked=user.status==='blocked'
if(!confirm(isBlocked?`"${label}" ကို ပြန်ဖွင့်မလား?`:`"${label}" ကို block လုပ်မလား? Main app သုံးလို့ မရတော့ပါ (data က ကျန်ပါမယ်)။\n\n⚠️ ဆိုင်းငံ့ထားတဲ့ (deferred) commission တွေ cancel ဖြစ်ပါမယ်။`))return
try{
const newStatus=isBlocked?'active':'blocked'
const col=user._source==='main'?'companies':'crmClients'
const field=user._source==='main'?'subscriptionStatus':'status'
await updateDoc(doc(db,col,user.id),{[field]:newStatus,updatedAt:new Date().toISOString()})
// block ဆို commission cancel (unblock ဆို မလုပ်)
if(!isBlocked)await cancelCompanyCommissions(user.id)
if(user._source==='main')setCompanies(prev=>prev.map(c=>c.id===user.id?{...c,subscriptionStatus:newStatus}:c))
else setCrmClients(prev=>prev.map(c=>c.id===user.id?{...c,status:newStatus}:c))
}catch(e){alert(e.message)}
}

const handleDeleteCompany=async(user)=>{
const label=user.companyName||user.email||user.id
if(!confirm(`"${label}" ကို အပြီးအပိုင် ဖျက်မှာ သေချာလား? ဒါ irreversible ဖြစ်ပါတယ်။`))return
if(!confirm(`နောက်ဆုံး အတည်ပြုချက် — "${label}" နဲ့ သက်ဆိုင်တဲ့ data အားလုံး ပျောက်သွားမယ်။ ⚠️ Owner ရဲ့ login account ကတော့ ကျန်နေမယ် (Firebase limitation) — ဒါကြောင့် ဖျက်တာထက် "Block" လုပ်တာ ပိုလုံခြုံပါတယ်။ ဆက်ဖျက်မလား?`))return
try{
// commission cancel အရင်
await cancelCompanyCommissions(user.id)
// Delete မလုပ်ခင် blocked status အရင်ပေး (owner login ဝင်လည်း သုံးမရအောင်)
const col=user._source==='main'?'companies':'crmClients'
const field=user._source==='main'?'subscriptionStatus':'status'
try{await updateDoc(doc(db,col,user.id),{[field]:'blocked'})}catch(e){}
await deleteDoc(doc(db,col,user.id))
if(user._source==='main')setCompanies(prev=>prev.filter(c=>c.id!==user.id))
else setCrmClients(prev=>prev.filter(c=>c.id!==user.id))
if(detailModal&&detailModal.id===user.id)setDetailModal(null)
}catch(e){alert(e.message)}
}

// Generate temp password
const genTempPassword=()=>{
const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
let p=''
for(let i=0;i<10;i++)p+=chars.charAt(Math.floor(Math.random()*chars.length))
return p+'@1'
}

// Create new company + owner account (uses secondary app — CRM login unaffected)
const handleCreateCompany=async()=>{
const{companyName,ownerName,email,phone}=createForm
if(!companyName.trim()||!email.trim()){alert('Company name နဲ့ email လိုအပ်ပါတယ်');return}
if(!phone.trim()){alert('Phone number လိုအပ်ပါတယ်');return}
setCreating(true)
try{
const tempPass=genTempPassword()
// Secondary app နဲ့ user create (main CRM login မပြောင်း)
const cred=await createUserWithEmailAndPassword(secondaryAuth,email.trim(),tempPass)
const uid=cred.user.uid
const inviteCode='INV-'+Math.random().toString(36).substring(2,8).toUpperCase()
// Company doc
const companyRef=await addDoc(collection(db,'companies'),{
name:companyName.trim(),companyName:companyName.trim(),plan:'free',
members:{[uid]:'owner'},ownerId:uid,
ownerEmail:email.trim(),ownerPhone:phone.trim(),
inviteCode,subscriptionStatus:'active',
createdAt:serverTimestamp(),
createdViaCRM:true,
})
// users doc
await setDoc(doc(db,'users',uid),{
displayName:ownerName.trim()||companyName.trim(),
email:email.trim(),phone:phone.trim(),role:'owner',
companyId:companyRef.id,createdAt:serverTimestamp(),
})
// memberProfile
await setDoc(doc(db,'companies',companyRef.id,'memberProfiles',uid),{
uid,email:email.trim(),phone:phone.trim(),
role:'owner',displayName:ownerName.trim()||companyName.trim(),
joinedAt:new Date().toISOString(),
})
// secondary app ကနေ sign out (cleanup)
try{await signOut(secondaryAuth)}catch(e){}
// local list update
setCompanies(prev=>[{id:companyRef.id,name:companyName.trim(),companyName:companyName.trim(),plan:'free',members:{[uid]:'owner'},ownerId:uid,ownerEmail:email.trim(),ownerPhone:phone.trim(),inviteCode,subscriptionStatus:'active',createdAt:{seconds:Math.floor(Date.now()/1000)}},...prev])
// show result with temp password
setCreateResult({email:email.trim(),tempPass,companyName:companyName.trim()})
setCreateForm({companyName:'',ownerName:'',email:'',phone:''})
}catch(e){
alert(e.code==='auth/email-already-in-use'?'ဒီ email က အသုံးပြုပြီးသား ဖြစ်နေပါတယ်':e.message)
}
setCreating(false)
}

const fmtDate=(d)=>{
if(!d)return'-'
try{return new Date(d).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
catch{return String(d)}
}

const fmtDateTime=(ts)=>{
if(!ts)return'-'
try{
const d=ts.seconds?new Date(ts.seconds*1000):new Date(ts)
return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
}catch{return'-'}
}

const roleColor=(role)=>{
if(role==='owner')return{bg:'rgba(79,110,247,0.1)',color:'#4F6EF7'}
if(role==='admin')return{bg:'rgba(139,92,246,0.1)',color:'#8b5cf6'}
return{bg:'rgba(22,163,74,0.1)',color:'#16a34a'}
}

if(loading)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>

const users=allUsers()
const stats={
total:users.length,
active:users.filter(u=>u.status==='active').length,
expired:users.filter(u=>u.status==='expired').length,
blocked:users.filter(u=>u.status==='blocked').length,
}

return(
<Layout title="Users">

{/* Create Company Modal */}
{createModal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:440,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontWeight:600,fontSize:15,display:'flex',alignItems:'center',gap:8}}><Plus size={16} color="var(--primary)"/>New Company</div>
<button type="button" onClick={()=>{setCreateModal(false);setCreateResult(null)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24}}>
{createResult?(
<div>
<div style={{background:'rgba(22,163,74,0.08)',border:'0.5px solid rgba(22,163,74,0.3)',borderRadius:10,padding:16,marginBottom:16}}>
<div style={{fontSize:13,fontWeight:600,color:'#16a34a',marginBottom:10}}>✓ Account ဖန်တီးပြီးပါပြီ!</div>
<div style={{fontSize:12,color:'var(--text-2)',marginBottom:6}}>Company: <strong>{createResult.companyName}</strong></div>
<div style={{fontSize:12,color:'var(--text-2)',marginBottom:10}}>Email: <strong>{createResult.email}</strong></div>
<div style={{fontSize:11,color:'var(--text-3)',marginBottom:4}}>Temporary Password (owner ကို ပေးပါ):</div>
<div style={{display:'flex',gap:6,alignItems:'center'}}>
<code style={{flex:1,background:'white',border:'0.5px solid var(--border)',borderRadius:8,padding:'8px 12px',fontSize:14,fontWeight:600,fontFamily:'monospace',color:'var(--text-1)'}}>{createResult.tempPass}</code>
<button type="button" onClick={()=>{navigator.clipboard.writeText(createResult.tempPass);alert('Copied!')}} className="btn btn-ghost" style={{padding:'8px 10px'}}><Copy size={14}/></button>
</div>
<div style={{fontSize:10,color:'var(--text-3)',marginTop:8}}>⚠️ Owner ကို ပေးပြီး login ဝင်ပြီးနောက် password ပြောင်းခိုင်းပါ။</div>
</div>
<button type="button" onClick={()=>{setCreateModal(false);setCreateResult(null)}} className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}>Done</button>
</div>
):(
<div>
<div style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:5}}>Company Name *</label>
<input className="form-input" value={createForm.companyName} onChange={e=>setCreateForm({...createForm,companyName:e.target.value})} placeholder="Company name"/>
</div>
<div style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:5}}>Owner Name</label>
<input className="form-input" value={createForm.ownerName} onChange={e=>setCreateForm({...createForm,ownerName:e.target.value})} placeholder="Owner full name"/>
</div>
<div style={{marginBottom:12}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:5}}>Email *</label>
<input className="form-input" type="email" value={createForm.email} onChange={e=>setCreateForm({...createForm,email:e.target.value})} placeholder="owner@email.com"/>
</div>
<div style={{marginBottom:20}}>
<label style={{fontSize:12,fontWeight:500,color:'var(--text-2)',display:'block',marginBottom:5}}>Phone *</label>
<input className="form-input" type="tel" value={createForm.phone} onChange={e=>setCreateForm({...createForm,phone:e.target.value})} placeholder="09xxxxxxxxx"/>
</div>
<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
<button type="button" onClick={()=>setCreateModal(false)} className="btn btn-ghost">Cancel</button>
<button type="button" onClick={handleCreateCompany} disabled={creating} className="btn btn-primary"><Save size={14}/>{creating?'Creating...':'Create'}</button>
</div>
</div>
)}
</div>
</div>
</div>
)}

{/* Assign Modal */}
{assignModal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:400,boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{fontWeight:600,fontSize:15}}>Assign Sales Rep</div>
<button type="button" onClick={()=>setAssignModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24}}>
<div style={{marginBottom:8,fontSize:13,color:'var(--text-2)'}}>Company: <strong>{assignModal.companyName}</strong></div>
{assignModal.assignedName&&<div style={{marginBottom:12,fontSize:12,color:'var(--text-3)'}}>Current: {assignModal.assignedName}</div>}
<select className="form-input" value={assignRepId} onChange={e=>setAssignRepId(e.target.value)} style={{marginBottom:16}}>
<option value="">— Select Rep —</option>
{salesReps.filter(r=>r.active!==false).map(r=>(
<option key={r.id} value={r.id}>{r.name} ({r.role})</option>
))}
</select>
<div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
<button type="button" onClick={()=>setAssignModal(null)} className="btn btn-ghost">Cancel</button>
<button type="button" onClick={handleAssign} disabled={saving||!assignRepId} className="btn btn-primary">
<Save size={14}/>{saving?'Saving...':'Assign'}
</button>
</div>
</div>
</div>
</div>
)}

{/* Detail Modal */}
{detailModal&&(
<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
<div style={{background:'white',borderRadius:16,width:'100%',maxWidth:700,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
<div style={{padding:'20px 24px',borderBottom:'0.5px solid #f1f5f9',display:'flex',justifyContent:'space-between',alignItems:'center',position:'sticky',top:0,background:'white',zIndex:1}}>
<div style={{fontWeight:600,fontSize:15,display:'flex',alignItems:'center',gap:8}}>
<Building size={16} color="var(--primary)"/>
{detailModal.companyName}
<span style={{fontSize:11,background:'var(--primary-light)',color:'var(--primary)',padding:'2px 8px',borderRadius:20,fontFamily:'monospace'}}>{detailModal.companyCode}</span>
</div>
<button type="button" onClick={()=>setDetailModal(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-3)'}}><X size={18}/></button>
</div>
<div style={{padding:24}}>

{/* Info Grid */}
{(()=>{
const ownerProfile=memberEmails[detailModal.ownerUid]||{}
const displayEmail=(detailModal.email&&detailModal.email!=='-')?detailModal.email:(ownerProfile.email||'-')
const displayPhone=(detailModal.phone&&detailModal.phone!=='-')?detailModal.phone:(ownerProfile.phone||'-')
const displayLastLogin=detailModal.lastLogin||ownerProfile.lastLogin||''
return(
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
{[
{label:'Company Code',value:detailModal.companyCode},
{label:'Email',value:displayEmail},
{label:'Phone',value:displayPhone},
{label:'Plan',value:detailModal.plan},
{label:'Status',value:detailModal.status},
{label:'Assigned Rep',value:detailModal.assignedName||'Unassigned'},
{label:'Start Date',value:fmtDate(detailModal.startDate)},
{label:'End Date',value:detailModal.endDate?fmtDate(detailModal.endDate):'No expiry'},
{label:'Created',value:fmtDate(detailModal.createdAt)},
{label:'Source',value:detailModal._source==='main'?'Main App':'CRM'},
{label:'Total Members',value:String(detailModal.memberCount)},
{label:'Last Login',value:displayLastLogin?fmtDate(displayLastLogin):'-'},
].map(({label,value})=>(
<div key={label} style={{background:'#f8fafc',borderRadius:8,padding:'10px 12px'}}>
<div style={{fontSize:10,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',marginBottom:3}}>{label}</div>
<div style={{fontSize:13,fontWeight:500,color:'var(--text-1)'}}>{String(value||'-')}</div>
</div>
))}
</div>
)
})()}

{/* Subscription Actions — main app company ပဲ */}
{detailModal._source==='main'&&(
<div style={{marginBottom:20,padding:16,background:'#f8fafc',borderRadius:10,border:'0.5px solid var(--border)'}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
<CreditCard size={14} color="var(--primary)"/>Subscription Actions
{detailModal.refundStatus==='requested'&&<span style={{fontSize:10,fontWeight:600,background:'#faeeda',color:'#d97706',padding:'2px 8px',borderRadius:10}}>Refund Requested</span>}
{detailModal.refundStatus==='refunded'&&<span style={{fontSize:10,fontWeight:600,background:'#fcebeb',color:'#dc2626',padding:'2px 8px',borderRadius:10}}>Refunded</span>}
</div>

{/* Downgrade */}
<div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,flexWrap:'wrap'}}>
<span style={{fontSize:12,color:'var(--text-2)',minWidth:80}}>Downgrade:</span>
<select value="" onChange={e=>handleDowngrade(detailModal,e.target.value)} className="form-input" style={{width:'auto',fontSize:12}}>
<option value="">— Select plan —</option>
{['free','starter','growth','business'].filter(p=>p!==detailModal.plan).map(p=><option key={p} value={p} style={{textTransform:'capitalize'}}>{p}</option>)}
</select>
</div>

{/* Refund buttons */}
<div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
{detailModal.refundStatus!=='refunded'&&detailModal.refundStatus!=='requested'&&(
<button type="button" onClick={()=>handleRefundRequest(detailModal)} style={{fontSize:12,fontWeight:600,padding:'7px 14px',borderRadius:8,border:'1px solid #d97706',background:'white',color:'#d97706',cursor:'pointer'}}>Mark Refund Requested</button>
)}
{detailModal.refundStatus==='requested'&&(
<>
<button type="button" onClick={()=>handleRefunded(detailModal)} style={{fontSize:12,fontWeight:600,padding:'7px 14px',borderRadius:8,border:'none',background:'#dc2626',color:'white',cursor:'pointer'}}>Confirm Refunded</button>
<button type="button" onClick={()=>handleClearRefund(detailModal)} style={{fontSize:12,fontWeight:600,padding:'7px 14px',borderRadius:8,border:'1px solid var(--border)',background:'white',color:'var(--text-2)',cursor:'pointer'}}>Cancel Request</button>
</>
)}
{detailModal.refundStatus==='refunded'&&(
<div style={{fontSize:12,color:'var(--text-3)'}}>✓ Refunded — plan reset to free, commissions cancelled</div>
)}
</div>
{detailModal.refundReason&&<div style={{fontSize:11,color:'var(--text-3)',marginTop:8}}>Reason: {detailModal.refundReason}</div>}
</div>
)}

{/* Members */}
{detailModal._source==='main'&&Object.keys(detailModal.members||{}).length>0&&(
<div style={{marginBottom:20}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
<Users size={14} color="var(--primary)"/>
Members
<span style={{fontSize:11,background:'var(--primary-light)',color:'var(--primary)',padding:'1px 7px',borderRadius:20}}>{Object.keys(detailModal.members||{}).length}</span>
{loadingDetail&&<span style={{fontSize:11,color:'var(--text-3)'}}>Loading...</span>}
</div>
<div style={{border:'0.5px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
<div style={{display:'grid',gridTemplateColumns:'1fr auto',padding:'7px 12px',background:'rgba(79,110,247,0.04)',borderBottom:'0.5px solid var(--border)'}}>
<span style={{fontSize:10,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase'}}>User</span>
<span style={{fontSize:10,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase'}}>Role</span>
</div>
{Object.entries(detailModal.members||{}).map(([uid,role])=>{
const profile=memberEmails[uid]
return(
<div key={uid} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',borderBottom:'0.5px solid #f1f5f9'}}>
<div>
<div style={{fontSize:12,fontWeight:500,color:'var(--text-1)',display:'flex',alignItems:'center',gap:6}}>
<Mail size={11} color="var(--text-3)"/>
{profile?.email||'Not logged in yet'}
</div>
{profile?.phone&&(
<div style={{fontSize:11,color:'var(--text-2)',marginTop:2,display:'flex',alignItems:'center',gap:6}}>
<Phone size={10} color="var(--text-3)"/>{profile.phone}
</div>
)}
{profile?.displayName&&(
<div style={{fontSize:11,color:'var(--text-2)',marginTop:1}}>{profile.displayName}</div>
)}
{profile?.lastLogin&&(
<div style={{fontSize:10,color:'var(--text-3)',marginTop:1}}>Last login: {fmtDate(profile.lastLogin)}</div>
)}
<div style={{fontSize:10,color:'#d1d5db',fontFamily:'monospace',marginTop:2}}>{uid.slice(0,24)}...</div>
</div>
<div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0,marginLeft:8}}>
{role==='owner'?(
<span style={{
fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
background:roleColor(role).bg,color:roleColor(role).color,textTransform:'capitalize',
}}>{role}</span>
):(
<>
<select value={role} onChange={e=>handleMemberRole(uid,e.target.value)} style={{
fontSize:11,fontWeight:600,padding:'3px 8px',borderRadius:20,border:'none',cursor:'pointer',outline:'none',
background:roleColor(role).bg,color:roleColor(role).color,textTransform:'capitalize',
}}>
<option value="admin">admin</option>
<option value="staff">staff</option>
</select>
<button type="button" onClick={()=>handleMemberRemove(uid)} title="Remove member" style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626',padding:2,borderRadius:6,display:'flex',alignItems:'center'}}>
<X size={14}/>
</button>
</>
)}
</div>
</div>
)
})}
</div>
<div style={{display:'flex',gap:6,marginTop:8}}>
{detailModal.ownerCount>0&&<span style={{fontSize:11,background:'rgba(79,110,247,0.1)',color:'#4F6EF7',padding:'2px 8px',borderRadius:20}}>Owner: {detailModal.ownerCount}</span>}
{detailModal.adminCount>0&&<span style={{fontSize:11,background:'rgba(139,92,246,0.1)',color:'#8b5cf6',padding:'2px 8px',borderRadius:20}}>Admin: {detailModal.adminCount}</span>}
{detailModal.staffCount>0&&<span style={{fontSize:11,background:'rgba(22,163,74,0.1)',color:'#16a34a',padding:'2px 8px',borderRadius:20}}>Staff: {detailModal.staffCount}</span>}
</div>
</div>
)}

{/* Notes */}
<div style={{marginBottom:20}}>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
<Shield size={14} color="var(--primary)"/>Notes
</div>
<div style={{display:'flex',gap:8,marginBottom:10}}>
<input className="form-input" value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Add note..." style={{flex:1,fontSize:12}} onKeyDown={e=>e.key==='Enter'&&handleAddNote()}/>
<button type="button" onClick={handleAddNote} className="btn btn-primary" style={{fontSize:12,padding:'6px 14px'}}>Add</button>
</div>
{notes.length===0?(
<div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:12,background:'#f8fafc',borderRadius:8}}>No notes yet</div>
):notes.map(n=>(
<div key={n.id} style={{padding:'8px 12px',background:'#f8fafc',borderRadius:8,marginBottom:6}}>
<div style={{fontSize:12,color:'var(--text-1)',marginBottom:3}}>{n.text}</div>
<div style={{fontSize:10,color:'var(--text-3)'}}>{fmtDateTime(n.createdAt)}</div>
</div>
))}
</div>

{/* Activity History */}
<div>
<div style={{fontWeight:600,fontSize:13,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
<Clock size={14} color="var(--primary)"/>Activity History
{loadingDetail&&<span style={{fontSize:11,color:'var(--text-3)'}}>Loading...</span>}
</div>
{auditLogs.length===0?(
<div style={{fontSize:12,color:'var(--text-3)',textAlign:'center',padding:16,background:'#f8fafc',borderRadius:8}}>
{detailModal._source==='crm'?'CRM client — no activity log':'No activity yet'}
</div>
):(
<div style={{border:'0.5px solid var(--border)',borderRadius:10,overflow:'hidden'}}>
{auditLogs.map((log,i)=>(
<div key={log.id} style={{display:'flex',gap:12,padding:'10px 14px',borderBottom:i<auditLogs.length-1?'0.5px solid #f1f5f9':'none',background:i%2===0?'white':'#fafbff'}}>
<div style={{width:8,height:8,borderRadius:'50%',background:'var(--primary)',flexShrink:0,marginTop:5}}/>
<div style={{flex:1}}>
<div style={{fontSize:12,fontWeight:500,color:'var(--text-1)',marginBottom:2}}>{log.description||'-'}</div>
<div style={{fontSize:10,color:'var(--text-3)',display:'flex',gap:8,flexWrap:'wrap'}}>
<span>{fmtDateTime(log.timestamp)}</span>
{log.userEmail&&<span>by {log.userEmail}</span>}
{log.module&&<span style={{background:'var(--primary-light)',color:'var(--primary)',padding:'0 5px',borderRadius:10}}>{log.module}</span>}
</div>
</div>
</div>
))}
</div>
)}
</div>

</div>
</div>
</div>
)}

{/* Stats */}
<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
{[
{label:'Total Users',value:stats.total,color:'#4F6EF7'},
{label:'Active',value:stats.active,color:'#16a34a'},
{label:'Expired',value:stats.expired,color:'#d97706'},
{label:'Blocked',value:stats.blocked,color:'#dc2626'},
].map(({label,value,color})=>(
<div key={label} className="card" style={{padding:16}}>
<div style={{fontSize:11,color:'var(--text-3)',marginBottom:6}}>{label}</div>
<div style={{fontSize:20,fontWeight:700,color}}>{value}</div>
</div>
))}
</div>

{/* Filters */}
<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
<div style={{position:'relative',minWidth:200,flex:1}}>
<Search size={12} style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',color:'var(--text-3)'}}/>
<input className="form-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company, email, code..." style={{paddingLeft:26,fontSize:12}}/>
</div>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
<option value="">All Status</option>
<option value="__inactive">⚠ Inactive (not active)</option>
{['active','expired','blocked','hold'].map(s=><option key={s} value={s} style={{textTransform:'capitalize'}}>{s}</option>)}
</select>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterPlan} onChange={e=>setFilterPlan(e.target.value)}>
<option value="">All Plans</option>
{PLANS.map(p=><option key={p}>{p}</option>)}
</select>
<select className="form-input" style={{width:'auto',fontSize:12}} value={filterRep} onChange={e=>setFilterRep(e.target.value)}>
<option value="">All Reps</option>
{salesReps.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
</select>
<button type="button" onClick={()=>{setCreateModal(true);setCreateResult(null)}} className="btn btn-primary" style={{fontSize:12,padding:'8px 14px',whiteSpace:'nowrap'}}>
<Plus size={14}/>New Company
</button>
</div>

{/* Table */}
<div className="card" style={{overflow:'hidden',width:'100%'}}>
{filtered.length===0?(
<div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>
<Users size={36} style={{margin:'0 auto 12px',opacity:0.2}}/>
<div>No users found</div>
</div>
):(
<div style={{overflowX:'auto'}}>
<table style={{width:'100%'}}>
<thead>
<tr>
<th>Company</th>
<th>Email / Phone</th>
<th>Plan</th>
<th>Members</th>
<th>Assigned Rep</th>
<th>Start</th>
<th>End</th>
<th style={{textAlign:'center'}}>Status</th>
<th style={{textAlign:'center'}}>Actions</th>
</tr>
</thead>
<tbody>
{filtered.map(u=>(
<tr key={u.id+u._source}>
<td>
<div style={{fontWeight:500}}>{u.companyName}</div>
<div style={{display:'flex',gap:4,marginTop:2,flexWrap:'wrap'}}>
<span style={{fontSize:10,background:u._source==='main'?'rgba(79,110,247,0.1)':'rgba(22,163,74,0.1)',color:u._source==='main'?'#4F6EF7':'#16a34a',padding:'1px 6px',borderRadius:20}}>{u._source==='main'?'Main App':'CRM'}</span>
<span style={{fontSize:10,background:'#f1f5f9',color:'var(--text-3)',padding:'1px 6px',borderRadius:20,fontFamily:'monospace'}}>{u.companyCode}</span>
</div>
</td>
<td>
<div style={{fontSize:12,color:'var(--text-2)',display:'flex',alignItems:'center',gap:4}}>
<Mail size={10} color="var(--text-3)"/>{u.email}
</div>
{u.phone&&u.phone!=='-'&&(
<div style={{fontSize:11,color:'var(--text-3)',display:'flex',alignItems:'center',gap:4,marginTop:2}}>
<Phone size={10}/>{u.phone}
</div>
)}
</td>
<td>
<span style={{background:'var(--primary-light)',color:'var(--primary)',padding:'2px 8px',borderRadius:20,fontSize:11,fontWeight:600}}>{u.plan}</span>
</td>
<td>
<div style={{fontSize:13,fontWeight:500}}>{u.memberCount}</div>
{u._source==='main'&&u.memberCount>0&&(
<div style={{fontSize:10,color:'var(--text-3)'}}>
{u.ownerCount>0&&`${u.ownerCount}O `}
{u.adminCount>0&&`${u.adminCount}A `}
{u.staffCount>0&&`${u.staffCount}S`}
</div>
)}
</td>
<td>
{u.assignedName?(
<span style={{fontSize:12,fontWeight:500}}>{u.assignedName}</span>
):(
<span style={{fontSize:11,color:'var(--text-3)'}}>Unassigned</span>
)}
</td>
<td style={{fontSize:12,color:'var(--text-3)'}}>{fmtDate(u.startDate)}</td>
<td style={{fontSize:12,color:u.endDate&&u.endDate<new Date().toISOString().split('T')[0]?'#dc2626':'var(--text-3)'}}>{fmtDate(u.endDate)}</td>
<td style={{textAlign:'center'}}>
<select value={u.rawStatus||u.status} onChange={e=>handleStatusChange(u,e.target.value)} style={{
background:STATUS_BG[u.status]||'#f1f5f9',
color:STATUS_COLORS[u.status]||'#64748b',
border:'none',borderRadius:20,padding:'3px 8px',
fontSize:11,fontWeight:600,cursor:'pointer',outline:'none',textTransform:'capitalize',
}}>
{['active','expired','blocked','hold'].map(s=><option key={s} value={s}>{s}</option>)}
</select>
</td>
<td style={{textAlign:'center'}}>
<div style={{display:'flex',gap:4,justifyContent:'center'}}>
<button type="button" onClick={()=>{setAssignModal(u);setAssignRepId(u.assignedTo||'')}} title="Assign Rep" style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)',padding:4,borderRadius:6}}>
<UserCheck size={14}/>
</button>
<button type="button" onClick={()=>openDetail(u)} title="View Detail" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-2)',padding:4,borderRadius:6}}>
<Eye size={14}/>
</button>
<button type="button" onClick={()=>handleBlockCompany(u)} title={u.status==='blocked'?'Unblock':'Block'} style={{background:'none',border:'none',cursor:'pointer',color:u.status==='blocked'?'#16a34a':'#d97706',padding:4,borderRadius:6}}>
<Ban size={14}/>
</button>
<button type="button" onClick={()=>handleDeleteCompany(u)} title="Delete" style={{background:'none',border:'none',cursor:'pointer',color:'#dc2626',padding:4,borderRadius:6}}>
<Trash2 size={14}/>
</button>
</div>
</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</div>

</Layout>
)
}
