// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DIDRegistry
 * @notice Manages Decentralized Identifiers (DIDs) on-chain.
 * @dev Each Ethereum address can register one DID containing their name
 *      and a hash of their public key. Identities can be deactivated
 *      but not deleted (immutable audit trail).
 *
 * Reference: "Blockchain and the Future of Digital Identity Management"
 *            ScienceDirect, 2025
 */
contract DIDRegistry {
    struct Identity {
        string did;           // e.g. "did:eth:0xAbC..."
        string name;          // human-readable name
        bytes32 publicKeyHash;// keccak256 of user's public key
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // owner → Identity
    mapping(address => Identity) private identities;
    // did string → owner address  (reverse lookup)
    mapping(string => address) private didToOwner;
    // track all registered addresses for enumeration
    address[] public registeredAddresses;

    // ── Events ──
    event IdentityCreated(address indexed owner, string did, string name, uint256 timestamp);
    event IdentityUpdated(address indexed owner, string name, uint256 timestamp);
    event IdentityDeactivated(address indexed owner, string did, uint256 timestamp);
    event IdentityReactivated(address indexed owner, string did, uint256 timestamp);

    // ── Modifiers ──
    modifier onlyRegistered() {
        require(bytes(identities[msg.sender].did).length > 0, "DID: not registered");
        _;
    }

    modifier onlyActive() {
        require(identities[msg.sender].isActive, "DID: identity is deactivated");
        _;
    }

    modifier notRegistered() {
        require(bytes(identities[msg.sender].did).length == 0, "DID: already registered");
        _;
    }

    // ── Core Functions ──

    /**
     * @notice Register a new decentralized identity.
     * @param _name Human-readable name for the identity holder
     * @param _publicKeyHash keccak256 hash of the user's public key
     */
    function registerIdentity(string calldata _name, bytes32 _publicKeyHash) 
        external 
        notRegistered 
    {
        require(bytes(_name).length > 0, "DID: name cannot be empty");
        require(_publicKeyHash != bytes32(0), "DID: invalid public key hash");

        // Generate DID string: did:eth:<address>
        string memory did = string(
            abi.encodePacked("did:eth:", _toHexString(msg.sender))
        );

        identities[msg.sender] = Identity({
            did: did,
            name: _name,
            publicKeyHash: _publicKeyHash,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        didToOwner[did] = msg.sender;
        registeredAddresses.push(msg.sender);

        emit IdentityCreated(msg.sender, did, _name, block.timestamp);
    }

    /**
     * @notice Update identity name.
     */
    function updateIdentity(string calldata _name) 
        external 
        onlyRegistered 
        onlyActive 
    {
        require(bytes(_name).length > 0, "DID: name cannot be empty");
        identities[msg.sender].name = _name;
        identities[msg.sender].updatedAt = block.timestamp;
        emit IdentityUpdated(msg.sender, _name, block.timestamp);
    }

    /**
     * @notice Deactivate identity (soft delete).
     */
    function deactivateIdentity() external onlyRegistered onlyActive {
        identities[msg.sender].isActive = false;
        identities[msg.sender].updatedAt = block.timestamp;
        emit IdentityDeactivated(msg.sender, identities[msg.sender].did, block.timestamp);
    }

    /**
     * @notice Reactivate a previously deactivated identity.
     */
    function reactivateIdentity() external onlyRegistered {
        require(!identities[msg.sender].isActive, "DID: already active");
        identities[msg.sender].isActive = true;
        identities[msg.sender].updatedAt = block.timestamp;
        emit IdentityReactivated(msg.sender, identities[msg.sender].did, block.timestamp);
    }

    // ── View Functions ──

    function getIdentity(address _owner) external view returns (Identity memory) {
        require(bytes(identities[_owner].did).length > 0, "DID: not found");
        return identities[_owner];
    }

    function getMyIdentity() external view onlyRegistered returns (Identity memory) {
        return identities[msg.sender];
    }

    function isRegistered(address _owner) external view returns (bool) {
        return bytes(identities[_owner].did).length > 0;
    }

    function isActive(address _owner) external view returns (bool) {
        return identities[_owner].isActive;
    }

    function resolveDID(string calldata _did) external view returns (address) {
        return didToOwner[_did];
    }

    function getTotalIdentities() external view returns (uint256) {
        return registeredAddresses.length;
    }

    // ── Internal Helpers ──

    function _toHexString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(_addr);
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}
