// Default workflow configuration. Admins can edit most of this in Settings;
// the edited copy lives in the store, this file only seeds it.

export const STAGES = [
  {
    key: 'lead',
    name: 'Lead or referral',
    short: 'Lead',
    folder: '01 Sales',
    substages: ['New', 'Contacted'],
  },
  {
    key: 'sales',
    name: 'Sales',
    short: 'Sales',
    folder: '01 Sales',
    substages: ['First meeting', 'Second meeting', 'Third meeting', 'Fourth meeting'],
  },
  {
    key: 'won',
    name: 'Won and client creation',
    short: 'Won',
    folder: '01 Sales',
    substages: ['Won approved', 'Client created'],
  },
  {
    key: 'survey',
    name: 'Technical survey and design',
    short: 'Survey',
    folder: '02 Survey and Design',
    substages: ['Survey requested', 'Survey scheduled', 'Survey completed', 'Design in progress', 'Design approved'],
  },
  {
    key: 'docs',
    name: 'Documentation, scheme and finance',
    short: 'Docs',
    folder: '03 Documentation and Finance',
    substages: ['Vendor agreement', 'Customer documents', 'Loan processing', 'Portal submission', 'Documentation complete'],
  },
  {
    key: 'procurement',
    name: 'Procurement and pre-installation',
    short: 'Procure',
    folder: '04 Procurement and Fabrication',
    substages: ['Procurement confirmed', 'Material ready', 'Site ready', 'Installation planned'],
  },
  {
    key: 'installation',
    name: 'Installation',
    short: 'Install',
    folder: '05 Installation',
    substages: ['Fabrication and structure', 'Earthing', 'Wiring', 'Testing', 'Installation upload'],
  },
  {
    key: 'post',
    name: 'Post-installation and utility approvals',
    short: 'Approvals',
    folder: '06 Approvals and Scheme',
    substages: ['Net-meter agreement', 'Net-meter application', 'Portal upload', 'Inspection', 'DISCOM approval', 'Documents shared'],
  },
  {
    key: 'commissioning',
    name: 'Commissioning and handover',
    short: 'Handover',
    folder: '07 Handover and O&M',
    substages: ['Commissioning', 'Handover pack', 'Handover complete'],
  },
  {
    key: 'om',
    name: 'Operations and maintenance',
    short: 'O&M',
    folder: '07 Handover and O&M',
    substages: ['Active O&M'],
  },
]

export const PROJECT_STAGE_KEYS = ['won', 'survey', 'docs', 'procurement', 'installation', 'post', 'commissioning', 'om']

export const DRIVE_FOLDERS = [
  { key: 'sales', name: '01 Sales', hint: 'Proposal, meeting summary, referral record' },
  { key: 'survey', name: '02 Survey and Design', hint: 'Survey notes, roof photos, layout, design revisions' },
  { key: 'docs', name: '03 Documentation and Finance', hint: 'Agreement, customer checklist, loan documents' },
  { key: 'procurement', name: '04 Procurement and Fabrication', hint: 'Supplier confirmation, fabrication and structure details' },
  { key: 'installation', name: '05 Installation', hint: 'Installation photos, test records, commissioning preparation' },
  { key: 'approvals', name: '06 Approvals and Scheme', hint: 'Portal receipts, net-meter, inspection, DISCOM, subsidy evidence' },
  { key: 'handover', name: '07 Handover and O&M', hint: 'Handover pack, warranty, manuals, O&M records' },
]

export const STAGE_TO_FOLDER = {
  lead: 'sales', sales: 'sales', won: 'sales', survey: 'survey', docs: 'docs',
  procurement: 'procurement', installation: 'installation', post: 'approvals',
  commissioning: 'handover', om: 'handover',
}

export const SCHEMES = [
  { key: 'pmsg', name: 'PM Surya Ghar', portal: 'National Portal for Rooftop Solar', types: ['residential'], active: true, subsidy: true },
  { key: 'goa-rooftop', name: 'Goa rooftop programme', portal: 'Goa Solar Portal (GEDA)', types: ['residential', 'commercial'], active: true, subsidy: true },
  { key: 'none', name: 'No scheme (private)', portal: null, types: ['residential', 'commercial'], active: true, subsidy: false },
  { key: 'kusum-b', name: 'PM-KUSUM Component B', portal: 'GEDA PM-KUSUM', types: ['commercial'], active: false, subsidy: true, note: 'Disabled until GEDA confirms the current scheme window and allocation.' },
  { key: 'kusum-c', name: 'PM-KUSUM Component C', portal: 'GEDA PM-KUSUM', types: ['commercial'], active: false, subsidy: true, note: 'Disabled until GEDA confirms the current scheme window and allocation.' },
]

// Gate checklist per stage. `schemes` limits an item to those scheme paths;
// `types` limits it to residential or commercial.
export const CHECKLISTS = {
  won: [
    { key: 'proposal', label: 'Accepted proposal on file', required: true },
    { key: 'closeEvidence', label: 'Close evidence recorded (work order or advance)', required: true },
    { key: 'scheme', label: 'Scheme or portal path selected', required: true },
    { key: 'driveRoot', label: 'Project Drive folder linked', required: true },
  ],
  survey: [
    { key: 'surveyDone', label: 'Site survey completed', required: true },
    { key: 'feasibility', label: 'Feasibility outcome recorded', required: true },
    { key: 'capacity', label: 'Proposed DC/AC capacity confirmed', required: true },
    { key: 'design', label: 'Design approved', required: true },
    { key: 'surveyDrive', label: 'Survey photos in Drive', required: false },
  ],
  docs: [
    { key: 'vendorAgreement', label: 'Vendor agreement signed', required: true },
    { key: 'customerDocs', label: 'Customer documents verified', required: true },
    { key: 'loanSettled', label: 'Loan approved or not applicable', required: true },
    { key: 'portalOnboarded', label: 'Portal onboarding approved', required: true, schemes: ['pmsg', 'goa-rooftop', 'kusum-b', 'kusum-c'] },
    { key: 'demandRecorded', label: 'Sanctioned or contract demand recorded', required: true, types: ['commercial'] },
  ],
  procurement: [
    { key: 'procurementConfirmed', label: 'Procurement confirmed with supplier', required: true },
    { key: 'materialReady', label: 'Material ready for dispatch', required: true },
    { key: 'siteReady', label: 'Site readiness confirmed with customer', required: true },
    { key: 'installPlan', label: 'Installation date planned', required: true },
  ],
  installation: [
    { key: 'structure', label: 'Fabrication and structure done', required: true },
    { key: 'earthing', label: 'Earthing done', required: true },
    { key: 'wiring', label: 'Wiring done', required: true },
    { key: 'testing', label: 'Testing passed', required: true },
    { key: 'installUpload', label: 'Installation photos uploaded to Drive', required: true },
  ],
  post: [
    { key: 'nmAgreement', label: 'Net-meter agreement signed', required: true },
    { key: 'nmInstalled', label: 'Net meter applied and installed', required: true },
    { key: 'portalUpload', label: 'Portal upload done', required: true, schemes: ['pmsg', 'goa-rooftop', 'kusum-b', 'kusum-c'] },
    { key: 'inspection', label: 'Inspection passed', required: true },
    { key: 'discom', label: 'DISCOM approval received', required: true },
    { key: 'docsShared', label: 'Documents shared with customer', required: true },
  ],
  commissioning: [
    { key: 'commissioned', label: 'Commissioning date and outcome recorded', required: true },
    { key: 'handoverChecklist', label: 'Handover checklist complete', required: true },
    { key: 'customerDocs', label: 'Customer documents shared', required: true },
    { key: 'warranty', label: 'Warranty and O&M dates recorded', required: true },
  ],
  om: [],
}

export const TASK_STATUSES = ['To Do', 'In Progress', 'Waiting', 'Blocked', 'Under Review', 'Completed']
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent']

export const LEAD_SOURCES = ['Website', 'Walk-in', 'Referral', 'Phone enquiry', 'Exhibition', 'Social media', 'Repeat client', 'Channel partner']

export const LOSS_REASONS = [
  'Price too high',
  'Chose a competitor',
  'Roof or site not feasible',
  'Finance not available',
  'Customer postponed',
  'No response from customer',
  'Scheme not eligible',
]

export const FEASIBILITY = ['Feasible', 'Feasible with conditions', 'Re-survey required', 'Not feasible']
export const VENDOR_AGREEMENT = ['Not started', 'Sent', 'Signed', 'Returned for correction']
export const DOC_STATUS = ['Missing', 'Received', 'Verified', 'Not applicable']
export const LOAN_STATUS = ['Not applicable', 'Not started', 'Submitted', 'Pending', 'Approved', 'Rejected', 'Disbursed']
export const PORTAL_STATUS = ['Not applicable', 'Not started', 'Submitted', 'Query raised', 'Approved', 'Rejected']
export const SUBSIDY_STATUS = ['Not applicable', 'Not started', 'Submitted', 'Pending', 'Query raised', 'Approved', 'Credited', 'Rejected']
export const MILESTONE_STATUS = ['Not started', 'In progress', 'Query raised', 'Done', 'Not applicable']

export const UTILITY_MILESTONES = [
  { key: 'nmAgreement', label: 'Net-meter agreement' },
  { key: 'nmApplication', label: 'Net-meter application' },
  { key: 'nmInstall', label: 'Net-meter installation' },
  { key: 'portalUpload', label: 'Portal upload' },
  { key: 'inspectionRequest', label: 'Inspection request' },
  { key: 'inspectionResult', label: 'Inspection result' },
  { key: 'discom', label: 'DISCOM approval' },
  { key: 'docsShared', label: 'Document sharing with customer' },
]

export const CUSTOMER_DOCS = {
  residential: ['Electricity bill', 'Identity proof', 'Address proof', 'Property ownership proof', 'Cancelled cheque', 'Site photographs'],
  commercial: ['Electricity bill', 'Business registration', 'GST certificate', 'Authorised signatory letter', 'Property ownership or lease', 'Site photographs'],
}

export const DISTRICTS = {
  'North Goa': ['Bardez', 'Tiswadi', 'Pernem', 'Bicholim', 'Sattari'],
  'South Goa': ['Salcete', 'Mormugao', 'Ponda', 'Quepem', 'Sanguem', 'Canacona', 'Dharbandora'],
}

export const WON_CONDITIONS = [
  { key: 'workorder', label: 'Accepted proposal plus signed work order' },
  { key: 'advance', label: 'Accepted proposal plus confirmed advance' },
  { key: 'either', label: 'Accepted proposal plus work order or advance' },
]

export const TEAMS = ['Management', 'Sales', 'Survey and design', 'Documentation', 'Installation', 'O&M']
