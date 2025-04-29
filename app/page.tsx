"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ConnectWallet } from "@/components/connect-wallet";
import { StakingPanel } from "@/components/staking-panel";
import { StatsPanel } from "@/components/stats-panel";
import { RewardsPanel } from "@/components/rewards-panel";
import { AdminPanel } from "@/components/admin-panel";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { Leaderboard } from "@/components/leaderboard";
import { StakingCalculator } from "@/components/staking-calculator";
import { MultiPoolStaking } from "@/components/multi-pool-staking";
import { ReferralSystem } from "@/components/referral-system";
import { Achievements } from "@/components/achievements";
import { TransactionHistory } from "@/components/transaction-history";
import { BalancePanel } from "@/components/balance-panel";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Trophy,
  Settings,
  Layers,
  Users,
  Award,
  History,
  Moon,
  Sun,
  Shield,
  User,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { stakingABI, getContractAddresses } from "@/lib/contracts";
import { TokenMinter } from "@/components/token-minter";

export default function Home() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [account, setAccount] = useState<string>("");
  const [isOwner, setIsOwner] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  // 确保组件仅在客户端挂载后渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 检查当前账户是否是合约所有者
  const checkIfOwner = async (account: string, signer: ethers.Signer) => {
    try {
      const { stakingAddress } = getContractAddresses();
      const stakingContract = new ethers.Contract(
        stakingAddress,
        stakingABI,
        signer
      );

      const owner = await stakingContract.owner();
      const isOwnerAccount = owner.toLowerCase() === account.toLowerCase();
      setIsOwner(isOwnerAccount);

      console.log(
        `检查管理员状态: 账户=${account}, 合约所有者=${owner}, 是管理员=${isOwnerAccount}`
      );
    } catch (error) {
      console.error("检查所有者状态时出错:", error);
      setIsOwner(false);
    }
  };

  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      if (!isMounted) return;

      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          setProvider(provider);

          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const signer = await provider.getSigner();
            setSigner(signer);
            const currentAccount = await signer.getAddress();
            setAccount(currentAccount);

            // 检查账户是否是管理员
            await checkIfOwner(currentAccount, signer);
          }
        } catch (error) {
          console.error("Error connecting to MetaMask", error);
        }
      } else {
        toast({
          title: "MetaMask未检测到",
          description: "请安装MetaMask钱包来使用本应用",
          variant: "destructive",
        });
      }
    };

    checkIfWalletIsConnected();
  }, [toast, isMounted]);

  // 当账户变化时重新检查管理员状态
  useEffect(() => {
    if (account && signer) {
      checkIfOwner(account, signer);
    }
  }, [account, signer]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // 如果组件尚未在客户端挂载，返回空内容避免水合错误
  if (!isMounted) {
    return <div className="min-h-screen bg-black"></div>;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme={theme} enableSystem={false}>
      <main
        className={`min-h-screen ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 to-black text-white"
            : "bg-gradient-to-br from-gray-100 to-white text-gray-900"
        }`}
      >
        <div className="container mx-auto px-4 py-8">
          <header className="mb-12">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-600">
                  量子质押平台
                </h1>
                <p
                  className={`${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  } mt-2`}
                >
                  在量子领域质押您的代币并获取奖励
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleTheme}
                  className={`${
                    theme === "dark"
                      ? "border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                      : "border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                  }`}
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>

                {account && (
                  <div
                    className={`px-3 py-1.5 rounded-full flex items-center ${
                      isOwner
                        ? "bg-purple-600/20 border border-purple-500/40 text-purple-400"
                        : "bg-cyan-600/20 border border-cyan-500/40 text-cyan-400"
                    }`}
                  >
                    {isOwner ? (
                      <>
                        <Shield className="h-3.5 w-3.5 mr-1.5" />
                        <span className="text-xs font-medium">管理员</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3.5 w-3.5 mr-1.5" />
                        <span className="text-xs font-medium">用户</span>
                      </>
                    )}
                  </div>
                )}

                <ConnectWallet
                  provider={provider}
                  setAccount={setAccount}
                  setSigner={setSigner}
                  account={account}
                  isOwner={isOwner}
                />
              </div>
            </div>
          </header>

          {account ? (
            <>
              <Tabs defaultValue="dashboard" className="mb-8">
                <TabsList
                  className={`w-full ${
                    theme === "dark" ? "bg-gray-800/50" : "bg-gray-200/50"
                  } p-1`}
                >
                  <TabsTrigger
                    value="dashboard"
                    className={`flex-1 ${
                      theme === "dark"
                        ? "data-[state=active]:bg-gray-700"
                        : "data-[state=active]:bg-white"
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    控制面板
                  </TabsTrigger>
                  <TabsTrigger
                    value="pools"
                    className={`flex-1 ${
                      theme === "dark"
                        ? "data-[state=active]:bg-gray-700"
                        : "data-[state=active]:bg-white"
                    }`}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    质押池
                  </TabsTrigger>
                  <TabsTrigger
                    value="leaderboard"
                    className={`flex-1 ${
                      theme === "dark"
                        ? "data-[state=active]:bg-gray-700"
                        : "data-[state=active]:bg-white"
                    }`}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    排行榜
                  </TabsTrigger>
                  <TabsTrigger
                    value="referrals"
                    className={`flex-1 ${
                      theme === "dark"
                        ? "data-[state=active]:bg-gray-700"
                        : "data-[state=active]:bg-white"
                    }`}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    推荐
                  </TabsTrigger>
                  <TabsTrigger
                    value="achievements"
                    className={`flex-1 ${
                      theme === "dark"
                        ? "data-[state=active]:bg-gray-700"
                        : "data-[state=active]:bg-white"
                    }`}
                  >
                    <Award className="h-4 w-4 mr-2" />
                    成就
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className={`flex-1 ${
                      theme === "dark"
                        ? "data-[state=active]:bg-gray-700"
                        : "data-[state=active]:bg-white"
                    }`}
                  >
                    <History className="h-4 w-4 mr-2" />
                    历史
                  </TabsTrigger>
                  <TabsTrigger
                    value="minter"
                    className={`flex-1 ${
                      theme === "dark"
                        ? "data-[state=active]:bg-gray-700"
                        : "data-[state=active]:bg-white"
                    }`}
                  >
                    <Coins className="h-4 w-4 mr-2" />
                    铸造
                  </TabsTrigger>
                  {isOwner && (
                    <TabsTrigger
                      value="admin"
                      className={`flex-1 ${
                        theme === "dark"
                          ? "data-[state=active]:bg-gray-700"
                          : "data-[state=active]:bg-white"
                      }`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      管理
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="dashboard" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <BalancePanel
                      signer={signer}
                      account={account}
                      isOwner={isOwner}
                    />
                    <StakingPanel signer={signer} account={account} />
                    <StatsPanel signer={signer} account={account} />
                    <RewardsPanel signer={signer} account={account} />
                    <StakingCalculator signer={signer} />
                    <AnalyticsDashboard signer={signer} account={account} />
                  </div>
                </TabsContent>

                <TabsContent value="pools" className="mt-6">
                  <MultiPoolStaking signer={signer} account={account} />
                </TabsContent>

                <TabsContent value="leaderboard" className="mt-6">
                  <Leaderboard signer={signer} account={account} />
                </TabsContent>

                <TabsContent value="referrals" className="mt-6">
                  <ReferralSystem signer={signer} account={account} />
                </TabsContent>

                <TabsContent value="achievements" className="mt-6">
                  <Achievements signer={signer} account={account} />
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  <TransactionHistory signer={signer} account={account} />
                </TabsContent>

                <TabsContent value="minter" className="mt-6">
                  <TokenMinter
                    signer={signer}
                    account={account}
                    isOwner={isOwner}
                  />
                </TabsContent>

                {isOwner && (
                  <TabsContent value="admin" className="mt-6">
                    <AdminPanel signer={signer} />
                  </TabsContent>
                )}
              </Tabs>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div
                className={`w-24 h-24 mb-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 flex items-center justify-center`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                  <line x1="8" y1="16" x2="8.01" y2="16" />
                  <line x1="8" y1="20" x2="8.01" y2="20" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                  <line x1="12" y1="22" x2="12.01" y2="22" />
                  <line x1="16" y1="16" x2="16.01" y2="16" />
                  <line x1="16" y1="20" x2="16.01" y2="20" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4">连接您的钱包</h2>
              <p
                className={`${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                } max-w-md mb-8`}
              >
                连接您的钱包以开始质押代币并在我们的量子质押协议中赚取奖励。
              </p>
            </div>
          )}
        </div>
        <Toaster />
      </main>
    </ThemeProvider>
  );
}
