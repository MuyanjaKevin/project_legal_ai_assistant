import React from 'react';

const ComparisonView = ({ result }) => {
  return (
    <div className="comparison-result">
      <h3>Comparison Results</h3>
      <div className="result-content">
        {/* Render your comparison results here */}
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </div>
    </div>
  );
};

export default ComparisonView;