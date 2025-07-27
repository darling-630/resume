import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

/**
 * Extract text content from PDF file
 * @param {string} filePath - Path to PDF file
 * @returns {Promise<string>} Extracted text content
 */
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Extract text content from DOCX file
 * @param {string} filePath - Path to DOCX file
 * @returns {Promise<string>} Extracted text content
 */
const extractTextFromDOCX = async (filePath) => {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
};

/**
 * Extract name from resume text using patterns
 * @param {string} text - Resume text content
 * @returns {string|null} Extracted name
 */
const extractName = (text) => {
  // Look for name patterns at the beginning of the resume
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  // Try to find name in first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    
    // Skip common header words
    if (/^(resume|cv|curriculum\s+vitae|profile|about)/i.test(line)) {
      continue;
    }
    
    // Check if line looks like a name (2-4 words, proper case, no numbers)
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)?(\s+[A-Z][a-z]+)?$/.test(line)) {
      return line;
    }
  }
  
  return null;
};

/**
 * Extract email addresses from text
 * @param {string} text - Text content
 * @returns {string|null} First found email address
 */
const extractEmail = (text) => {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : null;
};

/**
 * Extract phone numbers from text
 * @param {string} text - Text content
 * @returns {string|null} First found phone number
 */
const extractPhone = (text) => {
  const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const matches = text.match(phoneRegex);
  return matches ? matches[0].replace(/\s+/g, ' ').trim() : null;
};

/**
 * Extract skills from text
 * @param {string} text - Text content
 * @returns {Array<string>} Array of extracted skills
 */
const extractSkills = (text) => {
  const skills = [];
  const skillsSection = extractSection(text, ['skills', 'technical skills', 'core competencies', 'technologies']);
  
  if (skillsSection) {
    // Common programming languages and technologies
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Swift', 'Kotlin',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
      'HTML', 'CSS', 'SASS', 'Bootstrap', 'Tailwind',
      'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'SQLite',
      'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
      'Git', 'GitHub', 'GitLab', 'Jenkins', 'CI/CD',
      'Agile', 'Scrum', 'Kanban', 'JIRA',
    ];
    
    // Find skills in the skills section
    commonSkills.forEach(skill => {
      if (new RegExp(`\\b${skill}\\b`, 'i').test(skillsSection)) {
        skills.push(skill);
      }
    });
    
    // Extract skills from bullet points or comma-separated lists
    const skillLines = skillsSection.split(/[,\n•·-]/).map(s => s.trim()).filter(s => s);
    skillLines.forEach(line => {
      if (line.length > 2 && line.length < 30 && !skills.includes(line)) {
        skills.push(line);
      }
    });
  }
  
  return [...new Set(skills)].slice(0, 20); // Remove duplicates and limit to 20
};

/**
 * Extract experience from text
 * @param {string} text - Text content
 * @returns {Array<object>} Array of experience objects
 */
const extractExperience = (text) => {
  const experience = [];
  const experienceSection = extractSection(text, ['experience', 'work experience', 'professional experience', 'employment']);
  
  if (experienceSection) {
    // Split by common separators for job entries
    const jobEntries = experienceSection.split(/\n\s*\n/).filter(entry => entry.trim());
    
    jobEntries.forEach(entry => {
      const lines = entry.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length >= 2) {
        // Try to parse job entry
        const firstLine = lines[0];
        const secondLine = lines[1];
        
        // Look for company and position patterns
        let company = null;
        let position = null;
        let duration = null;
        
        // Try different patterns for position and company
        if (firstLine.includes(' at ')) {
          const parts = firstLine.split(' at ');
          position = parts[0].trim();
          company = parts[1].trim();
        } else if (firstLine.includes(' - ')) {
          const parts = firstLine.split(' - ');
          position = parts[0].trim();
          company = parts[1].trim();
        } else {
          position = firstLine;
          company = secondLine;
        }
        
        // Look for duration (dates)
        const dateRegex = /(\d{4}|\d{1,2}\/\d{4}|\w+\s+\d{4})/g;
        const allText = entry.toLowerCase();
        if (allText.includes('present') || allText.includes('current')) {
          duration = entry.match(/[\d\/\w\s]+(present|current)/i)?.[0];
        } else {
          const dates = entry.match(dateRegex);
          if (dates && dates.length >= 2) {
            duration = `${dates[0]} - ${dates[dates.length - 1]}`;
          }
        }
        
        experience.push({
          company: company?.slice(0, 100) || null,
          position: position?.slice(0, 100) || null,
          duration: duration?.slice(0, 50) || null,
          description: lines.slice(2).join(' ').slice(0, 1000) || null,
        });
      }
    });
  }
  
  return experience.slice(0, 10); // Limit to 10 experiences
};

/**
 * Extract education from text
 * @param {string} text - Text content
 * @returns {Array<object>} Array of education objects
 */
const extractEducation = (text) => {
  const education = [];
  const educationSection = extractSection(text, ['education', 'academic background', 'qualifications']);
  
  if (educationSection) {
    const educationEntries = educationSection.split(/\n\s*\n/).filter(entry => entry.trim());
    
    educationEntries.forEach(entry => {
      const lines = entry.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length >= 1) {
        let institution = null;
        let degree = null;
        let fieldOfStudy = null;
        let graduationYear = null;
        
        // Look for degree patterns
        const degreeKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'diploma', 'certificate', 'b.s.', 'b.a.', 'm.s.', 'm.a.'];
        
        lines.forEach(line => {
          // Check if line contains degree information
          if (degreeKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
            degree = line;
          }
          
          // Look for institution (usually contains "university", "college", "institute")
          if (/university|college|institute|school/i.test(line) && !institution) {
            institution = line;
          }
          
          // Look for graduation year
          const yearMatch = line.match(/\b(19|20)\d{2}\b/);
          if (yearMatch && !graduationYear) {
            graduationYear = yearMatch[0];
          }
        });
        
        // If no specific institution found, use first line
        if (!institution && lines[0]) {
          institution = lines[0];
        }
        
        education.push({
          institution: institution?.slice(0, 100) || null,
          degree: degree?.slice(0, 100) || null,
          fieldOfStudy: fieldOfStudy?.slice(0, 100) || null,
          graduationYear: graduationYear?.slice(0, 10) || null,
        });
      }
    });
  }
  
  return education.slice(0, 5); // Limit to 5 education entries
};

/**
 * Extract a specific section from resume text
 * @param {string} text - Resume text content
 * @param {Array<string>} sectionNames - Possible section names to look for
 * @returns {string|null} Section content
 */
const extractSection = (text, sectionNames) => {
  const lines = text.split('\n');
  let sectionStart = -1;
  let sectionEnd = -1;
  
  // Find section start
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (sectionNames.some(name => line.includes(name.toLowerCase()))) {
      sectionStart = i + 1;
      break;
    }
  }
  
  if (sectionStart === -1) return null;
  
  // Find section end (next section or end of document)
  const commonSections = ['experience', 'education', 'skills', 'projects', 'certifications', 'awards'];
  for (let i = sectionStart; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (commonSections.some(section => line.includes(section) && !sectionNames.includes(section))) {
      sectionEnd = i;
      break;
    }
  }
  
  if (sectionEnd === -1) sectionEnd = lines.length;
  
  return lines.slice(sectionStart, sectionEnd).join('\n').trim();
};

/**
 * Parse resume file and extract structured data
 * @param {string} filePath - Path to resume file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<object>} Parsed resume data
 */
export const parseResume = async (filePath, mimeType) => {
  try {
    let text = '';
    
    // Extract text based on file type
    if (mimeType === 'application/pdf') {
      text = await extractTextFromPDF(filePath);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = await extractTextFromDOCX(filePath);
    } else {
      throw new Error('Unsupported file type');
    }
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text content found in the file');
    }
    
    // Extract structured data
    const parsedData = {
      name: extractName(text),
      email: extractEmail(text),
      phone: extractPhone(text),
      skills: extractSkills(text),
      experience: extractExperience(text),
      education: extractEducation(text),
      summary: text.slice(0, 2000), // First 2000 characters as summary
    };
    
    return parsedData;
    
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
};

/**
 * Validate file type for resume parsing
 * @param {string} mimeType - MIME type to validate
 * @returns {boolean} True if supported file type
 */
export const isValidResumeFile = (mimeType) => {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  return supportedTypes.includes(mimeType);
};

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} File extension
 */
export const getFileExtension = (mimeType) => {
  const extensionMap = {
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };
  
  return extensionMap[mimeType] || '.unknown';
};

export default {
  parseResume,
  isValidResumeFile,
  getFileExtension,
};