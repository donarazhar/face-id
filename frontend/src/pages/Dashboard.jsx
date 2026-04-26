import { useState, useEffect } from 'react';
import { dashboardApi } from '../services/apiService';
import { HiOutlineUsers, HiOutlineIdentification, HiOutlineCheckCircle, HiOutlineChartBar } from 'react-icons/hi';

function Dashboard({ addToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await dashboardApi.stats();
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      addToast('Gagal memuat statistik. Pastikan server Laravel berjalan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      icon: <HiOutlineUsers />,
      value: stats?.total_employees ?? 0,
      label: 'Total Pegawai',
      color: '#00d4aa',
    },
    {
      icon: <HiOutlineIdentification />,
      value: stats?.registered_faces ?? 0,
      label: 'Wajah Terdaftar',
      color: '#6c5ce7',
    },
    {
      icon: <HiOutlineCheckCircle />,
      value: stats?.today_attendance ?? 0,
      label: 'Hadir Hari Ini',
      color: '#74b9ff',
    },
    {
      icon: <HiOutlineChartBar />,
      value: `${stats?.attendance_rate ?? 0}%`,
      label: 'Tingkat Kehadiran',
      color: '#fdcb6e',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Ringkasan sistem presensi Face-as-a-Service</p>
      </div>

      <div className="stats-grid">
        {statCards.map((card, idx) => (
          <div key={idx} className="stat-card" style={{ '--stat-color': card.color }}>
            <div className="stat-icon" style={{ background: `${card.color}15`, color: card.color }}>
              {card.icon}
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Recent Attendance */}
        <div className="card">
          <div className="card-header">
            <h3>Absensi Terakhir</h3>
            <span className="badge badge-info badge-dot">Hari Ini</span>
          </div>
          {stats?.recent_attendance?.length > 0 ? (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Pegawai</th>
                    <th>Waktu</th>
                    <th>Akurasi</th>
                    <th>Jalur / App</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_attendance.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="employee-info">
                          <div className="employee-avatar">
                            {log.employee?.photo_thumbnail ? (
                              <img src={log.employee.photo_thumbnail} alt={log.employee.nama} />
                            ) : (
                              log.employee?.nama?.charAt(0) || '?'
                            )}
                          </div>
                          <div>
                            <div className="name">{log.employee?.nama}</div>
                            <div className="nip">{log.employee?.nip}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        {new Date(log.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(parseFloat(log.confidence_score) * 100)}%`, background: 'var(--primary)', borderRadius: '3px' }}></div>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {log.confidence_score ? `${Math.round(parseFloat(log.confidence_score) * 100)}%` : '—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${log.method?.startsWith('sso') ? 'badge-info' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                          {log.method === 'face_id' ? 'Internal Scanner' : log.method?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>Belum Ada Data</h3>
              <p>Belum ada pegawai yang absen hari ini.</p>
            </div>
          )}
        </div>

        {/* System Info */}
        <div className="card">
          <div className="card-header">
            <h3>Informasi Sistem</h3>
            <span className="badge badge-success badge-dot">Online</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <InfoRow label="Versi Aplikasi" value="1.0.0-trial" />
            <InfoRow label="Face Detection" value="face-api.js (vladmandic)" />
            <InfoRow label="Descriptor Size" value="128 dimensi" />
            <InfoRow label="Threshold" value="0.6 (Euclidean Distance)" />
            <InfoRow label="Backend" value="Laravel 12 API" />
            <InfoRow label="Database" value="MySQL 8+" />
            <InfoRow
              label="Wajah Belum Terdaftar"
              value={`${stats?.unregistered_faces ?? 0} pegawai`}
              highlight={stats?.unregistered_faces > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight = false }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.85rem',
        color: highlight ? 'var(--warning)' : 'var(--text-primary)',
        fontWeight: highlight ? '600' : '400',
      }}>
        {value}
      </span>
    </div>
  );
}

export default Dashboard;
