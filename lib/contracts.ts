import StakingABI from "../artifacts/contracts/StakingRewards.sol/StakingRewards.json";
import TokenABI from "../artifacts/contracts/ERC20.sol/ERC20.json";
// Replace these with your actual contract addresses
export function getContractAddresses() {
  return {
    stakingAddress: "0xcB52f04f2f5d0a71dE308DAd9C14623Ac57DbC0a", // Replace with your staking contract address
    stakingTokenAddress: "0xC51a331F7510817f2b2c7d29088e2c28273e5051", // Replace with your staking token address
    rewardsTokenAddress: "0xFfF871C5b835533F53E1EFef24ee115346E6E652", // Replace with your rewards token address
  }
}

// ABI for the StakingRewards contract
export const stakingABI = StakingABI.abi;

// ABI for ERC20 token
export const tokenABI =TokenABI.abi;
