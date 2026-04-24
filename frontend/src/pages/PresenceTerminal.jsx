import { useState, useEffect } from 'react';
import { attendanceApi, branchApi } from '../services/apiService';
import { HiOutlineRefresh, HiOutlineFilter, HiOutlineOfficeBuilding } from 'react-icons/hi';

function PresenceTerminal({ addToast }) {
  const [logs, setLogs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedBranch, setSelectedBranch] = useState('');
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]); // Default hari ini
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadBranches();
    loadAttendanceData();
  }, []); // Load awal

  // Load ulang saat filter berubah
  useEffect(() => {
    loadAttendanceData();
  }, [selectedBranch, dateFrom, dateTo]);

  const loadBranches = async () => {
    try {
      const res = await branchApi.getAll();
      setBranches(res.data.data);
    } catch (err) {
      console.error('Failed to load branches', err);
    }
  };

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedBranch) params.branch_id = selectedBranch;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await attendanceApi.report(params);
      setLogs(res.data.data);
    } catch (err) {
      addToast('Gagal memuat data absensi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Data Absensi Pegawai</h2>
        <p>Pantau log kehadiran pegawai berdasarkan cabang dan tanggal</p>
      </div>

      {/* Filter Card */}
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          
          <div style={{ flex: '1 1 250px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <HiOutlineOfficeBuilding /> Pilih Cabang
            </label>
            <select 
              className="form-input" 
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">-- Semua Cabang --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.nama}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Tanggal Mulai</label>
            <input 
              type="date" 
              className="form-input" 
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label className="form-label">Tanggal Akhir</label>
            <input 
              type="date" 
              className="form-input" 
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
            <button className="btn btn-secondary" onClick={loadAttendanceData} disabled={loading}>
              <HiOutlineFilter /> Filter
            </button>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="card">
        <div className="card-header">
          <h3>Log Kehadiran ({logs.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={loadAttendanceData} disabled={loading}>
            <HiOutlineRefresh className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <div className="spinner spinner-lg"></div>
            <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-muted)' }}>Memuat data absensi...</p>
          </div>
        ) : logs.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Pegawai & NIP</th>
                  <th>Cabang Tugas</th>
                  <th>Status</th>
                  <th>Metode</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => {
                  const logDate = new Date(log.check_in_time);
                  return (
                    <tr key={log.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                          {logDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {logDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td>
                        <div className="employee-info" style={{ gap: '10px' }}>
                          <div className="employee-avatar" style={{ width: '35px', height: '35px', fontSize: '1rem' }}>
                            {log.employee?.photo_thumbnail ? (
                              <img src={log.employee.photo_thumbnail} alt="" />
                            ) : (
                              log.employee?.nama?.charAt(0) || '?'
                            )}
                          </div>
                          <div>
                            <div className="name" style={{ fontSize: '0.9rem' }}>{log.employee?.nama || 'Unknown'}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              ID: {log.employee?.nip || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {log.employee?.branch ? (
                          <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--primary)', fontSize: '0.8rem' }}>
                            🏢 {log.employee.branch.nama}
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-dot ${log.status === 'hadir' ? 'badge-success' : 'badge-warning'}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                          {log.method}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Tidak Ada Data</h3>
            <p>Tidak ditemukan log absensi untuk filter yang dipilih.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PresenceTerminal;
