import React from 'react';
import { HiOutlineExternalLink, HiOutlineDesktopComputer, HiOutlineCash } from 'react-icons/hi';

function ClientDemo() {
  const apps = [
    {
      id: 'portal',
      name: 'Portal Berita Internal',
      description: 'Aplikasi portal berita yang menggunakan akses Admin Face-ID untuk Redaktur.',
      icon: <HiOutlineDesktopComputer style={{ fontSize: '2rem', color: '#3498db' }} />,
      url: '/client-demo/index.html',
      color: '#3498db',
      badge: 'APP-PORTAL-001'
    },
    {
      id: 'payroll',
      name: 'Aplikasi Penggajian',
      description: 'Sistem HR & Penggajian yang menggunakan Face-ID untuk validasi Slip Gaji rahasia.',
      icon: <HiOutlineCash style={{ fontSize: '2rem', color: '#2ecc71' }} />,
      url: '/client-demo/payroll.html',
      color: '#2ecc71',
      badge: 'APP-PAYROLL-002'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Simulasi Klien SSO</h2>
        <p>Uji coba sistem Single Sign-On (Face-as-a-Service) ke berbagai aplikasi eksternal</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
        {apps.map(app => (
          <div key={app.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
              <div style={{ padding: '15px', background: `${app.color}20`, borderRadius: '12px' }}>
                {app.icon}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{app.name}</h3>
                <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', marginTop: '5px' }}>
                  {app.badge}
                </span>
              </div>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1, marginBottom: '20px' }}>
              {app.description}
            </p>
            
            <a 
              href={app.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn" 
              style={{ background: app.color, color: 'white', width: '100%', textDecoration: 'none' }}
            >
              Buka Aplikasi Demo <HiOutlineExternalLink style={{ marginLeft: '5px' }} />
            </a>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 'var(--space-xl)', background: 'rgba(52, 152, 219, 0.1)', borderColor: 'rgba(52, 152, 219, 0.3)' }}>
        <h3 style={{ color: '#3498db', marginBottom: '10px' }}>ℹ️ Cara Kerja SSO (Single Sign-On)</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
          Masing-masing aplikasi klien di atas adalah aplikasi mandiri (seolah-olah berada di server berbeda). 
          Mereka tidak memiliki database wajah sendiri. Ketika user ingin masuk, klien tersebut menembak API <code>POST /api/v1/auth/verify-face</code> ke Face-ID Master ini beserta <strong>API Key</strong> mereka. 
          Jika wajah valid, Master akan mengirimkan token akses rahasia.
        </p>
      </div>
    </div>
  );
}

export default ClientDemo;
