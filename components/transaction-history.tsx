"use client"

import { useState, useEffect } from "react"
import type { ethers } from "ethers"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ArrowUpCircle, ArrowDownCircle, Gift, Clock, ExternalLink } from "lucide-react"

interface TransactionHistoryProps {
  signer: ethers.Signer | null
  account: string
}

interface Transaction {
  id: string
  type: "stake" | "withdraw" | "claim" | "referral"
  amount: string
  timestamp: number
  hash: string
  status: "confirmed" | "pending" | "failed"
  pool?: string
}

export function TransactionHistory({ signer, account }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "stake" | "withdraw" | "claim" | "referral">("all")

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!account) return

      try {
        setLoading(true)

        // In a real implementation, you would fetch this from your backend or blockchain
        // For demo purposes, we'll use mock data
        const mockTransactions: Transaction[] = [
          {
            id: "tx1",
            type: "stake",
            amount: "500",
            timestamp: Date.now() - 3600000, // 1 hour ago
            hash: "0x1234...5678",
            status: "confirmed",
            pool: "Stable Pool",
          },
          {
            id: "tx2",
            type: "stake",
            amount: "750",
            timestamp: Date.now() - 86400000, // 1 day ago
            hash: "0x2345...6789",
            status: "confirmed",
            pool: "Growth Pool",
          },
          {
            id: "tx3",
            type: "claim",
            amount: "25.5",
            timestamp: Date.now() - 172800000, // 2 days ago
            hash: "0x3456...7890",
            status: "confirmed",
          },
          {
            id: "tx4",
            type: "withdraw",
            amount: "200",
            timestamp: Date.now() - 259200000, // 3 days ago
            hash: "0x4567...8901",
            status: "confirmed",
            pool: "Stable Pool",
          },
          {
            id: "tx5",
            type: "referral",
            amount: "12.5",
            timestamp: Date.now() - 345600000, // 4 days ago
            hash: "0x5678...9012",
            status: "confirmed",
          },
          {
            id: "tx6",
            type: "stake",
            amount: "1000",
            timestamp: Date.now() - 432000000, // 5 days ago
            hash: "0x6789...0123",
            status: "failed",
            pool: "Turbo Pool",
          },
        ]

        setTransactions(mockTransactions)
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [account])

  const filteredTransactions = transactions.filter((tx) => filter === "all" || tx.type === filter)

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "stake":
        return <ArrowUpCircle className="h-5 w-5 text-green-400" />
      case "withdraw":
        return <ArrowDownCircle className="h-5 w-5 text-red-400" />
      case "claim":
        return <Gift className="h-5 w-5 text-purple-400" />
      case "referral":
        return <Gift className="h-5 w-5 text-cyan-400" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-900/30 text-green-400 border-green-700/50">Confirmed</Badge>
      case "pending":
        return <Badge className="bg-yellow-900/30 text-yellow-400 border-yellow-700/50">Pending</Badge>
      case "failed":
        return <Badge className="bg-red-900/30 text-red-400 border-red-700/50">Failed</Badge>
      default:
        return null
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm col-span-2">
      <CardHeader>
        <CardTitle className="text-xl text-purple-400">Transaction History</CardTitle>
        <CardDescription>View your staking and reward transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <Tabs defaultValue="all" onValueChange={(value) => setFilter(value as any)}>
              <TabsList className="grid grid-cols-5 bg-gray-800/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-gray-700">
                  All
                </TabsTrigger>
                <TabsTrigger value="stake" className="data-[state=active]:bg-gray-700">
                  Stakes
                </TabsTrigger>
                <TabsTrigger value="withdraw" className="data-[state=active]:bg-gray-700">
                  Withdrawals
                </TabsTrigger>
                <TabsTrigger value="claim" className="data-[state=active]:bg-gray-700">
                  Claims
                </TabsTrigger>
                <TabsTrigger value="referral" className="data-[state=active]:bg-gray-700">
                  Referrals
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {filteredTransactions.length > 0 ? (
              <div className="space-y-4">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 rounded-lg bg-gray-800/30 border border-gray-700 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="p-2 rounded-full bg-gray-800">{getTransactionIcon(tx.type)}</div>
                      <div>
                        <div className="font-medium capitalize">
                          {tx.type === "stake"
                            ? `Staked in ${tx.pool}`
                            : tx.type === "withdraw"
                              ? `Withdrew from ${tx.pool}`
                              : tx.type === "claim"
                                ? "Claimed Rewards"
                                : "Referral Bonus"}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center">
                          <span className="mr-2">{formatTimestamp(tx.timestamp)}</span>
                          <a
                            href={`https://etherscan.io/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-cyan-400 hover:text-cyan-300"
                          >
                            {tx.hash.substring(0, 6)}...{tx.hash.substring(tx.hash.length - 4)}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {tx.type === "stake" || tx.type === "withdraw"
                          ? `${tx.type === "stake" ? "+" : "-"}${tx.amount} Tokens`
                          : `+${tx.amount} Rewards`}
                      </div>
                      <div className="mt-1">{getStatusBadge(tx.status)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No transactions found</p>
                <p className="text-xs mt-1">Transactions will appear here once you start staking</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
