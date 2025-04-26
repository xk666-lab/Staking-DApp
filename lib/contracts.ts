import StakingABI from "../artifacts/contracts/StakingRewards.sol/StakingRewards.json";
import TokenABI from "../artifacts/contracts/ERC20.sol/ERC20.json";
// Replace these with your actual contract addresses
export function getContractAddresses() {
  return {
    stakingAddress: "0xC5b34E9D756E04c463d1d2dd73c3D06529351686", // Replace with your staking contract address
    stakingTokenAddress: "0x3c0BECEE9085C80DBCD8b2bbA55a537CbBB420ee", // Replace with your staking token address
    rewardsTokenAddress: "0x505e96Bef7fC6e4ca1C46d834D6879E1Ac2A3c83", // Replace with your rewards token address
  }
}

// ABI for the StakingRewards contract
export const stakingABI = StakingABI.abi;

// ABI for ERC20 token
export const tokenABI =TokenABI.abi;
