// frontend/src/components/AnalyticsCharts.js
import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import './AnalyticsCharts.css';

const COLORS = ['#C97B5F', '#8FA68E', '#D4A5A5', '#C9A961', '#9D4EDD', '#00B248', '#E07A5F', '#4A90E2'];

function AnalyticsCharts({ mode = 'manager' }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const endpoint = mode === 'admin'
          ? `/api/admin/analytics/charts?days=${days}`
          : `/api/manager/analytics/charts?days=${days}`;
        const res = await axios.get(`http://localhost:5000${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [days, mode]);

  if (loading) return <div className="analytics-loading">Loading analytics…</div>;
  if (!data) return null;

  const formatKSh = (n) => `KSh ${Math.round(n || 0).toLocaleString()}`;
  const shortKSh = (n) => `KSh ${(n / 1000).toFixed(0)}k`;

  const statusData = (data.statusDist || []).map(s => ({
    name: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    value: s.count
  }));

  return (
    <div className="analytics-wrap">
      <div className="analytics-range">
        {[7, 30, 90].map(d => (
          <button
            key={d}
            className={`range-btn ${days === d ? 'active' : ''}`}
            onClick={() => setDays(d)}
          >
            Last {d} days
          </button>
        ))}
      </div>

      <div className="chart-card">
        <div className="chart-head">
          <h3>Revenue & Orders Trend</h3>
          <p>Daily performance over the last {days} days</p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data.trend || []}>
            <CartesianGrid strokeDasharray="4 4" stroke="#E8DFD3" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(v) => new Date(v).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
              stroke="#A59E94"
              style={{ fontSize: 12 }}
            />
            <YAxis yAxisId="left" tickFormatter={shortKSh} stroke="#A59E94" style={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#A59E94" style={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: '#FFFFFF',
                border: '1px solid #E8DFD3',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(201, 123, 95, 0.12)'
              }}
              formatter={(value, name) => {
                if (name === 'Revenue') return [formatKSh(value), name];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="#C97B5F" strokeWidth={3} dot={{ r: 4, fill: '#C97B5F' }} />
            <Line yAxisId="right" type="monotone" dataKey="orders" name="Orders" stroke="#8FA68E" strokeWidth={2} dot={{ r: 3, fill: '#8FA68E' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-grid-2">
        <div className="chart-card">
          <div className="chart-head">
            <h3>{mode === 'admin' ? 'Top Restaurants' : 'Top Selling Items'}</h3>
            <p>By revenue</p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart
              data={mode === 'admin' ? (data.topHotels || []).slice(0, 6) : (data.topItems || [])}
              layout="vertical"
              margin={{ left: 24, right: 24 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#E8DFD3" horizontal={false} />
              <XAxis type="number" tickFormatter={shortKSh} stroke="#A59E94" style={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" stroke="#A59E94" width={100} style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E8DFD3', borderRadius: 12 }} formatter={(v) => [formatKSh(v), 'Revenue']} />
              <Bar dataKey="revenue" radius={[0, 8, 8, 0]}>
                {(mode === 'admin' ? (data.topHotels || []).slice(0, 6) : (data.topItems || [])).map((entry, i) => (
                  <Cell key={i} fill={entry.brand_color || COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-head">
            <h3>Order Status</h3>
            <p>Distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={3}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E8DFD3', borderRadius: 12 }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {mode === 'manager' && data.hourly && (
        <div className="chart-card">
          <div className="chart-head">
            <h3>Peak Order Hours</h3>
            <p>Last 7 days</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.hourly}>
              <CartesianGrid strokeDasharray="4 4" stroke="#E8DFD3" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} stroke="#A59E94" style={{ fontSize: 12 }} />
              <YAxis stroke="#A59E94" style={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E8DFD3', borderRadius: 12 }} formatter={(v) => [`${v} orders`, 'Orders']} />
              <Bar dataKey="orders" radius={[8, 8, 0, 0]} fill="#9D4EDD" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default AnalyticsCharts;