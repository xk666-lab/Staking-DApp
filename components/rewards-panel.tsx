"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { GiftIcon, RefreshCw } from "lucide-react"
import { stakingABI, getContractAddresses } from "@/lib/contracts"

interface RewardsPanelProps {
  signer: ethers.Signer | null
  account: string
}

export function RewardsPanel({ signer, account }: RewardsPanelProps) {
  const [earnedRewards, setEarnedRewards] = useState("0")
  const [isClaimingRewards, setIsClaimingRewards] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const { stakingAddress } = getContractAddresses()

  useEffect(() => {
    const fetchRewards = async () => {
      if (!signer || !account) return

      try {
        setLoading(true)
        const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)
        const earned = await stakingContract.earned(account)
        setEarnedRewards(ethers.formatEther(earned))
      } catch (error) {
        console.error("Error fetching rewards:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRewards()
    // Set up an interval to refresh rewards
    const interval = setInterval(fetchRewards, 10000)
    return () => clearInterval(interval)
  }, [signer, account, stakingAddress])

  const handleClaimRewards = async () => {
    if (!signer) return

    try {
      setIsClaimingRewards(true)
      const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)

      const tx = await stakingContract.getReward()
      toast({
        title: "Claim pending",
        description: "Please confirm the transaction in your wallet",
      })
      await tx.wait()

      toast({
        title: "Rewards claimed",
        description: `Successfully claimed ${earnedRewards} reward tokens`,
      })

      // Refresh rewards
      const earned = await stakingContract.earned(account)
      setEarnedRewards(ethers.formatEther(earned))
    } catch (error) {
      console.error("Error claiming rewards:", error)
      toast({
        title: "Claim failed",
        description: "Failed to claim rewards. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsClaimingRewards(false)
    }
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-cyan-400">Your Rewards</CardTitle>
        <CardDescription>Claim your staking rewards</CardDescription>
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
                <span className="text-gray-400">Earned rewards:</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (signer && account) {
                      const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)
                      stakingContract.earned(account).then((earned: ethers.BigNumberish) => {
                        setEarnedRewards(ethers.formatEther(earned))
                      })
                    }
                  }}
                  className="h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-400">
                  {Number.parseFloat(earnedRewards).toFixed(6)}
                </div>
                <div className="text-sm text-gray-400 mt-1">Reward Tokens</div>
              </div>

              <Button
                onClick={handleClaimRewards}
                disabled={isClaimingRewards || Number.parseFloat(earnedRewards) <= 0}
                className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
              >
                <GiftIcon className="mr-2 h-4 w-4" />
                {isClaimingRewards ? "Claiming..." : "Claim Rewards"}
              </Button>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">Rewards Info</h3>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>• Rewards are calculated based on your staking duration and amount</li>
                <li>• Rewards accumulate in real-time</li>
                <li>• You can claim rewards at any time</li>
                <li>• Unclaimed rewards remain available even after unstaking</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
