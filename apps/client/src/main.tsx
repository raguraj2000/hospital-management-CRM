import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { applyTheme } from './state/theme.js';
import './styles/app.css';

// Applied before the first paint so there's no flash of the wrong theme.
applyTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
