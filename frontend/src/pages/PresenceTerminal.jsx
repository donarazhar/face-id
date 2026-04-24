import { useState, useEffect, useRef, useCallback } from 'react';
import { attendanceApi } from '../services/apiService';
import { loadModels, detectAndDescribe, drawDetection, areModelsLoaded } from '../services/faceApiService';
import { HiOutlineCamera, HiOutlineStop } from 'react-icons/hi';

function PresenceTerminal({ addToast }) {
  const [modelsReady, setModelsReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [faceDetected, setFaceDetected] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const cooldownRef = useRef(false);
  const lastDetectionTime = useRef(0);

  useEffect(() => {
    initModels();
    loadTodayLogs();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(timer);
      stopScanner();
    };
  }, []);

  const initModels = async () => {
    const loaded = await loadModels();
    setModelsReady(loaded);
  };

  const loadTodayLogs = async () => {
    try {
      const res = await attendanceApi.today();
      setTodayLogs(res.data.data);
    } catch (err) {
      console.error('Failed to load today logs:', err);
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setFeedback(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Resolusi lebih kecil = deteksi lebih cepat
        video: { width: 320, height: 240, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        startAutoDetection();
      }
    } catch (err) {
      addToast('Tidak dapat mengakses kamera.', 'error');
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setFaceDetected(null);
  };

  // Menggunakan requestAnimationFrame + throttle untuk deteksi lebih smooth
  const startAutoDetection = () => {
    const detectLoop = async () => {
      if (!videoRef.current || videoRef.current.paused) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      const now = performance.now();
      // Throttle: deteksi setiap ~200ms (5fps) — cukup cepat untuk real-time
      if (now - lastDetectionTime.current < 200) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      // Skip deteksi jika sedang proses atau cooldown
      if (processing || cooldownRef.current) {
        animFrameRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      lastDetectionTime.current = now;

      const result = await detectAndDescribe(videoRef.current);
      setFaceDetected(result);

      if (canvasRef.current && videoRef.current) {
        const displaySize = {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        };
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;

        if (result) {
          drawDetection(canvasRef.current, result, displaySize, 'Memverifikasi...', '#00d4aa');
        } else {
          const ctx = canvasRef.current.getContext('2d');
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      // Auto-recognize ketika wajah terdeteksi dengan confidence tinggi
      if (result && result.score > 0.65 && !processing && !cooldownRef.current) {
        await recognizeFace(result.descriptor);
      }

      animFrameRef.current = requestAnimationFrame(detectLoop);
    };

    animFrameRef.current = requestAnimationFrame(detectLoop);
  };

  const recognizeFace = async (descriptor) => {
    setProcessing(true);
    cooldownRef.current = true;

    try {
      const res = await attendanceApi.recognize({ face_descriptor: descriptor });
      const data = res.data;

      setFeedback({
        success: true,
        name: data.data.employee?.nama,
        message: data.message,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        alreadyCheckedIn: data.already_checked_in,
        photo: data.data.employee?.photo_thumbnail,
      });

      loadTodayLogs();

      // Cooldown lebih singkat: 2.5 detik (dari 4 detik)
      setTimeout(() => {
        setFeedback(null);
        cooldownRef.current = false;
      }, 2500);

    } catch (err) {
      if (err.response?.status === 404) {
        setFeedback({
          success: false,
          name: 'Tidak Dikenali',
          message: 'Wajah tidak terdaftar dalam sistem.',
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      } else {
        addToast('Kesalahan server saat mengenali wajah.', 'error');
      }

      setTimeout(() => {
        setFeedback(null);
        cooldownRef.current = false;
      }, 2000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Terminal Absensi</h2>
        <p>Arahkan wajah ke kamera untuk mencatat kehadiran</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-xl)', alignItems: 'start' }}>
        {/* Scanner Area */}
        <div>
          {/* Clock Display */}
          <div style={{
            textAlign: 'center',
            marginBottom: 'var(--space-lg)',
            padding: 'var(--space-lg)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--glass-border)',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '3rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
            }}>
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          {/* Camera View */}
          <div className="camera-container" style={{ maxWidth: '100%', aspectRatio: '4/3' }}>
            {scanning ? (
              <>
                <video ref={videoRef} playsInline muted />
                <canvas ref={canvasRef} />
                <div className="camera-status">
                  <div className={`pulse ${faceDetected ? 'active' : ''}`}></div>
                  <span>
                    {processing ? 'Memverifikasi...' : faceDetected ? 'Wajah Terdeteksi' : 'Mencari Wajah...'}
                  </span>
                </div>
              </>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--text-muted)',
                gap: 'var(--space-md)',
              }}>
                <div style={{ fontSize: '3rem' }}>📸</div>
                <p>Kamera belum aktif</p>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="camera-controls" style={{ marginTop: 'var(--space-lg)' }}>
            {!scanning ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={startScanner}
                disabled={!modelsReady}
              >
                <HiOutlineCamera /> Mulai Scanner
              </button>
            ) : (
              <button className="btn btn-danger btn-lg" onClick={stopScanner}>
                <HiOutlineStop /> Hentikan Scanner
              </button>
            )}
          </div>

          {!modelsReady && (
            <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
              <span className="badge badge-warning badge-dot">Memuat Model AI...</span>
            </div>
          )}
        </div>

        {/* Today's Log Sidebar */}
        <div className="card" style={{ position: 'sticky', top: 'var(--space-xl)' }}>
          <div className="card-header">
            <h3>Hadir Hari Ini</h3>
            <span className="badge badge-info">{todayLogs.length}</span>
          </div>

          {todayLogs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxHeight: '500px', overflowY: 'auto' }}>
              {todayLogs.map(log => (
                <div key={log.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-sm) 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div className="employee-avatar" style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}>
                    {log.employee?.photo_thumbnail ? (
                      <img src={log.employee.photo_thumbnail} alt="" />
                    ) : (
                      log.employee?.nama?.charAt(0) || '?'
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.employee?.nama}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(log.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className="badge badge-success badge-dot" style={{ fontSize: '0.65rem' }}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--space-xl)' }}>
              <div className="empty-icon" style={{ fontSize: '2rem' }}>📋</div>
              <p className="text-sm">Belum ada absensi hari ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback Overlay */}
      {feedback && (
        <div className="feedback-overlay" onClick={() => setFeedback(null)}>
          <div className="feedback-card">
            <div className="feedback-icon">
              {feedback.success ? '✅' : '❌'}
            </div>
            {feedback.photo && (
              <div className="employee-avatar" style={{
                width: '80px',
                height: '80px',
                margin: '0 auto var(--space-lg)',
                fontSize: '2rem',
                borderRadius: 'var(--radius-lg)',
              }}>
                <img src={feedback.photo} alt="" />
              </div>
            )}
            <div className="feedback-name">{feedback.name}</div>
            <div className="feedback-message">{feedback.message}</div>
            <div className="feedback-time">{feedback.time}</div>
            {feedback.alreadyCheckedIn && (
              <div style={{ marginTop: 'var(--space-md)' }}>
                <span className="badge badge-info">Sudah Absen Sebelumnya</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PresenceTerminal;
