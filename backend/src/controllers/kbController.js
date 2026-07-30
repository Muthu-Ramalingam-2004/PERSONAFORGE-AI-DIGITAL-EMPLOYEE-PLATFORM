const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const pdfParse = require('pdf-parse');

// Ensure tables exist for RAG document chunks
const ensureChunksTableExists = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        employee_id UUID REFERENCES ai_employees(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('Failed to create document_chunks table:', err.message);
  }
};

// Execute table check on boot
ensureChunksTableExists();

// Fetch all documents uploaded for an AI employee
const getEmployeeDocuments = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { employeeId } = req.params;

    // Verify employee ownership
    const empCheck = await db.query(
      'SELECT id FROM ai_employees WHERE id = $1 AND user_id = $2',
      [employeeId, userId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found or unauthorized'
      });
    }

    const docs = await db.query(
      'SELECT id, name, file_path, file_type, file_size, status, created_at FROM documents WHERE employee_id = $1 ORDER BY created_at DESC',
      [employeeId]
    );

    res.status(200).json({
      success: true,
      data: docs.rows
    });
  } catch (error) {
    next(error);
  }
};

// Upload a document and index text chunks for RAG context
const uploadDocument = async (req, res, next) => {
  const { employeeId } = req.body;
  const userId = req.user.id;

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'AI Employee ID is required' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  const { originalname, path: filePath, mimetype, size } = req.file;

  try {
    // 1. Verify employee ownership
    const empCheck = await db.query(
      'SELECT name FROM ai_employees WHERE id = $1 AND user_id = $2',
      [employeeId, userId]
    );

    if (empCheck.rows.length === 0) {
      // Cleanup uploaded file
      fs.unlinkSync(filePath);
      return res.status(404).json({ success: false, message: 'AI Employee not found' });
    }

    const employeeName = empCheck.rows[0].name;

    // 2. Insert document metadata into database
    const docResult = await db.query(
      `INSERT INTO documents (employee_id, name, file_path, file_type, file_size, status) 
       VALUES ($1, $2, $3, $4, $5, 'processing') 
       RETURNING *`,
      [employeeId, originalname, filePath, mimetype, size]
    );
    const document = docResult.rows[0];

    // 3. Process file and extract text content
    let extractedText = '';
    const fileExtension = path.extname(originalname).toLowerCase();

    if (fileExtension === '.txt') {
      extractedText = fs.readFileSync(filePath, 'utf-8');
    } else if (fileExtension === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
    } else {
      // DOCX / CSV or other types -> read as plain text fallback
      extractedText = fs.readFileSync(filePath, 'utf-8');
    }

    // 4. Split text content into semantic chunks (~600 characters each)
    const chunks = [];
    const chunkSize = 600;
    const overlap = 100;
    
    // Simple overlap chunking
    let i = 0;
    const cleanText = extractedText.replace(/\s+/g, ' ').trim();
    
    if (cleanText.length > 0) {
      while (i < cleanText.length) {
        const chunk = cleanText.substring(i, i + chunkSize);
        if (chunk.trim()) {
          chunks.push(chunk.trim());
        }
        i += (chunkSize - overlap);
      }
    }

    // 5. Save chunks to document_chunks table
    if (chunks.length > 0) {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        for (const chunk of chunks) {
          await client.query(
            'INSERT INTO document_chunks (document_id, employee_id, content) VALUES ($1, $2, $3)',
            [document.id, employeeId, chunk]
          );
        }
        // Update document status
        await client.query(
          "UPDATE documents SET status = 'processed' WHERE id = $1",
          [document.id]
        );
        await client.query('COMMIT');
      } catch (dbErr) {
        await client.query('ROLLBACK');
        throw dbErr;
      } finally {
        client.release();
      }
    } else {
      // Mark as processed even if text is empty
      await db.query("UPDATE documents SET status = 'processed' WHERE id = $1", [document.id]);
    }

    // 6. Log active audit activity
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, 'kb_upload', `Uploaded document ${originalname} for ${employeeName}`]
    );

    res.status(201).json({
      success: true,
      message: `Document parsed and indexed successfully. Extracted ${chunks.length} chunks.`,
      data: {
        ...document,
        status: 'processed',
        chunksCount: chunks.length
      }
    });
  } catch (error) {
    // Delete file if parsing failed
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    // Update document status to failed
    if (req.file) {
      try {
        await db.query(
          "UPDATE documents SET status = 'failed' WHERE employee_id = $1 AND name = $2",
          [employeeId, originalname]
        );
      } catch (err) {
        console.error(err);
      }
    }
    next(error);
  }
};

// Delete a document and its indexed chunks
const deleteDocument = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // Document ID

    // Verify ownership and get details
    const docCheck = await db.query(
      `SELECT d.name, d.file_path, e.name as employee_name 
       FROM documents d
       JOIN ai_employees e ON d.employee_id = e.id
       WHERE d.id = $1 AND e.user_id = $2`,
      [id, userId]
    );

    if (docCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or unauthorized'
      });
    }

    const { name, file_path, employee_name } = docCheck.rows[0];

    // Delete record from DB (cascades to document_chunks)
    await db.query('DELETE FROM documents WHERE id = $1', [id]);

    // Delete physical file from filesystem if it exists
    if (fs.existsSync(file_path)) {
      fs.unlinkSync(file_path);
    }

    // Log action
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, 'kb_delete', `Removed document ${name} from ${employee_name}`]
    );

    res.status(200).json({
      success: true,
      message: 'Document and text chunks deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// RAG Search API to query matching knowledge base paragraphs
const searchKnowledgeBase = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { employeeId, query } = req.query;

    if (!employeeId || !query) {
      return res.status(400).json({
        success: false,
        message: 'employeeId and query string parameters are required'
      });
    }

    // Verify employee ownership
    const empCheck = await db.query(
      'SELECT id FROM ai_employees WHERE id = $1 AND user_id = $2',
      [employeeId, userId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found or unauthorized'
      });
    }

    // Search query using SQL matches
    // We break search terms into keywords and look for matches in content
    const keywords = query.split(' ').filter(k => k.trim().length > 2);
    let whereClause = 'employee_id = $1';
    const params = [employeeId];

    if (keywords.length > 0) {
      const likes = keywords.map((kw, idx) => {
        params.push(`%${kw}%`);
        return `content ILIKE $${idx + 2}`;
      });
      whereClause += ` AND (${likes.join(' OR ')})`;
    } else {
      params.push(`%${query}%`);
      whereClause += ' AND content ILIKE $2';
    }

    const searchResult = await db.query(
      `SELECT id, content FROM document_chunks 
       WHERE ${whereClause} 
       LIMIT 4`,
      params
    );

    res.status(200).json({
      success: true,
      data: searchResult.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEmployeeDocuments,
  uploadDocument,
  deleteDocument,
  searchKnowledgeBase
};
