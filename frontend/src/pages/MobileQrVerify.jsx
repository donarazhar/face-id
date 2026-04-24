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

  const handleVideoPlay = () => {
    if (isSuccess || isError) return;
    
    setStatus('Mencari wajah Anda...');
    
    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    const interval = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || isSuccess || isError) {
        clearInterval(interval);
        return;
      }

      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.6 }))
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (detection && detection.detection.score > 0.6) {
        clearInterval(interval);
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
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', textAlign: 'center', fontFamily: "'Poppins', sans-serif" }}>
      <h2 style={{ color: '#2c3e50', marginBottom: '10px' }}>Face-ID Mobile</h2>
      <p style={{ color: '#7f8c8d', marginBottom: '20px', fontSize: '0.9rem' }}>Posisikan wajah Anda di dalam kamera.</p>
      
      <div style={{
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px', 
        background: isSuccess ? '#d4edda' : isError ? '#f8d7da' : '#e2e3e5',
        color: isSuccess ? '#155724' : isError ? '#721c24' : '#383d41',
        fontWeight: 'bold'
      }}>
        {status}
      </div>

      {!isSuccess && !isError && (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '12px', overflow: 'hidden', border: '3px solid #3498db' }}>
          <video 
            ref={videoRef} 
            onPlay={handleVideoPlay}
            autoPlay 
            muted 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
        </div>
      )}
    </div>
  );
}

export default MobileQrVerify;
