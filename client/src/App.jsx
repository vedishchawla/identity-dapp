import { useState, useCallback } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'react-hot-toast'
import { useContract } from './hooks/useContract'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import Issue from './pages/Issue'
import Verify from './pages/Verify'

export default function App() {
  const { account, contracts, isConnected, connect, error } = useContract()
  const navigate = useNavigate()

  const handleConnect = async () => {
    try {
      await connect()
      toast.success('Wallet connected!')
    } catch (err) {
      toast.error(err.message || 'Failed to connect')
    }
  }

  const shortenAddr = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : ''

  return (
    <>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="app">
        {/* Navbar */}
        <nav className="navbar">
          <NavLink to="/" className="nav-logo">
            <span className="nav-logo-icon">🔐</span>
            <span>UcIDM</span>
          </NavLink>

          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Home
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Dashboard
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Register
            </NavLink>
            <NavLink to="/issue" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Issue
            </NavLink>
            <NavLink to="/verify" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Verify
            </NavLink>
          </div>

          <div className="nav-right">
            {isConnected && (
              <div className="nav-chain">
                <span className="chain-dot" />
                Ganache · 1337
              </div>
            )}
            <button
              className={`btn-connect ${isConnected ? 'connected' : ''}`}
              onClick={handleConnect}
            >
              {isConnected ? `🟢 ${shortenAddr(account)}` : '🔗 Connect Wallet'}
            </button>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home isConnected={isConnected} onConnect={handleConnect} />} />
          <Route path="/dashboard" element={
            <Dashboard contracts={contracts} account={account} isConnected={isConnected} />
          } />
          <Route path="/register" element={
            <Register contracts={contracts} account={account} isConnected={isConnected} />
          } />
          <Route path="/issue" element={
            <Issue contracts={contracts} account={account} isConnected={isConnected} />
          } />
          <Route path="/verify" element={
            <Verify contracts={contracts} account={account} isConnected={isConnected} />
          } />
        </Routes>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0c0c1e',
            color: '#eeeef4',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            fontSize: '0.82rem',
          },
        }}
      />
    </>
  )
}

// ─── Home Page ───
function Home({ isConnected, onConnect }) {
  const navigate = useNavigate()

  return (
    <>
      <div className="hero">
        <div className="hero-eyebrow">⛓️ Blockchain Identity System</div>
        <h1>
          <span className="grad">Decentralized</span><br />
          Identity Management
        </h1>
        <p>
          A privacy-preserving, user-centric identity system on Ethereum.
          Register your DID, get verifiable credentials issued by trusted
          organizations, and prove your identity without revealing personal data.
        </p>
        <div className="hero-actions">
          {isConnected ? (
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              📊 Go to Dashboard
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onConnect}>
              🔗 Connect MetaMask
            </button>
          )}
          <button className="btn btn-outline" onClick={() => navigate('/register')}>
            🆔 Register Identity
          </button>
        </div>
      </div>

      <div className="features">
        <div className="feature">
          <div className="feature-icon">🆔</div>
          <h3>Decentralized Identity</h3>
          <p>Create a DID tied to your Ethereum address. Your identity, your control. No central authority.</p>
        </div>
        <div className="feature">
          <div className="feature-icon">📋</div>
          <h3>Verifiable Credentials</h3>
          <p>Trusted issuers (DMV, Universities) issue credentials. Only hashes stored on-chain for privacy.</p>
        </div>
        <div className="feature">
          <div className="feature-icon">🔍</div>
          <h3>Privacy-Preserving Verification</h3>
          <p>Verifiers check credential validity on-chain without accessing your raw personal data.</p>
        </div>
        <div className="feature">
          <div className="feature-icon">🏛️</div>
          <h3>Trusted Issuers</h3>
          <p>Admin registers trusted organizations. Only active issuers can create valid credentials.</p>
        </div>
        <div className="feature">
          <div className="feature-icon">🚫</div>
          <h3>Credential Revocation</h3>
          <p>Issuers or holders can revoke credentials. Verification instantly reflects the change.</p>
        </div>
        <div className="feature">
          <div className="feature-icon">⛓️</div>
          <h3>Immutable Audit Trail</h3>
          <p>Every action emits events — full transparency and accountability on the blockchain.</p>
        </div>
      </div>
    </>
  )
}
