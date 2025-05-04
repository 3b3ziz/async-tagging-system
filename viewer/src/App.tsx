import React, { useState } from 'react';
import './App.css';
import PostList from './components/PostList';
import GraphView from './components/GraphView';
import './components/PostList.css';
import './components/GraphView.css';

function App() {
  // Check if environment variable is set for initial tab
  const initialTab = process.env.REACT_APP_INITIAL_TAB === 'graph' ? 'graph' : 'posts';
  const [activeTab, setActiveTab] = useState<'posts' | 'graph'>(initialTab);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Tagging System Viewer</h1>
        <p>View posts and their automatically generated tags</p>
      </header>
      
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          Posts List
        </button>
        <button 
          className={`tab-button ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          Graph View
        </button>
      </div>
      
      <main>
        {activeTab === 'posts' ? <PostList /> : <GraphView />}
      </main>
      
      <footer>
        <p>Tagging System Demo - {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
