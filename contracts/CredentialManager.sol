// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DIDRegistry.sol";
import "./IssuerRegistry.sol";

/**
 * @title CredentialManager
 * @notice Issues, verifies, and revokes verifiable credentials.
 * @dev Credentials are linked to a holder's DID and issued by trusted
 *      issuers. Only credential hashes are stored on-chain — raw data
 *      stays off-chain for privacy.
 *
 * Privacy: Only dataHash is stored on-chain. The verifier checks the
 * hash matches but never sees the raw credential data.
 */
contract CredentialManager {
    DIDRegistry public didRegistry;
    IssuerRegistry public issuerRegistry;

    struct Credential {
        uint256 id;
        string credentialType; // e.g."DriversLicense","Degree","MedicalCert"
        bytes32 dataHash;      // keccak256 of the actual credential data
        address issuer;        // who issued it
        address holder;        // who owns it
        uint256 issuedAt;
        uint256 expiresAt;     // 0 = no expiry
        bool isValid;
        bool isRevoked;
        string revokeReason;
    }

    uint256 private _credentialCounter;

    // holder → credential IDs
    mapping(address => uint256[]) private holderCredentials;
    // credential ID → Credential
    mapping(uint256 => Credential) public credentials;
    // holder → credType → credential IDs (for type-based lookup)
    mapping(address => mapping(string => uint256[])) private credentialsByType;
    // verification log: verifier → credentialId → timestamp
    mapping(address => mapping(uint256 => uint256)) public verificationLog;

    // ── Events ──
    event CredentialIssued(
        uint256 indexed credId,
        address indexed holder,
        address indexed issuer,
        string credentialType,
        uint256 expiresAt,
        uint256 timestamp
    );
    event CredentialRevoked(
        uint256 indexed credId,
        address indexed revokedBy,
        string reason,
        uint256 timestamp
    );
    event CredentialVerified(
        uint256 indexed credId,
        address indexed verifier,
        bool isValid,
        uint256 timestamp
    );

    // ── Modifiers ──
    modifier onlyActiveIssuer() {
        require(
            issuerRegistry.isActiveIssuer(msg.sender),
            "Cred: not an active issuer"
        );
        _;
    }

    modifier credentialExists(uint256 _credId) {
        require(_credId > 0 && _credId <= _credentialCounter, "Cred: not found");
        _;
    }

    constructor(address _didRegistry, address _issuerRegistry) {
        didRegistry = DIDRegistry(_didRegistry);
        issuerRegistry = IssuerRegistry(_issuerRegistry);
    }

    // ── Core Functions ──

    /**
     * @notice Issue a credential to a holder.
     * @param _holder Address of the credential holder
     * @param _credentialType Type of credential (e.g."DriversLicense")
     * @param _dataHash keccak256 hash of the credential data
     * @param _expiresAt Expiration timestamp (0 for no expiry)
     */
    function issueCredential(
        address _holder,
        string calldata _credentialType,
        bytes32 _dataHash,
        uint256 _expiresAt
    ) external onlyActiveIssuer returns (uint256) {
        require(didRegistry.isRegistered(_holder), "Cred: holder not registered");
        require(didRegistry.isActive(_holder), "Cred: holder identity inactive");
        require(_dataHash != bytes32(0), "Cred: invalid data hash");
        require(bytes(_credentialType).length > 0, "Cred: type required");
        if (_expiresAt > 0) {
            require(_expiresAt > block.timestamp, "Cred: expiry must be future");
        }

        _credentialCounter++;
        uint256 credId = _credentialCounter;

        credentials[credId] = Credential({
            id: credId,
            credentialType: _credentialType,
            dataHash: _dataHash,
            issuer: msg.sender,
            holder: _holder,
            issuedAt: block.timestamp,
            expiresAt: _expiresAt,
            isValid: true,
            isRevoked: false,
            revokeReason: ""
        });

        holderCredentials[_holder].push(credId);
        credentialsByType[_holder][_credentialType].push(credId);

        emit CredentialIssued(
            credId, _holder, msg.sender,
            _credentialType, _expiresAt, block.timestamp
        );

        return credId;
    }

    /**
     * @notice Revoke a credential.
     * @dev Only the original issuer or the holder can revoke.
     */
    function revokeCredential(uint256 _credId, string calldata _reason) 
        external 
        credentialExists(_credId) 
    {
        Credential storage cred = credentials[_credId];
        require(!cred.isRevoked, "Cred: already revoked");
        require(
            msg.sender == cred.issuer || msg.sender == cred.holder,
            "Cred: only issuer or holder can revoke"
        );

        cred.isValid = false;
        cred.isRevoked = true;
        cred.revokeReason = _reason;

        emit CredentialRevoked(_credId, msg.sender, _reason, block.timestamp);
    }

    /**
     * @notice Verify a credential's validity.
     * @dev Checks: exists, not revoked, not expired, issuer still active
     * @param _credId Credential ID to verify
     * @param _dataHash Hash to compare against (for data integrity)
     * @return valid Whether the credential is valid
     * @return reason Human-readable reason if invalid
     */
    function verifyCredential(uint256 _credId, bytes32 _dataHash)
        external
        credentialExists(_credId)
        returns (bool valid, string memory reason)
    {
        Credential storage cred = credentials[_credId];

        // Log the verification attempt
        verificationLog[msg.sender][_credId] = block.timestamp;

        // Check revocation
        if (cred.isRevoked) {
            emit CredentialVerified(_credId, msg.sender, false, block.timestamp);
            return (false, "Credential has been revoked");
        }

        // Check expiry
        if (cred.expiresAt > 0 && block.timestamp >= cred.expiresAt) {
            cred.isValid = false;
            emit CredentialVerified(_credId, msg.sender, false, block.timestamp);
            return (false, "Credential has expired");
        }

        // Check data integrity
        if (cred.dataHash != _dataHash) {
            emit CredentialVerified(_credId, msg.sender, false, block.timestamp);
            return (false, "Data hash mismatch");
        }

        // Check if issuer is still trusted
        if (!issuerRegistry.isActiveIssuer(cred.issuer)) {
            emit CredentialVerified(_credId, msg.sender, false, block.timestamp);
            return (false, "Issuer is no longer trusted");
        }

        // Check holder identity is still active
        if (!didRegistry.isActive(cred.holder)) {
            emit CredentialVerified(_credId, msg.sender, false, block.timestamp);
            return (false, "Holder identity is deactivated");
        }

        emit CredentialVerified(_credId, msg.sender, true, block.timestamp);
        return (true, "Valid credential");
    }

    // ── View Functions ──

    function getCredential(uint256 _credId) 
        external 
        view 
        credentialExists(_credId) 
        returns (Credential memory) 
    {
        return credentials[_credId];
    }

    function getHolderCredentials(address _holder) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return holderCredentials[_holder];
    }

    function getCredentialsByType(address _holder, string calldata _credType) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return credentialsByType[_holder][_credType];
    }

    function isCredentialValid(uint256 _credId) 
        external 
        view 
        credentialExists(_credId)
        returns (bool) 
    {
        Credential memory cred = credentials[_credId];
        if (cred.isRevoked) return false;
        if (cred.expiresAt > 0 && block.timestamp >= cred.expiresAt) return false;
        if (!issuerRegistry.isActiveIssuer(cred.issuer)) return false;
        if (!didRegistry.isActive(cred.holder)) return false;
        return cred.isValid;
    }

    function getTotalCredentials() external view returns (uint256) {
        return _credentialCounter;
    }
}
