"use client";

import { useState, useEffect } from "react";
import { ethers, type BrowserProvider, type Signer } from "ethers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Wallet,
  LogOut,
  RefreshCw,
  ExternalLink,
  Users,
  Copy,
  ArrowDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectWalletProps {
  provider: BrowserProvider | null;
  setAccount: (account: string) => void;
  setSigner: (signer: Signer) => void;
  account: string;
  isOwner?: boolean;
}

interface AccountInfo {
  address: string;
  ethBalance: string;
  ensName: string | null;
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
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [ethBalance, setEthBalance] = useState("0");
  const [availableAccounts, setAvailableAccounts] = useState<AccountInfo[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [networkName, setNetworkName] = useState("");
  const { toast } = useToast();

  // 确保组件在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 当账户变化时获取余额
  useEffect(() => {
    if (account && provider && isMounted) {
      fetchBalance();
      fetchNetworkInfo();
    }
  }, [account, provider, isMounted]);

  const fetchNetworkInfo = async () => {
    if (!provider) return;

    try {
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // 根据链ID设置网络名称
      const networks: { [key: number]: string } = {
        1: "以太坊主网",
        5: "Goerli测试网",
        11155111: "Sepolia测试网",
        1337: "本地开发网络",
      };

      setNetworkName(networks[chainId] || `Chain ID: ${chainId}`);
    } catch (error) {
      console.error("获取网络信息出错:", error);
    }
  };

  const fetchBalance = async () => {
    if (!provider || !account) return;

    try {
      setIsLoadingBalance(true);
      const balance = await provider.getBalance(account);
      setEthBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error("获取ETH余额时出错:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const fetchAvailableAccounts = async () => {
    if (!provider) return;

    try {
      setIsLoadingAccounts(true);

      // 优化：同时请求账户访问权限和账户列表
      // 首先尝试使用ethereum_requestAccounts方法，更现代化的方法
      try {
        await (window as any).ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (permError) {
        console.log("权限请求失败，尝试基本连接:", permError);
        // 回退到基本方法
        await provider.send("eth_requestAccounts", []);
      }

      // 直接从ethereum对象获取账户可能更可靠
      const rawAccounts = await (window as any).ethereum.request({
        method: "eth_accounts",
      });

      console.log("获取到的原始账户:", rawAccounts);

      if (!rawAccounts || rawAccounts.length === 0) {
        toast({
          title: "未找到账户",
          description: "请确保您在MetaMask中已解锁并有可用账户",
        });
        setAvailableAccounts([]);
        setIsLoadingAccounts(false);
        return;
      }

      const accountsInfo: AccountInfo[] = [];

      // 为每个地址获取余额和ENS名称
      for (const address of rawAccounts) {
        try {
          const balance = await provider.getBalance(address);

          let ensName = null;
          try {
            ensName = await provider.lookupAddress(address);
          } catch (e) {
            // ENS可能不可用，忽略错误
          }

          accountsInfo.push({
            address,
            ethBalance: ethers.formatEther(balance),
            ensName,
          });
        } catch (addrError) {
          console.error("处理账户信息时出错:", addrError);
          // 即使有错误，仍然添加账户但标记余额为未知
          accountsInfo.push({
            address,
            ethBalance: "未知",
            ensName: null,
          });
        }
      }

      console.log("处理后的账户信息:", accountsInfo);
      setAvailableAccounts(accountsInfo);

      if (accountsInfo.length === 0) {
        toast({
          title: "无法获取账户详情",
          description: "已连接MetaMask，但无法获取账户详细信息",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("获取可用账户时出错:", error);
      toast({
        title: "获取账户列表失败",
        description: "无法获取您的账户列表，请重试",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAccounts(false);
    }
  };

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
      const currentAccount = await signer.getAddress();
      setAccount(currentAccount);

      // 获取ETH余额
      const balance = await provider.getBalance(currentAccount);
      setEthBalance(ethers.formatEther(balance));

      // 获取可用账户
      fetchAvailableAccounts();

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
    setEthBalance("0");
    setAvailableAccounts([]);
    toast({
      title: "钱包已断开",
      description: "您的钱包已断开连接",
    });
  };

  const switchAccount = async (address: string) => {
    if (!provider) return;

    try {
      // 首先尝试更安全的钱包请求
      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [
            {
              chainId: await provider
                .getNetwork()
                .then((net) => "0x" + net.chainId.toString(16)),
            },
          ],
        });

        // 然后请求切换到特定账户
        await (window as any).ethereum.request({
          method: "eth_requestAccounts",
          params: [{ eth_accounts: { addresses: [address] } }],
        });
      } catch (switchError) {
        console.log("使用现代API切换账户失败，尝试后备方法:", switchError);
        // 回退到传统方法
        await provider.send("wallet_requestPermissions", [
          {
            eth_accounts: {
              addresses: [address],
            },
          },
        ]);
      }

      // 重新获取签名者
      const signer = await provider.getSigner();
      setSigner(signer);

      // 确认当前账户是否已切换
      const currentAccount = await signer.getAddress();
      setAccount(currentAccount);

      // 获取新账户的余额
      fetchBalance();

      toast({
        title: "账户已切换",
        description: "您的账户已成功切换",
      });
    } catch (error) {
      console.error("切换账户时出错:", error);
      toast({
        title: "切换账户失败",
        description: "无法切换到所选账户，请在MetaMask中手动切换",
        variant: "destructive",
      });
    }
  };

  const copyAddressToClipboard = async () => {
    if (!account) return;

    try {
      await navigator.clipboard.writeText(account);
      toast({
        title: "地址已复制",
        description: "钱包地址已复制到剪贴板",
      });
    } catch (error) {
      console.error("复制地址时出错:", error);
      toast({
        title: "复制失败",
        description: "无法复制地址，请手动复制",
        variant: "destructive",
      });
    }
  };

  const viewOnExplorer = () => {
    if (!account) return;

    // 根据不同网络选择不同的区块浏览器
    let explorerUrl = `https://etherscan.io/address/${account}`;

    // 根据networkName判断使用哪个浏览器URL
    if (networkName.includes("Goerli")) {
      explorerUrl = `https://goerli.etherscan.io/address/${account}`;
    } else if (networkName.includes("Sepolia")) {
      explorerUrl = `https://sepolia.etherscan.io/address/${account}`;
    } else if (networkName.includes("本地")) {
      // 本地网络可能没有浏览器
      toast({
        title: "本地网络",
        description: "本地网络没有可用的区块浏览器",
      });
      return;
    }

    window.open(explorerUrl, "_blank");
  };

  const refreshBalance = () => {
    fetchBalance();
  };

  const showAccountsMenu = () => {
    fetchAvailableAccounts();
    setShowAccountDetails(!showAccountDetails);
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
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {/* 网络信息 */}
            <div className="px-3 py-1 rounded-full bg-gray-800/80 border border-gray-700 text-xs text-gray-300">
              {networkName || "未知网络"}
            </div>

            {/* 账户地址和操作菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="border-gray-700 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                  <span>
                    {account.substring(0, 6)}...
                    {account.substring(account.length - 4)}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-gray-800 border-gray-700 text-gray-200">
                <DropdownMenuItem
                  onClick={copyAddressToClipboard}
                  className="hover:bg-gray-700"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制地址
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={viewOnExplorer}
                  className="hover:bg-gray-700"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  在区块浏览器查看
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={showAccountsMenu}
                  className="hover:bg-gray-700"
                >
                  <Users className="h-4 w-4 mr-2" />
                  账户管理
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem
                  onClick={disconnectWallet}
                  className="hover:bg-gray-700 text-red-400 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  断开连接
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="icon"
              onClick={disconnectWallet}
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* 账户详情和余额信息 */}
          <div
            className={`w-full transition-all duration-300 ${
              showAccountDetails
                ? "max-h-96"
                : "max-h-0 opacity-0 pointer-events-none"
            } overflow-hidden`}
          >
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mt-2 w-full">
              {/* 当前账户ETH余额 */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-xs text-gray-400 mb-1">ETH余额</div>
                  {isLoadingBalance ? (
                    <Skeleton className="h-6 w-24 bg-gray-700" />
                  ) : (
                    <div className="text-lg font-medium text-white flex items-center">
                      {Number(ethBalance).toFixed(4)} ETH
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={refreshBalance}
                        className="ml-1 h-6 w-6 text-gray-400 hover:text-white"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 账户切换部分 */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="accounts" className="border-gray-700">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <div className="flex items-center text-cyan-400">
                      <Users className="h-4 w-4 mr-2" />
                      可用账户列表
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {isLoadingAccounts ? (
                      <div className="space-y-2 py-2">
                        <Skeleton className="h-10 w-full bg-gray-700" />
                        <Skeleton className="h-10 w-full bg-gray-700" />
                      </div>
                    ) : availableAccounts.length === 0 ? (
                      <div className="text-sm text-gray-400 py-2 space-y-2">
                        <p>未找到其他账户</p>
                        <p className="text-xs text-yellow-400">
                          提示：如果您在MetaMask中添加了新账户，请点击下方的"刷新账户列表"按钮
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 py-2">
                        {availableAccounts.map((acc) => (
                          <div
                            key={acc.address}
                            className={`
                              flex justify-between items-center p-2 rounded-md hover:bg-gray-700 cursor-pointer
                              ${
                                acc.address === account
                                  ? "bg-gray-700/50 border border-cyan-800/50"
                                  : ""
                              }
                            `}
                            onClick={() =>
                              acc.address !== account &&
                              switchAccount(acc.address)
                            }
                          >
                            <div className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full mr-2 ${
                                  acc.address === account
                                    ? "bg-green-500"
                                    : "bg-gray-500"
                                }`}
                              ></div>
                              <div>
                                <div className="text-sm font-medium">
                                  {acc.address.substring(0, 6)}...
                                  {acc.address.substring(
                                    acc.address.length - 4
                                  )}
                                </div>
                                {acc.ensName && (
                                  <div className="text-xs text-gray-400">
                                    {acc.ensName}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-300">
                              {Number(acc.ethBalance).toFixed(4)} ETH
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchAvailableAccounts}
                      disabled={isLoadingAccounts}
                      className="w-full mt-2 border-cyan-800 text-cyan-300 bg-cyan-900/30 hover:bg-cyan-800/50"
                    >
                      {isLoadingAccounts ? (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3 animate-spin" />
                          加载中...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-3 w-3" />
                          刷新账户列表
                        </>
                      )}
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
