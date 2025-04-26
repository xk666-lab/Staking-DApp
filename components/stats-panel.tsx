"use client"

import { useState, useEffect } from "react"
import { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Clock, Users, TrendingUp } from "lucide-react"
import { stakingABI, getContractAddresses } from "@/lib/contracts"

interface StatsPanelProps {
  signer: ethers.Signer | null
  account: string
}

export function StatsPanel({ signer, account }: StatsPanelProps) {
  const [totalStaked, setTotalStaked] = useState("0")
  const [rewardRate, setRewardRate] = useState("0")
  const [timeRemaining, setTimeRemaining] = useState("0")
  const [rewardFinishTime, setRewardFinishTime] = useState(0)
  const [loading, setLoading] = useState(true)

  const { stakingAddress } = getContractAddresses()

  useEffect(() => {
    const fetchStats = async () => {
      if (!signer) return

      try {
        setLoading(true)
        const stakingContract = new ethers.Contract(stakingAddress, stakingABI, signer)

        const totalSupply = await stakingContract.totalSupply()
        const rewardRateValue = await stakingContract.rewardRate()
        const finishAt = await stakingContract.finishAt()

        setTotalStaked(ethers.formatEther(totalSupply))
        setRewardRate(ethers.formatEther(rewardRateValue))
        setRewardFinishTime(Number(finishAt))
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Set up an interval to refresh stats
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [signer, stakingAddress])

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = Math.floor(Date.now() / 1000)
      if (rewardFinishTime > now) {
        const remaining = rewardFinishTime - now
        const days = Math.floor(remaining / 86400)
        const hours = Math.floor((remaining % 86400) / 3600)
        const minutes = Math.floor((remaining % 3600) / 60)

        setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
      } else {
        setTimeRemaining("Rewards ended")
      }
    }

    updateTimeRemaining()
    const interval = setInterval(updateTimeRemaining, 60000)
    return () => clearInterval(interval)
  }, [rewardFinishTime])

  const progressValue =
    rewardFinishTime > 0
      ? Math.max(0, Math.min(100, 100 - ((rewardFinishTime - Math.floor(Date.now() / 1000)) / 86400) * 100))
      : 0

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-purple-400">Protocol Stats</CardTitle>
        <CardDescription>Current staking statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <BarChart3 className="h-4 w-4 mr-2 text-cyan-400" />
                  <span className="text-sm text-gray-400">Total Staked</span>
                </div>
                <p className="text-xl font-bold">{Number.parseFloat(totalStaked).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">Tokens</p>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <TrendingUp className="h-4 w-4 mr-2 text-purple-400" />
                  <span className="text-sm text-gray-400">Reward Rate</span>
                </div>
                <p className="text-xl font-bold">{Number.parseFloat(rewardRate).toFixed(6)}</p>
                <p className="text-xs text-gray-500 mt-1">Tokens per second</p>
              </div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-cyan-400" />
                  <span className="text-sm text-gray-400">Rewards Period</span>
                </div>
                <span className="text-sm font-medium">{timeRemaining}</span>
              </div>
              <Progress value={progressValue} className="h-2 bg-gray-700" />
              <p className="text-xs text-gray-500 mt-2">Time until rewards end</p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-4 w-4 mr-2 text-purple-400" />
                <span className="text-sm text-gray-400">Your Stake Share</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">
                  {totalStaked === "0"
                    ? "0%"
                    : ((Number.parseFloat(totalStaked) / Number.parseFloat(totalStaked)) * 100).toFixed(2) + "%"}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
