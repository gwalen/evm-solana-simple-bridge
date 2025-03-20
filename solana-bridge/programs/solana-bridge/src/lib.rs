use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod handlers;
pub mod utils;

use instructions::initialize::*;
use instructions::take_token_mint_authority::*;
use instructions::burn_and_bridge::*;
use instructions::mint_and_bridge::*;
use instructions::register_foreign_token::*;

use handlers::*;

declare_id!("BNnLzXd4awDnxnycVseH2aN2dHV5grBQc6ucJJabtiZt");


#[program]
pub mod solana_bridge {
    use super::*;

    /// Initializes the Solana bridge.
    ///
    /// This function sets up the initial configuration for the bridge, preparing
    /// the program to handle subsequent operations.
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context containing the necessary accounts and state for initialization.
    ///
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handle(ctx)
    }

    /// Takes control of the token mint authority.
    ///
    /// This function transfers the mint authority for a token to the bridge program,
    /// enabling the program to manage minting operations.
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context containing accounts and state required for transferring mint authority.
    ///
    pub fn take_token_mint_authority(ctx: Context<TakeTokenMintAuthority>) -> Result<()> {
        take_token_mint_authority::handle(ctx)
    }

    /// Burns tokens and emit BurnEvent.
    ///
    /// This function burns a specified amount of tokens on Solana and emits a `BurnEvent`,  
    /// which is caught by the off-chain relayer, and based on that, a minting transaction is invoked on the EVM chain.  
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context containing accounts and state for the burn and bridge operation.
    /// * `amount` - The amount of tokens to burn.
    /// 
    pub fn burn_and_bridge(ctx: Context<BurnAndBridge>, amount: u64) -> Result<()> {
        burn_and_bridge::handle(ctx, amount)
    }

    /// Registers a token from a foreign chain.
    ///
    /// This function registers a foreign token by associating it local mint address,
    /// enabling interoperability between chains.
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context containing accounts and state for token registration.
    /// * `foreign_address` - A 32-byte array representing the foreign token's address.
    ///
    pub fn register_foreign_token(ctx: Context<RegisterForeignToken>, foreign_address: [u8; 32]) -> Result<()> {
        register_foreign_token::handle(ctx, foreign_address)
    }

    /// Mints tokens on Solana and emits MintEvent
    ///
    /// This function mints tokens on Solana chain.
    /// It can only be called by the off-chain relayer using its wallet account, which is registered during the `initialize` instruction.  
    ///
    /// # Arguments
    ///
    /// * `ctx` - The context containing the accounts and state for the mint and bridge operation.
    /// * `_foreign_address` - A 32-byte array representing the foreign token's address - it must match one of registered tokens 
    ///                        (using `register_foreign_token` instruction).
    /// * `amount` - The amount of tokens to mint.
    ///
    pub fn mint_and_bridge(ctx: Context<MintAndBridge>, _foreign_address: [u8; 32], amount: u64) -> Result<()> {
        mint_and_bridge::handle(ctx, _foreign_address, amount)
    }
}