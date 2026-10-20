-- Seed workflow config from BRD / frontend config.js

insert into public.app_settings (id) values ('default')
on conflict (id) do nothing;

insert into public.schemes (key, name, portal, types, active, subsidy, note, sort_order) values
  ('pmsg', 'PM Surya Ghar', 'National Portal for Rooftop Solar', '{residential}', true, true, null, 1),
  ('goa-rooftop', 'Goa rooftop programme', 'Goa Solar Portal (GEDA)', '{residential,commercial}', true, true, null, 2),
  ('none', 'No scheme (private)', null, '{residential,commercial}', true, false, null, 3),
  ('kusum-b', 'PM-KUSUM Component B', 'GEDA PM-KUSUM', '{commercial}', false, true,
   'Disabled until GEDA confirms the current scheme window and allocation.', 4),
  ('kusum-c', 'PM-KUSUM Component C', 'GEDA PM-KUSUM', '{commercial}', false, true,
   'Disabled until GEDA confirms the current scheme window and allocation.', 5);

insert into public.workflow_stages (key, name, short_name, folder_key, sort_order, is_project_stage) values
  ('lead', 'Lead or referral', 'Lead', 'sales', 1, false),
  ('sales', 'Sales', 'Sales', 'sales', 2, false),
  ('won', 'Won and client creation', 'Won', 'sales', 3, true),
  ('survey', 'Technical survey and design', 'Survey', 'survey', 4, true),
  ('docs', 'Documentation, scheme and finance', 'Docs', 'docs', 5, true),
  ('procurement', 'Procurement and pre-installation', 'Procure', 'procurement', 6, true),
  ('installation', 'Installation', 'Install', 'installation', 7, true),
  ('post', 'Post-installation and utility approvals', 'Approvals', 'approvals', 8, true),
  ('commissioning', 'Commissioning and handover', 'Handover', 'handover', 9, true),
  ('om', 'Operations and maintenance', 'O&M', 'handover', 10, true);

insert into public.workflow_substages (stage_key, name, sort_order) values
  ('lead', 'New', 1), ('lead', 'Contacted', 2),
  ('sales', 'First meeting', 1), ('sales', 'Second meeting', 2),
  ('sales', 'Third meeting', 3), ('sales', 'Fourth meeting', 4),
  ('won', 'Won approved', 1), ('won', 'Client created', 2),
  ('survey', 'Survey requested', 1), ('survey', 'Survey scheduled', 2),
  ('survey', 'Survey completed', 3), ('survey', 'Design in progress', 4), ('survey', 'Design approved', 5),
  ('docs', 'Vendor agreement', 1), ('docs', 'Customer documents', 2),
  ('docs', 'Loan processing', 3), ('docs', 'Portal submission', 4), ('docs', 'Documentation complete', 5),
  ('procurement', 'Procurement confirmed', 1), ('procurement', 'Material ready', 2),
  ('procurement', 'Site ready', 3), ('procurement', 'Installation planned', 4),
  ('installation', 'Fabrication and structure', 1), ('installation', 'Earthing', 2),
  ('installation', 'Wiring', 3), ('installation', 'Testing', 4), ('installation', 'Installation upload', 5),
  ('post', 'Net-meter agreement', 1), ('post', 'Net-meter application', 2),
  ('post', 'Portal upload', 3), ('post', 'Inspection', 4),
  ('post', 'DISCOM approval', 5), ('post', 'Documents shared', 6),
  ('commissioning', 'Commissioning', 1), ('commissioning', 'Handover pack', 2),
  ('commissioning', 'Handover complete', 3),
  ('om', 'Active O&M', 1);

insert into public.checklist_items (stage_key, key, label, required, schemes, types, sort_order) values
  ('won', 'proposal', 'Accepted proposal on file', true, null, null, 1),
  ('won', 'closeEvidence', 'Close evidence recorded (work order or advance)', true, null, null, 2),
  ('won', 'scheme', 'Scheme or portal path selected', true, null, null, 3),
  ('won', 'driveRoot', 'Project Drive folder linked', true, null, null, 4),
  ('survey', 'surveyDone', 'Site survey completed', true, null, null, 1),
  ('survey', 'feasibility', 'Feasibility outcome recorded', true, null, null, 2),
  ('survey', 'capacity', 'Proposed DC/AC capacity confirmed', true, null, null, 3),
  ('survey', 'design', 'Design approved', true, null, null, 4),
  ('survey', 'surveyDrive', 'Survey photos in Drive', false, null, null, 5),
  ('docs', 'vendorAgreement', 'Vendor agreement signed', true, null, null, 1),
  ('docs', 'customerDocs', 'Customer documents verified', true, null, null, 2),
  ('docs', 'loanSettled', 'Loan approved or not applicable', true, null, null, 3),
  ('docs', 'portalOnboarded', 'Portal onboarding approved', true, '{pmsg,goa-rooftop,kusum-b,kusum-c}', null, 4),
  ('docs', 'demandRecorded', 'Sanctioned or contract demand recorded', true, null, '{commercial}', 5),
  ('procurement', 'procurementConfirmed', 'Procurement confirmed with supplier', true, null, null, 1),
  ('procurement', 'materialReady', 'Material ready for dispatch', true, null, null, 2),
  ('procurement', 'siteReady', 'Site readiness confirmed with customer', true, null, null, 3),
  ('procurement', 'installPlan', 'Installation date planned', true, null, null, 4),
  ('installation', 'structure', 'Fabrication and structure done', true, null, null, 1),
  ('installation', 'earthing', 'Earthing done', true, null, null, 2),
  ('installation', 'wiring', 'Wiring done', true, null, null, 3),
  ('installation', 'testing', 'Testing passed', true, null, null, 4),
  ('installation', 'installUpload', 'Installation photos uploaded to Drive', true, null, null, 5),
  ('post', 'nmAgreement', 'Net-meter agreement signed', true, null, null, 1),
  ('post', 'nmInstalled', 'Net meter applied and installed', true, null, null, 2),
  ('post', 'portalUpload', 'Portal upload done', true, '{pmsg,goa-rooftop,kusum-b,kusum-c}', null, 3),
  ('post', 'inspection', 'Inspection passed', true, null, null, 4),
  ('post', 'discom', 'DISCOM approval received', true, null, null, 5),
  ('post', 'docsShared', 'Documents shared with customer', true, null, null, 6),
  ('commissioning', 'commissioned', 'Commissioning date and outcome recorded', true, null, null, 1),
  ('commissioning', 'handoverChecklist', 'Handover checklist complete', true, null, null, 2),
  ('commissioning', 'customerDocs', 'Customer documents shared', true, null, null, 3),
  ('commissioning', 'warranty', 'Warranty and O&M dates recorded', true, null, null, 4);

insert into public.loss_reasons (label, sort_order) values
  ('Price too high', 1),
  ('Chose a competitor', 2),
  ('Roof or site not feasible', 3),
  ('Finance not available', 4),
  ('Customer postponed', 5),
  ('No response from customer', 6),
  ('Scheme not eligible', 7);

insert into public.drive_folder_defs (key, name, hint, sort_order) values
  ('sales', '01 Sales', 'Proposal, meeting summary, referral record', 1),
  ('survey', '02 Survey and Design', 'Survey notes, roof photos, layout, design revisions', 2),
  ('docs', '03 Documentation and Finance', 'Agreement, customer checklist, loan documents', 3),
  ('procurement', '04 Procurement and Fabrication', 'Supplier confirmation, fabrication and structure details', 4),
  ('installation', '05 Installation', 'Installation photos, test records, commissioning preparation', 5),
  ('approvals', '06 Approvals and Scheme', 'Portal receipts, net-meter, inspection, DISCOM, subsidy evidence', 6),
  ('handover', '07 Handover and O&M', 'Handover pack, warranty, manuals, O&M records', 7);
