import { Connection, LAMPORTS_PER_SOL, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";
import path from "path";

export const AIRDROP_SOL_AMOUNT = 100 * LAMPORTS_PER_SOL;

export interface SolanaDeployments {
  solanaBridge: string,
  solanaTokenAddress: string
}

export async function airdrop(connection: Connection, userPubkey: PublicKey) {
  const signature = await connection.requestAirdrop(userPubkey, AIRDROP_SOL_AMOUNT)
  const latestBlockHash = await connection.getLatestBlockhash();

  await connection.confirmTransaction({
    blockhash: latestBlockHash.blockhash,
    lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    signature: signature,
  });
}

export function deriveConfigPda(programId: PublicKey): PublicKey {
  const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  return pda;
}

export function evmAddressTo32Bytes(hexString: string): number[] {
  // Remove the '0x' prefix from the input string if it's present
  const cleanedHexString = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

  const buffer = Buffer.alloc(32);
  buffer.write(cleanedHexString, 32 - cleanedHexString.length / 2, "hex"); // each hex char is 2 bytes

  return Array.from(buffer);
}

export function deriveForeignTokenPda(programId: PublicKey, foreignAddress: number[]): PublicKey {
  const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("foreign_token"), Buffer.from(foreignAddress)],
    programId
  );
  return pda;
}

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createAnchorProvider(rpcUrl: string) {
  const testKeyPath = path.join(__dirname, "./keys/pFCBP4bhqdSsrWUVTgqhPsLrfEdChBK17vgFM7TxjxQ.json"); // use script dir as base dir
  const privateKeySolanaStr = fs.readFileSync(testKeyPath, "utf-8");
  const privateKeySolanaParsed = JSON.parse(privateKeySolanaStr) as number[];
  const solanaPrivateKey = new Uint8Array(privateKeySolanaParsed);
  let solanaConnection = new anchor.web3.Connection(rpcUrl, "confirmed");

  const solanaKeypair = Keypair.fromSecretKey(solanaPrivateKey);
  const solanaAnchorWallet = new anchor.Wallet(solanaKeypair);

  const provider = new anchor.AnchorProvider(
    solanaConnection,
    solanaAnchorWallet,
    {
      commitment: "confirmed"
    }
  );
  return provider;
}