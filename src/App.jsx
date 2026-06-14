import{useState,useEffect}from'react'
import{BrowserRouter,Routes,Route,Navigate}from'react-router-dom'
import{auth}from'./firebase'
import{onAuthStateChanged}from'firebase/auth'
import Login from'./pages/Login'
import Dashboard from'./pages/Dashboard'
import Leads from'./pages/Leads'
import Clients from'./pages/Clients'
import FollowUps from'./pages/FollowUps'
import Commissions from'./pages/Commissions'
import SalesReps from'./pages/SalesReps'
import Signup from'./pages/Signup'
import UsersPage from'./pages/Users'
import Payments from'./pages/Payments'
import Analytics from'./pages/Analytics'
import PlanManagement from'./pages/PlanManagement'
import Coupons from'./pages/Coupons'
import CommissionSettings from'./pages/CommissionSettings'
import ReceiptSettings from'./pages/ReceiptSettings'




function PrivateRoute({children}){
const[user,setUser]=useState(undefined)
useEffect(()=>onAuthStateChanged(auth,setUser),[])
if(user===undefined)return<div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>
return user?children:<Navigate to="/login"/>
}

export default function App(){
return(
<BrowserRouter>
<Routes>
<Route path="/login" element={<Login/>}/>
<Route path="/" element={<PrivateRoute><Dashboard/></PrivateRoute>}/>
<Route path="/leads" element={<PrivateRoute><Leads/></PrivateRoute>}/>
<Route path="/clients" element={<PrivateRoute><Clients/></PrivateRoute>}/>
<Route path="/follow-ups" element={<PrivateRoute><FollowUps/></PrivateRoute>}/>
<Route path="/commissions" element={<PrivateRoute><Commissions/></PrivateRoute>}/>
<Route path="/sales-reps" element={<PrivateRoute><SalesReps/></PrivateRoute>}/>
<Route path="/signup" element={<Signup/>}/>
<Route path="/users" element={<PrivateRoute><UsersPage/></PrivateRoute>}/>
<Route path="/payments" element={<PrivateRoute><Payments/></PrivateRoute>}/>
<Route path="/analytics" element={<PrivateRoute><Analytics/></PrivateRoute>}/>
<Route path="/plan-management" element={<PrivateRoute><PlanManagement/></PrivateRoute>}/>
<Route path="/coupons" element={<PrivateRoute><Coupons/></PrivateRoute>}/>
<Route path="/commission-settings" element={<PrivateRoute><CommissionSettings/></PrivateRoute>}/>
<Route path="/receipt-settings" element={<PrivateRoute><ReceiptSettings/></PrivateRoute>}/>
</Routes>
</BrowserRouter>
)
}
