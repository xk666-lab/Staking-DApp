"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Shield, Clock, Info, RefreshCw, Calendar } from "lucide-react";
import { stakingABI, tokenABI, getContractAddresses } from "@/lib/contracts";

interface AdminPanelProps {
  signer: ethers.Signer | null;
}

export function AdminPanel({ signer }: AdminPanelProps) {
  const [rewardAmount, setRewardAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [isSettingRewards, setIsSettingRewards] = useState(false);
  const [isSettingDuration, setIsSettingDuration] = useState(false);
  const [isResettingCycle, setIsResettingCycle] = useState(false);
  const [cycleStatus, setCycleStatus] = useState({
    endTime: 0,
    isActive: false,
    remainingTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const { stakingAddress, rewardsTokenAddress } = getContractAddresses();

  // 获取奖励周期状态
  const fetchCycleStatus = async () => {
    if (!signer) return;

    try {
      setIsLoading(true);
      const stakingContract = new ethers.Contract(
        stakingAddress,
        stakingABI,
        signer
      );

      const status = await stakingContract.getRewardCycleStatus();
      setCycleStatus({
        endTime: Number(status.endTime),
        isActive: status.isActive,
        remainingTime: Number(status.remainingTime),
      });

      console.log("奖励周期状态:", status);
    } catch (error) {
      console.error("获取奖励周期状态出错:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (signer) {
      fetchCycleStatus();

      // 每30秒刷新一次状态
      const interval = setInterval(fetchCycleStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [signer]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "0秒";

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    let result = "";
    if (days > 0) result += `${days}天 `;
    if (hours > 0) result += `${hours}小时 `;
    if (minutes > 0) result += `${minutes}分钟 `;
    if (remainingSeconds > 0) result += `${remainingSeconds}秒`;

    return result.trim();
  };

  const formatDateTime = (timestamp: number) => {
    if (timestamp <= 0) return "无";

    const date = new Date(timestamp * 1000);
    return date.toLocaleString("zh-CN");
  };

  const handleSetRewardAmount = async () => {
    if (!signer || !rewardAmount) return;

    try {
      setIsSettingRewards(true);
      const stakingContract = new ethers.Contract(
        stakingAddress,
        stakingABI,
        signer
      );
      const tokenContract = new ethers.Contract(
        rewardsTokenAddress,
        tokenABI,
        signer
      );

      // Check allowance
      const account = await signer.getAddress();
      const allowance = await tokenContract.allowance(account, stakingAddress);
      const amountToReward = ethers.parseEther(rewardAmount);

      if (allowance < amountToReward) {
        const approveTx = await tokenContract.approve(
          stakingAddress,
          amountToReward
        );
        toast({
          title: "授权处理中",
          description: "请在钱包中确认授权交易",
        });
        await approveTx.wait();
        toast({
          title: "授权成功",
          description: "您的代币已成功授权给质押合约",
        });
      }

      const tx = await stakingContract.notifyRewardAmount(amountToReward);
      toast({
        title: "设置奖励处理中",
        description: "请在钱包中确认交易",
      });
      await tx.wait();

      toast({
        title: "奖励设置成功",
        description: `成功设置 ${rewardAmount} 代币作为奖励`,
      });

      setRewardAmount("");
      fetchCycleStatus();
    } catch (error) {
      console.error("Error setting reward amount:", error);
      toast({
        title: "设置奖励失败",
        description: "无法设置奖励金额，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsSettingRewards(false);
    }
  };

  const handleSetDuration = async () => {
    if (!signer || !duration) return;

    try {
      setIsSettingDuration(true);
      const stakingContract = new ethers.Contract(
        stakingAddress,
        stakingABI,
        signer
      );

      const tx = await stakingContract.setRewardsDuration(
        Number.parseInt(duration) * 86400
      ); // Convert days to seconds
      toast({
        title: "设置周期处理中",
        description: "请在钱包中确认交易",
      });
      await tx.wait();

      toast({
        title: "周期设置成功",
        description: `成功设置奖励周期为 ${duration} 天`,
      });

      setDuration("");
      fetchCycleStatus();
    } catch (error) {
      console.error("Error setting duration:", error);
      toast({
        title: "设置周期失败",
        description: "无法设置奖励周期，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsSettingDuration(false);
    }
  };

  const handleResetCycle = async () => {
    if (!signer) return;

    try {
      setIsResettingCycle(true);
      const stakingContract = new ethers.Contract(
        stakingAddress,
        stakingABI,
        signer
      );

      const tx = await stakingContract.resetRewardsCycle();
      toast({
        title: "重置周期处理中",
        description: "请在钱包中确认交易",
      });
      await tx.wait();

      toast({
        title: "周期重置成功",
        description: "已成功重置奖励周期，现在可以设置新的周期和奖励了",
      });

      fetchCycleStatus();
    } catch (error) {
      console.error("Error resetting reward cycle:", error);
      toast({
        title: "重置周期失败",
        description: "无法重置奖励周期，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsResettingCycle(false);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-purple-400">管理员面板</CardTitle>
        <CardDescription>管理质押奖励和参数</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gray-800/30 p-4 rounded-lg mb-4 border border-gray-700">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="mb-2">管理员功能说明：</p>
              <ul className="list-disc pl-5 space-y-1 text-gray-400">
                <li>设置奖励周期后，再设置奖励金额</li>
                <li>
                  如果当前有活跃的奖励周期，您可以使用"重置周期"按钮终止它
                </li>
                <li>设置的奖励金额将在整个奖励周期内平均分配</li>
                <li>管理员需要拥有足够的奖励代币才能设置奖励</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 p-4 rounded-lg mb-4 border border-gray-700">
          <h3 className="text-sm font-medium flex items-center mb-3">
            <Calendar className="h-4 w-4 mr-2 text-yellow-400" />
            当前奖励周期状态
          </h3>
          {isLoading ? (
            <p className="text-sm text-gray-400 flex items-center">
              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
              加载中...
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-gray-800/50 rounded border border-gray-700">
                <span className="text-gray-400 block mb-1">周期结束时间:</span>
                <span className="font-medium">
                  {formatDateTime(cycleStatus.endTime)}
                </span>
              </div>
              <div className="p-2 bg-gray-800/50 rounded border border-gray-700">
                <span className="text-gray-400 block mb-1">周期状态:</span>
                <span
                  className={`font-medium ${
                    cycleStatus.isActive ? "text-green-400" : "text-gray-400"
                  }`}
                >
                  {cycleStatus.isActive ? "活跃中" : "未开始/已结束"}
                </span>
              </div>
              {cycleStatus.isActive && (
                <div className="p-2 bg-gray-800/50 rounded border border-gray-700 md:col-span-2">
                  <span className="text-gray-400 block mb-1">剩余时间:</span>
                  <span className="font-medium">
                    {formatTime(cycleStatus.remainingTime)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center">
            <Shield className="h-4 w-4 mr-2 text-cyan-400" />
            设置奖励金额
          </h3>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="奖励代币数量"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              onClick={handleSetRewardAmount}
              disabled={
                isSettingRewards ||
                !rewardAmount ||
                Number.parseFloat(rewardAmount) <= 0
              }
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              {isSettingRewards ? "设置中..." : "设置"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            设置在奖励周期内分发的代币总量，这些代币将作为质押奖励
          </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2 text-purple-400" />
            设置奖励周期
          </h3>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="周期天数"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              onClick={handleSetDuration}
              disabled={
                isSettingDuration || !duration || Number.parseInt(duration) <= 0
              }
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
            >
              {isSettingDuration ? "设置中..." : "设置"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            设置奖励分发的时间长度（以天为单位）
          </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center">
            <RefreshCw className="h-4 w-4 mr-2 text-yellow-400" />
            重置奖励周期
          </h3>
          <Button
            onClick={handleResetCycle}
            disabled={isResettingCycle || !cycleStatus.isActive}
            className="w-full bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-700 hover:to-amber-600"
          >
            {isResettingCycle ? "重置中..." : "重置当前周期"}
          </Button>
          <p className="text-xs text-gray-500">
            立即结束当前奖励周期，允许设置新的周期和奖励。仅在有活跃周期时可用。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
