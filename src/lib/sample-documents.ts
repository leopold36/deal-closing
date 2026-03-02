// ---------------------------------------------------------------------------
// Sample document definitions for the four demo deals.
// Each document contains realistic text content that an AI agent can parse
// to extract deal field values.
// ---------------------------------------------------------------------------

export type SampleDocument = {
  id: string;
  filename: string;
  mimeType: string;
  format: "PDF" | "DOCX" | "TXT" | "CSV";
  label: string;
  description: string;
  dealName: string;
  content: string;
};

// ---------------------------------------------------------------------------
// 1. Acme Corp Term Sheet  (PDF)
// ---------------------------------------------------------------------------
const acmeTermSheet: SampleDocument = {
  id: "sample-acme-term-sheet",
  filename: "Acme_Corp_Term_Sheet.pdf",
  mimeType: "application/pdf",
  format: "PDF",
  label: "Acme Corp Term Sheet",
  description: "Series B equity term sheet with investment details",
  dealName: "Acme Corp Series B",
  content: `CONFIDENTIAL

ACME CORPORATION
Series B Preferred Stock Financing
Summary of Principal Terms and Conditions

Date of Term Sheet: March 10, 2026

This term sheet summarizes the principal terms of the proposed Series B Preferred
Stock financing of Acme Corporation, a Delaware corporation (the "Company"). This
term sheet is for discussion purposes only and is not binding on any party.

OFFERING TERMS

Issuer:                 Acme Corporation ("ACME")
                        123 Innovation Drive, San Francisco, CA 94107
                        Equity Ticker Symbol: ACME

Security:               Series B Preferred Stock

Deal Name:              Acme Corp Series B

Total Round Size:       $40,000,000

Investor Commitment:    LGT Capital Partners shall invest Twenty-Five Million
                        Dollars ($25,000,000) in this round as Lead Investor.

Pre-Money Valuation:    $160,000,000

Price Per Share:        $12.80 (based on 12,500,000 shares outstanding on a
                        fully diluted basis)

Closing Date:           The financing is expected to close on or about
                        March 15, 2026 (the "Deal Date").

Settlement:             Settlement of funds shall occur no later than
                        March 22, 2026 via wire transfer.

GOVERNANCE

Board Composition:      Upon closing, the Board shall consist of five (5)
                        directors: two (2) designated by the Founders, two (2)
                        by the Series B investors (one of whom shall be
                        appointed by LGT Capital Partners as Lead Investor),
                        and one (1) independent director.

COMPANY OVERVIEW

Acme Corporation is a high-growth SaaS platform for supply-chain analytics.
The company has demonstrated strong revenue growth at approximately 140% year-
over-year, reaching $28M ARR in Q4 2025. Gross margins remain above 78%, and
the net dollar retention rate stands at 135%.

ADDITIONAL NOTES

This transaction represents a Series B equity investment. LGT Capital Partners
will assume a lead investor position with a board seat. The company's strong
revenue growth at 140% YoY, combined with its capital-efficient model, supports
the proposed valuation.

Existing investors Benchmark and First Round Capital are expected to participate
on a pro-rata basis.

_______________________________________________________________________________
This summary of terms is intended solely for negotiation purposes and does not
constitute a binding obligation. Execution of definitive agreements is subject
to satisfactory completion of due diligence and approval by the respective
investment committees.
`,
};

// ---------------------------------------------------------------------------
// 2. Nova Energy Note Agreement  (DOCX)
// ---------------------------------------------------------------------------
const novaNoteAgreement: SampleDocument = {
  id: "sample-nova-note",
  filename: "Nova_Energy_Note_Agreement.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  format: "DOCX",
  label: "Nova Energy Note Agreement",
  description: "Convertible note agreement with discount and cap",
  dealName: "Nova Energy Convertible Note",
  content: `CONVERTIBLE PROMISSORY NOTE AGREEMENT

Note Number: NE-2026-001
Date of Issuance: April 1, 2026

FOR VALUE RECEIVED, Nova Energy Inc. (the "Company"), a corporation organized
under the laws of the State of Delaware with its principal offices at 900 Solar
Boulevard, Austin, TX 78701 (trading under the ticker symbol NOVA), hereby
promises to pay to the order of LGT Capital Partners AG (the "Holder"), the
principal sum of Ten Million Dollars ($10,000,000.00), together with accrued
interest, subject to the terms set forth herein.

1. TRANSACTION OVERVIEW

   Deal Name:       Nova Energy Convertible Note
   Counterparty:    Nova Energy Inc.
   Principal:       $10,000,000
   Interest Rate:   6% per annum, simple interest
   Maturity Date:   April 1, 2028 (24 months from issuance)

2. CONVERSION TERMS

   2.1  Qualified Financing Conversion
        Upon the closing of a Qualified Financing (defined as an equity
        financing raising aggregate gross proceeds of at least $25,000,000),
        the outstanding principal and accrued interest shall automatically
        convert into shares of the preferred stock sold in such financing
        at a conversion price equal to the lesser of:

        (a) a 20% discount to the price per share paid by new investors; or
        (b) the price per share implied by a $500,000,000 valuation cap.

   2.2  Voluntary Conversion
        At any time prior to the Maturity Date, the Holder may elect to
        convert the outstanding balance at the Valuation Cap price.

3. SETTLEMENT

   Funds shall be wired to the Company's designated account on or before
   April 8, 2026 (the "Settlement Date"). The Company shall deliver
   confirmation of receipt within two (2) business days of settlement.

4. CO-INVESTORS

   Greenfield Partners is participating in this round with a commitment of
   $8,000,000 under substantially identical terms. The total round size is
   expected to reach $18,000,000.

5. USE OF PROCEEDS

   Proceeds from this Note shall be used to accelerate deployment of the
   Company's next-generation solid-state battery storage technology and to
   fund expansion into the European market.

6. ADDITIONAL TERMS

   This instrument constitutes a convertible note with a 20% discount and a
   $500M cap. LGT Capital Partners is co-investing alongside Greenfield
   Partners in this round. The Note is unsecured and subordinated to the
   Company's existing credit facility with Silicon Valley Bank.

7. GOVERNING LAW

   This Note shall be governed by and construed in accordance with the laws
   of the State of Delaware.

IN WITNESS WHEREOF, the Company has caused this Note to be executed as of the
date first written above.

NOVA ENERGY INC.

By: _________________________
    Maria Chen, Chief Executive Officer

ACCEPTED AND AGREED:

LGT CAPITAL PARTNERS AG

By: _________________________
    Authorized Signatory
`,
};

// ---------------------------------------------------------------------------
// 3. Meridian Health Deal Summary  (TXT)
// ---------------------------------------------------------------------------
const meridianDealSummary: SampleDocument = {
  id: "sample-meridian-summary",
  filename: "Meridian_Health_Deal_Summary.txt",
  mimeType: "text/plain",
  format: "TXT",
  label: "Meridian Health Deal Summary",
  description: "Growth equity deal memo with financial details",
  dealName: "Meridian Health Growth Equity",
  content: `INTERNAL DEAL MEMO — CONFIDENTIAL
LGT Capital Partners — Private Markets Group
Prepared: March 12, 2026

===========================================================================
MERIDIAN HEALTH GROWTH EQUITY — INVESTMENT RECOMMENDATION
===========================================================================

1. EXECUTIVE SUMMARY

We are recommending a $50,000,000 investment in Meridian Health Systems
("Meridian" or "the Company"), a leading digital health platform specializing
in AI-driven diagnostics and remote patient monitoring. The Company trades
under the equity ticker MHSI on a secondary basis.

This growth equity round values the business at approximately $150M pre-money,
reflecting a 3x revenue multiple on trailing twelve-month revenues of ~$50M.
We will co-lead the round alongside Sequoia Capital, which is committing $45M.

2. KEY TERMS

   Deal Name:            Meridian Health Growth Equity
   Company:              Meridian Health Systems
   Headquarters:         200 Wellbeing Way, Boston, MA 02110
   Equity Ticker:        MHSI
   Round Type:           Growth Equity
   Our Commitment:       $50,000,000 (Fifty Million Dollars)
   Pre-Money Valuation:  $150,000,000
   Deal Date:            March 20, 2026
   Settlement Date:      March 28, 2026
   Co-Lead:              Sequoia Capital ($45M commitment)

3. COMPANY OVERVIEW

Meridian Health Systems operates a cloud-based platform that integrates
with hospital EHR systems to provide real-time diagnostic assistance and
remote monitoring for chronic-care patients. The platform currently serves
180+ hospital networks and monitors 2.4 million patients.

Revenue grew 85% year-over-year in FY2025, reaching approximately $50M.
The company has been EBITDA-positive since Q3 2025, a notable milestone
given the capital-intensive nature of healthtech platforms.

4. INVESTMENT THESIS

- Market leader in AI diagnostics with deep EHR integrations
- Strong net revenue retention of 145%
- Clear path to profitability (already EBITDA-positive since Q3 2025)
- Defensible moat via proprietary training data from 180+ hospital partners
- 3x revenue multiple is attractive relative to public-market comps

5. RISKS

- Regulatory changes (FDA oversight of AI diagnostics)
- Concentration risk: top 10 hospital networks represent ~35% of revenue
- Competition from Epic Systems' internal AI module

6. NOTES

Growth equity round in digital health platform. 3x revenue multiple.
Co-lead with Sequoia. EBITDA-positive since Q3 2025.

===========================================================================
RECOMMENDATION: APPROVE — present to Investment Committee on March 14, 2026
===========================================================================
`,
};

// ---------------------------------------------------------------------------
// 4. Atlas Robotics Cap Table  (CSV)
// ---------------------------------------------------------------------------
const atlasCapTable: SampleDocument = {
  id: "sample-atlas-captable",
  filename: "Atlas_Robotics_Cap_Table.csv",
  mimeType: "text/csv",
  format: "CSV",
  label: "Atlas Robotics Cap Table",
  description: "Pre-IPO cap table with allocation details",
  dealName: "Atlas Robotics Pre-IPO",
  content: `# Atlas Robotics Ltd. (ATLR) — Pre-IPO Cap Table & Allocation Summary
# Deal Name: Atlas Robotics Pre-IPO
# Prepared: April 5, 2026
# IPO expected Q3 2026 at $4B+ valuation. Warehouse automation leader with 200+ enterprise clients.
#
# This file contains the current capitalization table and the proposed pre-IPO allocation.
# Deal Date: 2026-04-10 | Settlement Date: 2026-04-17

Shareholder,Share Class,Shares,Ownership %,Investment ($),Notes
Atlas Founders LLC,Common,30000000,30.0%,0,Founder shares vested over 4 years
Spark Ventures,Series A Preferred,10000000,10.0%,15000000,Series A lead — 2022
Elevation Capital,Series B Preferred,12000000,12.0%,36000000,Series B lead — 2023
Tiger Global,Series C Preferred,8000000,8.0%,48000000,Series C lead — 2024
Employee Option Pool,Common (Options),10000000,10.0%,0,Authorized ESOP — partially exercised
LGT Capital Partners,Pre-IPO Allocation,5000000,5.0%,75000000,New allocation — $75M commitment
Fidelity Investments,Pre-IPO Allocation,4000000,4.0%,60000000,Co-investor in pre-IPO round
Other Existing Holders,Various,21000000,21.0%,various,Angels and early employees

# SUMMARY
# Total Shares Outstanding (post-allocation): 100,000,000
# Pre-IPO Round Total: $135,000,000 (LGT $75M + Fidelity $60M)
# Counterparty: Atlas Robotics Ltd.
# Equity Ticker: ATLR
# Expected IPO Valuation: $4,000,000,000+
# Enterprise Clients: 200+
# Sector: Warehouse Automation / Industrial Robotics
#
# Notes: Pre-IPO allocation. IPO expected Q3 2026 at $4B+ valuation. Warehouse automation leader with 200+ enterprise clients.
`,
};

// ---------------------------------------------------------------------------
// Exported collection
// ---------------------------------------------------------------------------

export const SAMPLE_DOCUMENTS: SampleDocument[] = [
  acmeTermSheet,
  novaNoteAgreement,
  meridianDealSummary,
  atlasCapTable,
];
