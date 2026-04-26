import { useState, useEffect, useRef, useCallback } from 'react';
import { employeeApi, branchApi, positionApi } from '../services/apiService';
import { loadModels, loadPreciseModels, detectPrecise, detectAndDescribe, drawDetection, captureThumb, areModelsLoaded, arePreciseModelsLoaded, validateFaceQuality } from '../services/faceApiService';
import { HiOutlinePlus, HiOutlineCamera, HiOutlineTrash, HiOutlinePencil, HiOutlineX, HiOutlineRefresh } from 'react-icons/hi';

function AdminPanel({ addToast }) {
  const [employees, setEmployees] = useState([]);
  const [branches, setBranches] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nip: '', nama: '', jabatan: '', branch_id: '' });
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
    loadBranches();
    loadPositions();
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

  const loadBranches = async () => {
    try {
      const res = await branchApi.getAll();
      setBranches(res.data.data);
    } catch (err) {
      console.error('Failed to load branches');
    }
  };

  const loadPositions = async () => {
    try {
      const res = await positionApi.getAll();
      setPositions(res.data.data);
    } catch (err) {
      console.error('Failed to load positions');
    }
  };

  // ---- Form handlers ----
  const openForm = (employee = null) => {
    if (employee) {
      setEditingId(employee.id);
      setFormData({ nip: employee.nip, nama: employee.nama, jabatan: employee.jabatan || '', branch_id: employee.branch_id || '' });
    } else {
      setEditingId(null);
      setFormData({ nip: '', nama: '', jabatan: '', branch_id: '' });
    }
    setFormErrors({});
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    
    const dataToSend = { ...formData };
    if (dataToSend.branch_id === '') {
      dataToSend.branch_id = null;
    }

    try {
      if (editingId) {
        await employeeApi.update(editingId, dataToSend);
        addToast('Data pegawai berhasil diperbarui.', 'success');
      } else {
        await employeeApi.create(dataToSend);
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
      // Use 'ideal' constraints so mobile cameras can negotiate
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
          facingMode: 'user'
        },
        audio: false
      }).catch(() => {
        // Fallback: if 'user' facingMode fails, try without it
        return navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', ''); // Critical for iOS
        videoRef.current.setAttribute('webkit-playsinline', '');
        await videoRef.current.play();
        // Wait for video to be ready before starting detection
        videoRef.current.onloadedmetadata = () => {
          startDetection();
        };
        // If metadata already loaded
        if (videoRef.current.readyState >= 2) {
          startDetection();
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      const msg = err.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Buka Settings > Site Settings > Camera.'
        : err.name === 'NotFoundError'
        ? 'Kamera tidak ditemukan di perangkat ini.'
        : `Tidak dapat mengakses kamera: ${err.message}`;
      addToast(msg, 'error');
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

    // Detect mobile device — use FAST model on mobile, PRECISE on desktop
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const throttleMs = isMobile ? 600 : 300;

    const detectLoop = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      const now = performance.now();
      if (now - lastDetectionTime.current < throttleMs) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }
      lastDetectionTime.current = now;

      try {
        // Mobile: use TinyFaceDetector (fast, ~277KB) — works on low-end devices
        // Desktop: use SSD MobileNet V1 (precise, ~12MB) — better accuracy
        const result = isMobile
          ? await detectAndDescribe(videoRef.current)
          : await detectPrecise(videoRef.current);

        setFaceDetected(result);

        // Validasi kualitas wajah (threshold lebih rendah untuk mobile)
        if (result) {
          const quality = validateFaceQuality(result, videoRef.current);
          // On mobile, relax confidence threshold since TinyFaceDetector scores lower
          if (isMobile && quality.issues.length > 0) {
            quality.issues = quality.issues.filter(
              issue => !issue.includes('Kualitas deteksi rendah')
            );
            if (result.score >= 0.7) {
              quality.valid = quality.issues.length === 0;
            }
          }
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

          const qualityOk = result && (isMobile ? result.score >= 0.7 : faceQuality?.valid);
          const color = qualityOk ? '#00ff88' : (result ? '#fdcb6e' : '');
          const label = qualityOk ? '✅ Siap Simpan' : (result ? '⚠️ Perbaiki Posisi' : '');
          drawDetection(canvasRef.current, result, displaySize, label, color);
        }
      } catch (err) {
        // Silently handle detection errors on mobile
        console.warn('Detection error:', err);
      }

      animFrameRef.current = requestAnimationFrame(detectLoop);
    };

    animFrameRef.current = requestAnimationFrame(detectLoop);
  };

  const handleEnrollFace = async () => {
    if (!faceDetected || !enrollingId) return;

    // Validasi kualitas wajah sebelum menyimpan
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile && faceQuality && !faceQuality.valid) {
      addToast(`Kualitas wajah belum memenuhi: ${faceQuality.issues[0]}`, 'error');
      return;
    }
    // On mobile, only check minimum score
    if (isMobile && faceDetected.score < 0.7) {
      addToast('Wajah kurang jelas. Perbaiki pencahayaan.', 'error');
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
      <div className="page-header page-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
                disabled={!faceDetected || enrolling}
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
                <select
                  className="form-input"
                  value={formData.jabatan}
                  onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                >
                  <option value="">-- Pilih Jabatan --</option>
                  {positions.map(position => (
                    <option key={position.id} value={position.nama}>{position.nama}</option>
                  ))}
                </select>
                {formErrors.jabatan && <div className="form-error">{formErrors.jabatan[0]}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Cabang / Lokasi Tugas</label>
                <select
                  className="form-input"
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                >
                  <option value="">-- Pilih Cabang --</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.nama}</option>
                  ))}
                </select>
                {formErrors.branch_id && <div className="form-error">{formErrors.branch_id[0]}</div>}
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
                  <th>Pegawai & NIP</th>
                  <th className="hide-mobile">Jabatan & Cabang</th>
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
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ID: {emp.nip}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-mobile">
                      <div>{emp.jabatan || '—'}</div>
                      {emp.branch && (
                        <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--primary)', marginTop: '4px', display: 'inline-block', fontSize: '0.75rem' }}>
                          🏢 {emp.branch.nama}
                        </span>
                      )}
                    </td>
                    <td>
                      {emp.has_face ? (
                        <span className="badge badge-success badge-dot">Terdaftar</span>
                      ) : (
                        <span className="badge badge-warning badge-dot">Belum</span>
                      )}
                    </td>
                    <td>
                      <div className="action-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
