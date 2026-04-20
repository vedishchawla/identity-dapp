const DIDRegistry = artifacts.require("DIDRegistry");
const IssuerRegistry = artifacts.require("IssuerRegistry");
const CredentialManager = artifacts.require("CredentialManager");

module.exports = async function (deployer, network, accounts) {
  // Deploy DIDRegistry
  await deployer.deploy(DIDRegistry);
  const didRegistry = await DIDRegistry.deployed();
  console.log("✅ DIDRegistry deployed at:", didRegistry.address);

  // Deploy IssuerRegistry
  await deployer.deploy(IssuerRegistry);
  const issuerRegistry = await IssuerRegistry.deployed();
  console.log("✅ IssuerRegistry deployed at:", issuerRegistry.address);

  // Deploy CredentialManager (references both registries)
  await deployer.deploy(CredentialManager, didRegistry.address, issuerRegistry.address);
  const credManager = await CredentialManager.deployed();
  console.log("✅ CredentialManager deployed at:", credManager.address);

  console.log("\n══════════════════════════════════════");
  console.log("🎉 All 3 contracts deployed!");
  console.log("══════════════════════════════════════");
  console.log("DIDRegistry:       ", didRegistry.address);
  console.log("IssuerRegistry:    ", issuerRegistry.address);
  console.log("CredentialManager: ", credManager.address);
  console.log("Admin (deployer):  ", accounts[0]);
  console.log("══════════════════════════════════════\n");
};
