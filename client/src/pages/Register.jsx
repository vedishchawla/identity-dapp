import { useState } from 'react'
import { ethers } from 'ethers'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

export default function Register({ contracts, account, isConnected }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [did, setDid] = useState('')
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Enter your name')

    setLoading(true)
    try {
      // Check if already registered
      const alreadyRegistered = await contracts.did.isRegistered(account)
      if (alreadyRegistered) {
        toast.error('This wallet is already registered! Switch to a different account in MetaMask.', { id: 'reg' })
        setLoading(false)
        return
      }

      // Generate public key hash from the account address
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes(account + Date.now()))

      toast.loading('Submitting transaction...', { id: 'reg' })
      const tx = await contracts.did.registerIdentity(name, publicKeyHash)
      toast.loading('Mining...', { id: 'reg' })
      const receipt = await tx.wait()

      // Get the DID from the event
      const event = receipt.logs.find(log => {
        try {
          return contracts.did.interface.parseLog(log)?.name === 'IdentityCreated'
        } catch { return false }
      })

      if (event) {
        const parsed = contracts.did.interface.parseLog(event)
        setDid(parsed.args.did)
      }

      setRegistered(true)
      toast.success('Identity registered on blockchain!', { id: 'reg' })
    } catch (err) {
      console.error(err)
      const msg = err.reason || err.message || 'Registration failed'
      if (msg.includes('already registered') || msg.includes('revert')) {
        toast.error('This wallet already has a DID! Switch accounts in MetaMask.', { id: 'reg' })
      } else {
        toast.error(msg, { id: 'reg' })
      }
    }
    setLoading(false)
  }

  if (!isConnected) {
    return (
      <div className="page">
        <div className="empty">
          <div className="empty-icon">🔗</div>
          <p>Connect your MetaMask wallet to register your identity.</p>
        </div>
      </div>
    )
  }

  if (registered) {
    return (
      <div className="page">
        <div className="result valid">
          <div className="result-icon">🎉</div>
          <h3 style={{ color: 'var(--green)' }}>Identity Registered!</h3>
          <p>Your decentralized identity has been created on the blockchain.</p>
        </div>

        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header">
            <h3>🆔 Your DID</h3>
            <span className="badge badge-ok">✓ On-chain</span>
          </div>
          <div className="card-body">
            <div className="data-grid">
              <div className="data-item">
                <div className="data-label">DID</div>
                <div className="data-value">{did}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Name</div>
                <div className="data-value green">{name}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Wallet</div>
                <div className="data-value">{account}</div>
              </div>
              <div className="data-item">
                <div className="data-label">Status</div>
                <div className="data-value green">Active ✓</div>
              </div>
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                📊 View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-badge">🆔 Register</div>
        <h2 className="page-title">Create Your <span className="grad">DID</span></h2>
        <p className="page-desc">
          Register a decentralized identity tied to your Ethereum address.
          Your DID will be stored on-chain — only a public key hash, never raw data.
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>📝 Identity Registration</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Bob Anderson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <div className="form-hint">This name will be associated with your DID on-chain.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Connected Wallet</label>
              <input
                className="form-input mono"
                type="text"
                value={account || ''}
                disabled
              />
              <div className="form-hint">Your DID will be: did:eth:{account?.toLowerCase()}</div>
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" type="submit" disabled={loading || !name.trim()}>
                {loading ? <><span className="spin" /> Registering...</> : '🆔 Register Identity'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="alert alert-info" style={{ marginTop: 20 }}>
        💡 This creates a real blockchain transaction via MetaMask. You'll be asked to confirm it.
      </div>
    </div>
  )
}
