import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import LiveTankSelector from './components/LiveTankSelector';
import './App.css';

function Navbar() {
  return (
    <nav style={{ padding: '1rem', background: '#282c34', color: 'white' }}>
      <Link to="/" style={{ marginRight: '1rem', color: 'white', textDecoration: 'none' }}>
        Dashboard
      </Link>
      <Link to="/live-tanks" style={{ color: 'white', textDecoration: 'none' }}>
        Live Tank Selector
      </Link>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/live-tanks" element={<LiveTankSelector />} />
      </Routes>
    </Router>
  );
}

export default App;
