use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod orim_maze {
    use super::*;

    /// Initialize a new player profile
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.owner = ctx.accounts.user.key();
        user_profile.level = 1;
        user_profile.total_stars = 0;
        user_profile.xp = 0;
        user_profile.unlocked_items = Vec::new();
        msg!("ORIM: User Profile Initialized for {}", user_profile.owner);
        Ok(())
    }

    /// Record a stage clear and award stars/xp
    pub fn record_clear(ctx: Context<RecordClear>, stage: u32, stars: u8, xp: u64) -> Result<()> {
        let user_profile = &mut ctx.accounts.user_profile;
        
        // Simple security: only the owner can update their profile
        // In a production app, we would add signature verification from an Orim Oracle/Authority
        user_profile.total_stars += stars as u64;
        user_profile.xp += xp;
        if stage as u8 > user_profile.level {
            user_profile.level = stage as u8;
        }

        msg!("ORIM: Stage {} Cleared! Total Stars: {}", stage, user_profile.total_stars);
        Ok(())
    }

    /// Purchase an item using SOL (Treasury Transfer)
    /// Note: SPL (USDC/USDT) transfers are handled via CPI if logic is complex, 
    /// but for ORIM we use simple client-side transfers for stablecoins to reduce gas.
    /// This instruction is for SOL-based direct protocol interactions.
    pub fn purchase_with_sol(ctx: Context<PurchaseWithSol>, amount: u64, item_id: String) -> Result<()> {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.treasury.key(),
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.treasury.to_account_info(),
            ],
        )?;

        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.unlocked_items.push(item_id.clone());
        
        msg!("ORIM: Item {} Purchased for {} lamports", item_id, amount);
        Ok(())
    }

    /// Mint a Dungeon NFT for a custom maze design
    pub fn mint_dungeon(ctx: Context<MintDungeon>, name: String, symbol: String, uri: String) -> Result<()> {
        msg!("ORIM: Minting Dungeon NFT: {} ({})", name, symbol);
        // In a production app, we would use CPI to Metaplex Token Metadata here.
        // For ORIM Devnet, we will mark the dungeon as 'Authorized' in a PDA 
        // which the frontend then uses to mint via the Umi library.
        let dungeon = &mut ctx.accounts.dungeon_record;
        dungeon.creator = ctx.accounts.creator.key();
        dungeon.uri = uri;
        dungeon.name = name;
        Ok(())
    }
}

#[derive(Accounts)]
pub index MintDungeon<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + 32 + 200 + 100, // Header + Creator + URI + Name
        seeds = [b"dungeon", creator.key().as_ref(), name.as_bytes()],
        bump
    )]
    pub dungeon_record: Account<'info, DungeonRecord>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct DungeonRecord {
    pub creator: Pubkey,
    pub name: String,
    pub uri: String,
}

#[derive(Accounts)]
pub index InitializeUser<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 1 + 8 + 8 + 100, // Header + Owner + Level + Stars + XP + ItemVector
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub index RecordClear<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump,
        constraint = user_profile.owner == user.key()
    )]
    pub user_profile: Account<'info, UserProfile>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub index PurchaseWithSol<'info> {
    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump,
        constraint = user_profile.owner == user.key()
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Treasury account to receive SOL
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserProfile {
    pub owner: Pubkey,        // 32
    pub level: u8,           // 1
    pub total_stars: u64;    // 8
    pub xp: u64;              // 8
    pub unlocked_items: Vec<String>, // Variable
}
