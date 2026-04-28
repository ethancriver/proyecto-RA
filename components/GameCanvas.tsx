import { useEffect, useRef, useState } from 'react';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let phaserGame: any;

    async function init() {
      if (!containerRef.current) return;

      try {
        const Phaser = (await import('phaser')).default;

        class MainScene extends Phaser.Scene {
          player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
          cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
          keys!: Record<string, Phaser.Input.Keyboard.Key>;
          speed = 220;

          preload() {
            const graphics = this.add.graphics();
            graphics.fillStyle(0xffffff, 1);
            graphics.fillRoundedRect(0, 0, 37, 45, 8);
            graphics.generateTexture('player', 37, 45);
            graphics.destroy();
          }

          create() {
            this.cursors = (this.input.keyboard as any).createCursorKeys();
            this.keys = (this.input.keyboard as any).addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>;
            this.player = this.physics.add.image(480, 360, 'player').setScale(1.5).setCollideWorldBounds(true);
          }

          update() {
            const left = (this.keys?.A?.isDown ?? false) || (this.cursors?.left?.isDown ?? false);
            const right = (this.keys?.D?.isDown ?? false) || (this.cursors?.right?.isDown ?? false);
            const up = (this.keys?.W?.isDown ?? false) || (this.cursors?.up?.isDown ?? false);
            const down = (this.keys?.S?.isDown ?? false) || (this.cursors?.down?.isDown ?? false);

            let vx = 0;
            let vy = 0;

            if (left) vx = -1;
            if (right) vx = 1;
            if (up) vy = -1;
            if (down) vy = 1;

            if (vx !== 0 || vy !== 0) {
              const dir = new Phaser.Math.Vector2(vx, vy).normalize();
              this.player.setVelocity(dir.x * this.speed, dir.y * this.speed);
            } else {
              this.player.setVelocity(0, 0);
            }
          }
        }

        phaserGame = new Phaser.Game({
          type: Phaser.AUTO,
          width: 960,
          height: 720,
          parent: containerRef.current,
          physics: {
            default: 'arcade',
            arcade: { gravity: { y: 0 }, debug: false }
          },
          scene: MainScene,
          backgroundColor: '#071014'
        });
      } catch (err) {
        console.error('Error inicializando Phaser:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    init();

    return () => {
      if (phaserGame) {
        phaserGame.destroy(true);
      }
    };
  }, []);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        color: '#f8fafc',
        background: '#071014',
        textAlign: 'center',
        padding: 24
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>No se pudo iniciar el juego.</p>
          <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: '#94a3b8' }}>{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#071014' }} />;
}
