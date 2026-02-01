import { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

interface Position {
  x: number;
  y: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  speed: number;
}

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerPos, setPlayerPos] = useState<Position>({ x: 50, y: 70 });
  const [joystickPos, setJoystickPos] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(100);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isFiring, setIsFiring] = useState(false);
  const [stars, setStars] = useState<Star[]>([]);

  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const projectileIdRef = useRef(0);
  const enemyIdRef = useRef(0);
  const lastFireRef = useRef(0);
  const joystickPosRef = useRef<Position>({ x: 0, y: 0 });

  // Initialize stars
  useEffect(() => {
    const initialStars: Star[] = [];
    for (let i = 0; i < 100; i++) {
      initialStars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.02 + 0.01
      });
    }
    setStars(initialStars);
  }, []);

  // Animate stars
  useEffect(() => {
    if (!gameStarted) return;

    const animateStars = () => {
      setStars(prev => prev.map(star => ({
        ...star,
        y: star.y > 100 ? -2 : star.y + star.speed
      })));
    };

    const interval = setInterval(animateStars, 16);
    return () => clearInterval(interval);
  }, [gameStarted]);

  const handleJoystickMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickBaseRef.current) return;

    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;

    const maxDistance = rect.width / 2 - 20;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }

    const newPos = { x: deltaX, y: deltaY };
    setJoystickPos(newPos);
    joystickPosRef.current = newPos;
  }, []);

  const handleJoystickStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleJoystickMove(e);
  }, [handleJoystickMove]);

  const handleJoystickEnd = useCallback(() => {
    setIsDragging(false);
    setJoystickPos({ x: 0, y: 0 });
    joystickPosRef.current = { x: 0, y: 0 };
  }, []);

  const fireProjectile = useCallback(() => {
    const now = Date.now();
    if (now - lastFireRef.current < 150) return;
    lastFireRef.current = now;

    setPlayerPos(currentPlayerPos => {
      const newProjectile: Projectile = {
        id: projectileIdRef.current++,
        x: currentPlayerPos.x,
        y: currentPlayerPos.y - 3,
        angle: -90
      };
      setProjectiles(prev => [...prev, newProjectile]);
      return currentPlayerPos;
    });
  }, []);

  // Game loop
  useEffect(() => {
    if (!gameStarted || isGameOver) return;

    const gameLoop = () => {
      // Move player based on joystick position from ref
      const currentJoystickPos = joystickPosRef.current;
      setPlayerPos(prev => {
        const speed = 0.4;
        let newX = prev.x + currentJoystickPos.x * speed * 0.1;
        let newY = prev.y + currentJoystickPos.y * speed * 0.1;

        newX = Math.max(5, Math.min(95, newX));
        newY = Math.max(10, Math.min(85, newY));

        return { x: newX, y: newY };
      });

      // Move projectiles
      setProjectiles(prev => {
        return prev
          .map(p => ({ ...p, y: p.y - 2 }))
          .filter(p => p.y > -5);
      });

      // Move enemies
      setEnemies(prev => {
        return prev
          .map(e => ({ ...e, y: e.y + e.speed }))
          .filter(e => e.y < 105);
      });

      // Spawn enemies
      if (Math.random() < 0.02) {
        setEnemies(prev => [...prev, {
          id: enemyIdRef.current++,
          x: Math.random() * 80 + 10,
          y: -5,
          speed: Math.random() * 0.3 + 0.2
        }]);
      }

      // Check collisions
      setProjectiles(prevProjectiles => {
        setEnemies(prevEnemies => {
          const newProjectiles = [...prevProjectiles];
          const newEnemies = [...prevEnemies];
          let scoreIncrease = 0;

          for (let i = newProjectiles.length - 1; i >= 0; i--) {
            for (let j = newEnemies.length - 1; j >= 0; j--) {
              const dx = newProjectiles[i].x - newEnemies[j].x;
              const dy = newProjectiles[i].y - newEnemies[j].y;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 5) {
                newProjectiles.splice(i, 1);
                newEnemies.splice(j, 1);
                scoreIncrease += 100;
                break;
              }
            }
          }

          if (scoreIncrease > 0) {
            setScore(prev => prev + scoreIncrease);
          }

          return newEnemies;
        });
        return prevProjectiles;
      });

      // Check player collision with enemies
      setPlayerPos(currentPlayerPos => {
        setEnemies(prevEnemies => {
          for (const enemy of prevEnemies) {
            const dx = currentPlayerPos.x - enemy.x;
            const dy = currentPlayerPos.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 6) {
              setHealth(prev => {
                const newHealth = prev - 20;
                if (newHealth <= 0) {
                  setIsGameOver(true);
                }
                return Math.max(0, newHealth);
              });
              return prevEnemies.filter(e => e.id !== enemy.id);
            }
          }
          return prevEnemies;
        });
        return currentPlayerPos;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, isGameOver]);

  // Auto-fire when holding button
  useEffect(() => {
    if (!isFiring || !gameStarted || isGameOver) return;

    const fireInterval = setInterval(() => {
      fireProjectile();
    }, 150);

    fireProjectile();

    return () => clearInterval(fireInterval);
  }, [isFiring, gameStarted, isGameOver, fireProjectile]);

  const startGame = () => {
    setGameStarted(true);
    setIsGameOver(false);
    setScore(0);
    setHealth(100);
    setPlayerPos({ x: 50, y: 70 });
    setProjectiles([]);
    setEnemies([]);
  };

  const restartGame = () => {
    startGame();
  };

  return (
    <div className="game-container">
      {/* Animated starfield */}
      <div className="starfield">
        {stars.map(star => (
          <div
            key={star.id}
            className="star"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity
            }}
          />
        ))}
      </div>

      {/* Scanlines overlay */}
      <div className="scanlines" />

      {!gameStarted ? (
        <div className="title-screen">
          <div className="title-content">
            <h1 className="game-title">
              <span className="title-galactic">GALACTIC</span>
              <span className="title-wrench">WRENCH</span>
            </h1>
            <p className="subtitle">A Sci-Fi Action Shooter</p>

            <button className="start-button" onClick={startGame}>
              <span className="button-text">START MISSION</span>
              <div className="button-glow" />
            </button>

            <div className="controls-info">
              <p>Use the joystick to move</p>
              <p>Tap FIRE to shoot enemies</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* HUD */}
          <div className="hud">
            <div className="score-display">
              <span className="score-label">SCORE</span>
              <span className="score-value">{score.toString().padStart(6, '0')}</span>
            </div>
            <div className="health-display">
              <span className="health-label">HULL</span>
              <div className="health-bar">
                <div
                  className="health-fill"
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>
          </div>

          {/* Game Area */}
          <div className="game-area">
            {/* Player ship */}
            <div
              className="player-ship"
              style={{
                left: `${playerPos.x}%`,
                top: `${playerPos.y}%`
              }}
            >
              <div className="ship-body" />
              <div className="ship-glow" />
              <div className="ship-trail" />
            </div>

            {/* Projectiles */}
            {projectiles.map(p => (
              <div
                key={p.id}
                className="projectile"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`
                }}
              />
            ))}

            {/* Enemies */}
            {enemies.map(e => (
              <div
                key={e.id}
                className="enemy"
                style={{
                  left: `${e.x}%`,
                  top: `${e.y}%`
                }}
              >
                <div className="enemy-body" />
                <div className="enemy-glow" />
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="controls-overlay">
            {/* Joystick */}
            <div
              ref={joystickBaseRef}
              className="joystick-base"
              onTouchStart={handleJoystickStart}
              onTouchMove={isDragging ? handleJoystickMove : undefined}
              onTouchEnd={handleJoystickEnd}
              onMouseDown={handleJoystickStart}
              onMouseMove={isDragging ? handleJoystickMove : undefined}
              onMouseUp={handleJoystickEnd}
              onMouseLeave={isDragging ? handleJoystickEnd : undefined}
            >
              <div className="joystick-ring" />
              <div className="joystick-ring joystick-ring-inner" />
              <div
                className="joystick-knob"
                style={{
                  transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`
                }}
              >
                <div className="knob-inner" />
              </div>
            </div>

            {/* Fire Button */}
            <button
              className={`fire-button ${isFiring ? 'firing' : ''}`}
              onTouchStart={(e) => {
                e.preventDefault();
                setIsFiring(true);
              }}
              onTouchEnd={() => setIsFiring(false)}
              onMouseDown={() => setIsFiring(true)}
              onMouseUp={() => setIsFiring(false)}
              onMouseLeave={() => setIsFiring(false)}
            >
              <span className="fire-text">FIRE</span>
              <div className="fire-ring" />
              <div className="fire-glow" />
            </button>
          </div>

          {/* Game Over */}
          {isGameOver && (
            <div className="game-over-overlay">
              <div className="game-over-content">
                <h2 className="game-over-title">MISSION FAILED</h2>
                <p className="final-score">FINAL SCORE: {score}</p>
                <button className="restart-button" onClick={restartGame}>
                  RESTART MISSION
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="footer">
        Requested by @T1000_V2 · Built by @clonkbot
      </footer>
    </div>
  );
}

export default App;
