use anchor_lang::prelude::*;
use crate::{instructions::burn_and_bridge::BurnAndBridge, utils::events::BurnEvent};
use anchor_spl::token::{self};

/// For documentation, refer to `lib.rs`.  
pub fn handle(ctx: Context<BurnAndBridge>, amount: u64) -> Result<()> {
    let burn_token_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Burn {
            mint: ctx.accounts.token_mint.to_account_info(),
            from: ctx.accounts.token_account.to_account_info(),
            authority: ctx.accounts.token_sender.to_account_info(),
        }
    );

    emit!(BurnEvent {
        token_mint: ctx.accounts.token_mint.key(),
        token_owner: ctx.accounts.token_sender.key(),
        amount
    });

    token::burn(burn_token_ctx, amount)
}