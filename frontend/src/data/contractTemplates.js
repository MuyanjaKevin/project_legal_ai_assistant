// src/data/contractTemplates.js
const contractTemplates = [
    {
      id: "nda",
      name: "Non-Disclosure Agreement",
      description: "A standard confidentiality agreement to protect sensitive information",
      fields: [
        { id: "party1_name", label: "First Party Name", type: "text", required: true },
        { id: "party1_address", label: "First Party Address", type: "textarea", required: true },
        { id: "party2_name", label: "Second Party Name", type: "text", required: true },
        { id: "party2_address", label: "Second Party Address", type: "textarea", required: true },
        { id: "effective_date", label: "Effective Date", type: "date", required: true },
        { id: "term_months", label: "Term (Months)", type: "number", required: true },
        { id: "governing_law", label: "Governing Law State/Country", type: "text", required: true },
        { id: "confidential_info_definition", label: "Definition of Confidential Information", type: "textarea", required: false }
      ],
      template: `NON-DISCLOSURE AGREEMENT
  
  THIS NON-DISCLOSURE AGREEMENT (the "Agreement") is made and entered into as of {{effective_date}} by and between {{party1_name}}, located at {{party1_address}} ("Disclosing Party") and {{party2_name}}, located at {{party2_address}} ("Receiving Party").
  
  1. PURPOSE.
  The Disclosing Party wishes to disclose certain confidential information to the Receiving Party for the purpose of business discussions and potential transactions between the parties.
  
  2. CONFIDENTIAL INFORMATION.
  "Confidential Information" means any information disclosed by Disclosing Party to Receiving Party, either directly or indirectly, in writing, orally or by inspection of tangible objects.
  {{#if confidential_info_definition}}
  Specifically, Confidential Information includes: {{confidential_info_definition}}
  {{/if}}
  
  3. TERM.
  The obligations of Receiving Party herein shall be effective from the date first above written and shall continue for a period of {{term_months}} months thereafter.
  
  4. GOVERNING LAW.
  This Agreement shall be governed by and construed in accordance with the laws of {{governing_law}}.
  
  IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.
  
  {{party1_name}}
  By: __________________________
  Name: 
  Title:
  
  {{party2_name}}
  By: __________________________
  Name:
  Title:`
    },
    {
      id: "service-agreement",
      name: "Service Agreement",
      description: "A contract defining the terms of services provided between parties",
      fields: [
        { id: "service_provider", label: "Service Provider Name", type: "text", required: true },
        { id: "provider_address", label: "Provider Address", type: "textarea", required: true },
        { id: "client_name", label: "Client Name", type: "text", required: true },
        { id: "client_address", label: "Client Address", type: "textarea", required: true },
        { id: "effective_date", label: "Effective Date", type: "date", required: true },
        { id: "services", label: "Description of Services", type: "textarea", required: true },
        { id: "payment_terms", label: "Payment Terms", type: "textarea", required: true },
        { id: "term_length", label: "Term Length", type: "text", required: true },
        { id: "governing_law", label: "Governing Law", type: "text", required: true }
      ],
      template: `SERVICE AGREEMENT
  
  THIS SERVICE AGREEMENT (the "Agreement") is made and entered into as of {{effective_date}} by and between {{service_provider}}, located at {{provider_address}} ("Service Provider") and {{client_name}}, located at {{client_address}} ("Client").
  
  1. SERVICES.
  Service Provider shall provide the following services to Client (the "Services"):
  {{services}}
  
  2. PAYMENT.
  In consideration for the Services, Client shall pay Service Provider according to the following terms:
  {{payment_terms}}
  
  3. TERM.
  This Agreement shall remain in effect for a period of {{term_length}}, unless earlier terminated as provided herein.
  
  4. GOVERNING LAW.
  This Agreement shall be governed by and construed in accordance with the laws of {{governing_law}}.
  
  IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.
  
  {{service_provider}}
  By: __________________________
  Name: 
  Title:
  
  {{client_name}}
  By: __________________________
  Name:
  Title:`
    },
    {
      id: "employment-agreement",
      name: "Employment Agreement",
      description: "A contract between employer and employee defining the terms of employment",
      fields: [
        { id: "employer_name", label: "Employer Name", type: "text", required: true },
        { id: "employer_address", label: "Employer Address", type: "textarea", required: true },
        { id: "employee_name", label: "Employee Name", type: "text", required: true },
        { id: "employee_address", label: "Employee Address", type: "textarea", required: true },
        { id: "position", label: "Position/Title", type: "text", required: true },
        { id: "start_date", label: "Start Date", type: "date", required: true },
        { id: "salary", label: "Salary", type: "text", required: true },
        { id: "work_hours", label: "Work Hours", type: "text", required: true },
        { id: "benefits", label: "Benefits", type: "textarea", required: false },
        { id: "termination_terms", label: "Termination Terms", type: "textarea", required: true },
        { id: "governing_law", label: "Governing Law", type: "text", required: true }
      ],
      template: `EMPLOYMENT AGREEMENT
  
  THIS EMPLOYMENT AGREEMENT (the "Agreement") is made and entered into as of {{start_date}} by and between {{employer_name}}, located at {{employer_address}} ("Employer") and {{employee_name}}, located at {{employee_address}} ("Employee").
  
  1. POSITION AND DUTIES.
  Employer hereby employs Employee as {{position}}, and Employee hereby accepts such employment, on the terms and conditions set forth herein.
  
  2. COMPENSATION.
  In consideration for Employee's services, Employer shall pay Employee {{salary}} in accordance with Employer's regular payroll practices.
  
  3. WORK HOURS.
  Employee's work hours shall be {{work_hours}}.
  
  {{#if benefits}}
  4. BENEFITS.
  Employee shall be entitled to the following benefits:
  {{benefits}}
  {{/if}}
  
  5. TERMINATION.
  This Agreement may be terminated under the following conditions:
  {{termination_terms}}
  
  6. GOVERNING LAW.
  This Agreement shall be governed by and construed in accordance with the laws of {{governing_law}}.
  
  IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.
  
  {{employer_name}}
  By: __________________________
  Name: 
  Title:
  
  {{employee_name}}
  By: __________________________`
    }
  ];
  
  export default contractTemplates;