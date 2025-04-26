// 部署脚本
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 更新contracts.ts文件中的合约地址
function updateContractsFile(stakingAddress, stakingTokenAddress, rewardsTokenAddress) {
  try {
    const contractsFilePath = path.join(__dirname, "../lib/contracts.ts");
    
    if (!fs.existsSync(contractsFilePath)) {
      console.error(`文件不存在: ${contractsFilePath}`);
      console.log("准备创建contracts.ts文件...");
      
      // 如果目录不存在，创建它
      const dirPath = path.join(__dirname, "../lib");
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // 创建文件内容
      const fileContent = `import StakingABI from "../artifacts/contracts/StakingRewards.sol/StakingRewards.json";
import TokenABI from "../artifacts/contracts/ERC20.sol/ERC20.json";

export function getContractAddresses() {
  return {
    stakingAddress: "${stakingAddress}",
    stakingTokenAddress: "${stakingTokenAddress}", 
    rewardsTokenAddress: "${rewardsTokenAddress}",
  }
}

// ABI for the StakingRewards contract
export const stakingABI = StakingABI.abi;

// ABI for ERC20 token
export const tokenABI = TokenABI.abi;
`;
      
      fs.writeFileSync(contractsFilePath, fileContent);
      console.log("contracts.ts文件已成功创建！");
      return;
    }
    
    // 读取原始文件内容
    let content = fs.readFileSync(contractsFilePath, 'utf8');
    
    // 使用正则表达式替换地址
    content = content.replace(
      /stakingAddress: "([^"]+)"/,
      `stakingAddress: "${stakingAddress}"`
    );
    content = content.replace(
      /stakingTokenAddress: "([^"]+)"/,
      `stakingTokenAddress: "${stakingTokenAddress}"`
    );
    content = content.replace(
      /rewardsTokenAddress: "([^"]+)"/,
      `rewardsTokenAddress: "${rewardsTokenAddress}"`
    );
    
    // 写入更新后的内容
    fs.writeFileSync(contractsFilePath, content);
    
    console.log("contracts.ts文件已成功更新！");
  } catch (error) {
    console.error("更新contracts.ts文件时出错:", error);
    throw error;
  }
}

async function main() {
  try {
    console.log("开始部署合约...");
    
    // 获取合约工厂
    const ERC20 = await ethers.getContractFactory("ERC20");
    const StakingRewards = await ethers.getContractFactory("StakingRewards");

    // 部署ERC20代币合约（作为质押代币）
    console.log("正在部署质押代币...");
    const stakingToken = await ERC20.deploy("质押代币", "STK");
    await stakingToken.waitForDeployment();
    const stakingTokenAddress = await stakingToken.getAddress();
    console.log("质押代币已部署至:", stakingTokenAddress);

    // 为部署者铸造一些代币
    const [deployer] = await ethers.getSigners();
    console.log("部署账户:", deployer.address);
    const mintAmount = ethers.parseEther("1000000");
    console.log("为部署者铸造质押代币...");
    await stakingToken.mint(mintAmount);
    console.log(`成功铸造了 ${ethers.formatEther(mintAmount)} 个质押代币给 ${deployer.address}`);

    // 部署ERC20代币合约（作为奖励代币）
    console.log("正在部署奖励代币...");
    const rewardsToken = await ERC20.deploy("奖励代币", "RWD");
    await rewardsToken.waitForDeployment();
    const rewardsTokenAddress = await rewardsToken.getAddress();
    console.log("奖励代币已部署至:", rewardsTokenAddress);

    // 为部署者铸造一些奖励代币
    console.log("为部署者铸造奖励代币...");
    await rewardsToken.mint(mintAmount);
    console.log(`成功铸造了 ${ethers.formatEther(mintAmount)} 个奖励代币给 ${deployer.address}`);

    // 部署StakingRewards合约
    console.log("正在部署质押奖励合约...");
    const stakingRewards = await StakingRewards.deploy(
      stakingTokenAddress,
      rewardsTokenAddress
    );
    await stakingRewards.waitForDeployment();
    const stakingAddress = await stakingRewards.getAddress();
    console.log("质押奖励合约已部署至:", stakingAddress);
    
    // 设置奖励参数
    console.log("配置奖励参数...");
    // 30天（以秒为单位）的奖励期限
    const rewardsDuration = 30 * 24 * 60 * 60;
    const durationTx = await stakingRewards.setRewardsDuration(rewardsDuration);
    // 等待交易确认
    await durationTx.wait();
    console.log(`奖励期限设置为: ${rewardsDuration} 秒`);
    
    // 向奖励合约发送奖励代币
    const rewardAmount = ethers.parseEther("100000");
    console.log(`向奖励合约转入 ${ethers.formatEther(rewardAmount)} 个奖励代币...`);
    const transferTx = await rewardsToken.transfer(stakingAddress, rewardAmount);
    // 等待交易确认
    await transferTx.wait();
    
    // 通知奖励金额
    console.log("通知奖励金额...");
    const notifyTx = await stakingRewards.notifyRewardAmount(rewardAmount);
    // 等待交易确认
    await notifyTx.wait();
    console.log("奖励配置完成！");
    
    // 更新contracts.ts文件
    console.log("更新contracts.ts文件...");
    updateContractsFile(stakingAddress, stakingTokenAddress, rewardsTokenAddress);
    
    console.log("部署完成！合约地址:");
    console.log({
      stakingAddress,
      stakingTokenAddress,
      rewardsTokenAddress
    });
  } catch (error) {
    console.error("部署过程中出错:", error);
    process.exit(1);
  }
}

// 运行脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("致命错误:", error);
    process.exit(1);
  }); 