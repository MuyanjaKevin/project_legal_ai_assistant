import os
import openai
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime

# Initialize OpenAI API
openai.api_key = os.environ.get('OPENAI_API_KEY', 'your-api-key-here')

# Track API usage for cost monitoring
api_usage_log = []

def count_tokens(text):
    """Estimate token count - approximately 4 chars per token for English text"""
    return len(text) // 4

def estimate_cost(input_tokens, output_tokens, model="gpt-3.5-turbo"):
    """Estimate cost in USD based on current OpenAI pricing"""
    if model == "gpt-3.5-turbo":
        input_cost = (input_tokens / 1000) * 0.0015
        output_cost = (output_tokens / 1000) * 0.002
    else:  # Default to GPT-4 pricing
        input_cost = (input_tokens / 1000) * 0.03
        output_cost = (output_tokens / 1000) * 0.06
        
    return input_cost + output_cost

def summarize_document(document_id):
    """Generate a summary of a document using OpenAI's API"""
    db = get_database()
    
    # Check if document has already been summarized
    document = db.documents.find_one({"_id": document_id})
    if not document:
        return None
        
    # Return existing summary if available
    if document.get("summarized") and document.get("summary"):
        print("Using cached summary - no API call needed")
        return document["summary"]
        
    # Check if text has been extracted
    if "extracted_text" not in document:
        return "Text extraction needed before summarization"
    
    extracted_text = document["extracted_text"]
    
    # Limit input tokens to control costs - 2000 tokens is ~1500 words
    max_input_tokens = 2000
    input_char_limit = max_input_tokens * 4
    
    # Get important parts of the document
    # For legal docs: beginning (parties, dates) and keywords sections are most important
    beginning = extracted_text[:input_char_limit // 2]
    
    # Expanded list with more synonyms and related terms
    keywords = [
        # General contract terms
        "obligations", "responsibilities", "duties", "shall", "must", "requirements",
        "terms", "conditions", "provisions", "clauses",
        
        # Confidentiality and IP
        "confidential", "proprietary", "secret", "privacy", "disclosure",
        "intellectual property", "copyright", "patent", "trademark",
        
        # Term and termination
        "termination", "expiration", "duration", "term", "cancel", "renew",
        
        # Legal elements
        "agreement", "contract", "covenant", "warranty", "representation",
        "liability", "indemnity", "indemnification", "damages", "remedies",
        "breach", "default", "compliance", "force majeure",
        
        # Payment and compensation
        "payment", "compensation", "fee", "expense", "cost", "price", "tax",
        
        # Dispute resolution
        "dispute", "arbitration", "mediation", "jurisdiction", "governing law"
    ]
    
    # Look for important sections with keywords
    important_sections = ""
    remaining_chars = input_char_limit // 2
    
    # Extract paragraphs containing keywords
    paragraphs = extracted_text.split('\n\n')
    
    # Keep track of how many paragraphs we've found with keywords
    paragraphs_found = 0
    
    for para in paragraphs:
        if remaining_chars <= 0:
            break
            
        if any(keyword.lower() in para.lower() for keyword in keywords):
            if len(para) <= remaining_chars:
                important_sections += para + "\n\n"
                remaining_chars -= len(para) + 2
                paragraphs_found += 1
    
    # Fallback: If we didn't find enough paragraphs with keywords,
    # include evenly spaced sections from the document
    if paragraphs_found < 3 and len(paragraphs) > 5:
        # Calculate how many additional paragraphs to include
        paragraphs_to_add = min(5, len(paragraphs)) - paragraphs_found
        if paragraphs_to_add > 0:
            # Select paragraphs at regular intervals through the document
            step = len(paragraphs) // (paragraphs_to_add + 1)
            for i in range(step, len(paragraphs), step):
                if remaining_chars <= 0 or paragraphs_to_add <= 0:
                    break
                    
                para = paragraphs[i]
                if len(para) <= remaining_chars:
                    important_sections += para + "\n\n"
                    remaining_chars -= len(para) + 2
                    paragraphs_to_add -= 1
    
    # Combine beginning and important sections
    trimmed_text = beginning + "\n\n" + important_sections
    
    # Estimate token usage and cost
    estimated_input_tokens = count_tokens(trimmed_text)
    estimated_output_tokens = 500  # Limit output tokens
    estimated_cost = estimate_cost(estimated_input_tokens, estimated_output_tokens)
    
    print(f"Document: {document.get('name', 'Unknown')}")
    print(f"Estimated API call cost: ${estimated_cost:.4f}")
    print(f"Input tokens (est): {estimated_input_tokens}, Output tokens (limit): {estimated_output_tokens}")
    
    try:
        # Call OpenAI API with controlled output tokens
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",  # Use cheaper model
            messages=[
                {"role": "system", "content": "You are a legal assistant that creates concise summaries. Focus only on identifying: 1) parties involved, 2) key dates, 3) main obligations, 4) termination conditions."},
                {"role": "user", "content": f"Summarize only the most important details from this legal document:\n\n{trimmed_text}"}
            ],
            max_tokens=500  # Limit output tokens
        )
        
        # Get summary from response
        summary = response.choices[0].message.content
        
        # Log usage for tracking
        actual_usage = response.usage
        actual_cost = estimate_cost(actual_usage.prompt_tokens, actual_usage.completion_tokens)
        
        usage_entry = {
            "document_id": str(document_id),
            "document_name": document.get("name", "Unknown"),
            "operation": "summarize",
            "timestamp": datetime.now().isoformat(),
            "prompt_tokens": actual_usage.prompt_tokens,
            "completion_tokens": actual_usage.completion_tokens,
            "total_tokens": actual_usage.total_tokens,
            "estimated_cost": estimated_cost,
            "actual_cost": actual_cost
        }
        api_usage_log.append(usage_entry)
        
        print(f"Actual API call cost: ${actual_cost:.4f}")
        print(f"Total estimated API usage cost: ${sum(entry['actual_cost'] for entry in api_usage_log):.4f}")
        
        # Update document with summary
        db.documents.update_one(
            {"_id": document_id},
            {"$set": {
                "summary": summary, 
                "summarized": True,
                "api_usage": {
                    "prompt_tokens": actual_usage.prompt_tokens,
                    "completion_tokens": actual_usage.completion_tokens,
                    "total_tokens": actual_usage.total_tokens,
                    "cost": actual_cost
                }
            }}
        )
        
        return summary
    except Exception as e:
        print(f"Error summarizing document: {e}")
        return None

def extract_key_info(document_id):
    """Extract key information from document using OpenAI's API"""
    db = get_database()
    
    # Check if key info has already been extracted
    document = db.documents.find_one({"_id": document_id})
    if not document:
        return None
        
    # Return existing key info if available
    if document.get("info_extracted") and document.get("key_info"):
        print("Using cached key info - no API call needed")
        return document["key_info"]
    
    # Check if text has been extracted
    if "extracted_text" not in document:
        return "Text extraction needed before key info extraction"
    
    extracted_text = document["extracted_text"]
    
    # Limit input tokens to control costs
    max_input_tokens = 2000
    input_char_limit = max_input_tokens * 4
    
    # For legal documents, focus on sections with key information
    # Expanded list of important terms to look for
    important_terms = [
        # Parties and identification
        "parties:", "between:", "agreement between", "this agreement", 
        
        # Dates and timing
        "effective date:", "date of this agreement", "commencement date:",
        "term:", "duration:", "period of", 
        
        # Termination
        "termination:", "terminate:", "expiration:", "cancellation:",
        
        # Payment and financial
        "payment:", "fee:", "compensation:", "consideration:", "price:",
        "amount:", "cost:", "expense:", "invoice:", "billing:",
        
        # Confidentiality
        "confidentiality:", "confidential information:", "non-disclosure:",
        "proprietary information:", "trade secret:",
        
        # Liability
        "liability:", "limitation of liability:", "indemnification:", 
        "indemnity:", "hold harmless:", "warranty:", "representation:",
        
        # Governing law
        "governing law:", "jurisdiction:", "venue:", "applicable law:",
        "dispute resolution:", "arbitration:", "mediation:"
    ]
    
    # First, get the beginning of the document (usually contains parties)
    intro_limit = min(input_char_limit // 4, len(extracted_text))
    key_sections = extracted_text[:intro_limit]
    remaining_chars = input_char_limit - intro_limit
    
    # Split into paragraphs for analysis
    paragraphs = extracted_text.split('\n\n')
    
    # Keep track of how many important paragraphs we've found
    sections_found = 0
    
    # Then find paragraphs with important terms
    for para in paragraphs:
        if remaining_chars <= 0:
            break
            
        lower_para = para.lower()
        if any(term.lower() in lower_para for term in important_terms):
            if len(para) <= remaining_chars:
                key_sections += "\n\n" + para
                remaining_chars -= len(para) + 2
                sections_found += 1
    
    # Fallback: If we didn't find enough sections with important terms,
    # include sections at regular intervals
    if sections_found < 5 and len(paragraphs) > 10:
        # Calculate how many additional paragraphs to include
        sections_to_add = min(5, len(paragraphs) // 2) - sections_found
        if sections_to_add > 0:
            # Choose paragraphs at regular intervals
            interval = len(paragraphs) // (sections_to_add + 1)
            for i in range(interval, len(paragraphs), interval):
                if remaining_chars <= 0 or sections_to_add <= 0:
                    break
                
                para = paragraphs[i]
                if len(para) <= remaining_chars:
                    key_sections += "\n\n" + para
                    remaining_chars -= len(para) + 2
                    sections_to_add -= 1
    
    # Estimate token usage and cost
    estimated_input_tokens = count_tokens(key_sections)
    estimated_output_tokens = 500  # Limit output tokens
    estimated_cost = estimate_cost(estimated_input_tokens, estimated_output_tokens)
    
    print(f"Document: {document.get('name', 'Unknown')}")
    print(f"Estimated API call cost: ${estimated_cost:.4f}")
    print(f"Input tokens (est): {estimated_input_tokens}, Output tokens (limit): {estimated_output_tokens}")
    
    try:
        # Call OpenAI API
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",  # Use cheaper model
            messages=[
                {"role": "system", "content": "You are a legal assistant that extracts specific key information only. Extract only: parties, dates, governing law, and payment terms if present."},
                {"role": "user", "content": f"Extract only the following key information from this legal document in JSON format. If information is not found, indicate 'Not specified':\n1. Parties\n2. Effective Date\n3. Term/Duration\n4. Governing Law\n5. Key Payment Terms\n\nDocument:\n{key_sections}"}
            ],
            max_tokens=500  # Limit output tokens
        )
        
        # Get key info from response
        key_info = response.choices[0].message.content
        
        # Log usage for tracking
        actual_usage = response.usage
        actual_cost = estimate_cost(actual_usage.prompt_tokens, actual_usage.completion_tokens)
        
        usage_entry = {
            "document_id": str(document_id),
            "document_name": document.get("name", "Unknown"),
            "operation": "extract_key_info",
            "timestamp": datetime.now().isoformat(),
            "prompt_tokens": actual_usage.prompt_tokens,
            "completion_tokens": actual_usage.completion_tokens,
            "total_tokens": actual_usage.total_tokens,
            "estimated_cost": estimated_cost,
            "actual_cost": actual_cost
        }
        api_usage_log.append(usage_entry)
        
        print(f"Actual API call cost: ${actual_cost:.4f}")
        print(f"Total estimated API usage cost: ${sum(entry['actual_cost'] for entry in api_usage_log):.4f}")
        
        # Update document with key info
        db.documents.update_one(
            {"_id": document_id},
            {"$set": {
                "key_info": key_info, 
                "info_extracted": True,
                "api_usage": {
                    "prompt_tokens": actual_usage.prompt_tokens,
                    "completion_tokens": actual_usage.completion_tokens,
                    "total_tokens": actual_usage.total_tokens,
                    "cost": actual_cost
                }
            }}
        )
        
        return key_info
    except Exception as e:
        print(f"Error extracting key info: {e}")
        return None
    
def suggest_document_category(document_id):
    """Suggest a document category based on content analysis"""
    db = get_database()
    
    # Check if document exists
    document = db.documents.find_one({"_id": document_id})
    if not document:
        return None
        
    # Check if text has been extracted
    if "extracted_text" not in document:
        return "Text extraction needed before categorization"
    
    extracted_text = document["extracted_text"]
    
    # Limit input tokens to control costs
    max_input_tokens = 1500
    input_char_limit = max_input_tokens * 4
    
    # Get important parts of the document
    # Beginning often contains the document type/title
    beginning = extracted_text[:input_char_limit]
    
    # Estimate token usage and cost
    estimated_input_tokens = count_tokens(beginning)
    estimated_output_tokens = 10  # We only need a short response
    estimated_cost = estimate_cost(estimated_input_tokens, estimated_output_tokens)
    
    print(f"Document: {document.get('name', 'Unknown')}")
    print(f"Estimated API call cost: ${estimated_cost:.4f}")
    print(f"Input tokens (est): {estimated_input_tokens}, Output tokens (limit): {estimated_output_tokens}")
    
    try:
        # Call OpenAI API with controlled output tokens
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",  # Use cheaper model
            messages=[
                {"role": "system", "content": "You are a legal document classifier. Analyze the text and determine the document type from these categories only: 'NDA', 'Contract', 'Agreement', 'Employment', 'Legal Brief', 'Terms of Service', 'Privacy Policy', 'License', or 'Other'."},
                {"role": "user", "content": f"Based on the following document text, classify it into one of these categories: NDA, Contract, Agreement, Employment, Legal Brief, Terms of Service, Privacy Policy, License, or Other. Return only the category name.\n\n{beginning}"}
            ],
            max_tokens=10  # Limit output tokens
        )
        
        # Get category from response
        suggested_category = response.choices[0].message.content.strip()
        
        # Normalize the category
        suggested_category = suggested_category.strip('".,;:').strip()
        if suggested_category.lower() == "nda" or "non-disclosure" in suggested_category.lower():
            suggested_category = "NDA"
        elif "privacy" in suggested_category.lower():
            suggested_category = "Privacy Policy"
        elif "service" in suggested_category.lower() or "tos" in suggested_category.lower():
            suggested_category = "Terms of Service"
        elif "employment" in suggested_category.lower():
            suggested_category = "Employment"
        elif "license" in suggested_category.lower():
            suggested_category = "License"
        elif "contract" in suggested_category.lower():
            suggested_category = "Contract"
        elif "agreement" in suggested_category.lower():
            suggested_category = "Agreement"
        elif "brief" in suggested_category.lower() or "legal brief" in suggested_category.lower():
            suggested_category = "Legal Brief"
        else:
            suggested_category = "Other"
        
        # Log usage for tracking
        actual_usage = response.usage
        actual_cost = estimate_cost(actual_usage.prompt_tokens, actual_usage.completion_tokens)
        
        usage_entry = {
            "document_id": str(document_id),
            "document_name": document.get("name", "Unknown"),
            "operation": "categorize",
            "timestamp": datetime.now().isoformat(),
            "prompt_tokens": actual_usage.prompt_tokens,
            "completion_tokens": actual_usage.completion_tokens,
            "total_tokens": actual_usage.total_tokens,
            "estimated_cost": estimated_cost,
            "actual_cost": actual_cost
        }
        api_usage_log.append(usage_entry)
        
        print(f"Actual API call cost: ${actual_cost:.4f}")
        print(f"Suggested category: {suggested_category}")
        
        return suggested_category
    except Exception as e:
        print(f"Error suggesting category: {e}")
        return "Other"