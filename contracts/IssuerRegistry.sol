// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IssuerRegistry
 * @notice Manages trusted credential issuers (organizations).
 * @dev Only the admin can add/remove issuers. Issuers are organizations
 *      like a DMV, University, or Hospital that can issue verifiable
 *      credentials to identity holders.
 */
contract IssuerRegistry {
    address public admin;

    struct Issuer {
        string orgName;       // e.g. "Department of Motor Vehicles"
        string orgType;       // e.g. "Government", "Education", "Healthcare"
        bool isActive;
        uint256 registeredAt;
    }

    mapping(address => Issuer) public issuers;
    address[] public issuerAddresses;

    // ── Events ──
    event IssuerAdded(address indexed issuer, string orgName, string orgType, uint256 timestamp);
    event IssuerRevoked(address indexed issuer, uint256 timestamp);
    event IssuerReinstated(address indexed issuer, uint256 timestamp);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    // ── Modifiers ──
    modifier onlyAdmin() {
        require(msg.sender == admin, "Issuer: not admin");
        _;
    }

    modifier issuerExists(address _issuer) {
        require(bytes(issuers[_issuer].orgName).length > 0, "Issuer: not found");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    // ── Admin Functions ──

    /**
     * @notice Add a trusted issuer organization.
     * @param _issuerAddr Address of the issuer (their wallet)
     * @param _orgName Name of the organization
     * @param _orgType Type of organization
     */
    function addIssuer(
        address _issuerAddr, 
        string calldata _orgName, 
        string calldata _orgType
    ) external onlyAdmin {
        require(_issuerAddr != address(0), "Issuer: invalid address");
        require(bytes(_orgName).length > 0, "Issuer: name required");
        require(bytes(issuers[_issuerAddr].orgName).length == 0, "Issuer: already exists");

        issuers[_issuerAddr] = Issuer({
            orgName: _orgName,
            orgType: _orgType,
            isActive: true,
            registeredAt: block.timestamp
        });

        issuerAddresses.push(_issuerAddr);

        emit IssuerAdded(_issuerAddr, _orgName, _orgType, block.timestamp);
    }

    /**
     * @notice Revoke an issuer's privileges.
     */
    function revokeIssuer(address _issuerAddr) 
        external 
        onlyAdmin 
        issuerExists(_issuerAddr) 
    {
        require(issuers[_issuerAddr].isActive, "Issuer: already revoked");
        issuers[_issuerAddr].isActive = false;
        emit IssuerRevoked(_issuerAddr, block.timestamp);
    }

    /**
     * @notice Reinstate a revoked issuer.
     */
    function reinstateIssuer(address _issuerAddr) 
        external 
        onlyAdmin 
        issuerExists(_issuerAddr) 
    {
        require(!issuers[_issuerAddr].isActive, "Issuer: already active");
        issuers[_issuerAddr].isActive = true;
        emit IssuerReinstated(_issuerAddr, block.timestamp);
    }

    /**
     * @notice Transfer admin role.
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "Issuer: invalid admin");
        emit AdminTransferred(admin, _newAdmin);
        admin = _newAdmin;
    }

    // ── View Functions ──

    function isActiveIssuer(address _issuerAddr) external view returns (bool) {
        return issuers[_issuerAddr].isActive;
    }

    function getIssuer(address _issuerAddr) external view returns (Issuer memory) {
        require(bytes(issuers[_issuerAddr].orgName).length > 0, "Issuer: not found");
        return issuers[_issuerAddr];
    }

    function getTotalIssuers() external view returns (uint256) {
        return issuerAddresses.length;
    }

    function getAllIssuers() external view returns (address[] memory) {
        return issuerAddresses;
    }
}
