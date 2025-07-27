const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

// Helper: Extract fields from text using regex
function extractFields(text) {
  const nameMatch = text.match(/Name[:\s]*([A-Za-z ]+)/i);
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+\d{1,3}[- ]?)?\d{10}/);
  const skillsMatch = text.match(/Skills[:\s]*([\w, ]+)/i);
  const experienceMatch = text.match(/Experience[:\s]*([\w\W]+?)Education[:\s]/i);
  const educationMatch = text.match(/Education[:\s]*([\w\W]+)/i);
  return {
    name: nameMatch ? nameMatch[1].trim() : '',
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    skills: skillsMatch ? skillsMatch[1].split(',').map(s => s.trim()) : [],
    experience: experienceMatch ? experienceMatch[1].trim() : '',
    education: educationMatch ? educationMatch[1].trim() : '',
  };
}

// Main parser
exports.parseResume = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    text = data.text;
  } else if (ext === '.docx') {
    const data = await mammoth.extractRawText({ path: filePath });
    text = data.value;
  } else {
    throw new Error('Unsupported file type');
  }
  return extractFields(text);
};