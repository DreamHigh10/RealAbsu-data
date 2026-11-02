// Abia State University Faculty and Department Master Registry
export interface FacultyInfo {
  faculty: string;
  departments: string[];
}

export const FACULTIES_DATA: FacultyInfo[] = [
  {
    faculty: "Faculty of Engineering",
    departments: [
      "Computer Engineering",
      "Electrical / Electronic Engineering",
      "Mechanical Engineering",
      "Civil Engineering"
    ]
  },
  {
    faculty: "Faculty of Agriculture",
    departments: [
      "Animal Science & Fisheries",
      "Food Science & Technology",
      "Crop Production & Protection"
    ]
  },
  {
    faculty: "Faculty of Biological Sciences",
    departments: [
      "Animal & Environmental Biology",
      "Biochemistry",
      "Plant Science & Biotechnology",
      "Microbiology"
    ]
  },
  {
    faculty: "Faculty of Economics and Management Sciences",
    departments: [
      "Accountancy",
      "Banking & Finance",
      "Economics",
      "Management",
      "Marketing"
    ]
  },
  {
    faculty: "Faculty of Education",
    departments: [
      "Science Education",
      "Educational Administration and Planning",
      "Psychological Foundation",
      "Educational Foundation"
    ]
  },
  {
    faculty: "Faculty of Law",
    departments: [
      "Commercial & Industrial Law",
      "Private and Property Law",
      "Jurisprudence, International & Public Law"
    ]
  },
  {
    faculty: "Faculty of Medicine",
    departments: [
      "Medical Biochemistry",
      "Pharmacology",
      "Medical Microbiology",
      "Community Medicine"
    ]
  },
  {
    faculty: "Faculty of Humanities",
    departments: [
      "Foreign Language & Translation Studies",
      "Mass Communication",
      "History & International Relations",
      "English Language & Literature",
      "Linguistics & Communication Studies (Igbo)",
      "Religious Studies & Philosophy"
    ]
  },
  {
    faculty: "Faculty of Social Sciences",
    departments: [
      "Political Science",
      "Library & Information Science",
      "Sociology"
    ]
  },
  {
    faculty: "Faculty of Environmental Studies",
    departments: [
      "Surveying and Geo-informatics",
      "Estate Management",
      "Building",
      "Architecture",
      "Fine & Applied Arts",
      "Geography and Planning",
      "Environmental Resources Management"
    ]
  },
  {
    faculty: "Faculty of Physical Sciences",
    departments: [
      "Mathematics",
      "Statistics",
      "Industrial Chemistry",
      "Industrial Physics"
    ]
  },
  {
    faculty: "Faculty of Computing and Cybernetic Science",
    departments: [
      "Cybersecurity",
      "Artificial Intelligence and Robotics",
      "Software Engineering",
      "Computer Science",
      "Information and Communication Technology"
    ]
  },
  {
    faculty: "Faculty of Basic Medical Sciences",
    departments: [
      "Anatomy",
      "Human Physiology"
    ]
  },
  {
    faculty: "Faculty of Health Sciences",
    departments: [
      "Public Health",
      "Nursing",
      "Optometry",
      "Medical Laboratory"
    ]
  }
];

export const ALL_FACULTIES = FACULTIES_DATA.map(f => f.faculty);

/**
 * Returns the list of departments for a chosen faculty name.
 * Handles slight casing or naming variations gracefully.
 */
export function getDepartmentsForFaculty(facultyName: string): string[] {
  if (!facultyName) return [];
  const cleanName = facultyName.trim().toLowerCase();
  
  const found = FACULTIES_DATA.find(f => {
    const fLower = f.faculty.toLowerCase();
    return fLower === cleanName || 
           fLower.includes(cleanName) || 
           cleanName.includes(fLower) ||
           // Also handle common aliases
           (cleanName.includes('health') && fLower.includes('health')) ||
           (cleanName.includes('comput') && fLower.includes('comput')) ||
           (cleanName.includes('bio') && fLower.includes('bio')) ||
           (cleanName.includes('social') && fLower.includes('social')) ||
           (cleanName.includes('economic') && fLower.includes('economic')) ||
           (cleanName.includes('educat') && fLower.includes('educat')) ||
           (cleanName.includes('human') && fLower.includes('human')) ||
           (cleanName.includes('environ') && fLower.includes('environ')) ||
           (cleanName.includes('physic') && fLower.includes('physic')) ||
           (cleanName.includes('basic') && fLower.includes('basic')) ||
           (cleanName.includes('agric') && fLower.includes('agric')) ||
           (cleanName.includes('engin') && fLower.includes('engin')) ||
           (cleanName.includes('law') && fLower.includes('law')) ||
           (cleanName.includes('medic') && !cleanName.includes('basic') && fLower === 'faculty of medicine');
  });

  return found ? found.departments : [];
}

/**
 * Normalizes a raw faculty string to the canonical ABSU faculty name.
 */
export function normalizeFaculty(rawFaculty: string): string {
  if (!rawFaculty) return "";
  const clean = rawFaculty.trim().toLowerCase();
  for (const f of FACULTIES_DATA) {
    if (f.faculty.toLowerCase() === clean) return f.faculty;
  }
  for (const f of FACULTIES_DATA) {
    const fLower = f.faculty.toLowerCase();
    if (clean.includes(fLower) || fLower.includes(clean)) return f.faculty;
  }
  // Try fuzzy keywords
  if (clean.includes('health')) return "Faculty of Health Sciences";
  if (clean.includes('cyber') || clean.includes('comput')) return "Faculty of Computing and Cybernetic Science";
  if (clean.includes('basic med')) return "Faculty of Basic Medical Sciences";
  if (clean.includes('engin')) return "Faculty of Engineering";
  if (clean.includes('agric')) return "Faculty of Agriculture";
  if (clean.includes('biolog')) return "Faculty of Biological Sciences";
  if (clean.includes('econom') || clean.includes('manag')) return "Faculty of Economics and Management Sciences";
  if (clean.includes('educat')) return "Faculty of Education";
  if (clean.includes('law')) return "Faculty of Law";
  if (clean.includes('medic')) return "Faculty of Medicine";
  if (clean.includes('human')) return "Faculty of Humanities";
  if (clean.includes('social')) return "Faculty of Social Sciences";
  if (clean.includes('environ')) return "Faculty of Environmental Studies";
  if (clean.includes('physic')) return "Faculty of Physical Sciences";

  return rawFaculty;
}

/**
 * Automatically infers the correct Faculty if only a department is known.
 * Matches synonyms, partial words, and sub-disciplines.
 */
export function inferFacultyFromDepartment(departmentName: string): { faculty: string; department: string } | null {
  if (!departmentName) return null;
  const deptClean = departmentName.trim().toLowerCase();

  for (const fac of FACULTIES_DATA) {
    for (const d of fac.departments) {
      const dClean = d.toLowerCase();
      if (dClean === deptClean || deptClean.includes(dClean) || dClean.includes(deptClean)) {
        return { faculty: fac.faculty, department: d };
      }
    }
  }

  // Keyword inferences for common short names or acronyms
  if (deptClean.includes('computer sci') || deptClean.includes('csc') || deptClean.includes('cyber') || deptClean.includes('robot') || deptClean.includes('software') || deptClean.includes('ict') || deptClean.includes('information and comm')) {
    const matchedDept = facFindDept("Faculty of Computing and Cybernetic Science", deptClean) || "Computer Science";
    return { faculty: "Faculty of Computing and Cybernetic Science", department: matchedDept };
  }

  if (deptClean.includes('civil') || deptClean.includes('mech') || deptClean.includes('elect') || deptClean.includes('computer eng')) {
    const matchedDept = facFindDept("Faculty of Engineering", deptClean) || "Civil Engineering";
    return { faculty: "Faculty of Engineering", department: matchedDept };
  }

  if (deptClean.includes('nurs') || deptClean.includes('public health') || deptClean.includes('optom') || deptClean.includes('medical lab') || deptClean.includes('mls')) {
    const matchedDept = facFindDept("Faculty of Health Sciences", deptClean) || "Nursing";
    return { faculty: "Faculty of Health Sciences", department: matchedDept };
  }

  if (deptClean.includes('anat') || deptClean.includes('physio') && !deptClean.includes('physics')) {
    return { faculty: "Faculty of Basic Medical Sciences", department: deptClean.includes('anat') ? "Anatomy" : "Human Physiology" };
  }

  if (deptClean.includes('account') || deptClean.includes('bank') || deptClean.includes('finan') || deptClean.includes('market') || deptClean.includes('business admin') || deptClean.includes('manage')) {
    const matchedDept = facFindDept("Faculty of Economics and Management Sciences", deptClean) || "Accountancy";
    return { faculty: "Faculty of Economics and Management Sciences", department: matchedDept };
  }

  if (deptClean.includes('math') || deptClean.includes('stat') || deptClean.includes('chemistry') || deptClean.includes('physics')) {
    const matchedDept = facFindDept("Faculty of Physical Sciences", deptClean) || "Mathematics";
    return { faculty: "Faculty of Physical Sciences", department: matchedDept };
  }

  if (deptClean.includes('microbio') || deptClean.includes('biochem') || deptClean.includes('plant') || deptClean.includes('biotech')) {
    const matchedDept = facFindDept("Faculty of Biological Sciences", deptClean) || "Microbiology";
    return { faculty: "Faculty of Biological Sciences", department: matchedDept };
  }

  if (deptClean.includes('estate') || deptClean.includes('build') || deptClean.includes('arch') || deptClean.includes('survey') || deptClean.includes('geograph')) {
    const matchedDept = facFindDept("Faculty of Environmental Studies", deptClean) || "Building";
    return { faculty: "Faculty of Environmental Studies", department: matchedDept };
  }

  if (deptClean.includes('law') || deptClean.includes('jurisprudence')) {
    return { faculty: "Faculty of Law", department: "Commercial & Industrial Law" };
  }

  if (deptClean.includes('polit') || deptClean.includes('socio') || deptClean.includes('library')) {
    const matchedDept = facFindDept("Faculty of Social Sciences", deptClean) || "Political Science";
    return { faculty: "Faculty of Social Sciences", department: matchedDept };
  }

  if (deptClean.includes('english') || deptClean.includes('mass com') || deptClean.includes('history') || deptClean.includes('igbo') || deptClean.includes('philosophy') || deptClean.includes('religio')) {
    const matchedDept = facFindDept("Faculty of Humanities", deptClean) || "Mass Communication";
    return { faculty: "Faculty of Humanities", department: matchedDept };
  }

  return null;
}

function facFindDept(facultyName: string, query: string): string | null {
  const fac = FACULTIES_DATA.find(f => f.faculty === facultyName);
  if (!fac) return null;
  return fac.departments.find(d => query.includes(d.toLowerCase()) || d.toLowerCase().includes(query)) || null;
}
