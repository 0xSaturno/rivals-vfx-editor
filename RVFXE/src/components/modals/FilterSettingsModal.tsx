import type { FilterDictionary } from '@/types';
import { KeywordListEditor } from '@/components/ui';

interface FilterSettingsModalProps {
  filterDictionary: FilterDictionary;
  onChangeDictionary: (dict: FilterDictionary) => void;
  onClose: () => void;
  onReset: () => void;
}

export function FilterSettingsModal({
  filterDictionary,
  onChangeDictionary,
  onClose,
  onReset,
}: FilterSettingsModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-lg p-6 shadow-xl border-2 flex flex-col relative group" style={{ backgroundColor: 'var(--bg-3)', borderColor: 'var(--bg-2)', maxHeight: '90vh' }}>
        <div className="absolute inset-0 border-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderColor: 'var(--accent-warning, #f59e0b)', zIndex: 10 }}></div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Advanced Parser Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 transform hover:scale-125 transition-transform duration-200" style={{ color: 'var(--text-2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        <div className="mb-4 text-xs font-medium p-3 rounded border" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-warning, #f59e0b)' }}>
          Incorrectly modifying these keywords may result in missing color parameters or unintended inclusions. Proceed with caution.
        </div>

        <div className="flex-grow space-y-4 overflow-y-auto pr-1">
          <div>
            <KeywordListEditor
              title="Include Keywords"
              keywords={filterDictionary.include_keywords || []}
              onChange={(newKeywords) => onChangeDictionary({
                ...filterDictionary,
                include_keywords: newKeywords,
              })}
            />
            <p className="text-xs opacity-50 italic -mt-2 mb-2" style={{ color: 'var(--text-3)' }}>
              Leave empty to show all parameters except excluded ones.
            </p>
          </div>

          <KeywordListEditor
            title="Exclude Keywords"
            keywords={filterDictionary.exclude_keywords || []}
            onChange={(newKeywords) => onChangeDictionary({
              ...filterDictionary,
              exclude_keywords: newKeywords,
            })}
          />

          <KeywordListEditor
            title="Color Property Names"
            keywords={filterDictionary.color_property_names || []}
            onChange={(newKeywords) => onChangeDictionary({
              ...filterDictionary,
              color_property_names: newKeywords,
            })}
          />
        </div>

        <div className="flex justify-between items-center pt-2 border-t" style={{ borderColor: 'var(--bg-1)' }}>
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium rounded-none"
            style={{ backgroundColor: 'var(--bg-1)', color: 'var(--text-2)' }}
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2 font-medium rounded-none"
            style={{ backgroundColor: 'var(--accent-main)', color: 'var(--bg-4)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
