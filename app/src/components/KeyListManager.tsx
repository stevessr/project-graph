import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import Input from './Input';
import Button from './Button';
import IconButton from './IconButton';
import Box from './Box';

interface KeyListManagerProps {
  keys: string[];
  onKeysChange: (keys: string[]) => void;
}

const maskKey = (key: string) => {
  if (key.length <= 20) {
    return key;
  }
  return `${key.slice(0, 20)} *******  ${key.slice(-4)}`;
};

export const KeyListManager: React.FC<KeyListManagerProps> = ({ keys, onKeysChange }) => {
  const [newKey, setNewKey] = useState('');

  const handleAddKey = () => {
    if (newKey.trim() && !keys.includes(newKey.trim())) {
      onKeysChange([...keys, newKey.trim()]);
      setNewKey('');
    }
  };

  const handleDeleteKey = (keyToDelete: string) => {
    onKeysChange(keys.filter(key => key !== keyToDelete));
  };

  return (
    <div>
      <div className="flex flex-col gap-2">
        {keys.map((key) => (
          <Box key={key} className="flex items-center justify-between">
            <span className="font-mono text-sm">{maskKey(key)}</span>
            <IconButton onClick={() => handleDeleteKey(key)} size="sm">
              <Trash2 size={16} />
            </IconButton>
          </Box>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          type="password"
          value={newKey}
          onChange={(value) => setNewKey(value)}
          placeholder="Enter new API key"
          className="flex-grow"
        />
        <Button onClick={handleAddKey}>Add Key</Button>
      </div>
    </div>
  );
};