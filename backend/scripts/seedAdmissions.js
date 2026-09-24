const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const StudentApplication = require('../src/models/StudentApplication');
const ALevelCombination = require('../src/models/ALevelCombination');

// 1. Ensure sample PDF documents exist for realistic viewing
const uploadsDir = path.join(__dirname, '../uploads/admissions');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function createSamplePdf(filename, title) {
  const targetPath = path.join(uploadsDir, filename);
  if (!fs.existsSync(targetPath)) {
    const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 120 >> stream
BT
/F1 20 Tf
50 720 Td
(NDUGU ACADEMY - VERIFIED OFFICIAL CREDENTIAL) Tj
/F1 14 Tf
0 -40 Td
(${title}) Tj
/F1 11 Tf
0 -30 Td
(Republic of Uganda - Ministry of Education and Sports / UNEB Certified Record) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000415 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
490
%%EOF
`;
    fs.writeFileSync(targetPath, pdfContent);
    console.log(`Created sample PDF: ${filename}`);
  }
}

createSamplePdf('uneb_ple_pass_slip_sample.pdf', 'UNEB PRIMARY LEAVING EXAMINATION PASS SLIP - AGG 04 DIV 1');
createSamplePdf('school_recommendation_sample.pdf', 'FORMER SCHOOL HEADTEACHER RECOMMENDATION & CONDUCT LETTER');
createSamplePdf('uneb_uce_pass_slip_sample.pdf', 'UGANDA CERTIFICATE OF EDUCATION (UCE) PASS SLIP - 10 AGG DIV 1');

async function seedAdmissions() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully.');

    // Fetch existing A-Level combinations if available
    const combinations = await ALevelCombination.find();
    const comboMap = {};
    combinations.forEach(c => { comboMap[c.name] = c._id; });

    console.log('Clearing existing demo Student Applications...');
    await StudentApplication.deleteMany({});

    const applicationsData = [
      // 1. S.1 Applicant - Pending
      {
        reference_number: 'NDA-2026-0001',
        first_name: 'Brian',
        last_name: 'Kato',
        date_of_birth: new Date('2012-04-14'),
        gender: 'M',
        level: 'O',
        class_applying: 'S1',
        former_school: 'Kampala Parents Primary School',
        place_of_residence: 'Kira Municipality, Wakiso',
        place_of_origin: 'Masaka City',
        district: 'Wakiso',
        county: 'Kyadondo',
        sub_county: 'Kira Division',
        village: 'Kyanja Central LC1',
        chronic_disease: 'None',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        selected_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History & Political Education', 'CRE', 'ICT'],
        status: 'pending',
        parent_details: [
          {
            parent_first_name: 'Charles',
            parent_last_name: 'Kato',
            relation: 'Father',
            contact_number: '+256 772 458 912',
            occupation: 'Senior Civil Engineer (UNRA)',
            email: 'charles.kato@gmail.com'
          },
          {
            parent_first_name: 'Grace',
            parent_last_name: 'Namyalo',
            relation: 'Mother',
            contact_number: '+256 701 334 890',
            occupation: 'Pharmacist',
            email: 'gnamyalo@yahoo.com'
          }
        ]
      },

      // 2. S.1 Applicant - Approved (Issued LCK-00001)
      {
        reference_number: 'NDA-2026-0002',
        first_name: 'Sarah',
        last_name: 'Namubiru',
        date_of_birth: new Date('2012-08-22'),
        gender: 'F',
        level: 'O',
        class_applying: 'S1',
        former_school: 'St. Savio Junior School Kisubi',
        place_of_residence: 'Entebbe Municipality, Wakiso',
        place_of_origin: 'Mukono',
        district: 'Wakiso',
        county: 'Busiro',
        sub_county: 'Katabi Town Council',
        village: 'Abaita Ababiri Zone B',
        chronic_disease: 'Mild Asthma (inhaler available)',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        selected_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History & Political Education', 'Entrepreneurship', 'Fine Art'],
        status: 'approved',
        admission_number: 'LCK-00001',
        approved_by_name: 'Dr. John Baptist Kaggwa (Headteacher)',
        decision_date: new Date('2026-02-10'),
        parent_details: [
          {
            parent_first_name: 'Dr. David',
            parent_last_name: 'Namubiru',
            relation: 'Father',
            contact_number: '+256 774 219 008',
            occupation: 'Lecturer (Makerere University)',
            email: 'dnamubiru@chs.mak.ac.ug'
          }
        ]
      },

      // 3. S.2 Transfer Applicant - Pending (Requires PLE + Recommendation)
      {
        reference_number: 'NDA-2026-0003',
        first_name: 'Emmanuel',
        last_name: 'Okello',
        date_of_birth: new Date('2011-03-10'),
        gender: 'M',
        level: 'O',
        class_applying: 'S2',
        former_school: 'St. Mary\'s College Kisubi (SMACK)',
        place_of_residence: 'Bugolobi, Kampala',
        place_of_origin: 'Lira District',
        district: 'Kampala',
        county: 'Nakawa Division',
        sub_county: 'Bugolobi Parish',
        village: 'Spring Road Cell 4',
        chronic_disease: 'None',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        recommendation_letter: '/uploads/admissions/school_recommendation_sample.pdf',
        selected_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History & Political Education', 'Agriculture'],
        status: 'pending',
        parent_details: [
          {
            parent_first_name: 'Patrick',
            parent_last_name: 'Okello',
            relation: 'Father',
            contact_number: '+256 782 990 144',
            occupation: 'Audit Director (PwC Uganda)',
            email: 'pokello@pwc.ug'
          }
        ]
      },

      // 4. S.3 Transfer Applicant - Approved (Issued LCK-00002)
      {
        reference_number: 'NDA-2026-0004',
        first_name: 'Joan',
        last_name: 'Nabatanzi',
        date_of_birth: new Date('2010-11-05'),
        gender: 'F',
        level: 'O',
        class_applying: 'S3',
        former_school: 'Gayaza High School',
        place_of_residence: 'Naalya Estate, Kira Municipality',
        place_of_origin: 'Mityana',
        district: 'Wakiso',
        county: 'Kyadondo',
        sub_county: 'Kira Division',
        village: 'Naalya Housing Zone',
        chronic_disease: 'None',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        recommendation_letter: '/uploads/admissions/school_recommendation_sample.pdf',
        selected_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'Literature in English', 'French'],
        status: 'approved',
        admission_number: 'LCK-00002',
        approved_by_name: 'Mrs. Rebecca K. Mugerwa (Director of Studies)',
        decision_date: new Date('2026-02-12'),
        parent_details: [
          {
            parent_first_name: 'Florence',
            parent_last_name: 'Nabatanzi',
            relation: 'Mother',
            contact_number: '+256 702 443 219',
            occupation: 'Chief Magistrate (Judiciary of Uganda)',
            email: 'fnabatanzi@judiciary.go.ug'
          }
        ]
      },

      // 5. S.4 Transfer Applicant - Rejected
      {
        reference_number: 'NDA-2026-0005',
        first_name: 'David',
        last_name: 'Mugisha',
        date_of_birth: new Date('2009-06-18'),
        gender: 'M',
        level: 'O',
        class_applying: 'S4',
        former_school: 'Seeta High School Green Campus',
        place_of_residence: 'Mukono Town, Mukono',
        place_of_origin: 'Kisoro District',
        district: 'Mukono',
        county: 'Mukono Municipality',
        sub_county: 'Goma Division',
        village: 'Sonde Zone 1',
        chronic_disease: 'None',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        recommendation_letter: '/uploads/admissions/school_recommendation_sample.pdf',
        selected_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'Commerce'],
        status: 'rejected',
        rejected_by_name: 'Dr. John Baptist Kaggwa (Headteacher)',
        rejection_reason: 'Mid-candidate UNEB registration deadline passed for Senior Four national exams.',
        decision_date: new Date('2026-02-15'),
        parent_details: [
          {
            parent_first_name: 'Robert',
            parent_last_name: 'Mugisha',
            relation: 'Father',
            contact_number: '+256 775 889 012',
            occupation: 'Businessman',
            email: 'rmugisha.biz@gmail.com'
          }
        ]
      },

      // 6. S.5 A-Level Applicant - Pending (PCM / ICT)
      {
        reference_number: 'NDA-2026-0006',
        first_name: 'Isaac',
        last_name: 'Twinomugisha',
        date_of_birth: new Date('2008-01-30'),
        gender: 'M',
        level: 'A',
        class_applying: 'S5',
        former_school: 'King\'s College Budo',
        place_of_residence: 'Lubowa, Entebbe Road',
        place_of_origin: 'Kabale District',
        district: 'Wakiso',
        county: 'Kyaddondo',
        sub_county: 'Makindye Ssabagabo',
        village: 'Lubowa Hill Court',
        chronic_disease: 'None',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        uce_pass_slip: '/uploads/admissions/uneb_uce_pass_slip_sample.pdf',
        combination_name: 'PCM / ICT',
        combination: comboMap['PCM / ICT'] || null,
        status: 'pending',
        parent_details: [
          {
            parent_first_name: 'Prof. Denis',
            parent_last_name: 'Twinomugisha',
            relation: 'Father',
            contact_number: '+256 772 120 456',
            occupation: 'Dean of Technology (Kyambogo Univ)',
            email: 'dtwino@kyambogo.ac.ug'
          }
        ]
      },

      // 7. S.5 A-Level Applicant - Approved (Issued LCK-00003 - BCM / Sub-Math)
      {
        reference_number: 'NDA-2026-0007',
        first_name: 'Brenda',
        last_name: 'Atuhaire',
        date_of_birth: new Date('2008-09-12'),
        gender: 'F',
        level: 'A',
        class_applying: 'S5',
        former_school: 'Mt. St. Mary\'s College Namagunga',
        place_of_residence: 'Kololo, Kampala',
        place_of_origin: 'Mbarara City',
        district: 'Kampala',
        county: 'Central Division',
        sub_county: 'Kololo Parish',
        village: 'Prince Charles Drive Zone',
        chronic_disease: 'None',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        uce_pass_slip: '/uploads/admissions/uneb_uce_pass_slip_sample.pdf',
        combination_name: 'BCM / Sub-Math',
        combination: comboMap['BCM / Sub-Math'] || null,
        status: 'approved',
        admission_number: 'LCK-00003',
        approved_by_name: 'Dr. John Baptist Kaggwa (Headteacher)',
        decision_date: new Date('2026-02-18'),
        parent_details: [
          {
            parent_first_name: 'Hon. Justice Patience',
            parent_last_name: 'Atuhaire',
            relation: 'Mother',
            contact_number: '+256 701 556 789',
            occupation: 'High Court Judge (Commercial Court)',
            email: 'patuhaire@judiciary.go.ug'
          }
        ]
      },

      // 8. S.5 A-Level Applicant - Rejected (HEL / Divinity)
      {
        reference_number: 'NDA-2026-0008',
        first_name: 'Samuel',
        last_name: 'Kigozi',
        date_of_birth: new Date('2008-05-19'),
        gender: 'M',
        level: 'A',
        class_applying: 'S5',
        former_school: 'Namilyango College',
        place_of_residence: 'Ntinda, Kampala',
        place_of_origin: 'Luweero District',
        district: 'Kampala',
        county: 'Nakawa Division',
        sub_county: 'Ntinda Parish',
        village: 'Ministers Village LC1',
        chronic_disease: 'None',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        uce_pass_slip: '/uploads/admissions/uneb_uce_pass_slip_sample.pdf',
        combination_name: 'HEL / Divinity',
        combination: comboMap['HEL / Divinity'] || null,
        status: 'rejected',
        rejected_by_name: 'Mrs. Rebecca K. Mugerwa (Director of Studies)',
        rejection_reason: 'Arts combination intake stream reached full boarding capacity (60/60).',
        decision_date: new Date('2026-02-20'),
        parent_details: [
          {
            parent_first_name: 'George',
            parent_last_name: 'Kigozi',
            relation: 'Father',
            contact_number: '+256 788 123 909',
            occupation: 'Managing Partner (Kigozi & Associates)',
            email: 'gkigozi@kigozi-law.ug'
          }
        ]
      },

      // 9. S.6 A-Level Transfer Applicant - Pending (MEG / Sub-Math)
      {
        reference_number: 'NDA-2026-0009',
        first_name: 'Ritah',
        last_name: 'Nalubega',
        date_of_birth: new Date('2007-10-15'),
        gender: 'F',
        level: 'A',
        class_applying: 'S6',
        former_school: 'Uganda Martyrs SS Namugongo',
        place_of_residence: 'Kisaasi, Kampala',
        place_of_origin: 'Masaka',
        district: 'Kampala',
        county: 'Kawempe Division',
        sub_county: 'Kisaasi Central',
        village: 'Kyanja Road LC1',
        chronic_disease: 'Peanut allergy',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        uce_pass_slip: '/uploads/admissions/uneb_uce_pass_slip_sample.pdf',
        combination_name: 'MEG / Sub-Math',
        combination: comboMap['MEG / Sub-Math'] || null,
        status: 'pending',
        parent_details: [
          {
            parent_first_name: 'Julius',
            parent_last_name: 'Nalubega',
            relation: 'Father',
            contact_number: '+256 772 312 876',
            occupation: 'Bank of Uganda Director',
            email: 'jnalubega@bou.or.ug'
          }
        ]
      },

      // 10. S.2 Transfer Applicant - Pending
      {
        reference_number: 'NDA-2026-0010',
        first_name: 'Grace',
        last_name: 'Akello',
        date_of_birth: new Date('2011-07-04'),
        gender: 'F',
        level: 'O',
        class_applying: 'S2',
        former_school: 'Tororo Girls School',
        place_of_residence: 'Jinja City, Jinja',
        place_of_origin: 'Tororo District',
        district: 'Jinja',
        county: 'Jinja South Division',
        sub_county: 'Walukuba',
        village: 'Masese Zone 3',
        chronic_disease: 'None',
        ple_pass_slip: '/uploads/admissions/uneb_ple_pass_slip_sample.pdf',
        recommendation_letter: '/uploads/admissions/school_recommendation_sample.pdf',
        selected_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Geography', 'History & Political Education', 'Fine Art'],
        status: 'pending',
        parent_details: [
          {
            parent_first_name: 'Simon Peter',
            parent_last_name: 'Akello',
            relation: 'Father',
            contact_number: '+256 703 678 123',
            occupation: 'Customs Officer (URA Jinja)',
            email: 'sakello@ura.go.ug'
          }
        ]
      }
    ];

    console.log(`Inserting ${applicationsData.length} student application records...`);
    const created = await StudentApplication.insertMany(applicationsData);
    console.log(`✓ Successfully seeded ${created.length} student applications!`);

    created.forEach((app, i) => {
      console.log(`  [${i + 1}] ${app.reference_number}: ${app.first_name} ${app.last_name} | Class: ${app.class_applying} | Status: ${app.status.toUpperCase()} | AdmNo: ${app.admission_number || 'Pending'} | PLE: ${!!app.ple_pass_slip} | Recom: ${!!app.recommendation_letter} | UCE: ${!!app.uce_pass_slip}`);
    });

    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  } catch (err) {
    console.error('Error seeding admissions:', err);
    process.exit(1);
  }
}

seedAdmissions();
