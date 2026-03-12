export type JDStatus = 'pending' | 'processing' | 'done' | 'error';

export interface JobDescription {
  id: string;
  label: string;
  text: string;
  status: JDStatus;
  result?: TailoringResult;
  coverLetter?: string;
}

export interface TailoringResult {
  tailoredResume: string;
  structuredResume?: StructuredResume;
  tailoringNotes: string;
}

export type AppStep = 'upload' | 'queue' | 'results';

// Structured resume types for formatted .docx export

export interface StructuredResume {
  name: string;
  contact: string;
  sections: ResumeSection[];
}

export type ResumeSection =
  | EducationSection
  | ExperienceSection
  | SkillsSection
  | CertificationsSection;

export interface EducationSection {
  type: 'education';
  title: string;
  items: EducationItem[];
}

export interface EducationItem {
  institution: string;
  location: string;
  degree: string;
  dates: string;
  bullets: string[];
}

export interface ExperienceSection {
  type: 'experience';
  title: string;
  items: ExperienceItem[];
}

export interface ExperienceItem {
  company: string;
  dates: string;
  role: string;
  location: string;
  bullets: string[];
}

export interface SkillsSection {
  type: 'skills';
  title: string;
  categories: { label: string; values: string }[];
}

export interface CertificationsSection {
  type: 'certifications';
  title: string;
  items: { name: string; date: string }[];
}
