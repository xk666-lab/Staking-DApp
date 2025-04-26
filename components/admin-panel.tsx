"use client"

import { useState } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Shield, Clock } from "lucide-react"
import { stakingABI, tokenABI, getContractAddresses } from "@/lib/contracts"

interface AdminPanelProps {
  signer: ethers.Signer | null
}

export function AdminPanel({ signer }: AdminPanelProps) {
  const [rewardAmount, setRewardAmount] = useState("")
  const [duration, setDuration] = useState("")
  const [isSettingRewards, setIsSettingRewards] = useState(false)
  const [isSettingDuration, setIsSettingDuration] = useState(false)
  const { toast } = useToast()

  const { stakingAddress, rewardsTokenAddress } = getContractAddresses()

  const handleSetRewardAmount = async () => {
    if (!signer || !rewardAmount) return

    try {
      setIsSettingRewards(true)
      const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)
      const tokenContract = new ethers.Contract(rewardsTokenAddress, tokenABI, signer)

      // Check allowance
      const account = await signer.getAddress()
      const allowance = await tokenContract.allowance(account, stakingAddress)
      const amountToReward = ethers.parseEther(rewardAmount)

      if (allowance < amountToReward) {
        const approveTx = await tokenContract.approve(stakingAddress, amountToReward)
        toast({
          title: "Approval pending",
          description: "Please confirm the approval transaction in your wallet",
        })
        await approveTx.wait()
        toast({
          title: "Approval successful",
          description: "Your tokens have been approved for rewards",
        })
      }

      const tx = await stakingContract.notifyRewardAmount(amountToReward)
      toast({
        title: "Setting rewards pending",
        description: "Please confirm the transaction in your wallet",
      })
      await tx.wait()

      toast({
        title: "Rewards set",
        description: `Successfully set ${rewardAmount} tokens as rewards`,
      })

      setRewardAmount("")
    } catch (error) {
      console.error("Error setting reward amount:", error)
      toast({
        title: "Setting rewards failed",
        description: "Failed to set reward amount. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSettingRewards(false)
    }
  }

  const handleSetDuration = async () => {
    if (!signer || !duration) return

    try {
      setIsSettingDuration(true)
      const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)

      const tx = await stakingContract.setRewardsDuration(Number.parseInt(duration) * 86400) // Convert days to seconds
      toast({
        title: "Setting duration pending",
        description: "Please confirm the transaction in your wallet",
      })
      await tx.wait()

      toast({
        title: "Duration set",
        description: `Successfully set rewards duration to ${duration} days`,
      })

      setDuration("")
    } catch (error) {
      console.error("Error setting duration:", error)
      toast({
        title: "Setting duration failed",
        description: "Failed to set rewards duration. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSettingDuration(false)
    }
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-purple-400">Admin Panel</CardTitle>
        <CardDescription>Manage staking rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center">
            <Shield className="h-4 w-4 mr-2 text-cyan-400" />
            Set Reward Amount
          </h3>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Reward amount"
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              onClick={handleSetRewardAmount}
              disabled={isSettingRewards || !rewardAmount || Number.parseFloat(rewardAmount) <= 0}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              {isSettingRewards ? "Setting..." : "Set"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">Set the total amount of tokens to distribute as rewards</p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent my-4"></div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center">
            <Clock className="h-4 w-4 mr-2 text-purple-400" />
            Set Rewards Duration
          </h3>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Duration in days"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              onClick={handleSetDuration}
              disabled={isSettingDuration || !duration || Number.parseInt(duration) <= 0}
              className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-700 hover:to-cyan-600"
            >
              {isSettingDuration ? "Setting..." : "Set"}
            </Button>
          </div>
          <p className="text-xs text-gray-500">Set the duration (in days) over which rewards will be distributed</p>
        </div>
      </CardContent>
    </Card>
  )
}
