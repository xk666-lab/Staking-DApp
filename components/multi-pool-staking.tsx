"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Flame, Shield, Zap, ArrowUpCircle, Info } from "lucide-react";
import { tokenABI, getContractAddresses } from "@/lib/contracts";
import dynamic from "next/dynamic";

// 动态导入组件内容，确保只在客户端渲染
const DynamicMultiPoolContent = dynamic(
  () => Promise.resolve(MultiPoolStakingContent),
  { ssr: false }
);

interface MultiPoolStakingProps {
  signer: ethers.Signer | null;
  account: string;
}

interface Pool {
  id: string;
  name: string;
  icon: React.ReactNode;
  apy: string;
  lockPeriod: string;
  minStake: string;
  totalStaked: string;
  userStaked: string;
  risk: "Low" | "Medium" | "High";
  address: string;
}

// 主导出组件
export function MultiPoolStaking(props: MultiPoolStakingProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-cyan-400">
          多池质押
        </CardTitle>
        <CardDescription className="text-base text-gray-300">
          选择最适合您的风险和回报组合
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DynamicMultiPoolContent {...props} />
      </CardContent>
    </Card>
  );
}

// 客户端渲染内容组件
function MultiPoolStakingContent({ signer, account }: MultiPoolStakingProps) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [stakeAmount, setStakeAmount] = useState("");
  const [activePool, setActivePool] = useState("stable");
  const [isStaking, setIsStaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();

  const { stakingTokenAddress } = getContractAddresses();

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchPools = async () => {
      if (!signer || !account || !isMounted) return;

      try {
        setLoading(true);

        // In a real implementation, you would fetch this data from your contracts
        // For demo purposes, we're using mock data
        const mockPools: Pool[] = [
          {
            id: "stable",
            name: "Stable Pool",
            icon: <Shield className="h-5 w-5 text-cyan-400" />,
            apy: "8.5%",
            lockPeriod: "No lock",
            minStake: "100",
            totalStaked: "1,250,000",
            userStaked: "0",
            risk: "Low",
            address: "0x1234...5678", // Mock address
          },
          {
            id: "growth",
            name: "Growth Pool",
            icon: <Zap className="h-5 w-5 text-purple-400" />,
            apy: "15.2%",
            lockPeriod: "30 days",
            minStake: "500",
            totalStaked: "850,000",
            userStaked: "0",
            risk: "Medium",
            address: "0x2345...6789", // Mock address
          },
          {
            id: "turbo",
            name: "Turbo Pool",
            icon: <Flame className="h-5 w-5 text-red-400" />,
            apy: "24.8%",
            lockPeriod: "90 days",
            minStake: "1000",
            totalStaked: "420,000",
            userStaked: "0",
            risk: "High",
            address: "0x3456...7890", // Mock address
          },
        ];

        // In a real implementation, you would fetch user's staked amounts for each pool
        // For now, we'll just set some mock data
        if (account) {
          mockPools[0].userStaked = "250";
          mockPools[1].userStaked = "750";
          mockPools[2].userStaked = "0";
        }

        setPools(mockPools);
      } catch (error) {
        console.error("Error fetching pools:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, [signer, account, isMounted]);

  const handleStake = async (poolId: string) => {
    if (!account) return;

    try {
      setIsStaking(true);
      console.log("开始质押流程，池ID:", poolId);

      // 获取当前pool对象
      const pool = pools.find((p) => p.id === poolId);
      if (!pool) {
        console.error("找不到对应的质押池");
        return;
      }

      // 使用真实的合约地址而不是pool.address (这是模拟数据)
      const { stakingAddress, stakingTokenAddress } = getContractAddresses();
      console.log("使用质押合约地址:", stakingAddress);

      // 简化的代币合约实例
      const tokenContract = new ethers.Contract(
        stakingTokenAddress,
        tokenABI,
        signer
      );

      // 检查授权额度
      console.log("检查代币授权...");
      const allowance = await tokenContract.allowance(account, stakingAddress);
      const amountToStake = ethers.parseEther(stakeAmount);
      console.log("当前授权额度:", ethers.formatEther(allowance));
      console.log("需要质押金额:", stakeAmount);

      if (allowance < amountToStake) {
        setIsApproving(true);
        console.log("授权代币中...");
        const approveTx = await tokenContract.approve(
          stakingAddress,
          amountToStake
        );
        toast({
          title: "授权处理中",
          description: "请在钱包中确认授权交易",
        });
        await approveTx.wait();
        setIsApproving(false);
        toast({
          title: "授权成功",
          description: "您的代币已成功授权给质押合约",
        });
      }

      // 在实际实现中，这里应该调用质押合约的质押功能
      // 对于演示目的，我们只是显示成功消息
      console.log("模拟质押交易...");

      // 模拟成功的质押
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "质押成功",
        description: `成功质押 ${stakeAmount} 代币到 ${pool.name}`,
      });

      // 更新UI以反映新的质押金额
      setPools(
        pools.map((p) =>
          p.id === poolId
            ? {
                ...p,
                userStaked: (
                  Number(p.userStaked) + Number(stakeAmount)
                ).toString(),
              }
            : p
        )
      );

      setStakeAmount("");
    } catch (error) {
      console.error("质押代币时出错:", error);
      toast({
        title: "质押失败",
        description: "无法质押代币，请重试",
        variant: "destructive",
      });
    } finally {
      setIsStaking(false);
      setIsApproving(false);
    }
  };

  const getRiskBadge = (risk: "Low" | "Medium" | "High") => {
    switch (risk) {
      case "Low":
        return (
          <Badge className="bg-cyan-900/50 text-cyan-300 border-cyan-700 text-base font-bold py-1 px-3">
            低风险
          </Badge>
        );
      case "Medium":
        return (
          <Badge className="bg-purple-900/50 text-purple-300 border-purple-700 text-base font-bold py-1 px-3">
            中等风险
          </Badge>
        );
      case "High":
        return (
          <Badge className="bg-red-900/50 text-red-300 border-red-700 text-base font-bold py-1 px-3">
            高风险
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm col-span-2">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
          多池质押
        </CardTitle>
        <CardDescription className="text-base text-gray-200">
          从具有不同风险/收益特性的多个质押池中选择
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <Tabs
            value={activePool}
            onValueChange={setActivePool}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-6 bg-gray-800/50">
              {pools.map((pool) => (
                <TabsTrigger
                  key={pool.id}
                  value={pool.id}
                  className="data-[state=active]:bg-gray-700 text-base font-medium"
                >
                  <div className="flex items-center">
                    {pool.icon}
                    <span className="ml-2">{pool.name}</span>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>

            {pools.map((pool) => (
              <TabsContent key={pool.id} value={pool.id} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-base font-bold mb-3 text-white">
                        池信息
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            年化收益率
                          </span>
                          <span className="font-bold text-lg text-cyan-400">
                            {pool.apy}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            锁定期
                          </span>
                          <span className="text-white font-medium text-base">
                            {pool.lockPeriod === "No lock"
                              ? "无锁定"
                              : pool.lockPeriod}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            最低质押量
                          </span>
                          <span className="text-white font-medium text-base">
                            {pool.minStake} 代币
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            总质押量
                          </span>
                          <span className="text-white font-medium text-base">
                            {pool.totalStaked} 代币
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            风险等级
                          </span>
                          <span>{getRiskBadge(pool.risk)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex items-center mb-3">
                        <Info className="h-5 w-5 mr-2 text-cyan-400" />
                        <h3 className="text-base font-bold text-white">
                          池描述
                        </h3>
                      </div>
                      <p className="text-base text-gray-200 leading-relaxed">
                        {pool.id === "stable"
                          ? "稳定池提供稳定的奖励，风险最小。无锁定期意味着您可以随时提取。"
                          : pool.id === "growth"
                          ? "增长池平衡了风险和回报，锁定期适中。年化收益率高于稳定池。"
                          : "涡轮池提供最高的潜在回报，但带有更高的风险和更长的锁定期。"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-gray-800/70 to-gray-900/70 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-base font-bold mb-3 text-white">
                        您的股份
                      </h3>
                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                          {pool.userStaked}
                        </div>
                        <div className="text-base text-gray-200 mt-1">
                          已质押代币
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            placeholder={`最低 ${pool.minStake} 代币`}
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white text-base"
                          />
                        </div>
                        <Button
                          onClick={() => handleStake(pool.id)}
                          disabled={
                            isStaking ||
                            isApproving ||
                            !stakeAmount ||
                            Number(stakeAmount) < Number(pool.minStake)
                          }
                          className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-base font-bold py-5 shadow-lg shadow-purple-900/20 transition-all hover:shadow-purple-900/40"
                        >
                          <ArrowUpCircle className="mr-2 h-5 w-5" />
                          {isApproving
                            ? "授权中..."
                            : isStaking
                            ? "质押中..."
                            : `在${
                                pool.name === "Stable Pool"
                                  ? "稳定池"
                                  : pool.name === "Growth Pool"
                                  ? "增长池"
                                  : "涡轮池"
                              }中质押`}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-base font-bold mb-3 text-white">
                        预计奖励
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">每日</span>
                          <span className="text-white font-medium text-base">
                            {(
                              (Number(pool.userStaked) *
                                Number(pool.apy.replace("%", ""))) /
                              36500
                            ).toFixed(4)}{" "}
                            代币
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">每周</span>
                          <span className="text-white font-medium text-base">
                            {(
                              (Number(pool.userStaked) *
                                Number(pool.apy.replace("%", ""))) /
                              5200
                            ).toFixed(4)}{" "}
                            代币
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">每月</span>
                          <span className="text-white font-medium text-base">
                            {(
                              (Number(pool.userStaked) *
                                Number(pool.apy.replace("%", ""))) /
                              1200
                            ).toFixed(4)}{" "}
                            代币
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">每年</span>
                          <span className="text-white font-medium text-base">
                            {(
                              (Number(pool.userStaked) *
                                Number(pool.apy.replace("%", ""))) /
                              100
                            ).toFixed(4)}{" "}
                            代币
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
      <CardFooter className="text-sm text-gray-300 border-t border-gray-800 pt-4 font-medium">
        注意: 年化收益率会根据市场情况变化
      </CardFooter>
    </Card>
  );
}
