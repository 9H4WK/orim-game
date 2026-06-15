'use client';

import React, { useState } from 'react';
import styles from './TraderTerminal.module.css';

interface TraderTerminalProps {
  livePrice: number;
  onTrade: (type: 'LONG' | 'SHORT', margin: number, leverage: number) => void;
  isLoading: boolean;
}

export default function TraderTerminal({ livePrice, onTrade, isLoading }: TraderTerminalProps) {
  const [tab, setTab] = useState<'LONG' | 'SHORT'>('LONG');
  const [payAmount, setPayAmount] = useState<string>('100');
  const [leverage, setLeverage] = useState<number>(10);
  
  const handlePayChange = (e: React.ChangeEvent<HTMLInputElement>) => setPayAmount(e.target.value);
  const handleLeverageChange = (e: React.ChangeEvent<HTMLInputElement>) => setLeverage(Number(e.target.value));

  const numPay = parseFloat(payAmount) || 0;
  const sizeSol = livePrice > 0 ? (numPay * leverage) / livePrice : 0;
  
  const liqPriceLong = livePrice > 0 ? livePrice - (livePrice / leverage) : 0;
  const liqPriceShort = livePrice > 0 ? livePrice + (livePrice / leverage) : 0;
  const currentLiqPrice = tab === 'LONG' ? liqPriceLong : liqPriceShort;

  return (
    <div className={styles.terminalContainer}>
      {/* Tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${styles.tabBtnLong} ${tab === 'LONG' ? styles.active : ''}`}
          onClick={() => setTab('LONG')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18" /><path d="M17 6h6v6" /></svg>
          Long
        </button>
        <button 
          className={`${styles.tabBtn} ${styles.tabBtnShort} ${tab === 'SHORT' ? styles.active : ''}`}
          onClick={() => setTab('SHORT')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 18l-9.5-9.5-5 5L1 6" /><path d="M17 18h6v-6" /></svg>
          Short
        </button>
        <button className={`${styles.tabBtn} ${styles.tabBtnChat}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          Chat
        </button>
      </div>

      <div className={styles.content}>
        {/* Price & Order Type */}
        <div className={styles.priceHeader}>
          <div className={styles.priceBox}>
            <span className={styles.priceVal}>{livePrice > 0 ? livePrice.toFixed(2) : '--.--'}</span>
            <span className={styles.priceCurrency}>USD</span>
          </div>
          <div className={styles.orderTypeToggle}>
            <button className={`${styles.orderTypeBtn} ${styles.active}`}>Market</button>
            <button className={styles.orderTypeBtn}>Limit</button>
          </div>
        </div>

        {/* Pay Input */}
        <div className={styles.inputGroup}>
          <div className={styles.inputRow}>
            <input 
              type="number" 
              value={payAmount}
              onChange={handlePayChange}
              className={styles.textInput}
              placeholder="0.00"
            />
            <div className={styles.assetBadge}>
              <div className={`${styles.assetIcon} ${styles.iconUsdc}`}>S</div>
              USDC <span style={{fontSize: '10px'}}>▼</span>
            </div>
          </div>
        </div>

        {/* Size Input */}
        <div className={styles.inputGroup} style={{ opacity: 0.8 }}>
          <div className={styles.inputRow}>
            <input 
              type="text" 
              value={sizeSol > 0 ? sizeSol.toFixed(4) : '0.00'}
              readOnly
              className={styles.textInput}
            />
            <div className={styles.assetBadge}>
              <div className={`${styles.assetIcon} ${styles.iconSol}`}>S</div>
              SOL
            </div>
          </div>
        </div>

        {/* Leverage */}
        <div>
          <div className={styles.sectionTitle}>Leverage</div>
          <div className={styles.sliderLabels}>
            <span>1x</span>
            <span>100x</span>
          </div>
          
          <div className={styles.sliderWrap}>
            <div className={styles.sliderTrack} style={{ width: `${leverage}%` }}></div>
            <input 
              type="range" 
              min="1" max="100" step="1" 
              value={leverage} 
              onChange={handleLeverageChange}
              className={styles.sliderInput} 
            />
            <div className={styles.sliderThumb} style={{ left: `calc(${leverage}% - 16px)` }}>
              <span className={styles.thumbArrow}>◀</span>
              <span className={styles.thumbArrow}>▶</span>
            </div>
          </div>

          <div className={styles.leverageControls}>
            <div className={styles.levInputBox}>
              <input type="number" value={leverage} onChange={handleLeverageChange} className={styles.levInput} />
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1f2d33', paddingLeft: '4px' }}>
                 <button onClick={() => setLeverage(v => Math.min(100, v+1))} style={{ background:'transparent', border:'none', color:'#8b9fac', fontSize:'10px', cursor:'pointer' }}>▲</button>
                 <button onClick={() => setLeverage(v => Math.max(1, v-1))} style={{ background:'transparent', border:'none', color:'#8b9fac', fontSize:'10px', cursor:'pointer' }}>▼</button>
              </div>
            </div>
            <div className={styles.levPresets}>
              {[25, 50, 75, 100].map(val => (
                <button 
                  key={val} 
                  onClick={() => setLeverage(val)} 
                  className={`${styles.presetBtn} ${leverage === val ? styles.active : ''}`}
                >
                  {val}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TP / SL Mock */}
        <div>
          <div className={styles.sectionTitle}>
            <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
              Take Profit / Stop Loss
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <span>^</span>
          </div>
          <div className={styles.tpslRow}>
            <div className={styles.tpslInput}>
              <span className={styles.tpslLabel} style={{color:'#8b9fac'}}>TP:</span>
              <input type="text" placeholder="0.00" className={styles.textInput} style={{fontSize:'14px', width:'100%'}} />
            </div>
            <div className={styles.tpslInput}>
              <span className={styles.tpslLabel} style={{color:'#8b9fac'}}>SL:</span>
              <input type="text" placeholder="0.00" className={styles.textInput} style={{fontSize:'14px', width:'100%'}} />
            </div>
          </div>
        </div>

        <p className={styles.warningText}>
          If the order is executed, you may receive the settled amount in USDC or JitoSOL.
        </p>

        {/* Slippage Mock */}
        <div>
          <div className={styles.sectionTitle}>
            Slippage Tolerance (0.8%)
            <span>^</span>
          </div>
          <div className={styles.slippageRow}>
            <div className={styles.slipInput}>
              <input type="text" defaultValue="0.8" />
            </div>
            <div className={styles.slipPresets}>
              {['0.1%', '0.5%', '1.0%'].map(val => (
                <button key={val} className={styles.slipBtn}>{val}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button 
          onClick={() => onTrade(tab, numPay, leverage)}
          disabled={isLoading || numPay <= 0 || livePrice === 0}
          className={`${styles.submitBtn} ${tab === 'LONG' ? styles.btnLong : styles.btnShort}`}
        >
          {isLoading ? 'Processing...' : 'Connect Wallet'}
        </button>

        {/* Footer Summary */}
        <div className={styles.summary}>
          <div className={styles.sumRow}>
            <span>Collateral In</span>
            <span className={styles.sumVal}>USDC</span>
          </div>
          <div className={styles.sumRow}>
            <span>Leverage</span>
            <span className={styles.sumVal}>{leverage}x</span>
          </div>
          <div className={styles.sumRow}>
            <span>Entry Price</span>
            <span className={styles.sumVal}>{livePrice > 0 ? `$${livePrice.toFixed(2)}` : '-'}</span>
          </div>
          <div className={styles.sumRow}>
            <span>Liq. Price</span>
            <span className={styles.sumValRed}>{currentLiqPrice > 0 ? `$${currentLiqPrice.toFixed(2)}` : '-'}</span>
          </div>
          <div className={styles.sumLastRow}>
            <span>Fees</span>
            <span className={styles.sumVal}>-$0.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
