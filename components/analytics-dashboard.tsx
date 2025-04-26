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
import { stakingABI, getContractAddresses } from "@/lib/contracts";

interface AnalyticsDashboardProps {
  signer: ethers.Signer | null;
  account: string;
}

export function AnalyticsDashboard({
  signer,
  account,
}: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [stakingHistory, setStakingHistory] = useState<any[]>([]);
  const [rewardHistory, setRewardHistory] = useState<any[]>([]);
  const [apyEstimate, setApyEstimate] = useState("0");
  const [isMounted, setIsMounted] = useState(false);

  const { stakingAddress } = getContractAddresses();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!signer || !account || !isMounted) return;

      try {
        setLoading(true);
        const stakingContract = new ethers.Contract(
          stakingAddress,
          stakingABI,
          signer
        );

        // In a real implementation, you would fetch this data from a subgraph or backend
        // For demo purposes, we're generating mock data

        // Mock staking history data
        const mockStakingHistory = [
          { date: "Jan 1", amount: 100 },
          { date: "Jan 15", amount: 150 },
          { date: "Feb 1", amount: 200 },
          { date: "Feb 15", amount: 180 },
          { date: "Mar 1", amount: 250 },
        ];

        // Mock reward history data
        const mockRewardHistory = [
          { date: "Jan 5", amount: 5 },
          { date: "Jan 20", amount: 8 },
          { date: "Feb 5", amount: 12 },
          { date: "Feb 20", amount: 10 },
          { date: "Mar 5", amount: 15 },
        ];

        // Calculate estimated APY based on current reward rate and total supply
        const rewardRate = await stakingContract.rewardRate();
        const totalSupply = await stakingContract.totalSupply();

        // APY calculation: (rewardRate * 86400 * 365 * 100) / totalSupply
        // This calculates the annual yield percentage
        const apy =
          Number(ethers.formatEther(totalSupply)) > 0
            ? (Number(ethers.formatEther(rewardRate)) * 86400 * 365 * 100) /
              Number(ethers.formatEther(totalSupply))
            : 0;

        setStakingHistory(mockStakingHistory);
        setRewardHistory(mockRewardHistory);
        setApyEstimate(apy.toFixed(2));
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [signer, account, stakingAddress, isMounted]);

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
        <CardTitle className="text-xl text-cyan-400">
          Analytics Dashboard
        </CardTitle>
        <CardDescription>Track your staking performance</CardDescription>
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
                  $12,450
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Based on current token price
                </div>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Your Rank</div>
                <div className="text-2xl font-bold text-cyan-400">#12</div>
                <div className="text-xs text-gray-500 mt-1">
                  Out of 156 stakers
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
                  Staking History
                </TabsTrigger>
                <TabsTrigger
                  value="rewards"
                  className="data-[state=active]:bg-gray-700"
                >
                  <LineChart className="h-4 w-4 mr-2" />
                  Rewards History
                </TabsTrigger>
                <TabsTrigger
                  value="distribution"
                  className="data-[state=active]:bg-gray-700"
                >
                  <PieChart className="h-4 w-4 mr-2" />
                  Distribution
                </TabsTrigger>
              </TabsList>

              <TabsContent value="staking" className="mt-0">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="h-64 flex items-end justify-between gap-2">
                    {stakingHistory.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center w-full"
                      >
                        <div
                          className="bg-gradient-to-t from-cyan-600 to-purple-600 rounded-t-sm w-full"
                          style={{ height: `${(item.amount / 250) * 180}px` }}
                        ></div>
                        <div className="text-xs text-gray-400 mt-2">
                          {item.date}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-4">
                    Your staking amount over time
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rewards" className="mt-0">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="h-64 relative">
                    <svg className="w-full h-full">
                      <polyline
                        points={rewardHistory
                          .map(
                            (item, i) =>
                              `${(i * 100) / (rewardHistory.length - 1)}, ${
                                180 - (item.amount / 15) * 150
                              }`
                          )
                          .join(" ")}
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="3"
                        className="drop-shadow-md"
                      />
                      <defs>
                        <linearGradient
                          id="gradient"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#9333ea" />
                        </linearGradient>
                      </defs>

                      {rewardHistory.map((item, i) => (
                        <circle
                          key={i}
                          cx={`${(i * 100) / (rewardHistory.length - 1)}%`}
                          cy={`${180 - (item.amount / 15) * 150}px`}
                          r="4"
                          fill="#06b6d4"
                          className="drop-shadow-md"
                        />
                      ))}
                    </svg>

                    <div className="absolute bottom-0 left-0 right-0 flex justify-between">
                      {rewardHistory.map((item, index) => (
                        <div key={index} className="text-xs text-gray-400">
                          {item.date}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-center text-xs text-gray-500 mt-4">
                    Your earned rewards over time
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="distribution" className="mt-0">
                <div className="bg-gray-800/30 rounded-lg p-4">
                  <div className="flex justify-center">
                    <div className="relative w-64 h-64">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#1e293b"
                          strokeWidth="20"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="20"
                          strokeDasharray="251.2"
                          strokeDashoffset="188.4"
                          transform="rotate(-90 50 50)"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#9333ea"
                          strokeWidth="20"
                          strokeDasharray="251.2"
                          strokeDashoffset="62.8"
                          transform="rotate(-90 50 50)"
                          className="opacity-70"
                        />
                      </svg>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <div className="text-2xl font-bold">75%</div>
                        <div className="text-xs text-gray-400">
                          Staking Ratio
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-cyan-500 mr-2"></div>
                      <div className="text-sm">Your Stake (25%)</div>
                    </div>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-600 opacity-70 mr-2"></div>
                      <div className="text-sm">Other Stakers (75%)</div>
                    </div>
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
