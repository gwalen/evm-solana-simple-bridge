use anchor_lang::prelude::*;
use anchor_spl::{token::{Mint, Token, TokenAccount}, associated_token::AssociatedToken};

use crate::state::config::Config;

#[derive(Accounts)]
pub struct BurnAndBridge<'info> {

    #[account(mut)]
    pub token_sender: Signer<'info>,

    #[account(
        seeds = [ Config::SEED_PREFIX ],
        bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut, // must be mut we will change supply amount
        mint::authority = config
    )]
    pub token_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = token_sender
    )]
    pub token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>
}