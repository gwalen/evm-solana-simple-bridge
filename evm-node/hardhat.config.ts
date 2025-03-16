import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "@typechain/hardhat";

/** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.28",
// };

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          viaIR: false,
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./src",
    tests: "./ts-scripts/tests",
  },
  networks: {
    // TESTING
    // hardhat: {
    //   chainId: 31337,
    //   allowUnlimitedContractSize: true,
    // },
    // MAINNETS
    // [Network.ARBITRUM]: {
    //   url: ARBITRUM_ONE_RPC_URL,
    //   accounts: [PROD_PRIVATE_KEY!],
    // },
    // [Network.ETHEREUM]: {
    //   url: ETH_RPC_URL,
    //   accounts: [PROD_PRIVATE_KEY!],
    // },
  },

  typechain: {
    target: "ethers-v6",
    outDir: "typechain-types",
  },
};

export default config;

