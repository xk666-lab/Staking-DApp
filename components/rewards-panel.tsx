"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { GiftIcon, RefreshCw } from "lucide-react";
import { stakingABI, getContractAddresses } from "@/lib/contracts";

interface RewardsPanelProps {
  signer: ethers.Signer | null;
  account: string;
}

export function RewardsPanel({ signer, account }: RewardsPanelProps) {
  const [earnedRewards, setEarnedRewards] = useState("0");
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const { stakingAddress } = getContractAddresses();

  useEffect(() => {
    const fetchRewards = async () => {
      if (!signer || !account) return;

      try {
        setLoading(true);
        const stakingContract = new ethers.Contract(
          stakingAddress,
          stakingABI,
          signer
        );
        const earned = await stakingContract.earned(account);
        setEarnedRewards(ethers.formatEther(earned));
      } catch (error) {
        console.error("Error fetching rewards:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
    // Set up an interval to refresh rewards
    const interval = setInterval(fetchRewards, 10000);
    return () => clearInterval(interval);
  }, [signer, account, stakingAddress]);

  const handleClaimRewards = async () => {
    if (!signer) return;

    try {
      setIsClaimingRewards(true);
      const stakingContract = new ethers.Contract(
        stakingAddress,
        stakingABI,
        signer
      );

      const tx = await stakingContract.getReward();
      toast({
        title: "正在申领奖励",
        description: "请在您的钱包中确认交易",
      });
      await tx.wait();

      toast({
        title: "奖励申领成功",
        description: `成功申领 ${earnedRewards} 个奖励代币`,
      });

      // Refresh rewards
      const earned = await stakingContract.earned(account);
      setEarnedRewards(ethers.formatEther(earned));
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast({
        title: "申领失败",
        description: "申领奖励失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsClaimingRewards(false);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-cyan-400 font-bold">
          您的奖励
        </CardTitle>
        <CardDescription className="text-gray-300">
          申领您的质押奖励
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-lg p-6 border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-200 font-medium">已获得奖励：</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (signer && account) {
                      const stakingContract = new ethers.Contract(
                        stakingAddress,
                        stakingABI,
                        signer
                      );
                      stakingContract
                        .earned(account)
                        .then((earned: ethers.BigNumberish) => {
                          setEarnedRewards(ethers.formatEther(earned));
                        });
                    }
                  }}
                  className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                  {Number.parseFloat(earnedRewards).toFixed(6)}
                </div>
                <div className="text-base text-cyan-300 mt-2 font-medium">
                  奖励代币
                </div>
              </div>

              <Button
                onClick={handleClaimRewards}
                disabled={
                  isClaimingRewards || Number.parseFloat(earnedRewards) <= 0
                }
                className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-base font-medium py-5"
              >
                <GiftIcon className="mr-2 h-5 w-5" />
                {isClaimingRewards ? "申领中..." : "申领奖励"}
              </Button>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-base font-medium mb-3 text-purple-300">
                奖励信息
              </h3>
              <ul className="space-y-2.5 text-sm text-gray-300">
                <li>• 奖励根据您的质押时长和金额计算</li>
                <li>• 奖励实时累积增长</li>
                <li>• 您可以随时申领奖励</li>
                <li>• 未申领的奖励在取消质押后仍然可用</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
