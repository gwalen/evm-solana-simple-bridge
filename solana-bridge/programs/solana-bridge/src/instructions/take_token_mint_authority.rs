use anchor_lang::prelude::*;

use anchor_spl::token::{Mint, Token};

use crate::{state::config::Config, utils::errors::BridgeError};

#[derive(Accounts)]
pub struct TakeTokenMintAuthority<'info> {

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub mint_owner: Signer<'info>,

    #[account(
        seeds = [ Config::SEED_PREFIX ],
        bump,
        constraint = owner.key() == config.owner @ BridgeError::InvalidOwner
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        mint::authority = mint_owner,
        mint::freeze_authority = mint_owner
    )]
    pub token_mint: Account<'info, Mint>,

    // #[account(
    //     init,
    //     payer = owner,
    //     mint::decimals = 6,
    //     mint::authority = owner, // or owner.key() // TODO: CHECK
    //     mint::freeze_authority = owner
    // )]
    // pub token_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>

}
