import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import './Analytics.css'

const revenueData = [
  { month: 'Jan', revenue: 42000, expenses: 28000 },
  { month: 'Feb', revenue: 47000, expenses: 30000 },
  { month: 'Mar', revenue: 44000, expenses: 27000 },
  { month: 'Apr', revenue: 53000, expenses: 32000 },
  { month: 'May', revenue: 61000, expenses: 35000 },
  { month: 'Jun', revenue: 58000, expenses: 33000 },
  { month: 'Jul', revenue: 67000, expenses: 38000 },
  { month: 'Aug', revenue: 72000, expenses: 40000 },
  { month: 'Sep', revenue: 69000, expenses: 37000 },
  { month: 'Oct', revenue: 78000, expenses: 42000 },
  { month: 'Nov', revenue: 85000, expenses: 45000 },
  { month: 'Dec', revenue: 91000, expenses: 48000 },
]

const channelData = [
  { channel: 'Direct', value: 38 },
  { channel: 'Organic', value: 27 },
  { channel: 'Referral', value: 18 },
  { channel: 'Paid', value: 17 },
]

const conversionData = [
  { week: 'W1', rate: 3.2 },
  { week: 'W2', rate: 4.1 },
  { week: 'W3', rate: 3.8 },
  { week: 'W4', rate: 5.0 },
  { week: 'W5', rate: 4.6 },
  { week: 'W6', rate: 5.4 },
  { week: 'W7', rate: 6.1 },
  { week: 'W8', rate: 5.8 },
]

const COLORS = ['#e94560', '#0f3460', '#16213e', '#533483']

const kpis = [
  { label: 'Total Revenue', value: '$767K', delta: '+12.4%', up: true },
  { label: 'Active Users', value: '24,831', delta: '+8.1%', up: true },
  { label: 'Avg. Deal Size', value: '$4,210', delta: '-2.3%', up: false },
  { label: 'Churn Rate', value: '2.7%', delta: '-0.4%', up: true },
]

export default function Analytics() {
  return (
    <div className="page analytics-page">
      <h1 className="page-title">Analytics</h1>
      <p className="page-desc">Real-time overview of your business performance.</p>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi-card">
            <span className="kpi-label">{k.label}</span>
            <span className="kpi-value">{k.value}</span>
            <span className={`kpi-delta ${k.up ? 'up' : 'down'}`}>{k.delta}</span>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="chart-card wide">
          <h3 className="chart-title">Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#e94560" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#e94560" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f3460" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#0f3460" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d50" />
              <XAxis dataKey="month" stroke="#9a9ab0" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9a9ab0" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
              <Tooltip
                contentStyle={{ background: '#16213e', border: '1px solid #1e2d50', borderRadius: 8, color: '#e0e0e0' }}
                formatter={(v: ValueType | undefined) => [`$${Number(v).toLocaleString()}`, '']}
              />
              <Legend wrapperStyle={{ color: '#9a9ab0', fontSize: 13 }} />
              <Area type="monotone" dataKey="revenue" stroke="#e94560" fill="url(#revGrad)" name="Revenue" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="#4a8fff" fill="url(#expGrad)" name="Expenses" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Traffic by Channel</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={channelData}
                cx="50%"
                cy="45%"
                outerRadius={90}
                dataKey="value"
                nameKey="channel"
                label={({ name, value }) => `${name} ${value}%`}
                labelLine={false}
              >
                {channelData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#16213e', border: '1px solid #1e2d50', borderRadius: 8, color: '#e0e0e0' }}
                formatter={(v: ValueType | undefined) => [`${Number(v)}%`, '']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Conversion Rate (%)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d50" />
              <XAxis dataKey="week" stroke="#9a9ab0" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9a9ab0" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#16213e', border: '1px solid #1e2d50', borderRadius: 8, color: '#e0e0e0' }}
                formatter={(v: ValueType | undefined) => [`${Number(v)}%`, 'Conv. Rate']}
              />
              <Bar dataKey="rate" fill="#e94560" radius={[4, 4, 0, 0]} name="Rate" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
