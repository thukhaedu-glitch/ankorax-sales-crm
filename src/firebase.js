import{initializeApp}from'firebase/app'
import{getFirestore}from'firebase/firestore'
import{getAuth}from'firebase/auth'

const firebaseConfig={
apiKey:"YOUR_API_KEY",
authDomain:"invoice-99bdb.firebaseapp.com",
projectId:"invoice-99bdb",
storageBucket:"invoice-99bdb.appspot.com",
messagingSenderId:"YOUR_SENDER_ID",
appId:"YOUR_APP_ID"
}

const app=initializeApp(firebaseConfig)
export const db=getFirestore(app)
export const auth=getAuth(app)
