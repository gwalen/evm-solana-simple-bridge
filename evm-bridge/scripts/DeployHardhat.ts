import hre from "hardhat";
const { ethers, upgrades } = hre;
import { JsonRpcProvider } from "ethers";
import { EvmBridge } from "../typechain-types"; // adjust path as needed
import { keccak256, toUtf8Bytes } from "ethers";

import * as dotenv from 'dotenv';

dotenv.config();

export async function deployContracts() {
  // Read environment variables
  const deployerPrivateKey = process.env.OWNER_PRIVATE_KEY;
  if (!deployerPrivateKey) throw new Error("OWNER_PRIVATE_KEY not set");

  const owner = process.env.OWNER;
  if (!owner) throw new Error("OWNER not set");

  const relayer = process.env.RELAYER;
  if (!relayer) throw new Error("RELAYER not set");

  // Optionally, use a custom RPC URL if provided, otherwise use Hardhat's default provider.
  const rpcUrl = process.env.RPC_URL || "";
  // const provider = rpcUrl ? new JsonRpcProvider(rpcUrl) : ethers.provider;
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
  // const evmBridge = await upgrades.deployProxy(
  //   EvmBridgeFactory,
  //   [owner, relayer]
  // );
  await evmBridge.waitForDeployment();
  console.log("EvmBridge deployed at:", await evmBridge.getAddress());

  // Similarly, deploy BridgeErc20 as a UUPS proxy.
  const BridgeErc20Factory = await ethers.getContractFactory("BridgeErc20", wallet);
  const token = (await upgrades.deployProxy(
    BridgeErc20Factory,
    ["Test Token", "TT", owner, await evmBridge.getAddress()],
    {
      initializer: "initialize",
      kind: "uups",
    }
  ));
  await token.waitForDeployment();
  console.log("BridgeErc20 deployed at:", await token.getAddress());

  // Compute a sample foreign token identifier (using keccak256 hash of "FOREIGN_TOKEN")
  const foreignId = keccak256(toUtf8Bytes("FOREIGN_TOKEN"));

  // Register the token with the EvmBridge contract
  const txRegister = await evmBridge.registerForeignToken(token.getAddress(), foreignId);
  await txRegister.wait();
  console.log("Token registered with EvmBridge");

  // test only
  const txMint = await token.mint(relayer, 1 *10 **6);
  await txMint.wait();

  console.log(await token.balanceOf(relayer));

  .. add alice wallet mint to her so we can later run her wallet with burnAndBridge to wait to event

  console.log("Deployment complete!");
}

deployContracts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });