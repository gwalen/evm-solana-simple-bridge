import {ethers} from "ethers";
import * as dotenv from "dotenv";
import { EvmBridge, EvmBridge__factory, BridgeErc20, BridgeErc20__factory } from "../typechain-types";


export async function registerSolanaTokenOnEvm(
  evmBridgeAddress: string, 
  evmTokenAddress: string,
  solanaTokenAddressAsBytes: Uint8Array
) {
  dotenv.config();
  const ownerPrivateKey = process.env.OWNER_PRIVATE_KEY_EVM;
  if (!ownerPrivateKey) throw new Error("OWNER_PRIVATE_KEY_EVM not set");
  const evmRpcUrl = process.env.EVM_RPC_URL;
  if (!evmRpcUrl) throw new Error("EVM_RPC_URL not set");

  const provider = new ethers.JsonRpcProvider(evmRpcUrl);
  const wallet = new ethers.Wallet(ownerPrivateKey, provider);

  const evmBridge: EvmBridge = EvmBridge__factory.connect(evmBridgeAddress, wallet);
  const token: BridgeErc20 = BridgeErc20__factory.connect(evmTokenAddress, wallet);

  const tx = await evmBridge.registerForeignToken(token, solanaTokenAddressAsBytes);

  await tx.wait();
}