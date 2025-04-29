"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { tokenABI, getContractAddresses } from "@/lib/contracts";
import {
  Coins,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface TokenMinterProps {
  signer: ethers.Signer | null;
  account: string;
  isOwner: boolean;
}

export function TokenMinter({ signer, account, isOwner }: TokenMinterProps) {
  const [isMounted, setIsMounted] = useState(false);

  // 确保组件只在客户端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 如果组件尚未在客户端挂载，返回加载状态
  if (!isMounted) {
    return (
      <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl text-cyan-400">代币铸造</CardTitle>
          <CardDescription>铸造质押和奖励代币</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl text-cyan-400">代币铸造</CardTitle>
            <CardDescription>铸造质押和奖励代币</CardDescription>
          </div>
          {isOwner ? (
            <Badge className="bg-purple-600/20 border border-purple-500/40 px-3 py-1 text-purple-300">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              管理员权限
            </Badge>
          ) : (
            <Badge className="bg-cyan-600/20 border border-cyan-500/40 px-3 py-1 text-cyan-300">
              <Coins className="h-3.5 w-3.5 mr-1.5" />
              用户权限
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isOwner ? (
          <AdminMinterContent signer={signer} account={account} />
        ) : (
          <UserMinterContent signer={signer} account={account} />
        )}
      </CardContent>
    </Card>
  );
}

function UserMinterContent({
  signer,
  account,
}: {
  signer: ethers.Signer | null;
  account: string;
}) {
  const [amount, setAmount] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { toast } = useToast();
  const { stakingTokenAddress } = getContractAddresses();

  const handleMint = async () => {
    if (!signer || !amount || parseFloat(amount) <= 0) return;

    try {
      setIsMinting(true);
      setMintingStatus("idle");
      setStatusMessage("");

      // 获取代币合约
      const tokenContract = new ethers.Contract(
        stakingTokenAddress,
        tokenABI,
        signer
      );

      // 转换为wei单位
      const mintAmount = ethers.parseEther(amount);

      // 调用mint函数
      const tx = await tokenContract.mint(mintAmount);

      // 显示交易处理中提示
      toast({
        title: "铸造处理中",
        description: "请在钱包中确认交易",
      });

      // 等待交易确认
      await tx.wait();

      // 更新状态和提示
      setMintingStatus("success");
      setStatusMessage(`成功铸造 ${amount} 个质押代币`);
      toast({
        title: "铸造成功",
        description: `成功铸造 ${amount} 个质押代币`,
      });

      // 清空输入
      setAmount("");
    } catch (error) {
      console.error("铸造代币时出错:", error);
      setMintingStatus("error");
      setStatusMessage("铸造失败，请重试");
      toast({
        title: "铸造失败",
        description: "无法铸造代币，请重试",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-cyan-900/20 border border-cyan-800/40 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Coins className="h-5 w-5 text-cyan-400 mt-1" />
          <div>
            <h3 className="text-base font-medium text-white mb-1">
              质押代币铸造
            </h3>
            <p className="text-sm text-gray-300 mb-2">
              您可以为自己的账户铸造质押代币，用于参与质押获取奖励。
            </p>
            <p className="text-xs text-gray-400">
              注意：在实际生产环境中，代币通常需要通过购买或其他方式获得。此铸造功能仅用于测试目的。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="mint-amount"
            className="text-sm font-medium text-gray-200"
          >
            铸造数量
          </label>
          <div className="flex space-x-2">
            <Input
              id="mint-amount"
              type="number"
              placeholder="输入铸造数量"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAmount("1000")}
              className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
            >
              1000
            </Button>
          </div>
        </div>

        <Button
          onClick={handleMint}
          disabled={isMinting || !amount || parseFloat(amount) <= 0}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
        >
          {isMinting ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              铸造中...
            </>
          ) : (
            <>
              <Coins className="mr-2 h-4 w-4" />
              铸造质押代币
            </>
          )}
        </Button>
      </div>

      {mintingStatus !== "idle" && (
        <Alert
          className={`${
            mintingStatus === "success"
              ? "bg-green-900/30 border-green-800 text-green-300"
              : "bg-red-900/30 border-red-800 text-red-300"
          }`}
        >
          {mintingStatus === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function AdminMinterContent({
  signer,
  account,
}: {
  signer: ethers.Signer | null;
  account: string;
}) {
  const [stakingAmount, setStakingAmount] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [activeTab, setActiveTab] = useState("staking");
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const { toast } = useToast();
  const { stakingTokenAddress, rewardsTokenAddress } = getContractAddresses();

  const handleMint = async (tokenType: "staking" | "reward") => {
    if (!signer) return;

    const amount = tokenType === "staking" ? stakingAmount : rewardAmount;
    if (!amount || parseFloat(amount) <= 0) return;

    const tokenAddress =
      tokenType === "staking" ? stakingTokenAddress : rewardsTokenAddress;
    const tokenName = tokenType === "staking" ? "质押代币" : "奖励代币";

    try {
      setIsMinting(true);
      setMintingStatus("idle");
      setStatusMessage("");

      // 获取代币合约
      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signer);

      // 转换为wei单位
      const mintAmount = ethers.parseEther(amount);

      // 调用mint函数
      const tx = await tokenContract.mint(mintAmount);

      // 显示交易处理中提示
      toast({
        title: "铸造处理中",
        description: `请在钱包中确认${tokenName}铸造交易`,
      });

      // 等待交易确认
      await tx.wait();

      // 更新状态和提示
      setMintingStatus("success");
      setStatusMessage(`成功铸造 ${amount} 个${tokenName}`);
      toast({
        title: "铸造成功",
        description: `成功铸造 ${amount} 个${tokenName}`,
      });

      // 清空输入
      if (tokenType === "staking") {
        setStakingAmount("");
      } else {
        setRewardAmount("");
      }
    } catch (error) {
      console.error(`铸造${tokenName}时出错:`, error);
      setMintingStatus("error");
      setStatusMessage(`铸造${tokenName}失败，请重试`);
      toast({
        title: "铸造失败",
        description: `无法铸造${tokenName}，请重试`,
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-purple-900/20 border border-purple-800/40 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-purple-400 mt-1" />
          <div>
            <h3 className="text-base font-medium text-white mb-1">
              管理员铸造权限
            </h3>
            <p className="text-sm text-gray-300 mb-2">
              作为管理员，您可以铸造质押代币和奖励代币。
            </p>
            <p className="text-xs text-gray-400">
              铸造的质押代币可分发给用户参与质押，奖励代币用于设置质押奖励。
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 p-1">
          <TabsTrigger
            value="staking"
            className="py-3 text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-900/60 data-[state=active]:to-blue-900/60"
          >
            <Coins className="h-4 w-4 mr-2 text-cyan-400" />
            质押代币
          </TabsTrigger>
          <TabsTrigger
            value="reward"
            className="py-3 text-base font-semibold data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-900/60 data-[state=active]:to-pink-900/60"
          >
            <Shield className="h-4 w-4 mr-2 text-purple-400" />
            奖励代币
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staking" className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="staking-mint-amount"
                className="text-sm font-medium text-gray-200"
              >
                铸造数量
              </label>
              <div className="flex space-x-2">
                <Input
                  id="staking-mint-amount"
                  type="number"
                  placeholder="输入质押代币铸造数量"
                  value={stakingAmount}
                  onChange={(e) => setStakingAmount(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStakingAmount("10000")}
                  className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  10000
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStakingAmount("100000")}
                  className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  100000
                </Button>
              </div>
            </div>

            <Button
              onClick={() => handleMint("staking")}
              disabled={
                isMinting || !stakingAmount || parseFloat(stakingAmount) <= 0
              }
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            >
              {isMinting && activeTab === "staking" ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  铸造中...
                </>
              ) : (
                <>
                  <Coins className="mr-2 h-4 w-4" />
                  铸造质押代币
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="reward" className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="reward-mint-amount"
                className="text-sm font-medium text-gray-200"
              >
                铸造数量
              </label>
              <div className="flex space-x-2">
                <Input
                  id="reward-mint-amount"
                  type="number"
                  placeholder="输入奖励代币铸造数量"
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRewardAmount("10000")}
                  className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  10000
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRewardAmount("100000")}
                  className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  100000
                </Button>
              </div>
            </div>

            <Button
              onClick={() => handleMint("reward")}
              disabled={
                isMinting || !rewardAmount || parseFloat(rewardAmount) <= 0
              }
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
              {isMinting && activeTab === "reward" ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  铸造中...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  铸造奖励代币
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {mintingStatus !== "idle" && (
        <Alert
          className={`${
            mintingStatus === "success"
              ? "bg-green-900/30 border-green-800 text-green-300"
              : "bg-red-900/30 border-red-800 text-red-300"
          }`}
        >
          {mintingStatus === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      <div className="text-sm text-yellow-400 bg-yellow-900/20 border border-yellow-800/30 p-4 rounded-lg">
        <AlertCircle className="h-4 w-4 inline-block mr-2" />
        注意：铸造功能应当谨慎使用。在实际部署时，您可能希望添加额外的权限控制和限制。
      </div>
    </div>
  );
}
