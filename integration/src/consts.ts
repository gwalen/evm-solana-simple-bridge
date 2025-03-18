import { PublicKey } from "@solana/web3.js";
import * as dotenv from 'dotenv';

dotenv.config();

// export const WSOL_DECIMALS = BigInt(10 ** 9);
// export const WETH_DECIMALS = BigInt(10 ** 18);
// export const GWEI_DECIMALS = 10 ** 9;

export const SOLANA_DEFAULT_COMMITMENT_LEVEL = "confirmed";

export const RELAYER_EVM_PK = process.env.RELAYER_EVM_PK!;

// export const RELAYER_VAULT = new PublicKey(process.env.SOLANA_RELAYER_VAULT!);
// export const RELAYER_REWARD_ACCOUNT = new PublicKey(process.env.SOLANA_RELAYER_REWARD!);

// export const USDC_ARBITRUM = {
//   mainnet: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
//   // sepolia address
//   testnet: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
// }

// export const USDC_SOLANA = {
//   mainnet: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
//   devnet: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
// }