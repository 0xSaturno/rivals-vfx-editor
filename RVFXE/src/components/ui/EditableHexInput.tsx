import { useState, useEffect, useRef } from 'react';
import { isValidHex } from '@/utils/color';

interface EditableHexInputProps {
  initialHex: string;
  onCommit: (hex: string) => void;
}

export function EditableHexInput({ initialHex, onCommit }: EditableHexInputProps) {
  const [hexValue, setHexValue] = useState(initialHex);

  useEffect(() => {
    setHexValue(initialHex);
  }, [initialHex]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHexValue('#' + e.target.value.replace(/#/g, '').slice(0, 6));
  };

  const isEscaping = useRef(false);

  const handleCommit = () => {
    if (isValidHex(hexValue)) {
      console.debug('[EditableHexInput] Committing hex:', hexValue);
      onCommit(hexValue);
    } else {
      console.debug('[EditableHexInput] Invalid hex, reverting to:', initialHex);
      setHexValue(initialHex);
    }
  };

  const handleBlur = () => {
    if (isEscaping.current) {
      isEscaping.current = false;
      return;
    }
    handleCommit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      isEscaping.current = true;
      setHexValue(initialHex);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="flex items-center w-16 border-2 rounded-none focus-within:ring-1 focus-within:ring-[var(--accent-main)]" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--bg-2)' }}>
      <span className="text-xs font-mono pl-1 opacity-50 select-none" style={{ color: 'var(--text-2)' }}>#</span>
      <input
        type="text"
        value={hexValue.replace(/^#/, '').toUpperCase()}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full px-1 py-0.5 text-xs text-left font-mono focus:outline-none bg-transparent border-none"
        style={{ color: 'var(--text-2)' }}
        maxLength={7}
      />
    </div>
  );
}
