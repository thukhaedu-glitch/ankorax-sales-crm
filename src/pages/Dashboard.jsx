import { useState, useEffect } from 'react'
import { db, auth } from '../firebase'
import { collection, getDocs, query } from 'firebase/firestore'
import Layout from '../components/Layout'
import { Target, Users, Calendar, DollarSign, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const LEAD_STATUSES = ['New', 'Contacted', 'Demo', 'Negotiating', 'Won', 'Lost']
const STATUS_COLORS = { New: '#4F6EF7', Contacted: '#06b6d4', Demo: '#8b5cf6', Negotiating: '#d97706', Won: '#16a34a', Lost: '#dc2626' }

export default function Dashboard() {
  const [leads, setLeads] = useState([])
  const [clients, setClients] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [commissions, setCommissions] = useState([])
  const [upgrades, setUpgrades] = useState([]) // 1. Added upgrades state
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // 2. Updated data load to include upgradeRequests
        const [lSnap, cSnap, fSnap, comSnap, upSnap] = await Promise.all([
          getDocs(collection(db, 'leads')),
          getDocs(collection(db, 'crmClients')),
          getDocs(collection(db, 'followUps')),
          getDocs(collection(db, 'commissions')),
          getDocs(collection(db, 'upgradeRequests')),
        ])
        setLeads(lSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setClients(cSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setFollowUps(fSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setCommissions(comSnap.docs.map(d => ({ id: d.id, ...d.data() })))
        setUpgrades(upSnap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [])

  const wonLeads = leads.filter(l => l.status === 'Won')
  
  // 3. Updated Revenue Calculation
  const dealRevenue = wonLeads.reduce((s, l) => s + Number(l.dealValue || 0), 0)
  const subRevenue = upgrades.filter(u => u.status === 'approved').reduce((s, u) => s + Number(u.amount || 0), 0)
  const totalDealValue = dealRevenue + subRevenue
  
  const totalCommission = commissions.reduce((s, c) => s + Number(c.amount || 0), 0)
  const todayFollowUps = followUps.filter(f => f.date === new Date().toISOString().split('T')[0] && !f.done)

  const pieData = LEAD_STATUSES.map(s => ({
    name: s,
    value: leads.filter(l => l.status === s).length,
  })).filter(d => d.value > 0)

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - 5 + i)
    const m = d.toISOString().slice(0, 7)
    const label = d.toLocaleString('default', { month: 'short' })
    return {
      month: label,
      leads: leads.filter(l => l.createdAt?.slice(0, 7) === m).length,
      won: leads.filter(l => l.status === 'Won' && l.createdAt?.slice(0, 7) === m).length,
    }
  })

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>Loading...</div>

  return (
    <Layout title="Dashboard">
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Leads', value: leads.length, icon: Target, color: '#4F6EF7', bg: 'rgba(79,110,247,0.1)' },
          { label: 'Won Deals', value: wonLeads.length, icon: CheckCircle, color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
          { label: 'Total Revenue', value: `${totalDealValue.toLocaleString()} Ks`, icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'Commissions', value: `${totalCommission.toLocaleString()} Ks`, icon: DollarSign, color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Charts & Lists (Remains same as before) */}
      {/* ... */}
    </Layout>
  )
}
