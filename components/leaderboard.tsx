"use client"

import { useState, useEffect } from "react"
import type { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award } from "lucide-react"

interface LeaderboardProps {
  signer: ethers.Signer | null
  account: string
}

export function Leaderboard({ signer, account }: LeaderboardProps) {
  const [loading, setLoading] = useState(true)
  const [topStakers, setTopStakers] = useState<any[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!signer) return

      try {
        setLoading(true)

        // In a real implementation, you would fetch this data from a subgraph or backend
        // For demo purposes, we're generating mock data

        // Mock top stakers data
        const mockTopStakers = [
          { address: "0x1234...5678", amount: "25,000", rank: 1 },
          { address: "0x2345...6789", amount: "18,750", rank: 2 },
          { address: "0x3456...7890", amount: "15,200", rank: 3 },
          { address: "0x4567...8901", amount: "12,800", rank: 4 },
          { address: "0x5678...9012", amount: "10,500", rank: 5 },
          { address: "0x6789...0123", amount: "8,900", rank: 6 },
          { address: "0x7890...1234", amount: "7,600", rank: 7 },
          { address: "0x8901...2345", amount: "6,200", rank: 8 },
          { address: "0x9012...3456", amount: "5,100", rank: 9 },
          { address: "0x0123...4567", amount: "4,800", rank: 10 },
        ]

        // Find user's rank (for demo, randomly assign a rank between 1-20)
        const mockUserRank = Math.floor(Math.random() * 20) + 1

        setTopStakers(mockTopStakers)
        setUserRank(mockUserRank)
      } catch (error) {
        console.error("Error fetching leaderboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [signer])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-400" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-300" />
      case 3:
        return <Award className="h-5 w-5 text-amber-700" />
      default:
        return <span className="text-sm font-medium w-5 text-center">{rank}</span>
    }
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-purple-400">Leaderboard</CardTitle>
        <CardDescription>Top stakers in the protocol</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {topStakers.map((staker, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index < 3
                      ? "bg-gradient-to-r from-gray-800/70 to-gray-900/70 border border-gray-700"
                      : "bg-gray-800/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800">
                      {getRankIcon(staker.rank)}
                    </div>
                    <div>
                      <div className="font-medium">{staker.address}</div>
                      <div className="text-xs text-gray-400">Staking since Jan 2023</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{staker.amount}</div>
                    <div className="text-xs text-gray-400">Tokens staked</div>
                  </div>
                </div>
              ))}
            </div>

            {userRank && (
              <div className="mt-6 p-4 border border-dashed border-gray-700 rounded-lg bg-gray-800/30">
                <div className="text-sm text-gray-400 mb-2">Your Position</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-900/50 border border-cyan-700/50">
                      <span className="text-sm font-medium">{userRank}</span>
                    </div>
                    <div>
                      <div className="font-medium">Your Account</div>
                      <div className="text-xs text-gray-400">
                        {userRank <= 10 ? (
                          <Badge variant="outline" className="bg-cyan-900/30 text-cyan-400 border-cyan-700/50">
                            Top 10 Staker
                          </Badge>
                        ) : userRank <= 50 ? (
                          <Badge variant="outline" className="bg-purple-900/30 text-purple-400 border-purple-700/50">
                            Top 50 Staker
                          </Badge>
                        ) : (
                          <span>Keep staking to climb the ranks!</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">3,250</div>
                    <div className="text-xs text-gray-400">Tokens staked</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
