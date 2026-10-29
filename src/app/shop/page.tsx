'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/lib/store/playerStore';
import { SHOP_ITEMS, getShopItems, getItemById, ShopItem, ItemCategory } from '@/lib/shop/items';
import PixelIcon from '@/components/ui/PixelIcon';
import KnightSprite from '@/components/character/KnightSprite';
import { HEROES, HERO_IDS } from '@/lib/maze/knight';
import type { CSSProperties } from 'react';
import WorldShell from '@/components/ui/WorldShell';
import { play } from '@/lib/sfx';
import styles from './shop.module.css';

type Filter = ItemCategory | 'all' | 'owned';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'owned',     label: 'Owned' },
  { id: 'hat',       label: 'Hats' },
  { id: 'shirt',     label: 'Armour' },
  { id: 'pants',     label: 'Greaves' },
  { id: 'shoes',     label: 'Boots' },
  { id: 'accessory', label: 'Extras' },
];

const SLOTS: { id: ItemCategory; label: string }[] = [
  { id: 'hat', label: 'Head' },
  { id: 'shirt', label: 'Armour' },
  { id: 'pants', label: 'Legs' },
  { id: 'shoes', label: 'Feet' },
  { id: 'accessory', label: 'Extra' },
];

const CAPES = new Set(['egg_rainbow', 'egg_dark_cape']);
const FACE = new Set(['egg_ghost', 'hat_cyber', 'acc_shades']);
const FLOATING = new Set(['acc_wand', 'acc_compass', 'egg_pixel_pet']);

/** Card previews: the hero wearing the item, framed on the part it changes */
function thumbFacing(item: ShopItem) {
  return CAPES.has(item.id) || item.id === 'acc_wings' || item.id === 'acc_sword' ? 'up' as const : 'down' as const;
}

function thumbFrame(item: ShopItem): CSSProperties {
  // Zoom k around the point that puts canvas height c (0–1) at the centre of the card
  const at = (k: number, c: number) => {
    const origin = (c - 0.5 / k) / (1 - 1 / k);
    return { transform: `scale(${k})`, transformOrigin: `50% ${(origin * 100).toFixed(1)}%` };
  };
  if (FACE.has(item.id)) return at(2.3, 0.55);
  if (item.category === 'hat') return at(1.9, 0.33);
  if (CAPES.has(item.id)) return at(1.4, 0.68);
  if (item.category === 'shirt') return at(2.2, 0.735);
  if (item.category === 'pants') return at(3.2, 0.885);
  if (item.category === 'shoes') return at(4, 0.95);
  if (FLOATING.has(item.id)) return at(1.35, 0.6);
  return at(1.15, 0.62);
}

const SLOT_NAMES: Record<ItemCategory, string> = {
  hat: 'headgear',
  shirt: 'armour',
  pants: 'greaves',
  shoes: 'boots',
  accessory: 'relic',
};

function priceLabel(item: ShopItem) {
  if (item.isEasterEgg) return 'Found in a maze';
  return `${item.price} coins`;
}

export default function ShopPage() {
  const { coins, ownedItems, equippedItems, addItem, equipItem, spendCoins, hero, setHero } = usePlayerStore();
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const owned = (id: string) => mounted && ownedItems.includes(id);
  const isEquipped = (item: ShopItem) => mounted && equippedItems[item.category] === item.id;

  // Loot found in mazes appears once it is yours
  const catalogue = [...getShopItems(), ...SHOP_ITEMS.filter(i => i.isEasterEgg && owned(i.id))];
  const hidden = SHOP_ITEMS.filter(i => i.isEasterEgg && !owned(i.id));
  const hiddenCount = hidden.length;
  const filtered = catalogue.filter(i =>
    filter === 'all' ? true : filter === 'owned' ? owned(i.id) : i.category === filter,
  );

  const select = (item: ShopItem) => {
    setMessage(null);
    play('choose');
    setSelectedItem(prev => (prev?.id === item.id ? null : item));
  };

  const tryOn = {
    ...(mounted ? equippedItems : {}),
    ...(selectedItem ? { [selectedItem.category]: selectedItem.id } : {}),
  };

  // Items are unlocked with coins earned in play; nothing here costs real money
  const handleBuy = (item: ShopItem) => {
    setIsProcessing(true);
    setMessage(null);
    try {
      if (!spendCoins(item.price)) {
        setMessage({ ok: false, text: `You need ${item.price - coins} more coins. Clear stages to earn them.` });
        return;
      }
      addItem(item.id);
      equipItem(item.category, item.id);
      play('loot');
      setMessage({ ok: true, text: 'Unlocked and equipped.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleEquip = (item: ShopItem) => {
    play('choose');
    equipItem(item.category, isEquipped(item) ? null : item.id);
  };

  return (
    <WorldShell active="items">
      <div className={`${styles.page} ${selectedItem ? styles.pageSheet : ''}`}>
        <header className={styles.head}>
          <h1 className={styles.title}>Items</h1>
          <span className={styles.coins}><i aria-hidden="true" />{mounted ? coins : 0} coins</span>
        </header>

        {/* ── Hero ─────────────────────────────── */}
        <aside className={styles.hero}>
          <div className={styles.heroPick} role="radiogroup" aria-label="Choose your hero">
            {HERO_IDS.map(id => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={mounted && hero === id}
                className={`${styles.heroOpt} ${mounted && hero === id ? styles.heroOn : ''}`}
                onClick={() => { play('choose'); setHero(id); }}
              >
                <span className={styles.heroFace}>{mounted && <KnightSprite hero={id} still />}</span>
                <span>{HEROES[id].name}</span>
              </button>
            ))}
          </div>
          <div className={styles.stage}>
            <div className={styles.chibi}>
              {mounted && (
                <KnightSprite hero={hero} gear={tryOn} />
              )}
            </div>
            <div className={styles.glow} />
            <div className={styles.rock} />
          </div>

          {selectedItem ? (
            <div className={styles.detail} role="region" aria-label={`${selectedItem.name}, trying on`}>
              <button type="button" className={styles.detailClose} onClick={() => setSelectedItem(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              </button>
              <div className={styles.detailTop}>
                <span className={styles.detailHero}>{mounted && <KnightSprite hero={hero} gear={tryOn} />}</span>
                <div className={styles.detailText}>
                  <span className={`${styles.rarity} ${styles[selectedItem.rarity]}`}>{selectedItem.rarity[0].toUpperCase() + selectedItem.rarity.slice(1)} · trying on</span>
                  <h2>{selectedItem.name}</h2>
                  <p>{selectedItem.description}</p>
                </div>
              </div>
              {owned(selectedItem.id) ? (
                <button type="button" id={`equip-btn-${selectedItem.id}`} className={styles.action} onClick={() => toggleEquip(selectedItem)}>
                  {isEquipped(selectedItem) ? 'Take it off' : 'Equip'}
                </button>
              ) : (
                <button
                  type="button"
                  id={`buy-btn-${selectedItem.id}`}
                  className={styles.action}
                  onClick={() => handleBuy(selectedItem)}
                  disabled={isProcessing}
                >
                  {`Unlock · ${selectedItem.price} coins`}
                </button>
              )}
              {message && <p className={message.ok ? styles.ok : styles.error} role="status">{message.text}</p>}
            </div>
          ) : (
            <div className={styles.slots}>
              {SLOTS.map(slot => {
                const id = mounted ? equippedItems[slot.id] : null;
                const item = id ? getItemById(id) : undefined;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={styles.slot}
                    onClick={() => (item ? select(item) : setFilter(slot.id))}
                  >
                    <span className={styles.slotIcon}>
                      {item?.pixelMatrix ? <PixelIcon matrix={item.pixelMatrix} size={28} /> : <i />}
                    </span>
                    <span className={styles.slotLabel}>{slot.label}</span>
                    <strong>{item?.name ?? 'Empty'}</strong>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        {/* ── Collection ───────────────────────── */}
        <section className={styles.collection} aria-label="All items">
          <div className={styles.filters} role="tablist" aria-label="Filter items">
            {FILTERS.map(f => (
              <button
                key={f.id}
                id={`tab-${f.id}`}
                type="button"
                role="tab"
                aria-selected={filter === f.id}
                className={filter === f.id ? styles.filterOn : ''}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {mounted && filter === 'all' && hiddenCount > 0 && (
            <p className={styles.lootNote}>
              <span className={styles.lootGem} aria-hidden="true" />
              {hiddenCount} legendary {hiddenCount === 1 ? 'item is' : 'items are'} hidden in the mazes
            </p>
          )}

          {mounted && filtered.length === 0 ? (
            <p className={styles.empty}>Nothing here yet. Clear stages to earn coins, then unlock your first item.</p>
          ) : (
            <div className={styles.grid}>
              {mounted && filtered.map(item => {
                const isOwned = owned(item.id);
                const on = isEquipped(item);
                return (
                  <button
                    key={item.id}
                    id={`item-${item.id}`}
                    type="button"
                    className={`${styles.card} ${on ? styles.cardOn : ''} ${selectedItem?.id === item.id ? styles.cardSelected : ''}`}
                    onClick={() => select(item)}
                    aria-pressed={selectedItem?.id === item.id}
                  >
                    <span className={`${styles.rarityBar} ${styles[item.rarity]}`} />
                    <span className={styles.art}>
                      <span className={styles.thumb} style={thumbFrame(item)}>
                        <KnightSprite hero={hero} still facing={thumbFacing(item)} gear={{ [item.category]: item.id }} />
                      </span>
                    </span>
                    <span className={styles.name}>{item.name}</span>
                    <span className={`${styles.price} ${on ? styles.priceOn : isOwned ? styles.priceOwned : ''}`}>
                      {on ? 'Equipped' : isOwned ? 'Owned' : priceLabel(item)}
                    </span>
                  </button>
                );
              })}
              {mounted && filter === 'all' && hidden.map(item => (
                <div key={item.id} className={`${styles.card} ${styles.mystery}`} aria-label="Hidden item, found inside the mazes">
                  <span className={`${styles.rarityBar} ${styles.legendary}`} />
                  <span className={styles.art}>
                    <span className={styles.mysteryMark} aria-hidden="true">?</span>
                  </span>
                  <span className={styles.name}>Hidden {SLOT_NAMES[item.category]}</span>
                  <span className={styles.price}>In the mazes</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorldShell>
  );
}
