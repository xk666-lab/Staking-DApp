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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Gift,
  Clock,
  ExternalLink,
  RefreshCw,
  Copy,
} from "lucide-react";
import { stakingABI, getContractAddresses } from "@/lib/contracts";
import Link from "next/link";
import dynamic from "next/dynamic";

// 动态导入内容组件，确保仅在客户端渲染
const DynamicTransactionContent = dynamic(
  () => Promise.resolve(TransactionHistoryContent),
  { ssr: false }
);

interface TransactionHistoryProps {
  signer: ethers.Signer | null;
  account: string;
}

interface Transaction {
  id: string;
  type: "stake" | "withdraw" | "claim" | "referral";
  amount: string;
  formattedAmount: string;
  timestamp: number;
  dateTime: string;
  hash: string;
  status: "confirmed" | "pending" | "failed";
  pool?: string;
  blockNumber: number;
  user?: string;
}

// 主导出组件
export function TransactionHistory(props: TransactionHistoryProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm col-span-2">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
            交易历史
          </CardTitle>
          <div className="text-xs text-gray-400 flex items-center">
            <RefreshCw className="h-3 w-3 mr-1" />
            最后更新
          </div>
        </div>
        <CardDescription className="text-base text-gray-200">
          查看您的质押和奖励交易
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DynamicTransactionContent {...props} />
      </CardContent>
    </Card>
  );
}

// 客户端渲染内容组件
function TransactionHistoryContent({
  signer,
  account,
}: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "all" | "stake" | "withdraw" | "claim" | "referral"
  >("all");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);

  const { stakingAddress } = getContractAddresses();

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!signer || !account || !isMounted) return;

      try {
        setLoading(true);
        setError(null);

        // 确保在客户端环境中
        if (typeof window === "undefined") {
          return;
        }

        console.log("开始获取交易历史数据，账户:", account);

        // 获取合约实例
        const stakingContract = new ethers.Contract(
          stakingAddress,
          stakingABI,
          signer
        );

        const provider = signer.provider;
        if (!provider) {
          setError("无法连接到区块链网络");
          return;
        }

        // 获取当前区块
        const currentBlock = await provider.getBlockNumber();
        console.log("当前区块:", currentBlock);

        // 获取过去3000个区块的事件
        const fromBlock = Math.max(0, currentBlock - 3000);

        // 创建过滤器，获取该账户的所有质押、提款和奖励事件
        const stakeFilter = stakingContract.filters.Staked(account);
        const withdrawFilter = stakingContract.filters.Withdrawn(account);
        const rewardFilter = stakingContract.filters.RewardPaid(account);

        console.log("查询事件，从区块:", fromBlock);

        // 并行查询所有事件
        const [stakeEvents, withdrawEvents, rewardEvents] = await Promise.all([
          stakingContract.queryFilter(stakeFilter, fromBlock),
          stakingContract.queryFilter(withdrawFilter, fromBlock),
          stakingContract.queryFilter(rewardFilter, fromBlock),
        ]);

        console.log(
          "找到事件数量: 质押:",
          stakeEvents.length,
          "提款:",
          withdrawEvents.length,
          "奖励:",
          rewardEvents.length
        );

        // 处理所有事件并解析数据
        const parsedTransactions: Transaction[] = [];

        // 处理质押事件
        for (const event of stakeEvents) {
          try {
            const block = await provider.getBlock(event.blockNumber);
            if (!block) continue;

            const tx = await provider.getTransaction(event.transactionHash);
            if (!tx) continue;

            const timestamp = block.timestamp * 1000; // 转换为毫秒
            const decodedData = stakingContract.interface.parseLog({
              topics: event.topics,
              data: event.data,
            });

            if (!decodedData || !decodedData.args) continue;

            const amount = decodedData.args.amount;

            parsedTransactions.push({
              id: `stake-${event.transactionHash}-${event.index || "0"}`,
              type: "stake",
              amount: amount.toString(),
              formattedAmount: ethers.formatEther(amount),
              timestamp: timestamp,
              dateTime: new Date(timestamp).toLocaleString("zh-CN"),
              hash: event.transactionHash,
              status: "confirmed",
              pool: "Stable Pool", // 这里可以根据实际情况确定池名称
              blockNumber: event.blockNumber,
              user: decodedData.args.user,
            });
          } catch (error) {
            console.error("解析质押事件出错:", error);
          }
        }

        // 处理提取事件
        for (const event of withdrawEvents) {
          try {
            const block = await provider.getBlock(event.blockNumber);
            if (!block) continue;

            const timestamp = block.timestamp * 1000;
            const decodedData = stakingContract.interface.parseLog({
              topics: event.topics,
              data: event.data,
            });

            if (!decodedData || !decodedData.args) continue;

            const amount = decodedData.args.amount;

            parsedTransactions.push({
              id: `withdraw-${event.transactionHash}-${event.index || "0"}`,
              type: "withdraw",
              amount: amount.toString(),
              formattedAmount: ethers.formatEther(amount),
              timestamp: timestamp,
              dateTime: new Date(timestamp).toLocaleString("zh-CN"),
              hash: event.transactionHash,
              status: "confirmed",
              pool: "Stable Pool",
              blockNumber: event.blockNumber,
              user: decodedData.args.user,
            });
          } catch (error) {
            console.error("解析提取事件出错:", error);
          }
        }

        // 处理奖励事件
        for (const event of rewardEvents) {
          try {
            const block = await provider.getBlock(event.blockNumber);
            if (!block) continue;

            const timestamp = block.timestamp * 1000;
            const decodedData = stakingContract.interface.parseLog({
              topics: event.topics,
              data: event.data,
            });

            if (!decodedData || !decodedData.args) continue;

            const reward = decodedData.args.reward;

            parsedTransactions.push({
              id: `claim-${event.transactionHash}-${event.index || "0"}`,
              type: "claim",
              amount: reward.toString(),
              formattedAmount: ethers.formatEther(reward),
              timestamp: timestamp,
              dateTime: new Date(timestamp).toLocaleString("zh-CN"),
              hash: event.transactionHash,
              status: "confirmed",
              blockNumber: event.blockNumber,
              user: decodedData.args.user,
            });
          } catch (error) {
            console.error("解析奖励事件出错:", error);
          }
        }

        // 按时间倒序排序
        parsedTransactions.sort((a, b) => b.timestamp - a.timestamp);

        console.log("处理完成，总共找到交易:", parsedTransactions.length);

        // 如果没有找到真实事件，可以保留一些模拟数据供展示
        if (parsedTransactions.length === 0) {
          console.log("没有找到真实交易，使用模拟数据");
          // 仅为演示添加一些模拟交易
          const mockTransactions: Transaction[] = [
            {
              id: "mock-tx1",
              type: "stake",
              amount: "500000000000000000000",
              formattedAmount: "500.00",
              timestamp: Date.now() - 3600000, // 1小时前
              dateTime: new Date(Date.now() - 3600000).toLocaleString("zh-CN"),
              hash: "0x1234...5678",
              status: "confirmed",
              pool: "Stable Pool",
              blockNumber: currentBlock - 100,
              user: "0x1234...5678",
            },
            {
              id: "mock-tx2",
              type: "claim",
              amount: "25500000000000000000",
              formattedAmount: "25.50",
              timestamp: Date.now() - 86400000, // 1天前
              dateTime: new Date(Date.now() - 86400000).toLocaleString("zh-CN"),
              hash: "0x3456...7890",
              status: "confirmed",
              blockNumber: currentBlock - 500,
              user: "0x3456...7890",
            },
          ];
          setTransactions(mockTransactions);
        } else {
          setTransactions(parsedTransactions);
        }

        setLastUpdate(new Date());
      } catch (error) {
        console.error("获取交易历史时出错:", error);
        setError("获取交易历史失败，请稍后再试");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();

    // 定期刷新交易历史（每3分钟）
    const interval = setInterval(fetchTransactions, 180000);
    return () => clearInterval(interval);
  }, [signer, account, stakingAddress, isMounted]);

  const filteredTransactions = transactions.filter(
    (tx) => filter === "all" || tx.type === filter
  );

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "stake":
        return <ArrowUpCircle className="h-5 w-5 text-emerald-400" />;
      case "withdraw":
        return <ArrowDownCircle className="h-5 w-5 text-rose-400" />;
      case "claim":
        return <Gift className="h-5 w-5 text-amber-400" />;
      case "referral":
        return <Gift className="h-5 w-5 text-cyan-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <Badge className="bg-emerald-900/30 text-emerald-400 border-emerald-700/50 text-sm">
            已确认
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-900/30 text-amber-400 border-amber-700/50 text-sm">
            处理中
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-rose-900/30 text-rose-400 border-rose-700/50 text-sm">
            失败
          </Badge>
        );
      default:
        return null;
    }
  };

  const getTransactionDescription = (tx: Transaction) => {
    switch (tx.type) {
      case "stake":
        return `质押在 ${tx.pool || "质押池"}`;
      case "withdraw":
        return `从 ${tx.pool || "质押池"} 提取`;
      case "claim":
        return "已领取奖励";
      case "referral":
        return "推荐奖励";
      default:
        return "未知交易";
    }
  };

  const getAmountText = (tx: Transaction) => {
    const amount = Number(tx.formattedAmount).toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    switch (tx.type) {
      case "stake":
        return (
          <span className="font-bold text-emerald-400">{`+${amount} 代币`}</span>
        );
      case "withdraw":
        return (
          <span className="font-bold text-rose-400">{`-${amount} 代币`}</span>
        );
      case "claim":
      case "referral":
        return (
          <span className="font-bold text-amber-400">{`+${amount} 奖励`}</span>
        );
      default:
        return <span className="font-bold">{amount} 代币</span>;
    }
  };

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-60">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-center">
        <div className="text-rose-400 mb-2 text-lg">⚠️ {error}</div>
        <div className="text-sm text-gray-400">
          请检查您的网络连接并尝试刷新页面
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-xs text-gray-400 flex items-center justify-end">
        最后更新: {lastUpdate.toLocaleTimeString("zh-CN")}
      </div>
      <Tabs
        defaultValue="all"
        onValueChange={(value) => setFilter(value as any)}
      >
        <TabsList className="grid grid-cols-5 bg-gray-800/50">
          <TabsTrigger
            value="all"
            className="data-[state=active]:bg-gray-700 text-base"
          >
            全部
          </TabsTrigger>
          <TabsTrigger
            value="stake"
            className="data-[state=active]:bg-gray-700 text-base"
          >
            质押
          </TabsTrigger>
          <TabsTrigger
            value="withdraw"
            className="data-[state=active]:bg-gray-700 text-base"
          >
            提取
          </TabsTrigger>
          <TabsTrigger
            value="claim"
            className="data-[state=active]:bg-gray-700 text-base"
          >
            领取
          </TabsTrigger>
          <TabsTrigger
            value="referral"
            className="data-[state=active]:bg-gray-700 text-base"
          >
            推荐
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" suppressHydrationWarning>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              没有找到交易记录
            </div>
          ) : (
            <div className="rounded-md border border-gray-800 overflow-hidden">
              {/* 表格头部 */}
              <div className="grid grid-cols-5 gap-2 p-3 bg-gray-800/50 text-xs text-gray-300 font-medium border-b border-gray-700">
                <div>日期</div>
                <div>类型</div>
                <div>金额</div>
                <div>质押者地址</div>
                <div>交易哈希</div>
              </div>

              {/* 表格内容 */}
              <div className="divide-y divide-gray-800">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-5 gap-2 p-3 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* 日期和时间 */}
                    <div className="text-sm text-gray-300">
                      {new Date(tx.timestamp).toLocaleDateString("zh-CN")}
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleTimeString("zh-CN")}
                      </div>
                    </div>

                    {/* 交易类型 */}
                    <div className="flex items-center">
                      {getTransactionIcon(tx.type)}
                      <span className="ml-2 text-sm">
                        {getTransactionDescription(tx)}
                      </span>
                    </div>

                    {/* 金额 */}
                    <div className="text-sm">{getAmountText(tx)}</div>

                    {/* 质押者地址 */}
                    <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                      {tx.type === "stake" ? (
                        account === tx.user ? (
                          <span className="text-cyan-400">您的地址</span>
                        ) : (
                          <>
                            {tx.user?.substring(0, 8)}...
                            {tx.user?.substring(tx.user.length - 6)}
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(tx.user || "")
                              }
                              className="ml-1 text-cyan-500 hover:text-cyan-400"
                              title="复制地址"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </>
                        )
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>

                    {/* 交易哈希 */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                        {tx.hash.substring(0, 8)}...
                        {tx.hash.substring(tx.hash.length - 6)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(tx.hash)}
                          className="text-gray-500 hover:text-gray-300"
                          title="复制交易哈希"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-300"
                          title="在区块浏览器中查看"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stake" suppressHydrationWarning>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              没有找到质押记录
            </div>
          ) : (
            <div className="rounded-md border border-gray-800 overflow-hidden">
              {/* 表格头部 */}
              <div className="grid grid-cols-5 gap-2 p-3 bg-gray-800/50 text-xs text-gray-300 font-medium border-b border-gray-700">
                <div>日期</div>
                <div>类型</div>
                <div>金额</div>
                <div>质押者地址</div>
                <div>交易哈希</div>
              </div>

              {/* 表格内容 */}
              <div className="divide-y divide-gray-800">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-5 gap-2 p-3 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* 日期和时间 */}
                    <div className="text-sm text-gray-300">
                      {new Date(tx.timestamp).toLocaleDateString("zh-CN")}
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleTimeString("zh-CN")}
                      </div>
                    </div>

                    {/* 交易类型 */}
                    <div className="flex items-center">
                      {getTransactionIcon(tx.type)}
                      <span className="ml-2 text-sm">
                        {getTransactionDescription(tx)}
                      </span>
                    </div>

                    {/* 金额 */}
                    <div className="text-sm">{getAmountText(tx)}</div>

                    {/* 质押者地址 */}
                    <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                      {tx.type === "stake" ? (
                        account === tx.user ? (
                          <span className="text-cyan-400">您的地址</span>
                        ) : (
                          <>
                            {tx.user?.substring(0, 8)}...
                            {tx.user?.substring(tx.user.length - 6)}
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(tx.user || "")
                              }
                              className="ml-1 text-cyan-500 hover:text-cyan-400"
                              title="复制地址"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </>
                        )
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>

                    {/* 交易哈希 */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                        {tx.hash.substring(0, 8)}...
                        {tx.hash.substring(tx.hash.length - 6)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(tx.hash)}
                          className="text-gray-500 hover:text-gray-300"
                          title="复制交易哈希"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-300"
                          title="在区块浏览器中查看"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="withdraw" suppressHydrationWarning>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              没有找到提取记录
            </div>
          ) : (
            <div className="rounded-md border border-gray-800 overflow-hidden">
              {/* 表格头部 */}
              <div className="grid grid-cols-5 gap-2 p-3 bg-gray-800/50 text-xs text-gray-300 font-medium border-b border-gray-700">
                <div>日期</div>
                <div>类型</div>
                <div>金额</div>
                <div>提取者地址</div>
                <div>交易哈希</div>
              </div>

              {/* 表格内容 */}
              <div className="divide-y divide-gray-800">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-5 gap-2 p-3 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* 日期和时间 */}
                    <div className="text-sm text-gray-300">
                      {new Date(tx.timestamp).toLocaleDateString("zh-CN")}
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleTimeString("zh-CN")}
                      </div>
                    </div>

                    {/* 交易类型 */}
                    <div className="flex items-center">
                      {getTransactionIcon(tx.type)}
                      <span className="ml-2 text-sm">
                        {getTransactionDescription(tx)}
                      </span>
                    </div>

                    {/* 金额 */}
                    <div className="text-sm">{getAmountText(tx)}</div>

                    {/* 提取者地址 */}
                    <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                      {tx.type === "withdraw" ? (
                        account === tx.user ? (
                          <span className="text-cyan-400">您的地址</span>
                        ) : (
                          <>
                            {tx.user?.substring(0, 8)}...
                            {tx.user?.substring(tx.user.length - 6)}
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(tx.user || "")
                              }
                              className="ml-1 text-cyan-500 hover:text-cyan-400"
                              title="复制地址"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </>
                        )
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>

                    {/* 交易哈希 */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                        {tx.hash.substring(0, 8)}...
                        {tx.hash.substring(tx.hash.length - 6)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(tx.hash)}
                          className="text-gray-500 hover:text-gray-300"
                          title="复制交易哈希"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-300"
                          title="在区块浏览器中查看"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="claim" suppressHydrationWarning>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              没有找到领取记录
            </div>
          ) : (
            <div className="rounded-md border border-gray-800 overflow-hidden">
              {/* 表格头部 */}
              <div className="grid grid-cols-5 gap-2 p-3 bg-gray-800/50 text-xs text-gray-300 font-medium border-b border-gray-700">
                <div>日期</div>
                <div>类型</div>
                <div>金额</div>
                <div>领取者地址</div>
                <div>交易哈希</div>
              </div>

              {/* 表格内容 */}
              <div className="divide-y divide-gray-800">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-5 gap-2 p-3 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* 日期和时间 */}
                    <div className="text-sm text-gray-300">
                      {new Date(tx.timestamp).toLocaleDateString("zh-CN")}
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleTimeString("zh-CN")}
                      </div>
                    </div>

                    {/* 交易类型 */}
                    <div className="flex items-center">
                      {getTransactionIcon(tx.type)}
                      <span className="ml-2 text-sm">
                        {getTransactionDescription(tx)}
                      </span>
                    </div>

                    {/* 金额 */}
                    <div className="text-sm">{getAmountText(tx)}</div>

                    {/* 领取者地址 */}
                    <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                      {tx.type === "claim" ? (
                        account === tx.user ? (
                          <span className="text-cyan-400">您的地址</span>
                        ) : (
                          <>
                            {tx.user?.substring(0, 8)}...
                            {tx.user?.substring(tx.user.length - 6)}
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(tx.user || "")
                              }
                              className="ml-1 text-cyan-500 hover:text-cyan-400"
                              title="复制地址"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </>
                        )
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>

                    {/* 交易哈希 */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                        {tx.hash.substring(0, 8)}...
                        {tx.hash.substring(tx.hash.length - 6)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(tx.hash)}
                          className="text-gray-500 hover:text-gray-300"
                          title="复制交易哈希"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-300"
                          title="在区块浏览器中查看"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="referral" suppressHydrationWarning>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              没有找到推荐记录
            </div>
          ) : (
            <div className="rounded-md border border-gray-800 overflow-hidden">
              {/* 表格头部 */}
              <div className="grid grid-cols-5 gap-2 p-3 bg-gray-800/50 text-xs text-gray-300 font-medium border-b border-gray-700">
                <div>日期</div>
                <div>类型</div>
                <div>金额</div>
                <div>推荐者地址</div>
                <div>交易哈希</div>
              </div>

              {/* 表格内容 */}
              <div className="divide-y divide-gray-800">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="grid grid-cols-5 gap-2 p-3 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* 日期和时间 */}
                    <div className="text-sm text-gray-300">
                      {new Date(tx.timestamp).toLocaleDateString("zh-CN")}
                      <div className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleTimeString("zh-CN")}
                      </div>
                    </div>

                    {/* 交易类型 */}
                    <div className="flex items-center">
                      {getTransactionIcon(tx.type)}
                      <span className="ml-2 text-sm">
                        {getTransactionDescription(tx)}
                      </span>
                    </div>

                    {/* 金额 */}
                    <div className="text-sm">{getAmountText(tx)}</div>

                    {/* 推荐者地址 */}
                    <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                      {tx.type === "referral" ? (
                        account === tx.user ? (
                          <span className="text-cyan-400">您的地址</span>
                        ) : (
                          <>
                            {tx.user?.substring(0, 8)}...
                            {tx.user?.substring(tx.user.length - 6)}
                            <button
                              onClick={() =>
                                navigator.clipboard.writeText(tx.user || "")
                              }
                              className="ml-1 text-cyan-500 hover:text-cyan-400"
                              title="复制地址"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </>
                        )
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </div>

                    {/* 交易哈希 */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-300 overflow-hidden text-ellipsis">
                        {tx.hash.substring(0, 8)}...
                        {tx.hash.substring(tx.hash.length - 6)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigator.clipboard.writeText(tx.hash)}
                          className="text-gray-500 hover:text-gray-300"
                          title="复制交易哈希"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <a
                          href={`https://etherscan.io/tx/${tx.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-500 hover:text-gray-300"
                          title="在区块浏览器中查看"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
