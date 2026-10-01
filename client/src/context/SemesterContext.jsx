import { createContext, useContext, useEffect, useState } from 'react';

const SemesterContext = createContext(null);

// Valid B.Tech semesters for our three years
export const SEMESTER_KEYS = [
  { key: '2-1', year: 2, semester: 3, label: '2-1', fullLabel: '2nd Year · 1st Semester' },
  { key: '2-2', year: 2, semester: 4, label: '2-2', fullLabel: '2nd Year · 2nd Semester' },
  { key: '3-1', year: 3, semester: 5, label: '3-1', fullLabel: '3rd Year · 1st Semester' },
  { key: '3-2', year: 3, semester: 6, label: '3-2', fullLabel: '3rd Year · 2nd Semester' },
  { key: '4-1', year: 4, semester: 7, label: '4-1', fullLabel: '4th Year · 1st Semester' },
  { key: '4-2', year: 4, semester: 8, label: '4-2', fullLabel: '4th Year · 2nd Semester' },
];

export function semesterKey(year, semester) {
  return `${year}-${semester - 2 * year + 2}`;
}

const DEFAULT = { year: 2, semester: 3 };

export function SemesterProvider({ children }) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem('unimate_semester');
      return raw ? JSON.parse(raw) : DEFAULT;
    } catch { return DEFAULT; }
  });

  useEffect(() => {
    localStorage.setItem('unimate_semester', JSON.stringify(value));
  }, [value]);

  const setYear = (year) => setValue({ year, semester: 2 * year - 1 });
  const setSemester = (semester) => setValue((v) => ({ ...v, semester }));
  const setKey = (key) => {
    const found = SEMESTER_KEYS.find((s) => s.key === key);
    if (found) setValue({ year: found.year, semester: found.semester });
  };

  return (
    <SemesterContext.Provider value={{ ...value, setYear, setSemester, setKey }}>
      {children}
    </SemesterContext.Provider>
  );
}

export function useSemester() {
  const ctx = useContext(SemesterContext);
  if (!ctx) throw new Error('useSemester must be inside SemesterProvider');
  return ctx;
}