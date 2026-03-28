import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LS_THEME, loadFromLocalStorage } from './localStorage';
import './style.css';

// Initialize theme from localStorage before React renders
const savedTheme = loadFromLocalStorage(LS_THEME);
if (savedTheme === 'dark' || savedTheme === 'light') {
  document.documentElement.setAttribute('data-theme', savedTheme);
} else if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
  document.documentElement.setAttribute('data-theme', 'dark');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
