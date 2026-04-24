import { useState, useEffect } from 'react';
import { branchApi } from '../services/apiService';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineX, HiOutlineRefresh, HiOutlineLocationMarker } from 'react-icons/hi';

function BranchPanel({ addToast }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nama: '', alamat: '', latitude: '', longitude: '', radius: 200 });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const res = await branchApi.getAll();
      setBranches(res.data.data);
    } catch (err) {
      addToast('Gagal memuat data cabang.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (branch = null) => {
    if (branch) {
      setEditingId(branch.id);
      setFormData({
        nama: branch.nama,
        alamat: branch.alamat || '',
        latitude: branch.latitude,
        longitude: branch.longitude,
        radius: branch.radius,
      });
    } else {
      setEditingId(null);
      setFormData({ nama: '', alamat: '', latitude: '', longitude: '', radius: 200 });
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    try {
      if (editingId) {
        await branchApi.update(editingId, formData);
        addToast('Data cabang berhasil diperbarui.', 'success');
      } else {
        await branchApi.create(formData);
        addToast('Cabang baru berhasil ditambahkan.', 'success');
      }
      setShowForm(false);
      loadBranches();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
      } else {
        addToast('Terjadi kesalahan saat menyimpan data.', 'error');
      }
    }
  };

  const handleDelete = async (id, nama) => {
    if (!confirm(`Hapus cabang "${nama}"?`)) return;
    try {
      await branchApi.delete(id);
      addToast(`${nama} berhasil dihapus.`, 'success');
      loadBranches();
    } catch (err) {
      addToast('Gagal menghapus cabang. Mungkin masih ada pegawai terkait.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <p>Memuat data cabang...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Cabang Al Azhar</h2>
          <p>Kelola lokasi absen untuk pegawai</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <HiOutlinePlus /> Tambah Cabang
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? '✏️ Edit Cabang' : '➕ Tambah Cabang Baru'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <HiOutlineX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Cabang</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Kampus Pusat Al Azhar"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  required
                />
                {formErrors.nama && <div className="form-error">{formErrors.nama[0]}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Alamat Lengkap</label>
                <textarea
                  className="form-input"
                  placeholder="Alamat cabang..."
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                ></textarea>
                {formErrors.alamat && <div className="form-error">{formErrors.alamat[0]}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="-6.234567"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    required
                  />
                  {formErrors.latitude && <div className="form-error">{formErrors.latitude[0]}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="106.876543"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    required
                  />
                  {formErrors.longitude && <div className="form-error">{formErrors.longitude[0]}</div>}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Radius (meter)</label>
                <select
                  className="form-input"
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: Number(e.target.value) })}
                  required
                >
                  <option value={100}>100 Meter (Ketat)</option>
                  <option value={200}>200 Meter (Sedang)</option>
                  <option value={300}>300 Meter (Longgar)</option>
                </select>
                {formErrors.radius && <div className="form-error">{formErrors.radius[0]}</div>}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Simpan Perubahan' : 'Tambah Cabang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Daftar Cabang ({branches.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={loadBranches}>
            <HiOutlineRefresh /> Refresh
          </button>
        </div>

        {branches.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama Cabang</th>
                  <th>Alamat</th>
                  <th>Koordinat</th>
                  <th>Radius</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {branches.map(branch => (
                  <tr key={branch.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                        <HiOutlineLocationMarker style={{ color: 'var(--primary)', marginRight: '5px' }} />
                        {branch.nama}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {branch.alamat || '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {branch.latitude}, {branch.longitude}
                    </td>
                    <td>
                      <span className="badge badge-primary">{branch.radius}m</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm"
                          title="Lihat di Maps"
                        >
                          📍
                        </a>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openForm(branch)}
                          title="Edit cabang"
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(branch.id, branch.nama)}
                          title="Hapus cabang"
                          style={{ color: 'var(--danger)' }}
                        >
                          <HiOutlineTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <h3>Belum Ada Cabang</h3>
            <p>Tambahkan lokasi cabang untuk membatasi lokasi presensi pegawai.</p>
            <button className="btn btn-primary mt-lg" onClick={() => openForm()}>
              <HiOutlinePlus /> Tambah Cabang Pertama
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BranchPanel;
