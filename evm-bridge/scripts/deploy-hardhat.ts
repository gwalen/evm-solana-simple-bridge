import hre from "hardhat";
const { ethers, upgrades } = hre;
import { keccak256, toUtf8Bytes } from "ethers";
import * as fs from "fs";
import * as dotenv from 'dotenv';

dotenv.config();

export async function deployContracts() {
  const deployerPrivateKey = process.env.OWNER_PRIVATE_KEY_EVM;
  if (!deployerPrivateKey) throw new Error("OWNER_PRIVATE_KEY_EVM not set");

  const owner = process.env.OWNER;
  if (!owner) throw new Error("OWNER not set");

  const relayer = process.env.RELAYER;
  if (!relayer) throw new Error("RELAYER not set");

  const alice = process.env.ALICE;
  if (!alice) throw new Error("ALICE not set");

  // Optionally, use a custom RPC URL if provided, otherwise use Hardhat's default provider.
  const provider = ethers.provider;

  // Create a deployer wallet instance.
  const wallet = new ethers.Wallet(deployerPrivateKey, provider);
  console.log("Deploying contracts with the account:", wallet.address);

  // Deploy EvmBridge as a UUPS proxy and cast to the correct type.
  const EvmBridgeFactory = await ethers.getContractFactory("EvmBridge", wallet);
  const evmBridge = await upgrades.deployProxy(
    EvmBridgeFactory,
    [owner, relayer],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await evmBridge.waitForDeployment();
  const evmBridgeAddress = await evmBridge.getAddress();
  console.log("EvmBridge deployed at:", evmBridgeAddress);

  // Similarly, deploy BridgeErc20 as a UUPS proxy.
  const BridgeErc20Factory = await ethers.getContractFactory("BridgeErc20", wallet);
  const token = (await upgrades.deployProxy(
    BridgeErc20Factory,
    ["Test Token", "TT", owner, await evmBridgeAddress],
    {
      initializer: "initialize",
      kind: "uups",
    }
  ));
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("BridgeErc20 deployed at:", tokenAddress);

  // Compute a sample foreign token identifier (using keccak256 hash of "FOREIGN_TOKEN")
  const foreignId = keccak256(toUtf8Bytes("FOREIGN_TOKEN"));

  // Register the token with the EvmBridge contract
  const txRegister = await evmBridge.registerForeignToken(token.getAddress(), foreignId);
  await txRegister.wait();

  // Mint tokens to alice for future use
  const txMint = await token.mint(alice, 100 * 10**6);
  await txMint.wait();

  // Write the deployed addresses to a deployments.json file
  const deployments = {
    evmBridge: evmBridgeAddress,
    evmTokenAddress: tokenAddress,
  };
  fs.writeFileSync("deployments.json", JSON.stringify(deployments, null, 2));
  console.log("Deployed EVM addresses saved to deployments.json");
}

deployContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });