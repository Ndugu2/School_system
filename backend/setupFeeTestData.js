require('dotenv').config();
const mongoose = require('mongoose');
const Class = require('./src/models/Class');
const Student = require('./src/models/Student');
const User = require('./src/models/User');
const FeeStructure = require('./src/models/FeeStructure');
const Payment = require('./src/models/Payment');
const AcademicYear = require('./src/models/AcademicYear');
const Attendance = require('./src/models/Attendance');
const Subject = require('./src/models/Subject');

const setupTestData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school_system_uganda');
    console.log('✅ Connected to MongoDB');

    let academicYear = await AcademicYear.findOne({ year: 2026 });
    if (!academicYear) {
      academicYear = await AcademicYear.create({
        year: 2026,
        label: '2026',
        isActive: true,
        terms: [
          { name: 'Term 1', isActive: true, isCurrent: true },
          { name: 'Term 2' },
          { name: 'Term 3' }
        ]
      });
      console.log('✅ Created academic year 2026');
    }

    // 1. Create a class
    let testClass = await Class.findOne({ level: 'S4' });
    if (!testClass) {
      testClass = await Class.create({
        level: 'S4',
        name: 'S4 Alpha',
        stream: 'Science',
        capacity: 45,
        academicYear: academicYear._id,
        classTeacher: null
      });
      console.log('✅ Created test class S4 Alpha');
    } else if (!testClass.academicYear) {
      testClass.academicYear = academicYear._id;
      await testClass.save();
    }

    let testSubject = await Subject.findOne({ code: 'MTH-S4' });
    if (!testSubject) {
      testSubject = await Subject.create({
        name: 'Mathematics',
        code: 'MTH-S4',
        type: 'compulsory',
        class: testClass._id,
        applicableLevels: ['S4'],
        department: 'Mathematics'
      });
      console.log('✅ Created test subject: Mathematics');
    }

    // 2. Create a user for the student
    let studentUser = await User.findOne({ email: 'sarah.musisi@school.com' });
    if (!studentUser) {
      studentUser = await User.create({
        name: 'Sarah Musisi',
        email: 'sarah.musisi@school.com',
        password: 'sarah123',
        role: 'student'
      });
      console.log('✅ Created student user: Sarah Musisi');
    }

    // 3. Create a student record
    let student = await Student.findOne({ user: studentUser._id });
    if (!student) {
      student = await Student.create({
        user: studentUser._id,
        studentId: 'STU-2026-001',
        currentClass: testClass._id,
        gender: 'Female',
        dob: new Date('2010-03-15'),
        parentName: 'Margaret Musisi',
        parentPhone: '+256 701 234567',
        parentEmail: 'margaret@example.com',
        residentialAddress: 'Kampala, Uganda',
        admissionDate: new Date('2024-01-15'),
        academicYear: 2026
      });
      console.log(`✅ Created student: ${student.studentId}`);
    } else if (!student.currentClass || String(student.currentClass) !== String(testClass._id)) {
      student.currentClass = testClass._id;
      await student.save();
      console.log(`✅ Updated student class assignment: ${student.studentId}`);
    }

    const demoStudentUser = await User.findOne({ email: 'student@ndugu.ac.ug' });
    if (demoStudentUser) {
      let demoStudent = await Student.findOne({ user: demoStudentUser._id });
      if (!demoStudent) {
        demoStudent = await Student.create({
          user: demoStudentUser._id,
          studentId: 'STU-2026-002',
          currentClass: testClass._id,
          gender: 'Female',
          dob: new Date('2010-08-21'),
          parentName: 'Grace Nakato Guardian',
          parentPhone: '+256 701 987654',
          parentEmail: 'guardian.nakato@example.com',
          address: 'Kampala, Uganda',
          admissionDate: new Date('2026-01-15'),
          academicYear: 2026
        });
        console.log(`✅ Created demo student profile: ${demoStudent.studentId}`);
      } else if (!demoStudent.currentClass || String(demoStudent.currentClass) !== String(testClass._id)) {
        demoStudent.currentClass = testClass._id;
        await demoStudent.save();
        console.log(`✅ Updated demo student class assignment: ${demoStudent.studentId}`);
      }

      const demoToday = new Date();
      demoToday.setHours(0, 0, 0, 0);
      const demoAttendanceExists = await Attendance.findOne({ student: demoStudent._id, date: demoToday, term: 'Term 1' });
      if (!demoAttendanceExists) {
        await Attendance.create({ student: demoStudent._id, class: testClass._id, date: demoToday, term: 'Term 1', status: 'Present' });
        console.log('✅ Created demo student attendance record');
      }
    }

    // 4. Create fee structure for S4 Term 1
    let feeStructure = await FeeStructure.findOne({
      classLevel: 'S4',
      term: 'Term 1',
      academicYear: 2026
    });
    if (!feeStructure) {
      feeStructure = await FeeStructure.create({
        classLevel: 'S4',
        term: 'Term 1',
        academicYear: 2026,
        tuitionFee: 500000,
        developmentFee: 150000,
        functionalFee: 75000,
        otherFees: [
          { name: 'Sports', amount: 25000 },
          { name: 'Library', amount: 15000 }
        ],
        totalDayStudent: 765000,
        totalAmount: 765000
      });
      console.log('✅ Created fee structure: S4 Term 1 = UGX 765,000');
    }

    // 5. Create a payment record (student paid 300,000)
    let payment = await Payment.findOne({ student: student._id });
    if (!payment) {
      // Generate receipt number
      const prefix = `REC-${new Date().getFullYear()}-`;
      const latestPayment = await Payment.findOne({
        receiptNumber: new RegExp('^' + prefix)
      }).sort({ receiptNumber: -1 });
      let sequence = 1;
      if (latestPayment) {
        const lastSeq = parseInt(latestPayment.receiptNumber.split('-')[2], 10);
        if (!isNaN(lastSeq)) sequence = lastSeq + 1;
      }
      const receiptNumber = `${prefix}${String(sequence).padStart(5, '0')}`;

      // Get admin user ID
      const adminUser = await User.findOne({ email: 'koseakalema2@gmail.com' })
        || await User.findOne({ role: { $in: ['admin', 'super-admin'] } });

      if (!adminUser) {
        throw new Error('An admin user is required before creating a payment');
      }
      
      payment = await Payment.create({
        student: student._id,
        term: 'Term 1',
        academicYear: 2026,
        amountPaid: 300000,
        paymentMethod: 'MTN Mobile Money',
        transactionReference: 'PP260320001',
        receiptNumber: receiptNumber,
        paymentDate: new Date(),
        recordedBy: adminUser._id,
        remarks: 'First partial payment'
      });
      console.log(`✅ Created payment: UGX ${payment.amountPaid.toLocaleString()} (Receipt: ${payment.receiptNumber})`);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const attendanceExists = await Attendance.findOne({ student: student._id, date: today, term: 'Term 1' });
    if (!attendanceExists) {
      await Attendance.create({
        student: student._id,
        class: testClass._id,
        date: today,
        term: 'Term 1',
        status: 'Present'
      });
      console.log('✅ Created today attendance record');
    }

    const demoParent = await User.findOne({ email: 'parent@ndugu.ac.ug' });
    if (demoParent && String(student.parentUser || '') !== String(demoParent._id)) {
      student.parentUser = demoParent._id;
      await student.save();
      console.log(`✅ Linked parent demo account to ${student.studentId}`);
    }

    console.log('\n📊 Fee Summary for Sarah Musisi (S4 Term 1):');
    console.log(`   Total Fees: UGX 765,000`);
    console.log(`   Amount Paid: UGX 300,000`);
    console.log(`   Outstanding Balance: UGX 465,000`);

    await mongoose.connection.close();
    console.log('\n✅ Test data setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

setupTestData();
