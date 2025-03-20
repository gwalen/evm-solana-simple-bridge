import * as anchor from "@coral-xyz/anchor";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import * as fs from "fs";
import { evmBurnAndBridgeAliceTokens } from "../../evm-bridge/scripts/alice-burn-and-bridge";
import { registerSolanaTokenOnEvm } from "../../evm-bridge/scripts/register-solana-token";
import { solanaBurnAndBridgeAliceTokens } from "../../solana-bridge/scripts/alice-burn-and-bridge";
import { registerEvmTokenOnSolana } from "../../solana-bridge/scripts/register-evm-token";
import { sleep, SolanaDeployments } from "../../solana-bridge/tests/utils";
import { EvmDeployments } from "../../evm-bridge/scripts/utils";
import { MINT_DECIMALS as SOLANA_TOKEN_DECIMALS } from "../../solana-bridge/tests/consts";
import { PublicKey } from "@solana/web3.js";
import { OffChainRelayer } from "./off-chain-relayer";
import { exit } from "process";

// Helper function to add delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Spawn Anvil for the EVM test network in the ../evm-bridge directory
// redirecting stdout and stderr to ".anvil_log
async function spawnAnvil(): Promise<ChildProcess> {
  console.log("Starting Anvil (EVM test network)...");
  const evmBridgeDir = path.resolve(__dirname, "../../evm-bridge");
  const anvilLogFile = path.resolve(evmBridgeDir, ".anvil_log");
  const logFd = fs.openSync(anvilLogFile, "a");
  const anvilProcess = spawn("anvil", [], {
    cwd: evmBridgeDir,
    stdio: ["ignore", logFd, logFd],
    shell: true,
  });
  // Allow some time for anvil to boot up
  await sleep(3000);
  console.log("Anvil started.");
  return anvilProcess;
}

// Spawn Solana Validator in the ../solana-bridge directory with the specified parameters,
// redirecting stdout and stderr to ".solana_validator_log"
async function spawnSolanaValidator(): Promise<ChildProcess> {
  console.log("Starting Solana Test Validator...");
  const solanaBridgeDir = path.resolve(__dirname, "../../solana-bridge");
  const solanaLogFile = path.resolve(solanaBridgeDir, ".solana_validator_log");
  const logFd = fs.openSync(solanaLogFile, "a");
  const validatorArgs = [
    "--reset",
    "--ledger", ".standalone_ledger/test-ledger",
    "--mint", "pFCBP4bhqdSsrWUVTgqhPsLrfEdChBK17vgFM7TxjxQ",
    "--bpf-program", "BNnLzXd4awDnxnycVseH2aN2dHV5grBQc6ucJJabtiZt",
    "/Users/whale/development/workshop/new_job_hometask/2025/socket-labs/solana-bridge/target/deploy/solana_bridge.so"
  ];
  const validatorProcess = spawn("solana-test-validator", validatorArgs, {
    cwd: solanaBridgeDir,
    stdio: ["ignore", logFd, logFd],
    shell: true,
  });
  // Allow some time for the validator to boot up
  await sleep(5000);
  console.log("Solana Test Validator started.");
  return validatorProcess;
}

/** Existing helper functions remain unchanged */
function deployEvmContracts(): Promise<void> {
  return new Promise((resolve, reject) => {
    const evmBridgeDir = path.resolve(__dirname, "../../evm-bridge");
    const command = "npx";
    const args = ["ts-node", "./scripts/deploy-hardhat.ts"];
    const deployProcess = spawn(command, args, {
      cwd: evmBridgeDir,
      stdio: "inherit",
      shell: true,
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

function initializeSolanaContracts(): Promise<void> {
  return new Promise((resolve, reject) => {
    const solanaBridgeDir = path.resolve(__dirname, "../../solana-bridge");
    const command = "npx";
    const args = ["ts-node", "./scripts/init-accounts.ts"];
    const deployProcess = spawn(command, args, {
      cwd: solanaBridgeDir,
      stdio: "inherit",
      shell: true,
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
  console.log("Deploying Evm contracts...");
  await deployEvmContracts();
  const deploymentsJson = fs.readFileSync("../evm-bridge/deployments.json", "utf-8");
  const deployments: EvmDeployments = JSON.parse(deploymentsJson);
  console.log("Evm bridge address:", deployments.evmBridge);
  console.log("Evm token address:", deployments.evmTokenAddress);
  return [deployments.evmBridge, deployments.evmTokenAddress];
}

async function initializeSolana(): Promise<[string, string]> {
  console.log("Init Solana contracts and accounts...");
  await initializeSolanaContracts();
  const deploymentsJson = fs.readFileSync("../solana-bridge/deployments.json", "utf-8");
  const deployments: SolanaDeployments = JSON.parse(deploymentsJson);
  console.log("Solana bridge address:", deployments.solanaBridge);
  console.log("Solana token address:", deployments.solanaTokenAddress);
  return [deployments.solanaBridge, deployments.solanaTokenAddress];
}

/** Main function remains the same except for the listener and network spawning refactor */
export async function appListen() {
  // Spawn test blockchain networks
  const anvilProcess = await spawnAnvil();
  const validatorProcess = await spawnSolanaValidator();
  
  try {
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
  
    // Initialize and start the off-chain relayer that contains both listeners.
    const offChainRelayer = new OffChainRelayer(
      evmWsRpcUrl,
      solanaRpcUrl,
      evmBridgeAddress,
      solanaTokenAddress,
      evmRpcUrl,
      evmTokenAddress,
      aliceRelayerPrivateKey,
      evmRelayerPrivateKey
    );
    offChainRelayer.startListening();
  
    // Continue with token burn and bridging calls.
    await evmBurnAndBridgeAliceTokens(evmBridgeAddress, evmTokenAddress, 1000n);
    await solanaBurnAndBridgeAliceTokens(new anchor.BN(1 * 10 ** SOLANA_TOKEN_DECIMALS));
    // wait 15s for listeners to process events
    console.log("Wait before shout down");
    await sleep(15000);
  } finally {
    console.log("Shutting down test networks...");
    anvilProcess.kill();
    validatorProcess.kill();
    exit(0);
  }
}

appListen().catch(console.error);