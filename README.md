<div align="center">
  <h1>🪪 Face-ID: Biometric Single Sign-On</h1>
  <p><b>Face-as-a-Service (FaaS) Identity Provider untuk Ekosistem YPI Al Azhar</b></p>
</div>

---

## 📖 Deskripsi Proyek
**Face-ID** adalah sistem *Identity Provider* tersentralisasi berbasis kecerdasan buatan (pengenalan wajah). Sistem ini memungkinkan seluruh aplikasi di dalam ekosistem (misalnya: Portal Berita, HRIS Payroll, E-Learning) untuk memverifikasi pengguna secara instan hanya dengan memindai wajah mereka.

Dengan konsep **SSO (Single Sign-On)**, pegawai tidak perlu lagi mengingat *password* yang berbeda-beda untuk tiap aplikasi, dan administrator memiliki *Audit Trail* terpusat untuk memantau semua akses log lintas aplikasi.

## 🏗️ Arsitektur Tiga Pilar
Sistem ini memisahkan peran untuk mencapai skalabilitas dan keamanan maksimum:
1. **Master Backend (Laravel 12):** Brankas identitas. Menyimpan vektor wajah (*Face Descriptors*) dalam MySQL dan mengeksekusi algoritma *Euclidean Distance* untuk validasi keamanan. **Tidak menyimpan foto/video** demi efisiensi dan kepatuhan privasi data.
2. **Master Dashboard (React/Vite):** Panel kendali Superadmin. Tempat mendaftarkan wajah pegawai baru (*Enrollment*) dan memonitor aktivitas SSO (*Audit Trail*).
3. **Klien Eksternal (SSO Consumers):** Aplikasi-aplikasi mandiri yang tidak memiliki *database* wajah. Mereka mengeksekusi AI di sisi pengguna (*Edge Computing* via browser) dan mengirim kode matriks ke Master Backend untuk verifikasi identitas.

## 🛠️ Tech Stack
- **Backend:** Laravel 12 (PHP 8.2), MySQL
- **Frontend Master:** React.js, Vite, Vanilla CSS (Premium Glassmorphism)
- **AI Engine:** `face-api.js` (TensorFlow.js / WebGL)
- **Authentication:** Laravel Sanctum & API Keys

---

## 🚀 Cara Menjalankan Sistem Lokal

### 1. Menjalankan Backend (Server Face-ID)
Buka terminal dan arahkan ke folder `backend`:
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```
*(Perintah `--seed` sangat penting untuk memasukkan data pegawai dummy dan mendaftarkan **API Key** aplikasi klien SSO ke dalam database).*

### 2. Menjalankan Frontend (Dashboard & Klien Demo)
Buka terminal baru dan arahkan ke folder `frontend`:
```bash
cd frontend
npm install
npm run dev
```

### 3. Mengakses Aplikasi
- **Dashboard Utama (Face-ID Master):** Buka `http://localhost:5173/` 
  - *Login Manual Superadmin:* `admin` / `admin123`
- **Simulasi Klien SSO:** Buka menu **Klien Demo SSO** dari *sidebar* kiri dashboard untuk mencoba *login* ke aplikasi Portal Berita dan Payroll.

---

## 🔌 Cara Menerapkan (Integrasi) Klien Baru

Bagaimana jika Anda memiliki aplikasi baru (misal: "E-Learning Al-Azhar") dan ingin menggunakan Face-ID untuk login?

### Tahap 1: Pendaftaran Klien di Master
1. Admin Master Face-ID harus memasukkan Aplikasi E-Learning ke dalam tabel `sso_apps` di *database*.
2. Sistem akan menghasilkan **API Key** (misal: `APP-LEARN-003`).

### Tahap 2: Eksekusi AI di Klien
Pada halaman login Aplikasi E-Learning, jalankan skrip kamera dan `face-api.js`. Sistem mengekstrak wajah pengguna menjadi `descriptor` (array 128 dimensi). 

### Tahap 3: Menembak API Gateway
Aplikasi E-Learning mengirim request ke Backend Face-ID:
```http
POST http://localhost:8000/api/v1/auth/verify-face
Content-Type: application/json

{
    "app_id": "APP-LEARN-003",
    "face_descriptor": [-0.032, 0.124, 0.005, ... <128 data>]
}
```

### Tahap 4: Penerimaan Hak Akses (RBAC)
Jika wajah dikenali, Face-ID akan menjawab:
```json
{
  "status": "success",
  "data": {
    "employee_id": "AZ-001",
    "name": "Ahmad Fauzi",
    "access_token": "eyJhb..."
  }
}
```
Aplikasi E-Learning kemudian mencocokkan `employee_id` tersebut ke dalam *database* mereka sendiri untuk menentukan apakah Bpk. Ahmad Fauzi ini adalah seorang Guru, Siswa, atau Admin di portal E-Learning tersebut.

---

## 🛡️ Panduan Produksi (Deployment)
Jika sistem ini dibawa ke ranah Publik / Skala Besar:
1. **Wajib HTTPS:** Browser modern (Chrome/Safari) akan **memblokir akses kamera** jika aplikasi klien tidak menggunakan SSL (HTTPS).
2. **Liveness Detection:** Untuk mencegah kecurangan menggunakan *print* foto di depan kamera, integrasikan deteksi senyum atau kedipan (*Blink Detection*) di sisi frontend klien.
3. **Migrasi Vector Database:** Jika data menyentuh di atas 10.000 wajah, pindahkan `face_descriptor` dari MySQL biasa ke *Vector Database* (seperti Pinecone/Qdrant) untuk kecepatan *matching* 1 milidetik.

---
*Created dynamically for YPI Al Azhar Biometric SSO Initiatives.*
