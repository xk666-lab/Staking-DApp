"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Trophy,
  Medal,
  Award,
  RefreshCw,
  ArrowUpCircle,
  Clock,
  ExternalLink,
  Filter,
  ChevronDown,
  Copy,
} from "lucide-react";
import { stakingABI, getContractAddresses } from "@/lib/contracts";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

// 添加动态导入，确保组件只在客户端渲染
const DynamicLeaderboardContent = dynamic(
  () => Promise.resolve(LeaderboardContent),
  { ssr: false }
);

interface LeaderboardProps {
  signer: ethers.Signer | null;
  account: string;
}

interface StakerInfo {
  address: string;
  amount: string;
  formattedAmount: string;
  rank: number;
  since: string;
}

interface StakeEvent {
  id: string;
  user: string;
  amount: string;
  formattedAmount: string;
  timestamp: number;
  dateTime: string;
  hash: string;
  blockNumber: number;
}

// 页面内容容器，添加suppressHydrationWarning属性
function ClientOnlyContent({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return <div suppressHydrationWarning>{children}</div>;
}

// 导出主组件
export function Leaderboard(props: LeaderboardProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold text-purple-400">
            排行榜
          </CardTitle>
          <div className="text-xs text-gray-400 flex items-center">
            <RefreshCw className="h-3 w-3 mr-1" />
            <span>最新数据</span>
          </div>
        </div>
        <CardDescription className="text-base text-gray-200">
          协议中的质押数据
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DynamicLeaderboardContent {...props} />
      </CardContent>
    </Card>
  );
}

// 实际内容组件，只在客户端渲染
function LeaderboardContent({ signer, account }: LeaderboardProps) {
  const [loading, setLoading] = useState(true);
  const [topStakers, setTopStakers] = useState<StakerInfo[]>([]);
  const [stakeEvents, setStakeEvents] = useState<StakeEvent[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStakedAmount, setUserStakedAmount] = useState<string>("0");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ranking" | "history">("ranking");
  const [isMounted, setIsMounted] = useState(false);

  const { stakingAddress } = getContractAddresses();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!signer || !isMounted) return;

      try {
        setLoading(true);
        setError(null);

        // 确保在客户端环境中
        if (typeof window === "undefined") {
          return;
        }

        // 确保ethers库已正确加载
        if (typeof ethers === "undefined") {
          console.error("Ethers 库未定义!");
          setError("Ethers 库加载失败，请刷新页面重试");
          return;
        }

        // 获取合约实例
        const stakingContract = new ethers.Contract(
          stakingAddress,
          stakingABI,
          signer
        );

        console.log("开始获取质押数据，合约地址:", stakingAddress);

        // 先获取用户的质押余额，确保合约连接正常
        const userBalance = await stakingContract.balanceOf(account);
        console.log("用户质押余额:", ethers.formatEther(userBalance));

        setUserStakedAmount(
          Number(ethers.formatEther(userBalance)).toLocaleString("zh-CN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        );

        // 尝试获取合约总质押量
        const totalStaked = await stakingContract.totalSupply();
        console.log("总质押量:", ethers.formatEther(totalStaked));

        // 获取所有质押事件
        const provider = signer.provider;
        if (!provider) throw new Error("Provider不可用");

        // 获取最新区块号
        const currentBlock = await provider.getBlockNumber();
        console.log("当前区块:", currentBlock);

        // 获取过去的事件（获取更多区块，增加到10000个）
        const fromBlock = Math.max(0, currentBlock - 10000);
        console.log("查询区块范围:", fromBlock, "到", currentBlock);

        // 尝试获取所有质押事件，不限制用户地址
        const allStakeFilter = stakingContract.filters.Staked();
        let allStakeEvents;
        try {
          allStakeEvents = await stakingContract.queryFilter(
            allStakeFilter,
            fromBlock
          );
        } catch (queryError) {
          console.error("第一次事件查询失败，尝试缩小区块范围:", queryError);
          // 如果查询失败，尝试缩小区块范围再查询一次
          const reducedFromBlock = Math.max(0, currentBlock - 5000);
          allStakeEvents = await stakingContract.queryFilter(
            allStakeFilter,
            reducedFromBlock
          );
        }

        console.log("找到质押事件数量:", allStakeEvents.length);

        // 处理所有质押事件
        if (allStakeEvents.length > 0) {
          // 用于排行榜的数据处理
          const uniqueAddresses = new Set<string>();
          const addressToEvents = new Map<string, StakeEvent[]>();
          const processedEvents: StakeEvent[] = [];

          // 首先按地址分组收集所有事件
          for (const event of allStakeEvents) {
            try {
              const decodedData = stakingContract.interface.parseLog({
                topics: event.topics,
                data: event.data,
              });

              if (decodedData && decodedData.args && decodedData.args.user) {
                const userAddress = decodedData.args.user.toLowerCase();
                uniqueAddresses.add(userAddress);

                // 获取事件对应的区块以获取时间戳
                const block = await provider.getBlock(event.blockNumber);
                if (!block) continue;

                const timestamp = block.timestamp * 1000; // 转为毫秒
                const amount = decodedData.args.amount;

                const stakeEvent = {
                  id: `${event.transactionHash}-${event.logIndex || "0"}`,
                  user: userAddress,
                  amount: amount.toString(),
                  formattedAmount: ethers.formatEther(amount),
                  timestamp: timestamp,
                  dateTime: new Date(timestamp).toISOString(), // 使用ISO格式存储，避免服务器/客户端差异
                  hash: event.transactionHash,
                  blockNumber: event.blockNumber,
                };

                // 添加到处理后的事件列表
                processedEvents.push(stakeEvent);

                // 添加到按地址分组的Map中
                if (!addressToEvents.has(userAddress)) {
                  addressToEvents.set(userAddress, []);
                }
                addressToEvents.get(userAddress)!.push(stakeEvent);
              }
            } catch (e) {
              console.error("解析事件失败:", e);
            }
          }

          console.log("找到唯一质押者数量:", uniqueAddresses.size);
          console.log("处理的质押事件数量:", processedEvents.length);

          // 按时间倒序排序事件
          processedEvents.sort((a, b) => b.timestamp - a.timestamp);
          setStakeEvents(processedEvents);

          // 获取这些地址的余额
          const stakerPromises = Array.from(uniqueAddresses).map(
            async (address) => {
              try {
                const balance = await stakingContract.balanceOf(address);
                return {
                  address,
                  balance,
                  success: true,
                };
              } catch (error) {
                console.error(`获取地址 ${address} 的余额失败:`, error);
                return {
                  address,
                  balance: ethers.parseEther("0"),
                  success: false,
                };
              }
            }
          );

          // 使用Promise.allSettled确保即使有些请求失败也能继续
          const stakersResults = await Promise.allSettled(stakerPromises);
          const stakersData = stakersResults
            .filter((result) => result.status === "fulfilled")
            .map((result) => (result as PromiseFulfilledResult<any>).value)
            .filter((data) => data.success);

          console.log("成功获取余额的质押者数量:", stakersData.length);

          // 过滤掉余额为0的地址，并按余额排序
          const activeStakers = stakersData
            .filter((staker) => {
              // 检查balance是否为BigNumber，如果是则使用gt方法，否则使用常规比较
              if (typeof staker.balance.gt === "function") {
                return staker.balance.gt(0);
              } else {
                // 如果不是BigNumber对象，则将其转换为数字进行比较
                return Number(staker.balance.toString()) > 0;
              }
            })
            .sort((a, b) => {
              // 同样检查是否有gt方法可用
              if (
                typeof b.balance.gt === "function" &&
                typeof a.balance.gt === "function"
              ) {
                return b.balance.gt(a.balance) ? 1 : -1;
              } else {
                // 使用字符串转数字的方式比较
                const balanceA = Number(a.balance.toString());
                const balanceB = Number(b.balance.toString());
                return balanceB - balanceA;
              }
            });

          console.log("活跃质押者数量:", activeStakers.length);

          if (activeStakers.length > 0) {
            // 转换为显示格式
            const formattedStakers = activeStakers.map((staker, index) => {
              // 查找该用户所有的质押事件
              const userEvents =
                addressToEvents.get(staker.address.toLowerCase()) || [];
              // 按时间正序排序
              userEvents.sort((a, b) => a.timestamp - b.timestamp);
              // 获取最早的一条作为起始质押时间
              const firstStake = userEvents.length > 0 ? userEvents[0] : null;

              return {
                address: staker.address,
                amount: staker.balance.toString(),
                formattedAmount: Number(
                  ethers.formatEther(staker.balance)
                ).toLocaleString("zh-CN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                rank: index + 1,
                since: firstStake
                  ? new Date(firstStake.timestamp).toLocaleString("zh-CN")
                  : "未知时间",
              };
            });

            console.log("格式化后的质押者数据:", formattedStakers.length);
            setTopStakers(formattedStakers);

            // 查找用户排名
            const userRankIndex = activeStakers.findIndex(
              (staker) => staker.address.toLowerCase() === account.toLowerCase()
            );

            if (userRankIndex >= 0) {
              setUserRank(userRankIndex + 1);
              console.log("当前用户排名:", userRankIndex + 1);
            } else {
              console.log("当前用户没有在排行榜中");
            }
          } else {
            console.log("没有活跃的质押者");
            setTopStakers([]);
          }
        } else {
          console.log("没有找到质押事件");
          setStakeEvents([]);
          setTopStakers([]);
        }

        setLastUpdate(new Date());
      } catch (error) {
        console.error("获取排行榜数据时出错:", error);
        setError("无法连接到区块链，请检查您的网络连接");

        // 如果已有数据，保留显示以避免界面空白
        if (topStakers.length === 0 && stakeEvents.length === 0) {
          // 创建一些示例数据以便界面显示
          console.log("创建示例数据...");
          createSampleData();
        }
      } finally {
        setLoading(false);
      }
    };

    // 添加生成示例数据的函数，当无法获取真实数据时使用
    const createSampleData = () => {
      const now = Date.now();
      const sampleStakers = [
        {
          address: "0x6C29...2E26",
          amount: "211000000000000000000",
          formattedAmount: "211.00",
          rank: 1,
          since: new Date(now - 7 * 24 * 60 * 60 * 1000).toLocaleString(
            "zh-CN"
          ),
        },
        {
          address: "0x8626...1C1b",
          amount: "100000000000000000000",
          formattedAmount: "100.00",
          rank: 2,
          since: new Date(now - 5 * 24 * 60 * 60 * 1000).toLocaleString(
            "zh-CN"
          ),
        },
      ];

      const sampleEvents = [
        {
          id: "event-1",
          user: "0x6C29...2E26",
          amount: "211000000000000000000",
          formattedAmount: "211.00",
          timestamp: now - 7 * 24 * 60 * 60 * 1000,
          dateTime: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
          hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          blockNumber: 12345678,
        },
        {
          id: "event-2",
          user: "0x8626...1C1b",
          amount: "100000000000000000000",
          formattedAmount: "100.00",
          timestamp: now - 5 * 24 * 60 * 60 * 1000,
          dateTime: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          hash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
          blockNumber: 12345789,
        },
      ];

      setTopStakers(sampleStakers);
      setStakeEvents(sampleEvents);
      // 如果当前账户是示例账户之一，设置其排名
      if (account.toLowerCase().includes("1c1b")) {
        setUserRank(2);
      } else if (account.toLowerCase().includes("2e26")) {
        setUserRank(1);
      }
    };

    // 立即执行一次数据获取
    fetchData();

    // 设置定时器定期更新数据（减少到60秒，以提高数据更新频率）
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [signer, account, stakingAddress, isMounted]);

  const formatAddress = (address: string) => {
    return (
      address.substring(0, 6) + "..." + address.substring(address.length - 4)
    );
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-300" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-700" />;
      default:
        return (
          <span className="text-base font-bold w-6 text-center">{rank}</span>
        );
    }
  };

  const getAmountText = (amount: string) => {
    if (!isMounted) return <span>加载中...</span>;

    const formattedAmount = Number(amount).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (
      <span className="font-bold text-emerald-400">{`+${formattedAmount} 代币`}</span>
    );
  };

  // 新增排序状态和函数
  const [sortField, setSortField] = useState<"rank" | "amount" | "since">(
    "rank"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // 处理排序点击
  const handleSort = (field: "rank" | "amount" | "since") => {
    if (sortField === field) {
      // 如果已经在按这个字段排序，则反转方向
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // 否则设置新的排序字段，默认方向
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // 对质押者数据进行排序
  const sortedStakers = [...topStakers].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "rank":
        comparison = a.rank - b.rank;
        break;
      case "amount":
        comparison = parseFloat(a.amount) - parseFloat(b.amount);
        break;
      case "since":
        comparison = new Date(a.since).getTime() - new Date(b.since).getTime();
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  const displayedStakers = sortedStakers.slice(0, 10); // 假设只显示前10个质押者

  return (
    <div className="space-y-6">
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300 text-center">
          <p className="font-semibold">{error}</p>
          {userStakedAmount !== "0.00" && (
            <p className="mt-2">
              您当前的质押金额:{" "}
              <span className="text-cyan-300 font-bold">
                {userStakedAmount}
              </span>{" "}
              代币
            </p>
          )}
          </div>
      )}

      {!loading && !error && (
        <>
          <Tabs defaultValue="leaderboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 p-1">
              <TabsTrigger
                value="leaderboard"
                className="py-3 text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-900/60 data-[state=active]:to-purple-900/60"
              >
                <Trophy className="h-5 w-5 mr-2 text-yellow-400" />
                排行榜
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="py-3 text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-900/60 data-[state=active]:to-cyan-900/60"
              >
                <Clock className="h-5 w-5 mr-2 text-purple-400" />
                质押历史
              </TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="pt-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl text-cyan-300 font-bold">
                  协议中的质押数据
                </h3>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-sm px-3 py-1.5 border-gray-700 text-gray-300"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  最后更新: {lastUpdate.toLocaleTimeString("zh-CN")}
                </Badge>
              </div>

              {userRank > 0 && (
                <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-lg p-5 mb-6 border border-cyan-800/40">
                  <h3 className="text-lg font-bold text-white mb-3">
                    您的排名
                  </h3>
                  <div className="flex items-center">
                    <div className="bg-yellow-500/30 p-2 rounded-full mr-4">
                      <div className="bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full h-12 w-12 flex items-center justify-center">
                        <span className="text-white font-bold text-xl">
                          {userRank}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-lg text-white">
                        您的账户
                      </div>
                      <div className="text-gray-300">
                        已质押:{" "}
                        <span className="text-cyan-300 font-bold text-lg">
                          {userStakedAmount}
                        </span>{" "}
                        代币
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-900/60 border-b border-gray-700">
                        <th
                          className="px-6 py-4 text-base font-bold text-white cursor-pointer"
                          onClick={() => handleSort("rank")}
                        >
                          <div className="flex items-center">
                            <span>排名</span>
                            {sortField === "rank" && (
                              <ChevronDown
                                className={`ml-1 h-4 w-4 ${
                                  sortDirection === "asc" ? "rotate-180" : ""
                                }`}
                              />
                            )}
            </div>
                        </th>
                        <th className="px-6 py-4 text-base font-bold text-white">
                          质押者地址
                        </th>
                        <th
                          className="px-6 py-4 text-base font-bold text-white cursor-pointer"
                          onClick={() => handleSort("amount")}
                        >
                          <div className="flex items-center">
                            <span>质押金额</span>
                            {sortField === "amount" && (
                              <ChevronDown
                                className={`ml-1 h-4 w-4 ${
                                  sortDirection === "asc" ? "rotate-180" : ""
                                }`}
                              />
                            )}
                    </div>
                        </th>
                        <th
                          className="px-6 py-4 text-base font-bold text-white cursor-pointer"
                          onClick={() => handleSort("since")}
                        >
                          <div className="flex items-center">
                            <span>质押时间</span>
                            {sortField === "since" && (
                              <ChevronDown
                                className={`ml-1 h-4 w-4 ${
                                  sortDirection === "asc" ? "rotate-180" : ""
                                }`}
                              />
                        )}
                      </div>
                        </th>
                        <th className="px-6 py-4 text-base font-bold text-white">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedStakers.length > 0 ? (
                        displayedStakers.map((staker) => (
                          <tr
                            key={staker.address}
                            className={`border-b border-gray-800 hover:bg-gray-800/80 ${
                              staker.address.toLowerCase() ===
                              account.toLowerCase()
                                ? "bg-gradient-to-r from-cyan-900/20 to-purple-900/20"
                                : ""
                            }`}
                          >
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center">
                                {getRankIcon(staker.rank)}
                                <span className="ml-2 text-xl font-bold text-white">
                                  {staker.rank}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center">
                                <div
                                  className={`h-9 w-9 rounded-full bg-gradient-to-br ${
                                    staker.address.toLowerCase() ===
                                    account.toLowerCase()
                                      ? "from-cyan-500 to-purple-600"
                                      : "from-gray-600 to-gray-700"
                                  } mr-3 flex items-center justify-center text-white font-medium`}
                                >
                                  {staker.address.slice(2, 4).toUpperCase()}
                                </div>
                                <span className="font-medium text-base text-white">
                                  {formatAddress(staker.address)}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              {getAmountText(staker.formattedAmount)}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-gray-300 text-base">
                              {staker.since}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex space-x-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="px-3 py-2 h-auto bg-gray-700/80 border-gray-600 text-white hover:bg-gray-600 hover:text-white"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      staker.address
                                    );
                                    toast({
                                      title: "地址已复制",
                                      description: "地址已复制到剪贴板",
                                    });
                                  }}
                                >
                                  <Copy className="h-4 w-4 mr-1" />
                                  复制
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="px-3 py-2 h-auto bg-blue-900/30 border-blue-800/50 text-blue-300 hover:bg-blue-800/50 hover:text-white"
                                  onClick={() => {
                                    window.open(
                                      `https://etherscan.io/address/${staker.address}`,
                                      "_blank"
                                    );
                                  }}
                                >
                                  <ExternalLink className="h-4 w-4 mr-1" />
                                  查看
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-10 text-center text-gray-400"
                          >
                            暂无质押数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                    </div>
                  </div>
            </TabsContent>

            <TabsContent value="history" className="pt-6">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-xl text-purple-300 font-bold">
                  质押历史记录
                </h3>
                <Badge
                  variant="outline"
                  className="flex items-center gap-1 text-sm px-3 py-1.5 border-gray-700 text-gray-300"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />共 {stakeEvents.length}{" "}
                  条记录
                </Badge>
              </div>

              <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-900/60 border-b border-gray-700">
                        <th className="px-6 py-4 text-base font-bold text-white">
                          用户地址
                        </th>
                        <th className="px-6 py-4 text-base font-bold text-white">
                          质押金额
                        </th>
                        <th className="px-6 py-4 text-base font-bold text-white">
                          质押时间
                        </th>
                        <th className="px-6 py-4 text-base font-bold text-white">
                          交易哈希
                        </th>
                        <th className="px-6 py-4 text-base font-bold text-white">
                          区块高度
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stakeEvents.length > 0 ? (
                        stakeEvents.map((event) => (
                          <tr
                            key={event.id}
                            className={`border-b border-gray-800 hover:bg-gray-800/80 ${
                              event.user.toLowerCase() === account.toLowerCase()
                                ? "bg-gradient-to-r from-purple-900/20 to-cyan-900/20"
                                : ""
                            }`}
                          >
                            <td className="px-6 py-5">
                              <div className="flex items-center">
                                <div
                                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${
                                    event.user.toLowerCase() ===
                                    account.toLowerCase()
                                      ? "from-cyan-500 to-purple-600"
                                      : "from-gray-600 to-gray-700"
                                  } mr-3 flex items-center justify-center text-white font-medium`}
                                >
                                  {event.user.slice(2, 4).toUpperCase()}
                                </div>
                                <span className="font-medium text-base text-white">
                                  {formatAddress(event.user)}
                                </span>
                  </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className="text-cyan-300 font-bold text-base">
                                {Number.parseFloat(
                                  event.formattedAmount
                                ).toLocaleString("zh-CN", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>{" "}
                              <span className="text-gray-400">代币</span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-base text-gray-300">
                              {new Date(event.timestamp).toLocaleString(
                                "zh-CN"
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <a
                                href={`https://etherscan.io/tx/${event.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline font-mono text-sm"
                              >
                                {event.hash.slice(0, 10)}...
                                {event.hash.slice(-8)}
                              </a>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className="font-mono text-gray-300 text-sm">
                                {event.blockNumber.toLocaleString("zh-CN")}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-10 text-center text-gray-400"
                          >
                            暂无质押历史记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </>
        )}
    </div>
  );
}
