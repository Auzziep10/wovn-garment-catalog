import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add lastClickPos state
state_find = """  const [tolerance, setTolerance] = useState(35);
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsReset, setNeedsReset] = useState(0);

  const [isSpaceDown, setIsSpaceDown] = useState(false);"""

state_replace = """  const [tolerance, setTolerance] = useState(35);
  const [isProcessing, setIsProcessing] = useState(false);
  const [needsReset, setNeedsReset] = useState(0);
  const [lastClickPos, setLastClickPos] = useState<{x: number, y: number} | null>(null);

  const [isSpaceDown, setIsSpaceDown] = useState(false);"""

if state_find in text:
    text = text.replace(state_find, state_replace)
else:
    print('Failed to inject state')

# 2. Update the useEffect logic and handleCanvasClick logic
old_logic_pattern = re.compile(r'  useEffect\(\(\) => \{\n    const canvas = canvasRef\.current;.*?ctx\.putImageData\(imgData, 0, 0\);\n  \};\n', re.DOTALL)

new_logic = """  // Main render loop for image drawing and erasure
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // If we have a click position, perform flood fill immediately after drawing base image
      if (lastClickPos) {
        const w = canvas.width;
        const h = canvas.height;
        const startX = lastClickPos.x;
        const startY = lastClickPos.y;
        
        if (startX >= 0 && startX < w && startY >= 0 && startY < h) {
          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;
          
          const startPos = (startY * w + startX) * 4;
          const startR = data[startPos];
          const startG = data[startPos+1];
          const startB = data[startPos+2];
          const startA = data[startPos+3];

          if (startA !== 0) {
            const scaledTolerance = (tolerance / 100) * 255;
            
            const match = (p: number) => {
              const a = data[p+3];
              if (a === 0) return false;
              const r = data[p];
              const g = data[p+1];
              const b = data[p+2];
              
              const diff = Math.max(Math.abs(r - startR), Math.abs(g - startG), Math.abs(b - startB));
              return diff <= scaledTolerance;
            };
            
            const maxStack = w * h * 2;
            const stack = new Uint32Array(maxStack);
            let stackPtr = 0;
            
            stack[stackPtr++] = startX;
            stack[stackPtr++] = startY;
            
            const visited = new Uint8Array(w * h);
            visited[startY * w + startX] = 1;
            
            while(stackPtr > 0) {
              const y = stack[--stackPtr];
              const x = stack[--stackPtr];
              
              const p = (y * w + x) * 4;
              if (match(p)) {
                data[p + 3] = 0;
                
                if (x > 0 && visited[y * w + (x - 1)] === 0) { 
                   visited[y * w + (x - 1)] = 1; 
                   stack[stackPtr++] = x - 1;
                   stack[stackPtr++] = y;
                }
                if (x < w - 1 && visited[y * w + (x + 1)] === 0) { 
                   visited[y * w + (x + 1)] = 1; 
                   stack[stackPtr++] = x + 1;
                   stack[stackPtr++] = y;
                }
                if (y > 0 && visited[(y - 1) * w + x] === 0) { 
                   visited[(y - 1) * w + x] = 1; 
                   stack[stackPtr++] = x;
                   stack[stackPtr++] = y - 1;
                }
                if (y < h - 1 && visited[(y + 1) * w + x] === 0) { 
                   visited[(y + 1) * w + x] = 1; 
                   stack[stackPtr++] = x;
                   stack[stackPtr++] = y + 1;
                }
              }
            }
            
            ctx.putImageData(imgData, 0, 0);
          }
        }
      }
    };
    img.src = currentUrl;
  }, [currentUrl, needsReset, tolerance, lastClickPos]);

  const handleCanvasClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Calculate exact click coordinates within original image scale
    const startX = Math.floor(e.nativeEvent.offsetX * scaleX);
    const startY = Math.floor(e.nativeEvent.offsetY * scaleY);
    
    setLastClickPos({ x: startX, y: startY });
  };
"""

matches = old_logic_pattern.findall(text)
if len(matches) == 1:
    text = text.replace(matches[0], new_logic)
else:
    print('Failed to match old logic. found:', len(matches))

reset_logic = """                  setNeedsReset(n => n + 1);
                  setLastClickPos(null);"""
text = text.replace('setNeedsReset(n => n + 1);', reset_logic)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Patched logic successfully')
