import{useState,useEffect}from'react'
import{auth,db}from'../firebase'
import{doc,getDoc}from'firebase/firestore'
import{onAuthStateChanged}from'firebase/auth'

export default function useSalesRep(){
const[rep,setRep]=useState(null)
const[loading,setLoading]=useState(true)

useEffect(()=>{
const unsub=onAuthStateChanged(auth,async user=>{
if(user){
const snap=await getDoc(doc(db,'salesReps',user.uid))
if(snap.exists())setRep({id:snap.id,...snap.data()})
else setRep({id:user.uid,email:user.email,name:user.email,role:'rep'})
}else setRep(null)
setLoading(false)
})
return unsub
},[])

return{rep,loading}
}
