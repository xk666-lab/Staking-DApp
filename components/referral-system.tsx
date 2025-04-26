"use client"

import { useState, useEffect } from "react"
import type { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Share2, Users, Gift } from "lucide-react"

interface ReferralSystemProps {
  signer: ethers.Signer | null
  account: string
}

interface Referral {
  address: string
  date: string
  reward: string
}

export function ReferralSystem({ signer, account }: ReferralSystemProps) {
  const [referralCode, setReferralCode] = useState("")
  const [referralLink, setReferralLink] = useState("")
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [totalRewards, setTotalRewards] = useState("0")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const generateReferralCode = async () => {
      if (!account) return

      try {
        setLoading(true)
        // In a real implementation, you would fetch this from your backend
        // For demo purposes, we'll generate a code based on the account address
        const code = `QS${account.substring(2, 8).toUpperCase()}`
        setReferralCode(code)
        setReferralLink(`https://quantum-staking.io/ref/${code}`)

        // Mock referral data
        const mockReferrals: Referral[] = [
          {
            address: "0x1234...5678",
            date: "2023-04-15",
            reward: "25.5",
          },
          {
            address: "0x2345...6789",
            date: "2023-04-10",
            reward: "18.2",
          },
          {
            address: "0x3456...7890",
            date: "2023-04-05",
            reward: "12.7",
          },
        ]

        setReferrals(mockReferrals)
        setTotalRewards(mockReferrals.reduce((sum, referral) => sum + Number(referral.reward), 0).toString())
      } catch (error) {
        console.error("Error generating referral code:", error)
      } finally {
        setLoading(false)
      }
    }

    generateReferralCode()
  }, [account])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied to clipboard",
      description: "The referral link has been copied to your clipboard",
    })
  }

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Quantum Staking",
          text: "Stake your tokens and earn rewards with Quantum Staking. Use my referral link:",
          url: referralLink,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      copyToClipboard(referralLink)
    }
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-purple-400">Referral Program</CardTitle>
        <CardDescription>Invite friends and earn bonus rewards</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 rounded-lg p-4 border border-gray-800">
              <div className="flex items-center mb-4">
                <Gift className="h-5 w-5 mr-2 text-purple-400" />
                <h3 className="font-medium">Your Referral Rewards</h3>
              </div>

              <div className="text-center mb-4">
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-cyan-400">
                  {totalRewards}
                </div>
                <div className="text-sm text-gray-400">Total Tokens Earned</div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold">{referrals.length}</div>
                  <div className="text-xs text-gray-400">Friends Referred</div>
                </div>
                <div>
                  <div className="text-xl font-bold">5%</div>
                  <div className="text-xs text-gray-400">Reward Rate</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Your Referral Link</h3>
              <div className="flex space-x-2">
                <Input value={referralLink} readOnly className="bg-gray-800 border-gray-700" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(referralLink)}
                  className="border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={shareReferral}
                  className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Referral Link
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Your Referrals</h3>
                <Users className="h-4 w-4 text-gray-400" />
              </div>

              {referrals.length > 0 ? (
                <div className="space-y-3">
                  {referrals.map((referral, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-800/30 rounded-lg">
                      <div>
                        <div className="font-medium">{referral.address}</div>
                        <div className="text-xs text-gray-400">Joined: {referral.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-purple-400">{referral.reward}</div>
                        <div className="text-xs text-gray-400">Tokens earned</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-xs mt-1">Share your link to start earning rewards</p>
                </div>
              )}
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2">How It Works</h3>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>• Share your unique referral link with friends</li>
                <li>• When they stake tokens, you earn 5% of their rewards</li>
                <li>• Your friends also get a 2% bonus on their staking rewards</li>
                <li>• There's no limit to how many friends you can refer</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
