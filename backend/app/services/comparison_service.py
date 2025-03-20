from difflib import SequenceMatcher
import difflib
from .document_processor import DocumentProcessor

class DocumentComparisonService:
    def __init__(self):
        self.document_processor = DocumentProcessor()

    def compare_documents(self, doc1_content, doc2_content):
        """Compare two documents and return differences"""
        
        # Extract and preprocess text
        text1 = self.document_processor.preprocess_text(
            self.document_processor.extract_text(doc1_content)
        )
        text2 = self.document_processor.preprocess_text(
            self.document_processor.extract_text(doc2_content)
        )
        
        # Generate diff
        differ = difflib.Differ()
        diff = list(differ.compare(text1.splitlines(), text2.splitlines()))
        
        # Calculate similarity ratio
        similarity = SequenceMatcher(None, text1, text2).ratio()
        
        return {
            'diff': diff,
            'similarity_score': round(similarity * 100, 2),
            'summary': self._generate_comparison_summary(diff)
        }

    def _generate_comparison_summary(self, diff):
        added = len([l for l in diff if l.startswith('+')])
        removed = len([l for l in diff if l.startswith('-')])
        modified = len([l for l in diff if l.startswith('?')])
        
        return {
            'added_lines': added,
            'removed_lines': removed,
            'modified_lines': modified
        }