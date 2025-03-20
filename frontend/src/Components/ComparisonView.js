import React from 'react';
import './ComparisonView.css';

function ComparisonView({ result }) {
  return (
    <div className="comparison-view">
      <h3>Comparison Result</h3>
      <p>Similarity Score: {result.similarity_score}%</p>
      <div className="diff-container">
        {result.diff.map((line, index) => (
          <div key={index} className={`diff-line ${line.startsWith('+') ? 'diff-line-added' : line.startsWith('-') ? 'diff-line-removed' : ''}`}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ComparisonView;