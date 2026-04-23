import React from 'react';

function Documentation() {
  return (
    <div style={{ maxWidth: '850px' }}>
      <div className="page-header">
        <h2>Buku Panduan Sistem</h2>
        <p>Dokumentasi Arsitektur Face-ID SSO & Peta Jalan Implementasi Produksi</p>
      </div>

      {/* 1. Arsitektur Sistem */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ color: 'var(--primary)', marginBottom: 'var(--space-md)', fontSize: '1.3rem' }}>
          🏛️ 1. Arsitektur Sistem (The 3 Pillars)
        </h3>
        <p style={{ marginBottom: 'var(--space-md)', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
          Face-ID adalah layanan <em>Identity Provider (IdP)</em> tersentralisasi berbasis biometrik wajah yang berdiri di atas 3 pilar utama:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          <li style={{ marginBottom: '10px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Face-ID Master (Backend - Laravel 12 & MySQL)</strong><br />
            Berfungsi sebagai "Otak Utama" dan brankas identitas. Menyimpan data pegawai beserta <strong>Vektor Wajah (Face Descriptor 128-dimensi)</strong>. Backend tidak menyimpan file foto demi efisiensi dan privasi, melainkan hanya angka matematis wajah.
          </li>
          <li style={{ marginBottom: '10px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Face-ID Dashboard (Frontend - React/Vite)</strong><br />
            Panel kontrol terpusat bagi Administrator. Digunakan khusus untuk <strong>Enrollment</strong> (pendaftaran wajah baru via kamera) dan memonitor <em>log</em> integrasi SSO secara <em>real-time</em>.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>API Gateway (SSO Consumer)</strong><br />
            Pintu akses lintas aplikasi. Menggunakan <em>endpoint</em> <code>POST /api/v1/auth/verify-face</code> yang "agnostik". API ini tidak peduli aplikasi apa yang memanggilnya, selama mereka memiliki <strong>API Key</strong> yang terdaftar di tabel <code>sso_apps</code>.
          </li>
        </ul>
      </div>

      {/* 2. Alur Kerja SSO */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ color: 'var(--info)', marginBottom: 'var(--space-md)', fontSize: '1.3rem' }}>
          🔄 2. Alur Kerja Integrasi SSO
        </h3>
        <p style={{ marginBottom: 'var(--space-md)', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
          Bagaimana cara aplikasi eksternal (misal: Aplikasi Penggajian) melakukan login menggunakan Face-ID?
        </p>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
          <li style={{ marginBottom: '10px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Pendeteksian di Sisi Klien (Edge Computing):</strong><br />
            Saat pengguna membuka Aplikasi Penggajian, kamera menyala. <em>Library</em> AI (<code>face-api.js</code>) memproses gambar langsung di HP/Laptop pengguna dan mengekstrak matriks wajah (128 deret angka). <em>(Gambar/video asli tidak pernah dikirim lewat internet)</em>.
          </li>
          <li style={{ marginBottom: '10px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Pengiriman Payload API:</strong><br />
            Aplikasi Penggajian mengirim matriks angka tersebut beserta <code>API_KEY</code> ke Server Master Face-ID via request JSON.
          </li>
          <li style={{ marginBottom: '10px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Pencocokan Euclidean (Server-Side):</strong><br />
            Server Laravel menerima vektor tersebut, lalu menghitung jarak matematis (<em>Euclidean Distance</em>) dengan semua vektor yang ada di <em>database</em> menggunakan batas ambang (<em>threshold</em>) <strong>0.6</strong>.
          </li>
          <li style={{ marginBottom: '10px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Pemberian Identitas (The Handshake):</strong><br />
            Jika ditemukan kecocokan (misal jarak 0.40), Master Face-ID mengembalikan respon sukses berisi NIP, Nama, dan Access Token.
          </li>
          <li>
            <strong style={{ color: 'var(--text-primary)' }}>Otorisasi Lokal (RBAC):</strong><br />
            Aplikasi Penggajian menerima NIP tersebut dan memvalidasi ke dalam <em>database lokalnya sendiri</em>: <em>"Apakah NIP ini punya hak akses?"</em>. Jika ya, akses diberikan.
          </li>
        </ol>
      </div>

      {/* 3. Peta Jalan Produksi */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)', borderColor: 'rgba(253, 203, 110, 0.3)' }}>
        <h3 style={{ color: 'var(--warning)', marginBottom: 'var(--space-md)', fontSize: '1.3rem' }}>
          🚀 3. Panduan Implementasi Produksi
        </h3>
        <p style={{ marginBottom: 'var(--space-md)', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
          Jika sistem ini benar-benar akan diterjunkan ke lingkungan skala besar (seperti ribuan siswa/guru di lingkungan Al Azhar), berikut adalah Peta Jalan optimasi yang wajib diterapkan:
        </p>

        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>A. Migrasi ke Vector Database</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Jika data mencapai ribuan, memproses <em>looping</em> Euclidean secara manual di MySQL PHP akan lambat. Pindahkan data ke <strong>Vector Database</strong> khusus (seperti Pinecone, Milvus, atau ekstensi <code>pgvector</code> di PostgreSQL) untuk pencarian kecocokan jutaan dimensi dalam hitungan milidetik.
          </p>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>B. Active Liveness Detection</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Mencegah aksi <em>spoofing</em> (menggunakan pas foto di depan kamera). Sistem harus ditambahkan validasi tantangan acak di <em>frontend</em>, misalnya meminta pengguna tersenyum atau berkedip sebelum proses *scan* disetujui.
          </p>
        </div>

        <div style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>C. Pembatasan Domain (CORS) & Rate Limiting</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Kunci API rentan dicuri. Atur <code>allowed_origins</code> di Laravel khusus hanya untuk domain YPI Al Azhar. Tambahkan *Rate Limiter* (maks 5x percobaan salah per menit) di <code>SsoController</code> untuk mencegah serangan *Brute Force*.
          </p>
        </div>

        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>D. Kewajiban Protokol HTTPS</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
            Akses kamera di <em>browser</em> modern secara mutlak membutuhkan sambungan terenkripsi (SSL/HTTPS). Saat di-<em>deploy</em> ke VPS, wajib mendaftarkan sertifikat HTTPS (misal via Let's Encrypt atau Cloudflare).
          </p>
        </div>
      </div>

      {/* 4. Privasi */}
      <div className="card" style={{ background: 'rgba(0, 212, 170, 0.05)', borderColor: 'rgba(0, 212, 170, 0.2)' }}>
        <h3 style={{ color: 'var(--success)', marginBottom: 'var(--space-sm)', fontSize: '1.3rem' }}>
          🛡️ 4. Privasi dan Keamanan Data
        </h3>
        <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
          Pendekatan Face-ID (menyimpan vektor AI alih-alih gambar JPG/PNG) membuat sistem ini sangat amat patuh terhadap perlindungan data privasi. Jika database diretas, peretas hanya akan mendapatkan deretan angka acak (misal: <code>[0.123, -0.054, ...]</code>) yang <strong>tidak dapat dikonversi balik menjadi wajah manusia</strong>. Ini membebaskan instansi dari risiko penyimpanan foto berkapasitas besar sekaligus meminimalisir dampak insiden kebocoran data.
        </p>
      </div>

    </div>
  );
}

export default Documentation;
