import React, { useEffect, useState, useRef } from 'react';
import './PuyoGame.css';
import { initFirebase } from './firebase';

const COLS = 6;
const ROWS = 12;
const BASE_COLORS = ['red', 'green', 'blue', 'yellow'];

const offsets = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

function createPiece(colors) {
  const pivot = { x: 2, y: 0, color: colors[Math.floor(Math.random() * colors.length)] };
  const orientation = 2; // piece starts vertical with second below pivot
  const second = { ...pivot, color: colors[Math.floor(Math.random() * colors.length)] };
  second.x += offsets[orientation].x;
  second.y += offsets[orientation].y;
  return { pivot, second, orientation };
}

function PuyoGame() {
  const [colorCount, setColorCount] = useState(4);
  const [speed, setSpeed] = useState(500);
  const colors = BASE_COLORS.slice(0, colorCount);
  const [board, setBoard] = useState(() => Array.from({ length: ROWS }, () => Array(COLS).fill(null)));
  const [piece, setPiece] = useState(() => createPiece(colors));
  const [nextPieces, setNextPieces] = useState(() => [createPiece(colors), createPiece(colors)]);
  const [clearingCells, setClearingCells] = useState([]);
  const [score, setScore] = useState(0);
  const gameOverRef = useRef(false);
  const nextPiecesRef = useRef([]);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    nextPiecesRef.current = nextPieces;
  }, [nextPieces]);

  useEffect(() => {
    const { db } = initFirebase();
    // db can be used to store scores if needed
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (gameOverRef.current) return;
      if (e.key === 'ArrowLeft') {
        movePiece(-1, 0);
      } else if (e.key === 'ArrowRight') {
        movePiece(1, 0);
      } else if (e.code === 'Space') {
        e.preventDefault();
        rotatePiece();
      } else if (e.key === 'ArrowDown') {
        dropPiece();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (!gameOverRef.current && !isClearing) {
        dropPiece();
      }
    }, speed);
    return () => clearInterval(timer);
  }, [speed, isClearing]);

  const movePiece = (dx, dy) => {
    if (canMove(piece.pivot.x + dx, piece.pivot.y + dy, piece.second.x + dx, piece.second.y + dy)) {
      setPiece(p => ({ ...p, pivot: { ...p.pivot, x: p.pivot.x + dx, y: p.pivot.y + dy }, second: { ...p.second, x: p.second.x + dx, y: p.second.y + dy } }));
    }
  };

  const rotatePiece = () => {
    const newOrientation = (piece.orientation + 1) % 4;
    const newSecondX = piece.pivot.x + offsets[newOrientation].x;
    const newSecondY = piece.pivot.y + offsets[newOrientation].y;
    if (canMove(piece.pivot.x, piece.pivot.y, newSecondX, newSecondY)) {
      setPiece(p => ({ ...p, second: { ...p.second, x: newSecondX, y: newSecondY }, orientation: newOrientation }));
    }
  };

  const dropPiece = () => {
    if (isClearing) return;
    if (canMove(piece.pivot.x, piece.pivot.y + 1, piece.second.x, piece.second.y + 1)) {
      setPiece(p => ({ ...p, pivot: { ...p.pivot, y: p.pivot.y + 1 }, second: { ...p.second, y: p.second.y + 1 } }));
    } else {
      placePiece();
    }
  };

  const canMove = (x1, y1, x2, y2) => {
    const cells = [ [x1, y1], [x2, y2] ];
    return cells.every(([x, y]) => x >= 0 && x < COLS && y >= 0 && y < ROWS && !board[y][x]);
  };

  const placePiece = () => {
    const newBoard = board.map(row => row.slice());
    if (piece.pivot.y < 0 || piece.second.y < 0) {
      gameOverRef.current = true;
      setBoard(newBoard);
      return;
    }
    newBoard[piece.pivot.y][piece.pivot.x] = piece.pivot.color;
    newBoard[piece.second.y][piece.second.x] = piece.second.color;
    dropAll(newBoard);
    processClears(newBoard, () => {
      const [next1, next2] = nextPiecesRef.current;
      setPiece(next1);
      setNextPieces([next2, createPiece(colors)]);
    });
  };

  const findMatches = (b) => {
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    const toClear = [];
    for (let y=0; y<ROWS; y++) {
      for (let x=0; x<COLS; x++) {
        if (!b[y][x] || visited[y][x]) continue;
        const color = b[y][x];
        const queue = [[x,y]];
        const group = [];
        visited[y][x] = true;
        while(queue.length){
          const [cx,cy] = queue.pop();
          group.push([cx,cy]);
          dirs.forEach(([dx,dy]) => {
            const nx=cx+dx, ny=cy+dy;
            if(nx>=0&&nx<COLS&&ny>=0&&ny<ROWS&&!visited[ny][nx]&&b[ny][nx]===color){
              visited[ny][nx]=true; queue.push([nx,ny]);
            }
          });
        }
        if(group.length>=4){
          toClear.push(...group);
        }
      }
    }
    return toClear;
  };

  const processClears = (b, done) => {
    const matches = findMatches(b);
    setBoard(b.map(row => row.slice()));
    if (matches.length === 0) {
      setIsClearing(false);
      if (done) done();
      return;
    }
    setIsClearing(true);
    setClearingCells(matches);
    setTimeout(() => {
      matches.forEach(([gx, gy]) => {
        b[gy][gx] = null;
      });
      dropAll(b);
      setScore(s => s + matches.length);
      setClearingCells([]);
      processClears(b, done);
    }, 300);
  };

  const dropAll = (b) => {
    for(let x=0; x<COLS; x++){
      for(let y=ROWS-1; y>=0; y--){
        if(!b[y][x]){
          let k=y-1;
          while(k>=0 && !b[k][x]) k--;
          if(k>=0){
            b[y][x]=b[k][x];
            b[k][x]=null;
          }
        }
      }
    }
  };

  const cells = board.map((row,y)=>row.map((c,x)=>{
    const isPivot = piece.pivot.x===x && piece.pivot.y===y;
    const isSecond = piece.second.x===x && piece.second.y===y;
    const color = isPivot ? piece.pivot.color : isSecond ? piece.second.color : c;
    const clearing = clearingCells.some(([cx,cy]) => cx===x && cy===y);
    return <div key={`${x}-${y}`} className={`cell ${color||''} ${clearing?'clearing':''}`}></div>;
  }));

  const nextCells = nextPieces.map((np,idx)=>{
    return (
      <div key={idx} className="next-piece">
        <div className={`cell ${np.pivot.color}`}></div>
        <div className={`cell ${np.second.color}`}></div>
      </div>
    );
  });

  const restartGame = () => {
    gameOverRef.current = false;
    const empty = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    setBoard(empty);
    const initialPiece = createPiece(colors);
    const np = [createPiece(colors), createPiece(colors)];
    setPiece(initialPiece);
    setNextPieces(np);
    setScore(0);
    setClearingCells([]);
    setIsClearing(false);
  };

  return (
    <div className="puyo-wrapper">
      <h1>Puyo Puyo Game</h1>
      <div className="controls">
        <label>
          Colors:
          <select value={colorCount} onChange={e => setColorCount(parseInt(e.target.value, 10))}>
            {[2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>
          Speed(ms):
          <input type="number" value={speed} onChange={e => setSpeed(parseInt(e.target.value,10) || 0)} />
        </label>
        <button onClick={restartGame}>Restart</button>
      </div>
      <div className="board" style={{gridTemplateColumns:`repeat(${COLS},1fr)`}}>
        {cells}
      </div>
      <div className="next-pieces">{nextCells}</div>
      <p>Score: {score}</p>
      {gameOverRef.current && <p>Game Over</p>}
    </div>
  );
}

export default PuyoGame;
