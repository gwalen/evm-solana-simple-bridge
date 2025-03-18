import { spawn } from "child_process";
import path from "path";
import { ethers } from "ethers";
import { EvmListener } from "./evm-listener";
import { BridgeErc20, BridgeErc20__factory } from "../../evm-bridge/typechain-types"; // Adjust the import path accordingly
import * as fs from "fs";
import {burnAndBridgeAliceTokens} from "../../evm-bridge/scripts/AliceBurnAndBridge"

const EVM_BRIDGE_CONTRACT_ADDRESS = "0x663F3ad617193148711d28f5334eE4Ed07016602";

interface EvmDeployments {
  evmBridge: string;
  bridgeErc20: string;
}

/**
 * Spawns a process to run the Hardhat deploy script from the evm-bridge directory.
 */
function deployEvmContracts(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Resolve the path to the evm-bridge directory relative to this file
    const evmBridgeDir = path.resolve(__dirname, "../../evm-bridge");

    // Command to run Hardhat deploy script using npx
    const command = "npx";
    // Adjust the script path if necessary; here we assume the deploy script is at scripts/DeployHardhat.ts
    const args = ["ts-node", "./scripts/DeployHardhat.ts"];

    // Spawn the process with the working directory set to the evm-bridge folder
    const deployProcess = spawn(command, args, {
      cwd: evmBridgeDir,
      stdio: "inherit", // inherit stdio to see output in your console
    });

    deployProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Deployment script exited with code ${code}`));
      }
    });
  });
}

export async function appListen() {
  let evmBridgeAddress;
  let bridgeErc20Address;
  try {
    console.log("Deploying Evm contracts...");
    await deployEvmContracts();

    console.log("Current working directory:", process.cwd());
    console.log("script directory:", __dirname);

    // const filePath = path.join(__dirname, "../../evm-bridge/deployments.json");
    // const deploymentsJson = fs.readFileSync(filePath, "utf-8");
    const deploymentsJson = fs.readFileSync("../evm-bridge/deployments.json", "utf-8");
    const deployments: EvmDeployments = JSON.parse(deploymentsJson);

    console.log("EvmBridge address:", deployments.evmBridge);
    console.log("BridgeErc20 address:", deployments.bridgeErc20);
    evmBridgeAddress = deployments.evmBridge;
    bridgeErc20Address = deployments.bridgeErc20;

    console.log("Evm contracts deployed. Starting listeners...");
  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }

  const evmListener = new EvmListener("ws://localhost:8545", evmBridgeAddress);
  // Start listening for burn events
  evmListener.listenForBurnEvent();
  // Start listening for mint events
  evmListener.listenForMintEvent();


  // burn and bridge alice tokens
  await burnAndBridgeAliceTokens(evmBridgeAddress, bridgeErc20Address, 1000n);
}

appListen().catch(console.error);