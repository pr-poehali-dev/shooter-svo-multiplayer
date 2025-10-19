import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: '#0EA5E9' },
  O: { shape: [[1, 1], [1, 1]], color: '#8B5CF6' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#D946EF' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#F97316' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#FEC6A1' },
  J: { shape: [[1, 0, 0], [1, 1, 1]], color: '#33C3F0' },
  L: { shape: [[0, 0, 1], [1, 1, 1]], color: '#1EAEDB' }
};

type TetrominoType = keyof typeof TETROMINOS;

interface Piece {
  shape: number[][];
  color: string;
  x: number;
  y: number;
}

const Index = () => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'settings' | 'leaderboard'>('menu');
  const [board, setBoard] = useState<(string | null)[][]>(
    Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null))
  );
  const [currentPiece, setCurrentPiece] = useState<Piece | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameSpeed, setGameSpeed] = useState(1000);

  const createNewPiece = (): Piece => {
    const types = Object.keys(TETROMINOS) as TetrominoType[];
    const randomType = types[Math.floor(Math.random() * types.length)];
    const tetromino = TETROMINOS[randomType];
    return {
      shape: tetromino.shape,
      color: tetromino.color,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2),
      y: 0
    };
  };

  const checkCollision = (piece: Piece, boardState: (string | null)[][], offsetX = 0, offsetY = 0): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + offsetX;
          const newY = piece.y + y + offsetY;
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return true;
          }
          
          if (newY >= 0 && boardState[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const mergePieceToBoard = (piece: Piece, boardState: (string | null)[][]): (string | null)[][] => {
    const newBoard = boardState.map(row => [...row]);
    piece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const boardY = piece.y + y;
          const boardX = piece.x + x;
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color;
          }
        }
      });
    });
    return newBoard;
  };

  const clearLines = (boardState: (string | null)[][]): { newBoard: (string | null)[][], linesCleared: number } => {
    let linesCleared = 0;
    const newBoard = boardState.filter(row => {
      if (row.every(cell => cell !== null)) {
        linesCleared++;
        return false;
      }
      return true;
    });
    
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(null));
    }
    
    return { newBoard, linesCleared };
  };

  const rotatePiece = (piece: Piece): number[][] => {
    const rotated = piece.shape[0].map((_, i) =>
      piece.shape.map(row => row[i]).reverse()
    );
    return rotated;
  };

  const movePiece = useCallback((direction: 'left' | 'right' | 'down' | 'rotate') => {
    if (!currentPiece || gameState !== 'playing') return;

    const newPiece = { ...currentPiece };
    
    if (direction === 'left') {
      if (!checkCollision(currentPiece, board, -1, 0)) {
        newPiece.x -= 1;
      }
    } else if (direction === 'right') {
      if (!checkCollision(currentPiece, board, 1, 0)) {
        newPiece.x += 1;
      }
    } else if (direction === 'down') {
      if (!checkCollision(currentPiece, board, 0, 1)) {
        newPiece.y += 1;
      } else {
        const mergedBoard = mergePieceToBoard(currentPiece, board);
        const { newBoard, linesCleared } = clearLines(mergedBoard);
        setBoard(newBoard);
        setLines(prev => prev + linesCleared);
        setScore(prev => prev + linesCleared * 100 * level);
        
        const newPiece = createNewPiece();
        if (checkCollision(newPiece, newBoard)) {
          setGameState('menu');
          return;
        }
        setCurrentPiece(newPiece);
        return;
      }
    } else if (direction === 'rotate') {
      const rotated = rotatePiece(currentPiece);
      const testPiece = { ...currentPiece, shape: rotated };
      if (!checkCollision(testPiece, board)) {
        newPiece.shape = rotated;
      }
    }
    
    setCurrentPiece(newPiece);
  }, [currentPiece, board, gameState, level]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      
      switch (e.key) {
        case 'ArrowLeft':
          movePiece('left');
          break;
        case 'ArrowRight':
          movePiece('right');
          break;
        case 'ArrowDown':
          movePiece('down');
          break;
        case 'ArrowUp':
        case ' ':
          movePiece('rotate');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [movePiece, gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(() => {
      movePiece('down');
    }, gameSpeed);

    return () => clearInterval(interval);
  }, [movePiece, gameSpeed, gameState]);

  useEffect(() => {
    const newLevel = Math.floor(lines / 10) + 1;
    setLevel(newLevel);
    setGameSpeed(Math.max(100, 1000 - (newLevel - 1) * 100));
  }, [lines]);

  const startGame = () => {
    setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null)));
    setCurrentPiece(createNewPiece());
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameSpeed(1000);
    setGameState('playing');
  };

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);
    
    if (currentPiece) {
      currentPiece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.color;
            }
          }
        });
      });
    }

    return displayBoard;
  };

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1F2C] via-[#221F26] to-[#1A1F2C]">
        <div className="text-center space-y-8 animate-fade-in">
          <h1 
            className="text-7xl font-black tracking-wider animate-glow-pulse"
            style={{ 
              color: '#0EA5E9',
              textShadow: '0 0 10px #0EA5E9, 0 0 20px #0EA5E9, 0 0 30px #0EA5E9, 0 0 40px #8B5CF6'
            }}
          >
            NEON TETRIS
          </h1>
          <div className="space-y-4">
            <Button 
              onClick={startGame}
              size="lg"
              className="w-64 h-14 text-xl font-bold border-2 transition-all duration-300"
              style={{
                backgroundColor: '#8B5CF6',
                borderColor: '#D946EF',
                color: '#fff',
                boxShadow: '0 0 20px #8B5CF6, 0 0 30px #D946EF',
              }}
            >
              <Icon name="Play" className="mr-2" size={24} />
              ИГРАТЬ
            </Button>
            <Button 
              onClick={() => setGameState('settings')}
              size="lg"
              variant="outline"
              className="w-64 h-14 text-xl font-bold border-2 transition-all duration-300"
              style={{
                borderColor: '#0EA5E9',
                color: '#0EA5E9',
                boxShadow: '0 0 10px #0EA5E9',
              }}
            >
              <Icon name="Settings" className="mr-2" size={24} />
              НАСТРОЙКИ
            </Button>
            <Button 
              onClick={() => setGameState('leaderboard')}
              size="lg"
              variant="outline"
              className="w-64 h-14 text-xl font-bold border-2 transition-all duration-300"
              style={{
                borderColor: '#0EA5E9',
                color: '#0EA5E9',
                boxShadow: '0 0 10px #0EA5E9',
              }}
            >
              <Icon name="Trophy" className="mr-2" size={24} />
              РЕЙТИНГ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'settings') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1F2C] via-[#221F26] to-[#1A1F2C]">
        <div className="text-center space-y-8 animate-fade-in">
          <h2 
            className="text-5xl font-black tracking-wider"
            style={{ 
              color: '#8B5CF6',
              textShadow: '0 0 10px #8B5CF6, 0 0 20px #8B5CF6'
            }}
          >
            НАСТРОЙКИ
          </h2>
          <p className="text-xl" style={{ color: '#0EA5E9' }}>Управление:</p>
          <div className="space-y-2 text-lg" style={{ color: '#D946EF' }}>
            <p>← → Движение влево/вправо</p>
            <p>↓ Ускорить падение</p>
            <p>↑ или Пробел - Поворот</p>
          </div>
          <Button 
            onClick={() => setGameState('menu')}
            size="lg"
            className="mt-8"
            style={{
              backgroundColor: '#8B5CF6',
              borderColor: '#D946EF',
              color: '#fff',
              boxShadow: '0 0 20px #8B5CF6',
            }}
          >
            <Icon name="ArrowLeft" className="mr-2" size={24} />
            НАЗАД
          </Button>
        </div>
      </div>
    );
  }

  if (gameState === 'leaderboard') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1F2C] via-[#221F26] to-[#1A1F2C]">
        <div className="text-center space-y-8 animate-fade-in">
          <h2 
            className="text-5xl font-black tracking-wider"
            style={{ 
              color: '#D946EF',
              textShadow: '0 0 10px #D946EF, 0 0 20px #D946EF'
            }}
          >
            РЕЙТИНГ
          </h2>
          <div className="space-y-4 text-xl" style={{ color: '#0EA5E9' }}>
            <p>Рейтинг пока пуст</p>
            <p>Начните играть, чтобы установить рекорд!</p>
          </div>
          <Button 
            onClick={() => setGameState('menu')}
            size="lg"
            className="mt-8"
            style={{
              backgroundColor: '#8B5CF6',
              borderColor: '#D946EF',
              color: '#fff',
              boxShadow: '0 0 20px #8B5CF6',
            }}
          >
            <Icon name="ArrowLeft" className="mr-2" size={24} />
            НАЗАД
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1A1F2C] via-[#221F26] to-[#1A1F2C] p-4">
      <div className="flex gap-8 items-start">
        <div 
          className="border-4 p-1 rounded-lg"
          style={{
            borderColor: '#8B5CF6',
            boxShadow: '0 0 20px #8B5CF6, inset 0 0 20px rgba(139, 92, 246, 0.2)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
        >
          <div 
            style={{ 
              width: BOARD_WIDTH * BLOCK_SIZE,
              height: BOARD_HEIGHT * BLOCK_SIZE,
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD_WIDTH}, ${BLOCK_SIZE}px)`,
              gridTemplateRows: `repeat(${BOARD_HEIGHT}, ${BLOCK_SIZE}px)`,
              gap: '1px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)'
            }}
          >
            {renderBoard().map((row, y) =>
              row.map((cell, x) => (
                <div
                  key={`${y}-${x}`}
                  style={{
                    width: BLOCK_SIZE,
                    height: BLOCK_SIZE,
                    backgroundColor: cell || 'rgba(139, 92, 246, 0.1)',
                    border: cell ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
                    boxShadow: cell ? `0 0 10px ${cell}, inset 0 0 10px ${cell}` : 'none',
                    transition: 'all 0.1s'
                  }}
                />
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div 
            className="p-6 rounded-lg border-2"
            style={{
              borderColor: '#0EA5E9',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              boxShadow: '0 0 15px #0EA5E9',
              minWidth: '200px'
            }}
          >
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#0EA5E9' }}>СТАТИСТИКА</h3>
            <div className="space-y-3 text-lg">
              <div>
                <p style={{ color: '#D946EF' }}>СЧЁТ</p>
                <p className="text-3xl font-bold" style={{ color: '#fff' }}>{score}</p>
              </div>
              <div>
                <p style={{ color: '#D946EF' }}>УРОВЕНЬ</p>
                <p className="text-2xl font-bold" style={{ color: '#fff' }}>{level}</p>
              </div>
              <div>
                <p style={{ color: '#D946EF' }}>ЛИНИИ</p>
                <p className="text-2xl font-bold" style={{ color: '#fff' }}>{lines}</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setGameState('menu')}
            size="lg"
            className="w-full"
            style={{
              backgroundColor: '#8B5CF6',
              color: '#fff',
              boxShadow: '0 0 15px #8B5CF6',
            }}
          >
            <Icon name="Home" className="mr-2" size={20} />
            МЕНЮ
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
