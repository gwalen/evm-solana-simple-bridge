import { spawn } from "child_process";
import path from "path";
import { ethers } from "ethers";
import { EvmListener } from "./evm-listener";
import { BridgeErc20, BridgeErc20__factory } from "../../evm-bridge/typechain-types"; // Adjust the import path accordingly
import * as fs from "fs";
import {burnAndBridgeAliceTokens} from "../../evm-bridge/scripts/alice-burn-and-bridge"

const EVM_BRIDGE_CONTRACT_ADDRESS = "0x663F3ad617193148711d28f5334eE4Ed07016602";

interface EvmDeployments {
  evmBridge: string;
  evmTokenAddress: string;
}

interface SolanaDeployments {
  solanaBridge: string,
  solanaTokenAddress: string
}

export async function appListen() {
  let [evmBridgeAddress, evmTokenAddress] = await initializeEvm();
  console.log("Evm contracts deployed");
  let [solanaBridgeAddress, solanaTokenAddress] = await initializeSolana();
  console.log("Solana contracts deployed");

  console.log("Starting Evm listeners...");
  const evmListener = new EvmListener("ws://localhost:8545", evmBridgeAddress);
  // Start listening for burn events
  evmListener.listenForBurnEvent();
  // Start listening for mint events
  evmListener.listenForMintEvent();


  // burn and bridge alice tokens
  await burnAndBridgeAliceTokens(evmBridgeAddress, evmTokenAddress, 1000n);
}

/** Helpers **/

/**
 * Spawns a process to run the Hardhat deploy script from the evm-bridge directory.
 */
function deployEvmContracts(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Resolve the path to the evm-bridge directory relative to this file
    const evmBridgeDir = path.resolve(__dirname, "../../evm-bridge");

    const command = "npx";
    const args = ["ts-node", "./scripts/deploy-hardhat.ts"];

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

/**
 * Spawns a process to run the deploy script from the solana-bridge directory.
 * On Solana program is deployed during validator startup do we just initialize it with complementary accounts.
 */
function initializeSolanaContracts(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Resolve the path to the solana-bridge directory relative to this file
    const solanaBridgeDir = path.resolve(__dirname, "../../solana-node");

    const command = "npx";
    const args = ["ts-node", "./scripts/init-accounts.ts"];

    // Spawn the process with the working directory set to the evm-bridge folder
    const deployProcess = spawn(command, args, {
      cwd: solanaBridgeDir,
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

async function initializeEvm(): Promise<[string, string]> {
  try {
    console.log("Deploying Evm contracts...");
    await deployEvmContracts();

    const deploymentsJson = fs.readFileSync("../evm-bridge/deployments.json", "utf-8");
    const deployments: EvmDeployments = JSON.parse(deploymentsJson);

    console.log("Evm bridge address:", deployments.evmBridge);
    console.log("Evm token address:", deployments.evmTokenAddress);

    return [deployments.evmBridge, deployments.evmTokenAddress];
  } catch (error) {
    console.error("Evm Deployment failed:", error);
    throw error;
  }
}

async function initializeSolana(): Promise<[string, string]> {
  try {
    console.log("Init Solana contracts and accounts...");
    await initializeSolanaContracts();

    const deploymentsJson = fs.readFileSync("../solana-node/deployments.json", "utf-8");
    const deployments: SolanaDeployments = JSON.parse(deploymentsJson);

    console.log("Solana bridge address:", deployments.solanaBridge);
    console.log("Solana token address:", deployments.solanaTokenAddress);

    return [deployments.solanaBridge, deployments.solanaTokenAddress];

  } catch (error) {
    console.error("Solana initialization failed:", error);
    throw error;
  }
}


appListen().catch(console.error);