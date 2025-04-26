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

export function MultiPoolStaking({ signer, account }: MultiPoolStakingProps) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [stakeAmount, setStakeAmount] = useState("");
  const [activePool, setActivePool] = useState("stable");
  const [isStaking, setIsStaking] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { toast } = useToast();

  const { stakingTokenAddress } = getContractAddresses();

  useEffect(() => {
    const fetchPools = async () => {
      if (!signer || !account) return;

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
  }, [signer, account]);

  const handleStake = async (poolId: string) => {
    if (!signer || !stakeAmount) return;

    const pool = pools.find((p) => p.id === poolId);
    if (!pool) return;

    try {
      setIsStaking(true);
      const tokenContract = new ethers.Contract(
        stakingTokenAddress,
        tokenABI,
        signer
      );

      // Check allowance
      const allowance = await tokenContract.allowance(account, pool.address);
      const amountToStake = ethers.parseEther(stakeAmount);

      if (allowance < amountToStake) {
        setIsApproving(true);
        const approveTx = await tokenContract.approve(
          pool.address,
          amountToStake
        );
        toast({
          title: "Approval pending",
          description: "Please confirm the approval transaction in your wallet",
        });
        await approveTx.wait();
        setIsApproving(false);
        toast({
          title: "Approval successful",
          description: "Your tokens have been approved for staking",
        });
      }

      // In a real implementation, you would call the stake function on the specific pool contract
      // For demo purposes, we'll just show a success message
      toast({
        title: "Staking successful",
        description: `Successfully staked ${stakeAmount} tokens in the ${pool.name}`,
      });

      // Update the UI to reflect the new staked amount
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
      console.error("Error staking tokens:", error);
      toast({
        title: "Staking failed",
        description: "Failed to stake tokens. Please try again.",
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
            Low Risk
          </Badge>
        );
      case "Medium":
        return (
          <Badge className="bg-purple-900/50 text-purple-300 border-purple-700 text-base font-bold py-1 px-3">
            Medium Risk
          </Badge>
        );
      case "High":
        return (
          <Badge className="bg-red-900/50 text-red-300 border-red-700 text-base font-bold py-1 px-3">
            High Risk
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm col-span-2">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-cyan-400">
          Multi-Pool Staking
        </CardTitle>
        <CardDescription className="text-base text-gray-200">
          Choose from multiple staking pools with different risk/reward profiles
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
                        Pool Information
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">APY</span>
                          <span className="font-bold text-lg text-cyan-400">
                            {pool.apy}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            Lock Period
                          </span>
                          <span className="text-white font-medium text-base">
                            {pool.lockPeriod}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            Minimum Stake
                          </span>
                          <span className="text-white font-medium text-base">
                            {pool.minStake} Tokens
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            Total Staked
                          </span>
                          <span className="text-white font-medium text-base">
                            {pool.totalStaked} Tokens
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            Risk Level
                          </span>
                          <span>{getRiskBadge(pool.risk)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <div className="flex items-center mb-3">
                        <Info className="h-5 w-5 mr-2 text-cyan-400" />
                        <h3 className="text-base font-bold text-white">
                          Pool Description
                        </h3>
                      </div>
                      <p className="text-base text-gray-200 leading-relaxed">
                        {pool.id === "stable"
                          ? "The Stable Pool offers consistent rewards with minimal risk. No lock period means you can withdraw anytime."
                          : pool.id === "growth"
                          ? "The Growth Pool balances risk and reward with a moderate lock period. Higher APY than the Stable Pool."
                          : "The Turbo Pool offers the highest potential rewards but comes with higher risk and a longer lock period."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-gray-800/70 to-gray-900/70 p-6 rounded-lg border border-gray-700">
                      <h3 className="text-base font-bold mb-3 text-white">
                        Your Stake
                      </h3>
                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                          {pool.userStaked}
                        </div>
                        <div className="text-base text-gray-200 mt-1">
                          Tokens Staked
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex space-x-2">
                          <Input
                            type="number"
                            placeholder={`Min. ${pool.minStake} tokens`}
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
                          className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-base font-bold py-5"
                        >
                          <ArrowUpCircle className="mr-2 h-5 w-5" />
                          {isApproving
                            ? "Approving..."
                            : isStaking
                            ? "Staking..."
                            : `Stake in ${pool.name}`}
                        </Button>
                      </div>
                    </div>

                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <h3 className="text-base font-bold mb-3 text-white">
                        Estimated Rewards
                      </h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">Daily</span>
                          <span className="text-white font-medium text-base">
                            {(
                              (Number(pool.userStaked) *
                                Number(pool.apy.replace("%", ""))) /
                              36500
                            ).toFixed(4)}{" "}
                            Tokens
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            Weekly
                          </span>
                          <span className="text-white font-medium text-base">
                            {(
                              (Number(pool.userStaked) *
                                Number(pool.apy.replace("%", ""))) /
                              5200
                            ).toFixed(4)}{" "}
                            Tokens
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            Monthly
                          </span>
                          <span className="text-white font-medium text-base">
                            {(
                              (Number(pool.userStaked) *
                                Number(pool.apy.replace("%", ""))) /
                              1200
                            ).toFixed(4)}{" "}
                            Tokens
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-200 text-base">
                            Yearly
                          </span>
                          <span className="text-white font-medium text-base">
                            {(
                              (Number(pool.userStaked) *
                                Number(pool.apy.replace("%", ""))) /
                              100
                            ).toFixed(4)}{" "}
                            Tokens
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
        Note: APY rates are variable and subject to change based on market
        conditions
      </CardFooter>
    </Card>
  );
}
