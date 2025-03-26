import React, { useState } from 'react';
import './ComparisonView.css';

const ComparisonView = ({ result }) => {
  const [viewMode, setViewMode] = useState('summary');
  
  // Helper function to format the comparison result
  const formatDiffLine = (line) => {
    if (line.startsWith('+')) {
      return <span className="added-line">{line}</span>;
    } else if (line.startsWith('-')) {
      return <span className="removed-line">{line}</span>;
    } else if (line.startsWith('?')) {
      return <span className="modified-line">{line}</span>;
    } else {
      return <span className="unchanged-line">{line}</span>;
    }
  };

  if (!result || !result.comparison) {
    return (
      <div className="comparison-result">
        <h3>Comparison Results</h3>
        <div className="no-results">No comparison data available</div>
      </div>
    );
  }

  const { similarity_score, summary, diff } = result.comparison;

  return (
    <div className="comparison-result">
      <h3>Comparison Results</h3>
      
      <div className="view-controls">
        <button 
          className={`view-tab ${viewMode === 'summary' ? 'active' : ''}`}
          onClick={() => setViewMode('summary')}
        >
          Summary
        </button>
        <button 
          className={`view-tab ${viewMode === 'diff' ? 'active' : ''}`}
          onClick={() => setViewMode('diff')}
        >
          Detailed Diff
        </button>
        <button 
          className={`view-tab ${viewMode === 'raw' ? 'active' : ''}`}
          onClick={() => setViewMode('raw')}
        >
          Raw Data
        </button>
      </div>
      
      <div className="result-content">
        {viewMode === 'summary' && (
          <div className="summary-view">
            <div className="similarity-score">
              <div className="score-label">Similarity Score:</div>
              <div className="score-value">{similarity_score}%</div>
              <div 
                className="score-bar" 
                style={{ 
                  '--similarity': `${similarity_score}%`,
                  '--color': similarity_score > 80 
                    ? '#22c55e' 
                    : similarity_score > 50 
                      ? '#f59e0b' 
                      : '#ef4444'
                }}
              ></div>
            </div>
            
            <div className="changes-summary">
              <div className="change-stat">
                <div className="stat-label added">Added Lines:</div>
                <div className="stat-value">{summary.added_lines}</div>
              </div>
              <div className="change-stat">
                <div className="stat-label removed">Removed Lines:</div>
                <div className="stat-value">{summary.removed_lines}</div>
              </div>
              <div className="change-stat">
                <div className="stat-label modified">Modified Lines:</div>
                <div className="stat-value">{summary.modified_lines}</div>
              </div>
            </div>
            
            <div className="summary-interpretation">
              <h4>Interpretation</h4>
              <p>
                {similarity_score > 90 
                  ? 'The documents are nearly identical, with only minor differences.' 
                  : similarity_score > 70 
                    ? 'The documents have significant similarities with some notable differences.' 
                    : similarity_score > 40 
                      ? 'The documents share some content but have substantial differences.' 
                      : 'The documents are considerably different from each other.'}
              </p>
            </div>
          </div>
        )}
        
        {viewMode === 'diff' && (
          <div className="diff-view">
            <div className="diff-legend">
              <span className="legend-item">
                <span className="added-marker">+</span> Added content
              </span>
              <span className="legend-item">
                <span className="removed-marker">-</span> Removed content
              </span>
              <span className="legend-item">
                <span className="modified-marker">?</span> Modified content
              </span>
            </div>
            
            <div className="diff-content">
              {diff && diff.map((line, index) => (
                <div key={index} className="diff-line">
                  {formatDiffLine(line)}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {viewMode === 'raw' && (
          <div className="raw-view">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ComparisonView;