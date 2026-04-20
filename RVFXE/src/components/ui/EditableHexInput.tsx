import { useState, useEffect } from 'react';
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
    setHexValue(e.target.value);
  };

  const handleCommit = () => {
    if (isValidHex(hexValue)) {
      console.debug('[EditableHexInput] Committing hex:', hexValue);
      onCommit(hexValue);
    } else {
      console.debug('[EditableHexInput] Invalid hex, reverting to:', initialHex);
      setHexValue(initialHex);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommit();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      setHexValue(initialHex);
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      value={hexValue.toUpperCase()}
      onChange={handleChange}
      onBlur={handleCommit}
      onKeyDown={handleKeyDown}
      className="w-16 px-1 py-0.5 text-xs text-center font-mono focus:outline-none border-2 rounded-none focus:ring-2"
      style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-2)', borderColor: 'var(--bg-2)' }}
      maxLength={7}
    />
  );
}
