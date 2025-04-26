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
} from "lucide-react";
import { stakingABI, getContractAddresses } from "@/lib/contracts";
import dynamic from "next/dynamic";

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

        // 获取过去的事件（获取尽可能多的区块）
        const fromBlock = Math.max(0, currentBlock - 5000);
        const allStakeFilter = stakingContract.filters.Staked();
        const allStakeEvents = await stakingContract.queryFilter(
          allStakeFilter,
          fromBlock
        );

        console.log("找到质押事件数量:", allStakeEvents.length);

        // 处理所有质押事件
        if (allStakeEvents.length > 0) {
          // 用于排行榜的数据处理
          const uniqueAddresses = new Set<string>();
          const processedEvents: StakeEvent[] = [];

          // 收集所有不同的地址和处理事件
          for (const event of allStakeEvents) {
            try {
              const decodedData = stakingContract.interface.parseLog({
                topics: event.topics,
                data: event.data,
              });

              if (decodedData && decodedData.args && decodedData.args.user) {
                uniqueAddresses.add(decodedData.args.user);

                // 获取事件对应的区块以获取时间戳
                const block = await provider.getBlock(event.blockNumber);
                if (!block) continue;

                const timestamp = block.timestamp * 1000; // 转为毫秒
                const amount = decodedData.args.amount;

                processedEvents.push({
                  id: `${event.transactionHash}-${event.logIndex}`,
                  user: decodedData.args.user,
                  amount: amount.toString(),
                  formattedAmount: ethers.formatEther(amount),
                  timestamp: timestamp,
                  dateTime: new Date(timestamp).toISOString(), // 使用ISO格式存储，避免服务器/客户端差异
                  hash: event.transactionHash,
                  blockNumber: event.blockNumber,
                });
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
          const stakersData = await Promise.all(
            Array.from(uniqueAddresses).map(async (address) => {
              const balance = await stakingContract.balanceOf(address);
              return {
                address,
                balance,
              };
            })
          );

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
              // 查找该用户最早的质押时间
              const userEvents = processedEvents.filter(
                (e) => e.user.toLowerCase() === staker.address.toLowerCase()
              );
              const firstStake =
                userEvents.length > 0
                  ? userEvents[userEvents.length - 1] // 按时间正序最早的一条
                  : null;

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

            setTopStakers(formattedStakers);

            // 查找用户排名
            const userRankIndex = activeStakers.findIndex(
              (staker) => staker.address.toLowerCase() === account.toLowerCase()
            );

            if (userRankIndex >= 0) {
              setUserRank(userRankIndex + 1);
            }
          }
        }

        setLastUpdate(new Date());
      } catch (error) {
        console.error("获取排行榜数据时出错:", error);
        setError("无法连接到区块链，请检查您的网络连接");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 设置定时器定期更新数据（每2分钟）
    const interval = setInterval(fetchData, 120000);
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

  return loading ? (
    <div className="flex justify-center items-center h-60">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
    </div>
  ) : error ? (
    <div className="flex flex-col items-center justify-center h-60 text-center">
      <div className="text-red-400 mb-2">⚠️ {error}</div>
      <div className="text-sm text-gray-400">
        您的质押数据: {userStakedAmount}
      </div>
    </div>
  ) : (
    <div suppressHydrationWarning>
      <Tabs
        defaultValue="ranking"
        onValueChange={(value) => setActiveTab(value as "ranking" | "history")}
        className="mb-6"
      >
        <TabsList className="grid grid-cols-2 bg-gray-800/50 mb-4">
          <TabsTrigger
            value="ranking"
            className="data-[state=active]:bg-gray-700 text-base"
          >
            <Trophy className="h-4 w-4 mr-2" />
            排行榜
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="data-[state=active]:bg-gray-700 text-base"
          >
            <Clock className="h-4 w-4 mr-2" />
            质押历史
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking">
          <div className="space-y-4">
            {topStakers.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                暂无质押数据
              </div>
            ) : (
              topStakers.map((staker, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    index < 3
                      ? "bg-gradient-to-r from-gray-800/70 to-gray-900/70 border border-gray-700"
                      : "bg-gray-800/30"
                  } ${
                    staker.address.toLowerCase() === account.toLowerCase()
                      ? "border-2 border-cyan-500/50"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800">
                      {getRankIcon(staker.rank)}
                    </div>
                    <div>
                      <div className="font-bold text-lg text-white">
                        {formatAddress(staker.address)}
                      </div>
                      <div
                        className="text-sm text-gray-300"
                        suppressHydrationWarning
                      >
                        自 {staker.since} 开始质押
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-xl text-purple-300">
                      {staker.formattedAmount}
                    </div>
                    <div className="text-sm text-gray-300">质押的代币</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-gray-200">
                所有质押历史
              </h3>
              <Badge className="bg-gray-800 text-gray-200 border-gray-700">
                共 {stakeEvents.length} 笔
              </Badge>
            </div>

            {stakeEvents.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                暂无质押历史数据
              </div>
            ) : (
              stakeEvents.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg bg-gray-800/30 border border-gray-700 hover:bg-gray-800/50 transition-colors flex items-center justify-between ${
                    event.user.toLowerCase() === account.toLowerCase()
                      ? "border-l-4 border-l-cyan-500"
                      : ""
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-full bg-gray-800">
                      <ArrowUpCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-medium text-base text-white flex items-center">
                        {formatAddress(event.user)}
                        {event.user.toLowerCase() === account.toLowerCase() && (
                          <Badge className="ml-2 bg-cyan-900/30 text-cyan-400 border-cyan-700/50 text-xs">
                            您
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-300 flex items-center">
                        <span className="mr-2" suppressHydrationWarning>
                          {new Date(event.timestamp).toLocaleString("zh-CN")}
                        </span>
                        <a
                          href={`https://etherscan.io/tx/${event.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-cyan-400 hover:text-cyan-300"
                        >
                          {event.hash.substring(0, 6)}...
                          {event.hash.substring(event.hash.length - 4)}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg">
                      {getAmountText(event.formattedAmount)}
                    </div>
                    <div className="text-xs text-gray-300 mt-1">
                      区块: {event.blockNumber}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {activeTab === "ranking" && account && (
        <div className="mt-6 p-5 border border-dashed border-gray-700 rounded-lg bg-gray-800/30">
          <div className="text-base text-gray-300 mb-2">您的排名</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-900/50 border border-cyan-700/50">
                <span className="text-base font-bold">{userRank || "-"}</span>
              </div>
              <div>
                <div className="font-bold text-lg text-white">您的账户</div>
                <div className="text-sm text-gray-300">
                  {Number(userStakedAmount) > 0 ? (
                    userRank ? (
                      userRank <= 10 ? (
                        <Badge
                          variant="outline"
                          className="bg-cyan-900/30 text-cyan-400 border-cyan-700/50 text-base"
                        >
                          前10名质押者
                        </Badge>
                      ) : userRank <= 50 ? (
                        <Badge
                          variant="outline"
                          className="bg-purple-900/30 text-purple-400 border-purple-700/50 text-base"
                        >
                          前50名质押者
                        </Badge>
                      ) : (
                        <span>继续质押以提高排名！</span>
                      )
                    ) : (
                      <span>已质押，排名计算中</span>
                    )
                  ) : (
                    <span>尚未质押</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-xl text-cyan-300">
                {userStakedAmount}
              </div>
              <div className="text-sm text-gray-300">质押的代币</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
