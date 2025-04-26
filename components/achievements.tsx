"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Award, Star, Clock, TrendingUp, Zap, Target, Lock } from "lucide-react"

interface AchievementsProps {
  signer: ethers.Signer | null
  account: string
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  progress: number
  target: number
  completed: boolean
  reward: string
  category: "staking" | "rewards" | "referral" | "special"
}

export function Achievements({ signer, account }: AchievementsProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "staking" | "rewards" | "referral" | "special">("all")

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!account) return

      try {
        setLoading(true)

        // In a real implementation, you would fetch this from your backend
        // For demo purposes, we'll use mock data
        const mockAchievements: Achievement[] = [
          {
            id: "first-stake",
            title: "First Steps",
            description: "Make your first stake in any pool",
            icon: <Star className="h-5 w-5 text-yellow-400" />,
            progress: 1,
            target: 1,
            completed: true,
            reward: "10 QST",
            category: "staking",
          },
          {
            id: "stake-1000",
            title: "Serious Investor",
            description: "Stake at least 1,000 tokens",
            icon: <TrendingUp className="h-5 w-5 text-green-400" />,
            progress: 1000,
            target: 1000,
            completed: true,
            reward: "25 QST",
            category: "staking",
          },
          {
            id: "stake-10000",
            title: "Whale Alert",
            description: "Stake at least 10,000 tokens",
            icon: <Zap className="h-5 w-5 text-purple-400" />,
            progress: 3250,
            target: 10000,
            completed: false,
            reward: "100 QST",
            category: "staking",
          },
          {
            id: "stake-30-days",
            title: "Diamond Hands",
            description: "Keep tokens staked for 30 consecutive days",
            icon: <Clock className="h-5 w-5 text-cyan-400" />,
            progress: 18,
            target: 30,
            completed: false,
            reward: "50 QST",
            category: "staking",
          },
          {
            id: "claim-rewards",
            title: "Reward Hunter",
            description: "Claim rewards 5 times",
            icon: <Target className="h-5 w-5 text-red-400" />,
            progress: 3,
            target: 5,
            completed: false,
            reward: "15 QST",
            category: "rewards",
          },
          {
            id: "earn-100",
            title: "Century Club",
            description: "Earn a total of 100 tokens in rewards",
            icon: <Award className="h-5 w-5 text-amber-400" />,
            progress: 75,
            target: 100,
            completed: false,
            reward: "20 QST",
            category: "rewards",
          },
          {
            id: "refer-3",
            title: "Social Butterfly",
            description: "Refer 3 friends who stake tokens",
            icon: <Star className="h-5 w-5 text-pink-400" />,
            progress: 2,
            target: 3,
            completed: false,
            reward: "30 QST",
            category: "referral",
          },
          {
            id: "early-adopter",
            title: "Early Adopter",
            description: "Join during the first month of launch",
            icon: <Lock className="h-5 w-5 text-blue-400" />,
            progress: 1,
            target: 1,
            completed: true,
            reward: "Special NFT",
            category: "special",
          },
        ]

        setAchievements(mockAchievements)
      } catch (error) {
        console.error("Error fetching achievements:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAchievements()
  }, [account])

  const filteredAchievements = achievements.filter((achievement) => filter === "all" || achievement.category === filter)

  const completedCount = achievements.filter((a) => a.completed).length
  const totalCount = achievements.length
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-cyan-400">Achievements</CardTitle>
        <CardDescription>Complete tasks to earn rewards</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Your Progress</h3>
                <span className="text-sm">
                  {completedCount}/{totalCount} Completed
                </span>
              </div>
              <Progress value={completionPercentage} className="h-2 bg-gray-700" />
            </div>

            <div className="flex space-x-2 overflow-x-auto pb-2">
              <Badge
                onClick={() => setFilter("all")}
                className={`cursor-pointer ${
                  filter === "all" ? "bg-gradient-to-r from-cyan-500 to-purple-600" : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                All
              </Badge>
              <Badge
                onClick={() => setFilter("staking")}
                className={`cursor-pointer ${
                  filter === "staking"
                    ? "bg-gradient-to-r from-cyan-500 to-purple-600"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                Staking
              </Badge>
              <Badge
                onClick={() => setFilter("rewards")}
                className={`cursor-pointer ${
                  filter === "rewards"
                    ? "bg-gradient-to-r from-cyan-500 to-purple-600"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                Rewards
              </Badge>
              <Badge
                onClick={() => setFilter("referral")}
                className={`cursor-pointer ${
                  filter === "referral"
                    ? "bg-gradient-to-r from-cyan-500 to-purple-600"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                Referral
              </Badge>
              <Badge
                onClick={() => setFilter("special")}
                className={`cursor-pointer ${
                  filter === "special"
                    ? "bg-gradient-to-r from-cyan-500 to-purple-600"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                Special
              </Badge>
            </div>

            <div className="space-y-4">
              {filteredAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border ${
                    achievement.completed
                      ? "bg-gradient-to-r from-gray-800/70 to-gray-900/70 border-cyan-800/50"
                      : "bg-gray-800/30 border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`p-2 rounded-full ${
                          achievement.completed ? "bg-cyan-900/30 text-cyan-400" : "bg-gray-800 text-gray-400"
                        }`}
                      >
                        {achievement.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{achievement.title}</h4>
                        <p className="text-sm text-gray-400">{achievement.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {achievement.completed ? (
                          <Badge className="bg-cyan-900/30 text-cyan-400 border-cyan-700/50">Completed</Badge>
                        ) : (
                          <span>
                            {achievement.progress}/{achievement.target}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Reward: {achievement.reward}</div>
                    </div>
                  </div>
                  {!achievement.completed && (
                    <Progress
                      value={(achievement.progress / achievement.target) * 100}
                      className="h-1 mt-3 bg-gray-700"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
