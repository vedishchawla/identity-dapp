import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

// ABIs will be loaded from Truffle build artifacts
import DIDRegistryABI from "../../build/contracts/DIDRegistry.json";
import IssuerRegistryABI from "../../build/contracts/IssuerRegistry.json";
import CredentialManagerABI from "../../build/contracts/CredentialManager.json";

const GANACHE_CHAIN_ID = "0x539"; // 1337 (Ganache default)

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
    // Ganache uses network ID 5777 in Truffle artifacts but chain ID 1337 via MetaMask
    const tryIds = [id, "5777", "1337"];
    
    let didAddr, issuerAddr, credAddr;
    for (const tryId of tryIds) {
      didAddr = didAddr || DIDRegistryABI.networks[tryId]?.address;
      issuerAddr = issuerAddr || IssuerRegistryABI.networks[tryId]?.address;
      credAddr = credAddr || CredentialManagerABI.networks[tryId]?.address;
    }

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

      // Try to switch to Ganache network (ignore errors if already pending)
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: GANACHE_CHAIN_ID }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: GANACHE_CHAIN_ID,
                chainName: "Ganache Local",
                rpcUrls: ["http://127.0.0.1:7545"],
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              }],
            });
          } catch (addError) {
            console.log("Network add pending or rejected:", addError.message);
          }
        } else {
          console.log("Network switch issue:", switchError.message);
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
