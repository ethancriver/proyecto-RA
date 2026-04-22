import { useEffect, useRef } from 'react';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let phaserGame: any;

    async function init() {
      if (!containerRef.current) return;
      const Phaser = (await import('phaser')).default;

      class MainScene extends Phaser.Scene {
        player!: Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
        cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
        keys!: Record<string, Phaser.Input.Keyboard.Key>;
        enemies!: any;
        projectiles!: any;
        attackHitbox!: any;
        stamina = 100;
        maxStamina = 100;
        hp = 30;
        maxHp = 30;
        staminaText!: Phaser.GameObjects.Text;
        hpText!: Phaser.GameObjects.Text;
        actionText!: Phaser.GameObjects.Text;
        canAttack = true;
        isCharging = false;
        chargeStart = 0;
        parryActive = false;
        dashCooldown = 0;

        preload() {
          this.load.image('background', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHklEQVQYV2NkQAOYmBgAEmBkYGRgYGBg+AEAANnAAwma+94AAAAASUVORK5CYII=');
          this.load.spritesheet('player', 'https://labs.phaser.io/assets/sprites/metalslug_mummy37x45.png', {
            frameWidth: 37,
            frameHeight: 45
          });
          this.load.spritesheet('enemy', 'https://labs.phaser.io/assets/sprites/metalslug_monster37x45.png', {
            frameWidth: 37,
            frameHeight: 45
          });
        }

        create() {
          this.add.rectangle(480, 360, 960, 720, 0x071014);
          this.add.text(20, 22, 'WASD / Flechas para mover', { fontSize: '16px', color: '#d6e4ff' });
          this.add.text(20, 42, 'Shift: Dash | Espacio: Ligero | E: Pesado | Q: Rango | F: Parry', { fontSize: '14px', color: '#94a3b8' });

          this.player = this.physics.add.image(480, 360, 'player', 0).setScale(1.5).setCollideWorldBounds(true);
          const cursors = (this.input.keyboard as any).createCursorKeys();
          if (!cursors) {
            throw new Error('Cursor keys could not be created.');
          }
          this.cursors = cursors;
          this.keys = (this.input.keyboard as any).addKeys('W,A,S,D,SHIFT,SPACE,E,Q,F') as Record<string, Phaser.Input.Keyboard.Key>;

          this.player.setDrag(800, 800);
          this.player.setMaxVelocity(260);

          this.hpText = this.add.text(20, 70, `HP: ${this.hp}/${this.maxHp}`, { fontSize: '16px', color: '#fca5a5' });
          this.staminaText = this.add.text(20, 90, `Stamina: ${Math.round(this.stamina)}/${this.maxStamina}`, { fontSize: '16px', color: '#7dd3fc' });
          this.actionText = this.add.text(20, 110, 'Acción: Ninguna', { fontSize: '16px', color: '#e2e8f0' });

          this.enemies = this.physics.add.group({ runChildUpdate: true });
          this.projectiles = this.physics.add.group({ classType: Phaser.GameObjects.Image, runChildUpdate: true });

          this.attacksCreateHitbox();
          this.spawnEnemy(620, 260);
          this.spawnEnemy(340, 500);

          this.physics.add.overlap(this.attackHitbox, this.enemies, this.handleAttackOverlap as any, undefined, this);
          this.physics.add.overlap(this.projectiles, this.enemies, this.handleProjectileHit as any, undefined, this);
          this.physics.add.overlap(this.enemies, this.player, this.handleEnemyCollision as any, undefined, this);
        }

        update(time: number, delta: number) {
          const keys = this.keys as Phaser.Types.Input.Keyboard.CursorKeys & Record<string, Phaser.Input.Keyboard.Key>;
          const dashKey = keys.SHIFT;
          const attackKey = keys.SPACE;
          const heavyKey = keys.E;
          const rangedKey = keys.Q;
          const parryKey = keys.F;
          let vx = 0;
          let vy = 0;

          if (keys.A.isDown || keys.LEFT.isDown) vx -= 1;
          if (keys.D.isDown || keys.RIGHT.isDown) vx += 1;
          if (keys.W.isDown || keys.UP.isDown) vy -= 1;
          if (keys.S.isDown || keys.DOWN.isDown) vy += 1;

          const dir = new Phaser.Math.Vector2(vx, vy);
          if (dir.lengthSq() > 0) {
            dir.normalize();
            this.player.setAcceleration(dir.x * 1000, dir.y * 1000);
          } else {
            this.player.setAcceleration(0, 0);
          }

          if (dashKey.isDown && this.stamina > 10 && this.dashCooldown <= 0) {
            const dashVel = dir.lengthSq() > 0 ? dir.scale(520) : new Phaser.Math.Vector2(0, 0);
            this.player.setVelocity(dashVel.x, dashVel.y);
            this.stamina -= 15;
            this.dashCooldown = 400;
            this.actionText.setText('Acción: Dash');
          }

          if (this.dashCooldown > 0) {
            this.dashCooldown -= delta;
          }

          if (parryKey.isDown && this.stamina > 5 && !this.parryActive) {
            this.parryActive = true;
            this.stamina -= 10;
            this.actionText.setText('Acción: Parry activo');
            this.time.delayedCall(250, () => {
              this.parryActive = false;
              this.actionText.setText('Acción: Ninguna');
            });
          }

          if (attackKey.isDown && this.canAttack && this.stamina >= 8) {
            this.performLightAttack();
          }

          if (heavyKey.isDown && !this.isCharging && this.stamina >= 20) {
            this.isCharging = true;
            this.chargeStart = time;
            this.actionText.setText('Acción: Cargando ataque');
          }

          if (heavyKey.isUp && this.isCharging) {
            const chargeDuration = time - this.chargeStart;
            this.isCharging = false;
            if (chargeDuration > 350 && this.stamina >= 20) {
              this.performHeavyAttack();
            } else {
              this.actionText.setText('Acción: Carga cancelada');
            }
          }

          if (rangedKey.isDown && this.canAttack && this.stamina >= 15) {
            this.performRangedAttack(dir.lengthSq() > 0 ? dir : new Phaser.Math.Vector2(1, 0));
          }

          if (!attackKey.isDown && !heavyKey.isDown && !rangedKey.isDown && !dashKey.isDown && !parryKey.isDown && !this.isCharging) {
            if (!this.parryActive) {
              this.actionText.setText('Acción: Ninguna');
            }
          }

          if (this.stamina < this.maxStamina) {
            this.stamina += delta * 0.02;
          }
          this.stamina = Phaser.Math.Clamp(this.stamina, 0, this.maxStamina);

          this.hpText.setText(`HP: ${this.hp}/${this.maxHp}`);
          this.staminaText.setText(`Stamina: ${Math.round(this.stamina)}/${this.maxStamina}`);

          this.enemies.getChildren().forEach((enemySprite: any) => {
            const enemy = enemySprite as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
            const enemyData = enemy.getData('meta') as { hp: number; attackTimer: number; stunned: boolean; };
            if (!enemyData || enemyData.hp <= 0) return;

            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (enemyData.stunned) {
              enemy.setVelocity(0, 0);
              return;
            }

            if (distance > 150) {
              this.physics.moveToObject(enemy, this.player, 60);
            } else if (distance > 70) {
              this.physics.moveToObject(enemy, this.player, 90);
            } else {
              enemy.setVelocity(0, 0);
              if (enemyData.attackTimer <= 0) {
                enemyData.attackTimer = 1200;
                this.actionText.setText('Acción: Enemigo atacando');
                this.time.delayedCall(400, () => {
                  if (enemyData.hp > 0 && Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < 90) {
                    if (this.parryActive) {
                      enemyData.stunned = true;
                      this.time.delayedCall(800, () => (enemyData.stunned = false));
                      this.actionText.setText('Acción: Parry exitoso');
                    } else {
                      this.receiveDamage(8);
                      this.actionText.setText('Acción: Golpe recibido');
                    }
                  }
                });
              }
            }

            enemyData.attackTimer -= delta;
          });
        }

        attacksCreateHitbox() {
          const hitbox = this.physics.add.image(this.player.x, this.player.y, 'background').setVisible(false).setScale(0.1).setSize(48, 48);
          hitbox.body.setEnable(false);
          hitbox.setImmovable(true);
          this.attackHitbox = hitbox as unknown as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
        }

        performLightAttack() {
          this.canAttack = false;
          this.stamina -= 8;
          this.actionText.setText('Acción: Ataque ligero');
          this.activateHitbox(40, 40, 120, 6);
          this.time.delayedCall(300, () => { this.canAttack = true; });
        }

        performHeavyAttack() {
          this.canAttack = false;
          this.stamina -= 20;
          this.actionText.setText('Acción: Ataque pesado');
          this.activateHitbox(80, 80, 180, 18);
          this.time.delayedCall(450, () => { this.canAttack = true; });
        }

        performRangedAttack(direction: Phaser.Math.Vector2) {
          this.canAttack = false;
          this.stamina -= 15;
          this.actionText.setText('Acción: Ataque a distancia');
          const projectile = this.physics.add.image(this.player.x, this.player.y, 'background').setScale(0.35).setTint(0x7dd3fc);
          projectile.setVelocity(direction.x * 420, direction.y * 420);
          projectile.setData('damage', 10);
          this.projectiles.add(projectile);
          projectile.setCollideWorldBounds(true);
          projectile.body.onWorldBounds = true;
          projectile.body.world.on('worldbounds', (body: any) => {
            if (body.gameObject === projectile) {
              projectile.destroy();
            }
          });
          this.time.delayedCall(400, () => { this.canAttack = true; });
        }

        activateHitbox(width: number, height: number, duration: number, damage: number) {
          const forward = new Phaser.Math.Vector2(0, -1);
          if (this.cursors.left.isDown) forward.set(-1, 0);
          else if (this.cursors.right.isDown) forward.set(1, 0);
          else if (this.cursors.up.isDown) forward.set(0, -1);
          else if (this.cursors.down.isDown) forward.set(0, 1);
          forward.normalize();

          const offsetX = forward.x * 40;
          const offsetY = forward.y * 40;
          this.attackHitbox.setSize(width, height);
          this.attackHitbox.setPosition(this.player.x + offsetX, this.player.y + offsetY);
          (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(true);
          this.attackHitbox.setVisible(true);
          this.attackHitbox.setTint(0xf4717f);
          this.attackHitbox.setAlpha(0.3);
          this.attackHitbox.setDepth(2);
          this.attackHitbox.setData('damage', damage);
          this.time.delayedCall(duration, () => {
            (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setEnable(false);
            this.attackHitbox.setVisible(false);
          });
        }

        handleAttackOverlap(_: any, enemyObject: any) {
          const enemy = enemyObject as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
          const enemyData = enemy.getData('meta') as { hp: number; attackTimer: number; stunned: boolean; };
          if (!enemyData || enemyData.hp <= 0) return;
          const damage = this.attackHitbox.getData('damage') as number;
          this.damageEnemy(enemy, damage);
        }

        handleProjectileHit(_: any, enemyObject: any) {
          const projectile = _ as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
          const enemy = enemyObject as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
          const enemyData = enemy.getData('meta') as { hp: number; attackTimer: number; stunned: boolean; };
          if (!enemyData || enemyData.hp <= 0) return;
          const damage = projectile.getData('damage') as number;
          this.damageEnemy(enemy, damage);
          projectile.destroy();
        }

        handleEnemyCollision(_: any, enemyObject: any) {
          const enemy = enemyObject as Phaser.Types.Physics.Arcade.ImageWithDynamicBody;
          const enemyData = enemy.getData('meta') as { hp: number; attackTimer: number; stunned: boolean; };
          if (!enemyData || enemyData.hp <= 0) return;
          if (this.parryActive) {
            enemyData.stunned = true;
            this.time.delayedCall(800, () => { enemyData.stunned = false; });
            this.actionText.setText('Acción: Parry exitoso');
          }
        }

        damageEnemy(enemy: Phaser.Types.Physics.Arcade.ImageWithDynamicBody, amount: number) {
          const enemyData = enemy.getData('meta') as { hp: number; attackTimer: number; stunned: boolean; };
          enemyData.hp -= amount;
          enemy.setTint(0xff7f7f);
          this.time.delayedCall(120, () => { if (enemyData.hp > 0) enemy.clearTint(); });
          if (enemyData.hp <= 0) {
            enemy.setTint(0x404040);
            enemy.setVelocity(0, 0);
            enemy.setData('meta', { ...enemyData, hp: 0 });
            enemy.disableBody(true, false);
          }
        }

        receiveDamage(amount: number) {
          if (this.hp <= 0) return;
          this.hp -= amount;
          this.player.setTint(0xff6b6b);
          this.time.delayedCall(200, () => { this.player.clearTint(); });
          if (this.hp <= 0) {
            this.player.setTint(0x111111);
            this.player.setVelocity(0, 0);
            this.actionText.setText('Acción: Derrotado');
          }
        }

        spawnEnemy(x: number, y: number) {
          const enemy = this.physics.add.image(x, y, 'enemy', 0).setScale(1.5).setCollideWorldBounds(true);
          enemy.setData('meta', { hp: 24, attackTimer: 0, stunned: false });
          this.enemies.add(enemy);
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
    }

    init();

    return () => {
      if (phaserGame) {
        phaserGame.destroy(true);
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
