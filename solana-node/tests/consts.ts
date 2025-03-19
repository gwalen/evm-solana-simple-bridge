import { Keypair } from "@solana/web3.js";

export const OWNER = Keypair.generate();
export const RELAYER = Keypair.generate();
export const MINT_DECIMALS = 6;