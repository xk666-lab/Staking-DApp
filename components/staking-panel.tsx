"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { ArrowUpCircle, ArrowDownCircle, AlertCircle } from "lucide-react";
import { stakingABI, tokenABI, getContractAddresses } from "@/lib/contracts";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StakingPanelProps {
  signer: ethers.Signer | null;
  account: string;
}

export function StakingPanel({ signer, account }: StakingPanelProps) {
  const [stakeAmount, setStakeAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [stakingBalance, setStakingBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [isStaking, setIsStaking] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [allowance, setAllowance] = useState("0");
  const [showApprovalInfo, setShowApprovalInfo] = useState(false);
  const { toast } = useToast();

  const { stakingAddress, stakingTokenAddress } = getContractAddresses();

  useEffect(() => {
    const fetchBalances = async () => {
      if (!signer || !account) return;

      try {
        const stakingContract = new ethers.Contract(
          stakingAddress,
          stakingABI,
          signer
        );
        const tokenContract = new ethers.Contract(
          stakingTokenAddress,
          tokenABI,
          signer
        );

        const stakedBalance = await stakingContract.balanceOf(account);
        const tokenBal = await tokenContract.balanceOf(account);
        const currentAllowance = await tokenContract.allowance(
          account,
          stakingAddress
        );

        setStakingBalance(ethers.formatEther(stakedBalance));
        setTokenBalance(ethers.formatEther(tokenBal));
        setAllowance(ethers.formatEther(currentAllowance));
      } catch (error) {
        console.error("Error fetching balances:", error);
      }
    };

    fetchBalances();
    // Set up an interval to refresh balances
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [signer, account, stakingAddress, stakingTokenAddress]);

  const handleApprove = async () => {
    if (!signer || !stakeAmount) return;

    try {
      setIsApproving(true);
      const tokenContract = new ethers.Contract(
        stakingTokenAddress,
        tokenABI,
        signer
      );

      // 授权质押合约使用代币
      const amountToStake = ethers.parseEther(stakeAmount);
      const approveTx = await tokenContract.approve(
        stakingAddress,
        amountToStake
      );
      toast({
        title: "授权处理中",
        description: "请在钱包中确认授权交易",
      });
      await approveTx.wait();

      // 更新授权额度
      const newAllowance = await tokenContract.allowance(
        account,
        stakingAddress
      );
      setAllowance(ethers.formatEther(newAllowance));

      toast({
        title: "授权成功",
        description: "您的代币已授权给质押合约",
      });

      setShowApprovalInfo(false);
    } catch (error) {
      console.error("Error approving tokens:", error);
      toast({
        title: "授权失败",
        description: "代币授权失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleStake = async () => {
    if (!signer || !stakeAmount) return;

    try {
      setIsStaking(true);
      const stakingContract = new ethers.Contract(
        stakingAddress,
        stakingABI,
        signer
      );
      const tokenContract = new ethers.Contract(
        stakingTokenAddress,
        tokenABI,
        signer
      );

      // Check allowance
      const currentAllowance = await tokenContract.allowance(
        account,
        stakingAddress
      );
      const amountToStake = ethers.parseEther(stakeAmount);

      if (currentAllowance < amountToStake) {
        setShowApprovalInfo(true);
        setIsStaking(false);
        return;
      }

      const tx = await stakingContract.stake(amountToStake);
      toast({
        title: "质押处理中",
        description: "请在钱包中确认质押交易",
      });
      await tx.wait();

      toast({
        title: "质押成功",
        description: `成功质押 ${stakeAmount} 代币`,
      });

      // Refresh balances
      const stakedBalance = await stakingContract.balanceOf(account);
      const tokenBal = await tokenContract.balanceOf(account);
      setStakingBalance(ethers.formatEther(stakedBalance));
      setTokenBalance(ethers.formatEther(tokenBal));
      setStakeAmount("");
      setShowApprovalInfo(false);
    } catch (error) {
      console.error("Error staking tokens:", error);
      toast({
        title: "质押失败",
        description: "代币质押失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsStaking(false);
    }
  };

  const handleWithdraw = async () => {
    if (!signer || !withdrawAmount) return;

    try {
      setIsWithdrawing(true);
      const stakingContract = new ethers.Contract(
        stakingAddress,
        stakingABI,
        signer
      );
      const tokenContract = new ethers.Contract(
        stakingTokenAddress,
        tokenABI,
        signer
      );

      const tx = await stakingContract.withdraw(
        ethers.parseEther(withdrawAmount)
      );
      toast({
        title: "提取处理中",
        description: "请在钱包中确认提取交易",
      });
      await tx.wait();

      toast({
        title: "提取成功",
        description: `成功提取 ${withdrawAmount} 代币`,
      });

      // Refresh balances
      const stakedBalance = await stakingContract.balanceOf(account);
      const tokenBal = await tokenContract.balanceOf(account);
      setStakingBalance(ethers.formatEther(stakedBalance));
      setTokenBalance(ethers.formatEther(tokenBal));
      setWithdrawAmount("");
    } catch (error) {
      console.error("Error withdrawing tokens:", error);
      toast({
        title: "提取失败",
        description: "代币提取失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-cyan-400">质押与提取</CardTitle>
        <CardDescription>质押您的代币以赚取奖励</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300 font-medium">可用于质押:</span>
            <span className="font-semibold text-cyan-300">
              {Number.parseFloat(tokenBalance).toFixed(4)}{" "}
              <span className="text-cyan-400">代币</span>
            </span>
          </div>

          {showApprovalInfo && (
            <Alert className="bg-amber-950/40 border-amber-800 text-amber-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                在质押前，您需要先授权合约使用您的代币。这是一次性操作，未来质押时如果授权额度足够则无需重复授权。
              </AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="质押数量"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStakeAmount(tokenBalance)}
              className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              最大
            </Button>
          </div>

          {showApprovalInfo ? (
            <Button
              onClick={handleApprove}
              disabled={
                isApproving ||
                !stakeAmount ||
                Number.parseFloat(stakeAmount) <= 0
              }
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              {isApproving ? "授权中..." : "授权代币"}
            </Button>
          ) : (
            <Button
              onClick={handleStake}
              disabled={
                isStaking || !stakeAmount || Number.parseFloat(stakeAmount) <= 0
              }
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              {isStaking ? "质押中..." : "质押代币"}
            </Button>
          )}

          <div className="text-xs text-gray-300 flex justify-between">
            <span>
              当前授权额度:{" "}
              <span className="text-yellow-300 font-medium">
                {Number.parseFloat(allowance).toFixed(2)} 代币
              </span>
            </span>
            {Number.parseFloat(allowance) > 0 && (
              <button
                className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
                onClick={() => setShowApprovalInfo(true)}
              >
                重新授权
              </button>
            )}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300 font-medium">已质押余额:</span>
            <span className="font-semibold text-purple-300">
              {Number.parseFloat(stakingBalance).toFixed(4)}{" "}
              <span className="text-purple-400">代币</span>
            </span>
          </div>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="提取数量"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWithdrawAmount(stakingBalance)}
              className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              最大
            </Button>
          </div>
          <Button
            onClick={handleWithdraw}
            disabled={
              isWithdrawing ||
              !withdrawAmount ||
              Number.parseFloat(withdrawAmount) <= 0
            }
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
          >
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            {isWithdrawing ? "提取中..." : "提取代币"}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-gray-300 border-t border-gray-800 pt-4">
        注意: 质押和提取操作需要支付少量gas费用
      </CardFooter>
    </Card>
  );
}
