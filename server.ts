import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Support large file uploads (PDFs, spreadsheets up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Shared Gemini Client with telemetry header
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

const FACULTIES_REFERENCE = `
1. Faculty of Engineering: Computer Engineering, Electrical / Electronic Engineering, Mechanical Engineering, Civil Engineering
2. Faculty of Agriculture: Animal Science & Fisheries, Food Science & Technology, Crop Production & Protection
3. Faculty of Biological Sciences: Animal & Environmental Biology, Biochemistry, Plant Science & Biotechnology, Microbiology
4. Faculty of Economics and Management Sciences: Accountancy, Banking & Finance, Economics, Management, Marketing
5. Faculty of Education: Science Education, Educational Administration and Planning, Psychological Foundation, Educational Foundation
6. Faculty of Law: Commercial & Industrial Law, Private and Property Law, Jurisprudence, International & Public Law
7. Faculty of Medicine: Medical Biochemistry, Pharmacology, Medical Microbiology, Community Medicine
8. Faculty of Humanities: Foreign Language & Translation Studies, Mass Communication, History & International Relations, English Language & Literature, Linguistics & Communication Studies (Igbo), Religious Studies & Philosophy
9. Faculty of Social Sciences: Political Science, Library & Information Science, Sociology
10. Faculty of Environmental Studies: Surveying and Geo-informatics, Estate Management, Building, Architecture, Fine & Applied Arts, Geography and Planning, Environmental Resources Management
11. Faculty of Physical Sciences: Mathematics, Statistics, Industrial Chemistry, Industrial Physics
12. Faculty of Computing and Cybernetic Science: Cybersecurity, Artificial Intelligence and Robotics, Software Engineering, Computer Science, Information and Communication Technology
13. Faculty of Basic Medical Sciences: Anatomy, Human Physiology
14. Faculty of Health Sciences: Public Health, Nursing, Optometry, Medical Laboratory
`;

// API endpoint for AI-powered PDF and general document parsing
app.post('/api/parse-roster', async (req, res) => {
  try {
    const { pdfBase64, mimeType = 'application/pdf', rawText, fileName } = req.body;

    if (!pdfBase64 && !rawText) {
      return res.status(400).json({ error: 'Missing pdfBase64 or rawText payload.' });
    }

    if (!ai) {
      // Heuristic fallback if GEMINI_API_KEY is not configured
      console.warn("GEMINI_API_KEY not configured, using fallback parsing.");
      const fallbackLecturers = fallbackParseText(rawText || '');
      return res.json({ lecturers: fallbackLecturers, source: 'fallback' });
    }

    const promptText = `
You are an expert academic document parsing assistant for Abia State University (ABSU).
Analyze the provided document (PDF or extracted text from a lecturer roster/spreadsheet) and extract all staff/lecturer records into a structured JSON list.

For every staff member or lecturer found, extract:
- name: Full name including titles (e.g., Prof. Chidi Okoro, Dr. Ngozi Eze)
- email: Official or personal email address (if not found in document, infer reasonable lowercase e.g. firstname.lastname@absu.edu.ng)
- faculty: Map accurately to ONE of the 14 official ABSU faculties:
${FACULTIES_REFERENCE}
- department: The specific department the lecturer belongs to under that faculty.
- rank: Academic or administrative rank (e.g., Professor, Associate Professor / Reader, Senior Lecturer, Lecturer I, Lecturer II, Assistant Lecturer, Graduate Assistant, Technologist, Admin Officer).
- status: Approval status, default to 'Approved' or 'Pending'.
- employmentStatus: One of 'Active', 'Inactive', 'On Leave', 'Retired' (default to 'Active').
- qualification: Highest degree or qualifications listed (e.g. Ph.D, M.Sc, MBBS, B.Sc).
- phone: Phone number if available, otherwise empty string.
- documentInfo: Note any attached credentials, CV, or appointment letters mentioned.

Make sure to extract EVERY lecturer listed in the document.
`;

    let parts: any[] = [];
    if (pdfBase64) {
      const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType || 'application/pdf',
          data: cleanBase64
        }
      });
    }

    if (rawText) {
      parts.push({
        text: `Extracted Document Text:\n${rawText}`
      });
    }

    parts.push({ text: promptText });

    // 15 second timeout race to prevent hanging
    const aiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: parts,
      config: {
        systemInstruction: "You are an accurate university document extractor that parses academic rosters into structured JSON arrays.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              email: { type: Type.STRING },
              faculty: { type: Type.STRING },
              department: { type: Type.STRING },
              rank: { type: Type.STRING },
              status: { type: Type.STRING },
              employmentStatus: { type: Type.STRING },
              qualification: { type: Type.STRING },
              phone: { type: Type.STRING },
              documentInfo: { type: Type.STRING }
            },
            required: ['name', 'faculty', 'department', 'rank']
          }
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI parsing timed out')), 15000));
    const response: any = await Promise.race([aiPromise, timeoutPromise]);

    const parsedJson = JSON.parse(response.text || '[]');
    return res.json({ lecturers: parsedJson, source: 'ai' });

  } catch (error: any) {
    console.error("Error or timeout in parsing roster document:", error.message || error);
    // Provide graceful heuristic fallback
    const fallback = fallbackParseText(req.body.rawText || '');
    return res.json({ 
      lecturers: fallback, 
      source: 'fallback', 
      notice: error.message || 'Heuristic parser used' 
    });
  }
});

// Basic heuristic parser for fallback when AI is unavailable
function fallbackParseText(text: string) {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const results: any[] = [];

  for (const line of lines) {
    if (line.toLowerCase().includes('name') && line.toLowerCase().includes('dept')) continue; // skip header
    const parts = line.split(/[,\t|]/).map(p => p.trim());
    if (parts.length >= 2 && parts[0].length > 2) {
      results.push({
        name: parts[0] || 'Unknown Lecturer',
        email: parts[1]?.includes('@') ? parts[1] : `${parts[0].toLowerCase().replace(/[^a-z]/g, '.')}@absu.edu.ng`,
        faculty: parts[3] || 'Faculty of Physical Sciences',
        department: parts[2] || 'Computer Science',
        rank: parts[4] || 'Lecturer I',
        status: 'Approved',
        employmentStatus: 'Active',
        qualification: parts[5] || 'M.Sc',
        phone: parts[6] || '',
        documentInfo: 'Extracted from file'
      });
    }
  }
  return results;
}

// Development with Vite middlewares
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ABSU Staff Database server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
