# backend/app/services/advanced_legal_ai.py

import os
import openai
from datetime import datetime
from app.config.database import get_database
from bson import ObjectId
import re
import json
from app.services.ai_processor import safe_openai_call, format_openai_response

db = get_database()

class AdvancedLegalAnalysis:
    """Advanced legal analysis capabilities"""
    
    def __init__(self):
        self.openai_api_key = os.environ.get('OPENAI_API_KEY', 'your-api-key-here')
        self.model = "gpt-3.5-turbo"
    
    def assess_contract_risks(self, document_id):
        """Identify potential legal risks in a contract"""
        document = db.documents.find_one({"_id": ObjectId(document_id)})
        if not document or "extracted_text" not in document:
            return {"error": "Document not found or text extraction failed"}
        
        # Get document text
        contract_text = document.get("extracted_text", "")
        
        # Truncate if needed
        if len(contract_text) > 15000:
            contract_text = contract_text[:15000] + "..."
        
        # Define the prompt for risk assessment
        prompt = f"""Analyze the following contract for legal risks. Identify:
1. Ambiguous clauses that could lead to disputes
2. Missing protections or safeguards
3. Potentially unfavorable terms
4. Compliance issues with standard regulations
5. Liability exposure issues

Provide a risk score from 1-10 for each identified issue, where 10 is extremely high risk.

CONTRACT TEXT:
{contract_text}

Format your response as JSON with these sections:
1. "risk_summary": A brief executive summary of overall risk assessment
2. "risk_score": An overall risk score from 1-10
3. "identified_risks": Array of objects with "clause", "issue", "recommendation", and "risk_score"
4. "missing_elements": Array of standard elements that appear to be missing
"""
        
        # Get AI analysis
        default_response = {
            "risk_summary": "Unable to complete risk assessment",
            "risk_score": 5,
            "identified_risks": [],
            "missing_elements": []
        }
        
        response = safe_openai_call(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a specialized legal AI with expertise in contract analysis and risk assessment."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            expected_format='json',
            default_result=default_response
        )
        
        # Save results to database
        db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {
                "risk_assessment": response,
                "risk_assessment_date": datetime.utcnow()
            }}
        )
        
        return response
    
    def recommend_clause_improvements(self, document_id, clause_text=None):
        """Suggest improvements for contract clauses"""
        document = db.documents.find_one({"_id": ObjectId(document_id)})
        if not document:
            return {"error": "Document not found"}
            
        # If specific clause provided, analyze just that
        if clause_text:
            text_to_analyze = clause_text
        elif "extracted_text" in document:
            # Otherwise use whole document (truncated if needed)
            text_to_analyze = document.get("extracted_text", "")
            if len(text_to_analyze) > 10000:
                text_to_analyze = text_to_analyze[:10000] + "..."
        else:
            return {"error": "No text found for analysis"}
        
        # Define the prompt for clause improvement
        prompt = f"""Analyze the following contract text and suggest improvements:

CONTRACT TEXT:
{text_to_analyze}

For each clause or section, provide:
1. Identified issues or weaknesses
2. Suggested improvements for clarity, protection, and enforceability
3. Alternative language that would improve the clause

Format your response as JSON with these sections:
1. "improvement_summary": A brief summary of improvement opportunities
2. "clause_improvements": Array of objects with "original_text", "issues", "suggestions", and "improved_text"
"""
        
        # Default response in case of failure
        default_response = {
            "improvement_summary": "Unable to generate clause improvements",
            "clause_improvements": []
        }
        
        # Get AI analysis
        response = safe_openai_call(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a specialized legal AI with expertise in contract drafting and improvement."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            expected_format='json',
            default_result=default_response
        )
        
        # If analyzing a specific clause, no need to save to DB
        if clause_text:
            return response
            
        # Save results to database
        db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {
                "clause_improvements": response,
                "clause_analysis_date": datetime.utcnow()
            }}
        )
        
        return response
    
    def find_similar_precedents(self, document_id, query=None):
        """Find similar legal precedents based on document content"""
        document = db.documents.find_one({"_id": ObjectId(document_id)})
        if not document:
            return {"error": "Document not found"}
            
        # Extract document text or use query
        if query:
            search_text = query
        elif "extracted_text" in document:
            search_text = document.get("extracted_text", "")
            # Only use first portion for precedent matching
            search_text = search_text[:5000]
        else:
            return {"error": "No text found for precedent matching"}
        
        # Define the prompt for precedent matching
        prompt = f"""Based on the following legal text, identify:
1. The key legal issues involved
2. Potentially relevant legal precedents (court cases)
3. Statutes or regulations that likely apply

LEGAL TEXT:
{search_text}

Format your response as JSON with these sections:
1. "legal_issues": Array of identified legal issues
2. "relevant_precedents": Array of objects with "case_name", "jurisdiction", "year", "summary", and "relevance"
3. "applicable_statutes": Array of objects with "name", "jurisdiction", and "relevance"
"""
        
        # Default response in case of failure
        default_response = {
            "legal_issues": ["Unable to identify legal issues"],
            "relevant_precedents": [],
            "applicable_statutes": []
        }
        
        # Get AI analysis
        response = safe_openai_call(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a specialized legal AI with expertise in case law and legal precedents."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            expected_format='json',
            default_result=default_response
        )
        
        # If using a custom query, no need to save to DB
        if query:
            return response
            
        # Save results to database
        db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {
                "precedent_matches": response,
                "precedent_match_date": datetime.utcnow()
            }}
        )
        
        return response
    
    def check_compliance(self, document_id, jurisdiction=None, regulation_type=None):
        """Check contract for compliance with regulations"""
        document = db.documents.find_one({"_id": ObjectId(document_id)})
        if not document or "extracted_text" not in document:
            return {"error": "Document not found or text extraction failed"}
        
        # Get document text
        contract_text = document.get("extracted_text", "")
        
        # Truncate if needed
        if len(contract_text) > 12000:
            contract_text = contract_text[:12000] + "..."
        
        # Build prompt based on inputs
        jurisdiction_text = f"Jurisdiction: {jurisdiction}" if jurisdiction else "Identify the likely jurisdiction"
        regulation_text = f"Regulation type: {regulation_type}" if regulation_type else "All relevant regulations"
        
        prompt = f"""Check the following contract for compliance with regulations.
{jurisdiction_text}
{regulation_text}

CONTRACT TEXT:
{contract_text}

Provide a compliance analysis with:
1. Identified jurisdiction(s) the contract appears to cover
2. Applicable regulations and compliance status
3. Potential compliance issues and required modifications
4. Regulatory disclosure or filing requirements

Format your response as JSON with these sections:
1. "compliance_summary": A brief overview of compliance status
2. "jurisdiction": Identified or specified jurisdiction
3. "regulations": Array of objects with "name", "compliance_status" (boolean), and "issues"
4. "required_actions": Array of actions needed for compliance
"""
        
        # Default response in case of failure
        default_response = {
            "compliance_summary": "Unable to complete compliance analysis",
            "jurisdiction": jurisdiction if jurisdiction else "Unknown",
            "regulations": [],
            "required_actions": []
        }
        
        # Get AI analysis
        response = safe_openai_call(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a specialized legal AI with expertise in regulatory compliance."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1500,
            expected_format='json',
            default_result=default_response
        )
        
        # Save results to database
        db.documents.update_one(
            {"_id": ObjectId(document_id)},
            {"$set": {
                "compliance_check": response,
                "compliance_check_date": datetime.utcnow(),
                "compliance_jurisdiction": jurisdiction,
                "compliance_regulation_type": regulation_type
            }}
        )
        
        return response