import { useState } from 'react'
import { ethers } from 'ethers'
import { toast } from 'react-hot-toast'

export default function Verify({ contracts, account, isConnected }) {
  const [credId, setCredId] = useState('')
  const [credData, setCredData] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [credInfo, setCredInfo] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    if (!credId || !credData.trim()) return toast.error('Fill all fields')

    setLoading(true)
    setResult(null)
    try {
      const dataHash = ethers.keccak256(ethers.toUtf8Bytes(credData))

      // First load credential info
      const cred = await contracts.credential.getCredential(credId)
      setCredInfo({
        id: Number(cred.id),
        type: cred.credentialType,
        issuer: cred.issuer,
        holder: cred.holder,
        dataHash: cred.dataHash,
        issuedAt: Number(cred.issuedAt),
        expiresAt: Number(cred.expiresAt),
        isRevoked: cred.isRevoked,
      })

      // Call verify (this is a transaction because it emits events + updates state)
      toast.loading('Verifying on-chain...', { id: 'verify' })
      const tx = await contracts.credential.verifyCredential(credId, dataHash)
      const receipt = await tx.wait()

      // Parse the CredentialVerified event
      const event = receipt.logs.find(log => {
        try {
          return contracts.credential.interface.parseLog(log)?.name === 'CredentialVerified'
        } catch { return false }
      })

      if (event) {
        const parsed = contracts.credential.interface.parseLog(event)
        const valid = parsed.args.isValid

        // Also check the view function for the reason
        const viewValid = await contracts.credential.isCredentialValid(credId)

        setResult({
          valid: valid && dataHash === cred.dataHash,
          dataMatch: dataHash === cred.dataHash,
          hashProvided: dataHash,
          hashOnChain: cred.dataHash,
        })

        if (valid && dataHash === cred.dataHash) {
          toast.success('✅ Credential is VALID!', { id: 'verify' })
        } else {
          toast.error('❌ Verification FAILED', { id: 'verify' })
        }
      }
    } catch (err) {
      console.error(err)
      toast.error(err.reason || 'Verification failed', { id: 'verify' })
    }
    setLoading(false)
  }

  // Quick lookup
  const handleLookup = async () => {
    if (!credId) return
    try {
      const cred = await contracts.credential.getCredential(credId)
      setCredInfo({
        id: Number(cred.id),
        type: cred.credentialType,
        issuer: cred.issuer,
        holder: cred.holder,
        dataHash: cred.dataHash,
        issuedAt: Number(cred.issuedAt),
        expiresAt: Number(cred.expiresAt),
        isRevoked: cred.isRevoked,
      })
      toast.success('Credential found!')
    } catch {
      toast.error('Credential not found')
    }
  }

  if (!isConnected) {
    return (
      <div className="page"><div className="empty"><div className="empty-icon">🔗</div><p>Connect wallet to verify credentials.</p></div></div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-badge">🔍 Verify</div>
        <h2 className="page-title">Credential <span className="grad">Verification</span></h2>
        <p className="page-desc">
          Verify a credential on-chain. Enter the credential ID and the original credential data.
          The blockchain checks if the data hash matches — without exposing the raw data to anyone.
        </p>
      </div>

      <div className="card section">
        <div className="card-header">
          <h3>🔍 Verify Credential</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleVerify}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Credential ID</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="form-input mono" type="number" placeholder="e.g. 1"
                    value={credId} onChange={(e) => setCredId(e.target.value)} disabled={loading} />
                  <button type="button" className="btn btn-outline" onClick={handleLookup}
                    style={{ flexShrink: 0 }}>🔎 Lookup</button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Credential Data (Original)</label>
                <input className="form-input" placeholder="e.g. License #DL-12345-CA, Class C"
                  value={credData} onChange={(e) => setCredData(e.target.value)} disabled={loading} />
                <div className="form-hint">Enter the exact data that was used during issuance.</div>
              </div>
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" type="submit" disabled={loading || !credId || !credData}>
                {loading ? <><span className="spin" /> Verifying...</> : '🔍 Verify On-Chain'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Credential Info */}
      {credInfo && (
        <div className="card section">
          <div className="card-header">
            <h3>📋 Credential #{credInfo.id}</h3>
            <span className={`badge ${credInfo.isRevoked ? 'badge-err' : 'badge-ok'}`}>
              {credInfo.isRevoked ? 'Revoked' : 'Active'}
            </span>
          </div>
          <div className="card-body">
            <div className="data-grid">
              <div className="data-item">
                <div className="data-label">Type</div>
                <div className="data-value green">{credInfo.type}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Holder</div>
                <div className="data-value">{credInfo.holder}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Issuer</div>
                <div className="data-value">{credInfo.issuer}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Data Hash (On-Chain)</div>
                <div className="data-value">{credInfo.dataHash}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Issued</div>
                <div className="data-value green">{new Date(credInfo.issuedAt * 1000).toLocaleString()}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Expires</div>
                <div className="data-value amber">
                  {credInfo.expiresAt > 0 ? new Date(credInfo.expiresAt * 1000).toLocaleString() : 'Never'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Result */}
      {result && (
        <div className={`result ${result.valid ? 'valid' : 'invalid'}`}>
          <div className="result-icon">{result.valid ? '✅' : '❌'}</div>
          <h3 style={{ color: result.valid ? 'var(--green)' : 'var(--red)' }}>
            {result.valid ? 'CREDENTIAL VALID' : 'VERIFICATION FAILED'}
          </h3>
          <p>
            {result.valid
              ? 'The credential is active, not expired, and the data matches the on-chain hash.'
              : result.dataMatch
                ? 'Data matches but the credential may be revoked, expired, or the issuer is inactive.'
                : 'The provided data does NOT match the hash stored on the blockchain.'
            }
          </p>

          {/* Privacy analysis */}
          <div style={{ marginTop: 20, textAlign: 'left', maxWidth: 480, margin: '20px auto 0' }}>
            <div className="data-grid">
              <div className="data-item">
                <div className="data-label">Your Hash</div>
                <div className={`data-value ${result.dataMatch ? 'green' : 'red'}`}>
                  {result.hashProvided.slice(0, 20)}...
                </div>
              </div>
              <div className="data-item">
                <div className="data-label">On-Chain Hash</div>
                <div className={`data-value ${result.dataMatch ? 'green' : 'red'}`}>
                  {result.hashOnChain.slice(0, 20)}...
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="alert alert-info" style={{ marginTop: 20 }}>
        🔒 Privacy: The verifier never sees raw data. Only hash comparison happens on-chain.
      </div>
    </div>
  )
}
