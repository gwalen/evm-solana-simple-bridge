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

// TODO: 3. Add mint instruction with events
// TODO: 4. Rename project to solana-bridge

#[program]
pub mod solana_node {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        initialize::handle(ctx)
    }

    pub fn take_token_mint_authority(ctx: Context<TakeTokenMintAuthority>) -> Result<()> {
        take_token_mint_authority::handle(ctx)
    }

    pub fn burn_and_bridge(ctx: Context<BurnAndBridge>, amount: u64) -> Result<()> {
        burn_and_bridge::handle(ctx, amount)
    }

    pub fn register_foreign_token(ctx: Context<RegisterForeignToken>, foreign_address: [u8; 32]) -> Result<()> {
        register_foreign_token::handle(ctx, foreign_address)
    }

    pub fn mint_and_bridge(ctx: Context<MintAndBridge>, _foreign_address: [u8; 32], amount: u64,) -> Result<()> {
        mint_and_bridge::handle(ctx, _foreign_address, amount)
    }
}