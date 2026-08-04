import React from 'react';
import {
  AbsoluteFill,
  IFrame,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

export const PromoVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Scene timings
  const introEnd = 150; // 5s
  const webEnd = 450; // 15s
  const gameEnd = 900; // 30s
  const outroEnd = 1050; // 35s

  return (
    <AbsoluteFill style={{ backgroundColor: '#07040e', color: 'white', fontFamily: 'monospace' }}>
      
      {/* SCENE 1: Intro (0 - 10s) */}
      <Sequence from={0} durationInFrames={introEnd}>
        <IntroScene frame={frame} fps={fps} />
      </Sequence>

      {/* SCENE 2: Website UI (10s - 25s) */}
      <Sequence from={introEnd} durationInFrames={webEnd - introEnd}>
        <WebScene frame={frame - introEnd} fps={fps} />
      </Sequence>

      {/* SCENE 3: Gameplay (25s - 50s) */}
      <Sequence from={webEnd} durationInFrames={gameEnd - webEnd}>
        <GameScene frame={frame - webEnd} fps={fps} />
      </Sequence>

      {/* SCENE 4: Outro (50s - 60s) */}
      <Sequence from={gameEnd} durationInFrames={outroEnd - gameEnd}>
        <OutroScene frame={frame - gameEnd} fps={fps} />
      </Sequence>
      
    </AbsoluteFill>
  );
};

const IntroScene: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const opacity = interpolate(frame, [0, 30, 120, 150], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const scale = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
      <h1 style={{ fontSize: 80, fontWeight: 'bold', transform: `scale(${scale})`, textShadow: '0 0 20px rgba(139, 92, 246, 0.8)' }}>
        The Labyrinth is ALIVE
      </h1>
      <p style={{ fontSize: 40, marginTop: 40, color: '#fbbf24' }}>
        Sovereign Autonomous Worlds
      </p>
    </AbsoluteFill>
  );
};

const WebScene: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const opacity = interpolate(frame, [0, 20, 280, 300], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const zoom = interpolate(frame, [0, 300], [1.1, 1.0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: '#07040e' }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: 'center top' }}>
        <IFrame src="http://localhost:3000" style={{ width: '100%', height: '100%', border: 'none' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 100 }}>
        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '20px 40px', borderRadius: 20, border: '2px solid #8b5cf6' }}>
          <h2 style={{ fontSize: 50, margin: 0 }}>Clean & Intuitive Dashboard</h2>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const GameScene: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const opacity = interpolate(frame, [0, 20, 430, 450], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const textOpacity1 = interpolate(frame, [30, 60, 200, 230], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const textOpacity2 = interpolate(frame, [250, 280, 410, 440], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: '#000' }}>
      <IFrame src="http://localhost:3000/game/infinite?autoplay=true" style={{ width: '100%', height: '100%', border: 'none' }} />
      
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ opacity: textOpacity1, background: 'rgba(0,0,0,0.8)', padding: 40, border: '3px solid #fbbf24', transform: 'translateY(-200px)' }}>
          <h2 style={{ fontSize: 70, margin: 0, color: '#fbbf24' }}>Impossible Geometry</h2>
        </div>
        
        <div style={{ opacity: textOpacity2, background: 'rgba(0,0,0,0.8)', padding: 40, border: '3px solid #10b981', transform: 'translateY(200px)' }}>
          <h2 style={{ fontSize: 70, margin: 0, color: '#10b981' }}>Zero Latency with MagicBlock</h2>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const OutroScene: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity }}>
      <h1 style={{ fontSize: 100, fontWeight: 'bold', color: 'white', letterSpacing: 10 }}>ORIM</h1>
      <p style={{ fontSize: 40, color: '#8b5cf6', marginTop: 20 }}>Enter the Void.</p>
    </AbsoluteFill>
  );
};
