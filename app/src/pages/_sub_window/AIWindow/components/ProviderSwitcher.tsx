import { useState, useRef, useEffect, useCallback } from 'react';
import { Brain } from 'lucide-react';
import { AIProvider } from '../types';

interface ProviderSwitcherProps {
  currentProvider: AIProvider;
  availableProviders: readonly AIProvider[];
  onProviderChange: (newProvider: AIProvider) => void;
  onMenuChange: (menu: React.ReactNode) => void;
}

export function ProviderSwitcher({
  currentProvider,
  availableProviders,
  onProviderChange,
  onMenuChange,
}: ProviderSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 使用 ref 来存储不稳定的 onProviderChange 函数，以避免无限循环
  const onProviderChangeRef = useRef(onProviderChange);
  useEffect(() => {
    onProviderChangeRef.current = onProviderChange;
  });

  const handleSelectProvider = useCallback((provider: AIProvider) => {
    onProviderChangeRef.current(provider);
    setIsOpen(false);
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      const rect = buttonRef.current!.getBoundingClientRect();
      const menu = (
        <div
          data-pg-menu-id="provider-switcher"
          className="fixed w-56 rounded-md shadow-lg bg-neutral-800 ring-1 ring-neutral-700 ring-opacity-5 focus:outline-none z-[9999]"
          style={{
            top: `${rect.top - 10}px`,
            left: `${rect.left + rect.width / 2}px`,
            transform: 'translateX(-50%) translateY(-100%)',
          }}
        >
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {availableProviders.map((provider) => (
              <button
                key={provider}
                className={`relative w-full text-left block px-4 py-2 text-sm ${
                  provider === currentProvider
                    ? 'bg-neutral-700 text-white'
                    : 'text-neutral-300 hover:bg-neutral-700 hover:text-white'
                }`}
                role="menuitem"
                onClick={() => handleSelectProvider(provider)}
              >
                {provider}
                {provider === currentProvider && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      );
      onMenuChange(menu);
    } else {
      onMenuChange(null);
    }
    // `onMenuChange` 是一个稳定的 setState 函数, `handleSelectProvider` 已被 useCallback 稳定
    // `onProviderChange` 是不稳定的, 但已通过 ref 处理
  }, [isOpen, currentProvider, availableProviders, onMenuChange, handleSelectProvider]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        isOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        !target.closest('[data-pg-menu-id="provider-switcher"]')
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <button
      ref={buttonRef}
      onClick={() => setIsOpen(!isOpen)}
      type="button"
      className="el-ai-input-button cursor-pointer"
    >
      <Brain size={22} />
    </button>
  );
}

