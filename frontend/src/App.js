import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import MainPage from './pages/MainPage';
import './App.css';

/**
 * Main App component for WhatsApp Reply Assistant
 * 
 * Architecture:
 * - React Router for navigation (single page for now, ready for expansion)
 * - Global context for state management
 * - WebSocket connection for real-time updates with n8n workflows
 */
function App() {
  return (
    <AppProvider>
      <div className="App">
        <Router>
          <header className="App-header">
            <h1>📱 WhatsApp Reply Assistant</h1>
            <p className="App-tagline">AI-powered response suggestions for your WhatsApp business</p>
          </header>
          
          <main className="App-main">
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="*" element={
                <div className="not-found">
                  <h2>Page Not Found</h2>
                  <p>This is a single-page application for WhatsApp message assistance.</p>
                </div>
              } />
            </Routes>
          </main>
          
          <footer className="App-footer">
            <p>Powered by n8n workflows • ChromaDB • Real-time WebSockets</p>
          </footer>
        </Router>
      </div>
    </AppProvider>
  );
}

export default App;