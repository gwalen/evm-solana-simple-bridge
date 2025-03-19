import {ethers} from "ethers";
import * as dotenv from "dotenv";
import { EvmBridge, EvmBridge__factory, BridgeErc20, BridgeErc20__factory } from "../typechain-types";


export async function evmBurnAndBridgeAliceTokens(evmBridgeAddress: string, tokenAddress: string, amount: bigint) {
  dotenv.config();
  const alicePrivateKey = process.env.ALICE_PRIVATE_KEY_EVM;
  if (!alicePrivateKey) throw new Error("ALICE_PRIVATE_KEY_EVM not set");

  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(alicePrivateKey, provider);

  const evmBridge: EvmBridge = EvmBridge__factory.connect(evmBridgeAddress, wallet);
  const token: BridgeErc20 = BridgeErc20__factory.connect(tokenAddress, wallet);

  const tx = await evmBridge.burnAndBridge(token, amount);

  // Wait for the transaction to be mined.
  await tx.wait();
  console.log("Transaction sent. Hash:", tx.hash);
}