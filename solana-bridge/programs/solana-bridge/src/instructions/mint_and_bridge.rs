use anchor_lang::prelude::*;
use anchor_spl::{token::{Mint, Token, TokenAccount}, associated_token::AssociatedToken};

use crate::{state::{config::Config, foreign_token::ForeignToken}, utils::errors::BridgeError};

#[derive(Accounts)]
#[instruction(_foreign_address: [u8; 32])]
pub struct MintAndBridge<'info> {

    #[account(mut)]
    pub relayer: Signer<'info>,

    // #[account(mut)]
    /// CHECK: wallet that is the receiver
    pub token_receiver: UncheckedAccount<'info>,

    #[account(
        seeds = [ Config::SEED_PREFIX ],
        bump,
        constraint = relayer.key() == config.relayer @ BridgeError::InvalidRelayer
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut, // must be mut we will change supply amount
        mint::authority = config
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = relayer,
        associated_token::mint = token_mint,
        associated_token::authority = token_receiver
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            ForeignToken::SEED_PREFIX,
            &_foreign_address
        ],
        bump,
        constraint = foreign_token.local_address == token_mint.key() @ BridgeError::WrongMintForForeignToken  
    )]
    pub foreign_token: Account<'info, ForeignToken>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
}