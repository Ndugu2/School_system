const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const AcademicYear = require('../src/models/AcademicYear');
const Subject = require('../src/models/Subject');
const Class = require('../src/models/Class');
const Teacher = require('../src/models/Teacher');
const User = require('../src/models/User');

async function seedAcademicStructure() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');

    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(uri);
    console.log('Connected to MongoDB.');

    // 1. Academic Year 2026
    let year2026 = await AcademicYear.findOne({ year: 2026 });
    if (!year2026) {
      year2026 = await AcademicYear.create({
        year: 2026,
        label: '2026 Academic Year',
        isActive: true,
        terms: [
          { name: 'Term I', isActive: true, isCurrent: true, startDate: new Date('2026-02-02'), endDate: new Date('2026-05-01') },
          { name: 'Term II', isActive: false, isCurrent: false, startDate: new Date('2026-05-25'), endDate: new Date('2026-08-21') },
          { name: 'Term III', isActive: false, isCurrent: false, startDate: new Date('2026-09-14'), endDate: new Date('2026-12-04') }
        ],
        notes: 'Official academic year covering Term I, Term II, and Term III under Ministry of Education calendar.'
      });
      console.log('✓ Created 2026 Academic Year with Term I, II, III');
    } else {
      console.log('2026 Academic Year already exists.');
    }

    // 2. Teachers (User accounts + Teacher profiles)
    const teachersData = [
      {
        name: 'Arthur Mukasa',
        email: 'mukasa.arthur@ndugu.ac.ug',
        password: 'TeacherPass2026!',
        qualification: 'B.Sc with Education (Physics & Mathematics) - Makerere University',
        phoneNumber: '+256 772 111 222',
        role: 'teacher'
      },
      {
        name: 'Sarah Nabukenya',
        email: 'nabukenya.sarah@ndugu.ac.ug',
        password: 'TeacherPass2026!',
        qualification: 'B.Ed (Languages - English & Literature) - Kyambogo University',
        phoneNumber: '+256 701 222 333',
        role: 'teacher'
      },
      {
        name: 'Joseph Opolot',
        email: 'opolot.joseph@ndugu.ac.ug',
        password: 'TeacherPass2026!',
        qualification: 'B.Sc with Education (Chemistry & Biology) - Mbarara University',
        phoneNumber: '+256 782 333 444',
        role: 'teacher'
      },
      {
        name: 'Brenda Kyomugisha',
        email: 'kyomugisha.brenda@ndugu.ac.ug',
        password: 'TeacherPass2026!',
        qualification: 'B.A with Education (Economics & Geography) - Makerere University',
        phoneNumber: '+256 774 444 555',
        role: 'teacher'
      },
      {
        name: 'Denis Kasule',
        email: 'kasule.denis@ndugu.ac.ug',
        password: 'TeacherPass2026!',
        qualification: 'B.Sc Computer Science & Dip.Ed - Uganda Christian University',
        phoneNumber: '+256 703 555 666',
        role: 'teacher'
      }
    ];

    const teacherMap = {};
    for (const t of teachersData) {
      let u = await User.findOne({ email: t.email });
      if (!u) {
        u = await User.create({
          name: t.name,
          email: t.email,
          password: t.password,
          role: t.role
        });
      }
      let tp = await Teacher.findOne({ user: u._id });
      if (!tp) {
        tp = await Teacher.create({
          user: u._id,
          qualification: t.qualification,
          phoneNumber: t.phoneNumber
        });
      }
      teacherMap[t.name] = { user: u, profile: tp };
      console.log(`✓ Teacher ready: ${t.name} (${t.email})`);
    }

    // 3. Subjects (O-Level Compulsory & Optional, A-Level Principal & Subsidiary)
    const subjectsSeed = [
      // ── O-Level Compulsory ──
      { name: 'English Language', code: 'ENG', level: 'O', type: 'compulsory', isCompulsory: true, department: 'Languages', teacher: teacherMap['Sarah Nabukenya']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Mathematics', code: 'MTH', level: 'O', type: 'compulsory', isCompulsory: true, department: 'Mathematics', teacher: teacherMap['Arthur Mukasa']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Physics', code: 'PHY', level: 'O', type: 'compulsory', isCompulsory: true, department: 'Sciences', teacher: teacherMap['Arthur Mukasa']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Chemistry', code: 'CHM', level: 'O', type: 'compulsory', isCompulsory: true, department: 'Sciences', teacher: teacherMap['Joseph Opolot']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Biology', code: 'BIO', level: 'O', type: 'compulsory', isCompulsory: true, department: 'Sciences', teacher: teacherMap['Joseph Opolot']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Geography', code: 'GEO', level: 'O', type: 'compulsory', isCompulsory: true, department: 'Humanities', teacher: teacherMap['Brenda Kyomugisha']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'History & Political Education', code: 'HIS', level: 'O', type: 'compulsory', isCompulsory: true, department: 'Humanities', teacher: teacherMap['Brenda Kyomugisha']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },

      // ── O-Level Optional ──
      { name: 'Christian Religious Education', code: 'CRE', level: 'O', type: 'optional', isCompulsory: false, department: 'Humanities', teacher: teacherMap['Sarah Nabukenya']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Islamic Religious Education', code: 'IRE', level: 'O', type: 'optional', isCompulsory: false, department: 'Humanities', applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Information & Comm. Technology', code: 'ICT', level: 'O', type: 'optional', isCompulsory: false, department: 'Technical', teacher: teacherMap['Denis Kasule']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Agriculture', code: 'AGR', level: 'O', type: 'optional', isCompulsory: false, department: 'Vocational', applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Literature in English', code: 'LIT', level: 'O', type: 'optional', isCompulsory: false, department: 'Languages', teacher: teacherMap['Sarah Nabukenya']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Entrepreneurship', code: 'ENT', level: 'O', type: 'optional', isCompulsory: false, department: 'Vocational', teacher: teacherMap['Brenda Kyomugisha']?.user._id, applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Fine Art', code: 'ART', level: 'O', type: 'optional', isCompulsory: false, department: 'Vocational', applicableLevels: ['S1', 'S2', 'S3', 'S4'] },
      { name: 'Kiswahili', code: 'KIS', level: 'O', type: 'optional', isCompulsory: false, department: 'Languages', applicableLevels: ['S1', 'S2', 'S3', 'S4'] },

      // ── A-Level Principal ──
      { name: 'Physics (Principal)', code: 'P510', level: 'A', type: 'principal', isCompulsory: false, department: 'Sciences', teacher: teacherMap['Arthur Mukasa']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'Chemistry (Principal)', code: 'P525', level: 'A', type: 'principal', isCompulsory: false, department: 'Sciences', teacher: teacherMap['Joseph Opolot']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'Biology (Principal)', code: 'P530', level: 'A', type: 'principal', isCompulsory: false, department: 'Sciences', teacher: teacherMap['Joseph Opolot']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'Mathematics (Principal)', code: 'P425', level: 'A', type: 'principal', isCompulsory: false, department: 'Mathematics', teacher: teacherMap['Arthur Mukasa']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'Economics (Principal)', code: 'P220', level: 'A', type: 'principal', isCompulsory: false, department: 'Humanities', teacher: teacherMap['Brenda Kyomugisha']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'History (Principal)', code: 'P210', level: 'A', type: 'principal', isCompulsory: false, department: 'Humanities', applicableLevels: ['S5', 'S6'] },
      { name: 'Geography (Principal)', code: 'P250', level: 'A', type: 'principal', isCompulsory: false, department: 'Humanities', teacher: teacherMap['Brenda Kyomugisha']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'Literature in English (Principal)', code: 'P310', level: 'A', type: 'principal', isCompulsory: false, department: 'Languages', teacher: teacherMap['Sarah Nabukenya']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'Divinity (Principal)', code: 'P245', level: 'A', type: 'principal', isCompulsory: false, department: 'Humanities', applicableLevels: ['S5', 'S6'] },

      // ── A-Level Subsidiary ──
      { name: 'General Paper', code: 'S101', level: 'A', type: 'subsidiary', isCompulsory: true, department: 'General', teacher: teacherMap['Sarah Nabukenya']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'Subsidiary Mathematics', code: 'S475', level: 'A', type: 'subsidiary', isCompulsory: false, department: 'Mathematics', teacher: teacherMap['Arthur Mukasa']?.user._id, applicableLevels: ['S5', 'S6'] },
      { name: 'Subsidiary ICT', code: 'S850', level: 'A', type: 'subsidiary', isCompulsory: false, department: 'Technical', teacher: teacherMap['Denis Kasule']?.user._id, applicableLevels: ['S5', 'S6'] }
    ];

    for (const sub of subjectsSeed) {
      await Subject.findOneAndUpdate(
        { code: sub.code },
        { ...sub, category: sub.type },
        { upsert: true, new: true }
      );
    }
    console.log(`✓ Seeded ${subjectsSeed.length} curriculum subjects (O-Level & A-Level)`);

    // 4. Classes and Streams
    const classesSeed = [
      {
        name: 'Senior 1',
        level: 'S1',
        academicYear: year2026._id,
        academicYearValue: 2026,
        classTeacher: teacherMap['Arthur Mukasa']?.user._id,
        streams: [
          { name: 'North', capacity: 45, classTeacher: teacherMap['Arthur Mukasa']?.user._id },
          { name: 'South', capacity: 45, classTeacher: teacherMap['Sarah Nabukenya']?.user._id },
          { name: 'East', capacity: 45, classTeacher: teacherMap['Joseph Opolot']?.user._id }
        ]
      },
      {
        name: 'Senior 2',
        level: 'S2',
        academicYear: year2026._id,
        academicYearValue: 2026,
        classTeacher: teacherMap['Sarah Nabukenya']?.user._id,
        streams: [
          { name: 'North', capacity: 45, classTeacher: teacherMap['Sarah Nabukenya']?.user._id },
          { name: 'South', capacity: 45, classTeacher: teacherMap['Denis Kasule']?.user._id }
        ]
      },
      {
        name: 'Senior 3',
        level: 'S3',
        academicYear: year2026._id,
        academicYearValue: 2026,
        classTeacher: teacherMap['Joseph Opolot']?.user._id,
        streams: [
          { name: 'Stream A', capacity: 45, classTeacher: teacherMap['Joseph Opolot']?.user._id },
          { name: 'Stream B', capacity: 45, classTeacher: teacherMap['Brenda Kyomugisha']?.user._id }
        ]
      },
      {
        name: 'Senior 4',
        level: 'S4',
        academicYear: year2026._id,
        academicYearValue: 2026,
        classTeacher: teacherMap['Brenda Kyomugisha']?.user._id,
        streams: [
          { name: 'Stream A', capacity: 45, classTeacher: teacherMap['Brenda Kyomugisha']?.user._id },
          { name: 'Stream B', capacity: 45, classTeacher: teacherMap['Arthur Mukasa']?.user._id }
        ]
      },
      {
        name: 'Senior 5',
        level: 'S5',
        academicYear: year2026._id,
        academicYearValue: 2026,
        classTeacher: teacherMap['Denis Kasule']?.user._id,
        streams: [
          { name: 'Sciences Stream (PCB/PCM/BCM)', capacity: 50, classTeacher: teacherMap['Arthur Mukasa']?.user._id },
          { name: 'Arts Stream (HEL/HEG/MEG)', capacity: 50, classTeacher: teacherMap['Brenda Kyomugisha']?.user._id }
        ]
      },
      {
        name: 'Senior 6',
        level: 'S6',
        academicYear: year2026._id,
        academicYearValue: 2026,
        classTeacher: teacherMap['Arthur Mukasa']?.user._id,
        streams: [
          { name: 'Sciences Stream (PCB/PCM/BCM)', capacity: 50, classTeacher: teacherMap['Joseph Opolot']?.user._id },
          { name: 'Arts Stream (HEL/HEG/MEG)', capacity: 50, classTeacher: teacherMap['Sarah Nabukenya']?.user._id }
        ]
      }
    ];

    for (const c of classesSeed) {
      await Class.findOneAndUpdate(
        { name: c.name, academicYear: c.academicYear },
        c,
        { upsert: true, new: true }
      );
    }
    console.log(`✓ Seeded ${classesSeed.length} classes with attached streams`);

    await mongoose.disconnect();
    console.log('Done!');
  } catch (err) {
    console.error('Error seeding academic structure:', err);
    process.exit(1);
  }
}

seedAcademicStructure();
