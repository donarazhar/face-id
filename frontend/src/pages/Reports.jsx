import { useState, useEffect } from 'react';
import { attendanceApi } from '../services/apiService';
import { HiOutlineSearch, HiOutlineCalendar, HiOutlineDownload } from 'react-icons/hi';

function Reports({ addToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await attendanceApi.report({
        date_from: dateFrom,
        date_to: dateTo,
      });
      setLogs(res.data.data);
    } catch (err) {
      addToast('Gagal memuat laporan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadReport();
  };

  const getMethodBadge = (method) => {
    if (!method) return <span className="badge badge-info">Tidak Diketahui</span>;
    if (method === 'face_id') return <span className="badge badge-success">Scanner Utama</span>;
    if (method.includes('portal')) return <span className="badge" style={{ background: '#3498db', color: 'white' }}>Portal Berita (SSO)</span>;
    if (method.includes('penggaj')) return <span className="badge" style={{ background: '#2ecc71', color: 'white' }}>Payroll (SSO)</span>;
    
    return <span className="badge badge-warning">{method.toUpperCase()}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Log Aktivitas & Audit Trail</h2>
        <p>Memantau seluruh aktivitas login pegawai lintas aplikasi (SSO) secara real-time</p>
      </div>

      {/* Filter */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <form onSubmit={handleSearch} style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--space-lg)',
          flexWrap: 'wrap',
        }}>
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <label className="form-label"><HiOutlineCalendar style={{ marginRight: '4px' }} /> Dari Tanggal</label>
            <input
              id="filter-date-from"
              type="date"
              className="form-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: '1 1 200px' }}>
            <label className="form-label"><HiOutlineCalendar style={{ marginRight: '4px' }} /> Sampai Tanggal</label>
            <input
              id="filter-date-to"
              type="date"
              className="form-input"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginBottom: 0 }}>
            <HiOutlineSearch /> Filter Log
          </button>
        </form>
      </div>

      {/* Report Summary */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--space-lg)' }}>
        <div className="stat-card" style={{ '--stat-color': '#00d4aa' }}>
          <div className="stat-value">{logs.length}</div>
          <div className="stat-label">Total Akses / Login</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#74b9ff' }}>
          <div className="stat-value">
            {new Set(logs.map(l => l.employee?.nip)).size}
          </div>
          <div className="stat-label">Pengguna Unik Terverifikasi</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#fdcb6e' }}>
          <div className="stat-value">
            {logs.filter(l => l.method && l.method !== 'face_id').length}
          </div>
          <div className="stat-label">Total Penggunaan SSO Eksternal</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="card-header">
          <h3>Detail Aktivitas Akses</h3>
          <span className="badge badge-info">{logs.length} aktivitas terekam</span>
        </div>

        {loading ? (
          <div className="loading-screen" style={{ minHeight: '200px' }}>
            <div className="spinner spinner-lg"></div>
            <p>Memuat log aktivitas...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Identitas Pengguna</th>
                  <th>NIP</th>
                  <th>Waktu Akses</th>
                  <th>Keakuratan Wajah (AI)</th>
                  <th>Jalur Akses (Aplikasi)</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <tr key={log.id}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>#LOG-{log.id}</td>
                    <td>
                      <div className="employee-info">
                        <div className="employee-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem' }}>
                          {log.employee?.photo_thumbnail ? (
                            <img src={log.employee.photo_thumbnail} alt="" />
                          ) : (
                            log.employee?.nama?.charAt(0) || '?'
                          )}
                        </div>
                        <div>
                          <div className="name" style={{ fontSize: '0.85rem' }}>{log.employee?.nama}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {log.employee?.nip}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {new Date(log.check_in_time).toLocaleTimeString('id-ID', {
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(log.check_in_time).toLocaleDateString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                      <span className={`badge badge-dot ${parseFloat(log.confidence_score) < 0.4 ? 'badge-success' : 'badge-warning'}`}>
                        {log.confidence_score ? `${Math.round(parseFloat(log.confidence_score) * 100)}% Match` : '—'}
                      </span>
                    </td>
                    <td>
                      {getMethodBadge(log.method)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🛡️</div>
            <h3>Log Bersih</h3>
            <p>Belum ada aktivitas login yang tercatat pada rentang tanggal ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
