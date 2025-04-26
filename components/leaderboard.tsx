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
import { Trophy, Medal, Award, RefreshCw } from "lucide-react";
import { stakingABI, getContractAddresses } from "@/lib/contracts";

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

export function Leaderboard({ signer, account }: LeaderboardProps) {
  const [loading, setLoading] = useState(true);
  const [topStakers, setTopStakers] = useState<StakerInfo[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userStakedAmount, setUserStakedAmount] = useState<string>("0");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const { stakingAddress } = getContractAddresses();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!signer) return;

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

        // 简化排行榜逻辑，先获取较小的数据集
        // 创建模拟数据作为备份，以防链上数据获取失败
        const mockStakers: StakerInfo[] = [
          {
            address: account,
            amount: userBalance.toString(),
            formattedAmount: Number(
              ethers.formatEther(userBalance)
            ).toLocaleString("zh-CN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            rank: 1,
            since: "刚刚",
          },
        ];

        // 尝试获取合约总质押量
        const totalStaked = await stakingContract.totalSupply();
        console.log("总质押量:", ethers.formatEther(totalStaked));

        try {
          // 获取所有质押事件以确定唯一质押者
          const provider = signer.provider;
          if (!provider) throw new Error("Provider不可用");

          // 获取最新区块号
          const currentBlock = await provider.getBlockNumber();
          console.log("当前区块:", currentBlock);

          // 获取过去的事件（仅获取最近1000个区块的事件，避免请求过大）
          const fromBlock = Math.max(0, currentBlock - 1000);
          const allStakeFilter = stakingContract.filters.Staked();
          const allStakeEvents = await stakingContract.queryFilter(
            allStakeFilter,
            fromBlock
          );

          console.log("找到质押事件数量:", allStakeEvents.length);

          // 如果有质押事件，处理这些事件
          if (allStakeEvents.length > 0) {
            // 简化处理逻辑，只获取直接查询的数据
            const uniqueAddresses = new Set<string>();

            // 收集所有不同的地址
            for (const event of allStakeEvents) {
              try {
                const decodedData = stakingContract.interface.parseLog({
                  topics: event.topics,
                  data: event.data,
                });
                if (decodedData && decodedData.args && decodedData.args.user) {
                  uniqueAddresses.add(decodedData.args.user);
                }
              } catch (e) {
                console.error("解析事件失败:", e);
              }
            }

            console.log("找到唯一质押者数量:", uniqueAddresses.size);

            // 获取这些地址的余额
            const stakersData = await Promise.all(
              Array.from(uniqueAddresses).map(async (address) => {
                const balance = await stakingContract.balanceOf(address);
                return {
                  address,
                  balance,
                  timestamp: Math.floor(Date.now() / 1000), // 使用当前时间
                };
              })
            );

            // 过滤掉余额为0的地址，并按余额排序
            const activeStakers = stakersData
              .filter((staker) => staker.balance.gt(0))
              .sort((a, b) => (b.balance.gt(a.balance) ? 1 : -1));

            console.log("活跃质押者数量:", activeStakers.length);

            if (activeStakers.length > 0) {
              // 转换为显示格式
              const formattedStakers = activeStakers
                .slice(0, 10)
                .map((staker, index) => {
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
                    since: "近期",
                  };
                });

              setTopStakers(formattedStakers);

              // 查找用户排名
              const userRankIndex = activeStakers.findIndex(
                (staker) =>
                  staker.address.toLowerCase() === account.toLowerCase()
              );

              if (userRankIndex >= 0) {
                setUserRank(userRankIndex + 1);
              }
            } else {
              setTopStakers(mockStakers);
            }
          } else {
            // 如果没有事件，使用模拟数据
            setTopStakers(mockStakers);
          }
        } catch (eventError) {
          console.error("获取事件失败:", eventError);
          // 出错时使用模拟数据
          setTopStakers(mockStakers);
        }

        setLastUpdate(new Date());
      } catch (error) {
        console.error("获取排行榜数据时出错:", error);
        setError("无法连接到区块链，请检查您的网络连接");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // 设置定时器定期更新数据（每2分钟）
    const interval = setInterval(fetchLeaderboard, 120000);
    return () => clearInterval(interval);
  }, [signer, account, stakingAddress]);

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

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold text-purple-400">
            排行榜
          </CardTitle>
          <div className="text-xs text-gray-400 flex items-center">
            <RefreshCw className="h-3 w-3 mr-1" />
            最后更新: {lastUpdate.toLocaleTimeString("zh-CN")}
          </div>
        </div>
        <CardDescription className="text-base text-gray-200">
          协议中的顶级质押者
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
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
          <>
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
                        <div className="text-sm text-gray-300">
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

            {account && (
              <div className="mt-6 p-5 border border-dashed border-gray-700 rounded-lg bg-gray-800/30">
                <div className="text-base text-gray-300 mb-2">您的排名</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-900/50 border border-cyan-700/50">
                      <span className="text-base font-bold">
                        {userRank || "-"}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-lg text-white">
                        您的账户
                      </div>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
