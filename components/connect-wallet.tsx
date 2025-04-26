"use client";

import { useState } from "react";
import type { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Wallet, LogOut } from "lucide-react";

interface ConnectWalletProps {
  provider: ethers.BrowserProvider | null;
  setAccount: (account: string) => void;
  setSigner: (signer: ethers.Signer) => void;
  account: string;
  isOwner?: boolean;
}

export function ConnectWallet({
  provider,
  setAccount,
  setSigner,
  account,
  isOwner,
}: ConnectWalletProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  const connectWallet = async () => {
    if (!provider) {
      toast({
        title: "MetaMask not detected",
        description: "Please install MetaMask to use this dApp",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      setSigner(signer);
      setAccount(await signer.getAddress());

      toast({
        title: "Wallet connected",
        description: "Your wallet has been successfully connected",
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast({
        title: "Connection failed",
        description: "Failed to connect wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setSigner(null);
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  return (
    <div>
      {!account ? (
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      ) : (
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-full bg-gray-800 border border-gray-700 flex items-center">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm">
              {account.substring(0, 6)}...
              {account.substring(account.length - 4)}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={disconnectWallet}
            className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
