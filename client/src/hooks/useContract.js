import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// ABIs will be loaded from Truffle build artifacts
import DIDRegistryABI from "../../build/contracts/DIDRegistry.json";
import IssuerRegistryABI from "../../build/contracts/IssuerRegistry.json";
import CredentialManagerABI from "../../build/contracts/CredentialManager.json";

const GANACHE_CHAIN_ID = "0x539"; // 1337

export function useContract() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contracts, setContracts] = useState({ did: null, issuer: null, credential: null });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [networkId, setNetworkId] = useState(null);

  const getContracts = useCallback(async (signerOrProvider, netId) => {
    const id = netId.toString();
    const didAddr = DIDRegistryABI.networks[id]?.address;
    const issuerAddr = IssuerRegistryABI.networks[id]?.address;
    const credAddr = CredentialManagerABI.networks[id]?.address;

    if (!didAddr || !issuerAddr || !credAddr) {
      throw new Error("Contracts not deployed on this network. Run: npx truffle migrate");
    }

    return {
      did: new ethers.Contract(didAddr, DIDRegistryABI.abi, signerOrProvider),
      issuer: new ethers.Contract(issuerAddr, IssuerRegistryABI.abi, signerOrProvider),
      credential: new ethers.Contract(credAddr, CredentialManagerABI.abi, signerOrProvider),
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask not found. Please install MetaMask.");
      }

      // Request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Switch to Ganache network
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: GANACHE_CHAIN_ID }],
        });
      } catch (switchError) {
        // Network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: GANACHE_CHAIN_ID,
              chainName: "Ganache Local",
              rpcUrls: ["http://127.0.0.1:7545"],
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            }],
          });
        }
      }

      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const network = await p.getNetwork();
      const netId = Number(network.chainId);

      const c = await getContracts(s, netId);

      setProvider(p);
      setSigner(s);
      setAccount(accounts[0]);
      setContracts(c);
      setNetworkId(netId);
      setIsConnected(true);
      setError(null);

      return { account: accounts[0], contracts: c };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [getContracts]);

  // Listen for account/network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setAccount(null);
      } else {
        setAccount(accounts[0]);
        connect();
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [connect]);

  return {
    provider, signer, account, contracts,
    isConnected, error, networkId, connect,
  };
}
