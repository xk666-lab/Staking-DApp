import StakingABI from "../artifacts/contracts/StakingRewards.sol/StakingRewards.json";
import TokenABI from "../artifacts/contracts/ERC20.sol/ERC20.json";
// Replace these with your actual contract addresses
export function getContractAddresses() {
  return {
    stakingAddress: "0x2Ff11b211e514febF5d5ae65D0611A6A4B3De6D5", // Replace with your staking contract address
    stakingTokenAddress: "0x2c087531DFF3DCe54aafD5E44EB277EDa6E176f0", // Replace with your staking token address
    rewardsTokenAddress: "0x39E7B07Cc9ABe56cD1b8923C6B9fDd399A18088e", // Replace with your rewards token address
  }
}

// ABI for the StakingRewards contract
export const stakingABI = StakingABI.abi;

// ABI for ERC20 token
export const tokenABI =TokenABI.abi;
