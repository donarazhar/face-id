import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelsLoadedPrecise = false;

// ============================================================================
// MODEL LOADING
// ============================================================================

/**
 * Load FAST detection models (TinyFaceDetector + Tiny Landmarks + Recognition).
 * Total size: ~277KB vs ~12MB for full models. Loads 30x faster.
 * Best for: Terminal absensi, SSO login, real-time scanning.
 */
export async function loadModels() {
  if (modelsLoaded) return true;

  const MODEL_URL = '/models';

  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('⚡ Fast Face-API models loaded (TinyFaceDetector)');
    return true;
  } catch (error) {
    console.error('❌ Failed to load Face-API models:', error);
    return false;
  }
}

/**
 * Load PRECISE detection models (SSD MobileNet V1 + Full Landmarks + Recognition).
 * Heavier but more accurate — used for face enrollment only.
 */
export async function loadPreciseModels() {
  if (modelsLoadedPrecise) return true;

  // Ensure fast models are also loaded (for recognition net)
  if (!modelsLoaded) await loadModels();

  const MODEL_URL = '/models';

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);
    modelsLoadedPrecise = true;
    console.log('🔬 Precise Face-API models loaded (SSD MobileNet V1)');
    return true;
  } catch (error) {
    console.error('❌ Failed to load precise models:', error);
    return false;
  }
}

/**
 * Check if fast models are loaded.
 */
export function areModelsLoaded() {
  return modelsLoaded;
}

/**
 * Check if precise (enrollment) models are loaded.
 */
export function arePreciseModelsLoaded() {
  return modelsLoadedPrecise;
}

// ============================================================================
// FACE DETECTION
// ============================================================================

/**
 * FAST detection — uses TinyFaceDetector for real-time scanning.
 * ~3-5x faster than SSD MobileNet. Ideal for attendance terminal & SSO.
 * 
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input
 * @returns {Promise<{detection, descriptor, landmarks, box, score}|null>}
 */
export async function detectAndDescribe(input) {
  if (!modelsLoaded) {
    console.warn('Models not loaded yet');
    return null;
  }

  try {
    const result = await faceapi
      .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,       // Smaller = faster (options: 128, 160, 224, 320, 416, 512, 608)
        scoreThreshold: 0.6,  // Higher threshold = fewer false positives
      }))
      .withFaceLandmarks(true) // true = use tiny landmarks (faster)
      .withFaceDescriptor();

    if (!result) return null;

    return {
      detection: result.detection,
      descriptor: Array.from(result.descriptor),
      landmarks: result.landmarks,
      box: result.detection.box,
      score: result.detection.score,
    };
  } catch (err) {
    // Silently handle detection errors (e.g., video not ready)
    return null;
  }
}

/**
 * PRECISE detection — uses SSD MobileNet V1 + full landmarks.
 * More accurate descriptor extraction. Use ONLY for face enrollment.
 * 
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input
 * @returns {Promise<{detection, descriptor, landmarks, box, score}|null>}
 */
export async function detectPrecise(input) {
  if (!modelsLoadedPrecise) {
    console.warn('Precise models not loaded yet');
    return null;
  }

  try {
    const result = await faceapi
      .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({
        minConfidence: 0.5,
      }))
      .withFaceLandmarks(false) // false = use full 68-point landmarks
      .withFaceDescriptor();

    if (!result) return null;

    return {
      detection: result.detection,
      descriptor: Array.from(result.descriptor),
      landmarks: result.landmarks,
      box: result.detection.box,
      score: result.detection.score,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Detect all faces in an input (fast mode).
 * 
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input
 * @returns {Promise<Array>}
 */
export async function detectAllFaces(input) {
  if (!modelsLoaded) return [];

  try {
    const results = await faceapi
      .detectAllFaces(input, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.6,
      }))
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    return results.map(r => ({
      detection: r.detection,
      descriptor: Array.from(r.descriptor),
      landmarks: r.landmarks,
      box: r.detection.box,
      score: r.detection.score,
    }));
  } catch (err) {
    return [];
  }
}

// ============================================================================
// FACE QUALITY VALIDATION
// ============================================================================

/**
 * Validate face quality before enrollment.
 * Checks: detection confidence, face size, face position.
 * 
 * @param {object} detection - Detection result
 * @param {HTMLVideoElement} video - Source video element
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateFaceQuality(detection, video) {
  const issues = [];

  if (!detection) {
    return { valid: false, issues: ['Tidak ada wajah terdeteksi'] };
  }

  // 1. Detection confidence must be high
  if (detection.score < 0.85) {
    issues.push(`Kualitas deteksi rendah (${Math.round(detection.score * 100)}%). Perbaiki pencahayaan.`);
  }

  // 2. Face must be large enough in frame
  const box = detection.box;
  const videoWidth = video.videoWidth || 640;
  const videoHeight = video.videoHeight || 480;
  const faceArea = (box.width * box.height) / (videoWidth * videoHeight);

  if (faceArea < 0.04) {
    issues.push('Wajah terlalu jauh. Dekatkan ke kamera.');
  }

  if (faceArea > 0.6) {
    issues.push('Wajah terlalu dekat. Mundur sedikit.');
  }

  // 3. Face should be reasonably centered
  const centerX = (box.x + box.width / 2) / videoWidth;
  const centerY = (box.y + box.height / 2) / videoHeight;

  if (centerX < 0.2 || centerX > 0.8 || centerY < 0.15 || centerY > 0.85) {
    issues.push('Posisikan wajah di tengah kamera.');
  }

  return { valid: issues.length === 0, issues };
}

// ============================================================================
// DRAWING & CAPTURE UTILITIES
// ============================================================================

/**
 * Draw face detection bounding box and landmarks on canvas.
 * 
 * @param {HTMLCanvasElement} canvas
 * @param {object} detection - Detection result from detectAndDescribe
 * @param {object} displaySize - { width, height }
 * @param {string} label - Optional label text
 * @param {string} color - Box color
 */
export function drawDetection(canvas, detection, displaySize, label = '', color = '#00ff88') {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!detection) return;

  const box = detection.box;

  // Scale box to match display size
  const scaleX = canvas.width / displaySize.width;
  const scaleY = canvas.height / displaySize.height;

  const x = box.x * scaleX;
  const y = box.y * scaleY;
  const w = box.width * scaleX;
  const h = box.height * scaleY;

  // Draw bounding box
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeRect(x, y, w, h);
  ctx.shadowBlur = 0;

  // Corner accents
  const cornerSize = 15;
  ctx.lineWidth = 4;
  // Top-left
  ctx.beginPath(); ctx.moveTo(x, y + cornerSize); ctx.lineTo(x, y); ctx.lineTo(x + cornerSize, y); ctx.stroke();
  // Top-right
  ctx.beginPath(); ctx.moveTo(x + w - cornerSize, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerSize); ctx.stroke();
  // Bottom-left
  ctx.beginPath(); ctx.moveTo(x, y + h - cornerSize); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerSize, y + h); ctx.stroke();
  // Bottom-right
  ctx.beginPath(); ctx.moveTo(x + w - cornerSize, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerSize); ctx.stroke();

  // Draw label
  if (label) {
    ctx.font = 'bold 14px Inter, sans-serif';
    const textWidth = ctx.measureText(label).width;
    const padding = 8;

    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, y - 28, textWidth + padding * 2, 24);
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#000';
    ctx.fillText(label, x + padding, y - 10);
  }

  // Draw confidence score
  const confidence = Math.round(detection.score * 100);
  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(`${confidence}%`, x + w + 5, y + 15);
}

/**
 * Capture a thumbnail from video element.
 * 
 * @param {HTMLVideoElement} video
 * @param {number} maxWidth
 * @returns {string} Base64 encoded thumbnail
 */
export function captureThumb(video, maxWidth = 150) {
  const canvas = document.createElement('canvas');
  const scale = maxWidth / video.videoWidth;
  canvas.width = maxWidth;
  canvas.height = video.videoHeight * scale;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.7);
}

export { faceapi };
