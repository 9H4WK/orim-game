'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet, useConnection, useAnchorWallet } from '@solana/wallet-adapter-react';
import { usePlayerStore } from '@/lib/store/playerStore';
import { getShopItems, ShopItem, RARITY_COLORS, ItemCategory } from '@/lib/shop/items';
import { OrimBlockchainService } from '@/lib/blockchain/program-service';
import styles from './shop.module.css';

const CATEGORIES: { id: ItemCategory | 'all'; label: string; emoji: string }[] = [
  { id: 'all',       label: 'ALL',        emoji: '🛒' },
  { id: 'hat',       label: 'Hats',       emoji: '🧢' },
  { id: 'shirt',     label: 'Shirts',     emoji: '👕' },
  { id: 'pants',     label: 'Pants',      emoji: '👖' },
  { id: 'shoes',     label: 'Shoes',      emoji: '👟' },
  { id: 'accessory', label: 'Accessory',  emoji: '💍' },
];

import PixelIcon from '@/components/ui/PixelIcon';
import HeroChibi from '@/components/character/HeroChibi';

export default function ShopPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { connected } = useWallet();
  const { coins, ownedItems, equippedItems, addItem, equipItem, spendCoins } = usePlayerStore();
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeCategory, setActiveCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [buySuccess, setBuySuccess] = useState(false);
  const [buyError, setBuyError] = useState('');

  const allItems = getShopItems();
  const filtered = activeCategory === 'all'
    ? allItems
    : allItems.filter(i => i.category === activeCategory);

  const handleBuy = async (item: ShopItem) => {
    if (!connected || !wallet) {
      setBuyError('🪪 CONNECT WALLET FIRST');
      return;
    }

    setIsProcessing(true);
    setBuyError('');

    try {
      if (item.currency === 'COINS') {
        const ok = spendCoins(item.price as number);
        if (!ok) {
          setBuyError('💰 NOT ENOUGH COINS!');
          setIsProcessing(false);
          return;
        }
      } else {
        // ACTUAL ON-CHAIN TRANSACTION
        const service = new OrimBlockchainService(connection, wallet);
        
        if (item.currency === 'SOL') {
          await service.purchaseWithSol(Number(item.price) * 1e9, item.id);
        } else if (item.currency === 'USDC') {
          await service.purchaseWithUsdc(Number(item.price), item.id, wallet, connection);
        } else {
          throw new Error('UNSUPPORTED CURRENCY');
        }
      }

      addItem(item.id);
      setBuySuccess(true);
      setTimeout(() => {
        setBuySuccess(false);
        setSelectedItem(null);
      }, 2000);
    } catch (err: any) {
      console.error('Purchase Failed:', err);
      setBuyError(`❌ FAILED: ${err.message || 'TRANSACTION REJECTED'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEquip = (item: ShopItem) => {
    const currentlyEquipped = equippedItems[item.category];
    if (currentlyEquipped === item.id) {
      equipItem(item.category, null);
    } else {
      equipItem(item.category, item.id);
    }
  };

  return (
    <div className={`${styles.page} scanlines`}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push('/stages')}>
          ◀ BACK
        </button>
        <h1 className={styles.title}>🛒 TREASURE SHOP</h1>
        <div className={styles.headerStats}>
          <div className={styles.heroSummary}>
            <HeroChibi size={60} animate={true} />
            <div className={styles.heroLabel}>ADVENTURER</div>
          </div>
          <div className={styles.coins}>
            <span className={styles.coinIcon}>🪙</span>
            <span className={styles.coinValue}>{mounted ? coins : 0}</span>
          </div>
        </div>
      </header>

      {/* ── Category tabs ── */}
      <div className={styles.tabs}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            id={`tab-${cat.id}`}
            className={`${styles.tab} ${activeCategory === cat.id ? styles.tabActive : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span>{cat.emoji}</span>
            <span className={styles.tabLabel}>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* ── Items grid ── */}
      <div className={styles.grid}>
        {mounted && filtered.map(item => {
          const owned   = ownedItems.includes(item.id);
          const equipped = equippedItems[item.category] === item.id;
          const rarityColor = RARITY_COLORS[item.rarity];

          return (
            <div
              key={item.id}
              id={`item-${item.id}`}
              className={`${styles.itemCard} ${equipped ? styles.itemEquipped : ''}`}
              style={{ borderColor: equipped ? '#fbbf24' : undefined }}
              onClick={() => setSelectedItem(item)}
            >
              <div className={styles.rarityBar} style={{ background: rarityColor }} />
              <div className={styles.itemEmoji}>
                {item.pixelMatrix ? (
                  <PixelIcon matrix={item.pixelMatrix} size={48} glow={item.rarity === 'legendary'} />
                ) : (
                  <span>{item.emoji}</span>
                )}
              </div>
              <p className={styles.itemName}>{item.name}</p>
              <p className={styles.itemRarity} style={{ color: rarityColor }}>
                {item.rarity.toUpperCase()}
              </p>
              <div className={styles.itemPrice}>
                {item.currency === 'COINS' ? (
                  <span className={styles.priceCoins}>🪙 {item.price}</span>
                ) : (
                  <span className={styles.priceCrypto}>◎ {item.price} {item.currency}</span>
                )}
              </div>
              <div className={styles.statusArea}>
                {owned && (
                  <div
                    className={`${styles.ownedBadge} ${equipped ? styles.equippedBadge : ''}`}
                    onClick={e => { e.stopPropagation(); handleEquip(item); }}
                  >
                    {equipped ? 'EQUIPPED' : 'EQUIP'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Item detail modal ── */}
      {selectedItem && (
        <div className={styles.modal} onClick={() => setSelectedItem(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalVisuals}>
              <div className={styles.modalEmoji}>
                {selectedItem.pixelMatrix ? (
                  <PixelIcon matrix={selectedItem.pixelMatrix} size={64} glow={selectedItem.rarity === 'legendary'} />
                ) : (
                  <span>{selectedItem.emoji}</span>
                )}
              </div>
              <div className={styles.modalFittingRoom}>
                <HeroChibi 
                  size={100} 
                  animate={true} 
                  overrideHat={selectedItem.category === 'hat' ? selectedItem.id : undefined}
                  overrideShirt={selectedItem.category === 'shirt' ? selectedItem.id : undefined}
                  overridePants={selectedItem.category === 'pants' ? selectedItem.id : undefined}
                  overrideShoes={selectedItem.category === 'shoes' ? selectedItem.id : undefined}
                  overrideAccessory={selectedItem.category === 'accessory' ? selectedItem.id : undefined}
                />
                <div className={styles.fittingLabel}>TRYING ON... {selectedItem.category.toUpperCase()}</div>
              </div>
            </div>
            <h2 className={styles.modalName}>{selectedItem.name}</h2>
            <p className={styles.modalRarity} style={{ color: RARITY_COLORS[selectedItem.rarity] }}>
              {selectedItem.rarity.toUpperCase()}
            </p>
            <p className={styles.modalDesc}>{selectedItem.description}</p>
            <div className={styles.modalPrice}>
              {selectedItem.currency === 'COINS'
                ? `🪙 ${selectedItem.price} COINS`
                : `◎ ${selectedItem.price} ${selectedItem.currency}`}
            </div>

            {buyError && <p className={styles.errorMsg}>{buyError}</p>}
            {buySuccess && <p className={styles.successMsg}>✅ PURCHASE COMPLETE!</p>}

            {ownedItems.includes(selectedItem.id) ? (
              <button
                id={`equip-btn-${selectedItem.id}`}
                className="btn btn-primary"
                onClick={() => { handleEquip(selectedItem); setSelectedItem(null); }}
              >
                {equippedItems[selectedItem.category] === selectedItem.id ? 'UNEQUIP' : 'EQUIP ITEM'}
              </button>
            ) : (
              <button
                id={`buy-btn-${selectedItem.id}`}
                className="btn btn-gold"
                onClick={() => handleBuy(selectedItem)}
              >
                BUY ITEM
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedItem(null)}>
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
