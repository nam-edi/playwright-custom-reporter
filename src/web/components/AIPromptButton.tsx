import React, { useState } from 'react';

interface AIPromptButtonProps {
  prompt: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AIPromptButton: React.FC<AIPromptButtonProps> = ({ 
  prompt, 
  className = '', 
  style = {} 
}) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setError(false);
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError(true);
      setTimeout(() => {
        setError(false);
      }, 3000);
    }
  };

  return (
    <button
      className={`ai-prompt-button ${className}`}
      style={{
        minWidth: '100px',
        padding: '8px 16px',
        backgroundColor: error ? '#dc2626' : (copied ? '#059669' : '#2563eb'),
        color: 'white',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        ...style
      }}
      onClick={handleCopy}
      disabled={copied || error}
    >
      {error ? (
        <>
          <span>❌</span>
          <span>Error</span>
        </>
      ) : copied ? (
        <>
          <span>✅</span>
          <span>Copied</span>
        </>
      ) : (
        <>
          <span>🤖</span>
          <span>Copy AI Prompt</span>
        </>
      )}
    </button>
  );
};