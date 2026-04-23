import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

/**
 * Load face-api.js models from /models directory.
 * Models: SSD MobileNet V1, Face Landmark 68, Face Recognition
 */
export async function loadModels() {
  if (modelsLoaded) return true;

  const MODEL_URL = '/models';

  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    console.log('✅ Face-API models loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to load Face-API models:', error);
    return false;
  }
}

/**
 * Check if models are loaded.
 */
export function areModelsLoaded() {
  return modelsLoaded;
}

/**
 * Detect a single face and extract its 128-d descriptor.
 * 
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input
 * @returns {Promise<{detection: object, descriptor: Float32Array, landmarks: object}|null>}
 */
export async function detectAndDescribe(input) {
  if (!modelsLoaded) {
    console.warn('Models not loaded yet');
    return null;
  }

  const result = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result) return null;

  return {
    detection: result.detection,
    descriptor: Array.from(result.descriptor), // Convert Float32Array to regular array
    landmarks: result.landmarks,
    box: result.detection.box,
    score: result.detection.score,
  };
}

/**
 * Detect all faces in an input.
 * 
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} input
 * @returns {Promise<Array>}
 */
export async function detectAllFaces(input) {
  if (!modelsLoaded) return [];

  const results = await faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return results.map(r => ({
    detection: r.detection,
    descriptor: Array.from(r.descriptor),
    landmarks: r.landmarks,
    box: r.detection.box,
    score: r.detection.score,
  }));
}

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
