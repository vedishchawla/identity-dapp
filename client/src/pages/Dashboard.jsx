import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { toast } from 'react-hot-toast'

export default function Dashboard({ contracts, account, isConnected }) {
  const [identity, setIdentity] = useState(null)
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalDIDs: 0, totalCreds: 0, totalIssuers: 0 })

  useEffect(() => {
    if (isConnected && contracts.did) loadData()
  }, [isConnected, account, contracts])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load identity
      const isReg = await contracts.did.isRegistered(account)
      if (isReg) {
        const id = await contracts.did.getMyIdentity()
        setIdentity({
          did: id.did,
          name: id.name,
          publicKeyHash: id.publicKeyHash,
          isActive: id.isActive,
          createdAt: Number(id.createdAt),
          updatedAt: Number(id.updatedAt),
        })
      }

      // Load credentials
      const credIds = await contracts.credential.getHolderCredentials(account)
      const creds = []
      for (const id of credIds) {
        const c = await contracts.credential.getCredential(id)
        creds.push({
          id: Number(c.id),
          type: c.credentialType,
          dataHash: c.dataHash,
          issuer: c.issuer,
          issuedAt: Number(c.issuedAt),
          expiresAt: Number(c.expiresAt),
          isValid: c.isValid,
          isRevoked: c.isRevoked,
        })
      }
      setCredentials(creds)

      // Load stats
      const totalDIDs = Number(await contracts.did.getTotalIdentities())
      const totalCreds = Number(await contracts.credential.getTotalCredentials())
      const totalIssuers = Number(await contracts.issuer.getTotalIssuers())
      setStats({ totalDIDs, totalCreds, totalIssuers })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleRevoke = async (credId) => {
    try {
      const tx = await contracts.credential.revokeCredential(credId, "Revoked by holder")
      toast.loading('Revoking...', { id: 'revoke' })
      await tx.wait()
      toast.success('Credential revoked!', { id: 'revoke' })
      loadData()
    } catch (err) {
      toast.error(err.reason || 'Revocation failed', { id: 'revoke' })
    }
  }

  const handleDeactivate = async () => {
    try {
      const tx = await contracts.did.deactivateIdentity()
      toast.loading('Deactivating...', { id: 'deact' })
      await tx.wait()
      toast.success('Identity deactivated', { id: 'deact' })
      loadData()
    } catch (err) {
      toast.error(err.reason || 'Failed', { id: 'deact' })
    }
  }

  const handleReactivate = async () => {
    try {
      const tx = await contracts.did.reactivateIdentity()
      toast.loading('Reactivating...', { id: 'react' })
      await tx.wait()
      toast.success('Identity reactivated!', { id: 'react' })
      loadData()
    } catch (err) {
      toast.error(err.reason || 'Failed', { id: 'react' })
    }
  }

  if (!isConnected) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-icon">🔗</div>
          <p>Connect your MetaMask wallet to view your dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-badge">📊 Dashboard</div>
        <h2 className="page-title">Your <span className="grad">Identity</span></h2>
        <p className="page-desc">View and manage your decentralized identity and credentials.</p>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat" style={{ '--stat-color': 'var(--accent)' }}>
          <div className="stat-label">Total DIDs</div>
          <div className="stat-value">{stats.totalDIDs}</div>
          <div className="stat-sub">Registered on-chain</div>
        </div>
        <div className="stat" style={{ '--stat-color': 'var(--cyan)' }}>
          <div className="stat-label">Credentials</div>
          <div className="stat-value" style={{ color: 'var(--cyan)' }}>{stats.totalCreds}</div>
          <div className="stat-sub">Issued network-wide</div>
        </div>
        <div className="stat" style={{ '--stat-color': 'var(--green)' }}>
          <div className="stat-label">Issuers</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.totalIssuers}</div>
          <div className="stat-sub">Trusted organizations</div>
        </div>
        <div className="stat" style={{ '--stat-color': 'var(--pink)' }}>
          <div className="stat-label">My Credentials</div>
          <div className="stat-value" style={{ color: 'var(--pink)' }}>{credentials.length}</div>
          <div className="stat-sub">Held by you</div>
        </div>
      </div>

      {/* Identity Info */}
      {identity ? (
        <div className="card section">
          <div className="card-header">
            <h3>🆔 My Identity</h3>
            <span className={`badge ${identity.isActive ? 'badge-ok' : 'badge-err'}`}>
              {identity.isActive ? '✓ Active' : '✗ Deactivated'}
            </span>
          </div>
          <div className="card-body">
            <div className="data-grid">
              <div className="data-item">
                <div className="data-label">DID</div>
                <div className="data-value">{identity.did}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Name</div>
                <div className="data-value green">{identity.name}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Public Key Hash</div>
                <div className="data-value">{identity.publicKeyHash}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Registered</div>
                <div className="data-value green">{new Date(identity.createdAt * 1000).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="btn-group">
              {identity.isActive ? (
                <button className="btn btn-red" onClick={handleDeactivate}>🚫 Deactivate Identity</button>
              ) : (
                <button className="btn btn-green" onClick={handleReactivate}>✅ Reactivate Identity</button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-warn section">
          ⚠️ No identity registered. Go to the Register page to create your DID.
        </div>
      )}

      {/* Credentials */}
      <div className="section">
        <div className="section-title">📋 My Credentials</div>
        {credentials.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <p>No credentials yet. Ask a trusted issuer to issue one for you.</p>
          </div>
        ) : (
          <div className="cred-list">
            {credentials.map((c) => (
              <div className="cred-card" key={c.id}>
                <div className="cred-icon">
                  {c.type === 'DriversLicense' ? '🚗' :
                   c.type === 'Degree' ? '🎓' :
                   c.type === 'MedicalCert' ? '🏥' : '📄'}
                </div>
                <div className="cred-info">
                  <div className="cred-type">{c.type}</div>
                  <div className="cred-meta">
                    ID: #{c.id} · Issued: {new Date(c.issuedAt * 1000).toLocaleDateString()}
                    {c.expiresAt > 0 && ` · Expires: ${new Date(c.expiresAt * 1000).toLocaleDateString()}`}
                  </div>
                </div>
                <span className={`badge ${c.isRevoked ? 'badge-err' : c.isValid ? 'badge-ok' : 'badge-warn'}`}>
                  {c.isRevoked ? 'Revoked' : c.isValid ? 'Valid' : 'Expired'}
                </span>
                <div className="cred-actions">
                  {!c.isRevoked && (
                    <button className="btn btn-red" style={{ padding: '6px 12px', fontSize: '0.72rem' }}
                      onClick={() => handleRevoke(c.id)}>
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
