const fs = require("fs/promises");
const path = require("path");
const oracledb = require("oracledb");

const {
  PDFParse,
} = require("pdf-parse");

const getConnection =
  require("../db");


// =====================================================
// CONFIGURATION
// =====================================================

const RESOURCE_UPLOAD_DIR =
  path.join(
    __dirname,
    "..",
    "uploads",
    "resources"
  );


const MAX_CHUNK_LENGTH =
  2800;


const CHUNK_OVERLAP =
  350;


// =====================================================
// ENSURE UPLOAD DIRECTORY
// =====================================================

async function ensureUploadDirectory() {
  await fs.mkdir(
    RESOURCE_UPLOAD_DIR,
    {
      recursive: true,
    }
  );
}


// =====================================================
// RESOURCE PDF PATH
// =====================================================

function getResourcePdfPath(
  resourceId
) {
  return path.join(
    RESOURCE_UPLOAD_DIR,
    `${resourceId}.pdf`
  );
}


// =====================================================
// NORMALIZE TEXT
// =====================================================

function normalizeDocumentText(
  value
) {
  return String(
    value || ""
  )
    .replace(/\r/g, "")
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /\n[ \t]+/g,
      "\n"
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();
}


// =====================================================
// VALIDATE PDF BUFFER
// =====================================================

function isPdfBuffer(buffer) {
  if (
    !Buffer.isBuffer(
      buffer
    ) ||
    buffer.length < 5
  ) {
    return false;
  }


  return (
    buffer
      .subarray(
        0,
        5
      )
      .toString() ===
    "%PDF-"
  );
}


// =====================================================
// EXTRACT PDF TEXT
// =====================================================

async function extractPdfText(
  buffer
) {
  if (
    !isPdfBuffer(
      buffer
    )
  ) {
    const error =
      new Error(
        "The uploaded file is not a valid PDF."
      );

    error.statusCode =
      400;

    throw error;
  }


  let parser;


  try {
    parser =
      new PDFParse({
        data:
          buffer,
      });


    const result =
      await parser.getText();


    const text =
      normalizeDocumentText(
        result?.text
      );


    if (
      !text ||
      text.length < 20
    ) {
      const error =
        new Error(
          "This PDF does not contain enough extractable text for CampusCopilot. Scanned image-only PDFs will require OCR."
        );

      error.statusCode =
        422;

      throw error;
    }


    return text;

  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch (
        destroyError
      ) {
        console.error(
          "PDF parser cleanup error:",
          destroyError
        );
      }
    }
  }
}


// =====================================================
// FIND A GOOD CHUNK END
// =====================================================

function findChunkBoundary(
  text,
  start,
  idealEnd
) {
  if (
    idealEnd >=
    text.length
  ) {
    return text.length;
  }


  const minimumBoundary =
    Math.max(
      start + 1000,
      idealEnd - 500
    );


  const searchArea =
    text.slice(
      minimumBoundary,
      idealEnd
    );


  const candidates = [
    searchArea.lastIndexOf(
      "\n\n"
    ),

    searchArea.lastIndexOf(
      ". "
    ),

    searchArea.lastIndexOf(
      "\n"
    ),

    searchArea.lastIndexOf(
      " "
    ),
  ];


  const bestRelative =
    Math.max(
      ...candidates
    );


  if (
    bestRelative < 0
  ) {
    return idealEnd;
  }


  return (
    minimumBoundary +
    bestRelative +
    1
  );
}


// =====================================================
// SPLIT DOCUMENT INTO CHUNKS
// =====================================================

function chunkDocumentText(
  text,
  options = {}
) {
  const cleanText =
    normalizeDocumentText(
      text
    );


  if (!cleanText) {
    return [];
  }


  const maxLength =
    Number(
      options.maxLength
    ) ||
    MAX_CHUNK_LENGTH;


  const overlap =
    Number(
      options.overlap
    ) ||
    CHUNK_OVERLAP;


  const chunks = [];


  let start = 0;


  while (
    start <
    cleanText.length
  ) {
    const idealEnd =
      Math.min(
        start +
          maxLength,
        cleanText.length
      );


    const end =
      findChunkBoundary(
        cleanText,
        start,
        idealEnd
      );


    const chunk =
      cleanText
        .slice(
          start,
          end
        )
        .trim();


    if (chunk) {
      chunks.push(
        chunk
      );
    }


    if (
      end >=
      cleanText.length
    ) {
      break;
    }


    const nextStart =
      Math.max(
        start + 1,
        end -
          overlap
      );


    start =
      nextStart;
  }


  return chunks;
}


// =====================================================
// DELETE RESOURCE CHUNKS
// =====================================================

async function deleteResourceChunks(
  connection,
  resourceId
) {
  await connection.execute(
    `
      DELETE FROM resource_chunks
      WHERE resource_id = :resourceId
    `,
    {
      resourceId:
        Number(
          resourceId
        ),
    }
  );
}


// =====================================================
// REPLACE RESOURCE CHUNKS
// =====================================================

async function replaceResourceChunks(
  connection,
  resourceId,
  text
) {
  const chunks =
    chunkDocumentText(
      text
    );


  await deleteResourceChunks(
    connection,
    resourceId
  );


  for (
    let index = 0;
    index <
    chunks.length;
    index += 1
  ) {
    await connection.execute(
      `
        INSERT INTO resource_chunks (
          resource_id,
          chunk_index,
          chunk_text
        )
        VALUES (
          :resourceId,
          :chunkIndex,
          :chunkText
        )
      `,
      {
        resourceId:
          Number(
            resourceId
          ),

        chunkIndex:
          index,

        chunkText:
          chunks[index],
      }
    );
  }


  return chunks.length;
}


// =====================================================
// SAVE RESOURCE PDF
// =====================================================

async function saveResourcePdf(
  resourceId,
  buffer
) {
  await ensureUploadDirectory();


  const filePath =
    getResourcePdfPath(
      resourceId
    );


  await fs.writeFile(
    filePath,
    buffer
  );


  return filePath;
}


// =====================================================
// DELETE RESOURCE PDF
// =====================================================

async function deleteResourcePdf(
  resourceId
) {
  const filePath =
    getResourcePdfPath(
      resourceId
    );


  try {
    await fs.unlink(
      filePath
    );

  } catch (error) {
    if (
      error.code !==
      "ENOENT"
    ) {
      throw error;
    }
  }
}


// =====================================================
// TOKENIZE QUERY
// =====================================================

const STOP_WORDS =
  new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "to",
    "of",
    "in",
    "on",
    "for",
    "with",
    "from",
    "by",
    "at",
    "as",
    "it",
    "this",
    "that",
    "these",
    "those",
    "what",
    "which",
    "who",
    "how",
    "why",
    "when",
    "where",
    "me",
    "my",
    "please",
    "explain",
    "tell",
  ]);


function tokenize(
  value
) {
  return String(
    value || ""
  )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      " "
    )
    .split(/\s+/)
    .map(
      (word) =>
        word.trim()
    )
    .filter(
      (word) =>
        word.length >= 2 &&
        !STOP_WORDS.has(
          word
        )
    );
}


// =====================================================
// SCORE CHUNK
// =====================================================

function scoreChunk(
  chunkText,
  question
) {
  const normalizedChunk =
    String(
      chunkText || ""
    )
      .toLowerCase();


  const questionTokens =
    [
      ...new Set(
        tokenize(
          question
        )
      ),
    ];


  if (
    questionTokens.length ===
    0
  ) {
    return 0;
  }


  let score = 0;


  questionTokens.forEach(
    (token) => {
      if (
        normalizedChunk.includes(
          token
        )
      ) {
        score +=
          token.length >= 6
            ? 3
            : 1;
      }
    }
  );


  const normalizedQuestion =
    questionTokens.join(
      " "
    );


  if (
    normalizedQuestion &&
    normalizedChunk.includes(
      normalizedQuestion
    )
  ) {
    score += 10;
  }


  return score;
}


// =====================================================
// GET RELEVANT RESOURCE CHUNKS
// =====================================================

async function getRelevantResourceChunks(
  resourceId,
  question,
  limit = 5
) {
  let connection;


  try {
    connection =
      await getConnection();


    const result =
      await connection.execute(
        `
          SELECT
            chunk_id,
            chunk_index,
            DBMS_LOB.SUBSTR(
              chunk_text,
              4000,
              1
            ) AS chunk_text
          FROM resource_chunks
          WHERE resource_id =
                :resourceId
          ORDER BY chunk_index
        `,
        {
          resourceId:
            Number(
              resourceId
            ),
        },
        {
          outFormat:
            oracledb
              .OUT_FORMAT_OBJECT,
        }
      );


    const scored =
      result.rows.map(
        (row) => ({
          chunkId:
            row.CHUNK_ID,

          chunkIndex:
            row.CHUNK_INDEX,

          text:
            row.CHUNK_TEXT,

          score:
            scoreChunk(
              row.CHUNK_TEXT,
              question
            ),
        })
      );


    const hasMatches =
      scored.some(
        (item) =>
          item.score > 0
      );


    if (!hasMatches) {
      return scored
        .slice(
          0,
          limit
        );
    }


    return scored
      .sort(
        (a, b) =>
          b.score -
          a.score ||
          a.chunkIndex -
          b.chunkIndex
      )
      .slice(
        0,
        limit
      );

  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (
        closeError
      ) {
        console.error(
          "Resource retrieval connection close error:",
          closeError
        );
      }
    }
  }
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  RESOURCE_UPLOAD_DIR,

  ensureUploadDirectory,

  getResourcePdfPath,

  isPdfBuffer,

  extractPdfText,

  chunkDocumentText,

  deleteResourceChunks,

  replaceResourceChunks,

  saveResourcePdf,

  deleteResourcePdf,

  getRelevantResourceChunks,
};