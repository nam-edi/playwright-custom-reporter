import React from 'react';

// Composant simplifié qui ne fait que wrapper les children
// Le thème sombre est maintenant le thème par défaut unique
interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return <>{children}</>;
};

// Composant vide pour remplacer le ThemeToggle
export const ThemeToggle: React.FC = () => {
  return null;
};