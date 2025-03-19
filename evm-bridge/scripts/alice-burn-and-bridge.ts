import {ethers} from "ethers";
import * as dotenv from "dotenv";
import { EvmBridge, EvmBridge__factory, BridgeErc20, BridgeErc20__factory } from "../typechain-types";


export async function evmBurnAndBridgeAliceTokens(evmBridgeAddress: string, tokenAddress: string, amount: bigint) {
  dotenv.config();
  const alicePrivateKey = process.env.ALICE_PRIVATE_KEY;
  if (!alicePrivateKey) throw new Error("ALICE_PRIVATE_KEY not set");


  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(alicePrivateKey, provider);

  const evmBridge: EvmBridge = EvmBridge__factory.connect(evmBridgeAddress, wallet);
  const token: BridgeErc20 = BridgeErc20__factory.connect(tokenAddress, wallet);

  // const amountBN = ethers.BigNumber.from(amount.toString());

  // Call burnAndBridge on the EvmBridge contract.
  const tx = await evmBridge.burnAndBridge(token, amount);

  // Wait for the transaction to be mined.
  const receipt = await tx.wait();
  console.log("Transaction sent. Hash:", tx.hash);

}