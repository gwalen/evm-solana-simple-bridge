import { spawn, ChildProcess } from "child_process";
import path from "path";
import * as fs from "fs";
import { sleep, SolanaDeployments } from "../../solana-bridge/tests/utils";
import { EvmDeployments } from "../../evm-bridge/scripts/utils";

// Spawn Anvil for the EVM test network in the ../evm-bridge directory,
// redirecting stdout and stderr to ".anvil_log"
export async function spawnAnvil(): Promise<ChildProcess> {
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
export async function spawnSolanaValidator(): Promise<ChildProcess> {
  console.log("Starting Solana Test Validator...");
  const solanaBridgeDir = path.resolve(__dirname, "../../solana-bridge");
  const solanaLogFile = path.resolve(solanaBridgeDir, ".solana_validator_log");
  const logFd = fs.openSync(solanaLogFile, "a");
  const solanaProgramBinaryDir = path.resolve(__dirname, "../../solana-bridge/target/deploy/solana_bridge.so");

  const validatorArgs = [
    "--reset",
    "--ledger", ".standalone_ledger/test-ledger",
    "--mint", "pFCBP4bhqdSsrWUVTgqhPsLrfEdChBK17vgFM7TxjxQ",
    "--bpf-program", "BNnLzXd4awDnxnycVseH2aN2dHV5grBQc6ucJJabtiZt",
    solanaProgramBinaryDir
  ];

  let validatorProcess;
  validatorProcess = spawn("solana-test-validator", validatorArgs, {
    cwd: solanaBridgeDir,
    stdio: ["ignore", logFd, logFd],
    shell: true,
  });
  // Allow some time for the validator to boot up
  await sleep(5000);
  console.log("Solana Test Validator started.");
  return validatorProcess;
}

export function deployEvmContracts(): Promise<void> {
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

export function initializeSolanaContracts(): Promise<void> {
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

export async function initializeEvm(): Promise<[string, string]> {
  console.log("Deploying Evm contracts...");
  await deployEvmContracts();
  const deploymentsJson = fs.readFileSync("../evm-bridge/deployments.json", "utf-8");
  const deployments: EvmDeployments = JSON.parse(deploymentsJson);
  console.log("Evm bridge address:", deployments.evmBridge);
  console.log("Evm token address:", deployments.evmTokenAddress);
  return [deployments.evmBridge, deployments.evmTokenAddress];
}

export async function initializeSolana(): Promise<[string, string]> {
  console.log("Init Solana contracts and accounts...");
  await initializeSolanaContracts();
  const deploymentsJson = fs.readFileSync("../solana-bridge/deployments.json", "utf-8");
  const deployments: SolanaDeployments = JSON.parse(deploymentsJson);
  console.log("Solana bridge address:", deployments.solanaBridge);
  console.log("Solana token address:", deployments.solanaTokenAddress);
  return [deployments.solanaBridge, deployments.solanaTokenAddress];
}