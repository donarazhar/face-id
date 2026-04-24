import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import PresenceTerminal from './pages/PresenceTerminal';
import Reports from './pages/Reports';
import ClientDemo from './pages/ClientDemo';
import Documentation from './pages/Documentation';
import BranchPanel from './pages/BranchPanel';
import PositionPanel from './pages/PositionPanel';
import Toast from './components/ui/Toast';
import { HiOutlineTemplate, HiOutlineUsers, HiOutlineCamera, HiOutlineDocumentReport, HiOutlineLogout, HiOutlineDesktopComputer, HiOutlineBookOpen, HiOutlineOfficeBuilding } from 'react-icons/hi';

function AppContent() {
  const location = useLocation();
  const [toast, setToast] = useState(null);
  
  // Menu states
  const [isDataMasterOpen, setIsDataMasterOpen] = useState(
    location.pathname === '/branches' || location.pathname === '/positions'
  );
  
  // State Autentikasi Admin Master
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem('face_id_master_auth') === 'true');

  const addToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3000);
  };

  // Handler Login Manual Master Face-ID
  const handleLogin = (e) => {
    e.preventDefault();
    const user = e.target.username.value;
    const pass = e.target.password.value;
    
    // Hardcoded demo credentials
    if (user === 'admin' && pass === 'admin123') {
      localStorage.setItem('face_id_master_auth', 'true');
      setIsAuthenticated(true);
      addToast('Login berhasil!');
    } else {
      addToast('Username atau password salah', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('face_id_master_auth');
    setIsAuthenticated(false);
  };

  // Tampilan Halaman Login Master
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-xl)', textAlign: 'center' }}>
          <div className="sidebar-brand" style={{ justifyContent: 'center', marginBottom: 'var(--space-xl)' }}>
            <div className="brand-icon">🪪</div>
            <div style={{ textAlign: 'left' }}>
              <h1>Face-ID</h1>
              <div className="brand-subtitle">Face-as-a-Service</div>
            </div>
          </div>
          
          <h2 style={{ marginBottom: 'var(--space-lg)', fontSize: '1.2rem', color: 'var(--text-main)' }}>Login Master Admin</h2>
          
          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input type="text" name="username" className="form-input" required placeholder="Gunakan: admin" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" name="password" className="form-input" required placeholder="Gunakan: admin123" />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-md)' }}>
              Masuk ke Sistem
            </button>
          </form>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // Tampilan Dashboard Utama
  return (
    <div className="layout" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🪪</div>
          <div>
            <h1>Face-ID</h1>
            <div className="brand-subtitle">Face-as-a-Service</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            <HiOutlineTemplate className="nav-icon" /> Dashboard
          </Link>
          <Link to="/employees" className={`nav-link ${location.pathname === '/employees' ? 'active' : ''}`}>
            <HiOutlineUsers className="nav-icon" /> Kelola Pegawai
          </Link>
          <div>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); setIsDataMasterOpen(!isDataMasterOpen); }} 
              className={`nav-link ${(location.pathname === '/branches' || location.pathname === '/positions') ? 'active' : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <HiOutlineTemplate className="nav-icon" /> Data Master
              </div>
              <span style={{ fontSize: '0.8rem', transition: 'transform 0.2s', transform: isDataMasterOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
            </a>
            
            {isDataMasterOpen && (
              <div style={{ marginLeft: '1.5rem', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <Link to="/branches" className={`nav-link ${location.pathname === '/branches' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  🏢 Cabang Al Azhar
                </Link>
                <Link to="/positions" className={`nav-link ${location.pathname === '/positions' ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                  💼 Jabatan
                </Link>
              </div>
            )}
          </div>
          <Link to="/terminal" className={`nav-link ${location.pathname === '/terminal' ? 'active' : ''}`}>
            <HiOutlineCamera className="nav-icon" /> Terminal Absensi
          </Link>
          <Link to="/reports" className={`nav-link ${location.pathname === '/reports' ? 'active' : ''}`}>
            <HiOutlineDocumentReport className="nav-icon" /> Log SSO & Audit Trail
          </Link>
          <Link to="/clients" className={`nav-link ${location.pathname === '/clients' ? 'active' : ''}`}>
            <HiOutlineDesktopComputer className="nav-icon" /> Klien Demo SSO
          </Link>
          <Link to="/docs" className={`nav-link ${location.pathname === '/docs' ? 'active' : ''}`}>
            <HiOutlineBookOpen className="nav-icon" /> Dokumentasi API
          </Link>
          
          <div style={{ marginTop: 'auto' }}></div>
          <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="nav-link" style={{ marginTop: 'var(--space-xl)', color: 'var(--danger)' }}>
            <HiOutlineLogout className="nav-icon" /> Logout Master
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-wrapper">
          <Routes>
            <Route path="/" element={<Dashboard addToast={addToast} />} />
            <Route path="/employees" element={<AdminPanel addToast={addToast} />} />
            <Route path="/branches" element={<BranchPanel addToast={addToast} />} />
            <Route path="/positions" element={<PositionPanel addToast={addToast} />} />
            <Route path="/terminal" element={<PresenceTerminal addToast={addToast} />} />
            <Route path="/reports" element={<Reports addToast={addToast} />} />
            <Route path="/clients" element={<ClientDemo />} />
            <Route path="/docs" element={<Documentation />} />
          </Routes>
        </div>
      </main>

      {/* Global Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
