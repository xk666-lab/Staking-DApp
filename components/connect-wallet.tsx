"use client";

import { useState, useEffect } from "react";
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
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  // 确保组件在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const connectWallet = async () => {
    if (!provider) {
      toast({
        title: "未检测到MetaMask",
        description: "请安装MetaMask钱包以使用本应用",
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
        title: "钱包已连接",
        description: "您的钱包已成功连接",
      });
    } catch (error) {
      console.error("连接钱包时出错:", error);
      toast({
        title: "连接失败",
        description: "钱包连接失败，请重试。",
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
      title: "钱包已断开",
      description: "您的钱包已断开连接",
    });
  };

  // 避免水合错误
  if (!isMounted) {
    return null;
  }

  return (
    <div>
      {!account ? (
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {isConnecting ? "连接中..." : "连接钱包"}
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
