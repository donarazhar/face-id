import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import * as faceapi from '@vladmandic/face-api';

function MobileQrVerify() {
  const { token } = useParams();
  const [status, setStatus] = useState('Memuat AI...');
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const isLocal = !window.location.hostname.includes('donarazhar.site');
  const BASE_API_URL = isLocal ? '/api/v1' : 'https://sso.donarazhar.site/api/v1';
  const QR_VERIFY_URL = `${BASE_API_URL}/auth/qr/verify`;

  useEffect(() => {
    const initScanner = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri('/models'),
          faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
        ]);

        setStatus('Membuka Kamera HP...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 240 } });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error(err);
        setStatus('Kamera tidak diizinkan atau model gagal dimuat.');
        setIsError(true);
      }
    };

    initScanner();

    return () => {
      stopCamera();
    };
  }, []);

  const isProcessingRef = useRef(false);
  const intervalRef = useRef(null);

  const handleVideoPlay = () => {
    if (isSuccess || isError) return;
    
    setStatus('Mencari wajah Anda...');
    
    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || isProcessingRef.current) {
        return;
      }

      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.6 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (detection && detection.detection.score > 0.6 && !isProcessingRef.current) {
        isProcessingRef.current = true;
        clearInterval(intervalRef.current);
        verifyFace(Array.from(detection.descriptor));
      }
    }, 500);
  };

  const verifyFace = async (descriptorArray) => {
    setStatus('Memverifikasi ke Server...');
    try {
      const response = await fetch(QR_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token, face_descriptor: descriptorArray })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setStatus('✅ Verifikasi Berhasil! Silakan lihat layar PC Anda.');
        setIsSuccess(true);
        stopCamera();
      } else {
        setStatus(`❌ ${data.message || 'Wajah tidak cocok.'} Refresh halaman untuk mencoba lagi.`);
        setIsError(true);
        stopCamera();
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ Gagal terhubung ke server.');
      setIsError(true);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh', 
      background: '#f0f4f8', 
      fontFamily: "'Poppins', sans-serif",
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      
      <div style={{ textAlign: 'center', marginBottom: '20px', paddingTop: '10px' }}>
        <h2 style={{ color: '#2c3e50', margin: '0 0 5px 0', fontSize: '1.5rem' }}>Face-ID Mobile</h2>
        <p style={{ color: '#7f8c8d', margin: 0, fontSize: '0.9rem' }}>Posisikan wajah Anda di dalam area kamera.</p>
      </div>
      
      <div style={{
        padding: '15px', 
        borderRadius: '12px', 
        marginBottom: '20px', 
        background: isSuccess ? '#d4edda' : isError ? '#f8d7da' : '#fff',
        color: isSuccess ? '#155724' : isError ? '#721c24' : '#2c3e50',
        fontWeight: 'bold',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
        border: `1px solid ${isSuccess ? '#c3e6cb' : isError ? '#f5c6cb' : '#e2e8f0'}`
      }}>
        {status}
      </div>

      {!isSuccess && !isError && (
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          flex: 1, 
          maxHeight: '65vh',
          borderRadius: '20px', 
          overflow: 'hidden', 
          boxShadow: '0 10px 25px rgba(52, 152, 219, 0.3)',
          border: '4px solid #3498db',
          background: '#000'
        }}>
          <video 
            ref={videoRef} 
            onPlay={handleVideoPlay}
            autoPlay 
            muted 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
          
          {/* Overlay Scanner UI */}
          <div style={{
            position: 'absolute',
            top: '15%', left: '15%', right: '15%', bottom: '15%',
            border: '2px dashed rgba(255, 255, 255, 0.5)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}></div>
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '20px' }}>
        <p style={{ color: '#bdc3c7', fontSize: '0.75rem' }}>YPI Al Azhar &copy; 2026</p>
      </div>
    </div>
  );
}

export default MobileQrVerify;
