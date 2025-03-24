import os
import openai
from app.config.database import get_database
from bson import ObjectId
from datetime import datetime
import json
import re

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

def format_openai_response(response_text, expected_format='json'):
    """
    Enhanced formatter for OpenAI API responses
    
    Args:
        response_text (str): The raw response text from OpenAI
        expected_format (str): Expected format - 'json' or 'text'
        
    Returns:
        The formatted response (dict for json, str for text)
    """
    if expected_format == 'json':
        # First try to see if the entire response is valid JSON
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            pass
            
        # Try to extract JSON if it's embedded in other text (like markdown code blocks)
        json_patterns = [
            r'```json\n([\s\S]*?)\n```',  # JSON in markdown code block with json
            r'```\n([\s\S]*?)\n```',      # JSON in markdown code block without lang
            r'({[\s\S]*})',               # Any JSON-like object
        ]
        
        for pattern in json_patterns:
            json_match = re.search(pattern, response_text)
            if json_match:
                try:
                    json_text = json_match.group(1)
                    # Clean up common formatting issues
                    json_text = json_text.replace('```json', '').replace('```', '')
                    return json.loads(json_text)
                except json.JSONDecodeError:
                    continue
        
        # Last resort: try to build a structured response from raw text
        lines = response_text.strip().split('\n')
        structured_response = {}
        
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                structured_response[key.strip()] = value.strip()
                
        if structured_response:
            return structured_response
        else:
            # Return a fallback response
            return {
                "error": True,
                "message": "Could not parse response as JSON",
                "raw_response": response_text[:200] + "..." if len(response_text) > 200 else response_text
            }
    else:
        # For text format, clean up the response
        # Remove common markdown and code block artifacts
        text = re.sub(r'```[a-zA-Z]*\n', '', response_text)
        text = text.replace('```', '')
        return text.strip()

def safe_openai_call(model, messages, max_tokens=None, temperature=0.7, 
                    expected_format='json', default_result=None):
    """
    Makes a safe OpenAI API call with error handling
    
    Args:
        model (str): The model to use
        messages (list): The messages for the conversation
        max_tokens (int, optional): Maximum tokens for the response
        temperature (float): Temperature parameter for the model
        expected_format (str): Expected response format ('json' or 'text')
        default_result: Default result to return on failure
        
    Returns:
        The formatted API response or default_result on failure
    """
    import time
    
    # Set maximum retries
    max_retries = 3
    base_delay = 2  # seconds
    
    # Make sure API key is set
    if not openai.api_key:
        openai.api_key = os.environ.get('OPENAI_API_KEY', 'your-api-key-here')
    
    # Prepare parameters
    params = {
        "model": model,
        "messages": messages,
        "temperature": temperature
    }
    
    if max_tokens:
        params["max_tokens"] = max_tokens
    
    # Try the API call with retries for transient errors
    for attempt in range(max_retries):
        try:
            response = openai.chat.completions.create(**params)
            
            # Extract and format the response
            response_text = response.choices[0].message.content
            return format_openai_response(response_text, expected_format)
            
        except Exception as e:
            # Log the error
            error_type = type(e).__name__
            print(f"OpenAI API Error (Attempt {attempt+1}/{max_retries}): {error_type} - {str(e)}")
            
            # Handle rate limits with exponential backoff
            if "rate limit" in str(e).lower():
                delay = base_delay * (2 ** attempt)
                print(f"Rate limited. Retrying in {delay} seconds...")
                time.sleep(delay)
                continue
                
            # Handle other errors
            if attempt == max_retries - 1:
                print(f"All {max_retries} attempts failed. Returning default result.")
                return default_result
            
            # Wait before retrying other errors
            time.sleep(base_delay)
    
    # This should not be reached due to the return in the loop
    return default_result

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
    
    # Use the safe API call
    prompt = f"Summarize only the most important details from this legal document:\n\n{trimmed_text}"
    
    default_summary = "Unable to generate summary at this time. Please try again later."
    
    summary = safe_openai_call(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a legal assistant that creates concise summaries. Focus only on identifying: 1) parties involved, 2) key dates, 3) main obligations, 4) termination conditions."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,
        expected_format='text',
        default_result=default_summary
    )
    
    # Update document with summary
    db.documents.update_one(
        {"_id": document_id},
        {"$set": {
            "summary": summary, 
            "summarized": True
        }}
    )
    
    return summary

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
    
    # Use the safe API call with structured JSON format
    prompt = f"""Extract only the following key information from this legal document in JSON format. If information is not found, indicate 'Not specified':
1. Parties
2. Effective Date
3. Term/Duration
4. Governing Law
5. Key Payment Terms

Document:
{key_sections}"""

    default_info = {
        "Parties": "Not specified",
        "Effective Date": "Not specified",
        "Term/Duration": "Not specified",
        "Governing Law": "Not specified",
        "Key Payment Terms": "Not specified"
    }
    
    key_info = safe_openai_call(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a legal assistant that extracts specific key information only. Extract only: parties, dates, governing law, and payment terms if present."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=500,
        expected_format='json',
        default_result=default_info
    )
    
    # Update document with key info
    db.documents.update_one(
        {"_id": document_id},
        {"$set": {
            "key_info": key_info, 
            "info_extracted": True
        }}
    )
    
    return key_info
    
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
    
    # Use safe API call
    prompt = f"Based on the following document text, classify it into one of these categories: NDA, Contract, Agreement, Employment, Legal Brief, Terms of Service, Privacy Policy, License, or Other. Return only the category name.\n\n{beginning}"
    
    default_category = "Other"
    
    suggested_category = safe_openai_call(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a legal document classifier. Analyze the text and determine the document type from these categories only: 'NDA', 'Contract', 'Agreement', 'Employment', 'Legal Brief', 'Terms of Service', 'Privacy Policy', 'License', or 'Other'."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=10,
        expected_format='text',
        default_result=default_category
    )
    
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
    
    return suggested_category

def get_field_suggestions(template_id, field_id, context=None):
    """
    Enhanced function to get AI suggestions for a specific field based on context
    
    Args:
        template_id (str): The template identifier
        field_id (str): The field identifier to get suggestions for
        context (dict, optional): Context information for better suggestions
        
    Returns:
        dict: Suggestion with value and label
    """
    # Ensure we have context
    if not context:
        context = {}
    
    # Get human-readable field label
    field_labels = {
        # NDA fields
        "party1_name": "First Party Name",
        "party1_address": "First Party Address",
        "party2_name": "Second Party Name",
        "party2_address": "Second Party Address",
        "term_months": "Term (Months)",
        "governing_law": "Governing Law",
        "confidential_info_definition": "Definition of Confidential Information",
        
        # Service Agreement fields
        "service_provider": "Service Provider Name",
        "provider_address": "Provider Address",
        "client_name": "Client Name",
        "client_address": "Client Address",
        "services": "Services Description",
        "payment_terms": "Payment Terms",
        "term_length": "Term Length",
        
        # Employment Agreement fields
        "employer_name": "Employer Name",
        "employer_address": "Employer Address",
        "employee_name": "Employee Name",
        "employee_address": "Employee Address",
        "position": "Position",
        "salary": "Salary",
        "work_hours": "Work Hours",
        "benefits": "Benefits",
        "termination_terms": "Termination Terms"
    }
    
    # Default values for certain date fields
    if field_id == "effective_date" or field_id == "start_date":
        return {
            "value": datetime.now().strftime("%Y-%m-%d"),
            "label": field_labels.get(field_id, field_id.replace('_', ' ').title())
        }
    
    # Get template type
    template_type = template_id
    if "-" in template_id:
        template_type = template_id.replace("-", "_")
    
    # Build a prompt based on the template and field
    template_descriptions = {
        "nda": "Non-Disclosure Agreement for protecting confidential information",
        "service-agreement": "Service Agreement outlining terms for services provided",
        "employment-agreement": "Employment Agreement defining employment terms and conditions"
    }
    
    # Update the field prompts to be more specific and ask for realistic examples
    field_prompts = {
        # NDA fields
        "party1_name": "Suggest a realistic company name for the first party (disclosing party) in the NDA. Provide just the name, not a placeholder.",
        "party1_address": "Suggest a realistic complete business address for the first party.",
        "party2_name": "Suggest a realistic company name for the second party (receiving party) in the NDA. Provide just the name.",
        "party2_address": "Suggest a realistic complete business address for the second party.",
        "term_months": "Suggest a typical duration in months for an NDA. Provide only the number.",
        "governing_law": "Suggest a jurisdiction for the governing law of the agreement. Provide an actual state or country name.",
        "confidential_info_definition": "Provide a comprehensive definition of confidential information for an NDA. Give a real definition.",
        
        # Service Agreement fields
        "service_provider": "Suggest a realistic company name for the service provider.",
        "provider_address": "Suggest a realistic complete business address for the service provider.",
        "client_name": "Suggest a realistic company name for the client.",
        "client_address": "Suggest a realistic complete business address for the client.",
        "services": "Describe specific, realistic professional services that might be provided.",
        "payment_terms": "Suggest specific, realistic payment terms for a service agreement.",
        "term_length": "Suggest a typical duration for a service agreement.",
        
        # Employment Agreement fields
        "employer_name": "Suggest a realistic company name for the employer.",
        "employer_address": "Suggest a realistic complete business address for the employer.",
        "employee_name": "Suggest a realistic person's name for the employee.",
        "employee_address": "Suggest a realistic residential address for the employee.",
        "position": "Suggest a realistic job title for the position.",
        "salary": "Suggest a realistic salary amount.",
        "work_hours": "Suggest realistic work hours.",
        "benefits": "List specific, realistic benefits that might be included in an employment agreement.",
        "termination_terms": "Suggest realistic termination terms for an employment agreement."
    }
    
    # Get the specific prompt for this field
    field_prompt = field_prompts.get(field_id, f"Suggest a realistic value for the {field_id} field.")
    
    # Add context information if available
    context_info = ""
    if context:
        related_fields = []
        for key, value in context.items():
            if value and key != field_id:
                related_fields.append(f"- {field_labels.get(key, key)}: {value}")
                
        if related_fields:
            context_info = "Use this information as context for your suggestion:\n" + "\n".join(related_fields)
    
    # Create final prompt with specific instructions
    prompt = f"""You are helping draft a {template_descriptions.get(template_type, "legal contract")}.
    
{field_prompt}

{context_info}

IMPORTANT: Provide ONLY the suggested text value. No explanations or labels."""
    
    try:
        # Define fallback values based on field type
        default_suggestions = {
            "party1_name": "Acme Corporation",
            "party1_address": "123 Main Street, Suite 400, San Francisco, CA 94105",
            "party2_name": "XYZ Enterprises",
            "party2_address": "456 Market Street, Suite 200, San Francisco, CA 94105",
            "term_months": "24",
            "governing_law": "California, United States",
            "confidential_info_definition": "Any non-public information, data, or materials shared between the parties.",
            "service_provider": "Professional Services Inc.",
            "provider_address": "789 Oak Street, Suite 300, Chicago, IL 60601",
            "client_name": "Global Innovations Ltd.",
            "client_address": "321 Pine Avenue, Suite 500, New York, NY 10001",
            "services": "Professional consulting services including business analysis, strategy development, and implementation support.",
            "payment_terms": "Payment due within 30 days of invoice. Monthly billing for ongoing services.",
            "term_length": "One year from the effective date",
            "employer_name": "TechSolutions Inc.",
            "employer_address": "555 Technology Parkway, Suite 800, Seattle, WA 98101",
            "employee_name": "John Smith",
            "employee_address": "789 Residential Lane, Apt 3B, Seattle, WA 98102",
            "position": "Senior Software Engineer",
            "salary": "$120,000 per year",
            "work_hours": "40 hours per week, Monday through Friday, 9:00 AM to 5:00 PM",
            "benefits": "Health insurance, dental coverage, 401(k) matching, paid time off, and professional development opportunities.",
            "termination_terms": "Either party may terminate with 2 weeks written notice. Company may terminate immediately for cause."
        }
        
        default_suggestion = default_suggestions.get(field_id, "Example value")
        
        # Make the API call
        suggestion = safe_openai_call(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a legal contract drafting assistant. Provide realistic, specific information."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            expected_format='text',
            default_result=default_suggestion
        )
        
        # Clean up the response
        suggestion = suggestion.strip('"\'.,;: \n\r\t')
        
        # Remove any remaining placeholder formatting
        suggestion = re.sub(r'[\[\]{}]', '', suggestion)
        
        # If we have a numeric field, ensure it's a number
        if field_id == "term_months":
            # Extract just the number if possible
            numbers = re.findall(r'\d+', suggestion)
            if numbers:
                suggestion = numbers[0]
        
        # Return in standardized format
        return {
            "value": suggestion,
            "label": field_labels.get(field_id, field_id.replace('_', ' ').title())
        }
        
    except Exception as e:
        # Fallback in case of error
        print(f"Error generating suggestion for {field_id}: {str(e)}")
        return {
            "value": default_suggestions.get(field_id, "Example value"),
            "label": field_labels.get(field_id, field_id.replace('_', ' ').title())
        }
    

def analyze_contract_content(template_id, contract_text, form_data=None):
    """Analyze contract content for potential issues or improvements"""
    # Truncate contract text if too long
    max_chars = 10000  # Approximately 2500 tokens
    if len(contract_text) > max_chars:
        contract_text = contract_text[:max_chars] + "..."
    
    # Build the prompt based on template type
    template_specific_instructions = {
        "nda": """Focus on:
- Clarity of confidential information definition
- Duration of confidentiality obligations
- Exclusions from confidential information
- Return or destruction of confidential information
- Remedies for breach""",
        
        "service-agreement": """Focus on:
- Clarity of services description
- Payment terms completeness
- Intellectual property rights
- Limitation of liability
- Termination conditions""",
        
        "employment-agreement": """Focus on:
- Job role clarity
- Compensation terms
- Work hours and location
- Benefits clarity
- Termination conditions and notice periods"""
    }
    
    instructions = template_specific_instructions.get(
        template_id, 
        "Analyze this contract for potential issues, ambiguities, or missing elements."
    )
    
    prompt = f"""Analyze the following contract and identify:
1. Missing clauses or information
2. Potential ambiguities or unclear language
3. Possible legal issues or risks
4. Suggestions for improvement

{instructions}

CONTRACT TEXT:
{contract_text}

Provide your analysis in JSON format with these keys:
"issues": [list of potential issues]
"suggestions": [list of suggestions]
"overall_assessment": brief overall evaluation
"completeness_score": number from 1-10"""
    
    # Default result in case of API failure
    default_result = {
        "issues": ["Unable to analyze contract at this time"],
        "suggestions": ["Try again later or contact support"],
        "overall_assessment": "Analysis unavailable",
        "completeness_score": 5
    }
    
    # Make the API call
    return safe_openai_call(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a legal contract analysis assistant. Provide helpful insights for improving contracts."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=800,
        expected_format='json',
        default_result=default_result
    )

def suggest_contract_template(user_requirements):
    """Suggest a contract template based on user requirements description"""
    available_templates = [
        {"id": "nda", "name": "Non-Disclosure Agreement", 
         "description": "For protecting confidential information shared between parties"},
        {"id": "service-agreement", "name": "Service Agreement", 
         "description": "For defining services provided by one party to another"},
        {"id": "employment-agreement", "name": "Employment Agreement", 
         "description": "For establishing an employer-employee relationship"}
    ]
    
    # Format available templates for the prompt
    templates_text = "\n".join([
        f"- {t['id']}: {t['name']} - {t['description']}" for t in available_templates
    ])
    
    prompt = f"""Based on the following user requirements, recommend the most appropriate contract template from the available options.

Available templates:
{templates_text}

User requirements:
{user_requirements}

Provide your recommendation in this JSON format:
{{
  "recommended_template": "template_id",
  "confidence": number between 0 and 1,
  "reason": "brief explanation of recommendation"
}}"""
    
    # Default response if API fails
    default_recommendation = {
        "recommended_template": "service-agreement",
        "confidence": 0.5,
        "reason": "Unable to analyze requirements at this time. Defaulting to Service Agreement as it's the most versatile option."
    }
    
    # Use safe API call
    return safe_openai_call(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a legal assistant that helps recommend appropriate contract templates."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=200,
        expected_format='json',
        default_result=default_recommendation
    )