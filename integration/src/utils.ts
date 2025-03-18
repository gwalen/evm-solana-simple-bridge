import { ethers } from "ethers";

// export function createEvmSignerWallet(
//   evmPrivateKeys: any[] | undefined
// ): ethers.Wallet {
//   // const evmRpc = extractEvmRpcUrl(hubChainId, providers);
//   // if (evmPrivateKeys === undefined || evmPrivateKeys.length < 1) {
//   //   throw Error("Evm private key not defined");
//   // }

//   console.log("Evm rpc: ", evmRpc);
//   const providerEvm = new ethers.providers.JsonRpcProvider(evmRpc);
//   const evmPrivateKey = evmPrivateKeys[0] as string;

//   return new ethers.Wallet(evmPrivateKey, providerEvm);
// }