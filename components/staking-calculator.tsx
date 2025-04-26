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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Calculator, TrendingUp } from "lucide-react";
import { stakingABI, getContractAddresses } from "@/lib/contracts";

interface StakingCalculatorProps {
  signer: ethers.Signer | null;
}

export function StakingCalculator({ signer }: StakingCalculatorProps) {
  const [amount, setAmount] = useState("1000");
  const [duration, setDuration] = useState(30);
  const [apy, setApy] = useState(0);
  const [estimatedRewards, setEstimatedRewards] = useState("0");
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const { stakingAddress } = getContractAddresses();

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchAPY = async () => {
      if (!signer || !isMounted) return;

      try {
        setLoading(true);
        const stakingContract = new ethers.Contract(
          stakingAddress,
          stakingABI,
          signer
        );

        // Calculate APY based on current reward rate and total supply
        const rewardRate = await stakingContract.rewardRate();
        const totalSupply = await stakingContract.totalSupply();

        // APY calculation: (rewardRate * 86400 * 365 * 100) / totalSupply
        const calculatedApy =
          Number(ethers.formatEther(totalSupply)) > 0
            ? (Number(ethers.formatEther(rewardRate)) * 86400 * 365 * 100) /
              Number(ethers.formatEther(totalSupply))
            : 15; // Default APY if totalSupply is 0

        setApy(calculatedApy);
      } catch (error) {
        console.error("Error fetching APY:", error);
        setApy(15); // Default APY in case of error
      } finally {
        setLoading(false);
      }
    };

    fetchAPY();
  }, [signer, stakingAddress, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    // Calculate estimated rewards based on amount, duration, and APY
    const principal = Number.parseFloat(amount) || 0;
    const durationInYears = duration / 365;
    const rewards = principal * (apy / 100) * durationInYears;

    setEstimatedRewards(rewards.toFixed(2));
  }, [amount, duration, apy, isMounted]);

  // 如果组件尚未在客户端挂载，则返回加载状态
  if (!isMounted) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl text-cyan-400">
            Rewards Calculator
          </CardTitle>
          <CardDescription>
            Estimate your potential staking rewards
          </CardDescription>
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
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-cyan-400">
          Rewards Calculator
        </CardTitle>
        <CardDescription>
          Estimate your potential staking rewards
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="stake-amount">Stake Amount</Label>
              <div className="relative">
                <Input
                  id="stake-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-gray-800 border-gray-700 pr-16"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                  Tokens
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="stake-duration">Staking Period</Label>
                <span className="text-sm text-gray-400">{duration} days</span>
              </div>
              <Slider
                id="stake-duration"
                min={1}
                max={365}
                step={1}
                value={[duration]}
                onValueChange={(value) => setDuration(value[0])}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1 day</span>
                <span>180 days</span>
                <span>365 days</span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center mb-4">
                <Calculator className="h-5 w-5 mr-2 text-cyan-400" />
                <h3 className="font-medium">Estimated Returns</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Current APY</div>
                  <div className="text-2xl font-bold text-cyan-400">
                    {apy.toFixed(2)}%
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-400">Estimated Rewards</div>
                  <div className="text-2xl font-bold text-purple-400">
                    {estimatedRewards}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-800">
                <div className="flex justify-between">
                  <div className="text-sm">Total Value After Period</div>
                  <div className="font-bold">
                    {(
                      Number.parseFloat(amount) +
                      Number.parseFloat(estimatedRewards)
                    ).toFixed(2)}{" "}
                    Tokens
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-gray-800/30 p-3 rounded-lg">
              <TrendingUp className="h-5 w-5 text-cyan-400 mt-0.5" />
              <div className="text-xs text-gray-400">
                <span className="block font-medium text-white mb-1">
                  Compound Effect
                </span>
                Reinvesting your rewards can significantly increase your returns
                over time through the power of compounding.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
