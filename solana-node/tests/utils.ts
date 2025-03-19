import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";

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