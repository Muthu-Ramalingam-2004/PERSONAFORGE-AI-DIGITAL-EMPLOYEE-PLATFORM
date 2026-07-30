import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Check localStorage or fallback to default 'dark' theme
  const [theme, setThemeState] = useState(() => {
    const savedTheme = localStorage.getItem('pf_theme');
    return savedTheme || 'dark';
  });

  const setTheme = (newTheme) => {
    const validThemes = ['light', 'dark', 'ocean', 'nature'];
    if (validThemes.includes(newTheme)) {
      setThemeState(newTheme);
      localStorage.setItem('pf_theme', newTheme);
    }
  };

  // Sync theme with HTML document data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // Maintain standard dark class for tailwind dark: selectors if needed
    if (theme === 'dark' || theme === 'ocean' || theme === 'nature') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
