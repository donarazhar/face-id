import { useState, useEffect } from 'react';
import { positionApi } from '../services/apiService';
import { HiOutlinePlus, HiOutlineTrash, HiOutlinePencil, HiOutlineX, HiOutlineRefresh } from 'react-icons/hi';

function PositionPanel({ addToast }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nama: '' });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    try {
      const res = await positionApi.getAll();
      setPositions(res.data.data);
    } catch (err) {
      addToast('Gagal memuat data jabatan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (position = null) => {
    if (position) {
      setEditingId(position.id);
      setFormData({
        nama: position.nama,
      });
    } else {
      setEditingId(null);
      setFormData({ nama: '' });
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    try {
      if (editingId) {
        await positionApi.update(editingId, formData);
        addToast('Data jabatan berhasil diperbarui.', 'success');
      } else {
        await positionApi.create(formData);
        addToast('Jabatan baru berhasil ditambahkan.', 'success');
      }
      setShowForm(false);
      loadPositions();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
      } else {
        addToast('Terjadi kesalahan saat menyimpan data.', 'error');
      }
    }
  };

  const handleDelete = async (id, nama) => {
    if (!confirm(`Hapus jabatan "${nama}"?`)) return;
    try {
      await positionApi.delete(id);
      addToast(`${nama} berhasil dihapus.`, 'success');
      loadPositions();
    } catch (err) {
      addToast('Gagal menghapus jabatan.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <p>Memuat data jabatan...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header page-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Data Jabatan</h2>
          <p>Kelola daftar jabatan untuk pegawai</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <HiOutlinePlus /> Tambah Jabatan
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? '✏️ Edit Jabatan' : '➕ Tambah Jabatan Baru'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <HiOutlineX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Nama Jabatan</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Guru Matematika"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  required
                />
                {formErrors.nama && <div className="form-error">{formErrors.nama[0]}</div>}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Simpan Perubahan' : 'Tambah Jabatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Daftar Jabatan ({positions.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={loadPositions}>
            <HiOutlineRefresh /> Refresh
          </button>
        </div>

        {positions.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nama Jabatan</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(position => (
                  <tr key={position.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                        💼 {position.nama}
                      </div>
                    </td>
                    <td>
                      <div className="action-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openForm(position)}
                          title="Edit jabatan"
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(position.id, position.nama)}
                          title="Hapus jabatan"
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
            <div className="empty-icon">💼</div>
            <h3>Belum Ada Jabatan</h3>
            <p>Tambahkan master data jabatan untuk dipilih saat menambah pegawai.</p>
            <button className="btn btn-primary mt-lg" onClick={() => openForm()}>
              <HiOutlinePlus /> Tambah Jabatan Pertama
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PositionPanel;
