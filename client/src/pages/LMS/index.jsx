import React, { useState } from 'react';
import CourseList from './CourseList';
import CourseDetail from './CourseDetail';

export default function LMS() {
  const [activeCourse, setActiveCourse] = useState(null);

  return (
    <div className="animate-fade-in">
      {activeCourse ? (
        <CourseDetail course={activeCourse} onBack={() => setActiveCourse(null)} />
      ) : (
        <CourseList onSelectCourse={setActiveCourse} />
      )}
    </div>
  );
}
