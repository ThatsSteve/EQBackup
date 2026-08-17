import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SearchableCombobox
 * Componente UI/UX Reattivo e Mobile-First per la selezione hardware con autocompletamento e filtraggio dinamico.
 * Sostituisce i classici menu <select> con supporto completo a tastiera (Frecce/Invio/Esc) e Touch/Mobile.
 */
export default function SearchableCombobox({
  options = [],
  value = '',
  onChange,
  placeholder = 'Cerca o seleziona...',
  disabled = false,
  className = '',
  style = {},
  allowCustomInput = false,
  error = false,
  enableOnlineResolve = false,
  onResolveOnline = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Normalizza le opzioni in array di oggetti { label, value }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    return opt; // { label, value }
  });

  // Trova l'etichetta visualizzata in base al valore corrente
  const currentSelectedObj = normalizedOptions.find(o => o.value === value);
  const displayLabel = currentSelectedObj ? currentSelectedObj.label : value;

  // Sincronizza il searchTerm quando il valore esterno cambia (e il dropdown è chiuso)
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(displayLabel || '');
    }
  }, [value, displayLabel, isOpen]);

  // Gestione clic esterno e touch per chiudere la tendina
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm(displayLabel || '');
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [displayLabel]);

  // Filtro dinamico in tempo reale
  const filteredOptions = normalizedOptions.filter(opt => {
    if (!searchTerm || searchTerm === displayLabel) return true; // Se corrisponde alla selezione corrente, mostra tutto
    return opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
           opt.value.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSelect = (optValue, optLabel) => {
    if (optValue === '__ONLINE_RESOLVE__') {
      if (onResolveOnline) {
        onResolveOnline(searchTerm);
      }
      setSearchTerm(searchTerm);
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }

    setSearchTerm(optLabel);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (onChange) {
      onChange(optValue);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setIsOpen(true);
    setHighlightedIndex(0);
    // Se digitazione libera è permessa e il valore viene azzerato o modificato, possiamo notificare o attendere Invio/selezione
    if (!val && onChange) {
      onChange('');
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const selected = filteredOptions[highlightedIndex];
        handleSelect(selected.value, selected.label);
      } else if (allowCustomInput && searchTerm.trim()) {
        // Consenti inserimento libero se nessun suggerimento è evidenziato
        handleSelect(searchTerm.trim(), searchTerm.trim());
      } else if (filteredOptions.length === 1 && !enableOnlineResolve) {
        // Se c'è 1 solo risultato filtrato, selezionalo con Invio!
        const single = filteredOptions[0];
        handleSelect(single.value, single.label);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm(displayLabel || '');
    }
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    setSearchTerm('');
    setIsOpen(false);
    if (onChange) onChange('');
  };

  const borderStyle = error
    ? { borderColor: '#ff4757', boxShadow: '0 0 10px rgba(255,71,87,0.5)' }
    : isOpen
    ? { borderColor: '#00f0ff', boxShadow: '0 0 12px rgba(0,240,255,0.4)' }
    : {};

  return (
    <div 
      ref={containerRef} 
      className={`searchable-combobox-container ${className}`} 
      style={{ position: 'relative', width: '100%', ...style }}
    >
      <div 
        className="combobox-input-wrapper"
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#13131f',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          padding: '0 12px',
          transition: 'all 0.2s ease',
          height: '42px',
          cursor: disabled ? 'not-allowed' : 'text',
          ...borderStyle
        }}
        onClick={(e) => {
          if (!disabled) {
            setIsOpen(true);
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }
        }}
      >
        <Search size={16} color="#00f0ff" style={{ marginRight: '8px', flexShrink: 0, opacity: 0.8 }} />
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={placeholder}
          value={isOpen ? searchTerm : (displayLabel || '')}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            width: '100%',
            fontSize: '14px',
            fontFamily: 'inherit',
            textOverflow: 'ellipsis'
          }}
        />
        {value && !disabled && (
          <X 
            size={16} 
            color="#888" 
            style={{ cursor: 'pointer', marginLeft: '6px', flexShrink: 0, transition: 'color 0.2s' }} 
            onClick={clearSelection}
            onMouseEnter={e => e.currentTarget.style.color = '#ff4757'}
            onMouseLeave={e => e.currentTarget.style.color = '#888'}
          />
        )}
        <ChevronDown 
          size={18} 
          color="#aaa" 
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) {
              setIsOpen(!isOpen);
              if (!isOpen && inputRef.current) {
                inputRef.current.focus();
              }
            }
          }}
          style={{ 
            marginLeft: '6px', 
            flexShrink: 0, 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
            transition: 'transform 0.2s ease',
            cursor: 'pointer' 
          }} 
        />
      </div>

      {/* TENDINA FLOTTANTE SUGGERIMENTI */}
      {isOpen && !disabled && (
        <ul 
          className="combobox-dropdown-list"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 99999,
            maxHeight: '240px',
            overflowY: 'auto',
            background: '#161625',
            border: '1px solid #00f0ff',
            borderRadius: '8px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.85), 0 0 15px rgba(0, 240, 255, 0.15)',
            padding: '6px 0',
            margin: 0,
            listStyle: 'none',
            backdropFilter: 'blur(10px)'
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, index) => {
              const isHighlighted = index === highlightedIndex;
              const isSelected = opt.value === value;
              return (
                <li
                  key={`${opt.value}-${index}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt.value, opt.label);
                  }}
                  onClick={() => handleSelect(opt.value, opt.label)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: isSelected ? '#00f0ff' : '#fff',
                    background: isHighlighted ? 'rgba(0, 240, 255, 0.15)' : isSelected ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: isSelected ? '600' : '400',
                    borderLeft: isHighlighted ? '3px solid #00f0ff' : '3px solid transparent'
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {opt.label}
                  </span>
                  {isSelected && <span style={{ fontSize: '11px', background: 'rgba(0, 240, 255, 0.2)', padding: '2px 6px', borderRadius: '4px', color: '#00f0ff', marginLeft: '8px' }}>Selezionato</span>}
                </li>
              );
            })
          ) : null}
          
          {enableOnlineResolve && searchTerm && !normalizedOptions.find(o => o.label.toLowerCase() === searchTerm.toLowerCase()) && (
            <li
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect('__ONLINE_RESOLVE__', searchTerm);
              }}
              style={{
                padding: '10px 14px',
                fontSize: '14px',
                color: '#fff',
                background: highlightedIndex === filteredOptions.length ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                borderLeft: highlightedIndex === filteredOptions.length ? '3px solid #00f0ff' : '3px solid transparent'
              }}
              onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
            >
              <span style={{ color: '#00f0ff', marginRight: '8px' }}>🌐</span> Cerca online "{searchTerm}"
            </li>
          )}
          
          {filteredOptions.length === 0 && !enableOnlineResolve && (
            <li style={{ padding: '12px 14px', color: '#888', fontSize: '14px', textAlign: 'center', fontStyle: 'italic' }}>
              {allowCustomInput ? `Nessuna corrispondenza. Premi Invio per usare "${searchTerm}"` : "Nessun risultato trovato"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
