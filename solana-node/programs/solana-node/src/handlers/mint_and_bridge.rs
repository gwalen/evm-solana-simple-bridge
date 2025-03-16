use anchor_lang::prelude::*;
use crate::{instructions::mint_and_bridge::MintAndBridge, utils::events::MintEvent, state::config::Config};
use anchor_spl::token::{self};

pub fn handle(
    ctx: Context<MintAndBridge>, 
    // used in MintAndBridge constraints check for ForeignToken pda
    _foreign_address: [u8; 32],
    amount: u64
) -> Result<()> {
    let signer_seeds: &[&[&[u8]]] = &[&[Config::SEED_PREFIX, &[ctx.bumps.config]]];

    let mint_token_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::MintTo {
            mint: ctx.accounts.token_mint.to_account_info(),
            to: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        },
        signer_seeds
    );

    emit!(MintEvent {
        token_mint: ctx.accounts.token_mint.key(),
        token_owner: ctx.accounts.token_receiver.key(),
        amount
    });

    token::mint_to(mint_token_ctx, amount)
}