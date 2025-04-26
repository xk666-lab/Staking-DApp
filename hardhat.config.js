// 使用正确的配置
require("@nomicfoundation/hardhat-toolbox");
const fs = require("fs");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  defaultNetwork: "geth",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    hardhat: {
      // 本地开发网络
    },
    geth: {
      url: "http://127.0.0.1:8545", // 本地geth节点的RPC地址
      chainId: 1337, // 本地geth默认链ID，根据您的配置可能需要调整
      accounts: [
        "0xa07faed28cfb8015912b893374e2a53ef74ac47449519bff5aebc43305a2e6c0",
        "0xc392c8c2f574f94aff10062c5c17eae39dc5f0dce52ebe78df234552eb56342f",
        "0x76111fa1d21490c578b085d820aedcdaba2bf8e6fa284ccf5b2a3eacabca30e2"
      ]
    }
  }
};
