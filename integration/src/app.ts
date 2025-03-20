import * as anchor from "@coral-xyz/anchor";
import { spawn } from "child_process";
import path from "path";
import { EvmListener } from "./evm-listener";
import * as fs from "fs";
import { evmBurnAndBridgeAliceTokens } from "../../evm-bridge/scripts/alice-burn-and-bridge"
import { registerSolanaTokenOnEvm } from "../../evm-bridge/scripts/register-solana-token"
import { solanaBurnAndBridgeAliceTokens } from "../../solana-bridge/scripts/alice-burn-and-bridge"
import { registerEvmTokenOnSolana } from "../../solana-bridge/scripts/register-evm-token"
import { SolanaDeployments } from "../../solana-bridge/tests/utils"
import { EvmDeployments } from "../../evm-bridge/scripts/utils"
import { SolanaListener } from "./solana-listener";
import { MINT_DECIMALS as SOLANA_TOKEN_DECIMALS } from "../../solana-bridge/tests/consts";
import { PublicKey } from "@solana/web3.js";


export async function appListen() {
  const evmRelayerPrivateKey = process.env.RELAYER_PRIVATE_KEY_EVM;
  if (!evmRelayerPrivateKey) throw new Error("RELAYER_PRIVATE_KEY_EVM not set");
  const aliceRelayerPrivateKey = process.env.ALICE_PRIVATE_KEY_EVM;
  if (!aliceRelayerPrivateKey) throw new Error("ALICE_PRIVATE_KEY_EVM not set");
  const solanaRpcUrl = process.env.SOLANA_RPC_URL;
  if (!solanaRpcUrl) throw new Error("SOLANA_RPC_URL not set");
  const evmRpcUrl = process.env.EVM_RPC_URL;
  if (!evmRpcUrl) throw new Error("EVM_RPC_URL not set");
  const evmWsRpcUrl = process.env.EVM_WS_RPC_URL;
  if (!evmWsRpcUrl) throw new Error("EVM_WS_RPC_URL not set");

  let [evmBridgeAddress, evmTokenAddress] = await initializeEvm();
  console.log("Evm contracts deployed");
  let [solanaBridgeAddress, solanaTokenAddress] = await initializeSolana();
  console.log("Solana contracts deployed");

  const solanaTokenAddressAs32Bytes = "0x" + (new PublicKey(solanaTokenAddress)).toBuffer().toString("hex");
  console.log("solanaTokenAddressAs32Bytes :", solanaTokenAddressAs32Bytes);

  await registerSolanaTokenOnEvm(
    evmBridgeAddress,
    evmTokenAddress,
    (new PublicKey(solanaTokenAddress)).toBytes()
  );

  await registerEvmTokenOnSolana(evmTokenAddress, solanaTokenAddress);

  console.log("Starting Evm listeners...");
  const evmListener = new EvmListener(
    evmWsRpcUrl,
    solanaRpcUrl,
    evmBridgeAddress,
    solanaTokenAddress
  );
  evmListener.listenForBurnEvent();
  evmListener.listenForMintEvent();

  console.log("Starting Solana listeners...");
  const solanaListener = new SolanaListener(
    evmRpcUrl,
    solanaRpcUrl,
    evmBridgeAddress,
    evmTokenAddress,
    aliceRelayerPrivateKey,
    evmRelayerPrivateKey,
  );
  solanaListener.listenForBurnEvent();
  solanaListener.listenForMintEvent();

  await evmBurnAndBridgeAliceTokens(evmBridgeAddress, evmTokenAddress, 1000n);
  await solanaBurnAndBridgeAliceTokens(new anchor.BN(1 * 10 ** SOLANA_TOKEN_DECIMALS));


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
    const solanaBridgeDir = path.resolve(__dirname, "../../solana-bridge");

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

    const deploymentsJson = fs.readFileSync("../solana-bridge/deployments.json", "utf-8");
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