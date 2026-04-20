import { useState } from 'react';

interface KeywordListEditorProps {
  title: string;
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

export function KeywordListEditor({ title, keywords, onChange }: KeywordListEditorProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      console.debug('[KeywordListEditor] Adding keyword:', newItem.trim());
      onChange([...keywords, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index: number) => {
    console.debug('[KeywordListEditor] Removing keyword at index:', index);
    const newKeywords = [...keywords];
    newKeywords.splice(index, 1);
    onChange(newKeywords);
  };

  return (
    <div className="mb-4">
      <label className="block text-xs font-bold uppercase mb-1 opacity-70" style={{ color: 'var(--text-2)' }}>
        {title}
      </label>
      <div className="flex flex-wrap gap-2 mb-2 max-h-40 overflow-y-auto p-2 border rounded" style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--bg-2)' }}>
        {keywords.length === 0 && <div className="text-xs opacity-50 px-1 italic">No keywords</div>}
        {keywords.map((keyword, idx) => (
          <div key={idx} className="flex items-center text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)' }}>
            <span className="mr-1">{keyword}</span>
            <button
              onClick={() => handleRemove(idx)}
              className="text-red-500 hover:text-red-400 font-bold ml-1"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add..."
          className="flex-1 text-xs px-2 py-1 rounded-none focus:outline-none"
          style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)' }}
        />
        <button
          onClick={handleAdd}
          className="px-2 py-1 text-xs font-bold rounded-none"
          style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
        >
          +
        </button>
      </div>
    </div>
  );
}
