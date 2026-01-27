import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Removed React.StrictMode to prevent double-initialization of MediaPipe/TFJS models 
// which causes race conditions and memory access errors (like "Cannot read properties of undefined").
root.render(
    <App />
);