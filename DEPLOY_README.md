# 智能合约编译与部署指南

本文档提供了关于如何编译和部署智能合约的步骤。

## 前提条件

1. 安装Node.js和npm
2. 安装所需依赖：`npm install --legacy-peer-deps`
3. 创建.env文件（基于以下模板）

```
# 区块链网络RPC（例如Infura、Alchemy等提供的端点）
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# 部署账户私钥（不要包含0x前缀）
PRIVATE_KEY=your_private_key_here_without_0x_prefix

# Etherscan API 密钥（用于验证合约）
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## 编译合约

运行以下命令编译智能合约：

```bash
npx hardhat compile
```

编译成功后，合约构建文件会生成在 `artifacts` 目录下。

## 部署合约

### 部署到本地开发网络

1. 启动本地开发网络：

```bash
npx hardhat node
```

2. 在另一个终端窗口中部署合约：

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 部署到测试网络 (Sepolia)

确保您的 `.env` 文件包含正确的 Sepolia RPC URL 和私钥，然后运行：

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 部署到主网

**警告**：部署到主网会消耗真实的ETH。

```bash
npx hardhat run scripts/deploy.js --network mainnet
```

## 验证合约

部署后，您可以验证合约以便在Etherscan上查看源代码：

```bash
npx hardhat verify --network sepolia 已部署合约地址 构造函数参数1 构造函数参数2
```

例如：

```bash
npx hardhat verify --network sepolia 0x质押奖励合约地址 0x质押代币地址 0x奖励代币地址
```

## 合约功能

本项目包含三个合约：

1. `IERC20.sol` - ERC20接口
2. `ERC20.sol` - 基本ERC20代币实现
3. `StakingRewards.sol` - 质押奖励合约，用户可以质押代币并获得奖励

## 交互

部署后，您可以使用Web3.js、ethers.js或其他前端库与合约交互。 