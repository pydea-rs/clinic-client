import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface ArrayFieldEditorProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export const ArrayFieldEditor: React.FC<ArrayFieldEditorProps> = ({
  label,
  items,
  onChange,
  placeholder = 'Add item...',
}) => {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (input.trim() && !items.includes(input.trim())) {
      onChange([...items, input.trim()]);
      setInput('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border rounded-lg input-focus"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-800 rounded-full text-sm"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="hover:text-brand-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
