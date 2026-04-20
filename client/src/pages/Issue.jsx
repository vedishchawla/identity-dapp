import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { toast } from 'react-hot-toast'

export default function Issue({ contracts, account, isConnected }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [isIssuer, setIsIssuer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [issuers, setIssuers] = useState([])

  // Admin form
  const [issuerAddr, setIssuerAddr] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState('Government')

  // Issuer form
  const [holderAddr, setHolderAddr] = useState('')
  const [credType, setCredType] = useState('DriversLicense')
  const [credData, setCredData] = useState('')
  const [expDays, setExpDays] = useState('365')

  useEffect(() => {
    if (isConnected && contracts.issuer) loadRoles()
  }, [isConnected, account, contracts])

  const loadRoles = async () => {
    try {
      const admin = await contracts.issuer.admin()
      setIsAdmin(admin.toLowerCase() === account.toLowerCase())
      const issuerCheck = await contracts.issuer.isActiveIssuer(account)
      setIsIssuer(issuerCheck)

      // Load issuers list
      const addrs = await contracts.issuer.getAllIssuers()
      const list = []
      for (const addr of addrs) {
        const info = await contracts.issuer.getIssuer(addr)
        list.push({ address: addr, orgName: info.orgName, orgType: info.orgType, isActive: info.isActive })
      }
      setIssuers(list)
    } catch (err) { console.error(err) }
  }

  // ── Admin: Add Issuer ──
  const handleAddIssuer = async (e) => {
    e.preventDefault()
    if (!ethers.isAddress(issuerAddr)) return toast.error('Invalid address')
    if (!orgName.trim()) return toast.error('Enter org name')

    setLoading(true)
    try {
      toast.loading('Adding issuer...', { id: 'add' })
      const tx = await contracts.issuer.addIssuer(issuerAddr, orgName, orgType)
      await tx.wait()
      toast.success(`${orgName} added as issuer!`, { id: 'add' })
      setIssuerAddr(''); setOrgName('')
      loadRoles()
    } catch (err) {
      toast.error(err.reason || 'Failed to add issuer', { id: 'add' })
    }
    setLoading(false)
  }

  // ── Admin: Revoke Issuer ──
  const handleRevokeIssuer = async (addr) => {
    try {
      toast.loading('Revoking issuer...', { id: 'revi' })
      const tx = await contracts.issuer.revokeIssuer(addr)
      await tx.wait()
      toast.success('Issuer revoked', { id: 'revi' })
      loadRoles()
    } catch (err) {
      toast.error(err.reason || 'Failed', { id: 'revi' })
    }
  }

  // ── Issuer: Issue Credential ──
  const handleIssueCredential = async (e) => {
    e.preventDefault()
    if (!ethers.isAddress(holderAddr)) return toast.error('Invalid holder address')
    if (!credData.trim()) return toast.error('Enter credential data')

    setLoading(true)
    try {
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(credData))
      const expiry = expDays === '0' ? 0 :
        Math.floor(Date.now() / 1000) + (parseInt(expDays) * 86400)

      toast.loading('Issuing credential...', { id: 'issue' })
      const tx = await contracts.credential.issueCredential(
        holderAddr, credType, dataHash, expiry
      )
      const receipt = await tx.wait()
      toast.success('Credential issued on-chain!', { id: 'issue' })
      setHolderAddr(''); setCredData('')
    } catch (err) {
      toast.error(err.reason || 'Issuance failed', { id: 'issue' })
    }
    setLoading(false)
  }

  if (!isConnected) {
    return (
      <div className="page"><div className="empty"><div className="empty-icon">🔗</div><p>Connect wallet to access issuer functions.</p></div></div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-badge">📋 Issue & Manage</div>
        <h2 className="page-title">Credential <span className="grad">Issuance</span></h2>
        <p className="page-desc">
          {isAdmin ? 'As admin, manage trusted issuers. ' : ''}
          {isIssuer ? 'As issuer, create verifiable credentials for holders.' : ''}
          {!isAdmin && !isIssuer ? 'Your account is not an admin or issuer.' : ''}
        </p>
      </div>

      {/* Role badges */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {isAdmin && <span className="badge badge-ok">👑 Admin</span>}
        {isIssuer && <span className="badge badge-info">🏛️ Issuer</span>}
        {!isAdmin && !isIssuer && <span className="badge badge-warn">⚠️ No special role</span>}
      </div>

      {/* Admin: Add Issuer */}
      {isAdmin && (
        <div className="card section">
          <div className="card-header">
            <h3>👑 Add Trusted Issuer</h3>
            <span className="badge badge-ok">Admin Only</span>
          </div>
          <div className="card-body">
            <form onSubmit={handleAddIssuer}>
              <div className="form-group">
                <label className="form-label">Issuer Wallet Address</label>
                <input className="form-input mono" placeholder="0x..." value={issuerAddr}
                  onChange={(e) => setIssuerAddr(e.target.value)} disabled={loading} />
                <div className="form-hint">Copy from Ganache — any account can be an issuer</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organization Name</label>
                  <input className="form-input" placeholder="e.g. Department of Motor Vehicles"
                    value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={loading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Organization Type</label>
                  <select className="form-input" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                    <option>Government</option>
                    <option>Education</option>
                    <option>Healthcare</option>
                    <option>Finance</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="btn-group">
                <button className="btn btn-primary" type="submit" disabled={loading}>
                  {loading ? <><span className="spin" /> Adding...</> : '🏛️ Add Issuer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issuer: Issue Credential */}
      {isIssuer && (
        <div className="card section">
          <div className="card-header">
            <h3>📋 Issue Credential</h3>
            <span className="badge badge-info">Issuer</span>
          </div>
          <div className="card-body">
            <form onSubmit={handleIssueCredential}>
              <div className="form-group">
                <label className="form-label">Holder Wallet Address</label>
                <input className="form-input mono" placeholder="0x..." value={holderAddr}
                  onChange={(e) => setHolderAddr(e.target.value)} disabled={loading} />
                <div className="form-hint">The holder must have a registered DID.</div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Credential Type</label>
                  <select className="form-input" value={credType} onChange={(e) => setCredType(e.target.value)}>
                    <option>DriversLicense</option>
                    <option>Degree</option>
                    <option>MedicalCert</option>
                    <option>Passport</option>
                    <option>ProofOfAge</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Validity (Days)</label>
                  <select className="form-input" value={expDays} onChange={(e) => setExpDays(e.target.value)}>
                    <option value="0">No Expiry</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="365">1 Year</option>
                    <option value="1825">5 Years</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Credential Data (Plaintext)</label>
                <input className="form-input" placeholder="e.g. License #DL-12345-CA, Class C"
                  value={credData} onChange={(e) => setCredData(e.target.value)} disabled={loading} />
                <div className="form-hint">⚠️ Only the keccak256 hash of this data is stored on-chain. Raw data stays off-chain.</div>
              </div>
              <div className="btn-group">
                <button className="btn btn-green" type="submit" disabled={loading}>
                  {loading ? <><span className="spin" /> Issuing...</> : '📋 Issue Credential'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Issuer List */}
      <div className="section">
        <div className="section-title">🏛️ Registered Issuers</div>
        {issuers.length === 0 ? (
          <div className="empty"><div className="empty-icon">🏛️</div><p>No issuers registered yet.</p></div>
        ) : (
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Address</th><th>Organization</th><th>Type</th><th>Status</th>{isAdmin && <th>Action</th>}</tr>
                  </thead>
                  <tbody>
                    {issuers.map((iss) => (
                      <tr key={iss.address}>
                        <td className="mono">{iss.address.slice(0, 10)}...{iss.address.slice(-6)}</td>
                        <td>{iss.orgName}</td>
                        <td>{iss.orgType}</td>
                        <td>
                          <span className={`badge ${iss.isActive ? 'badge-ok' : 'badge-err'}`}>
                            {iss.isActive ? 'Active' : 'Revoked'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td>
                            {iss.isActive && (
                              <button className="btn btn-red" style={{ padding: '4px 10px', fontSize: '0.68rem' }}
                                onClick={() => handleRevokeIssuer(iss.address)}>Revoke</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
