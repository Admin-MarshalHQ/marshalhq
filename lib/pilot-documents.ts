import { createHash } from "node:crypto";
import { z } from "zod";

// Fill these factual disclosures from the restricted release record. Empty or
// incomplete configuration keeps admissions closed. No addresses ship in code.
const Disclosure = z.object({
  businessAddress: z.string().trim().min(1),
  contactEmail: z.string().email(),
  providersAndTransfers: z.string().trim().min(1),
  retention: z.string().trim().min(1),
});

export const digest = (text: string) => createHash("sha256").update(text).digest("hex");

export function pilotDocuments() {
  let raw: unknown;
  try { raw = JSON.parse(process.env.SETRU_PILOT_DISCLOSURES ?? "null"); } catch { return null; }
  const result = Disclosure.safeParse(raw);
  if (!result.success) return null;
  const d = result.data;
  const operator = `Samuel Blake trading as Setru, ${d.businessAddress}. Contact ${d.contactEmail} or use https://setru.co.uk/support.`;
  const terms = `Private pilot participant terms

Operator: ${operator}

Setru helps authorised direct hirers advertise ordinary location marshal work in Great Britain, receive applications, select individuals and record outcomes. The pilot is for invited adults aged 18 and over. Use one personal account and give accurate information. You can stop using Setru and use other work-finding services at any time.

The hirer is our customer for hiring services. The person applying is our customer for work-finding services. Both use this pilot free of charge. We do not handle wages, make deductions, employ the marshal, or have authority to bind either party to a contract. We do not guarantee work, payment or applicants. The identified hirer directly engages, supervises and pays the person booked. The specific vacancy and agreed changes form part of that separate engagement.

Hirers must obtain authority before advertising; identify the legal hirer, duties, work location, dates, daily call and wrap, capacity, rate and unit, pay interval, benefits, expenses, notice, cancellation terms, known risks and controls, and any qualifications or authorisations. Tell applicants which items do not apply and obtain their agreement before changing material terms. Select people fairly for relevant requirements. The responsible hirer or employer must fulfil applicable status, right-to-work, pay, working-time, holiday and safety duties and provide induction and supervision. Setru remains responsible for its own work-finding duties.

Marshals should apply only when willing and available for the named hirer, dates and terms. Ask Support before applying to a current employer so Setru can check any separate permission needed before disclosure. Email verification establishes control of an inbox. Profile details are self-reported unless a particular check is identified.

Applying discloses the named profile and cover note to the posting manager. Each acceptance books one person and makes that pair’s booking contacts available, including on a partially filled shift. Access ends seven days after the final wrap or at the last retained wrap after release of future calls. Withdrawal, cancellation, a pause or account disablement can end access earlier. Use contacts only to coordinate or follow up that booking. Keep email, phone and messaging handles out of briefs, profiles, reviews and notes. Do not circulate booking contacts or add people to marketing lists or groups.

Tell the other party promptly about withdrawals, cancellations, changed dates or a problem getting to the call. Record actual attendance for each person and call. Preserve earlier work on an agreed release. Use Support to correct a record, raise a safety issue or challenge feedback. Mandatory rights and any pay or notice due under the engagement remain unaffected.

We may pause access or a vacancy to address unsafe or misleading work, contact misuse or a material breach. We explain the reason where safe and lawful and consider a request for review. You may ask Support to close your account. Discuss outstanding engagements with the other party. We ask for fresh agreement on material changes. No term excludes liability for fraud, death or personal injury caused by negligence, or any liability or right that the law does not allow us to exclude.`;
  const notice = `Private pilot privacy notice

Controller: ${operator}

Before registration we use the email you enter to check for an invitation for that address and role and send a short-lived code. We use account, verification, password hash, eligibility and session records to provide and secure the service. Managers provide their name and company; marshals provide their name, base, experience, travel and availability information. Phone, training and transport details are optional. Profiles use text only.

Read the named hirer and dated brief before applying. Applying makes your named profile and any note available to that hirer. Application and booking notices go to the relevant participants. Only the posting manager and each accepted marshal receive access to that pair’s booking email and any provided phone. Other marshals cannot see them. The hirer is responsible for its own recruitment and engagement records.

We use data needed to take steps you request or perform our agreement with you. We use our legitimate interests for business contact with hirer representatives, proportionate service security, fair work history and investigating issues. We use legal obligation for prescribed recruitment records and rights requests. Where required we keep a private work-seeker address, date of birth for a work-seeker under 22, and relevant checks and placement records. These particulars stay out of published profiles. We retain the text and time of your terms acceptance and privacy notice acknowledgement. This records the information we supplied. It gives no marketing permission.

Managers select individuals. Capacity and clashes can prevent a booking. We record individual attendance and eligible reviews, including changes after a dispute. A review is a participant’s opinion. Contact Support for human review, correction, or restriction while an issue is investigated. The operator can read support submissions and restricted evidence. Contact details, allegations and case reasons belong outside public pages.

Providers and international processing: ${d.providersAndTransfers}

Retention: ${d.retention}

If you previously gave us waitlist details, contact Support to withdraw. Restricted historic location-work research is held separately and is not used for invitations. Contact us about the source of your information or to object.

Necessary first-party cookies protect sign-in, keep you signed in and remember your return page. You can clear them in browser settings. You can request access, correction, erasure, restriction or portability where applicable, and object to processing based on legitimate interests or direct marketing. Where we rely on consent, you can withdraw it. Contact Support even if you no longer have an account. We may check identity and consider others’ rights. You can also complain to the Information Commissioner at https://ico.org.uk/make-a-complaint/.`;
  return { terms, notice, termsVersion: digest(terms), noticeVersion: digest(notice) };
}

export function admissionOpen() {
  const coverEnds = process.env.SETRU_PRIVATE_PILOT_COVER_UNTIL;
  if (process.env.SETRU_PRIVATE_PILOT_ADMISSION !== "1" || !coverEnds || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(coverEnds)) return false;
  return Date.parse(coverEnds) > Date.now() && pilotDocuments() !== null;
}
