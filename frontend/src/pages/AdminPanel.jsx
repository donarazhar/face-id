import { useState, useEffect, useRef, useCallback } from 'react';
import { employeeApi } from '../services/apiService';
import { loadModels, loadPreciseModels, detectPrecise, detectAndDescribe, drawDetection, captureThumb, areModelsLoaded, arePreciseModelsLoaded, validateFaceQuality } from '../services/faceApiService';
import { HiOutlinePlus, HiOutlineCamera, HiOutlineTrash, HiOutlinePencil, HiOutlineX, HiOutlineRefresh } from 'react-icons/hi';

function AdminPanel({ addToast }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nip: '', nama: '', jabatan: '' });
  const [formErrors, setFormErrors] = useState({});
  const [enrollingId, setEnrollingId] = useState(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetected, setFaceDetected] = useState(null);
  const [faceQuality, setFaceQuality] = useState(null);
  const [enrolling, setEnrolling] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastDetectionTime = useRef(0);

  useEffect(() => {
    loadEmployees();
    initModels();
    return () => stopCamera();
  }, []);

  const initModels = async () => {
    // Load fast models first (for quick UI readiness)
    const loaded = await loadModels();
    // Then load precise models for high-quality enrollment
    const precise = await loadPreciseModels();
    setModelsReady(loaded && precise);
    if (!loaded || !precise) {
      addToast('Gagal memuat model Face-API. Periksa folder /public/models/', 'error');
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await employeeApi.getAll();
      setEmployees(res.data.data);
    } catch (err) {
      addToast('Gagal memuat data pegawai.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ---- Form handlers ----
  const openForm = (employee = null) => {
    if (employee) {
      setEditingId(employee.id);
      setFormData({ nip: employee.nip, nama: employee.nama, jabatan: employee.jabatan || '' });
    } else {
      setEditingId(null);
      setFormData({ nip: '', nama: '', jabatan: '' });
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    try {
      if (editingId) {
        await employeeApi.update(editingId, formData);
        addToast('Data pegawai berhasil diperbarui.', 'success');
      } else {
        await employeeApi.create(formData);
        addToast('Pegawai baru berhasil ditambahkan.', 'success');
      }
      setShowForm(false);
      loadEmployees();
    } catch (err) {
      if (err.response?.status === 422) {
        setFormErrors(err.response.data.errors || {});
      } else {
        addToast('Terjadi kesalahan saat menyimpan data.', 'error');
      }
    }
  };

  const handleDelete = async (id, nama) => {
    if (!confirm(`Hapus pegawai "${nama}"? Data absensinya juga akan terhapus.`)) return;
    try {
      await employeeApi.delete(id);
      addToast(`${nama} berhasil dihapus.`, 'success');
      loadEmployees();
    } catch (err) {
      addToast('Gagal menghapus pegawai.', 'error');
    }
  };

  // ---- Camera / Face Enrollment ----
  const startCamera = async (employeeId) => {
    setEnrollingId(employeeId);
    setFaceDetected(null);
    setFaceQuality(null);
    setCameraActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startDetection();
      }
    } catch (err) {
      addToast('Tidak dapat mengakses kamera. Periksa izin browser.', 'error');
      setCameraActive(false);
      setEnrollingId(null);
    }
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setEnrollingId(null);
    setFaceDetected(null);
    setFaceQuality(null);
  };

  const startDetection = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const detectLoop = async () => {
      if (!videoRef.current || videoRef.current.paused) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      const now = performance.now();
      // Throttle: deteksi setiap ~300ms (enrollment butuh akurasi, bukan kecepatan)
      if (now - lastDetectionTime.current < 300) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      lastDetectionTime.current = now;

      // Gunakan model PRESISI untuk enrollment (SSD MobileNet + Full Landmarks)
      const result = await detectPrecise(videoRef.current);
      setFaceDetected(result);

      // Validasi kualitas wajah secara real-time
      if (result) {
        const quality = validateFaceQuality(result, videoRef.current);
        setFaceQuality(quality);
      } else {
        setFaceQuality(null);
      }

      if (canvasRef.current && videoRef.current) {
        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        };
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        const qualityOk = result && faceQuality?.valid;
        const color = qualityOk ? '#00ff88' : (result ? '#fdcb6e' : '');
        const label = qualityOk ? '✅ Siap Simpan' : (result ? '⚠️ Perbaiki Posisi' : '');
        drawDetection(canvasRef.current, result, displaySize, label, color);
      }

      animFrameRef.current = requestAnimationFrame(detectLoop);
    };

    animFrameRef.current = requestAnimationFrame(detectLoop);
  };

  const handleEnrollFace = async () => {
    if (!faceDetected || !enrollingId) return;

    // Validasi kualitas wajah sebelum menyimpan
    if (faceQuality && !faceQuality.valid) {
      addToast(`Kualitas wajah belum memenuhi: ${faceQuality.issues[0]}`, 'error');
      return;
    }

    setEnrolling(true);
    try {
      const thumbnail = captureThumb(videoRef.current);
      await employeeApi.enrollFace(enrollingId, {
        face_descriptor: faceDetected.descriptor,
        thumbnail: thumbnail,
      });
      addToast('Wajah berhasil didaftarkan!', 'success');
      stopCamera();
      loadEmployees();
    } catch (err) {
      addToast('Gagal mendaftarkan wajah. Coba lagi.', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveFace = async (id, nama) => {
    if (!confirm(`Hapus data wajah "${nama}"?`)) return;
    try {
      await employeeApi.removeFace(id);
      addToast(`Data wajah ${nama} berhasil dihapus.`, 'success');
      loadEmployees();
    } catch (err) {
      addToast('Gagal menghapus data wajah.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <p>Memuat data pegawai...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Kelola Pegawai</h2>
          <p>Tambah, edit, dan daftarkan wajah pegawai</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>
          <HiOutlinePlus /> Tambah Pegawai
        </button>
      </div>

      {/* Model Status */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <span className={`badge badge-dot ${modelsReady ? 'badge-success' : 'badge-warning'}`}>
          {modelsReady ? 'Model AI Siap' : 'Memuat Model AI...'}
        </span>
      </div>

      {/* Camera Modal for Face Enrollment */}
      {cameraActive && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && stopCamera()}>
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>📸 Registrasi Wajah — {employees.find(e => e.id === enrollingId)?.nama}</h3>
              <button className="btn btn-ghost btn-icon" onClick={stopCamera}>
                <HiOutlineX />
              </button>
            </div>

            <div className="camera-container" style={{ maxWidth: '100%' }}>
              <video ref={videoRef} playsInline muted />
              <canvas ref={canvasRef} />
              <div className="camera-status">
                <div className={`pulse ${faceDetected ? 'active' : ''}`}></div>
                <span>{faceDetected ? 'Wajah Terdeteksi' : 'Mencari Wajah...'}</span>
              </div>
            </div>

            <div className="camera-controls">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleEnrollFace}
                disabled={!faceDetected || enrolling || (faceQuality && !faceQuality.valid)}
              >
                {enrolling ? (
                  <><span className="spinner"></span> Menyimpan...</>
                ) : (
                  <><HiOutlineCamera /> Simpan Wajah</>
                )}
              </button>
              <button className="btn btn-secondary" onClick={stopCamera}>
                Batal
              </button>
            </div>

            {faceDetected && (
              <div style={{ marginTop: 'var(--space-md)', textAlign: 'center' }}>
                <span className="text-sm text-muted">
                  Confidence: {Math.round(faceDetected.score * 100)}% • Descriptor: 128 dimensi ✓
                </span>
                {faceQuality && !faceQuality.valid && (
                  <div style={{ marginTop: '8px' }}>
                    {faceQuality.issues.map((issue, i) => (
                      <div key={i} className="badge badge-warning" style={{ display: 'block', marginTop: '4px', fontSize: '0.75rem' }}>
                        ⚠️ {issue}
                      </div>
                    ))}
                  </div>
                )}
                {faceQuality && faceQuality.valid && (
                  <div style={{ marginTop: '8px' }}>
                    <span className="badge badge-success">✅ Kualitas wajah baik — siap simpan</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editingId ? '✏️ Edit Pegawai' : '➕ Tambah Pegawai Baru'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}>
                <HiOutlineX />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">NIP</label>
                <input
                  id="input-nip"
                  type="text"
                  className="form-input"
                  placeholder="Contoh: 198501012010011001"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  disabled={!!editingId}
                />
                {formErrors.nip && <div className="form-error">{formErrors.nip[0]}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Nama Lengkap</label>
                <input
                  id="input-nama"
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Ahmad Fauzi, S.Pd."
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                />
                {formErrors.nama && <div className="form-error">{formErrors.nama[0]}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Jabatan</label>
                <input
                  id="input-jabatan"
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Guru Matematika"
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Simpan Perubahan' : 'Tambah Pegawai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Table */}
      <div className="card">
        <div className="card-header">
          <h3>Daftar Pegawai ({employees.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={loadEmployees}>
            <HiOutlineRefresh /> Refresh
          </button>
        </div>

        {employees.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Pegawai</th>
                  <th>NIP</th>
                  <th>Jabatan</th>
                  <th>Status Wajah</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div className="employee-info">
                        <div className="employee-avatar">
                          {emp.photo_thumbnail ? (
                            <img src={emp.photo_thumbnail} alt={emp.nama} />
                          ) : (
                            emp.nama?.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="name">{emp.nama}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {emp.nip}
                    </td>
                    <td>{emp.jabatan || '—'}</td>
                    <td>
                      {emp.has_face ? (
                        <span className="badge badge-success badge-dot">Terdaftar</span>
                      ) : (
                        <span className="badge badge-warning badge-dot">Belum</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {emp.has_face ? (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRemoveFace(emp.id, emp.nama)}
                            title="Hapus data wajah"
                          >
                            Hapus Wajah
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => startCamera(emp.id)}
                            disabled={!modelsReady}
                            title="Daftarkan wajah"
                          >
                            <HiOutlineCamera /> Daftar Wajah
                          </button>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openForm(emp)}
                          title="Edit data"
                        >
                          <HiOutlinePencil />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(emp.id, emp.nama)}
                          title="Hapus pegawai"
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
            <div className="empty-icon">👥</div>
            <h3>Belum Ada Pegawai</h3>
            <p>Tambahkan pegawai baru untuk memulai registrasi wajah.</p>
            <button className="btn btn-primary mt-lg" onClick={() => openForm()}>
              <HiOutlinePlus /> Tambah Pegawai Pertama
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
