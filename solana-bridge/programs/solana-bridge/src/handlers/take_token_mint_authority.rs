use anchor_lang::prelude::*;
use anchor_spl::token::{self, spl_token::instruction::AuthorityType};
use crate::instructions::take_token_mint_authority::TakeTokenMintAuthority;


pub fn handle(ctx: Context<TakeTokenMintAuthority>) -> Result<()> {

    let take_ownership_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::SetAuthority {   
            current_authority: ctx.accounts.mint_owner.to_account_info(),
            account_or_mint: ctx.accounts.token_mint.to_account_info(),
        }
    );

    token::set_authority(
        take_ownership_ctx, 
        AuthorityType::MintTokens, 
        Some(ctx.accounts.config.key())
    )
}