// Mocked government systems. Deterministic per case - the "tool layer" the
// agent calls. In production these would be registry/payment/policy services.

const POLICY_RULES = {
  'case-01': [
    { id: 'documents_complete', label_en: 'Required documents on file', label_ar: 'المستندات المطلوبة مرفقة', result: 'pass', detail_en: '4/4 documents received: licence copy, Ejari EJ-881204, partner passports, manager EID.', detail_ar: '4/4 مستندات مستلمة: نسخة الرخصة، إيجاري EJ-881204، جوازات الشركاء، هوية المدير.' },
    { id: 'licence_status', label_en: 'Licence status valid', label_ar: 'حالة الرخصة سارية', result: 'pass', detail_en: 'Licence AZ-40291 is active, not suspended or revoked.', detail_ar: 'الرخصة AZ-40291 سارية وغير موقوفة أو ملغاة.' },
    { id: 'renewal_window', label_en: 'Inside renewal window', label_ar: 'ضمن فترة التجديد', result: 'pass', detail_en: 'Expiry 30 Oct 2026 is within the 60-day renewal window.', detail_ar: 'تاريخ الانتهاء 30 أكتوبر 2026 ضمن فترة التجديد البالغة 60 يوماً.' },
    { id: 'fee_schedule', label_en: 'Fee matches schedule', label_ar: 'الرسوم مطابقة للجدول', result: 'pass', detail_en: 'AED 3,200 matches fee schedule item 7.1 for commercial renewal.', detail_ar: 'مبلغ 3,200 درهم مطابق للبند 7.1 من جدول رسوم التجديد التجاري.' },
  ],
  'case-02': [
    { id: 'documents_complete', label_en: 'Required documents on file', label_ar: 'المستندات المطلوبة مرفقة', result: 'pass', detail_en: 'Structural drawings and Civil Defence no-objection letter received.', detail_ar: 'المخططات الإنشائية وخطاب عدم ممانعة الدفاع المدني مستلمة.' },
    { id: 'zoning_compliance', label_en: 'Zoning compliance', label_ar: 'مطابقة التصنيف', result: 'fail', ambiguous: true, detail_en: 'Proposed 9.2m exceeds R-2 height limit 8.0m. Applicant cites s7.3 variance (Civil Defence egress) - discretionary call.', detail_ar: 'الارتفاع المقترح 9.2م يتجاوز حد R-2 البالغ 8.0م. يستشهد مقدم الطلب بالاستثناء 7.3 (مخرج دفاع مدني) - قرار تقديري.' },
    { id: 'contractor_licence', label_en: 'Contractor licence valid', label_ar: 'رخصة المقاول سارية', result: 'pass', detail_en: 'Buildcrest Contracting LLC, licence AZ-55610, active.', detail_ar: 'شركة بيلدكريست للمقاولات، الرخصة AZ-55610، سارية.' },
    { id: 'owner_consent', label_en: 'Owner consent', label_ar: 'موافقة المالك', result: 'pass', detail_en: 'Owner authorisation on file for plot 118.', detail_ar: 'تفويض المالك مرفق للقطعة 118.' },
  ],
  'case-03': [
    { id: 'documents_complete', label_en: 'Required documents on file', label_ar: 'المستندات المطلوبة مرفقة', result: 'pass', detail_en: 'Board resolution and signatory Emirates ID received.', detail_ar: 'قرار مجلس الإدارة ونسخة هوية المفوض مستلمان.' },
    { id: 'activity_permitted', label_en: 'Activity permitted', label_ar: 'النشاط مسموح', result: 'pass', detail_en: 'E-Commerce - Retail (4791) is permitted under the General Trading category.', detail_ar: 'نشاط التجارة الإلكترونية - تجزئة (4791) مسموح ضمن فئة التجارة العامة.' },
    { id: 'signatory_authority', label_en: 'Signatory authority', label_ar: 'صلاحية التوقيع', result: 'pass', detail_en: 'Khalid Al Mansoori is a registered partner on the licence file.', detail_ar: 'خالد المنصوري شريك مسجل في ملف الرخصة.' },
    { id: 'fee_balance', label_en: 'Outstanding balance', label_ar: 'رصيد مستحق', result: 'warn', detail_en: 'Registry shows AED 250 outstanding - appended to amendment invoice.', detail_ar: 'يظهر السجل رصيداً مستحقاً 250 درهماً - أُضيف إلى فاتورة التعديل.' },
  ],
  'case-04': [
    { id: 'documents_complete', label_en: 'Required documents on file', label_ar: 'المستندات المطلوبة مرفقة', result: 'pass', detail_en: 'Audited revenue statement FY 2025 received.', detail_ar: 'بيان الإيراد المدقق للسنة 2025 مستلم.' },
    { id: 'waiver_eligibility', label_en: 'Waiver eligibility threshold', label_ar: 'حد أهلية الإعفاء', result: 'fail', ambiguous: true, detail_en: 'Revenue AED 412,300 exceeds AED 400,000 threshold by 3.1%. Hardship provision invoked - discretionary.', detail_ar: 'الإيراد 412,300 درهم يتجاوز الحد 400,000 درهم بنسبة 3.1%. استُند إلى بند الاستثناء - قرار تقديري.' },
    { id: 'compliance_history', label_en: 'Compliance history', label_ar: 'سجل الامتثال', result: 'pass', detail_en: '11 years licensed, zero violations.', detail_ar: 'رخصة قائمة منذ 11 عاماً دون مخالفات.' },
    { id: 'payment_record', label_en: 'Payment record', label_ar: 'سجل السداد', result: 'pass', detail_en: 'No late or missed payments on file.', detail_ar: 'لا توجد مدفوعات متأخرة أو فائتة في السجل.' },
  ],
  'case-05': [
    { id: 'documents_complete', label_en: 'Required documents on file', label_ar: 'المستندات المطلوبة مرفقة', result: 'fail', ambiguous: false, missing_en: ['Executed tenancy contract (Ejari)', 'Emirates ID copy - second partner', 'Activity code from licensed schedule'], missing_ar: ['عقد الإيجار الموقع (إيجاري)', 'نسخة الهوية الإماراتية - الشريك الثاني', 'رمز النشاط من جدول الأنشطة'], detail_en: 'Missing: tenancy contract, partner EID copy, activity code.', detail_ar: 'نواقص: عقد الإيجار، نسخة هوية الشريك، رمز النشاط.' },
    { id: 'trade_name_available', label_en: 'Trade name available', label_ar: 'الاسم التجاري متاح', result: 'pass', detail_en: 'Crestline Events Management - no conflict found.', detail_ar: 'كريستلاين لإدارة الفعاليات - لا يوجد تعارض.' },
    { id: 'legal_form', label_en: 'Legal form acceptable', label_ar: 'الشكل القانوني مقبول', result: 'pass', detail_en: 'LLC in formation is acceptable for initial filing.', detail_ar: 'شكل ذ.م.م قيد التأسيس مقبول للتقديم الأولي.' },
  ],
}

const REGISTRY = {
  'case-01': {
    licence_no: 'AZ-40291', legal_name: 'Falcon Ridge Trading LLC', status: 'active',
    issued: '2019-10-30', expires: '2026-10-30', activity: 'General Trading (4690)',
    partners: [{ name: 'Mariam Al Mansoori', role: 'Manager' }, { name: 'Khalid Al Mansoori', role: 'Partner' }],
    violations: 0, parallel_filings: [],
  },
  'case-02': {
    plot: '118, Al Waha District', zone: 'Residential R-2', height_limit_m: 8.0,
    contractor_licence: 'AZ-55610', contractor_status: 'active',
    owner_registered: 'Hamdan Al Nuaimi', violations: 0, parallel_filings: [],
  },
  'case-03': {
    licence_no: 'AZ-40291', legal_name: 'Falcon Ridge Trading LLC', status: 'active',
    issued: '2019-10-30', expires: '2026-10-30', activity: 'General Trading (4690)',
    partners: [{ name: 'Mariam Al Mansoori', role: 'Manager' }, { name: 'Khalid Al Mansoori', role: 'Partner' }],
    violations: 0,
    parallel_filings: [{ ref: 'GOV-2026-01427', type: 'trade_licence_renewal', status: 'in_progress' }],
  },
  'case-04': {
    licence_no: 'AZ-31875', legal_name: 'Al Noor Bakery LLC', status: 'active',
    issued: '2015-02-11', expires: '2027-02-10', activity: 'Bakery - Food Preparation (1071)',
    owner: 'Nadim Issa', heritage_zone: true, violations: 0, parallel_filings: [],
  },
  'case-05': {
    licence_no: null, trade_name_available: true, similar_names: [],
    formation_status: 'not_yet_registered', parallel_filings: [],
  },
}

const PAYMENTS = {
  'case-01': { account: 'AZ-40291', balance_due: 0, last_payment: { date: '2025-10-22', amount_aed: 3200, method: 'corporate_card' }, disputes: 0 },
  'case-02': { account: 'permit-118', balance_due: 2450, last_payment: null, disputes: 0 },
  'case-03': { account: 'AZ-40291', balance_due: 250, balance_note: 'late fee, Aug 2026 filing', last_payment: { date: '2025-10-22', amount_aed: 3200, method: 'corporate_card' }, disputes: 0 },
  'case-04': { account: 'AZ-31875', balance_due: 1800, next_due: '2027-02-10', last_payment: { date: '2025-02-05', amount_aed: 1800, method: 'bank_transfer' }, disputes: 0 },
  'case-05': { account: null, balance_due: 0, last_payment: null, disputes: 0 },
}

export function policyEngine(caseId) {
  return { engine: 'AZ-POLICY-v3.2', evaluated_at: new Date().toISOString(), rules: POLICY_RULES[caseId] ?? [] }
}
export function registryApi(caseId) {
  return REGISTRY[caseId] ?? {}
}
export function paymentsApi(caseId) {
  return PAYMENTS[caseId] ?? {}
}

export function fileToCaseRecord(caseRec, decision) {
  return {
    filed_to: 'CASEFILE/' + caseRec.ref,
    queue: decision.action === 'escalate' ? 'SENIOR-OFFICER' : decision.action === 'request_info' ? 'OFFICER-OUTBOUND' : 'OFFICER-APPROVAL',
    sla_hours: caseRec.slaHours,
    filed_at: new Date().toISOString(),
  }
}
