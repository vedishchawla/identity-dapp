# 🔐 UcIDM — Blockchain Identity Management DApp

A **decentralized identity management system** built on Ethereum that allows users to create self-sovereign identities, receive verifiable credentials from trusted organizations, and prove their identity without revealing personal data.

> Based on: *"Blockchain and the Future of Digital Identity Management"* — ScienceDirect

---

## 📌 About

Traditional identity systems are centralized — a single organization controls your data. If they get hacked, your data is exposed. UcIDM solves this using blockchain:

- **Self-Sovereign Identity** — Users own and control their own DID (Decentralized Identifier)
- **Privacy by Design** — Only keccak256 hashes are stored on-chain, never raw personal data
- **Verifiable Credentials** — Trusted issuers (DMV, Universities) issue credentials that anyone can verify on-chain
- **Role-Based Access** — 4 roles: Admin, Issuer, Holder, Verifier — each with enforced permissions
- **Immutable Audit Trail** — Every action (create, issue, verify, revoke) emits blockchain events

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   MetaMask   │────▶│  Vite React  │────▶│   Truffle    │
│   (Wallet)   │     │  (Frontend)  │     │  (Contracts) │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                           ┌──────▼───────┐
                                           │   Ganache    │
                                           │  (Local BC)  │
                                           └──────────────┘
```

### Smart Contracts (Solidity 0.8.19)

| Contract | Purpose |
|----------|---------|
| `DIDRegistry.sol` | Identity creation & management — users register DIDs tied to their wallet |
| `IssuerRegistry.sol` | Trusted issuer management — admin adds/revokes credential-issuing organizations |
| `CredentialManager.sol` | Credential lifecycle — issue, verify (5-check validation), and revoke credentials |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.19 |
| Contract Framework | Truffle |
| Local Blockchain | Ganache GUI |
| Frontend | Vite + React |
| Web3 Library | ethers.js v6 |
| Wallet | MetaMask |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Ganache](https://trufflesuite.com/ganache/) (GUI version)
- [MetaMask](https://metamask.io/) browser extension
- [Truffle](https://trufflesuite.com/truffle/) (`npm install -g truffle`)

### Installation

```bash
# Clone the repo
git clone https://github.com/vedishchawla/identity-dapp.git
cd identity-dapp

# Install contract dependencies
npm install

# Install frontend dependencies
cd client && npm install
```

### Run the DApp

```bash
# Step 1: Open Ganache GUI → Click "Quickstart"

# Step 2: Deploy contracts (from project root)
npx truffle migrate --reset

# Step 3: Start frontend
cd client
npm run dev
```

### Connect MetaMask

1. Add network → RPC: `http://127.0.0.1:7545`, Chain ID: `1337`
2. Import a Ganache account (copy private key from Ganache GUI)
3. Open `http://localhost:3000` → Click "Connect Wallet"

---

## 📋 Usage Flow

### 1. Register Identity
Connect wallet → go to **Register** → enter your name → confirm in MetaMask → DID created on-chain.

### 2. Add Trusted Issuer (Admin only)
Go to **Issue** → enter issuer's wallet address + org name → confirm → organization is now trusted.

### 3. Issue Credential (Issuer only)
Switch to issuer account → go to **Issue** → enter holder's address, credential type, and data → confirm → credential hash stored on-chain.

### 4. Verify Credential (Anyone)
Go to **Verify** → enter credential ID + original data → blockchain compares hashes → ✅ Valid or ❌ Invalid.

### 5. Revoke Credential
Dashboard → click "Revoke" on any credential → issuer or holder can revoke with a reason.

---

## 🔒 Privacy Model

```
Issuer types: "License #DL-12345-CA"
              ↓
Frontend:     keccak256("License #DL-12345-CA") → 0x7f83b1...
              ↓
Blockchain:   stores ONLY 0x7f83b1... (the hash)
              ↓
Verifier:     enters "License #DL-12345-CA" → hashes it → compares with on-chain hash
              ↓
Result:       ✅ Match = Valid credential
```

**Raw personal data never touches the blockchain.** Only cryptographic hashes are stored. Verification works by hash comparison — the verifier proves they possess the original data without the blockchain revealing it.

---

## 📁 Project Structure

```
identity-dapp/
├── contracts/
│   ├── DIDRegistry.sol          # Identity management
│   ├── IssuerRegistry.sol       # Trusted issuer management
│   └── CredentialManager.sol    # Credential lifecycle
├── migrations/
│   └── 1_deploy_contracts.js    # Deploys all 3 contracts
├── truffle-config.js            # Ganache network config
├── client/                      # Vite + React frontend
│   ├── src/
│   │   ├── App.jsx              # Router + Navbar + Home
│   │   ├── index.css            # Design system
│   │   ├── hooks/useContract.js # MetaMask + contract connection
│   │   └── pages/
│   │       ├── Dashboard.jsx    # Identity + credentials view
│   │       ├── Register.jsx     # DID creation
│   │       ├── Issue.jsx        # Admin + issuer functions
│   │       └── Verify.jsx       # Credential verification
│   └── vite.config.js
└── package.json
```

---

## 👥 Roles

| Role | Permissions |
|------|------------|
| **Admin** | Add/revoke trusted issuers, transfer admin |
| **Issuer** | Issue credentials to registered holders |
| **Holder** | Register DID, view/revoke own credentials |
| **Verifier** | Verify any credential with original data |

---

## 📄 License

MIT

---

## 👨‍💻 Author

**Vedish Chawla**  
VES Institute of Technology
