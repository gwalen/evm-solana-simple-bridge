import * as anchor from "@coral-xyz/anchor";
import { spawn } from "child_process";
import path from "path";
import { ethers } from "ethers";
import { EvmListener } from "./evm-listener";
import { BridgeErc20, BridgeErc20__factory } from "../../evm-bridge/typechain-types"; // Adjust the import path accordingly
import * as fs from "fs";
import { evmBurnAndBridgeAliceTokens } from "../../evm-bridge/scripts/alice-burn-and-bridge"
import { registerSolanaTokenOnEvm } from "../../evm-bridge/scripts/register-solana-token"
import { solanaBurnAndBridgeAliceTokens } from "../../solana-node/scripts/alice-burn-and-bridge"
import { registerEvmTokenOnSolana } from "../../solana-node/scripts/register-evm-token"
import { createAnchorProvider, SolanaDeployments } from "../../solana-node/tests/utils"
import { EvmDeployments } from "../../evm-bridge/scripts/utils"
import { SolanaListener } from "./solana-listener";
import { MINT_DECIMALS as SOLANA_TOKEN_DECIMALS } from "../../solana-node/tests/consts";
import { PublicKey } from "@solana/web3.js";

const EVM_BRIDGE_CONTRACT_ADDRESS = "0x663F3ad617193148711d28f5334eE4Ed07016602";

export async function appListen() {
  let [evmBridgeAddress, evmTokenAddress] = await initializeEvm();
  console.log("Evm contracts deployed");
  let [solanaBridgeAddress, solanaTokenAddress] = await initializeSolana();
  console.log("Solana contracts deployed");

  const solanaTokenAddressAs32Bytes = "0x" + (new PublicKey(solanaTokenAddress)).toBuffer().toString("hex");
  console.log("solanaTokenAddressAs32Bytes :", solanaTokenAddressAs32Bytes);

  await registerSolanaTokenOnEvm(
    evmBridgeAddress,
    evmTokenAddress,
    // solanaTokenAddressAs32Bytes,
    (new PublicKey(solanaTokenAddress)).toBytes()
  );

  await registerEvmTokenOnSolana(evmTokenAddress, solanaTokenAddress);

  console.log("Starting Evm listeners...");
  const evmListener = new EvmListener("ws://localhost:8545", evmBridgeAddress);
  evmListener.listenForBurnEvent();
  evmListener.listenForMintEvent();

  console.log("Starting Solana listeners...");
  const solanaListener = new SolanaListener("http://127.0.0.1:8899");
  solanaListener.listenForBurnEvent();
  solanaListener.listenForMintEvent();

  await evmBurnAndBridgeAliceTokens(evmBridgeAddress, evmTokenAddress, 1000n);
  await solanaBurnAndBridgeAliceTokens(new anchor.BN(1 * 10 ** SOLANA_TOKEN_DECIMALS));

  // TODO: mint tokens on EVM on BurnEvent on Solana

  // TODO: mint tokens on Solana on BurnEvent on EVM

  // TODO: rename SolanaNode to SolanaBridge

  // TODO: README : how to install all components and build / test unit / test integration
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