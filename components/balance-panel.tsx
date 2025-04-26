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
import { Skeleton } from "@/components/ui/skeleton";
import { tokenABI, getContractAddresses } from "@/lib/contracts";
import { Wallet, CreditCard, RefreshCw, Shield, User } from "lucide-react";

interface BalancePanelProps {
  signer: ethers.Signer | null;
  account: string;
  isOwner: boolean;
}

export function BalancePanel({ signer, account, isOwner }: BalancePanelProps) {
  const [stakingBalance, setStakingBalance] = useState("0");
  const [rewardBalance, setRewardBalance] = useState("0");
  const [stakedAmount, setStakedAmount] = useState("0");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { stakingTokenAddress, rewardsTokenAddress, stakingAddress } =
    getContractAddresses();

  useEffect(() => {
    const fetchBalances = async () => {
      if (!signer || !account) return;

      try {
        setIsLoading(true);

        // 获取代币合约
        const stakingToken = new ethers.Contract(
          stakingTokenAddress,
          tokenABI,
          signer
        );
        const rewardToken = new ethers.Contract(
          rewardsTokenAddress,
          tokenABI,
          signer
        );

        // 获取质押合约
        const stakingContract = new ethers.Contract(
          stakingAddress,
          ["function balanceOf(address) view returns (uint256)"],
          signer
        );

        // 获取当前账户余额
        const stakingBal = await stakingToken.balanceOf(account);
        const rewardBal = await rewardToken.balanceOf(account);
        const stakedBal = await stakingContract.balanceOf(account);

        setStakingBalance(ethers.formatEther(stakingBal));
        setRewardBalance(ethers.formatEther(rewardBal));
        setStakedAmount(ethers.formatEther(stakedBal));

        setLastUpdate(new Date());
      } catch (error) {
        console.error("获取余额时出错:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
    // 每30秒刷新一次
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [
    signer,
    account,
    stakingAddress,
    stakingTokenAddress,
    rewardsTokenAddress,
  ]);

  // 格式化数字，添加千位分隔符并保留2位小数
  const formatNumber = (value: string) => {
    const num = parseFloat(value);
    return num.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl text-blue-400">账户余额</CardTitle>
            {isOwner ? (
              <Badge className="bg-purple-500/30 text-purple-200 border-purple-500/40 text-xs">
                管理员
              </Badge>
            ) : (
              <Badge className="bg-cyan-500/30 text-cyan-200 border-cyan-500/40 text-xs">
                用户
              </Badge>
            )}
          </div>
          <Badge
            variant="outline"
            className="flex items-center gap-1 text-xs py-1 px-2 border-gray-700 text-gray-300"
          >
            <RefreshCw className="h-3 w-3" />
            {lastUpdate.toLocaleTimeString("zh-CN")}
          </Badge>
        </div>
        <CardDescription className="text-gray-300">
          {isOwner ? "查看您作为管理员的代币余额" : "查看您的代币余额"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-200 flex items-center font-medium">
                <Wallet className="h-3 w-3 mr-1 text-cyan-400" />
                质押代币
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-full bg-gray-700" />
            ) : (
              <span className="text-lg font-semibold text-white">
                {formatNumber(stakingBalance)}
              </span>
            )}
            <div className="text-xs text-cyan-300/90 mt-1 font-medium">
              可用于质押
            </div>
          </div>

          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-200 flex items-center font-medium">
                <Shield className="h-3 w-3 mr-1 text-purple-400" />
                已质押量
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-full bg-gray-700" />
            ) : (
              <span className="text-lg font-semibold text-white">
                {formatNumber(stakedAmount)}
              </span>
            )}
            <div className="text-xs text-purple-300/90 mt-1 font-medium">
              正在产生奖励
            </div>
          </div>

          <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-gray-200 flex items-center font-medium">
                <CreditCard className="h-3 w-3 mr-1 text-yellow-400" />
                奖励代币
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-full bg-gray-700" />
            ) : (
              <span className="text-lg font-semibold text-white">
                {formatNumber(rewardBalance)}
              </span>
            )}
            <div className="text-xs text-yellow-300/90 mt-1 font-medium">
              {isOwner ? "用于分配奖励" : "已获得的奖励"}
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-300 pt-2 font-medium">
          余额每30秒自动更新一次。
          {isOwner
            ? "您可以在Admin面板中设置奖励参数。"
            : "质押代币可以获取奖励。"}
        </div>
      </CardContent>
    </Card>
  );
}
