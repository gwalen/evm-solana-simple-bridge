import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaBridge } from "../target/types/solana_bridge";
import * as solanaBridgeIdl from "../target/idl/solana_bridge.json";
import { SOLANA_RPC_URL } from "../tests/consts";
import { PublicKey } from "@solana/web3.js";
import { createAnchorProvider, evmAddressTo32Bytes } from "../tests/utils";


export async function registerEvmTokenOnSolana(
  evmTokenAddress: string, 
  solanaTokenAddress: string
) {
  /**
   * NOTE: this script will be run from integration tests and not in solana-bridge context
   *       therefore we must start it with SolanaBridge not related to local workspace.
   *       We can not use: const program = anchor.workspace.SolanaBridge as Program<SolanaBridge>;
   *       as it refers to anchor workspace.
   */
  const provider = createAnchorProvider(SOLANA_RPC_URL);
  const program = new Program(solanaBridgeIdl as SolanaBridge, provider);
  const providerWallet = provider.wallet as anchor.Wallet;

  const evmAddressAs32Bytes = evmAddressTo32Bytes(evmTokenAddress);

  const tx = await program.methods
    .registerForeignToken(evmAddressAs32Bytes)
    .accounts({
      owner: providerWallet.publicKey,
      localMint: new PublicKey(solanaTokenAddress)
    })
    .signers([providerWallet.payer])
    .rpc() 
    .catch(e => console.error(e));

  console.log("Register Evm token on Solana tx: ", tx);  
}