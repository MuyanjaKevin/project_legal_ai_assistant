# app/services/contract_service.py

import os
import tempfile
from datetime import datetime
import json
import base64
from bson import ObjectId
from app.config.database import get_database
from app.services.ai_processor import get_field_suggestions as ai_get_field_suggestions
import re

db = get_database()

def generate_contract_html(template_id, form_data):
    """Generate HTML content for a contract using template and form data"""
    try:
        print(f"Starting contract HTML generation for template: {template_id}")
        
        # Get the template content - in a real app this would come from the database
        template_content = get_template_content(template_id, form_data)
        
        if not template_content:
            print("No template content generated")
            return None
        
        # Create HTML with proper styling
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{template_id.replace('-', ' ').title()} Contract</title>
            <style>
                body {{
                    font-family: 'Times New Roman', Times, serif;
                    font-size: 12pt;
                    line-height: 1.5;
                    margin: 1in;
                    color: #000;
                }}
                .header {{
                    text-align: center;
                    font-size: 16pt;
                    font-weight: bold;
                    margin-bottom: 1.5em;
                    border-bottom: 1px solid #000;
                    padding-bottom: 0.5em;
                }}
                .section {{
                    margin-top: 1.5em;
                    page-break-inside: avoid;
                }}
                .section-title {{
                    font-weight: bold;
                    margin-bottom: 0.5em;
                }}
                .signature-block {{
                    margin-top: 3em;
                    page-break-inside: avoid;
                }}
                .signature-line {{
                    border-top: 1px solid #000;
                    width: 50%;
                    margin-top: 4em;
                }}
                .signature-name {{
                    margin-top: 0.5em;
                }}
                table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 1em 0;
                }}
                table, th, td {{
                    border: 1px solid #000;
                }}
                th, td {{
                    padding: 0.5em;
                    text-align: left;
                }}
                @page {{
                    size: letter;
                    margin: 1in;
                }}
                .page-break {{
                    page-break-before: always;
                }}
            </style>
        </head>
        <body>
            {process_template_to_html(template_content)}
        </body>
        </html>
        """
        
        print(f"Generated HTML of length: {len(html_content)}")
        return html_content
    except Exception as e:
        print(f"Error generating contract HTML: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def process_template_to_html(template_text):
    """Convert contract text to properly formatted HTML with sections and paragraphs"""
    
    # Split content by newlines
    lines = template_text.split('\n')
    html_parts = []
    
    # Process title
    if lines and lines[0].strip():
        html_parts.append(f'<div class="header">{lines[0].strip()}</div>')
        lines = lines[1:]
    
    current_section = []
    section_title = ""
    
    for line in lines:
        line = line.strip()
        
        if not line:
            # Empty line, skip
            continue
            
        # Check if this is a section title (numbered section)
        section_match = re.match(r'^(\d+\.)\s+(.+)$', line)
        if section_match:
            # If we have content in the current section, add it
            if current_section:
                section_html = f'<div class="section">'
                if section_title:
                    section_html += f'<div class="section-title">{section_title}</div>'
                section_html += f'<p>{"<br>".join(current_section)}</p></div>'
                html_parts.append(section_html)
            
            # Start new section
            section_title = line
            current_section = []
        elif line.startswith("IN WITNESS WHEREOF"):
            # Special handling for signature block
            if current_section:
                section_html = f'<div class="section">'
                if section_title:
                    section_html += f'<div class="section-title">{section_title}</div>'
                section_html += f'<p>{"<br>".join(current_section)}</p></div>'
                html_parts.append(section_html)
            
            # Create signature block
            signature_html = process_signature_block(line, lines[lines.index(line)+1:])
            html_parts.append(signature_html)
            break  # End processing after signature block
        else:
            # Regular paragraph
            current_section.append(line)
    
    # Add any remaining section
    if current_section:
        section_html = f'<div class="section">'
        if section_title:
            section_html += f'<div class="section-title">{section_title}</div>'
        section_html += f'<p>{"<br>".join(current_section)}</p></div>'
        html_parts.append(section_html)
    
    # If there are no HTML parts, return a message about empty template
    if not html_parts:
        return '<div class="header">Empty Contract Template</div><div class="section"><p>No contract content available. Please check the template configuration.</p></div>'
    
    return '\n'.join(html_parts)

def process_signature_block(witness_line, remaining_lines):
    """Process the signature block section"""
    
    signature_html = f'<div class="signature-block">'
    signature_html += f'<p>{witness_line}</p>'
    
    # Process parties and signature lines
    parties = []
    current_party = None
    
    for line in remaining_lines:
        if not line.strip():
            continue
            
        if line.startswith("By:"):
            # This is a signature line
            if current_party:
                signature_html += f'<div style="margin-top: 2em;">'
                signature_html += f'<div><strong>{current_party}</strong></div>'
                signature_html += f'<div class="signature-line"></div>'
                signature_html += f'<div>{line}</div>'
                signature_html += f'</div>'
                current_party = None
        elif current_party is None:
            # This is a party name
            current_party = line
    
    signature_html += '</div>'
    return signature_html

def get_template_content(template_id, form_data):
    """Get the template content with variables replaced"""
    try:
        print(f"Getting template content for ID: {template_id}")
        
        # In a real app, load template from file or database
        # For now, use hardcoded templates
        templates = {
            "nda": """NON-DISCLOSURE AGREEMENT

THIS NON-DISCLOSURE AGREEMENT (the "Agreement") is made and entered into as of {effective_date} by and between {party1_name}, located at {party1_address} ("Disclosing Party") and {party2_name}, located at {party2_address} ("Receiving Party").

1. PURPOSE.
The Disclosing Party wishes to disclose certain confidential information to the Receiving Party for the purpose of business discussions and potential transactions between the parties.

2. CONFIDENTIAL INFORMATION.
"Confidential Information" means any information disclosed by Disclosing Party to Receiving Party, either directly or indirectly, in writing, orally or by inspection of tangible objects.
{confidential_info_definition}

3. TERM.
The obligations of Receiving Party herein shall be effective from the date first above written and shall continue for a period of {term_months} months thereafter.

4. GOVERNING LAW.
This Agreement shall be governed by and construed in accordance with the laws of {governing_law}.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.

{party1_name}
By: __________________________
Name: 
Title:

{party2_name}
By: __________________________
Name:
Title:""",
            "service-agreement": """SERVICE AGREEMENT

THIS SERVICE AGREEMENT (the "Agreement") is made and entered into as of {effective_date} by and between {service_provider}, located at {provider_address} ("Service Provider") and {client_name}, located at {client_address} ("Client").

1. SERVICES.
Service Provider shall provide the following services to Client (the "Services"):
{services}

2. PAYMENT.
In consideration for the Services, Client shall pay Service Provider according to the following terms:
{payment_terms}

3. TERM.
This Agreement shall remain in effect for a period of {term_length}, unless earlier terminated as provided herein.

4. GOVERNING LAW.
This Agreement shall be governed by and construed in accordance with the laws of {governing_law}.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.

{service_provider}
By: __________________________
Name: 
Title:

{client_name}
By: __________________________
Name:
Title:""",
            "employment-agreement": """EMPLOYMENT AGREEMENT

THIS EMPLOYMENT AGREEMENT (the "Agreement") is made and entered into as of {start_date} by and between {employer_name}, located at {employer_address} ("Employer") and {employee_name}, located at {employee_address} ("Employee").

1. POSITION AND DUTIES.
Employer hereby employs Employee as {position}, and Employee hereby accepts such employment, on the terms and conditions set forth herein.

2. COMPENSATION.
In consideration for Employee's services, Employer shall pay Employee {salary} in accordance with Employer's regular payroll practices.

3. WORK HOURS.
Employee's work hours shall be {work_hours}.

4. BENEFITS.
Employee shall be entitled to the following benefits:
{benefits}

5. TERMINATION.
This Agreement may be terminated under the following conditions:
{termination_terms}

6. GOVERNING LAW.
This Agreement shall be governed by and construed in accordance with the laws of {governing_law}.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.

{employer_name}
By: __________________________
Name: 
Title:

{employee_name}
By: __________________________"""
        }
        
        # Handle possible template ID formats (with or without hyphen)
        normalized_template_id = template_id
        if template_id == "service_agreement":
            normalized_template_id = "service-agreement"
        elif template_id == "employment_agreement":
            normalized_template_id = "employment-agreement"
            
        # Also try the other way around
        if template_id not in templates and "-" in template_id:
            normalized_template_id = template_id.replace("-", "_")
            
        if normalized_template_id not in templates:
            # Try to find a matching template by partial match
            for key in templates.keys():
                if key in normalized_template_id or normalized_template_id in key:
                    normalized_template_id = key
                    break
                    
        if normalized_template_id not in templates:
            print(f"Template ID '{template_id}' not found in available templates. Available templates: {list(templates.keys())}")
            return None
        
        # Replace variables in template
        content = templates[normalized_template_id]
        
        # Debug field replacement
        print(f"Form data for template: {form_data}")
        
        # Find all required placeholders in the template
        placeholders = re.findall(r'{([^{}]*)}', content)
        print(f"Template placeholders: {placeholders}")
        
        # Prepare replacements dict
        replacements = {}
        
        # Check for missing fields and provide defaults
        for key in placeholders:
            if key not in form_data or not form_data[key]:
                default_value = f"[{key.replace('_', ' ').title()}]"
                print(f"Missing/empty field '{key}', using default: '{default_value}'")
                replacements[key] = default_value
            else:
                replacements[key] = form_data[key]
                
        # Now replace variables
        for key, value in replacements.items():
            placeholder = "{" + key + "}"
            print(f"Replacing '{placeholder}' with '{value}'")
            content = content.replace(placeholder, value)
            
        # Also include any other form data fields not in placeholders
        for key, value in form_data.items():
            if key not in replacements:
                placeholder = "{" + key + "}"
                if placeholder in content:
                    print(f"Found additional placeholder '{placeholder}', replacing with '{value}'")
                    content = content.replace(placeholder, value)
        
        return content
    except Exception as e:
        print(f"Error getting template content: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def save_contract_html_for_frontend(html_content, user_id, template_id, form_data):
    """Save the HTML content to generate PDF on frontend with html2canvas/jsPDF"""
    try:
        # Create contract metadata
        contract = {
            "user_id": user_id,
            "template_id": template_id,
            "form_data": form_data,
            "html_content": html_content,
            "created_at": datetime.now()
        }
        
        # Save to database
        result = db.contracts.insert_one(contract)
        contract_id = result.inserted_id
        
        return str(contract_id)
    except Exception as e:
        print(f"Error saving contract HTML: {str(e)}")
        return None

def get_contract_html(contract_id, user_id):
    """Get the HTML content for a contract to render/print in frontend"""
    try:
        # Find contract in database
        contract = db.contracts.find_one({"_id": ObjectId(contract_id), "user_id": user_id})
        
        if not contract:
            return None
        
        return contract.get('html_content')
    except Exception as e:
        print(f"Error getting contract HTML: {str(e)}")
        return None

def get_ai_field_suggestions(template_id, context=None):
    """Get AI suggestions for contract fields based on template and optional context"""
    
    if not context:
        context = {}
    
    # Get all fields for the template
    fields = get_template_fields(template_id)
    
    if not fields:
        return {}
    
    # Get suggestions for each field
    results = {}
    for field in fields:
        field_id = field['id']
        
        # Skip fields already provided in context
        if field_id in context and context[field_id]:
            continue
            
        suggestion = ai_get_field_suggestions(template_id, field_id, context)
        if suggestion:
            results[field_id] = suggestion
    
    return results

def get_template_fields(template_id):
    """Get the fields for a template"""
    # In a real app, this would come from a database
    template_fields = {
        "nda": [
            { "id": "party1_name", "label": "First Party Name", "type": "text", "required": True },
            { "id": "party1_address", "label": "First Party Address", "type": "textarea", "required": True },
            { "id": "party2_name", "label": "Second Party Name", "type": "text", "required": True },
            { "id": "party2_address", "label": "Second Party Address", "type": "textarea", "required": True },
            { "id": "effective_date", "label": "Effective Date", "type": "date", "required": True },
            { "id": "term_months", "label": "Term (Months)", "type": "number", "required": True },
            { "id": "governing_law", "label": "Governing Law State/Country", "type": "text", "required": True },
            { "id": "confidential_info_definition", "label": "Definition of Confidential Information", "type": "textarea", "required": False }
        ],
        "service-agreement": [
            { "id": "service_provider", "label": "Service Provider Name", "type": "text", "required": True },
            { "id": "provider_address", "label": "Provider Address", "type": "textarea", "required": True },
            { "id": "client_name", "label": "Client Name", "type": "text", "required": True },
            { "id": "client_address", "label": "Client Address", "type": "textarea", "required": True },
            { "id": "effective_date", "label": "Effective Date", "type": "date", "required": True },
            { "id": "services", "label": "Description of Services", "type": "textarea", "required": True },
            { "id": "payment_terms", "label": "Payment Terms", "type": "textarea", "required": True },
            { "id": "term_length", "label": "Term Length", "type": "text", "required": True },
            { "id": "governing_law", "label": "Governing Law", "type": "text", "required": True }
        ],
        "employment-agreement": [
            { "id": "employer_name", "label": "Employer Name", "type": "text", "required": True },
            { "id": "employer_address", "label": "Employer Address", "type": "textarea", "required": True },
            { "id": "employee_name", "label": "Employee Name", "type": "text", "required": True },
            { "id": "employee_address", "label": "Employee Address", "type": "textarea", "required": True },
            { "id": "position", "label": "Position/Title", "type": "text", "required": True },
            { "id": "start_date", "label": "Start Date", "type": "date", "required": True },
            { "id": "salary", "label": "Salary", "type": "text", "required": True },
            { "id": "work_hours", "label": "Work Hours", "type": "text", "required": True },
            { "id": "benefits", "label": "Benefits", "type": "textarea", "required": False },
            { "id": "termination_terms", "label": "Termination Terms", "type": "textarea", "required": True },
            { "id": "governing_law", "label": "Governing Law", "type": "text", "required": True }
        ]
    }
    
    # Try to normalize the template ID
    normalized_id = template_id
    if "-" in template_id:
        normalized_id = template_id.replace("-", "_")
    
    if normalized_id in template_fields:
        return template_fields[normalized_id]
    elif template_id in template_fields:
        return template_fields[template_id]
    else:
        return None

def analyze_contract(contract_id, user_id):
    """Analyze a contract for potential issues or improvements"""
    from app.services.ai_processor import analyze_contract_content
    
    # Find contract in database
    contract = db.contracts.find_one({"_id": ObjectId(contract_id), "user_id": user_id})
    
    if not contract:
        return None
    
    template_id = contract.get('template_id')
    form_data = contract.get('form_data', {})
    html_content = contract.get('html_content', '')
    
    # Strip HTML tags to get plain text
    plain_text = html_content.replace('<', ' <').replace('>', '> ').replace('&nbsp;', ' ')
    plain_text = re.sub(r'<[^>]*>', '', plain_text)
    plain_text = re.sub(r'\s+', ' ', plain_text).strip()
    
    # Get analysis from AI
    analysis = analyze_contract_content(template_id, plain_text, form_data)
    
    # Save analysis to database
    db.contracts.update_one(
        {"_id": ObjectId(contract_id)},
        {"$set": {"analysis": analysis}}
    )
    
    return analysis

def recommend_template(user_requirements):
    """Recommend a contract template based on user requirements"""
    from app.services.ai_processor import suggest_contract_template 
    
    # Call the AI processor function
    return suggest_contract_template(user_requirements)