import { Keypair } from "@solana/web3.js";
import * as dotenv from 'dotenv';

dotenv.config();

export const MINT_DECIMALS = 6;

export const SOLANA_RPC_URL: string = process.env.SOLANA_RPC_URL!;

export const ALICE = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.ALICE_PRIVATE_KEY_SOLANA!) as number[]));
export const OWNER = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.OWNER_PRIVATE_KEY_SOLANA!) as number[]));
export const RELAYER = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.RELAYER_PRIVATE_KEY_SOLANA!) as number[]));