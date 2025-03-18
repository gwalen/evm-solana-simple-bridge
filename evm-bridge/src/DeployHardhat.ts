// import hre from "hardhat";
// const { ethers, upgrades } = hre;
import { ethers } from "hardhat";
// import { upgrades } from "@openzeppelin/hardhat-upgrades";
import { Contract } from "ethers";

async function main() {
  // Read environment variables
  const deployerPrivateKey = process.env.PRIVATE_KEY;
  if (!deployerPrivateKey) throw new Error("PRIVATE_KEY not set");

  const owner = process.env.OWNER;
  if (!owner) throw new Error("OWNER not set");

  const relayer = process.env.RELAYER;
  if (!relayer) throw new Error("RELAYER not set");

  // Optionally, use a custom RPC URL if provided (otherwise, Hardhat's default provider is used)
  const rpcUrl = process.env.RPC_URL || "";
  const provider = rpcUrl
    ? new ethers.providers.JsonRpcProvider(rpcUrl)
    : ethers.provider;

  // Create a deployer wallet instance
  const wallet = new ethers.Wallet(deployerPrivateKey, provider);
  console.log("Deploying contracts with the account:", wallet.address);

  // Deploy EvmBridge as a UUPS proxy
  const EvmBridgeFactory = await hre.ethers.getContractFactory("EvmBridge", wallet);
  const evmBridge: Contract = await upgrades.deployProxy(
    EvmBridgeFactory,
    [owner, relayer],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await evmBridge.deployed();
  console.log("EvmBridge deployed at:", evmBridge.address);

  // Deploy BridgeErc20 as a UUPS proxy, passing in the bridge's address as one of the initializer args.
  const BridgeErc20Factory = await ethers.getContractFactory("BridgeErc20", wallet);
  const token: Contract = await upgrades.deployProxy(
    BridgeErc20Factory,
    ["Test Token", "TT", owner, evmBridge.address],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await token.deployed();
  console.log("BridgeErc20 deployed at:", token.address);

  // Compute a sample foreign token identifier (using keccak256 hash of "FOREIGN_TOKEN")
  const foreignId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FOREIGN_TOKEN"));

  // Register the token with the EvmBridge contract
  const txRegister = await evmBridge.registerForeignToken(token.address, foreignId);
  await txRegister.wait();
  console.log("Token registered with EvmBridge");

  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });