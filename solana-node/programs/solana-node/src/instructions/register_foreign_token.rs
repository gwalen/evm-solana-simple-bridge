use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

use crate::state::config::Config;
use crate::state::foreign_token::ForeignToken;
use crate::utils::errors::BridgeError;


#[derive(Accounts)]
#[instruction(foreign_address: [u8; 32])]
pub struct RegisterForeignToken<'info> {

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [ Config::SEED_PREFIX ],
        bump,
        constraint = owner.key() == config.owner @ BridgeError::InvalidOwner
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = owner,
        space = ForeignToken::LEN,
        seeds = [
            ForeignToken::SEED_PREFIX,
            &foreign_address
        ],
        bump
    )]
    pub foreign_token: Account<'info, ForeignToken>,

    // pass it in accounts to make sure this accounts deserializes to Mint
    pub local_mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>
}