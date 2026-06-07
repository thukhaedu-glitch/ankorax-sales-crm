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
</Routes>
</BrowserRouter>
)
}
