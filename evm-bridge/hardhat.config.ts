import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-deploy";
import "@openzeppelin/hardhat-upgrades";

// import "@nomiclabs/hardhat-ethers"
import "@typechain/hardhat";

import "@foundry-rs/hardhat-anvil";

/** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: "0.8.28",
// };


module.exports = {
  defaultNetwork: "anvil",
    anvil: {
      url: "http://127.0.0.1:8545/",
      launch: false, // if set to `true`, it will spawn a new instance if the plugin is initialized, if set to `false` it expects an already running anvil instance
    }
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.22",
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

