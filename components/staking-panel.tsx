"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { stakingABI, tokenABI, getContractAddresses } from "@/lib/contracts"

interface StakingPanelProps {
  signer: ethers.Signer | null
  account: string
}

export function StakingPanel({ signer, account }: StakingPanelProps) {
  const [stakeAmount, setStakeAmount] = useState("")
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [stakingBalance, setStakingBalance] = useState("0")
  const [tokenBalance, setTokenBalance] = useState("0")
  const [isStaking, setIsStaking] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const { toast } = useToast()

  const { stakingAddress, stakingTokenAddress } = getContractAddresses()

  useEffect(() => {
    const fetchBalances = async () => {
      if (!signer || !account) return

      try {
        const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)
        const tokenContract = new ethers.Contract(stakingTokenAddress, tokenABI, signer)

        const stakedBalance = await stakingContract.balanceOf(account)
        const tokenBal = await tokenContract.balanceOf(account)

        setStakingBalance(ethers.formatEther(stakedBalance))
        setTokenBalance(ethers.formatEther(tokenBal))
      } catch (error) {
        console.error("Error fetching balances:", error)
      }
    }

    fetchBalances()
    // Set up an interval to refresh balances
    const interval = setInterval(fetchBalances, 10000)
    return () => clearInterval(interval)
  }, [signer, account, stakingAddress, stakingTokenAddress])

  const handleStake = async () => {
    if (!signer || !stakeAmount) return

    try {
      setIsStaking(true)
      const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)
      const tokenContract = new ethers.Contract(stakingTokenAddress, tokenABI, signer)

      // Check allowance
      const allowance = await tokenContract.allowance(account, stakingAddress)
      const amountToStake = ethers.parseEther(stakeAmount)

      if (allowance < amountToStake) {
        setIsApproving(true)
        const approveTx = await tokenContract.approve(stakingAddress, amountToStake)
        toast({
          title: "Approval pending",
          description: "Please confirm the approval transaction in your wallet",
        })
        await approveTx.wait()
        setIsApproving(false)
        toast({
          title: "Approval successful",
          description: "Your tokens have been approved for staking",
        })
      }

      const tx = await stakingContract.stake(amountToStake)
      toast({
        title: "Staking pending",
        description: "Please confirm the staking transaction in your wallet",
      })
      await tx.wait()

      toast({
        title: "Staking successful",
        description: `Successfully staked ${stakeAmount} tokens`,
      })

      // Refresh balances
      const stakedBalance = await stakingContract.balanceOf(account)
      const tokenBal = await tokenContract.balanceOf(account)
      setStakingBalance(ethers.formatEther(stakedBalance))
      setTokenBalance(ethers.formatEther(tokenBal))
      setStakeAmount("")
    } catch (error) {
      console.error("Error staking tokens:", error)
      toast({
        title: "Staking failed",
        description: "Failed to stake tokens. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsStaking(false)
      setIsApproving(false)
    }
  }

  const handleWithdraw = async () => {
    if (!signer || !withdrawAmount) return

    try {
      setIsWithdrawing(true)
      const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)
      const tokenContract = new ethers.Contract(stakingTokenAddress, tokenABI, signer)

      const tx = await stakingContract.withdraw(ethers.parseEther(withdrawAmount))
      toast({
        title: "Withdrawal pending",
        description: "Please confirm the withdrawal transaction in your wallet",
      })
      await tx.wait()

      toast({
        title: "Withdrawal successful",
        description: `Successfully withdrew ${withdrawAmount} tokens`,
      })

      // Refresh balances
      const stakedBalance = await stakingContract.balanceOf(account)
      const tokenBal = await tokenContract.balanceOf(account)
      setStakingBalance(ethers.formatEther(stakedBalance))
      setTokenBalance(ethers.formatEther(tokenBal))
      setWithdrawAmount("")
    } catch (error) {
      console.error("Error withdrawing tokens:", error)
      toast({
        title: "Withdrawal failed",
        description: "Failed to withdraw tokens. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsWithdrawing(false)
    }
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-cyan-400">Stake & Withdraw</CardTitle>
        <CardDescription>Stake your tokens to earn rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Available to stake:</span>
            <span className="font-medium">{Number.parseFloat(tokenBalance).toFixed(4)} Tokens</span>
          </div>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Amount to stake"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStakeAmount(tokenBalance)}
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Max
            </Button>
          </div>
          <Button
            onClick={handleStake}
            disabled={isStaking || isApproving || !stakeAmount || Number.parseFloat(stakeAmount) <= 0}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
          >
            <ArrowUpCircle className="mr-2 h-4 w-4" />
            {isApproving ? "Approving..." : isStaking ? "Staking..." : "Stake Tokens"}
          </Button>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Staked balance:</span>
            <span className="font-medium">{Number.parseFloat(stakingBalance).toFixed(4)} Tokens</span>
          </div>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Amount to withdraw"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWithdrawAmount(stakingBalance)}
              className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
            >
              Max
            </Button>
          </div>
          <Button
            onClick={handleWithdraw}
            disabled={isWithdrawing || !withdrawAmount || Number.parseFloat(withdrawAmount) <= 0}
            className="w-full bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
          >
            <ArrowDownCircle className="mr-2 h-4 w-4" />
            {isWithdrawing ? "Withdrawing..." : "Withdraw Tokens"}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-gray-500 border-t border-gray-800 pt-4">
        Note: Staking and withdrawing require gas fees
      </CardFooter>
    </Card>
  )
}
