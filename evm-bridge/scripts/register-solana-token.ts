import {ethers} from "ethers";
import * as dotenv from "dotenv";
import { EvmBridge, EvmBridge__factory, BridgeErc20, BridgeErc20__factory } from "../typechain-types";


export async function registerSolanaTokenOnEvm(
  evmBridgeAddress: string, 
  evmTokenAddress: string,
  // solanaTokenAddressAsHex: string,
  solanaTokenAddressAsBytes: Uint8Array
) {
  dotenv.config();
  const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY_EVM;
  if (!ownerPrivateKey) throw new Error("OWNER_PRIVATE_KEY_EVM not set");

  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const wallet = new ethers.Wallet(ownerPrivateKey, provider);

  const evmBridge: EvmBridge = EvmBridge__factory.connect(evmBridgeAddress, wallet);
  const token: BridgeErc20 = BridgeErc20__factory.connect(evmTokenAddress, wallet);

  console.log("owner: ", await evmBridge.owner());
  // const tx = await evmBridge.registerForeignToken(evmTokenAddress, solanaTokenAddressAsHexBytes);
  // const tx = await evmBridge.registerForeignToken(token, solanaTokenAddressAsHex);
  const tx = await evmBridge.registerForeignToken(token, solanaTokenAddressAsBytes);

  // Wait for the transaction to be mined.
  await tx.wait();
  console.log("Transaction sent. Hash:", tx.hash);
}