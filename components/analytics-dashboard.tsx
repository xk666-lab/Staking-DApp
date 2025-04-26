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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, PieChart } from "lucide-react";
import { stakingABI, tokenABI, getContractAddresses } from "@/lib/contracts";

interface StakingEvent {
  date: string;
  timestamp: number;
  amount: number;
  blockNumber: number;
  transactionHash: string;
}

interface AnalyticsDashboardProps {
  signer: ethers.Signer | null;
  account: string;
}

export function AnalyticsDashboard({
  signer,
  account,
}: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stakingHistory, setStakingHistory] = useState<StakingEvent[]>([]);
  const [rewardHistory, setRewardHistory] = useState<StakingEvent[]>([]);
  const [apyEstimate, setApyEstimate] = useState("0");
  const [totalStakedValue, setTotalStakedValue] = useState("0");
  const [userRank, setUserRank] = useState("0");
  const [totalStakers, setTotalStakers] = useState("0");
  const [isMounted, setIsMounted] = useState(false);
  const [userStakePercentage, setUserStakePercentage] = useState(25); // 默认占比，将由真实数据更新

  const { stakingAddress, stakingTokenAddress } = getContractAddresses();

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!signer || !account || !isMounted) return;

      try {
        setLoading(true);

        // 获取provider，用于基本查询
        const provider = signer.provider;
        if (!provider) return;

        const stakingContract = new ethers.Contract(
          stakingAddress,
          stakingABI,
          signer
        );

        const stakingTokenContract = new ethers.Contract(
          stakingTokenAddress,
          tokenABI,
          signer
        );

        // 获取基本数据
        const [
          userBalance,
          totalSupply,
          earnedRewards,
          rewardRate,
          duration,
          periodFinish,
        ] = await Promise.all([
          stakingContract.balanceOf(account),
          stakingContract.totalSupply(),
          stakingContract.earned(account),
          stakingContract.rewardRate(),
          stakingContract.duration(),
          stakingContract.finishAt(),
        ]);

        // 计算用户占比
        const userPercentage =
          totalSupply.toString() !== "0"
            ? (Number(ethers.formatEther(userBalance)) /
                Number(ethers.formatEther(totalSupply))) *
              100
            : 0;

        setUserStakePercentage(Math.round(userPercentage));

        // 获取代币价格 (实际应用中应该从价格预言机或交易所API获取)
        // 暂时假设为1美元，未来可以替换为真实数据源
        const tokenPrice = 1;
        const totalStakedValueUSD =
          Number(ethers.formatEther(totalSupply)) * tokenPrice;

        // 计算实际APY
        const apy =
          Number(ethers.formatEther(totalSupply)) > 0
            ? (Number(ethers.formatEther(rewardRate)) * 86400 * 365 * 100) /
              Number(ethers.formatEther(totalSupply))
            : 0;

        // 获取实际质押历史记录
        let stakingEvents: StakingEvent[] = [];
        try {
          // 从区块链获取质押事件
          const stakeFilter = stakingContract.filters.Staked(account);
          const withdrawFilter = stakingContract.filters.Withdrawn(account);

          // 获取过去3000个区块的事件（可根据需要调整）
          const currentBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 3000);

          // 获取质押和提取事件
          const [stakeEvents, withdrawEvents] = await Promise.all([
            stakingContract.queryFilter(stakeFilter, fromBlock),
            stakingContract.queryFilter(withdrawFilter, fromBlock),
          ]);

          // 合并事件并按时间排序
          const allEvents = [...stakeEvents, ...withdrawEvents].sort(
            (a, b) => a.blockNumber - b.blockNumber
          );

          if (allEvents.length > 0) {
            // 获取区块时间戳
            const blocks = await Promise.all(
              allEvents.map((event) => provider.getBlock(event.blockNumber))
            );

            // 创建历史数据点
            stakingEvents = await Promise.all(
              allEvents.map(async (event, index) => {
                // 获取区块时间戳
                const timestamp = blocks[index]?.timestamp || 0;
                const date = new Date(timestamp * 1000);

                // 根据事件类型确定数量（质押为正，提取为负）
                const eventName =
                  event.topics[0] &&
                  stakingContract.interface.getEvent("Staked")
                    ? event.topics[0] ===
                      stakingContract.interface.getEvent("Staked")?.topicHash
                      ? "Staked"
                      : "Withdrawn"
                    : "Unknown";
                const decodedData = stakingContract.interface.parseLog(event);
                if (!decodedData) {
                  console.error("无法解析事件日志", event);
                  return {
                    date: formatDate(date),
                    timestamp,
                    amount: 0,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash || "",
                  };
                }
                const amount =
                  eventName === "Staked"
                    ? Number(ethers.formatEther(decodedData.args.amount))
                    : -Number(ethers.formatEther(decodedData.args.amount));

                return {
                  date: formatDate(date),
                  timestamp,
                  amount: Math.abs(amount), // 仅使用绝对值来显示
                  blockNumber: event.blockNumber,
                  transactionHash: event.transactionHash,
                };
              })
            );
          }
        } catch (error) {
          console.error("获取质押历史出错:", error);
        }

        // 如果没有历史数据，使用当前余额创建一个数据点
        if (
          stakingEvents.length === 0 &&
          Number(ethers.formatEther(userBalance)) > 0
        ) {
          const now = new Date();
          stakingEvents = [
            {
              date: formatDate(now),
              timestamp: Math.floor(now.getTime() / 1000),
              amount: Number(ethers.formatEther(userBalance)),
              blockNumber: 0,
              transactionHash: "",
            },
          ];
        }

        // 获取实际奖励历史记录
        let rewardEvents: StakingEvent[] = [];
        try {
          // 从区块链获取领取奖励事件
          const rewardPaidFilter = stakingContract.filters.RewardPaid(account);

          // 获取过去3000个区块的事件
          const currentBlock = await provider.getBlockNumber();
          const fromBlock = Math.max(0, currentBlock - 3000);

          // 获取奖励事件
          const events = await stakingContract.queryFilter(
            rewardPaidFilter,
            fromBlock
          );

          if (events.length > 0) {
            // 获取区块时间戳
            const blocks = await Promise.all(
              events.map((event) => provider.getBlock(event.blockNumber))
            );

            // 创建历史数据点
            rewardEvents = await Promise.all(
              events.map(async (event, index) => {
                const timestamp = blocks[index]?.timestamp || 0;
                const date = new Date(timestamp * 1000);
                const decodedData = stakingContract.interface.parseLog(event);
                if (!decodedData) {
                  console.error("无法解析奖励事件日志", event);
                  return {
                    date: formatDate(date),
                    timestamp,
                    amount: 0,
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash || "",
                  };
                }

                return {
                  date: formatDate(date),
                  timestamp,
                  amount: Number(ethers.formatEther(decodedData.args.reward)),
                  blockNumber: event.blockNumber,
                  transactionHash: event.transactionHash,
                };
              })
            );
          }
        } catch (error) {
          console.error("获取奖励历史出错:", error);
        }

        // 如果没有奖励历史数据但已经赚取了奖励，创建一个数据点
        if (
          rewardEvents.length === 0 &&
          Number(ethers.formatEther(earnedRewards)) > 0
        ) {
          const now = new Date();
          rewardEvents = [
            {
              date: formatDate(now),
              timestamp: Math.floor(now.getTime() / 1000),
              amount: Number(ethers.formatEther(earnedRewards)),
              blockNumber: 0,
              transactionHash: "",
            },
          ];
        }

        // 获取实际质押者数量和排名
        let totalStakerCount = 0;
        let userRanking = 0;

        try {
          // 获取所有质押事件来确定唯一质押者
          const allStakeFilter = stakingContract.filters.Staked();
          const allStakeEvents = await stakingContract.queryFilter(
            allStakeFilter
          );

          // 提取唯一地址并统计拥有余额的地址
          const uniqueStakers = new Set();

          for (const event of allStakeEvents) {
            const decodedData = stakingContract.interface.parseLog(event);
            if (!decodedData) {
              console.error("无法解析质押者事件日志", event);
              continue;
            }
            const stakerAddress = decodedData.args.user;
            const stakerBalance = await stakingContract.balanceOf(
              stakerAddress
            );

            if (stakerBalance > 0) {
              uniqueStakers.add(stakerAddress);
            }
          }

          totalStakerCount = uniqueStakers.size;

          // 计算用户排名
          if (
            totalStakerCount > 0 &&
            Number(ethers.formatEther(userBalance)) > 0
          ) {
            // 获取所有质押者的余额
            const stakersWithBalances = await Promise.all(
              Array.from(uniqueStakers).map(async (address) => {
                const balance = await stakingContract.balanceOf(address);
                return { address, balance };
              })
            );

            // 按余额排序（从高到低）
            stakersWithBalances.sort((a, b) =>
              b.balance.gt(a.balance) ? 1 : b.balance.eq(a.balance) ? 0 : -1
            );

            // 找到用户的排名
            userRanking =
              stakersWithBalances.findIndex(
                (staker) => staker.address === account
              ) + 1; // 加1转为人类可读的排名（从1开始）
          }
        } catch (error) {
          console.error("获取质押者数量出错:", error);
          // 如果出错，使用估计值
          totalStakerCount = 20;
          userRanking = Math.max(
            1,
            Math.floor((1 - userPercentage / 100) * totalStakerCount)
          );
        }

        // 更新状态
        setStakingHistory(stakingEvents);
        setRewardHistory(rewardEvents);
        setApyEstimate(apy.toFixed(2));
        setTotalStakedValue(totalStakedValueUSD.toFixed(2));
        setUserRank(userRanking.toString());
        setTotalStakers(totalStakerCount.toString());
      } catch (error) {
        console.error("获取分析数据出错:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // 设置定时器定期更新数据
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [signer, account, stakingAddress, isMounted, stakingTokenAddress]);

  // 格式化日期为"月 日"格式
  const formatDate = (date: Date): string => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  if (!isMounted) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm col-span-2">
        <CardHeader>
          <CardTitle className="text-xl text-cyan-400">
            Analytics Dashboard
          </CardTitle>
          <CardDescription>Track your staking performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm col-span-2">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-cyan-400">
          Analytics Dashboard
        </CardTitle>
        <CardDescription className="text-base text-gray-300">
          Track your staking performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Current APY</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {apyEstimate}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Estimated annual yield
                </div>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">
                  Total Staked Value
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  ${totalStakedValue}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Based on current token price
                </div>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Your Rank</div>
                <div className="text-2xl font-bold text-cyan-400">
                  #{userRank}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Out of {totalStakers} stakers
                </div>
              </div>
            </div>

            <Tabs defaultValue="staking" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4 bg-gray-800/50">
                <TabsTrigger
                  value="staking"
                  className="data-[state=active]:bg-gray-700"
                >
                  <BarChart className="h-4 w-4 mr-2" />
                  质押历史
                </TabsTrigger>
                <TabsTrigger
                  value="rewards"
                  className="data-[state=active]:bg-gray-700"
                >
                  <LineChart className="h-4 w-4 mr-2" />
                  奖励历史
                </TabsTrigger>
                <TabsTrigger
                  value="distribution"
                  className="data-[state=active]:bg-gray-700"
                >
                  <PieChart className="h-4 w-4 mr-2" />
                  分配
                </TabsTrigger>
              </TabsList>

              <TabsContent value="staking" className="mt-0">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  {stakingHistory.length === 0 ? (
                    <div className="flex justify-center items-center h-64 text-gray-500">
                      暂无质押记录
                    </div>
                  ) : (
                    <>
                      <div className="overflow-auto max-h-64">
                        <table className="w-full">
                          <thead className="text-gray-200 border-b border-gray-700">
                            <tr>
                              <th className="text-left py-3 text-base font-bold">
                                日期
                              </th>
                              <th className="text-right py-3 text-base font-bold">
                                金额
                              </th>
                              <th className="text-right py-3 text-base font-bold">
                                交易哈希
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {stakingHistory.map((item, index) => (
                              <tr
                                key={index}
                                className="border-b border-gray-800"
                              >
                                <td className="py-3 text-base font-medium text-white">
                                  {item.date}
                                </td>
                                <td className="text-right py-3 text-base font-medium text-cyan-400">
                                  {item.amount.toFixed(4)}
                                </td>
                                <td className="text-right truncate max-w-[120px]">
                                  {item.transactionHash ? (
                                    <a
                                      href={`https://etherscan.io/tx/${item.transactionHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-300 hover:text-cyan-400 truncate text-base"
                                    >
                                      {item.transactionHash.substring(0, 8)}...
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-center text-base font-medium text-gray-200 mt-4 py-2 bg-gray-800/50 rounded-lg">
                        您的质押金额记录
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="rewards" className="mt-0">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  {rewardHistory.length === 0 ? (
                    <div className="flex justify-center items-center h-64 text-gray-500">
                      暂无奖励记录
                    </div>
                  ) : (
                    <>
                      <div className="overflow-auto max-h-64">
                        <table className="w-full">
                          <thead className="text-gray-200 border-b border-gray-700">
                            <tr>
                              <th className="text-left py-3 text-base font-bold">
                                日期
                              </th>
                              <th className="text-right py-3 text-base font-bold">
                                奖励金额
                              </th>
                              <th className="text-right py-3 text-base font-bold">
                                交易哈希
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rewardHistory.map((item, index) => (
                              <tr
                                key={index}
                                className="border-b border-gray-800"
                              >
                                <td className="py-3 text-base font-medium text-white">
                                  {item.date}
                                </td>
                                <td className="text-right py-3 text-base font-medium text-purple-400">
                                  {item.amount.toFixed(4)}
                                </td>
                                <td className="text-right truncate max-w-[120px]">
                                  {item.transactionHash ? (
                                    <a
                                      href={`https://etherscan.io/tx/${item.transactionHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-gray-300 hover:text-purple-400 truncate text-base"
                                    >
                                      {item.transactionHash.substring(0, 8)}...
                                    </a>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-center text-base font-medium text-gray-200 mt-4 py-2 bg-gray-800/50 rounded-lg">
                        您的奖励收益记录
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="distribution" className="mt-0">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="overflow-auto max-h-64">
                    <table className="w-full mb-4">
                      <thead className="text-gray-200 border-b border-gray-700">
                        <tr>
                          <th className="text-left py-3 text-base font-bold">
                            质押分布
                          </th>
                          <th className="text-right py-3 text-base font-bold">
                            百分比
                          </th>
                          <th className="text-right py-3 text-base font-bold">
                            状态
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-800">
                          <td className="py-3 text-base font-medium text-white">
                            您的质押
                          </td>
                          <td className="text-right py-3 text-lg font-bold text-cyan-400">
                            {userStakePercentage}%
                          </td>
                          <td className="text-right">
                            <span className="inline-block w-4 h-4 rounded-full bg-cyan-500 mr-2 align-middle"></span>
                            <span className="text-gray-200 text-base">
                              活跃
                            </span>
                          </td>
                        </tr>
                        <tr className="border-b border-gray-800">
                          <td className="py-3 text-base font-medium text-white">
                            其他质押者
                          </td>
                          <td className="text-right py-3 text-lg font-bold text-purple-400">
                            {100 - userStakePercentage}%
                          </td>
                          <td className="text-right">
                            <span className="inline-block w-4 h-4 rounded-full bg-purple-600 opacity-80 mr-2 align-middle"></span>
                            <span className="text-gray-200 text-base">
                              活跃
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="bg-gray-800/70 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-200 text-base mb-1">
                            您的排名
                          </p>
                          <p className="text-2xl font-bold text-cyan-400">
                            #{userRank}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-200 text-base mb-1">
                            总质押者
                          </p>
                          <p className="text-2xl font-bold text-purple-400">
                            {totalStakers}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-base font-medium text-gray-200 mt-4 py-2 bg-gray-800/50 rounded-lg">
                    质押分布详情
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
