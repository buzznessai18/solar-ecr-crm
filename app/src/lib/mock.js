import { CHECKLISTS, CUSTOMER_DOCS, DRIVE_FOLDERS, LOSS_REASONS, PROJECT_STAGE_KEYS, SCHEMES, STAGES, UTILITY_MILESTONES, WON_CONDITIONS } from './config'
import { daysFromToday, tsDaysAgo } from './utils'

// All dates are relative to today so the demo always looks current.
const d = (n) => daysFromToday(n)
const ts = (n, h) => tsDaysAgo(n, h)
const year = new Date().getFullYear()

export const USERS = [
  { id: 'u-rhea', name: 'Rhea Naik', email: 'rhea.naik@ecorays.in', role: 'admin', team: 'Management', title: 'Operations head', active: true, phone: '98220 41190' },
  { id: 'u-aditya', name: 'Aditya Kamat', email: 'aditya.kamat@ecorays.in', role: 'user', team: 'Sales', title: 'Sales executive', active: true, phone: '98231 22014' },
  { id: 'u-sneha', name: 'Sneha Desai', email: 'sneha.desai@ecorays.in', role: 'user', team: 'Sales', title: 'Commercial sales lead', active: true, phone: '99232 80455' },
  { id: 'u-pradeep', name: 'Pradeep Gaonkar', email: 'pradeep.gaonkar@ecorays.in', role: 'user', team: 'Survey and design', title: 'Site surveyor', active: true, phone: '97640 11872' },
  { id: 'u-kavita', name: 'Kavita Shetty', email: 'kavita.shetty@ecorays.in', role: 'user', team: 'Documentation', title: 'Documentation and finance', active: true, phone: '98504 63320' },
  { id: 'u-joel', name: 'Joel Fernandes', email: 'joel.fernandes@ecorays.in', role: 'user', team: 'Installation', title: 'Installation lead', active: true, phone: '98810 09341' },
  { id: 'u-manoj', name: 'Manoj Parab', email: 'manoj.parab@ecorays.in', role: 'user', team: 'Installation', title: 'Installation technician', active: true, phone: '90110 77452' },
  { id: 'u-tanvi', name: 'Tanvi Borkar', email: 'tanvi.borkar@ecorays.in', role: 'user', team: 'Sales', title: 'Sales executive', active: false, phone: '93725 18806' },
]

const folderId = () => '1' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)
const driveUrl = () => `https://drive.google.com/drive/folders/${folderId()}`

// ---------------- leads ----------------

const leadSeeds = [
  // [contact, type, source, referrer, phone, district, taluka, area, owner, stage, substage, lastMovedDaysAgo, createdDaysAgo, status, kw]
  ['Anand Prabhu', 'residential', 'Referral', 'Vikram Sardesai (client)', '98221 30411', 'North Goa', 'Bardez', 'H.No. 214, Saligao, Bardez', 'u-aditya', 'sales', 'Second meeting', 4, 19, 'open', 5],
  ['Lourdes D\'Souza', 'residential', 'Website', '', '98500 12877', 'South Goa', 'Salcete', 'Villa 7, Colva Beach Road, Benaulim', 'u-aditya', 'sales', 'First meeting', 26, 33, 'open', 3],
  ['Hotel Mandovi Sands', 'commercial', 'Exhibition', '', '0832 242 5610', 'North Goa', 'Tiswadi', 'D.B. Marg, Panaji', 'u-sneha', 'sales', 'Third meeting', 9, 48, 'open', 60],
  ['Siddhesh Naik', 'residential', 'Phone enquiry', '', '97660 41129', 'North Goa', 'Pernem', 'Near Bhagwati Temple, Pernem', 'u-aditya', 'lead', 'Contacted', 2, 2, 'open', 4],
  ['Kudchade Agro Industries', 'commercial', 'Channel partner', 'Sunline Electricals', '98903 22071', 'South Goa', 'Mormugao', 'Plot 11, Verna Industrial Estate', 'u-sneha', 'sales', 'Fourth meeting', 23, 71, 'open', 120],
  ['Meera Kerkar', 'residential', 'Social media', '', '96230 77811', 'North Goa', 'Bicholim', 'Kerkar Wada, Sanquelim', 'u-aditya', 'sales', 'First meeting', 30, 34, 'open', 3],
  ['Rui Menezes', 'residential', 'Referral', 'Fr. Agnelo (parish)', '98227 61190', 'South Goa', 'Salcete', 'Rua de Abade Faria, Margao', 'u-aditya', 'sales', 'Second meeting', 11, 25, 'loss-pending', 6],
  ['St. Xavier\'s School, Mapusa', 'commercial', 'Referral', 'PTA committee', '0832 226 2240', 'North Goa', 'Bardez', 'Feira Alta, Mapusa', 'u-sneha', 'sales', 'Second meeting', 6, 28, 'won-pending', 40],
  ['Ganesh Gawas', 'residential', 'Walk-in', '', '90215 88470', 'North Goa', 'Sattari', 'Valpoi Market Road, Valpoi', 'u-aditya', 'lead', 'New', 0, 0, 'open', 3],
  ['Noronha Bakers', 'commercial', 'Website', '', '98221 09077', 'North Goa', 'Tiswadi', '18th June Road, Panaji', 'u-sneha', 'sales', 'First meeting', 3, 9, 'open', 15],
  ['Pooja Sawant', 'residential', 'Repeat client', '', '97675 30199', 'South Goa', 'Ponda', 'Farmagudi, Ponda', 'u-aditya', 'sales', 'First meeting', 22, 29, 'open', 5],
  ['Ravi Shirodkar', 'residential', 'Phone enquiry', '', '95299 41022', 'South Goa', 'Quepem', 'Near Quepem Church, Quepem', 'u-tanvi', 'sales', 'First meeting', 40, 52, 'open', 3],
  ['Fatima Rodrigues', 'residential', 'Website', '', '98602 77420', 'South Goa', 'Canacona', 'Palolem, Canacona', 'u-aditya', 'sales', 'Second meeting', 12, 61, 'lost', 4],
  ['Coastal Cold Storage', 'commercial', 'Exhibition', '', '0832 278 1144', 'South Goa', 'Mormugao', 'Cortalim Industrial Area', 'u-sneha', 'sales', 'Third meeting', 30, 96, 'lost', 80],
  ['Sameer Chodankar', 'residential', 'Referral', 'Anil Chodankar', '98230 55109', 'North Goa', 'Bardez', 'Porvorim, Bardez', 'u-aditya', 'lead', 'New', 1, 1, 'open', 3],
]

const meetingNotes = [
  ['Explained on-grid vs hybrid, shared 3 kWp and 5 kWp quotes.', 'Send revised quote with subsidy estimate'],
  ['Customer wants to compare two panel brands; roof access checked.', 'Arrange site survey'],
  ['Board members joined; asked for ROI over 10 years.', 'Share commercial proposal and ROI sheet'],
  ['Negotiated price; customer awaiting finance approval.', 'Follow up on finance decision'],
]

function buildMeetings(substage, createdDaysAgo) {
  const n = { 'First meeting': 1, 'Second meeting': 2, 'Third meeting': 3, 'Fourth meeting': 4 }[substage] || 0
  const out = []
  for (let i = 0; i < n; i++) {
    const ago = Math.max(0, createdDaysAgo - Math.round(((i + 1) * createdDaysAgo) / (n + 1)))
    out.push({
      n: i + 1,
      date: d(-ago),
      outcome: i === n - 1 ? 'Positive, follow-up needed' : 'Positive',
      comment: meetingNotes[i][0],
      nextAction: meetingNotes[i][1],
      nextDate: d(-ago + 5),
    })
  }
  return out
}

export const LEADS = leadSeeds.map((s, i) => {
  const [contact, type, source, referrer, phone, district, taluka, address, owner, stage, substage, moved, created, status, kw] = s
  const id = `ECR-L-${year}-${String(i + 31).padStart(3, '0')}`
  const meetings = buildMeetings(substage, created)
  const lastMeeting = meetings[meetings.length - 1]
  return {
    id,
    createdAt: ts(created, 10),
    createdBy: i % 4 === 2 ? 'u-rhea' : owner,
    type,
    source,
    referrer,
    contact,
    businessName: type === 'commercial' ? contact : '',
    phone,
    email: type === 'commercial' ? `office@${contact.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.in` : (i % 3 === 0 ? '' : `${contact.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`),
    address,
    district,
    taluka,
    consumerNo: i % 2 ? `${type === 'commercial' ? 'LT' : 'R'}${4400000 + i * 3217}` : '',
    owner,
    stage,
    substage,
    status,
    lastMovedAt: ts(moved, 15),
    nextAction: lastMeeting?.nextAction || 'Call to schedule first meeting',
    nextActionDate: lastMeeting ? d(Math.max(-3, 5 - moved)) : d(1),
    estimatedKw: kw,
    meetings,
    surveyRequested: substage === 'Second meeting' && i % 2 === 0,
    surveyor: substage === 'Second meeting' && i % 2 === 0 ? 'u-pradeep' : '',
    lostReason: status === 'lost' ? (type === 'commercial' ? LOSS_REASONS[1] : LOSS_REASONS[0]) : '',
    lostAt: status === 'lost' ? d(-moved + 2) : '',
    projectId: null,
    mergedInto: null,
  }
})

// ---------------- projects ----------------

const projectSeeds = [
  // [client, type, scheme, district, taluka, address, kw, value, owner, instOwner, stage, substageIdx, stageEnteredDaysAgo, wonDaysAgo, source]
  ['Vikram Sardesai', 'residential', 'pmsg', 'North Goa', 'Bardez', 'H.No. 88, Sangolda, Bardez', 5, 315000, 'u-aditya', 'u-joel', 'om', 0, 64, 210, 'Website'],
  ['Cidade de Goa Residency', 'commercial', 'goa-rooftop', 'North Goa', 'Tiswadi', 'Dona Paula Plateau, Tiswadi', 75, 3450000, 'u-sneha', 'u-joel', 'commissioning', 1, 6, 168, 'Exhibition'],
  ['Prakash Naik', 'residential', 'pmsg', 'South Goa', 'Ponda', 'Bethora Road, Ponda', 3, 189000, 'u-aditya', 'u-manoj', 'post', 3, 18, 120, 'Referral'],
  ['Shanta Durga Traders', 'commercial', 'none', 'North Goa', 'Bicholim', 'Bicholim Market Complex', 25, 1180000, 'u-sneha', 'u-joel', 'installation', 2, 7, 88, 'Walk-in'],
  ['Agnes Fernandes', 'residential', 'goa-rooftop', 'South Goa', 'Salcete', 'Navelim, Salcete', 4, 246000, 'u-aditya', 'u-manoj', 'installation', 0, 3, 72, 'Social media'],
  ['Mapusa Urban Clinic', 'commercial', 'goa-rooftop', 'North Goa', 'Bardez', 'Angod, Mapusa', 30, 1395000, 'u-sneha', 'u-joel', 'procurement', 1, 11, 63, 'Referral'],
  ['Dattaram Harmalkar', 'residential', 'pmsg', 'North Goa', 'Pernem', 'Harmal, Pernem', 3, 192000, 'u-aditya', 'u-manoj', 'docs', 2, 24, 49, 'Phone enquiry'],
  ['Sea Breeze Homestay', 'commercial', 'none', 'South Goa', 'Canacona', 'Agonda Beach Road, Canacona', 12, 590000, 'u-sneha', 'u-joel', 'docs', 3, 9, 41, 'Website'],
  ['Nilesh Kunkolienkar', 'residential', 'pmsg', 'South Goa', 'Salcete', 'Curtorim, Salcete', 5, 309000, 'u-aditya', 'u-manoj', 'survey', 3, 6, 23, 'Referral'],
  ['Goa Spice Exports', 'commercial', 'goa-rooftop', 'South Goa', 'Mormugao', 'Plot 42, Verna Industrial Estate', 100, 4380000, 'u-sneha', 'u-joel', 'survey', 1, 14, 17, 'Channel partner'],
  ['Maria Colaco', 'residential', 'pmsg', 'North Goa', 'Tiswadi', 'Taleigao, Tiswadi', 3, 186000, 'u-aditya', 'u-manoj', 'won', 1, 2, 2, 'Website'],
  ['Kamat Hardware', 'commercial', 'none', 'North Goa', 'Bardez', 'Calangute-Mapusa Road, Parra', 20, 940000, 'u-sneha', 'u-joel', 'post', 1, 31, 134, 'Repeat client'],
  ['Suresh Velip', 'residential', 'goa-rooftop', 'South Goa', 'Sanguem', 'Netravali Road, Sanguem', 3, 184000, 'u-aditya', 'u-manoj', 'om', 0, 120, 290, 'Phone enquiry'],
  ['Carmel Convent Hostel', 'commercial', 'goa-rooftop', 'South Goa', 'Salcete', 'Nuvem, Salcete', 45, 2050000, 'u-sneha', 'u-joel', 'commissioning', 0, 12, 155, 'Referral'],
]

function checklistUpTo(stageKey, subIdx, project) {
  const out = {}
  const idx = PROJECT_STAGE_KEYS.indexOf(stageKey)
  PROJECT_STAGE_KEYS.forEach((k, i) => {
    const items = (CHECKLISTS[k] || []).filter((it) => (!it.schemes || it.schemes.includes(project.scheme)) && (!it.types || it.types.includes(project.type)))
    out[k] = {}
    items.forEach((it, j) => {
      if (i < idx) out[k][it.key] = true
      else if (i === idx) out[k][it.key] = j < subIdx
    })
  })
  return out
}

const stageOrder = PROJECT_STAGE_KEYS

export const PROJECTS = projectSeeds.map((s, i) => {
  const [client, type, scheme, district, taluka, address, kw, value, owner, instOwner, stage, subIdx, stageDays, wonDays, source] = s
  const id = `ECR-P-${year}-${String(i + 7).padStart(3, '0')}`
  const leadId = `ECR-L-${year}-${String(i + 1).padStart(3, '0')}`
  const st = STAGES.find((x) => x.key === stage)
  const reached = (k) => stageOrder.indexOf(stage) >= stageOrder.indexOf(k)
  const past = (k) => stageOrder.indexOf(stage) > stageOrder.indexOf(k)
  const p = {
    id,
    leadId,
    client,
    contact: type === 'commercial' ? ['Ms. Joanne Pinto', 'Mr. Rahul Kamat', 'Mr. Ashwin Sinai', 'Ms. Priya Bhandari'][i % 4] : client,
    businessName: type === 'commercial' ? client : '',
    phone: `98${(220 + i * 7) % 1000} ${String(10000 + i * 4111).slice(0, 5)}`,
    email: type === 'commercial' ? `admin@${client.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.com` : `${client.split(' ')[0].toLowerCase()}.${client.split(' ').pop().toLowerCase()}@gmail.com`,
    type,
    scheme,
    address,
    district,
    taluka,
    consumerNo: `${type === 'commercial' ? 'LT' : 'R'}${3100000 + i * 5113}`,
    capacityKw: kw,
    value,
    sanctionedDemand: type === 'commercial' ? `${Math.round(kw * 1.4)} kVA` : '',
    wonDate: d(-wonDays),
    source,
    owner,
    installationOwner: instOwner,
    stage,
    substage: st.substages[Math.min(subIdx, st.substages.length - 1)],
    stageEnteredAt: ts(stageDays, 10),
    createdAt: ts(wonDays, 16),
    checklist: {},
    blocked: null,
    archived: false,
    survey: {
      requestedAt: d(-wonDays + 1),
      plannedDate: d(-wonDays + 5),
      surveyor: 'u-pradeep',
      completedDate: reached('survey') && (past('survey') || subIdx >= 2) ? d(-wonDays + 6) : '',
      feasibility: past('survey') || (stage === 'survey' && subIdx >= 2) ? (i % 5 === 3 ? 'Feasible with conditions' : 'Feasible') : '',
      roofType: ['RCC flat roof', 'Mangalore tile roof', 'Metal sheet roof', 'RCC flat roof'][i % 4],
      shadow: i % 3 === 0 ? 'Coconut tree shading on east side before 9 am' : 'No significant shading',
      electrical: type === 'commercial' ? 'Three-phase LT connection; MCCB needs upgrade at main panel' : 'Single-phase connection; earthing pit to be added',
      dcKw: kw,
      acKw: Math.round(kw * 0.9 * 10) / 10,
      designVersion: past('survey') ? 'v2' : stage === 'survey' && subIdx >= 3 ? 'v1' : '',
      designStatus: past('survey') ? 'Approved' : stage === 'survey' && subIdx >= 3 ? 'In review' : 'Not started',
      exceptions: i % 5 === 3 ? 'Parapet height requires raised structure' : '',
    },
    docs: {
      vendorAgreement: past('docs') ? 'Signed' : stage === 'docs' ? (subIdx >= 1 ? 'Signed' : 'Sent') : 'Not started',
      customerDocs: CUSTOMER_DOCS[type].map((name, j) => ({
        name,
        status: past('docs') ? 'Verified' : stage === 'docs' ? ['Verified', 'Received', 'Verified', 'Missing', 'Received', 'Verified'][j] : 'Missing',
      })),
      loan: i % 3 === 0
        ? { status: past('docs') ? 'Disbursed' : stage === 'docs' ? 'Pending' : 'Not started', lender: 'State Bank of India', ref: `SBI-RTS-${48100 + i}`, date: d(-wonDays + 20) }
        : { status: 'Not applicable', lender: '', ref: '', date: '' },
      portal: scheme === 'none'
        ? { status: 'Not applicable', name: '', ref: '', date: '', query: '' }
        : {
            status: past('docs') ? 'Approved' : stage === 'docs' ? (subIdx >= 3 ? 'Query raised' : 'Submitted') : 'Not started',
            name: SCHEMES.find((x) => x.key === scheme)?.portal,
            ref: past('docs') || stage === 'docs' ? `${scheme === 'pmsg' ? 'NP-GA' : 'GSP'}${24000 + i * 37}` : '',
            date: past('docs') || stage === 'docs' ? d(-wonDays + 18) : '',
            query: stage === 'docs' && subIdx >= 3 ? 'Electricity bill name does not match applicant; upload ownership proof.' : '',
          },
    },
    procurement: {
      confirmedDate: past('procurement') || (stage === 'procurement' && subIdx >= 1) ? d(-wonDays + 35) : '',
      supplier: kw > 20 ? 'Waaree Energies (via Sunline Electricals)' : 'Adani Solar (via Konkan Solar Mart)',
      materialReady: past('procurement') ? 'Ready' : stage === 'procurement' ? 'Partially ready' : 'Not ready',
      fabrication: kw > 20 ? 'Hot-dip galvanised elevated structure, 2.4 m clearance' : 'GI structure, 0.6 m clearance',
      plannedInstallDate: reached('procurement') ? d(-wonDays + 50 > 0 ? 6 : -wonDays + 50) : '',
      siteReady: past('procurement') ? 'Yes' : 'Pending customer clearance',
      prerequisites: stage === 'procurement' ? 'Customer to clear roof storage area' : '',
    },
    installation: {
      tasks: ['Fabrication and structure', 'Earthing', 'Wiring', 'Testing', 'Installation upload'].map((name, j) => ({
        name,
        assignee: j < 2 ? 'u-manoj' : instOwner,
        planned: d(-wonDays + 52 + j * 2),
        done: past('installation') || (stage === 'installation' && j < subIdx) ? d(-wonDays + 53 + j * 2) : '',
      })),
      actualDate: past('installation') ? d(-wonDays + 62) : '',
      observations: past('installation') ? 'Inverter mounted in shaded utility area; string voltages within range.' : '',
    },
    milestones: UTILITY_MILESTONES.map((m, j) => ({
      key: m.key,
      status: past('post') ? 'Done' : stage === 'post' ? (j < subIdx + 1 ? 'Done' : j === subIdx + 1 ? (i === 2 ? 'Query raised' : 'In progress') : 'Not started') : scheme === 'none' && m.key === 'portalUpload' ? 'Not applicable' : 'Not started',
      date: past('post') || (stage === 'post' && j < subIdx + 1) ? d(-wonDays + 70 + j * 4) : '',
      note: stage === 'post' && j === subIdx + 1 && i === 2 ? 'DISCOM asked for revised single-line diagram.' : '',
    })),
    subsidy: scheme === 'none' ? 'Not applicable' : stage === 'om' ? 'Credited' : stage === 'commissioning' ? 'Submitted' : stage === 'post' ? 'Not started' : 'Not started',
    commissioning: {
      date: past('commissioning') || (stage === 'commissioning' && subIdx >= 1) ? d(-stageDays + 2) : '',
      outcome: past('commissioning') || (stage === 'commissioning' && subIdx >= 1) ? 'Commissioned, generation verified' : '',
      handoverChecklist: past('commissioning'),
      warrantyStart: past('commissioning') ? d(-stageDays) : '',
      warrantyEnd: past('commissioning') ? d(-stageDays + 365 * 10) : '',
      omStart: past('commissioning') ? d(-stageDays) : '',
    },
    serviceIssues: stage === 'om' && i === 0 ? [{ id: 'SI-1', title: 'Inverter showing grid fault in mornings', status: 'Open', raisedAt: d(-5) }] : [],
    drive: { root: null, stages: {} },
  }
  p.checklist = checklistUpTo(stage, subIdx, p)
  if (stage === 'won' && subIdx >= 1) p.checklist.won = { proposal: true, closeEvidence: true, scheme: true, driveRoot: false }

  // Drive links: most projects have a root and the subfolders they have reached.
  if (i !== 10) {
    p.drive.root = driveUrl()
    DRIVE_FOLDERS.forEach((f, j) => {
      const map = { sales: 'won', survey: 'survey', docs: 'docs', procurement: 'procurement', installation: 'installation', approvals: 'post', handover: 'commissioning' }
      if (reached(map[f.key]) || j === 0) p.drive.stages[f.key] = driveUrl()
    })
    if (i === 7) p.drive.stages.docs = 'https://drive.google.com/broken-link'
  }

  if (i === 5) {
    p.blocked = { kind: 'Blocked', waitingOn: 'Supplier: inverter shipment delayed', nextAction: 'Confirm revised dispatch date with Sunline', party: 'u-joel', reviewDate: d(2) }
  }
  return p
})

// Original leads for won projects (kept for history).
PROJECTS.forEach((p, i) => {
  LEADS.push({
    id: p.leadId,
    createdAt: ts(projectSeeds[i][13] + 20 + (i % 4) * 6, 10),
    createdBy: p.owner,
    type: p.type,
    source: p.source,
    referrer: p.source === 'Referral' ? 'Existing client' : '',
    contact: p.contact,
    businessName: p.businessName,
    phone: p.phone,
    email: p.email,
    address: p.address,
    district: p.district,
    taluka: p.taluka,
    consumerNo: p.consumerNo,
    owner: p.owner,
    stage: 'sales',
    substage: p.type === 'commercial' ? 'Fourth meeting' : 'Second meeting',
    status: 'won',
    lastMovedAt: ts(projectSeeds[i][13], 16),
    nextAction: 'Converted to project',
    nextActionDate: '',
    estimatedKw: p.capacityKw,
    meetings: buildMeetings(p.type === 'commercial' ? 'Fourth meeting' : 'Second meeting', 20).map((m) => ({ ...m, date: daysFromToday(-projectSeeds[i][13] - 20 + m.n * 5), nextDate: daysFromToday(-projectSeeds[i][13] - 15 + m.n * 5) })),
    surveyRequested: true,
    surveyor: 'u-pradeep',
    lostReason: '',
    lostAt: '',
    projectId: p.id,
    wonAt: p.wonDate,
    mergedInto: null,
  })
})

// A duplicate pair for the merge flow.
LEADS.push({
  ...LEADS[0],
  id: `ECR-L-${year}-046`,
  createdAt: ts(3, 12),
  createdBy: 'u-sneha',
  owner: 'u-sneha',
  stage: 'lead',
  substage: 'New',
  source: 'Phone enquiry',
  referrer: '',
  lastMovedAt: ts(3, 12),
  meetings: [],
  nextAction: 'Call back about rooftop enquiry',
  nextActionDate: d(0),
})

// ---------------- tasks ----------------

const taskTemplates = {
  won: [['Create Drive project folder', 'u-kavita', true]],
  survey: [['Complete site survey and roof photos', 'u-pradeep', true], ['Prepare layout and design v1', 'u-pradeep', true], ['Review design with customer', 'OWNER', false]],
  docs: [['Collect pending customer documents', 'u-kavita', true], ['Submit portal application', 'u-kavita', true], ['Follow up loan sanction with bank', 'u-kavita', false], ['Respond to portal query', 'u-kavita', true]],
  procurement: [['Confirm inverter dispatch', 'INST', true], ['Fabricate structure', 'u-manoj', true], ['Confirm installation date with customer', 'OWNER', true]],
  installation: [['Fabrication and structure', 'u-manoj', true], ['Earthing', 'u-manoj', true], ['Wiring and DB connection', 'INST', true], ['System testing', 'INST', true], ['Upload installation photos to Drive', 'INST', true]],
  post: [['Net-meter agreement signature', 'u-kavita', true], ['Net-meter application to DISCOM', 'u-kavita', true], ['Submit revised single-line diagram', 'INST', true], ['Book joint inspection', 'u-kavita', true]],
  commissioning: [['Prepare handover pack', 'u-kavita', true], ['Customer training on monitoring app', 'INST', false], ['Submit subsidy claim', 'u-kavita', false]],
  om: [['Six-month preventive maintenance visit', 'u-manoj', false]],
}

let taskN = 100
export const TASKS = []
PROJECTS.forEach((p, pi) => {
  const st = p.stage
  const idx = stageOrder.indexOf(st)
  stageOrder.forEach((k, ki) => {
    if (ki > idx) return
    const temps = taskTemplates[k] || []
    temps.forEach(([title, who, required], ti) => {
      const assignee = who === 'OWNER' ? p.owner : who === 'INST' ? p.installationOwner : who
      const isPast = ki < idx
      const subIdx = STAGES.find((s) => s.key === st).substages.indexOf(p.substage)
      let status = 'Completed'
      let due = daysFromToday(-(idx - ki) * 9 - ti)
      let completedAt = due
      if (!isPast) {
        if (ti < subIdx) {
          status = 'Completed'
          due = daysFromToday(-3 - ti)
          completedAt = due
        } else {
          completedAt = ''
          const variants = [
            ['In Progress', 2],
            ['To Do', -2],
            ['Waiting', 4],
            ['To Do', 0],
            ['Under Review', 1],
            ['To Do', 6],
            ['Blocked', -1],
          ]
          const [s, off] = variants[(pi + ti) % variants.length]
          status = s
          due = daysFromToday(off + (ti % 2))
          if (p.blocked && ti === subIdx) status = 'Blocked'
        }
      }
      taskN += 1
      TASKS.push({
        id: `T-${taskN}`,
        projectId: p.id,
        leadId: null,
        title,
        stage: k,
        assignee,
        due,
        priority: ['Medium', 'High', 'Low', 'Urgent', 'Medium'][(pi + ti) % 5],
        status,
        required,
        blocker: status === 'Blocked' ? (p.blocked?.waitingOn || 'Waiting for customer to clear site') : status === 'Waiting' ? 'Customer to share documents' : '',
        completedAt,
        requiresDrive: /upload|photos|folder/i.test(title),
        createdAt: ts(Math.max(1, (idx - ki) * 9 + 6), 9),
        createdBy: p.owner,
        comments: status !== 'Completed' && ti === subIdx
          ? [{ id: `c-${taskN}`, by: assignee, at: ts(1, 17), text: status === 'Blocked' ? 'Escalated to supplier, no revised date yet.' : 'Started; will update by tomorrow.' }]
          : [],
      })
    })
  })
})

// Lead tasks.
LEADS.filter((l) => l.status === 'open' && !l.projectId).slice(0, 6).forEach((l, i) => {
  taskN += 1
  TASKS.push({
    id: `T-${taskN}`,
    projectId: null,
    leadId: l.id,
    title: i % 2 ? `Schedule site survey for ${l.contact}` : `Send revised quotation to ${l.contact}`,
    stage: 'sales',
    assignee: i % 2 ? 'u-pradeep' : l.owner,
    due: daysFromToday([-1, 0, 2, 5, -4, 1][i]),
    priority: ['High', 'Medium', 'Medium', 'Low', 'High', 'Medium'][i],
    status: ['To Do', 'In Progress', 'To Do', 'To Do', 'Waiting', 'To Do'][i],
    required: false,
    blocker: i === 4 ? 'Customer travelling until next week' : '',
    completedAt: '',
    requiresDrive: false,
    createdAt: ts(4 + i, 9),
    createdBy: l.owner,
    comments: [],
  })
})

// ---------------- approvals ----------------

export const APPROVALS = [
  {
    id: 'AP-201',
    type: 'won',
    entity: 'lead',
    entityId: LEADS[7].id,
    requestedBy: 'u-sneha',
    requestedAt: ts(1, 12),
    status: 'pending',
    payload: { evidence: 'Signed work order WO-ECR-1182 received from principal', proposalAccepted: true, workOrder: true, advance: false, capacityKw: 40, value: 1840000, scheme: 'goa-rooftop', comment: 'Board approved in last meeting; advance cheque expected next week.' },
  },
  {
    id: 'AP-202',
    type: 'loss',
    entity: 'lead',
    entityId: LEADS[6].id,
    requestedBy: 'u-aditya',
    requestedAt: ts(2, 15),
    status: 'pending',
    payload: { category: 'Chose a competitor', explanation: 'Customer went with a cheaper local installer at ₹48k/kWp after second meeting.', date: d(-2) },
  },
  {
    id: 'AP-203',
    type: 'installation_reassign',
    entity: 'project',
    entityId: PROJECTS[4].id,
    requestedBy: 'u-aditya',
    requestedAt: ts(1, 10),
    status: 'pending',
    payload: { from: 'u-manoj', to: 'u-joel', reason: 'Manoj is on the Bicholim site all week; Joel can cover Navelim installation.' },
  },
  {
    id: 'AP-204',
    type: 'owner_reassign',
    entity: 'lead',
    entityId: LEADS[11].id,
    requestedBy: 'u-aditya',
    requestedAt: ts(3, 11),
    status: 'pending',
    payload: { from: 'u-tanvi', to: 'u-aditya', reason: 'Tanvi has left the sales team; lead has had no follow-up for 40 days.' },
  },
  {
    id: 'AP-190',
    type: 'loss',
    entity: 'lead',
    entityId: LEADS[12].id,
    requestedBy: 'u-aditya',
    requestedAt: ts(14, 10),
    status: 'approved',
    decidedBy: 'u-rhea',
    decidedAt: LEADS[12].lostAt + 'T10:00:00.000Z',
    decisionComment: 'Confirmed with customer on call.',
    payload: { category: LOSS_REASONS[0], explanation: 'Budget capped at ₹1.5 L, not workable for 4 kWp.', date: d(-12) },
  },
  {
    id: 'AP-186',
    type: 'loss',
    entity: 'lead',
    entityId: LEADS[13].id,
    requestedBy: 'u-sneha',
    requestedAt: ts(33, 10),
    status: 'approved',
    decidedBy: 'u-rhea',
    decidedAt: LEADS[13].lostAt + 'T10:00:00.000Z',
    decisionComment: 'Competitor offered 10-year AMC bundled. Note for pricing review.',
    payload: { category: LOSS_REASONS[1], explanation: 'Lost to a Pune EPC on bundled AMC.', date: d(-30) },
  },
  {
    id: 'AP-180',
    type: 'loss',
    entity: 'lead',
    entityId: LEADS[4].id,
    requestedBy: 'u-sneha',
    requestedAt: ts(40, 10),
    status: 'rejected',
    decidedBy: 'u-rhea',
    decidedAt: ts(39, 12),
    decisionComment: 'Still in negotiation per MD. Keep active and book a fourth meeting.',
    payload: { category: 'Customer postponed', explanation: 'Customer asked to revisit next quarter.', date: d(-40) },
  },
]

// ---------------- audit / workflow events ----------------

let evN = 1
const ev = (o) => ({ id: `E-${evN++}`, ...o })
export const EVENTS = []

PROJECTS.forEach((p, i) => {
  const idx = stageOrder.indexOf(p.stage)
  const wonDays = projectSeeds[i][13]
  EVENTS.push(ev({ entity: 'lead', entityId: p.leadId, type: 'created', actor: p.owner, at: ts(wonDays + 26, 10), comment: `Lead created from ${p.source.toLowerCase()}.` }))
  EVENTS.push(ev({ entity: 'lead', entityId: p.leadId, type: 'approval', actor: 'u-rhea', at: ts(wonDays, 16), comment: 'Won approved. Signed work order verified.', to: 'Won' }))
  EVENTS.push(ev({ entity: 'project', entityId: p.id, type: 'created', actor: 'u-rhea', at: ts(wonDays, 16), comment: `Project created from lead ${p.leadId}.` }))
  for (let k = 1; k <= idx; k++) {
    const from = STAGES.find((s) => s.key === stageOrder[k - 1])
    const to = STAGES.find((s) => s.key === stageOrder[k])
    const daysAgo = Math.round(wonDays - ((wonDays - projectSeeds[i][12]) * k) / Math.max(1, idx))
    EVENTS.push(ev({
      entity: 'project', entityId: p.id, type: 'stage_change', actor: p.owner, at: ts(daysAgo, 14),
      from: `${from.name} / ${from.substages[from.substages.length - 1]}`,
      to: `${to.name} / ${to.substages[0]}`,
      comment: ['Survey booked with customer.', 'Design approved; moving to paperwork.', 'All documents verified, portal approved.', 'Material dispatched to site.', 'Installation done and tested.', 'DISCOM approval received.', 'Handover pack delivered.'][k - 1] || 'Moved forward.',
    }))
  }
  if (i === 1) {
    EVENTS.push(ev({ entity: 'project', entityId: p.id, type: 'override', actor: 'u-rhea', at: ts(40, 18), from: 'Documentation, scheme and finance', to: 'Procurement and pre-installation', reason: 'Portal approval received by email; portal status not yet updated.', comment: 'Gate override recorded by admin.' }))
  }
  if (p.blocked) {
    EVENTS.push(ev({ entity: 'project', entityId: p.id, type: 'blocked', actor: p.owner, at: ts(3, 12), comment: `Blocked: ${p.blocked.waitingOn}. Next action: ${p.blocked.nextAction}.` }))
  }
  if (p.drive.root) {
    EVENTS.push(ev({ entity: 'project', entityId: p.id, type: 'drive_link', actor: 'u-kavita', at: ts(wonDays - 1, 11), comment: 'Project root Drive folder linked.' }))
  }
})

LEADS.forEach((l) => {
  if (l.projectId) return
  EVENTS.push(ev({ entity: 'lead', entityId: l.id, type: 'created', actor: l.createdBy, at: l.createdAt, comment: `Lead created from ${l.source.toLowerCase()}${l.referrer ? `, referred by ${l.referrer}` : ''}.` }))
  l.meetings.forEach((m) => {
    EVENTS.push(ev({ entity: 'lead', entityId: l.id, type: 'stage_change', actor: l.owner, at: m.date + 'T11:30:00.000Z', to: `Sales / ${['First', 'Second', 'Third', 'Fourth'][m.n - 1]} meeting`, comment: m.comment }))
  })
})

EVENTS.push(ev({ entity: 'config', entityId: 'schemes', type: 'config', actor: 'u-rhea', at: ts(20, 10), comment: 'PM-KUSUM Component B and C kept disabled pending GEDA confirmation.' }))
EVENTS.push(ev({ entity: 'user', entityId: 'u-tanvi', type: 'config', actor: 'u-rhea', at: ts(18, 10), comment: 'Disabled user Tanvi Borkar.' }))

EVENTS.sort((a, b) => (a.at < b.at ? 1 : -1))

export const DEFAULT_SETTINGS = {
  wonCondition: WON_CONDITIONS[2].key,
  staleDays: 21,
  dueSoonDays: 7,
  fyBasis: 'fy',
  folderPattern: '{projectId} {clientShort}',
  driveMode: 'manual',
  allowTaskOwnersCreateLeads: false,
}
